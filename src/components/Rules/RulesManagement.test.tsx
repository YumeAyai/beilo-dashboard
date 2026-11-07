// @vitest-environment jsdom
import { configure, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { rulesApi } from '../../services/api';
import type { Rule } from '../../services/rulesData';
import { RuleEditorDialog } from './RuleEditorDialog';
import { RuleTestDialog } from './RuleTestDialog';
import CrsRuleCatalog from './CrsRuleCatalog';
import { RulesTable } from './RulesTable';
import { crsBuildApi } from '../../services/crsBuild';

// These tests cover rule behavior, not icon rendering; avoid loading the entire icon catalog.
configure({ asyncUtilTimeout: 15000 });

vi.mock('@mui/icons-material', () => Object.fromEntries(['Add', 'Edit', 'Delete', 'Science', 'CheckCircle', 'Cancel', 'Search', 'ShieldOutlined', 'VisibilityOutlined', 'Download', 'OpenInNew', 'Refresh', 'Rule', 'Schedule'].map(name => [name, () => null])));

const rule: Rule = { id: 'gateway-rule', name: 'Gateway rule', type: '正则', phase: 'request', action: 'block', severity: 'high', category: 'SQL注入', enabled: true, conditions: [{ variable: 'ARGS', operator: 'contains', value: 'probe' }], transformations: ['lowercase'], targetGateway: 'edge', targetNamespace: 'default', metadata: { createdAt: '', updatedAt: '', version: 1 } };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('retains Gateway binding and transformations when editing a rule', () => {
  const save = vi.fn();
  render(<RuleEditorDialog open rule={rule} ingresses={[]} onClose={vi.fn()} onSave={save} t={i18n.t} />);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.save') }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ targetGateway: 'edge', targetNamespace: 'default', targetIngress: '', transformations: ['lowercase'] }));
}, 30000);

it('tests the selected rule ID and refuses malformed headers before calling the API', async () => {
  const test = vi.spyOn(rulesApi, 'testRule').mockResolvedValue({ matched: false, matchedRules: [], action: 'pass', details: [], processingTime: 0 });
  render(<RuleTestDialog open rule={rule} onClose={vi.fn()} t={i18n.t} />);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('rules.test.startTest') }));
  await waitFor(() => expect(test).toHaveBeenCalledWith(expect.objectContaining({ ruleId: rule.id })));
  test.mockClear();
  fireEvent.change(screen.getByLabelText(i18n.t('rules.test.headers')), { target: { value: '{"x": 42}' } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('rules.test.startTest') }));
  await screen.findByText(i18n.t('ruleManagement.invalidHeaders'));
  expect(test).not.toHaveBeenCalled();
}, 30000);

it('shows actual source rule IDs, filters the catalog and opens the original directive', async () => {
  const digest = 'a'.repeat(64);
  vi.spyOn(crsBuildApi, 'status').mockResolvedValue({ enabled: true, activeSHA256: digest, modules: [{ sha256: digest, url: '' }], builds: [] });
  vi.spyOn(crsBuildApi, 'catalog').mockResolvedValue({ version: '4.30.0', moduleSHA256: digest, commit: 'c'.repeat(40), archiveSHA256: '', source: '', sourceSHA256: '', scope: 'module_source', license: 'Apache-2.0', groups: [{ file: 'REQUEST-942.conf', count: 1 }], rules: [{ id: '942100', file: 'REQUEST-942.conf', message: 'SQL injection', severity: 'critical', phase: 2, tags: ['attack-sqli'], directive: 'SecRule ARGS "@detectSQLi" "id:942100,phase:2,block"' }] });
  render(<CrsRuleCatalog />);
  expect(screen.getAllByText(i18n.t('ruleManagement.moduleCatalog'))).toHaveLength(1);
  fireEvent.change(await screen.findByRole('textbox', { name: i18n.t('ruleManagement.searchBuiltin') }), { target: { value: '942100' } });
  expect(screen.getByText('942100')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('ruleManagement.detail') }));
  await screen.findByRole('dialog');
  expect(screen.getByText(/SecRule.*ARGS/, { selector: 'pre' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: i18n.t('rules.batch.enable') })).toBeNull();
}, 30000);

it('renders the same deployment states consistently in Chinese and English', () => {
  const props = { total: 1, loading: false, params: {}, selectedIds: [], onSelectAll: vi.fn(), onSelect: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onTest: vi.fn(), onPageChange: vi.fn(), onRowsPerPageChange: vi.fn() };
  const states = [
    { state: 'desired', 'en-US': 'Pending', 'zh-CN': '待发布' },
    { state: 'observed', 'en-US': 'Observed', 'zh-CN': '已观察' },
  ] as const;
  for (const entry of states) {
    for (const language of ['en-US', 'zh-CN'] as const) {
      const view = render(<RulesTable {...props} rules={[{ ...rule, deployment: { state: entry.state, enforcementVerified: false } }]} t={i18n.getFixedT(language)} />);
      expect(screen.getByText(entry[language], { selector: '.MuiChip-label' })).toBeTruthy();
      view.unmount();
    }
  }
});
