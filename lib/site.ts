/** Name of the brand, as written everywhere on the site, in emails and on certificates. */
export const SITE_NAME = 'The AI Certification';

/**
 * Domain shown in texts and emails (“{domain}/support”). Set NEXT_PUBLIC_SITE_DOMAIN (for example example.com, without
 * https://) once the site has its domain name; until then the local address is shown.
 */
export const SITE_DOMAIN = (process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim() || `localhost:${process.env.PORT ?? 3000}`).replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Public address of the site: payment return links, Mollie webhook, emails, certificates. Never localhost in production. */
export function siteUrl() {
  const url =
    process.env.BASE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim() ? `https://${SITE_DOMAIN}` : '') ||
    `http://localhost:${process.env.PORT ?? 3000}`;
  return url.replace(/\/$/, '');
}
