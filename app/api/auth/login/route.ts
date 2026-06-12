import { getDB } from '@/lib/db/init';
import { signToken, SESSION_COOKIE, COOKIE_OPTIONS } from '@/lib/auth/jwt';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return Response.json({ error: '请输入用户名和密码' }, { status: 400 });
  }

  const db = getDB();
  const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username) as { id: string; username: string; password: string } | undefined;
  if (!user) {
    return Response.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return Response.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, username: user.username });
  cookies().set(SESSION_COOKIE, token, COOKIE_OPTIONS);

  return Response.json({ id: user.id, username: user.username });
}
