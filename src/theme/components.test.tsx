// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button, Chip } from '@mui/material';
import { hexToRgb } from '@mui/material/styles';
import { colors } from './colors';
import { ThemeConfig } from './ThemeConfig';
import { useThemeContext } from './useThemeContext';

const semanticColors = ['error', 'success', 'warning', 'info'] as const;

function Controls() {
  const { toggleTheme } = useThemeContext();
  return <>
    <Button onClick={toggleTheme}>切换主题</Button>
    <Button variant="contained">保存设置</Button>
    {semanticColors.map(color => <div key={color}>
      <Button color={color} variant="contained" data-testid={`button-${color}`}>{color === 'error' ? '手动封禁' : color}</Button>
      <Chip color={color} label={color === 'error' ? '共 0 个' : color === 'success' ? '已就绪' : color} data-testid={`chip-${color}`} />
    </div>)}
    <Button variant="contained" color="error" disabled data-testid="disabled">禁用按钮</Button>
    <Button variant="outlined" color="error" data-testid="outlined">空心按钮</Button>
    <Chip variant="outlined" color="success" label="空心状态" data-testid="outlined-chip" />
  </>;
}

afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(document, 'startViewTransition'); });

describe('semantic filled control colors', () => {
  it('restores normal transitions after the fallback animation, including rapid toggles and unmount', () => {
    vi.useFakeTimers();
    const view = render(<ThemeConfig><Controls /></ThemeConfig>);
    const control = screen.getByTestId('button-error');
    fireEvent.click(screen.getByText('切换主题'));
    expect(document.documentElement.getAttribute('data-theme-transition')).toBe('fallback');
    expect(localStorage.getItem('theme-mode')).toBe('dark');
    expect(screen.getByTestId('button-error')).toBe(control);
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByText('切换主题'));
    expect(localStorage.getItem('theme-mode')).toBe('light');
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(true);
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false);
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
    fireEvent.click(screen.getByText('切换主题'));
    view.unmount();
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false);
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
  });

  it('crossfades the document without remounting controls and ignores completion of superseded transitions', async () => {
    const transitions: { finish: () => void; skipTransition: ReturnType<typeof vi.fn> }[] = [];
    const start = vi.fn((update: () => void) => {
      update();
      let finish!: () => void;
      const finished = new Promise<void>(resolve => { finish = resolve; });
      const skipTransition = vi.fn();
      transitions.push({ finish, skipTransition });
      return { finished, skipTransition };
    });
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
    const view = render(<ThemeConfig><Controls /></ThemeConfig>);
    const control = screen.getByTestId('button-error');
    fireEvent.click(screen.getByText('切换主题'));
    expect(localStorage.getItem('theme-mode')).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(false);
    fireEvent.click(screen.getByText('切换主题'));
    expect(transitions[0].skipTransition).toHaveBeenCalledOnce();
    expect(localStorage.getItem('theme-mode')).toBe('light');
    await act(async () => { transitions[0].finish(); });
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(true);
    await act(async () => { transitions[1].finish(); });
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false);
    expect(screen.getByTestId('button-error')).toBe(control);
    fireEvent.click(screen.getByText('切换主题'));
    view.unmount();
    expect(transitions[2].skipTransition).toHaveBeenCalledOnce();
    expect(document.documentElement.hasAttribute('data-theme-switching')).toBe(false);
  });

  it('keeps the original pastel backgrounds with white labels in dark mode', () => {
    localStorage.setItem('theme-mode', 'dark');
    render(<ThemeConfig><Controls /></ThemeConfig>);
    for (const color of semanticColors) {
      for (const control of ['button', 'chip']) {
        const style = getComputedStyle(screen.getByTestId(`${control}-${color}`));
        expect(style.color).toBe('rgb(255, 255, 255)');
        const background = style.backgroundColor.startsWith('var(')
          ? style.getPropertyValue('--variant-containedBg') : style.backgroundColor;
        expect(background.startsWith('#') ? hexToRgb(background) : background).toBe(hexToRgb(colors[color].dark));
      }
    }
    expect(getComputedStyle(screen.getByTestId('disabled')).color).toBe('rgba(255, 255, 255, 0.3)');
    expect(getComputedStyle(screen.getByTestId('outlined')).getPropertyValue('--variant-outlinedColor')).toBe('#D96C6C');
    expect(getComputedStyle(screen.getByTestId('outlined-chip')).color).toBe('rgb(146, 207, 146)');
  });

  it('uses a distinct red hover color through the native MUI CSS variable', () => {
    localStorage.setItem('theme-mode', 'dark');
    render(<ThemeConfig><Controls /></ThemeConfig>);
    const button = screen.getByTestId('button-error');
    const className = Array.from(button.classList).find(name => name.startsWith('css-'));
    expect(className).toBeTruthy();
    expect(getComputedStyle(button).getPropertyValue('--variant-containedBg')).toBe('#D96C6C');
    const rules = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules));
    expect(rules.some(rule => rule.cssText.includes(`.${className}:hover`)
      && rule.cssText.includes('--variant-containedBg: #B94F4F'))).toBe(true);
  });

  it('keeps primary buttons stable and restores light colors after switching themes', () => {
    localStorage.setItem('theme-mode', 'light');
    render(<ThemeConfig><Controls /></ThemeConfig>);
    const colorsOf = (element: Element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color, backgroundColor: style.backgroundColor,
        containedColor: style.getPropertyValue('--variant-containedColor'),
        containedBackground: style.getPropertyValue('--variant-containedBg'),
      };
    };
    const originalError = colorsOf(screen.getByTestId('button-error'));
    const originalChip = colorsOf(screen.getByTestId('chip-error'));
    const originalSave = colorsOf(screen.getByText('保存设置'));
    fireEvent.click(screen.getByText('切换主题'));
    expect(colorsOf(screen.getByTestId('button-error')).color).toBe('rgb(255, 255, 255)');
    expect(colorsOf(screen.getByText('保存设置'))).toEqual(originalSave);
    fireEvent.click(screen.getByText('切换主题'));
    expect(colorsOf(screen.getByTestId('button-error'))).toEqual(originalError);
    expect(colorsOf(screen.getByTestId('chip-error'))).toEqual(originalChip);
    expect(colorsOf(screen.getByText('保存设置'))).toEqual(originalSave);
  });
});
