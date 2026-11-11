import { NextRequest, NextResponse } from 'next/server';
import { MollieError } from '@/lib/mollie';
import { syncPayment } from '@/lib/school';

export const dynamic = 'force-dynamic';

// Mollie posts `id=tr_xxx`. We never trust the body beyond the id:
// the status is always fetched from the Mollie API.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const id = form?.get('id');
  if (typeof id === 'string' && /^tr_[A-Za-z0-9]+$/.test(id)) {
    try {
      await syncPayment(id);
    } catch (err) {
      // A payment made with the previous key (test before live) no longer exists for this one: nothing to retry.
      if (err instanceof MollieError && err.status === 404) return new NextResponse('ok');
      console.error('mollie webhook', err);
      return new NextResponse('error', { status: 500 }); // Mollie retries
    }
  }
  return new NextResponse('ok');
}
