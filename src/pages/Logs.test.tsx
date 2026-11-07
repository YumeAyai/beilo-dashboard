// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { LogsViewer } from './Logs';
import { observabilityApi } from '../services/api';

vi.mock('../services/api', () => ({ observabilityApi: { getLogs: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const entries = ['error', 'wArN', 'warning', 'critical', 'info'].map((level) => ({
  timestamp: '2026-11-02T00:00:00Z', level, message: `${level} log message`,
}));

describe('log level chip colors', () => {
  it.each([
    { mode: 'light' as const, error: 'rgb(217, 92, 92)', warning: 'rgb(255, 152, 0)' },
    { mode: 'dark' as const, error: 'rgb(217, 108, 108)', warning: 'rgb(255, 183, 77)' },
  ])('renders red errors and orange warnings in $mode mode, including selected filters', async ({ mode, error, warning }) => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(entries);
    render(<ThemeProvider theme={createTheme({ palette: { mode } })}><LogsViewer /></ThemeProvider>);

    const errorLabel = await screen.findByText('ERROR');
    expect(getComputedStyle(errorLabel.closest('.MuiChip-root')!).color).toBe(error);
    for (const label of ['WARN', 'WARNING']) {
      expect(getComputedStyle(screen.getByText(label).closest('.MuiChip-root')!).color).toBe(warning);
    }
    expect(getComputedStyle(screen.getByText('CRITICAL').closest('.MuiChip-root')!).color).toBe(error);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Level Filter' }));
    fireEvent.click(screen.getByRole('option', { name: 'WARN' }));
    fireEvent.click(screen.getByRole('option', { name: 'ERROR' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(getComputedStyle(screen.getByText('WARNING').closest('.MuiChip-root')!).color).toBe(warning);
    for (const [label, color] of [['ERROR', error], ['WARN', warning]]) {
      const chips = screen.getAllByText(label).map((element) => element.closest('.MuiChip-root')).filter(Boolean);
      expect(chips).toHaveLength(2);
      for (const chip of chips) expect(getComputedStyle(chip!).color).toBe(color);
    }
  });
});
