import { SESSION_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  cookies().set(SESSION_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return Response.json({ ok: true });
}
