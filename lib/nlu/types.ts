import type { CanvasObject, ShapeKind } from '@/lib/canvas/types';

export type { ShapeKind } from '@/lib/canvas/types';

export interface CreateCommand {
  type: 'CREATE'; id: string; shape: ShapeKind;
  fill?: string; stroke?: string; strokeWidth?: number; opacity?: number;
  x?: number; y?: number; width?: number; height?: number;
  text?: string; fontSize?: number; name?: string; batchId?: string;
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
}

export interface SelectCommand { type: 'SELECT'; target: TargetRef; }
export interface ModifyCommand { type: 'MODIFY'; target: TargetRef; changes: Record<string, unknown>; }
export interface MoveCommand { type: 'MOVE'; target: TargetRef; dx?: number; dy?: number; direction?: string; }
export interface DeleteCommand { type: 'DELETE'; target: TargetRef; }
export interface ReplaceCommand { type: 'REPLACE'; target: TargetRef; newShape: Partial<CanvasObject>; }
export interface OverwriteCanvasCommand { type: 'OVERWRITE_CANVAS'; commands: Command[]; confirmed?: boolean; }
export interface CanvasCreateCommand { type: 'CANVAS_CREATE'; name?: string; }
export interface CanvasDeleteCommand { type: 'CANVAS_DELETE'; target: 'current' | { id: string } | { index: number }; confirmed?: boolean; }
export interface CanvasSwitchCommand { type: 'CANVAS_SWITCH'; target: 'next' | 'prev' | { id: string } | { index: number }; }
export interface CanvasRenameCommand { type: 'CANVAS_RENAME'; target: 'current' | { id: string }; name: string; }
export interface CanvasQueryCommand { type: 'CANVAS_QUERY'; }
/** Deprecated: 兼容旧测试。新的视图控制使用 CANVAS_ZOOM / CANVAS_RESET_VIEW */
export interface CanvasConfigCommand { type: 'CANVAS_CONFIG'; action: 'zoom-in' | 'zoom-out' | 'reset-view'; }
export interface CanvasPanCommand { type: 'CANVAS_PAN'; delta: { x: number; y: number }; }
export interface CanvasZoomCommand { type: 'CANVAS_ZOOM'; scaleDelta?: number; scaleTo?: number; }
export interface CanvasResetViewCommand { type: 'CANVAS_RESET_VIEW'; }
export interface CanvasBackgroundCommand { type: 'CANVAS_BACKGROUND'; color: string; }
/** alias of CANVAS_BACKGROUND, follows spec naming */
export interface CanvasSetBackgroundCommand { type: 'CANVAS_SET_BACKGROUND'; color: string; }
export interface UndoCommand { type: 'UNDO'; }
export interface RedoCommand { type: 'REDO'; }
export interface ClearCommand { type: 'CLEAR'; confirmed?: boolean; }
export interface ExportCommand { type: 'EXPORT'; }
export interface QueryCommand { type: 'QUERY'; question: 'COUNT' | 'CURRENT_SELECTION' | 'DESCRIBE'; }
export interface ProjectSaveCommand { type: 'PROJECT_SAVE'; }
export interface ProjectSaveAsCommand { type: 'PROJECT_SAVE_AS'; title: string; }
export interface ProjectListCommand { type: 'PROJECT_LIST'; }
export interface ProjectOpenCommand { type: 'PROJECT_OPEN'; recent?: number; title?: string; }
export interface ProjectRenameCommand { type: 'PROJECT_RENAME'; title: string; }
export interface ProjectDeleteCommand { type: 'PROJECT_DELETE'; target: 'current' | { title: string }; }
export interface ImageGenerateCommand {
  type: 'IMAGE_GENERATE';
  prompt: string;
  style?: 'realistic' | '3d' | 'isometric' | 'cartoon';
  position?: string;
  size?: { width: number; height: number };
}
export interface DrawObjectCommand {
  type: 'DRAW_OBJECT';
  objectKind: string;
  position?: string;
  size?: 'small' | 'medium' | 'large';
}
export interface DrawSceneCommand {
  type: 'DRAW_SCENE';
  sceneKind: string;
  position?: string;
}
export interface BatchCommand { type: 'BATCH'; batchId: string; commands: Command[]; }
export interface UnknownCommand { type: 'UNKNOWN'; rawText: string; }

export type Command =
  | CreateCommand
  | SelectCommand
  | ModifyCommand
  | MoveCommand
  | DeleteCommand
  | ReplaceCommand
  | OverwriteCanvasCommand
  | CanvasCreateCommand
  | CanvasDeleteCommand
  | CanvasSwitchCommand
  | CanvasRenameCommand
  | CanvasQueryCommand
  | CanvasConfigCommand
  | CanvasPanCommand
  | CanvasZoomCommand
  | CanvasResetViewCommand
  | CanvasBackgroundCommand
  | CanvasSetBackgroundCommand
  | UndoCommand
  | RedoCommand
  | ClearCommand
  | ExportCommand
  | QueryCommand
  | ProjectSaveCommand
  | ProjectSaveAsCommand
  | ProjectListCommand
  | ProjectOpenCommand
  | ProjectRenameCommand
  | ProjectDeleteCommand
  | ImageGenerateCommand
  | DrawObjectCommand
  | DrawSceneCommand
  | BatchCommand
  | UnknownCommand;

export type TargetRef =
  | { type: 'current' }
  | { type: 'id'; id: string }
  | { type: 'recent'; n: number }
  | { type: 'shape'; shape: ShapeKind }
  | { type: 'color'; color: string }
  | { type: 'shapeAndColor'; shape: ShapeKind; color: string }
  | { type: 'index'; index: number }
  | { type: 'number'; number: number }
  | { type: 'position'; position: string }
  | { type: 'all' };

export const COMMAND_WHITELIST = [
  'CREATE',
  'SELECT',
  'MODIFY',
  'MOVE',
  'DELETE',
  'REPLACE',
  'OVERWRITE_CANVAS',
  'CANVAS_CREATE',
  'CANVAS_DELETE',
  'CANVAS_SWITCH',
  'CANVAS_RENAME',
  'CANVAS_QUERY',
  'CANVAS_CONFIG',
  'CANVAS_PAN',
  'CANVAS_ZOOM',
  'CANVAS_RESET_VIEW',
  'CANVAS_BACKGROUND',
  'CANVAS_SET_BACKGROUND',
  'UNDO',
  'REDO',
  'CLEAR',
  'EXPORT',
  'QUERY',
  'BATCH',
  'PROJECT_SAVE',
  'PROJECT_SAVE_AS',
  'PROJECT_LIST',
  'PROJECT_OPEN',
  'PROJECT_RENAME',
  'PROJECT_DELETE',
  'IMAGE_GENERATE',
  'DRAW_OBJECT',
  'DRAW_SCENE'
] as const;
