export type ShapeKind = 'circle' | 'rect' | 'triangle' | 'line' | 'text' | 'polygon';

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
