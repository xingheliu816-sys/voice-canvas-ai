import { SignJWT, jwtVerify } from 'jose';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SECRET_FILE = path.join(process.cwd(), '.env.local');

function loadOrCreateSecret(): Uint8Array {
  if (process.env.AUTH_JWT_SECRET) {
    return new TextEncoder().encode(process.env.AUTH_JWT_SECRET);
  }
  const generated = crypto.randomBytes(48).toString('hex');
  const line = `\nAUTH_JWT_SECRET=${generated}\n`;
  try {
    fs.appendFileSync(SECRET_FILE, line);
  } catch {}
  process.env.AUTH_JWT_SECRET = generated;
  return new TextEncoder().encode(generated);
}

export async function signToken(payload: { userId: string; username: string }) {
  const secret = loadOrCreateSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const secret = loadOrCreateSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: string; username: string; iat: number; exp: number };
}

export const SESSION_COOKIE = 'vca_session';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60
};
