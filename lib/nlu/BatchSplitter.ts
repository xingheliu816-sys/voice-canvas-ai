const CONNECTORS = /(和|还有|然后|再画|接着|另外)/;

export function splitText(rawText: string): string[] {
  if (!CONNECTORS.test(rawText)) return [rawText];
  const parts = rawText
    .split(CONNECTORS)
    .filter((s) => s && !CONNECTORS.test(s))
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [rawText];
}

export function buildBatchId(): string {
  const g = (typeof globalThis !== 'undefined' ? globalThis : window) as any;
  const uuid =
    g?.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return 'batch_' + uuid.slice(0, 8);
}
