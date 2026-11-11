import { notFound } from 'next/navigation';
import MockPay from '@/components/MockPay';
import { mockPaymentsEnabled } from '@/lib/mollie';

// Stand-in for the Mollie checkout while no Mollie key is configured (development only).
export const dynamic = 'force-dynamic';

export default async function MockPayPage() {
  if (!(await mockPaymentsEnabled())) notFound();
  return (
    <main className="register">
      <div className="container">
        <MockPay />
      </div>
    </main>
  );
}
