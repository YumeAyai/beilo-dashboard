import layout from './layout.gohtml?raw';
import logoPNG from './logo.txt?raw';
import chineseWordmark from '../../public/beilo-chinese.svg?raw';

export interface EmailTemplateDesign {
  mode: 'visual' | 'source'; category: string; badge: string;
  color: string; tint: string; border: string; heading: string; summary: string;
  environment: string; actionLabel: string; actionURL: string; reason: string;
  footerNote: string; footerVerse: string; footerTagline: string;
}
export interface EmailTemplate {
  id: string; name: string; subject: string; html: string; text: string; logoPNG?: string; logoCID?: string;
  values?: Record<string, string>; design?: EmailTemplateDesign;
  version: number; updatedAt: string;
}
export interface EmailTemplatePreview { subject: string; html: string; text: string }
export const emailTemplateScenes = ['security-alert', 'policy-change', 'system-warning', 'recovery', 'daily-digest', 'channel-test'] as const;
const variants = [
  ['SECURITY ALERT', '安全告警', '#bc4b4b', '#fff1f0', '#f2cecb'],
  ['POLICY UPDATE', '策略变更', '#3a6aa8', '#edf4ff', '#d3e1f5'],
  ['SYSTEM WARNING', '系统异常', '#99621b', '#fff6e8', '#f2dfbc'],
  ['SERVICE RECOVERY', '恢复通知', '#3a6aa8', '#edf4ff', '#d3e1f5'],
  ['DAILY DIGEST', '每日摘要', '#3a6aa8', '#edf4ff', '#d3e1f5'],
  ['CHANNEL TEST', '通道测试', '#3a6aa8', '#edf4ff', '#d3e1f5'],
];
export const escapeEmailHTML = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const literal = (text: string) => escapeEmailHTML(text).replaceAll('{', '&#123;').replaceAll('}', '&#125;');
const pattern = (text: string) => text.split(/({{\.(?:Title|Summary|Message|Environment|OccurredAt|ID)}})/g)
  .map(part => /^{{\.[A-Za-z]+}}$/.test(part) ? part : literal(part)).join('');
const color = (value: string) => /^#[a-f\d]{6}$/i.test(value) ? value : '#3a6aa8';

export function applyEmailDesign(template: EmailTemplate, design: EmailTemplateDesign): EmailTemplate {
  let html = layout.replace('<!-- beilo-chinese -->', chineseWordmark.replace('<svg ', '<svg width="20" height="15" style="display:block" ').replace('fill="currentColor"', 'fill="#a9bddb"'));
  const substitutions: Record<string, string> = {
    '{{.Variant.Category}}': literal(design.category), '{{.Variant.Badge}}': literal(design.badge),
    '{{.Variant.Color}}': color(design.color), '{{.Variant.Tint}}': color(design.tint), '{{.Variant.Border}}': color(design.border),
    '{{.Title}}': pattern(design.heading), '{{.Summary}}': pattern(design.summary),
    '观壁垒于北落兮，伐河鼓之磅硠': literal(design.footerVerse),
    'beilo. · CLOUD-NATIVE SECURITY &amp; OBSERVABILITY': literal(design.footerTagline),
  };
  for (const [key, value] of Object.entries(substitutions)) html = html.replaceAll(key, value);
  return { ...template, html, design, values: {
    Environment: design.environment, ActionLabel: design.actionLabel, ActionURL: design.actionURL,
    Reason: design.reason, FooterNote: design.footerNote, DetailsTitle: '补充信息',
  } };
}

export function createEmailPresets(name: (id: string) => string): EmailTemplate[] {
  return emailTemplateScenes.map((id, index) => {
    const [category, badge, accent, tint, border] = variants[index];
    const design: EmailTemplateDesign = {
      mode: 'visual', category, badge, color: accent, tint, border,
      heading: '{{.Title}}', summary: '{{.Summary}}', environment: 'beilo.', actionLabel: '在控制台查看', actionURL: '',
      reason: '此地址已被配置为 beilo. 通知收件人。', footerNote: '',
      footerVerse: '观壁垒于北落兮，伐河鼓之磅硠', footerTagline: 'beilo. · CLOUD-NATIVE SECURITY & OBSERVABILITY',
    };
    return applyEmailDesign({ id, name: name(id), subject: '[beilo.] {{.Title}}', html: '',
      text: '{{.Title}}\n\n{{.Summary}}\n\n{{range .Fields}}{{.Label}}: {{.Value}}\n{{end}}{{if .ActionURL}}\n{{.ActionLabel}}: {{.ActionURL}}\n{{end}}\n{{.Reason}}',
      logoPNG: logoPNG.trim(), logoCID: 'beilo-logo', version: 0, updatedAt: '',
    }, design);
  });
}

type Context = Record<string, unknown> | string;
function resolve(expression: string, context: Context, root: Record<string, unknown>): unknown {
  if (expression === '.') return context;
  if (expression === '$.MetricWidth') return root.MetricWidth;
  if (!/^\.[A-Za-z][A-Za-z0-9.]*$/.test(expression)) throw new Error('Unsupported template expression');
  let value: unknown = context;
  for (const part of expression.slice(1).split('.')) {
    if (!value || typeof value !== 'object' || !(part in value)) throw new Error(`Unknown template field: ${expression}`);
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
const truthy = (value: unknown) => Array.isArray(value) ? value.length > 0 : !!value;

// Offline preview of the same field/if/with/range subset accepted by the server.
// The saved source is also validated by Go's contextual HTML renderer.
export function renderEmailSource(source: string, root: Record<string, unknown>, html = true): string {
  if (source.length > 131072) throw new Error('Template exceeds 128 KiB');
  const tokens = source.split(/({{[\s\S]*?}})/g);
  if (tokens.length > 10000) throw new Error('Too many template expressions');
  const render = (start: number, end: number, context: Context, depth: number): string => {
    if (depth > 40) throw new Error('Template nesting exceeds 40 levels');
    let output = '';
    for (let index = start; index < end; index++) {
      const token = tokens[index];
      if (!token.startsWith('{{')) { output += token; continue; }
      const expression = token.slice(2, -2).trim();
      const block = expression.match(/^(if|range|with)\s+(.+)$/);
      if (block) {
        let nesting = 1, stop = index + 1, alternative = -1;
        for (; stop < end; stop++) {
          const instruction = tokens[stop].startsWith('{{') ? tokens[stop].slice(2, -2).trim() : '';
          if (/^(if|range|with)\s/.test(instruction)) nesting++;
          else if (instruction === 'end' && --nesting === 0) break;
          else if (instruction === 'else' && nesting === 1) alternative = stop;
        }
        if (nesting !== 0) throw new Error('Unclosed template block');
        const value = resolve(block[2], context, root);
        if (block[1] === 'range' && Array.isArray(value) && value.length) {
          if (value.length > 100) throw new Error('Too many template entries');
          output += value.map(item => render(index + 1, alternative >= 0 ? alternative : stop, item as Context, depth + 1)).join('');
        } else if (block[1] !== 'range' && truthy(value)) {
          output += render(index + 1, alternative >= 0 ? alternative : stop, block[1] === 'with' ? value as Context : context, depth + 1);
        } else if (alternative >= 0) output += render(alternative + 1, stop, context, depth + 1);
        index = stop;
      } else {
        const value = resolve(expression, context, root);
        output += html ? escapeEmailHTML(String(value ?? '')) : String(value ?? '');
      }
      if (output.length > 1048576) throw new Error('Rendered template exceeds 1 MiB');
    }
    if (output.length > 1048576) throw new Error('Rendered template exceeds 1 MiB');
    return output;
  };
  return render(0, tokens.length, root, 0);
}

export function previewEmailTemplate(template: EmailTemplate, sample = { title: '邮件模板预览', message: '这是一封演示通知，用于检查模板的布局与文案。' }, example: Record<string, unknown> = {}): EmailTemplatePreview {
  const data: Record<string, unknown> = { Title: sample.title, Summary: sample.message, Message: sample.message,
    Subject: '', Preheader: '邮件模板预览', OccurredAt: '2026-11-08 00:00:00 UTC', ID: 'preview-only', Status: '', StatusDetail: '',
    Fields: [{ Label: 'severity', Value: 'high', Monospace: true }, { Label: 'namespace', Value: 'demo', Monospace: true }, { Label: 'service', Value: 'example-service', Monospace: true }],
    Metrics: [], MetricWidth: '33.33%', Details: '', DetailsTitle: '', NextSteps: [], PreferencesURL: '', ActionURL: '', ActionLabel: '', Environment: '', Reason: '', FooterNote: '',
  };
  for (const key of ['Environment', 'ActionLabel', 'ActionURL', 'PreferencesURL', 'Reason', 'FooterNote', 'DetailsTitle'] as const) {
    if (template.values?.[key]) data[key] = template.values[key];
  }
  for (const [key, value] of Object.entries(example)) {
    if (Object.hasOwn(data, key)) data[key] = value;
  }
  if (Array.isArray(data.Metrics) && data.Metrics.length) data.MetricWidth = `${100 / data.Metrics.length}%`;
  const subject = typeof data.Subject === 'string' && data.Subject ? data.Subject : renderEmailSource(template.subject, data, false);
  data.Subject = subject;
  const html = renderEmailSource(template.html, data).replaceAll(`cid:${template.logoCID || 'email-logo'}`, template.logoPNG ? `data:image/png;base64,${template.logoPNG}` : '');
  return { subject, html, text: renderEmailSource(template.text, data, false) };
}

export function sandboxEmailPreview(html: string): string {
  const policy = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">${html}`;
}
