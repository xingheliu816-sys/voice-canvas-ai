import { getDB } from '@/lib/db/init';
import { signToken, SESSION_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  if (!username || !password || username.length < 2 || password.length < 6) {
    return Response.json({ error: '用户名至少2位，密码至少6位' }, { status: 400 });
  }

  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return Response.json({ error: '用户名已存在' }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  const now = Date.now();

  db.prepare('INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)').run(id, username, hash, now);

  const token = await signToken({ userId: id, username });
  cookies().set(SESSION_COOKIE, token, COOKIE_OPTIONS);

  return Response.json({ id, username });
}
