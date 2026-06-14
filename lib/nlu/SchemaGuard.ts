import { COMMAND_WHITELIST } from './types';
import type { Command, CreateCommand } from './types';

const VALID_SHAPES = ['circle','rect','triangle','line','text','polygon'];

export function validate(command: Command): boolean {
  // 白名单校验
  if (!COMMAND_WHITELIST.includes(command.type as typeof COMMAND_WHITELIST[number])) {
    return false;
  }

  // Schema 校验
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
    case 'UNKNOWN':
      return false;
    default:
      return true;
  }
}

export function validateBatch(commands: Command[]): boolean {
  return commands.every(validate);
}
