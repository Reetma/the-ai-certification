'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client';

function Inner() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);

  async function finish(outcome: 'paid' | 'canceled') {
    setBusy(true);
    const res = await api('mock_pay', { registration_id: params.get('id'), client_token: params.get('t'), outcome });
    if (res?.redirect) window.location.assign(res.redirect);
    else setBusy(false);
  }

  return (
    <div className="register-card">
      <span className="badge" style={{ background: '#B54708' }}>Test mode</span>
      <h1 style={{ marginTop: 16 }}>Simulated payment page</h1>
      <p className="lead">No Mollie key is configured, so this page stands in for the Mollie checkout. It does not exist in production.</p>
      <div className="row-actions">
        <button className="btn btn-ghost" disabled={busy} onClick={() => finish('canceled')}>Cancel payment</button>
        <button className="btn btn-green" disabled={busy} onClick={() => finish('paid')}>Simulate successful payment</button>
      </div>
    </div>
  );
}

export default function MockPay() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
