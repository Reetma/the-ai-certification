import { DEFAULT_LOCALE, isLocale, type Locale } from './locales';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Language of pages shared by every version (register, confirmation, legal), from `?lang=`. */
export async function localeFromSearch(searchParams: SearchParams): Promise<Locale> {
  const lang = (await searchParams).lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}
