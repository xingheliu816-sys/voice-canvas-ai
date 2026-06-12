import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyToken } from './jwt';

export async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) throw new Response('Unauthorized', { status: 401 });
  try {
    return await verifyToken(token);
  } catch {
    throw new Response('Unauthorized', { status: 401 });
  }
}

export async function tryGetUser() {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}
