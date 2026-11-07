// @vitest-environment jsdom
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { CrsBuildWorkflow } from './CrsBuildWorkflow';
import { crsBuildApi, type BuildRelease } from '../../services/crsBuild';

configure({ asyncUtilTimeout: 15000 });

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../services/crsBuild', () => ({ crsBuildApi: { status: vi.fn(), start: vi.fn(), stage: vi.fn(), select: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const release = { version: '4.30.0', tag: 'v4.30.0', commit: 'c'.repeat(40), url: '', sourceURL: '', publishedAt: '', notes: '' } satisfies BuildRelease;
const status = { enabled: true, activeSHA256: 'a'.repeat(64), modules: [{ sha256: 'a'.repeat(64), url: '' }], builds: [] };

it('builds the checked release without applying it', async () => {
  vi.mocked(crsBuildApi.status).mockResolvedValue(status);
  render(<CrsBuildWorkflow release={release} />);
  const button = screen.getByRole('button', { name: 'crsBuild.build' });
  await waitFor(() => expect(button).not.toHaveProperty('disabled', true));
  fireEvent.click(button);
  await waitFor(() => expect(crsBuildApi.start).toHaveBeenCalledWith(release));
  expect(crsBuildApi.select).not.toHaveBeenCalled();
});

it('uses the current active digest as a compare-and-swap precondition', async () => {
  const digest = 'b'.repeat(64);
  vi.mocked(crsBuildApi.status).mockResolvedValue({ ...status, builds: [{ id: 'build-1', release, state: 'staged', baseSHA256: status.activeSHA256, builderImage: '', createdAt: '', artifact: { moduleSHA256: digest, archiveSHA256: '', testsPassed: true } }] });
  render(<CrsBuildWorkflow release={release} />);
  fireEvent.click(await screen.findByRole('button', { name: 'crsBuild.apply' }));
  expect(crsBuildApi.select).not.toHaveBeenCalled();
  const buttons = screen.getAllByRole('button', { name: 'crsBuild.apply' });
  fireEvent.click(buttons[buttons.length - 1]);
  await waitFor(() => expect(crsBuildApi.select).toHaveBeenCalledWith(digest, status.activeSHA256));
});

it('keeps build disabled when the cluster builder is not configured', async () => {
  vi.mocked(crsBuildApi.status).mockResolvedValue({ ...status, enabled: false, configurationError: 'missing builder' });
  render(<CrsBuildWorkflow release={release} />);
  await screen.findByText('crsBuild.notConfigured');
  expect(screen.getByRole('button', { name: 'crsBuild.build' })).toHaveProperty('disabled', true);
});

it('closes the apply dialog and exposes readiness failures', async () => {
  const digest = 'b'.repeat(64);
  vi.mocked(crsBuildApi.status).mockResolvedValue({ ...status, modules: [...status.modules, { sha256: digest, url: '' }] });
  vi.mocked(crsBuildApi.select).mockRejectedValue(new Error('Envoy agents are not ready'));
  render(<CrsBuildWorkflow release={release} />);
  fireEvent.mouseDown(await screen.findByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: /bbbbbbbbbbbb/ }));
  fireEvent.click(screen.getByRole('button', { name: 'crsBuild.apply' }));
  await screen.findByText('Envoy agents are not ready');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 5000 });
});


it('shows the real default for an externally managed inventory and disables mutations', async () => {
  vi.mocked(crsBuildApi.status).mockResolvedValue({ ...status, enabled: false, buildConfigured: true, inventoryState: 'unmanaged' });
  render(<CrsBuildWorkflow release={release} />);
  await screen.findByText('crsBuild.selected: aaaaaaaaaaaa');
  expect(screen.getByText('crsBuild.inventory.unmanaged')).toBeTruthy();
  expect(screen.queryByText('crsBuild.notConfigured')).toBeNull();
  expect(screen.getByRole('button', { name: 'crsBuild.build' })).toHaveProperty('disabled', true);
});

it('distinguishes an unconfigured module from a failed status request', async () => {
  vi.mocked(crsBuildApi.status).mockResolvedValue({ ...status, enabled: false, activeSHA256: '', inventoryState: 'not_configured' });
  render(<CrsBuildWorkflow release={release} />);
  await screen.findByText('crsBuild.selected: crsBuild.notSet');
  expect(screen.getByText('crsBuild.inventory.not_configured')).toBeTruthy();
});

it('disables writes when a refresh fails after a successful status response', async () => {
  vi.mocked(crsBuildApi.status).mockResolvedValueOnce(status).mockRejectedValueOnce(new Error('status unavailable'));
  render(<CrsBuildWorkflow release={release} />);
  const build = screen.getByRole('button', { name: 'crsBuild.build' });
  await waitFor(() => expect(build).not.toHaveProperty('disabled', true));
  fireEvent.click(screen.getByRole('button', { name: 'common.refresh' }));
  await screen.findByText('status unavailable');
  expect(build).toHaveProperty('disabled', true);
  expect(crsBuildApi.start).not.toHaveBeenCalled();
});
