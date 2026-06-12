import type { ShapeKind } from '@/lib/canvas/types';

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
export interface BatchCommand { type: 'BATCH'; batchId: string; commands: Command[]; }
export interface UnknownCommand { type: 'UNKNOWN'; rawText: string; }

export type Command = CreateCommand | SelectCommand | ModifyCommand | MoveCommand | DeleteCommand | UndoCommand | RedoCommand | ClearCommand | ExportCommand | QueryCommand | ProjectSaveCommand | ProjectSaveAsCommand | ProjectListCommand | ProjectOpenCommand | ProjectRenameCommand | ProjectDeleteCommand | BatchCommand | UnknownCommand;

export type TargetRef = { type: 'current' } | { type: 'id'; id: string } | { type: 'recent'; n: number } | { type: 'shape'; shape: ShapeKind } | { type: 'color'; color: string } | { type: 'shapeAndColor'; shape: ShapeKind; color: string } | { type: 'index'; index: number } | { type: 'position'; position: string } | { type: 'all' };

export const COMMAND_WHITELIST = ['CREATE','SELECT','MODIFY','MOVE','DELETE','UNDO','REDO','CLEAR','EXPORT','QUERY','BATCH','PROJECT_SAVE','PROJECT_SAVE_AS','PROJECT_LIST','PROJECT_OPEN','PROJECT_RENAME','PROJECT_DELETE'] as const;
