import type { CanvasObject } from './types';

interface HistoryEntry {
  batchId: string;
  rawText: string;
  before: CanvasObject[];
  after: CanvasObject[];
  createdAt: number;
}

let history: HistoryEntry[] = [];
let undone: HistoryEntry[] = [];

export function pushHistory(
  batchId: string,
  rawText: string,
  before: CanvasObject[],
  after: CanvasObject[]
) {
  history.push({ batchId, rawText, before, after, createdAt: Date.now() });
  undone = [];
  if (history.length > 50) history.shift();
}

export function undo(): CanvasObject[] | null {
  const entry = history.pop();
  if (!entry) return null;
  undone.push(entry);
  return entry.before;
}

export function redo(): CanvasObject[] | null {
  const entry = undone.pop();
  if (!entry) return null;
  history.push(entry);
  return entry.after;
}

export function clearHistory() {
  history = [];
  undone = [];
}
