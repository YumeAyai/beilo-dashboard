// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { createEmailPresets, type EmailTemplate } from '../../email/templates';
import { emailTemplateApi, EmailTemplateAPIError } from '../../services/emailTemplates';
import { SettingsEmailTemplates } from './SettingsEmailTemplates';
import { EmailTemplateSelector } from './EmailTemplateSelector';

vi.mock('../../services/emailTemplates', async importOriginal => {
  const original = await importOriginal<typeof import('../../services/emailTemplates')>();
  return { ...original, emailTemplateApi: { list: vi.fn(), save: vi.fn(), preview: vi.fn() } };
});
beforeEach(async () => { await i18n.changeLanguage('en-US'); vi.mocked(emailTemplateApi.list).mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('email template editor', () => {
  it('keeps edits across scene selection, previews locally and saves the complete template to shared storage', async () => {
    vi.mocked(emailTemplateApi.save).mockImplementation(async template => ({ ...template, version: 1, updatedAt: '2026-11-08T00:00:00Z' }));
    render(<SettingsEmailTemplates />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save template' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Heading pattern'), { target: { value: 'Updated: {{.Title}}' } });
    const iframe = screen.getByTitle('Email preview') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('Updated: Email template preview');
    expect(iframe.getAttribute('sandbox')).toBe('');
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Choose template' }));
    fireEvent.click(screen.getByRole('option', { name: 'Policy change' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Choose template' }));
    fireEvent.click(screen.getByRole('option', { name: 'Security alert' }));
    expect((screen.getByLabelText('Heading pattern') as HTMLInputElement).value).toBe('Updated: {{.Title}}');
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    await screen.findByText('Template saved. It can now be selected in an email channel.');
    expect(emailTemplateApi.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'security-alert', html: expect.stringContaining('Updated: {{.Title}}'), logoPNG: expect.any(String), version: 0 }));
    expect(emailTemplateApi.preview).not.toHaveBeenCalled();
  });
  it('preserves the draft after a version conflict and does not claim a successful save', async () => {
    vi.mocked(emailTemplateApi.list).mockResolvedValue(createEmailPresets(id => i18n.t(`emailTemplates.scenes.${id}`)).map(template => ({ ...template, version: 2 })));
    vi.mocked(emailTemplateApi.save).mockRejectedValue(new EmailTemplateAPIError(409, 'conflict'));
    render(<SettingsEmailTemplates />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save template' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'My unsaved design' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    await screen.findByText(/Someone else changed/);
    expect((screen.getByLabelText('Template name') as HTMLInputElement).value).toBe('My unsaved design');
    expect(screen.queryByText('Template saved. It can now be selected in an email channel.')).toBeNull();
  });
  it('allows offline editing and preview when the running backend has no template API, with saving disabled', async () => {
    vi.mocked(emailTemplateApi.list).mockRejectedValue(new EmailTemplateAPIError(404, 'not found'));
    render(<SettingsEmailTemplates />);
    await screen.findByText(/email template service is unavailable/i);
    fireEvent.change(screen.getByLabelText('Heading pattern'), { target: { value: 'Offline draft' } });
    expect((screen.getByTitle('Email preview') as HTMLIFrameElement).srcdoc).toContain('Offline draft');
    expect((screen.getByRole('button', { name: 'Save template' }) as HTMLButtonElement).disabled).toBe(true);
    expect(emailTemplateApi.save).not.toHaveBeenCalled();
  });
  it('selects a saved template for an email channel and preserves plain-text compatibility', async () => {
    const template = createEmailPresets(id => id)[0];
    vi.mocked(emailTemplateApi.list).mockResolvedValue([{ ...template, name: 'Saved design', version: 1 } as EmailTemplate]);
    const onChange = vi.fn();
    render(<EmailTemplateSelector config={{ useTemplate: true }} onChange={onChange} />);
    await waitFor(() => expect(emailTemplateApi.list).toHaveBeenCalledOnce());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Email template' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Saved design' }));
    expect(onChange).toHaveBeenCalledWith('templateID', 'security-alert');
    expect(onChange).toHaveBeenCalledWith('useTemplate', true);
  });
});
