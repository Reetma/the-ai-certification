import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// Deliberately lists no private paths: naming them here would reveal them.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return { rules: [{ userAgent: '*', allow: '/' }], sitemap: `${base}/sitemap.xml` };
}
