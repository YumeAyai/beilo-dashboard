import catalog from '../data/threatCatalog.generated.json';
import { colors } from '../theme/colors';

export const threatCategories = catalog.categories;
const definitions = new Map(threatCategories.flatMap(category => [category.id, ...category.aliases].map(id => [id, category] as const)));
export const threatCategoryKeys: Record<string, string> = Object.fromEntries([...definitions].map(([id, category]) => [id, category.label_key]));

export function normalizeThreatCategory(value: string): string {
  return definitions.get(value.trim().toLowerCase())?.id || value.trim();
}

export function getThreatCategoryColors(value: string) {
  const category = definitions.get(value.trim().toLowerCase());
  return colors.attack[category?.color_key as keyof typeof colors.attack] || colors.attack.unknown;
}

export function getThreatCategoryChartColors(value: string) {
  const category = definitions.get(value.trim().toLowerCase());
  return colors.donut.attack[category?.color_key as keyof typeof colors.donut.attack] || colors.donut.attack.unknown;
}

// The WAF action confirms interruption even when a custom rule has no attack tags.
// A URL, a matched rule ID, or an HTTP error alone does not confirm blocking.
export function getThreatAction(action?: string | null): 'blocked' | 'detected' | 'logged' | 'allowed' | 'unknown' {
  switch (action?.trim().toLowerCase()) {
    case 'block': case 'blocked': case 'deny': case 'denied': case 'drop': case 'dropped': return 'blocked';
    case 'detected': case 'suspicious': case 'alert': case 'alerted': return 'detected';
    case 'log': case 'logged': return 'logged';
    case 'allow': case 'allowed': case 'pass': case 'passed': return 'allowed';
    default: return 'unknown';
  }
}

export function getThreatCategory(event: { attackType?: string | null; action?: string | null; ruleIDs?: string[]; attackTypes?: string[] }): string {
  const category = event.attackType?.trim() || event.attackTypes?.find(value => value.trim() && value.toLowerCase() !== 'unknown')?.trim() || '';
  const normalized = category.toLowerCase();
  if (!category || normalized === 'unknown') {
    if (getThreatAction(event.action) === 'blocked') return 'rule_block';
    return event.ruleIDs?.some(id => id.trim()) ? 'rule_alert' : 'unknown';
  }
  return normalizeThreatCategory(category);
}
