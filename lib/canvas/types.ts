export type ShapeKind = 'circle' | 'rect' | 'triangle' | 'line' | 'text' | 'polygon' | 'image' | 'group';

export const DEFAULT_SHAPE_STYLE = {
  stroke: '#111827',
  strokeWidth: 2,
  fill: 'transparent',
  opacity: 1
} as const;

export interface CanvasObject {
  id: string;
  /** 用户可见编号，画布内唯一，从 1 开始 */
  number: number;
  name?: string;
  /** 与 number 同步，旧字段保留以兼容历史代码 */
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
  // image-specific
  imageSrc?: string;
  prompt?: string;
  // group-specific（原生绘制对象组）
  objectKind?: string;
  children?: import('./ObjectFactory').DrawablePrimitive[];
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export const DEFAULT_VIEWPORT: CanvasViewport = { x: 0, y: 0, scale: 1 };

export interface CanvasPage {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor?: string;
  shapes: CanvasObject[];
  viewport?: CanvasViewport;
  /** 画布内下一图形编号（自增，删除不回收） */
  nextNumber?: number;
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
