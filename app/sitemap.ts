import type { MetadataRoute } from 'next';
import { LOCALES, type Locale } from '@/lib/locales';
import { siteUrl } from '@/lib/site';

// Public pages only.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const locales = Object.keys(LOCALES) as Locale[];
  const languages = Object.fromEntries(locales.map((l) => [LOCALES[l].intl, `${base}/${LOCALES[l].slug}`]));
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 0.5 },
    ...locales.map((l) => ({ url: `${base}/${LOCALES[l].slug}`, changeFrequency: 'weekly' as const, priority: 1, alternates: { languages } })),
  ];
}
