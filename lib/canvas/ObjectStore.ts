import { create } from 'zustand';
import type { CanvasObject } from './types';

interface CanvasState {
  objects: CanvasObject[];
  selectedId: string | null;
  addObject: (obj: CanvasObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, changes: Partial<CanvasObject>) => void;
  setObjects: (objs: CanvasObject[]) => void;
  selectObject: (id: string | null) => void;
  clearAll: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  objects: [],
  selectedId: null,

  addObject: (obj) => set((s) => ({ objects: [...s.objects, obj] })),

  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId
    })),

  updateObject: (id, changes) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, ...changes } : o))
    })),

  setObjects: (objs) => set({ objects: objs, selectedId: null }),

  selectObject: (id) => set({ selectedId: id }),

  clearAll: () => set({ objects: [], selectedId: null })
}));
