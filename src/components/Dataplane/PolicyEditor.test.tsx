// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { PolicyEditor } from './PolicyEditor';
import { dataplaneApi } from '../../services/dataplane';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('runtime editor workflow', () => {
  it('defaults to observe-only and blocks submission without a Pod selector', async () => {
    await i18n.changeLanguage('zh-CN');
    const save = vi.spyOn(dataplaneApi, 'savePolicy').mockResolvedValue({});
    const done = vi.fn();
    render(<I18nextProvider i18n={i18n}><PolicyEditor namespace="demo" onClose={vi.fn()} onSaved={done} /></I18nextProvider>);
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false);
    fireEvent.change(screen.getByLabelText(/策略名称/), { target: { value: 'watch-curl' } });
    fireEvent.change(screen.getByLabelText(/可执行文件绝对路径/), { target: { value: '/usr/bin/curl' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.getByText(/请至少填写一个明确标签/)).toBeTruthy());
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/目标 Pod 标签/), { target: { value: 'app=frontend' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(save).toHaveBeenCalledWith('demo', 'watch-curl', { kind: 'exec', pod_labels: { app: 'frontend' }, executables: ['/usr/bin/curl'], enforce: false });
  }, 15_000);
  it('preserves an editable file policy and reports a rejected save', async () => {
    await i18n.changeLanguage('en-US');
    const save = vi.spyOn(dataplaneApi, 'savePolicy').mockRejectedValue(new Error('Kubernetes RBAC denied policy operation'));
    const done = vi.fn();
    render(<I18nextProvider i18n={i18n}><PolicyEditor namespace="demo" policy={{ name: 'watch-file', namespace: 'demo', kind: 'file', paths: ['/etc/shadow'], pod_labels: { app: 'web' }, enforce: true, managed: true, execution_state: 'unknown', resource_version: '1' }} onClose={vi.fn()} onSaved={done} /></I18nextProvider>);
    expect((screen.getByLabelText(/Policy name/) as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Kubernetes RBAC denied policy operation')).toBeTruthy());
    expect(save).toHaveBeenCalledWith('demo', 'watch-file', { kind: 'file', pod_labels: { app: 'web' }, files: ['/etc/shadow'], enforce: true });
    expect(done).not.toHaveBeenCalled();
  });
});
