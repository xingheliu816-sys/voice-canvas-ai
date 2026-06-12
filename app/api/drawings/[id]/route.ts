import { getDB } from '@/lib/db/init';
import { requireUser } from '@/lib/auth/guard';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = getDB();
  const row = db
    .prepare('SELECT * FROM drawings WHERE id = ? AND user_id = ?')
    .get(params.id, user.userId) as Record<string, unknown> | undefined;
  if (!row) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  return Response.json(row);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = getDB();
  const row = db
    .prepare('SELECT id FROM drawings WHERE id = ? AND user_id = ?')
    .get(params.id, user.userId);
  if (!row) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json();
  const now = Date.now();

  if (body.title !== undefined) {
    db.prepare('UPDATE drawings SET title = ?, updated_at = ? WHERE id = ?').run(body.title, now, params.id);
  }
  if (body.canvasJson !== undefined) {
    db.prepare('UPDATE drawings SET canvas_json = ?, updated_at = ? WHERE id = ?').run(body.canvasJson, now, params.id);
  }
  if (body.thumbnailBase64 !== undefined) {
    const thumbPath = path.join(process.cwd(), 'storage', 'thumbnails', `${params.id}.png`);
    const buf = Buffer.from(body.thumbnailBase64.split(',')[1] || body.thumbnailBase64, 'base64');
    fs.writeFileSync(thumbPath, buf);
    db.prepare('UPDATE drawings SET updated_at = ? WHERE id = ?').run(now, params.id);
  }

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = getDB();
  const row = db
    .prepare('SELECT id FROM drawings WHERE id = ? AND user_id = ?')
    .get(params.id, user.userId);
  if (!row) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });

  db.prepare('DELETE FROM drawings WHERE id = ?').run(params.id);

  const thumbPath = path.join(process.cwd(), 'storage', 'thumbnails', `${params.id}.png`);
  try { fs.unlinkSync(thumbPath); } catch {}

  return Response.json({ ok: true });
}
