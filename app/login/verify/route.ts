import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Links from emails sent before passwords existed: they now open the page that sets the password.
export function GET(req: NextRequest) {
  const to = req.nextUrl.clone();
  to.pathname = '/login/password';
  return NextResponse.redirect(to);
}
