import 'server-only';

// Private pages are served by the dynamic [locale] route rather than routes of their own,
// so their addresses never appear in the route tree or the client code.
export const PRIVATE_SLUGS = { admin: 'admin', ambassador: 'ambassador' } as const;
