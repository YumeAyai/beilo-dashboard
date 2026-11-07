import { colors } from './colors';

export const getChartPalette = (isDark: boolean) => isDark ? colors.palette.soft : colors.palette.base;
export const getDonutPalette = (isDark: boolean) => isDark ? colors.donut.dark : colors.donut.light;

const categoryOrder: Record<'browser' | 'os', Record<string, number>> = {
  browser: { chrome: 0, firefox: 1, safari: 2, edge: 3, 'internet explorer': 4 },
  os: { windows: 0, macos: 1, linux: 2, ios: 3, android: 4 },
};

// Category identity controls color; sorting by request count only changes position.
export function getClientCategoryColor(name: string, kind: 'browser' | 'os', isDark: boolean) {
  const palette = getDonutPalette(isDark);
  const key = name.trim().toLowerCase();
  const index = Object.hasOwn(categoryOrder[kind], key) ? categoryOrder[kind][key] : palette.length - 1;
  return palette[index];
}

export function getResponseStatusColor(status: string, isDark: boolean) {
  const mode = isDark ? 'dark' : 'light';
  switch (status.trim().charAt(0)) {
    case '2': return colors.donut.status.success[mode];
    case '3': return colors.donut.status.redirect[mode];
    case '4': return colors.donut.status.clientError[mode];
    case '5': return colors.donut.status.serverError[mode];
    default: return getDonutPalette(isDark).at(-1)!;
  }
}
