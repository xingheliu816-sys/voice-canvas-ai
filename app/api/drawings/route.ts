import { getDB } from '@/lib/db/init';
import { requireUser } from '@/lib/auth/guard';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function GET() {
  const user = await requireUser();
  const db = getDB();
  const rows = db
    .prepare('SELECT id, title, thumbnail_url, created_at, updated_at FROM drawings WHERE user_id = ? ORDER BY updated_at DESC')
    .all(user.userId);
  return Response.json(rows);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const { title, canvasJson, thumbnailBase64 } = await req.json();
  if (!title || !canvasJson) {
    return Response.json({ error: '缺少 title 或 canvasJson' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  // 保存缩略图
  const thumbDir = path.join(process.cwd(), 'storage', 'thumbnails');
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
  const thumbPath = path.join(thumbDir, `${id}.png`);
  if (thumbnailBase64) {
    const buf = Buffer.from(thumbnailBase64.split(',')[1] || thumbnailBase64, 'base64');
    fs.writeFileSync(thumbPath, buf);
  }

  const db = getDB();
  db.prepare(
    'INSERT INTO drawings (id, user_id, title, canvas_json, thumbnail_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, user.userId, title, canvasJson, `/api/files/thumbnails/${id}.png`, now, now);

  return Response.json({ id, title, updatedAt: now }, { status: 201 });
}
