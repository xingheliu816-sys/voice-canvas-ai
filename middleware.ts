import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/api/drawings', '/api/logs'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    const token = req.cookies.get('vca_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/drawings/:path*', '/api/logs/:path*']
};
