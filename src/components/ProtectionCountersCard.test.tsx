// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { ProtectionCountersCard } from './ProtectionCountersCard';
import type { ProtectionCounter, ProtectionCounters } from '../types/observability';

beforeEach(async () => { await i18n.changeLanguage('en-US'); });
afterEach(cleanup);
function count(value: number | null, unit: string, state: ProtectionCounter['status']['state'] = 'available'): ProtectionCounter {
 return { count: value, status: { state, source: unit === 'actions' ? 'loki' : 'prometheus', scope: 'test', unit } };
}
const counters: ProtectionCounters = { runtime: count(3, 'actions'), waf: count(4, 'requests'), xdp: count(12, 'packets'), cnp: count(7, 'packets') };
function mount(value?: ProtectionCounters) { render(<I18nextProvider i18n={i18n}><ProtectionCountersCard counters={value} /></I18nextProvider>); }
function item(label: string) { return within(screen.getByText(label).closest('[tabindex="0"]') as HTMLElement); }

describe('blocking-only protection counters', () => {
 it('shows separate runtime and WAF counts without adding packet counters', () => {
  mount(counters);
  expect(item('Intrusion blocks').getByText('3')).toBeTruthy();
  expect(item('WAF blocks').getByText('4')).toBeTruthy();
  for (const value of ['16','23','Blocked threats','Intercepted','Last 24 hours']) expect(screen.queryByText(value)).toBeNull();
 });
 it('keeps measured zero distinct from unavailable statistics', async () => {
  mount({ ...counters, runtime: count(null,'actions','empty'), waf: count(0,'requests') });
  expect(item('Intrusion blocks').getByText('—')).toBeTruthy();
  expect(item('WAF blocks').getByText('0')).toBeTruthy();
  fireEvent.mouseOver(screen.getByText('Intrusion blocks').closest('[tabindex="0"]')!);
  const tooltip = within(await screen.findByRole('tooltip'));
  expect(tooltip.getByText('Data unavailable.')).toBeTruthy();
  expect(tooltip.getByText('Operations blocked by runtime security policies.')).toBeTruthy();
 });
 it('does not substitute XDP/CNP or sampled events when the runtime field is absent', () => {
  const { runtime: _unused, ...older } = counters;
  void _unused;
  mount(older);
  expect(item('Intrusion blocks').getByText('—')).toBeTruthy();
  expect(item('WAF blocks').getByText('4')).toBeTruthy();
 });
 it.each([Number.NaN,Number.POSITIVE_INFINITY,-1])('rejects invalid values (%s)', value => {
  mount({...counters,runtime:count(value,'actions')});
  expect(item('Intrusion blocks').getByText('—')).toBeTruthy();
 });
 it('shows a short WAF description without a hardcoded time window', async () => {
  mount(counters);fireEvent.mouseOver(screen.getByText('WAF blocks').closest('[tabindex="0"]')!);
  const tooltip=within(await screen.findByRole('tooltip'));
  expect(tooltip.getByText('HTTP requests blocked by WAF.')).toBeTruthy();
  expect(tooltip.queryByText('Last 24 hours')).toBeNull();
 });
 it.each(['zh-CN','zh-TW','ja-JP'])('defines both counters and explanations natively in %s', async language => {
  await i18n.changeLanguage(language);mount(counters);
  for(const key of ['runtimeBlocked','wafBlocked','runtimeBlockedHint','wafBlockedHint','blockCountUnavailable']) {
   expect(typeof i18n.getResource(language,'translation',`dashboard.protection.${key}`)).toBe('string');
  }
  expect(screen.queryByText('Intrusion blocks')).toBeNull();
 });
});
