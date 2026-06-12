import { requireUser } from '@/lib/auth/guard';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireUser();
  return Response.json({ id: user.userId, username: user.username });
}
