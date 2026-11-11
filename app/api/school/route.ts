import { NextRequest, NextResponse } from 'next/server';
import {
  createCheckout,
  joinWaitlist,
  listUniversities,
  mockPay,
  passwordAfterPayment,
  publicIntake,
  registrationStatus,
  saveLead,
  startPurchase,
  startRegistration,
} from '@/lib/school';
import { pricingFor } from '@/lib/pricing';
import { DEFAULT_LOCALE, isLocale } from '@/lib/locales';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limit per IP (per server instance).
const hits = new Map<string, number[]>();
function rateLimited(ip: string, limit = 20, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? '');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const locale = isLocale(body?.locale) ? body.locale : DEFAULT_LOCALE;

  try {
    switch (action) {
      case 'universities':
        return NextResponse.json(await listUniversities());
      case 'public_intake': {
        const intake = await publicIntake();
        return NextResponse.json(intake ? { ...intake, pricing: pricingFor(locale) } : null);
      }
      case 'start_registration':
        if (rateLimited(ip)) return NextResponse.json({ result: 'rate_limited' });
        return NextResponse.json(await startRegistration(body));
      case 'create_checkout':
        return NextResponse.json(await createCheckout(body));
      case 'registration_status':
        return NextResponse.json(await registrationStatus(body));
      case 'join_waitlist':
        if (rateLimited(ip)) return NextResponse.json({ result: 'rate_limited' });
        return NextResponse.json(await joinWaitlist(body));
      case 'start_purchase':
        if (rateLimited(ip)) return NextResponse.json({ result: 'rate_limited' });
        return NextResponse.json(await startPurchase(body));
      case 'contact':
        if (rateLimited(ip)) return NextResponse.json({ result: 'rate_limited' });
        return NextResponse.json(await saveLead(body));
      case 'set_password':
        if (rateLimited(ip)) return NextResponse.json({ result: 'rate_limited' });
        return NextResponse.json(await passwordAfterPayment(body));
      case 'mock_pay':
        return NextResponse.json(await mockPay(body));
      default:
        return NextResponse.json({ result: 'unknown_action' }, { status: 400 });
    }
  } catch (err) {
    console.error(`school/${action}`, err);
    return NextResponse.json({ result: 'error' }, { status: 500 });
  }
}
