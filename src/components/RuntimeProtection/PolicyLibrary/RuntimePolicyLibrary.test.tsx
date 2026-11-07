// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { RuntimePolicyLibrary } from './RuntimePolicyLibrary';
import { runtimeLibraryApi } from '../../../services/runtimeLibrary';
import type { CommunityPolicy } from '../../../types/runtimeLibrary';
import { communityInput, filterCommunityPolicies } from './model';
import { runtimeLibraryLocales } from '../../../i18n/runtimeLibrary';

const source: CommunityPolicy = { id: 'tracingpolicy/lsm_file_open', path: 'examples/tracingpolicy/lsm_file_open.yaml', title: 'lsm_file_open', source_url: 'https://github.com/cilium/tetragon/blob/pinned/examples/tracingpolicy/lsm_file_open.yaml', sha256: 'a'.repeat(64), collection: 'tracingpolicy', category: 'file', behavior: 'observe', hooks: ['file_open'], actions: ['Post'], documents: 1, importable: true, yaml: '# Original\nkind: TracingPolicy\n' };
const enforcing: CommunityPolicy = { ...source, id: 'tracingpolicy/hardlink-override', title: 'hardlink-override', behavior: 'enforce', actions: ['Override'] };
const manual: CommunityPolicy = { ...source, id: 'policylibrary/egress', title: 'egress', category: 'network', importable: false, import_reason: 'parameters_required' };

beforeEach(async () => {
  await i18n.changeLanguage('en-US');
  vi.spyOn(runtimeLibraryApi, 'catalog').mockResolvedValue({ repository: 'https://github.com/cilium/tetragon', version: 'v1.7.1', commit: '9'.repeat(40), license: 'Apache-2.0', sha256: 'b'.repeat(64), entries: [source, enforcing, manual] });
  vi.spyOn(runtimeLibraryApi, 'detail').mockImplementation(async id => [source, enforcing, manual].find(entry => entry.id === id)!);
  vi.spyOn(runtimeLibraryApi, 'preview').mockResolvedValue({ yaml: 'kind: TracingPolicyNamespaced\nmetadata:\n  namespace: app\n', sha256: 'preview-digest' });
  vi.spyOn(runtimeLibraryApi, 'importPolicy').mockImplementation(async input => ({ name: input.name, namespace: input.namespace, execution_state: 'unknown', source_id: input.id }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount() { render(<I18nextProvider i18n={i18n}><RuntimePolicyLibrary /></I18nextProvider>); }
async function open(title = source.title) {
  mount(); fireEvent.click(await screen.findByRole('button', { name: title }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('textbox', { name: /Target Pod labels/ });
  return dialog;
}

it('shows provenance, searches hook names and provides original YAML without activating a policy', async () => {
  mount();
  expect(await screen.findByText(/3 source files · Tetragon v1.7.1/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Search policy, hook or action' }), { target: { value: 'egress' } });
  expect(screen.queryByRole('button', { name: source.title })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'egress' }));
  const dialog = await screen.findByRole('dialog');
  expect(await within(dialog).findByText(/environment-specific parameters/)).toBeTruthy();
  expect(within(dialog).getByLabelText('Original YAML').textContent).toContain('# Original');
  expect(within(dialog).getByRole('link', { name: 'Download original YAML' }).getAttribute('download')).toBe('egress.yaml');
  expect(within(dialog).queryByRole('button', { name: 'Import policy' })).toBeNull();
  expect(runtimeLibraryApi.importPolicy).not.toHaveBeenCalled();
});

it('requires an explicit scope and reviewed preview, invalidating it when scope changes', async () => {
  const dialog = await open();
  const submit = within(dialog).getByRole('button', { name: 'Import policy' }) as HTMLButtonElement;
  expect(submit.disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Preview scoped YAML' }));
  expect(await within(dialog).findByText(/nonempty, explicit/)).toBeTruthy();
  expect(runtimeLibraryApi.preview).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByRole('textbox', { name: /Target Pod labels/ }), { target: { value: 'app=unused-test' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Preview scoped YAML' }));
  await within(dialog).findByLabelText('Scoped YAML to submit');
  expect(submit.disabled).toBe(false);
  fireEvent.change(within(dialog).getByRole('textbox', { name: /Namespace/ }), { target: { value: 'app' } });
  expect(submit.disabled).toBe(true);
  expect(within(dialog).queryByLabelText('Scoped YAML to submit')).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Preview scoped YAML' }));
  await within(dialog).findByLabelText('Scoped YAML to submit');
  fireEvent.click(submit);
  expect(await screen.findByText(/Submitted app\/community-lsm-file-open/)).toBeTruthy();
  expect(runtimeLibraryApi.importPolicy).toHaveBeenCalledWith({ id: source.id, namespace: 'app', name: 'community-lsm-file-open', pod_labels: { app: 'unused-test' }, acknowledge_actions: false, preview_sha256: 'preview-digest' });
});

it('requires acknowledgement for original enforcement actions and preserves import failures', async () => {
  vi.mocked(runtimeLibraryApi.importPolicy).mockRejectedValue(new Error('policy conflict; retry'));
  const dialog = await open(enforcing.title);
  fireEvent.change(within(dialog).getByRole('textbox', { name: /Target Pod labels/ }), { target: { value: 'app=unused-test' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Preview scoped YAML' }));
  await within(dialog).findByLabelText('Scoped YAML to submit');
  expect((within(dialog).getByRole('button', { name: 'Import policy' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Preview scoped YAML' }));
  await within(dialog).findByLabelText('Scoped YAML to submit');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Import policy' }));
  expect(await within(dialog).findByText('policy conflict; retry')).toBeTruthy();
  expect(runtimeLibraryApi.importPolicy).toHaveBeenCalledWith(expect.objectContaining({ acknowledge_actions: true }));
});

it('shows catalog failure and supports retry without pretending the library is empty', async () => {
  vi.mocked(runtimeLibraryApi.catalog).mockRejectedValueOnce(new Error('forbidden'));
  mount(); expect(await screen.findByText(/forbidden/)).toBeTruthy();
  expect(screen.queryByText('No matching community policies.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('button', { name: source.title })).toBeTruthy();
  await waitFor(() => expect(runtimeLibraryApi.catalog).toHaveBeenCalledTimes(2));
});

describe('community policy input and localization', () => {
  it('rejects duplicate or unsafe selectors and supports multidimensional filtering', () => {
    const draft = { namespace: 'app', name: 'observe-test', labels: 'app=web\ntier=frontend', acknowledged: false };
    expect(communityInput(source.id, draft).pod_labels).toEqual({ app: 'web', tier: 'frontend' });
    for (const labels of ['', '__proto__=bad', 'app=x\napp=y', 'broken']) expect(() => communityInput(source.id, { ...draft, labels })).toThrow();
    expect(() => communityInput(source.id, { ...draft, namespace: 'BAD' })).toThrow();
    expect(() => communityInput(source.id, { ...draft, name: '' })).toThrow();
    expect(filterCommunityPolicies([source, enforcing, manual], 'file_open', 'file', 'observe')).toEqual([source]);
    expect(filterCommunityPolicies([source, enforcing], 'override', '', 'enforce')).toEqual([enforcing]);
  });
  it('provides all strings in four languages', () => {
    for (const locale of Object.values(runtimeLibraryLocales)) {
      expect(Object.keys(locale).sort()).toEqual(Object.keys(runtimeLibraryLocales['en-US']).sort());
      expect(Object.keys(locale.reasons).sort()).toEqual(Object.keys(runtimeLibraryLocales['en-US'].reasons).sort());
    }
  });
});
