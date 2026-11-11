/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a local dev server build elsewhere (NEXT_DIST_DIR=.next-dev) while a deploy uses .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // No Next.js badge in the corner while testing locally.
  devIndicators: false,
  // PGlite (local database) ships WASM files and must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite', 'nodemailer'],
  // Public pages are the same for every visitor: the host's CDN (Vercel or Netlify) keeps a copy for 5 minutes and serves it
  // instantly (refreshed in the background), so a click never waits for a cold server.
  async headers() {
    const cdn = [
      { key: 'Netlify-CDN-Cache-Control', value: 'public, durable, s-maxage=300, stale-while-revalidate=604800' },
      { key: 'Vercel-CDN-Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=604800' },
    ];
    // Only pages that ignore the query string: the CDN does not vary on ?lang=.
    const pages = ['/', '/studies', '/etudes', '/estudios', '/studi', '/studium', '/certifications/:slug'];
    return pages.map((source) => ({ source, headers: cdn }));
  },
};

export default nextConfig;
