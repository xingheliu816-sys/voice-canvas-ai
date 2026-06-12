import type { Command } from './types';
import { validate } from './SchemaGuard';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';

export async function tryLLM(text: string): Promise<Command | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch('/api/llm/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });

    if (!res.ok) {
      if (res.status === 503) return null; // Key not configured
      return null;
    }

    const json = await res.json();
    if (json.error) return null;

    // 客户端再校验一次（防御性）
    if (!validate(json as Command)) return null;

    return json as Command;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
