// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { PolicyAudit } from './PolicyAudit';
import { policyAuditApi } from '../services/policyAudit';
import type { PolicyAuditEvent } from '../services/policyAudit';
import i18n from '../i18n';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const record: PolicyAuditEvent = { id: 'record', time: '2026-11-04T00:00:00Z', operationId: 'operation', actor: { id: 'external-admin', type: 'kubernetes' }, source: 'kubernetes', phase: 'kubernetes', result: 'success', digest: 'hash', native: { level: 'Metadata', userAgent: 'kubectl', request: null }, changes: [{ domain: 'tetragon', resource: 'tracingpoliciesnamespaced', namespace: 'test', name: 'guard', operation: 'patch', before: null, after: null, fields: [], beforeSource: 'unavailable_metadata_only' }] };
const setup = async () => { await i18n.changeLanguage('zh-CN'); vi.spyOn(policyAuditApi, 'status').mockResolvedValue({ externalAuditHealthy: true, sources: [{ node: 'control-plane', readAt: '2026-11-04T00:01:00Z' }] }); render(<I18nextProvider i18n={i18n}><PolicyAudit /></I18nextProvider>); };
it('shows metadata limitations and correlates the actual external operator without inventing a diff', async () => {
 const list = vi.spyOn(policyAuditApi, 'list').mockResolvedValue({ events: [record], nextCursor: '', scanned: 1 }); vi.spyOn(policyAuditApi, 'detail').mockResolvedValue(record); await setup();
 expect(await screen.findByText('external-admin')).toBeTruthy(); expect(screen.getByText('外部采集正常')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: '详情' }));
 expect(await screen.findByText('仅元数据：可追溯操作人、操作与结果，无法还原策略正文和差异。')).toBeTruthy(); expect(screen.queryByText('变更后（已脱敏）')).toBeNull();
 fireEvent.click(screen.getByRole('button', { name: '查看关联记录' })); await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ operationId: 'operation' }), expect.any(AbortSignal)));
});
it('ignores stale filtered responses and does not retain a healthy source after failure', async () => {
 let resolveOld!: (value: { events: PolicyAuditEvent[]; nextCursor: string; scanned: number }) => void;
 const list = vi.spyOn(policyAuditApi, 'list').mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue({ events: [{ ...record, actor: { id: 'new-admin', type: 'user' } }], nextCursor: '', scanned: 1 }); await setup();
 await waitFor(() => expect(list).toHaveBeenCalledTimes(1)); fireEvent.change(screen.getByLabelText('操作人'), { target: { value: 'new-admin' } }); expect(await screen.findByText('new-admin')).toBeTruthy();
 resolveOld({ events: [record], nextCursor: '', scanned: 1 }); await waitFor(() => expect(screen.queryByText('external-admin')).toBeNull()); list.mockRejectedValueOnce(new Error('Forbidden')); fireEvent.click(screen.getByRole('button', { name: '刷新' }));
 expect(await screen.findByText('Forbidden')).toBeTruthy(); expect(screen.queryByText('外部采集正常')).toBeNull(); expect(screen.getByText('外部采集未确认')).toBeTruthy();
});
