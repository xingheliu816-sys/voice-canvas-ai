import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

// Whitelist of subdirectories under storage/ that can be served
const ALLOWED_DIRS = new Set(['thumbnails', 'generated-images']);

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const segments = params.path || [];
  if (segments.length < 2) {
    return new Response('Not Found', { status: 404 });
  }

  const [topDir, ...rest] = segments;
  if (!topDir || !ALLOWED_DIRS.has(topDir)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Prevent path traversal
  if (rest.some((s) => s.includes('..') || s.includes('\\') || s.includes('/'))) {
    return new Response('Forbidden', { status: 403 });
  }

  const storageRoot = path.join(process.cwd(), 'storage');
  const filePath = path.join(storageRoot, topDir, ...rest);

  // Final safety check: resolved path must still be inside storageRoot
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(storageRoot) + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return new Response('Not Found', { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(resolved);

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
