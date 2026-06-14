import { requireUser } from '@/lib/auth/guard';
import { processVoiceCommand } from '@/lib/nlu/VoiceCommandRouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await requireUser();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const body = payload as {
    text?: unknown;
    canvasState?: unknown;
    recentCommands?: unknown;
  };

  if (typeof body.text !== 'string' || !body.text.trim()) {
    return Response.json({ error: 'TEXT_REQUIRED' }, { status: 400 });
  }

  const result = await processVoiceCommand({
    text: body.text,
    canvasState: body.canvasState,
    recentCommands: Array.isArray(body.recentCommands)
      ? body.recentCommands.filter((item): item is string => typeof item === 'string')
      : []
  });

  return Response.json(result);
}
