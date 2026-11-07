// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ObservationCoverage, ObservationNotice } from './ObservationNotice';
import type { FieldObservation, ObservationMetadata } from '../types/observability';
import i18n from '../i18n';

beforeEach(async () => { await i18n.changeLanguage('en-US'); });
afterEach(cleanup);

function show(state: FieldObservation['state'], reason?: string) {
  const metadata: ObservationMetadata = { version: 'v1', collectedAt: new Date().toISOString(), fields: {
    threatRequests: { state, reason, source: 'prometheus', scope: 'coraza_interruptions', unit: 'requests' },
  } };
  return render(<I18nextProvider i18n={i18n}><ObservationNotice metadata={metadata} /></I18nextProvider>);
}

describe('observation coverage presentation', () => {
  it('does not warn for normal Prometheus metrics with partial history', () => {
    const result = show('partial', 'blocked_threats_only');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(result.container.textContent).toBe('');
  });
  it('names the unavailable field in a real warning', () => {
    show('unavailable');
    expect(screen.getByRole('alert').textContent).toContain('Observation sources unavailable: threat count');
  });
  it('treats an empty observation as no samples rather than a source failure', () => {
    const result = show('empty');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(result.container.textContent).toBe('');
  });
  it('warns when a partially retained sample has lost its live stream', () => {
    show('partial', 'http_stream_disconnected');
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('does not show a coverage notice for available metrics', () => {
    const result = show('available');
    expect(result.container.textContent).toBe('');
  });
  it('puts Hubble coverage on its own chart instead of a global warning', () => {
    const metadata: ObservationMetadata = { version: 'v1', collectedAt: new Date().toISOString(), fields: {
      clientSource: { state: 'partial', source: 'hubble', scope: 'observed_http_request_flows', unit: 'requests' },
    } };
    render(<I18nextProvider i18n={i18n}><ObservationNotice metadata={metadata} /><ObservationCoverage metadata={metadata} field="clientSource" /></I18nextProvider>);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Live observations')).toBeTruthy();
  });
});
