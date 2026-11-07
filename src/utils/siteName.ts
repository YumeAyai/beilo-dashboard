export const DEFAULT_SITE_NAME = 'beilo Console';

export function resolveSiteName(siteName?: string): string {
  return !siteName || siteName === 'Beilo WAF' || siteName === 'Beilo Console' || siteName === 'beilo. Console' || siteName === 'beilo.'
    ? DEFAULT_SITE_NAME
    : siteName;
}
