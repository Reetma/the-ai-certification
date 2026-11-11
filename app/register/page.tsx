import type { Metadata } from 'next';
import Header from '@/components/Header';
import RegisterFlow, { type Intake, type University } from '@/components/RegisterFlow';
import { listUniversities, publicIntake } from '@/lib/school';
import { pricingFor } from '@/lib/pricing';
import { dict } from '@/lib/i18n';
import { LOCALES } from '@/lib/locales';
import { localeFromSearch } from '@/lib/requestLocale';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return { title: dict(await localeFromSearch(searchParams)).register.pageTitle };
}

export default async function RegisterPage({ searchParams }: Props) {
  const locale = await localeFromSearch(searchParams);
  const [universities, intake] = await Promise.all([listUniversities(), publicIntake().catch(() => null)]);
  // Alphabetical as people expect it: « École » with the E's, not after Z.
  universities.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true }));
  // Plain JSON, as the browser used to receive it from the API (dates as strings).
  const initialIntake = JSON.parse(JSON.stringify(intake ? { ...intake, pricing: pricingFor(locale) } : null)) as Intake | null;
  return (
    <div lang={LOCALES[locale].lang}>
      <Header locale={locale} minimal />
      <main id="main" className="register hero-bands">
        <div className="container">
          <RegisterFlow locale={locale} initialUniversities={universities as University[]} initialIntake={initialIntake} />
        </div>
      </main>
    </div>
  );
}
