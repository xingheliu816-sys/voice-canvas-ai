import { COMMAND_WHITELIST } from './types';
import type { Command, CreateCommand } from './types';

const VALID_SHAPES = ['circle', 'rect', 'triangle', 'line', 'text', 'polygon', 'image', 'group'];

export function validate(command: Command): boolean {
  if (!COMMAND_WHITELIST.includes(command.type as typeof COMMAND_WHITELIST[number])) {
    return false;
  }

  switch (command.type) {
    case 'CREATE': {
      const c = command as CreateCommand;
      if (!VALID_SHAPES.includes(c.shape)) return false;
      if (typeof c.x !== 'number' || typeof c.y !== 'number') return false;
      if (typeof c.width !== 'number' || c.width < 1) return false;
      if (typeof c.height !== 'number' || c.height < 1) return false;
      return true;
    }
    case 'REPLACE':
      return !!command.target && !!command.newShape && (!command.newShape.shape || VALID_SHAPES.includes(command.newShape.shape));
    case 'OVERWRITE_CANVAS':
      return Array.isArray(command.commands) && command.commands.every(validate);
    case 'CANVAS_DELETE':
      return command.target === 'current' || typeof (command.target as any)?.id === 'string' || typeof (command.target as any)?.index === 'number';
    case 'CANVAS_SWITCH':
      return command.target === 'next' || command.target === 'prev' || typeof (command.target as any)?.id === 'string' || typeof (command.target as any)?.index === 'number';
    case 'CANVAS_RENAME':
      return !!command.name?.trim() && (command.target === 'current' || typeof (command.target as any)?.id === 'string');
    case 'CANVAS_PAN':
      return typeof command.delta?.x === 'number' && typeof command.delta?.y === 'number';
    case 'CANVAS_ZOOM':
      return (
        (typeof command.scaleDelta === 'number' && Number.isFinite(command.scaleDelta)) ||
        (typeof command.scaleTo === 'number' && command.scaleTo > 0)
      );
    case 'CANVAS_BACKGROUND':
    case 'CANVAS_SET_BACKGROUND':
      return typeof command.color === 'string' && command.color.length > 0;
    case 'IMAGE_GENERATE':
      return typeof command.prompt === 'string' && command.prompt.length > 0;
    case 'DRAW_OBJECT':
      return typeof command.objectKind === 'string' && command.objectKind.length > 0;
    case 'DRAW_SCENE':
      return typeof command.sceneKind === 'string' && command.sceneKind.length > 0;
    case 'MOVE':
      return !!command.target;
    case 'UNKNOWN':
      return false;
    default:
      return true;
  }
}

export function validateBatch(commands: Command[]): boolean {
  return commands.every(validate);
}
