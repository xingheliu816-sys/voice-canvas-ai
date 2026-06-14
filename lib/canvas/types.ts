export type ShapeKind = 'circle' | 'rect' | 'triangle' | 'line' | 'text' | 'polygon';

export const DEFAULT_SHAPE_STYLE = {
  stroke: '#111827',
  strokeWidth: 2,
  fill: 'transparent',
  opacity: 1
} as const;

export interface CanvasObject {
  id: string;
  name?: string;
  index: number;
  createdAt: number;
  batchId?: string;
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // text-specific
  text?: string;
  fontSize?: number;
}

export interface CanvasPage {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor?: string;
  shapes: CanvasObject[];
  createdAt: string;
  updatedAt: string;
}

export interface DrawingProject {
  id: string;
  title: string;
  activeCanvasId: string;
  canvases: CanvasPage[];
  createdAt: string;
  updatedAt: string;
}
