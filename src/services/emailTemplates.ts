import { getAuthHeaders } from '../contexts/getAuthHeaders';
import type { EmailTemplate, EmailTemplatePreview } from '../email/templates';

const base = import.meta.env.PROD ? (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '') : '';
export class EmailTemplateAPIError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const headers = new Headers(getAuthHeaders());
  if (body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base}/api/v1/notifications/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:expired'));
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new EmailTemplateAPIError(response.status, result.error || `API error: ${response.status}`);
  return result as T;
}
export const emailTemplateApi = {
  list: () => request<EmailTemplate[]>('email-templates'),
  save: (template: EmailTemplate) => request<EmailTemplate>(`email-templates/${encodeURIComponent(template.id)}`, 'PUT', template),
  preview: (template: EmailTemplate) => request<EmailTemplatePreview>('email-template-preview', 'POST', {
    template, title: '邮件模板预览', message: '这是一封演示通知，用于检查模板的布局与文案。',
    payload: { severity: 'high', namespace: 'demo', service: 'example-service' },
  }),
};
