import type { CanvasObject } from './types';
import { useCanvasStore } from './ObjectStore';

interface HistoryEntry {
  batchId: string;
  rawText: string;
  canvasId: string;
  before: CanvasObject[];
  after: CanvasObject[];
  createdAt: number;
}

let history: HistoryEntry[] = [];
let undone: HistoryEntry[] = [];

// TODO: canvas create/delete undo should restore whole project snapshots.
// Current history intentionally scopes shape operations to the active canvas.

export function pushHistory(
  batchId: string,
  rawText: string,
  before: CanvasObject[],
  after: CanvasObject[]
) {
  const canvasId = useCanvasStore.getState().activeCanvasId;
  history.push({ batchId, rawText, canvasId, before, after, createdAt: Date.now() });
  undone = [];
  if (history.length > 50) history.shift();
}

export function undo(): CanvasObject[] | null {
  const canvasId = useCanvasStore.getState().activeCanvasId;
  const index = history.findLastIndex((entry) => entry.canvasId === canvasId);
  if (index < 0) return null;
  const [entry] = history.splice(index, 1);
  if (!entry) return null;
  undone.push(entry);
  return entry.before;
}

export function redo(): CanvasObject[] | null {
  const canvasId = useCanvasStore.getState().activeCanvasId;
  const index = undone.findLastIndex((entry) => entry.canvasId === canvasId);
  if (index < 0) return null;
  const [entry] = undone.splice(index, 1);
  if (!entry) return null;
  history.push(entry);
  return entry.after;
}

export function clearHistory() {
  history = [];
  undone = [];
}
