// One entry per language version of the site. Adding a language = one entry here
// plus a dictionary in lib/i18n/.
export const LOCALES = {
  'en-us': { slug: 'studies', lang: 'en', intl: 'en-US', currency: 'USD', symbol: '$', label: 'English (US)', example: 'New York, United States' },
  fr: { slug: 'etudes', lang: 'fr', intl: 'fr-FR', currency: 'EUR', symbol: '€', label: 'Français', example: 'Paris, France' },
  es: { slug: 'estudios', lang: 'es', intl: 'es-ES', currency: 'EUR', symbol: '€', label: 'Español', example: 'Madrid, España' },
  it: { slug: 'studi', lang: 'it', intl: 'it-IT', currency: 'EUR', symbol: '€', label: 'Italiano', example: 'Milano, Italia' },
  de: { slug: 'studium', lang: 'de', intl: 'de-DE', currency: 'EUR', symbol: '€', label: 'Deutsch', example: 'Berlin, Deutschland' },
} as const;

export type Locale = keyof typeof LOCALES;
export type Currency = (typeof LOCALES)[Locale]['currency'];

export const DEFAULT_LOCALE: Locale = 'en-us';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in LOCALES;
}

export function localeFromSlug(slug: string): Locale | null {
  const found = (Object.keys(LOCALES) as Locale[]).find((l) => LOCALES[l].slug === slug);
  return found ?? null;
}

export function homePath(locale: Locale) {
  return `/${LOCALES[locale].slug}`;
}

export function registerPath(locale: Locale) {
  return `/register?lang=${locale}`;
}

export function formatMoney(cents: number, locale: Locale) {
  const { intl, currency } = LOCALES[locale];
  return new Intl.NumberFormat(intl, { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(LOCALES[locale].intl, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
