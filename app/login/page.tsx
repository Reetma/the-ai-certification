import type { Metadata } from 'next';
import Header from '@/components/Header';
import LoginForm from '@/components/LoginForm';
import { member } from '@/lib/i18n/member';
import { LOCALES } from '@/lib/locales';
import { localeFromSearch } from '@/lib/requestLocale';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: `${member(await localeFromSearch(searchParams)).login.title} | The AI Certification`, robots: { index: false, follow: false } };
}

export default async function LoginPage({ searchParams }: Props) {
  const locale = await localeFromSearch(searchParams);
  const query = await searchParams;
  const expired = query.expired === '1';
  // /login?reset=1 opens straight on "forgot your password".
  const reset = query.reset === '1';
  return (
    <div lang={LOCALES[locale].lang}>
      <Header locale={locale} minimal />
      <main id="main" className="register hero-bands">
        <div className="container">
          <LoginForm locale={locale} expired={expired} reset={reset} />
        </div>
      </main>
    </div>
  );
}
