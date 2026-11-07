// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { TopBar } from './TopBar';
import type { FlowFilter } from './flowFilters';

beforeEach(async () => { await i18n.changeLanguage('en-US'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Harness() {
  const [filters, setFilters] = useState<FlowFilter[]>([]);
  const [namespace, setNamespace] = useState('default');
  return <>
    <TopBar namespaceFilter={namespace} allNamespaces={['all', 'default', 'prod', 'monitoring']} onNamespaceChange={setNamespace}
      flowFilters={filters} filterSuggestions={['label=app=Web', 'pod=default/client']} onFiltersChange={setFilters}
      verdictFilter="all" onVerdictChange={() => {}} stats={null} onRefresh={() => {}} loading={false} />
    <output data-testid="filters">{JSON.stringify(filters)}</output>
    <output data-testid="namespace">{namespace}</output>
  </>;
}

it('searches namespaces before committing a selection', () => {
  render(<Harness />);
  fireEvent.focus(screen.getByRole('combobox', { name: 'Namespace' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Namespace' }), { target: { value: 'prod' } });
  expect((screen.getByRole('combobox', { name: 'Namespace' }) as HTMLInputElement).value).toBe('prod');
  expect(screen.queryByRole('option', { name: 'monitoring' })).toBeNull();
  expect(screen.getByTestId('namespace').textContent).toBe('default');
  fireEvent.click(screen.getByRole('option', { name: 'prod' }));
  expect(screen.getByTestId('namespace').textContent).toBe('prod');
});

it('selects collected label suggestions with direction, deduplicates manual entries, removes one tag and clears all', () => {
  render(<Harness />);
  const input = screen.getByRole('combobox', { name: 'Flow filters' });
  fireEvent.change(input, { target: { value: 'from:app=' } });
  fireEvent.click(screen.getByRole('option', { name: 'from:label=app=Web' }));
  expect(JSON.parse(screen.getByTestId('filters').textContent!)).toEqual([{ kind: 'label', query: 'k8s:app=Web', direction: 'from', negative: false }]);
  fireEvent.change(input, { target: { value: 'from:label=k8s:app=Web' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(JSON.parse(screen.getByTestId('filters').textContent!)).toHaveLength(1);
  fireEvent.change(input, { target: { value: 'to:ip=192.0.2.10' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(JSON.parse(screen.getByTestId('filters').textContent!)).toHaveLength(2);
  fireEvent.keyUp(screen.getByTitle('from:label=app=Web'), { key: 'Delete' });
  expect(JSON.parse(screen.getByTestId('filters').textContent!)).toEqual([{ kind: 'ip', query: '192.0.2.10', direction: 'to', negative: false }]);
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByTestId('filters').textContent).toBe('[]');
});
