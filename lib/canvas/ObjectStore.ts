import { create } from 'zustand';
import type { CanvasObject, CanvasPage, DrawingProject } from './types';

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 720;

type DeleteCanvasResult =
  | { ok: true; deleted: CanvasPage; activeCanvasId: string }
  | { ok: false; reason: 'last-canvas' | 'not-found' };

interface CanvasState {
  project: DrawingProject;
  canvases: CanvasPage[];
  activeCanvasId: string;
  objects: CanvasObject[];
  canvasBackground: string;
  selectedId: string | null;
  addObject: (obj: CanvasObject) => void;
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

function activeObjects(project: DrawingProject) {
  return project.canvases.find((canvas) => canvas.id === project.activeCanvasId)?.shapes ?? [];
}

function sync(project: DrawingProject, selectedId: string | null = null) {
  const objects = activeObjects(project);
  const activeCanvas = project.canvases.find((c) => c.id === project.activeCanvasId);
  return {
    project,
    canvases: project.canvases,
    activeCanvasId: project.activeCanvasId,
    objects,
    canvasBackground: activeCanvas?.backgroundColor || '#fafaf8',
    selectedId: selectedId && objects.some((obj) => obj.id === selectedId) ? selectedId : null
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
  ...sync(initialProject),

  addObject: (obj) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: [...canvas.shapes, obj]
      }));
      return sync(project, obj.id);
    }),

  removeObject: (id) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: canvas.shapes.filter((obj) => obj.id !== id)
      }));
      return sync(project, s.selectedId === id ? null : s.selectedId);
    }),

  updateObject: (id, changes) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: canvas.shapes.map((obj) => (obj.id === id ? { ...obj, ...changes } : obj))
      }));
      return sync(project, s.selectedId);
    }),

  replaceObject: (id, obj) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: canvas.shapes.map((item) => (item.id === id ? obj : item))
      }));
      return sync(project, obj.id);
    }),

  setObjects: (objs) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        shapes: objs
      }));
      return sync(project);
    }),

  selectObject: (id) => set((s) => ({ selectedId: id && s.objects.some((obj) => obj.id === id) ? id : null })),

  clearAll: () =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({ ...canvas, shapes: [] }));
      return sync(project);
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
      return sync(project);
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
    set(sync(project));
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
    set(sync(project));
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
    set(sync(project, state.selectedId));
    return { ...canvas, name };
  },

  setCanvasBackground: (color) =>
    set((s) => {
      const project = updateActiveCanvas(s.project, (canvas) => ({
        ...canvas,
        backgroundColor: color,
      }));
      return sync(project, s.selectedId);
    }),

  loadProject: (project) => set(sync(project)),

  resetProject: () => set(sync(createDefaultProject()))
}));

export function normalizeDrawingProject(input: unknown, title = '未命名作品'): DrawingProject {
  if (Array.isArray(input)) {
    const project = createDefaultProject(title);
    return {
      ...project,
      canvases: [{ ...project.canvases[0]!, shapes: input as CanvasObject[] }]
    };
  }

  const candidate = input as Partial<DrawingProject> | null;
  if (candidate?.canvases?.length) {
    const canvases = candidate.canvases.map((canvas, index) => ({
      id: canvas.id || genId('canvas'),
      name: canvas.name || `画布 ${index + 1}`,
      width: canvas.width || DEFAULT_CANVAS_WIDTH,
      height: canvas.height || DEFAULT_CANVAS_HEIGHT,
      backgroundColor: canvas.backgroundColor || '#fafaf8',
      shapes: Array.isArray(canvas.shapes) ? canvas.shapes : [],
      createdAt: canvas.createdAt || nowIso(),
      updatedAt: canvas.updatedAt || nowIso()
    }));
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

export function getProjectSnapshot(title?: string): DrawingProject {
  const state = useCanvasStore.getState();
  return {
    ...state.project,
    title: title || state.project.title,
    activeCanvasId: state.activeCanvasId,
    canvases: state.canvases
  };
}
