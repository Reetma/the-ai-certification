import type { Locale } from '../locales';
import en, { type Dict } from './en';
import fr from './fr';
import es from './es';
import it from './it';
import de from './de';

const DICTS: Record<Locale, Dict> = { 'en-us': en, fr, es, it, de };

export function dict(locale: Locale): Dict {
  return DICTS[locale];
}

export type { Dict };
