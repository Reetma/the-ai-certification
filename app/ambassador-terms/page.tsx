import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { company } from '@/lib/company';
import { AMBASSADOR_TERMS_VERSION, RATES } from '@/lib/team';
import { SITE_DOMAIN } from '@/lib/site';

export const metadata: Metadata = { title: 'Ambassador terms | The AI Certification' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Terms of the ambassador programme, linked from the invite page (with a way back to it) and sent by email on sign-up.
export default async function AmbassadorTerms({ searchParams }: Props) {
  const from = String((await searchParams).from ?? '');
  const back = /^[a-z0-9]{6,20}$/.test(from) ? `/${from}` : null;
  const owner = RATES.owner / 100;
  const parent = RATES.parent / 100;
  const second = RATES.grandparent / 100;

  return (
    <LegalPage locale="en-us" title="Ambassador terms" updated={`Version ${AMBASSADOR_TERMS_VERSION} · Last updated: October 25, 2026`}>
      {back && (
        <p><Link className="btn btn-sm btn-ghost" href={back}>← Back to my sign-up</Link></p>
      )}

      <div className="box">
        <p style={{ margin: 0 }}>
          <strong>In short:</strong> you hold one or more schools. You earn {owner} % of every payment made by a student of your schools, and{' '}
          {parent} % of the payments made at the schools of the ambassadors you invite directly, and {second} % at the schools of the ambassadors
          they invite. Joining is free, nothing has to be bought, and
          nothing is ever earned just for recruiting someone: every commission comes from a real student purchase.
        </p>
      </div>

      <h2>1. The programme</h2>
      <p>
        These terms bind you and {company.name || 'The AI Certification'} (“The AI Certification”) when you join The AI Certification ambassador programme through an invite link.
        Ticking the box on the sign-up page means you accept them.
      </p>

      <h2>2. Who can join</h2>
      <ul>
        <li>You must be at least 18 and give accurate information.</li>
        <li>Each school has a single ambassador: the first person to choose it keeps it. You can hold several schools.</li>
        <li>Joining is free. You never have to buy a certification, pay a fee or reach a quota.</li>
      </ul>

      <h2>3. How you earn</h2>
      <ul>
        <li><strong>{owner} %</strong> of the amount actually paid by each student registered with one of your schools.</li>
        <li><strong>{parent} %</strong> of the amount actually paid by students of the schools held by the ambassadors you invited directly.</li>
        <li><strong>{second} %</strong> of the amount actually paid by students of the schools held by the ambassadors they invited. Nothing is earned further down, even though you can see your whole network.</li>
        <li>Students are matched to you automatically by their school. You don’t need a code or a link.</li>
        <li>A commission is recorded once the student’s payment is confirmed. If a payment is cancelled, refunded or disputed, its commission is cancelled too.</li>
      </ul>

      <h2>4. Why this is legal</h2>
      <p>
        French law forbids pyramid schemes, where people earn mainly by recruiting others or by making them pay to join (article L121-15 of the
        French Consumer Code). This programme is the opposite: joining costs nothing, nobody has to buy anything, and every commission is a share
        of a real sale of a certification to a student who uses it. Recruiting an ambassador earns nothing by itself; you only earn when their
        students buy. Commissions stop after two levels below you.
      </p>

      <h2>5. Payouts</h2>
      <ul>
        <li>Add your IBAN (an account in your own name) in your ambassador space, then request a payout of the amounts you are owed.</li>
        <li>The AI Certification sends the funds by bank transfer within 48 hours of the request.</li>
        <li>You are responsible for declaring what you earn and paying the related taxes and social contributions.</li>
      </ul>

      <h2>6. Your status</h2>
      <p>
        You act as an independent partner, not as an employee or an agent of The AI Certification, and you organise your time as you wish. To receive payouts
        you must have a legal status that lets you invoice for this income (see the note at the bottom of this page).
      </p>

      <h2>7. How you may talk about The AI Certification</h2>
      <ul>
        <li>Be honest: The AI Certification certifications are private certificates, not university diplomas, and The AI Certification is independent from every school.</li>
        <li>Say clearly that you earn a commission when you recommend The AI Certification (French law on commercial influence, 2023).</li>
        <li>Never send unsolicited messages in bulk, never use personal data you were not allowed to use, and never pose as your school or as The AI Certification.</li>
        <li>Never promise a refund, a discount or a result (job, grade, internship) on behalf of The AI Certification.</li>
      </ul>

      <h2>8. Schools, suspension and termination</h2>
      <ul>
        <li>You can stop at any time by writing through <Link href="/support">{SITE_DOMAIN}/support</Link>. Commissions already owed remain payable.</li>
        <li>The AI Certification may release a school that shows no activity for 6 months, and may suspend an account that breaks these terms; commissions linked to a breach are cancelled.</li>
        <li>The AI Certification may change the rates or these terms for the future. You are told by email at least 15 days before, and you can leave the programme.</li>
      </ul>

      <h2>9. Personal data and law</h2>
      <p>
        Your data is used to run the programme and pay you, as described in the <Link href="/privacy">privacy policy</Link>. These terms are governed by
        French law. Questions: <Link href="/support">{SITE_DOMAIN}/support</Link>.
      </p>

      {back && (
        <p style={{ marginTop: 32 }}><Link className="btn btn-green" href={back}>← Back to my sign-up</Link></p>
      )}

      <p className="help" style={{ marginTop: 40, fontSize: 12 }}>
        Note: to receive your commissions in France you need a business status, for example a micro-entreprise (auto-entrepreneur), which can be
        created for free online in a few minutes. Outside France, you need the equivalent status in your country.
      </p>
    </LegalPage>
  );
}
