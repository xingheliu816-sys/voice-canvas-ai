import { create } from 'zustand';
import type { CanvasObject, CanvasPage, CanvasViewport, DrawingProject } from './types';
import { DEFAULT_VIEWPORT } from './types';

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 720;

export const MIN_CANVAS_SCALE = 0.3;
export const MAX_CANVAS_SCALE = 3;

type DeleteCanvasResult =
  | { ok: true; deleted: CanvasPage; activeCanvasId: string }
  | { ok: false; reason: 'last-canvas' | 'not-found' };

interface CanvasState {
  project: DrawingProject;
  canvases: CanvasPage[];
  activeCanvasId: string;
  objects: CanvasObject[];
  canvasBackground: string;
  viewport: CanvasViewport;
  selectedId: string | null;
  /** 单调递增计数，组件可订阅以感知 viewport / store 更新 */
  rev: number;
  /** 获取活动画布下一个编号（不消耗） */
  peekNextNumber: () => number;
  addObject: (obj: CanvasObject) => CanvasObject;
  removeObject: (id: string) => void;
  updateObject: (id: string, changes: Partial<CanvasObject>) => void;
  replaceObject: (id: string, obj: CanvasObject) => void;
  setObjects: (objs: CanvasObject[]) => void;
  selectObject: (id: string | null) => void;
  clearAll: () => void;
  createCanvas: (name?: string) => CanvasPage;
  deleteCanvas: (target?: 'current' | { id: string } | { index: number }) => DeleteCanvasResult;
  switchCanvas: (target: string | 'next' | 'prev' | { id: string } | { index: number }) => CanvasPage | null;
  renameCanvas: (target: 'current' | { id: string }, name: string) => CanvasPage | null;
  setCanvasBackground: (color: string) => void;
  setViewport: (viewport: Partial<CanvasViewport>) => void;
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number, center?: { x: number; y: number }) => void;
  zoomTo: (scale: number, center?: { x: number; y: number }) => void;
  resetView: () => void;
  loadProject: (project: DrawingProject) => void;
  resetProject: () => void;
}

function nowIso() {
  return new Date().toISOString();
}

function genId(prefix: string) {
  const g = globalThis as any;
  const uuid = g?.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid.slice(0, 8)}`;
}

function createCanvasPage(index: number, name?: string, shapes: CanvasObject[] = []): CanvasPage {
  const now = nowIso();
  return {
    id: genId('canvas'),
    name: name || `画布 ${index}`,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    backgroundColor: '#fafaf8',
    shapes,
    viewport: { ...DEFAULT_VIEWPORT },
    nextNumber: shapes.length ? Math.max(...shapes.map((s) => s.number || s.index || 0)) + 1 : 1,
    createdAt: now,
    updatedAt: now
  };
}

function createDefaultProject(title = '未命名作品'): DrawingProject {
  const now = nowIso();
  const firstCanvas = createCanvasPage(1);
  return {
    id: genId('project'),
    title,
    activeCanvasId: firstCanvas.id,
    canvases: [firstCanvas],
    createdAt: now,
    updatedAt: now
  };
}

function activeCanvas(project: DrawingProject): CanvasPage | undefined {
  return project.canvases.find((canvas) => canvas.id === project.activeCanvasId);
}

function clampScale(scale: number) {
  return Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, scale));
}

function syncSlice(project: DrawingProject, selectedId: string | null = null, rev = 0) {
  const canvas = activeCanvas(project);
  const objects = canvas?.shapes ?? [];
  return {
    project,
    canvases: project.canvases,
    activeCanvasId: project.activeCanvasId,
    objects,
    canvasBackground: canvas?.backgroundColor || '#fafaf8',
    viewport: canvas?.viewport ? { ...canvas.viewport } : { ...DEFAULT_VIEWPORT },
    selectedId: selectedId && objects.some((obj) => obj.id === selectedId) ? selectedId : null,
    rev
  };
}

function updateActiveCanvas(project: DrawingProject, updater: (canvas: CanvasPage) => CanvasPage): DrawingProject {
  const now = nowIso();
  return {
    ...project,
    updatedAt: now,
    canvases: project.canvases.map((canvas) =>
      canvas.id === project.activeCanvasId
        ? updater({ ...canvas, updatedAt: now })
        : canvas
    )
  };
}

function ensureViewport(canvas: CanvasPage): CanvasViewport {
  return canvas.viewport ? { ...canvas.viewport } : { ...DEFAULT_VIEWPORT };
}

function ensureNextNumber(canvas: CanvasPage): number {
  if (typeof canvas.nextNumber === 'number' && canvas.nextNumber > 0) return canvas.nextNumber;
  if (!canvas.shapes.length) return 1;
  return Math.max(...canvas.shapes.map((s) => s.number || s.index || 0)) + 1;
}

function targetCanvasIndex(canvases: CanvasPage[], activeCanvasId: string, target?: 'current' | { id: string } | { index: number }) {
  if (!target || target === 'current') return canvases.findIndex((canvas) => canvas.id === activeCanvasId);
  if ('id' in target) return canvases.findIndex((canvas) => canvas.id === target.id);
  return target.index - 1;
}

function nextCanvasName(canvases: CanvasPage[]) {
  const maxNumber = canvases.reduce((max, canvas) => {
    const match = canvas.name.match(/^画布\s*(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `画布 ${maxNumber + 1 || canvases.length + 1}`;
}

const initialProject = createDefaultProject();

export const useCanvasStore = create<CanvasState>((set, get) => ({
  ...syncSlice(initialProject),

  peekNextNumber: () => {
    const state = get();
    const canvas = state.canvases.find((c) => c.id === state.activeCanvasId);
    if (!canvas) return 1;
    return ensureNextNumber(canvas);
  },

  addObject: (obj) => {
    let assigned: CanvasObject = obj;
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => {
        const num = obj.number && obj.number > 0 ? obj.number : ensureNextNumber(canvas);
        assigned = { ...obj, number: num, index: num };
        return {
          ...canvas,
          shapes: [...canvas.shapes, assigned],
          nextNumber: Math.max(ensureNextNumber(canvas), num + 1)
        };
      });
      return { ...syncSlice(project, assigned.id, s.rev + 1) };
    });
    return assigned;
  },

  removeObject: (id) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: canvas.shapes.filter((obj) => obj.id !== id)
      }));
      return { ...syncSlice(project, s.selectedId === id ? null : s.selectedId, s.rev + 1) };
    }),

  updateObject: (id, changes) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: canvas.shapes.map((obj) => (obj.id === id ? { ...obj, ...changes } : obj))
      }));
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  replaceObject: (id, obj) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: canvas.shapes.map((item) => (item.id === id ? obj : item))
      }));
      return { ...syncSlice(project, obj.id, s.rev + 1) };
    }),

  setObjects: (objs) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: objs,
        nextNumber: objs.length
          ? Math.max(...objs.map((o) => o.number || o.index || 0)) + 1
          : 1
      }));
      return { ...syncSlice(project, null, s.rev + 1) };
    }),

  selectObject: (id) =>
    set((s) => ({ selectedId: id && s.objects.some((obj) => obj.id === id) ? id : null })),

  clearAll: () =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: [],
        nextNumber: 1
      }));
      return { ...syncSlice(project, null, s.rev + 1) };
    }),

  createCanvas: (name) => {
    let created!: CanvasPage;
    set((s) => {
      created = createCanvasPage(s.canvases.length + 1, name || nextCanvasName(s.canvases));
      const project = {
        ...s.project,
        activeCanvasId: created.id,
        updatedAt: nowIso(),
        canvases: [...s.canvases, created]
      };
      return { ...syncSlice(project, null, s.rev + 1) };
    });
    return created;
  },

  deleteCanvas: (target = 'current') => {
    const state = get();
    if (state.canvases.length <= 1) return { ok: false, reason: 'last-canvas' };
    const index = targetCanvasIndex(state.canvases, state.activeCanvasId, target);
    if (index < 0 || index >= state.canvases.length) return { ok: false, reason: 'not-found' };

    const deleted = state.canvases[index]!;
    const remaining = state.canvases.filter((canvas) => canvas.id !== deleted.id);
    const nextIndex = Math.min(index, remaining.length - 1);
    const activeCanvasId = remaining[nextIndex]!.id;
    const project = {
      ...state.project,
      activeCanvasId,
      updatedAt: nowIso(),
      canvases: remaining
    };
    set({ ...syncSlice(project, null, state.rev + 1) });
    return { ok: true, deleted, activeCanvasId };
  },

  switchCanvas: (target) => {
    const state = get();
    let index = -1;
    if (target === 'next') {
      const current = state.canvases.findIndex((canvas) => canvas.id === state.activeCanvasId);
      index = (current + 1) % state.canvases.length;
    } else if (target === 'prev') {
      const current = state.canvases.findIndex((canvas) => canvas.id === state.activeCanvasId);
      index = (current - 1 + state.canvases.length) % state.canvases.length;
    } else if (typeof target === 'string') {
      index = state.canvases.findIndex((canvas) => canvas.id === target);
    } else if ('id' in target) {
      index = state.canvases.findIndex((canvas) => canvas.id === target.id);
    } else {
      index = target.index - 1;
    }
    const canvas = state.canvases[index];
    if (!canvas) return null;

    const project = { ...state.project, activeCanvasId: canvas.id, updatedAt: nowIso() };
    set({ ...syncSlice(project, null, state.rev + 1) });
    return canvas;
  },

  renameCanvas: (target, name) => {
    const state = get();
    const id = target === 'current' ? state.activeCanvasId : target.id;
    const canvas = state.canvases.find((item) => item.id === id);
    if (!canvas) return null;

    const project = {
      ...state.project,
      updatedAt: nowIso(),
      canvases: state.canvases.map((item) =>
        item.id === id ? { ...item, name, updatedAt: nowIso() } : item
      )
    };
    set({ ...syncSlice(project, state.selectedId, state.rev + 1) });
    return { ...canvas, name };
  },

  setCanvasBackground: (color) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        backgroundColor: color
      }));
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  setViewport: (vp) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => {
        const current = ensureViewport(canvas);
        const merged: CanvasViewport = {
          x: vp.x ?? current.x,
          y: vp.y ?? current.y,
          scale: clampScale(vp.scale ?? current.scale)
        };
        return { ...canvas, viewport: merged };
      });
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  panBy: (dx, dy) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => {
        const vp = ensureViewport(canvas);
        return { ...canvas, viewport: { ...vp, x: vp.x + dx, y: vp.y + dy } };
      });
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  zoomBy: (factor, center) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => {
        const vp = ensureViewport(canvas);
        const newScale = clampScale(vp.scale * factor);
        if (!center) {
          return { ...canvas, viewport: { ...vp, scale: newScale } };
        }
        const worldX = (center.x - vp.x) / vp.scale;
        const worldY = (center.y - vp.y) / vp.scale;
        return {
          ...canvas,
          viewport: {
            scale: newScale,
            x: center.x - worldX * newScale,
            y: center.y - worldY * newScale
          }
        };
      });
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  zoomTo: (scale, center) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => {
        const vp = ensureViewport(canvas);
        const newScale = clampScale(scale);
        if (!center) {
          return { ...canvas, viewport: { ...vp, scale: newScale } };
        }
        const worldX = (center.x - vp.x) / vp.scale;
        const worldY = (center.y - vp.y) / vp.scale;
        return {
          ...canvas,
          viewport: {
            scale: newScale,
            x: center.x - worldX * newScale,
            y: center.y - worldY * newScale
          }
        };
      });
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  resetView: () =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        viewport: { ...DEFAULT_VIEWPORT }
      }));
      return { ...syncSlice(project, s.selectedId, s.rev + 1) };
    }),

  loadProject: (project) => set((s) => ({ ...syncSlice(project, null, s.rev + 1) })),

  resetProject: () => set((s) => ({ ...syncSlice(createDefaultProject(), null, s.rev + 1) }))
}));

export function normalizeDrawingProject(input: unknown, title = '未命名作品'): DrawingProject {
  if (Array.isArray(input)) {
    const project = createDefaultProject(title);
    return {
      ...project,
      canvases: [
        {
          ...project.canvases[0]!,
          shapes: normalizeShapes(input as CanvasObject[])
        }
      ]
    };
  }

  const candidate = input as Partial<DrawingProject> | null;
  if (candidate?.canvases?.length) {
    const canvases = candidate.canvases.map((canvas, index) => {
      const shapes = normalizeShapes(Array.isArray(canvas.shapes) ? canvas.shapes : []);
      return {
        id: canvas.id || genId('canvas'),
        name: canvas.name || `画布 ${index + 1}`,
        width: canvas.width || DEFAULT_CANVAS_WIDTH,
        height: canvas.height || DEFAULT_CANVAS_HEIGHT,
        backgroundColor: canvas.backgroundColor || '#fafaf8',
        shapes,
        viewport: canvas.viewport ? { ...DEFAULT_VIEWPORT, ...canvas.viewport } : { ...DEFAULT_VIEWPORT },
        nextNumber:
          canvas.nextNumber ||
          (shapes.length ? Math.max(...shapes.map((s) => s.number || s.index || 0)) + 1 : 1),
        createdAt: canvas.createdAt || nowIso(),
        updatedAt: canvas.updatedAt || nowIso()
      } satisfies CanvasPage;
    });
    const activeCanvasId = canvases.some((canvas) => canvas.id === candidate.activeCanvasId)
      ? candidate.activeCanvasId!
      : canvases[0]!.id;
    return {
      id: candidate.id || genId('project'),
      title: candidate.title || title,
      activeCanvasId,
      canvases,
      createdAt: candidate.createdAt || nowIso(),
      updatedAt: candidate.updatedAt || nowIso()
    };
  }

  return createDefaultProject(title);
}

function normalizeShapes(shapes: CanvasObject[]): CanvasObject[] {
  // 给老作品的 shapes 补全 number 字段（按数组顺序从 1 开始）
  return shapes.map((shape, idx) => ({
    ...shape,
    number: shape.number || shape.index + 1 || idx + 1,
    index: shape.number || shape.index + 1 || idx + 1
  }));
}

export function getProjectSnapshot(title?: string): DrawingProject {
  const state = useCanvasStore.getState();
  return {
    ...state.project,
    title: title || state.project.title,
    activeCanvasId: state.activeCanvasId,
    canvases: state.canvases
  };
}
