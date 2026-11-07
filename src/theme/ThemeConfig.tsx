import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { colors } from './colors';
import { componentStyles } from './components';

import { ThemeContext, type ThemeMode } from './themeState';

const STORAGE_KEY = 'theme-mode';

interface ThemeConfigProps {
  children: ReactNode;
}

export function ThemeConfig({ children }: ThemeConfigProps) {
  const transition = useRef<ViewTransition | null>(null);
  const switchTimer = useRef<number | null>(null);
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'dark' || stored === 'light') ? stored : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => () => {
    transition.current?.skipTransition();
    transition.current = null;
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
    document.documentElement.removeAttribute('data-theme-switching');
    document.documentElement.removeAttribute('data-theme-transition');
  }, []);

  const toggleTheme = useCallback(() => {
    transition.current?.skipTransition();
    transition.current = null;
    if (switchTimer.current !== null) window.clearTimeout(switchTimer.current);
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', '');
    root.removeAttribute('data-theme-transition');
    const update = () => flushSync(() => setMode(prev => prev === 'light' ? 'dark' : 'light'));
    const clear = () => {
      root.removeAttribute('data-theme-switching');
      root.removeAttribute('data-theme-transition');
    };
    // Crossfade one snapshot of the whole interface, including canvas charts,
    // instead of letting each component animate its own palette separately.
    if (document.startViewTransition && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const current = document.startViewTransition(update);
      transition.current = current;
      void current.finished.catch(() => {}).then(() => {
        if (transition.current !== current) return;
        transition.current = null;
        clear();
      });
    } else {
      root.setAttribute('data-theme-transition', 'fallback');
      update();
      switchTimer.current = window.setTimeout(() => {
        switchTimer.current = null;
        clear();
      }, 200);
    }
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: colors.primary.main,
            light: colors.primary.light,
            dark: colors.primary.dark,
          },
          secondary: {
            main: colors.secondary.main,
            light: colors.secondary.light,
            dark: colors.secondary.dark,
          },
          success: {
            main: mode === 'light' ? colors.success.light : colors.success.dark,
            dark: colors.success.dark,
          },
          warning: {
            main: mode === 'light' ? colors.warning.light : colors.warning.dark,
            dark: colors.warning.dark,
          },
          error: {
            main: mode === 'light' ? colors.error.light : colors.error.dark,
            dark: colors.error.hover[mode],
          },
          info: {
            main: mode === 'light' ? colors.info.light : colors.info.dark,
            dark: colors.info.dark,
          },
          text: {
            primary: mode === 'light' ? colors.text.primary : colors.text.primaryDark,
            secondary: mode === 'light' ? colors.text.secondary : colors.text.secondaryDark,
          },
          background: {
            default: mode === 'light' ? colors.background.default : colors.background.dark,
            paper: mode === 'light' ? colors.background.paper : colors.background.paperDark,
          },
          ...(mode === 'dark' && {
            divider: colors.border.darkMode,
            action: {
              hover: 'rgba(125, 173, 239, 0.07)',
              selected: 'rgba(105, 166, 245, 0.15)',
              focus: 'rgba(125, 173, 239, 0.18)',
            },
          }),
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 600,
          },
          h2: {
            fontWeight: 600,
          },
          h3: {
            fontWeight: 600,
          },
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
        },
        components: componentStyles,
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <style>{`
          html[data-theme-switching]:not([data-theme-transition="fallback"]),
          html[data-theme-switching]:not([data-theme-transition="fallback"]) *,
          html[data-theme-switching]:not([data-theme-transition="fallback"]) *::before,
          html[data-theme-switching]:not([data-theme-transition="fallback"]) *::after {
            transition: none !important;
          }
          ::view-transition-group(root),
          ::view-transition-old(root),
          ::view-transition-new(root) {
            animation-duration: 180ms;
            animation-timing-function: ease-out;
          }
          html[data-theme-transition="fallback"],
          html[data-theme-transition="fallback"] *,
          html[data-theme-transition="fallback"] *::before,
          html[data-theme-transition="fallback"] *::after {
            transition-property: background-color, color, border-color, box-shadow, fill, stroke !important;
            transition-duration: 180ms !important;
            transition-delay: 0ms !important;
            transition-timing-function: ease-out !important;
          }
          @media (prefers-reduced-motion: reduce) {
            html[data-theme-switching], html[data-theme-switching] *,
            html[data-theme-switching] *::before, html[data-theme-switching] *::after {
              transition: none !important;
            }
          }
        `}</style>
        <style>{`
          :root {
            --mui-tooltip-bg: ${mode === 'dark' ? colors.background.elevatedDark : '#1D2129'};
            --mui-tooltip-color: ${mode === 'dark' ? '#FFFFFF' : '#FFFFFF'};
          }
        `}</style>
        <style>{`
          :root {
            --mui-alert-success-bg: ${mode === 'dark' ? colors.chipBg.success.dark : '#F6FFED'};
            --mui-alert-success-border: ${mode === 'dark' ? colors.success.dark : '#B7EB8F'};
            --mui-alert-success-color: ${mode === 'dark' ? colors.success.dark : '#43a047'};
            --mui-alert-error-bg: ${mode === 'dark' ? colors.chipBg.error.dark : '#FFF2F0'};
            --mui-alert-error-border: ${mode === 'dark' ? colors.error.dark : '#FFCCC7'};
            --mui-alert-error-color: ${mode === 'dark' ? colors.error.dark : '#D95C5C'};
            --mui-alert-warning-bg: ${mode === 'dark' ? colors.chipBg.warning.dark : '#FFFBE6'};
            --mui-alert-warning-border: ${mode === 'dark' ? colors.warning.dark : '#FFF1B8'};
            --mui-alert-warning-color: ${mode === 'dark' ? colors.warning.dark : '#ff9800'};
            --mui-alert-info-bg: ${mode === 'dark' ? colors.chipBg.info.dark : '#E6F7FF'};
            --mui-alert-info-border: ${mode === 'dark' ? colors.info.dark : '#91D5FF'};
            --mui-alert-info-color: ${mode === 'dark' ? colors.info.dark : '#5588D3'};
          }
        `}</style>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
