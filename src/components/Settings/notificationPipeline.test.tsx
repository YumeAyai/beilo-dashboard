// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { I18nextProvider } from 'react-i18next';
import { SettingsChannelDialog } from './SettingsChannelDialog';
import { SettingsNotificationPipeline } from './SettingsNotificationPipeline';
import type { NotificationChannel } from '../../services/api';
const api = vi.hoisted(() => ({ getRules: vi.fn(), getJobs: vi.fn(), createRule: vi.fn(), deleteRule: vi.fn(), retryJob: vi.fn(), startWeixinLogin: vi.fn(), pollWeixinLogin: vi.fn(), syncWeixinConversation: vi.fn() }));
vi.mock('../../services/api', () => ({ notificationApi2: api }));
vi.mock('qrcode', () => ({ default: { toCanvas: vi.fn().mockResolvedValue(undefined) } }));
const channel: NotificationChannel = { id: 'mail', name: 'Campus email', type: 'email', config: { smtpHost: 'smtp.exmail.qq.com', smtpPort: 465, username: 'sender@example.test', fromAddress: 'sender@example.test', toAddresses: ['recipient@example.test'], useTLS: true, useTemplate: true, passwordConfigured: true }, isDefault: false, isActive: true, createdAt: '', updatedAt: '' };
beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('en-US'); api.getRules.mockResolvedValue([]); api.getJobs.mockResolvedValue({ items: [], nextCursor: '' }); });
afterEach(cleanup);
function mount(ui: React.ReactElement) { return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>); }
describe('usable notification configuration', () => {
 it('saves SMTP authentication, TLS and individual recipient configuration without exposing the saved password', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  mount(<SettingsChannelDialog open channel={channel} onClose={vi.fn()} onSave={save} t={i18n.t} />);
  expect((screen.getByLabelText('Password / SMTP app password') as HTMLInputElement).value).toBe('');
  expect(screen.getByText(/Leave blank to preserve/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Password / SMTP app password'), { target: { value: 'new-app-password' } });
  fireEvent.change(screen.getByLabelText(/Recipient addresses/), { target: { value: 'one@example.test; two@example.test' } });
  const form = screen.getByRole('button', { name: 'Save' }).closest('form')!;
  expect(Array.from(form.querySelectorAll(':invalid')).map((node) => node.getAttribute('name') ?? node.getAttribute('id'))).toEqual([]);
  fireEvent.submit(form);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(save.mock.calls[0][0].config).toMatchObject({ smtpHost: 'smtp.exmail.qq.com', smtpPort: 465, password: 'new-app-password', useTLS: true, useTemplate: true, toAddresses: ['one@example.test', 'two@example.test'] });
 }, 60_000);
 it('creates an automatic high-severity rule with explicit channels', async () => {
  api.createRule.mockResolvedValue({}); mount(<SettingsNotificationPipeline channels={[channel]} />);
  await screen.findByText(/No rules/);
  fireEvent.change(screen.getByLabelText('Rule name'), { target: { value: 'Security alerts' } });
  fireEvent.click(screen.getByLabelText('Campus email'));
  fireEvent.click(screen.getByRole('button', { name: 'Create rule' }));
  await waitFor(() => expect(api.createRule).toHaveBeenCalledWith(expect.objectContaining({ name: 'Security alerts', channelIDs: ['mail'], conditions: [{ type: 'severity', operator: 'severity_at_least', value: 'high' }] })));
 }, 60_000);
 it('shows provider acceptance accurately and resends a failed delivery', async () => {
  api.getJobs.mockResolvedValue({ items: [{ id: 'failed-task', channelID: 'mail', channelType: 'email', title: 'SMTP test', status: 'failed', attempts: 1, error: 'SMTP authentication failed', createdAt: '2026-11-03T12:00:00Z' }, { id: 'accepted-task', channelID: 'mail', channelType: 'email', title: 'Accepted test', status: 'sent', attempts: 1, createdAt: '2026-11-03T12:00:00Z' }], nextCursor: '' });
  api.retryJob.mockResolvedValue({ jobIDs: ['retry-task'] }); mount(<SettingsNotificationPipeline channels={[channel]} />);
  await screen.findByText('SMTP authentication failed'); expect(screen.getByText('Accepted by provider')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
  await waitFor(() => expect(api.retryJob).toHaveBeenCalledWith('failed-task', false));
 }, 60_000);
 it('keeps backend credential errors visible inside the configuration dialog', () => {
  mount(<SettingsChannelDialog open channel={channel} error="SMTP authentication failed" onClose={vi.fn()} onSave={vi.fn()} t={i18n.t} />);
  expect(screen.getByRole('alert').textContent).toBe('SMTP authentication failed');
 }, 60_000);
 it('saves Telegram routing while keeping a stored bot token masked', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  mount(<SettingsChannelDialog open channel={{ ...channel, type: 'telegram', config: { botTokenConfigured: true, chatID: '-100123' } }} onClose={vi.fn()} onSave={save} t={i18n.t} />);
  expect((screen.getByLabelText('Bot token') as HTMLInputElement).value).toBe('');
  fireEvent.change(screen.getByLabelText(/Destination chat ID/), { target: { value: '-100456' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: 'telegram', config: expect.objectContaining({ chatID: '-100456', botTokenConfigured: true }) })));
  expect(screen.queryByLabelText(/SMTP server/)).toBeNull();
 }, 60_000);
 it('configures a signed Feishu robot without requiring replacement of saved secrets', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  mount(<SettingsChannelDialog open channel={{ ...channel, type: 'feishu', config: { webhookURLConfigured: true, secretConfigured: true } }} onClose={vi.fn()} onSave={save} t={i18n.t} />);
  expect((screen.getByLabelText('Bot webhook URL') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Signing secret') as HTMLInputElement).value).toBe('');
  const form = screen.getByRole('button', { name: 'Save' }).closest('form')!;
  expect(form.querySelectorAll(':invalid').length).toBe(0);
  fireEvent.submit(form);
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
 }, 60_000);
 it('binds personal Weixin by QR and explains the required conversation sync', async () => {
  api.startWeixinLogin.mockResolvedValue({ status: 'wait', loginID: 'qr-session', qrContent: 'https://weixin.qq.com/test' });
  api.pollWeixinLogin.mockResolvedValue({ status: 'confirmed', channel: { ...channel, type: 'weixin', config: { botTokenConfigured: true, toUserID: 'owner@im.wechat' } } });
  mount(<SettingsChannelDialog open channel={{ ...channel, type: 'weixin', config: {} }} onClose={vi.fn()} onSave={vi.fn()} t={i18n.t} />);
  fireEvent.click(screen.getByRole('button', { name: 'Bind Weixin with QR' }));
  await screen.findByLabelText('Weixin authorization QR code');
  await waitFor(() => expect(api.pollWeixinLogin).toHaveBeenCalledWith('mail', 'qr-session', undefined), { timeout: 5000 });
  await screen.findByText(/Send a message to ClawBot/);
  expect(screen.getByRole('button', { name: 'Sync conversation' }).hasAttribute('disabled')).toBe(false);
  expect(screen.queryByLabelText('Bot token')).toBeNull();
 }, 60_000);
});
