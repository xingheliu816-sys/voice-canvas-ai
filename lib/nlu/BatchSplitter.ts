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
  return 'batch_' + crypto.randomUUID().slice(0, 8);
}
