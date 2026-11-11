import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import SupportForm from '@/components/SupportForm';

export const metadata: Metadata = { title: 'Help and contact | The AI Certification' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// The single way to reach the team: every request becomes a ticket answered by email. English only, for every visitor.
export default async function SupportPage({ searchParams }: Props) {
  const topic = String((await searchParams).topic ?? '');
  return (
    <LegalPage locale="en-us" title="Help and contact" updated="Find a quick answer, or open a request.">
      <img className="support-mascot" src="/assets/course/support.webp" alt="" width={160} height={160} />
      {/* Self-service first: most requests are a lost password or a refund question. */}
      <h2>Quick answers</h2>
      <div className="help-shortcuts">
        <Link className="help-shortcut" href="/login?reset=1">
          <strong>Can’t sign in?</strong>
          <span>Forgot your password, or never set one? Get a link to choose a new one.</span>
          <span className="help-shortcut-cta">Reset my password →</span>
        </Link>
        <Link className="help-shortcut" href="/refund-policy">
          <strong>Thinking about a refund?</strong>
          <span>Our programs are digital content: purchases are final and non-refundable.</span>
          <span className="help-shortcut-cta">See the details →</span>
        </Link>
      </div>

      <h2>Open a request</h2>
      <p className="help">Anything else: write to us and we answer by email within 7 working days.</p>
      <div className="card" style={{ marginTop: 16 }}>
        <SupportForm topic={topic} />
      </div>
    </LegalPage>
  );
}
