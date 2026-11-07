// @vitest-environment jsdom
import { configure, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { crsBuildApi, type CrsRuleCatalog as Catalog } from '../../services/crsBuild';
import CrsRuleCatalog from './CrsRuleCatalog';

configure({ asyncUtilTimeout: 15000 });

vi.mock('@mui/icons-material', () => Object.fromEntries(['Search','VisibilityOutlined','Download','OpenInNew','Refresh'].map(name => [name, () => null])));
vi.mock('../../services/crsBuild', () => ({ crsBuildApi: { status: vi.fn(), catalog: vi.fn(), check: vi.fn(), start: vi.fn(), stage: vi.fn(), select: vi.fn() } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });
const a = 'a'.repeat(64), b = 'b'.repeat(64);
const status = (digest: string) => ({ enabled: true, activeSHA256: digest, modules: [{ sha256: digest, url: '' }], builds: [] });
const catalog = (digest: string, version: string, id: string): Catalog => ({ version, moduleSHA256: digest, commit: 'c'.repeat(40), archiveSHA256: '', source: '', sourceSHA256: '', scope: 'module_source', license: 'Apache-2.0', groups: [{ file: 'rules.conf', count: 1 }], rules: [{ id, file: 'rules.conf', message: `rule ${id}`, severity: 'critical', phase: 2, tags: [], directive: `SecRule ARGS "@rx test" "id:${id}"` }] });

it('switches the header and every rule row to the selected module, hiding stale rows while loading', async () => {
  vi.spyOn(crsBuildApi, 'status').mockResolvedValueOnce(status(a)).mockResolvedValueOnce(status(b));
  let resolve!: (value: Catalog) => void;
  vi.spyOn(crsBuildApi, 'catalog').mockResolvedValueOnce(catalog(a,'4.30.0','942100')).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  render(<CrsRuleCatalog />);
  await screen.findByText('942100');
  expect(screen.getByText('4.30.0')).toBeTruthy();
  expect(screen.queryByText('4.14.0')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: i18n.t('common.refresh') }));
  await waitFor(() => expect(crsBuildApi.catalog).toHaveBeenLastCalledWith(b, expect.any(AbortSignal)));
  expect(screen.queryByText('942100')).toBeNull();
  resolve(catalog(b,'4.31.0','932100'));
  await screen.findByText('932100');
  expect(screen.getByText('4.31.0')).toBeTruthy();
  expect(screen.queryByText('4.30.0')).toBeNull();
},30000);

it('does not substitute the bundled reference when provenance cannot be loaded', async () => {
  vi.spyOn(crsBuildApi, 'status').mockResolvedValue(status(a));
  vi.spyOn(crsBuildApi, 'catalog').mockRejectedValue(new Error('no verified CRS source'));
  render(<CrsRuleCatalog />);
  await screen.findByText(/no verified CRS source/);
  expect(screen.queryByText('4.14.0')).toBeNull();
  expect(screen.queryByRole('table')).toBeNull();
},30000);
