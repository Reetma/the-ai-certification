import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Landing from '@/components/Landing';
import AdminConsole from '@/components/private/AdminConsole';
import TeamConsole from '@/components/private/TeamConsole';
import JoinPage from '@/components/private/JoinPage';
import { currentUser, type User } from '@/lib/auth';
import { dict } from '@/lib/i18n';
import { LOCALES, localeFromSlug, type Locale } from '@/lib/locales';
import { PRIVATE_SLUGS } from '@/lib/private';
import { inviterByCode } from '@/lib/team';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Private =
  | { kind: 'admin'; user: User }
  | { kind: 'team'; user: User }
  | { kind: 'join'; code: string; inviterName: string }
  | null;

/**
 * What a non-language slug shows: the admin console, the ambassador space, an invite page, or nothing
 * (then a plain 404). The session and the invite lookup run for every such slug, so private and unknown
 * addresses take the same path.
 */
async function privatePage(slug: string): Promise<Private> {
  const user = await currentUser();
  const inviter = await inviterByCode(slug);
  if (slug === PRIVATE_SLUGS.admin && user?.role === 'admin') return { kind: 'admin', user };
  if (slug === PRIVATE_SLUGS.ambassador && (user?.role === 'ambassador' || user?.role === 'admin')) return { kind: 'team', user };
  if (inviter) return { kind: 'join', code: slug, inviterName: inviter.first_name ?? '' };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).locale;
  const locale = localeFromSlug(slug);
  if (!locale) {
    return (await privatePage(slug)) ? { title: 'The AI Certification', robots: { index: false, follow: false } } : {};
  }
  const { meta } = dict(locale);
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      languages: Object.fromEntries(
        (Object.keys(LOCALES) as Locale[]).map((l) => [LOCALES[l].intl, `/${LOCALES[l].slug}`]),
      ),
    },
  };
}

export default async function LocalePage({ params, searchParams }: Props) {
  const slug = (await params).locale;
  const locale = localeFromSlug(slug);
  if (locale) return <Landing locale={locale} />;

  const page = await privatePage(slug);
  // The admin and ambassador addresses send signed-out visitors to the sign-in page.
  if (!page && (slug === PRIVATE_SLUGS.admin || slug === PRIVATE_SLUGS.ambassador)) redirect(`/login?lang=${slug === PRIVATE_SLUGS.admin ? 'fr' : 'en-us'}`);
  if (!page) notFound();
  const query = await searchParams;
  if (page.kind === 'admin') return <AdminConsole admin={page.user} params={query} />;
  if (page.kind === 'team') return <TeamConsole user={page.user} params={query} />;
  return <JoinPage code={page.code} inviterName={page.inviterName} params={query} />;
}
