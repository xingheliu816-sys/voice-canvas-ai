import { getDB } from '@/lib/db/init';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  try {
    const db = getDB();
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch {
    // DB unavailable
  }

  return Response.json({
    status: dbOk ? 'ok' : 'degraded',
    asr: 'web-speech',
    nlu: 'rule-first-deepseek-fallback',
    llm: process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY ? 'enabled' : 'optional',
    storage: dbOk ? 'sqlite' : 'unavailable',
    version: '0.1.0'
  });
}
