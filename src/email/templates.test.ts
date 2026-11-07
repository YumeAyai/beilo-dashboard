import { describe, expect, it } from 'vitest';
import { applyEmailDesign, createEmailPresets, previewEmailTemplate, renderEmailSource, sandboxEmailPreview } from './templates';

describe('console-owned email templates', () => {
  it('ships six working templates with an embedded logo and editable visual fields', () => {
    const templates = createEmailPresets(id => id);
    expect(templates).toHaveLength(6);
    for (const template of templates) {
      const result = previewEmailTemplate(template, { title: '<script>alert(1)</script>', message: 'Example message' });
      expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.html).not.toContain('<script>alert(1)</script>');
      expect(result.html).toContain('data:image/png;base64,');
      expect(result.html).toContain('<title id="title">北落</title>');
      expect(result.html).not.toContain('<!-- beilo-chinese -->');
      expect(result.html).toContain('namespace');
      expect(result.text).toContain('Example message');
      expect(result.html).not.toContain('{{');
      expect(result.html).toContain('CLOUD-NATIVE SECURITY');
    }
  });
  it('rebuilds visual fields without interpreting literal design text as template code', () => {
    const template = createEmailPresets(id => id)[0];
    const edited = applyEmailDesign(template, { ...template.design!, heading: 'Alert: {{.Title}}', category: '<img onerror=x>{{.Unknown}}', color: 'red;display:none', actionURL: 'https://console.example.test/', actionLabel: 'Open' });
    const result = previewEmailTemplate(edited);
    expect(result.html).toContain('Alert: ');
    expect(result.html).toContain('&lt;img onerror=x&gt;&#123;&#123;.Unknown&#125;&#125;');
    expect(result.html).not.toContain('red;display:none');
    expect(result.html).toContain('https://console.example.test/');
  });
  it('renders nested field/conditional blocks and refuses executable or unclosed expressions', () => {
    const data = { Fields: [{ Label: '<name>', Value: 'value', Monospace: true }] };
    expect(renderEmailSource('{{range .Fields}}{{if .Monospace}}{{.Label}}: {{.Value}}{{end}}{{end}}', data)).toBe('&lt;name&gt;: value');
    expect(() => renderEmailSource('{{printf "%s" .Title}}', {})).toThrow();
    expect(() => renderEmailSource('{{if .Title}}x', { Title: 'title' })).toThrow('Unclosed');
    expect(sandboxEmailPreview('<img src="https://example.test/tracker">')).toContain("default-src 'none'");
  });
});
