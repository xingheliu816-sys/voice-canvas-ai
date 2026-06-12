import { normalize, analyze, type Normalized } from './Normalizer';
import type { Command, CreateCommand } from './types';
import crypto from 'crypto';

function genId(): string {
  return 'obj_' + crypto.randomUUID().slice(0, 8);
}

// 位置 → 画布默认坐标 (800x500 画布参考)
const POS_DEFAULTS: Record<string, { x: number; y: number }> = {
  'top-left':     { x: 120, y: 100 },
  'top-center':   { x: 400, y: 100 },
  'top-right':    { x: 680, y: 100 },
  'center-left':  { x: 120, y: 250 },
  'center':       { x: 400, y: 250 },
  'center-right': { x: 680, y: 250 },
  'bottom-left':  { x: 120, y: 400 },
  'bottom-center':{ x: 400, y: 400 },
  'bottom-right': { x: 680, y: 400 },
};

const SIZE_DEFAULTS: Record<string, number> = {
  small: 60, medium: 100, large: 180
};

export function parse(rawText: string): Command {
  const norm = analyze(rawText);

  // ── CLEAR（必须在 DELETE 之前，避免"全部删除"中的"删除"被 DELETE 劫持）
  if (norm.verb === 'CLEAR' || rawText.includes('清空') || rawText.includes('全部删除') || rawText.includes('全部清除')) {
    return { type: 'CLEAR' };
  }

  // ── DELETE ──
  if (norm.verb === 'DELETE' || rawText.includes('删除') || rawText.includes('删掉') || rawText.includes('擦掉')) {
    return { type: 'DELETE', target: { type: 'current' } };
  }

  // ── UNDO ──
  if (norm.verb === 'UNDO' || rawText.includes('撤销') || rawText.includes('撤回')) {
    return { type: 'UNDO' };
  }

  // ── REDO ──
  if (norm.verb === 'REDO' || rawText.includes('重做') || rawText.includes('恢复')) {
    return { type: 'REDO' };
  }

  // ── PROJECT 作品管理 ──
  const proj = parseProject(rawText);
  if (proj) return proj;

  // ── CREATE ──（显式动词 或 隐式：有形状/颜色描述）
  if (norm.verb === 'CREATE' || norm.shape || norm.color) {
    return buildCreate(norm);
  }

  return { type: 'UNKNOWN', rawText };
}

function buildCreate(n: Normalized): CreateCommand {
  const id = genId();
  const shape = (n.shape as CreateCommand['shape']) || 'circle';
  const sizeLabel = n.size || 'medium';
  const size = SIZE_DEFAULTS[sizeLabel] || 100;
  const pos = n.position || 'center';
  const xy = POS_DEFAULTS[pos] || POS_DEFAULTS['center']!;

  return {
    type: 'CREATE', id, shape,
    fill: n.color || '#FF0000',
    stroke: '#000000',
    strokeWidth: 1,
    opacity: 1,
    width: size, height: size,
    x: xy.x, y: xy.y,
    text: n.text || undefined,
    fontSize: 24,
    name: n.text || undefined,
    position: pos as CreateCommand['position'],
    size: sizeLabel as CreateCommand['size']
  };
}

function parseProject(raw: string): Command | null {
  // PROJECT_DELETE
  if (/删除这个作品|删除作品/.test(raw)) {
    return { type: 'PROJECT_DELETE', target: 'current' };
  }

  // PROJECT_SAVE_AS
  const saveAsMatch = raw.match(/保存为(.+)/);
  if (saveAsMatch) {
    return { type: 'PROJECT_SAVE_AS', title: saveAsMatch[1]!.trim() };
  }

  // PROJECT_SAVE
  if (/保存作品|保存一下|存一下|保存/.test(raw)) {
    return { type: 'PROJECT_SAVE' };
  }

  // PROJECT_LIST
  if (/打开我的作品|我的作品|作品列表/.test(raw)) {
    return { type: 'PROJECT_LIST' };
  }

  // PROJECT_RENAME
  const renameMatch = raw.match(/重命名为(.+)/);
  if (renameMatch) {
    return { type: 'PROJECT_RENAME', title: renameMatch[1]!.trim() };
  }

  // PROJECT_OPEN with title
  const openMatch = raw.match(/打开(.+)/);
  if (openMatch && !/我的作品/.test(raw)) {
    const title = openMatch[1]!.trim();
    if (title === '上一幅作品' || title === '上一个') return { type: 'PROJECT_OPEN', recent: 1 };
    if (title === '第一幅' || title === '第一个') return { type: 'PROJECT_OPEN', recent: 999 };
    return { type: 'PROJECT_OPEN', title };
  }

  return null;
}
