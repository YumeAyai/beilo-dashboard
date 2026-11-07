import type { TFunction } from 'i18next';
import { colors } from '../../theme/colors';

// 动作标签映射
export const ACTION_LABELS: Record<string, { labelKey: string; color: { light: string; dark: string }; bgLight: string; bgDark: string }> = {
  block: { labelKey: 'rules.action.block', color: colors.error, bgLight: colors.error.light + '15', bgDark: colors.error.dark + '15' },
  allow: { labelKey: 'rules.action.allow', color: colors.success, bgLight: colors.success.light + '15', bgDark: colors.success.dark + '15' },
  pass: { labelKey: 'rules.action.pass', color: colors.warning, bgLight: colors.warning.light + '15', bgDark: colors.warning.dark + '15' },
  log: { labelKey: 'rules.action.log', color: colors.info, bgLight: colors.info.light + '15', bgDark: colors.info.dark + '15' },
  redirect: { labelKey: 'rules.action.redirect', color: { light: '#722ED1', dark: '#BA68C8' }, bgLight: '#722ED115', bgDark: '#BA68C815' },
  drop: { labelKey: 'rules.action.drop', color: colors.error, bgLight: colors.error.light + '15', bgDark: colors.error.dark + '15' },
  status: { labelKey: 'rules.action.status', color: { light: '#86909C', dark: '#A6A6A6' }, bgLight: colors.chipBg.default.light, bgDark: colors.chipBg.default.dark },
};

// Helper function to get action label
export function getActionLabel(t: TFunction, action: string): string {
  return ACTION_LABELS[action] ? t(ACTION_LABELS[action].labelKey) : action;
}

// 格式化时间
export function formatTime(timestamp?: string, t?: TFunction): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (t) {
    if (days > 0) return t('common.daysAgo', { count: days });
    if (hours > 0) return t('common.hoursAgo', { count: hours });
    if (mins > 0) return t('common.minutesAgo', { count: mins });
    return t('common.justNow');
  }

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (mins > 0) return `${mins}分钟前`;
  return '刚刚';
}
