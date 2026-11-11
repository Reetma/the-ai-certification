import type { Metadata } from 'next';
import Header from '@/components/Header';
import SetPasswordForm from '@/components/SetPasswordForm';
import { member } from '@/lib/i18n/member';
import { LOCALES } from '@/lib/locales';
import { localeFromSearch } from '@/lib/requestLocale';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: `${member(await localeFromSearch(searchParams)).login.setTitle} | The AI Certification`, robots: { index: false, follow: false } };
}

// Opened from an email: first sign-in after paying or joining, or a forgotten password.
export default async function SetPasswordPage({ searchParams }: Props) {
  const locale = await localeFromSearch(searchParams);
  const token = String((await searchParams).token ?? '');
  return (
    <div lang={LOCALES[locale].lang}>
      <Header locale={locale} minimal />
      <main id="main" className="register hero-bands">
        <div className="container">
          <SetPasswordForm locale={locale} token={token} />
        </div>
      </main>
    </div>
  );
}
