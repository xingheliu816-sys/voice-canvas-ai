import type { Command } from './types';
import { validate } from './SchemaGuard';

export async function tryLLM(text: string): Promise<Command | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('/api/voice-command', {
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

    const ops = Array.isArray(json.ops) ? json.ops : [];
    if (ops.length === 0) return null;

    if (ops.length === 1) {
      const command = ops[0] as Command;
      return validate(command) ? command : null;
    }

    const batch: Command = {
      type: 'BATCH',
      batchId: `llm_${Date.now().toString(36)}`,
      commands: ops
    };

    return validate(batch) ? batch : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
