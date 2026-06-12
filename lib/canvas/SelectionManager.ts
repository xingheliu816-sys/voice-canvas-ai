import type { CanvasObject } from './types';
import type { TargetRef } from '@/lib/nlu/types';

export function resolveTarget(
  target: TargetRef,
  objects: CanvasObject[],
  currentId: string | null
): string | null {
  // 优先级 1: current
  if (target.type === 'current') return currentId;

  // 优先级 2: id
  if (target.type === 'id') {
    return objects.find((o) => o.id === target.id)?.id || null;
  }

  // 优先级 3: recent (1=latest)
  if (target.type === 'recent') {
    if (objects.length === 0) return null;
    const idx = Math.max(objects.length - target.n, 0);
    return objects[idx]?.id || null;
  }

  // 优先级 4: shape
  if (target.type === 'shape') {
    return objects.find((o) => o.shape === target.shape)?.id || null;
  }

  // 优先级 5: color
  if (target.type === 'color') {
    return objects.find((o) => o.fill === target.color)?.id || null;
  }

  // 优先级 6: shape + color
  if (target.type === 'shapeAndColor') {
    return objects.find((o) => o.shape === target.shape && o.fill === target.color)?.id || null;
  }

  // 优先级 7: index
  if (target.type === 'index') {
    return objects[target.index]?.id || null;
  }

  return null;
}

export function handleSelect(
  cmd: { type: 'SELECT'; target: TargetRef },
  objects: CanvasObject[],
  select: (id: string | null) => void
): string {
  const id = resolveTarget(cmd.target, objects, null);
  if (id) {
    select(id);
    const obj = objects.find((o) => o.id === id)!;
    return `已选中：${obj.name || obj.shape}`;
  }
  return selectWithClarify(cmd.target, objects, select);
}

function selectWithClarify(
  target: TargetRef,
  objects: CanvasObject[],
  select: (id: string | null) => void
): string {
  if (target.type === 'color') {
    const matches = objects.filter((o) => o.fill === target.color);
    if (matches.length > 1)
      return `画布中有 ${matches.length} 个该颜色对象，请说明选哪一个`;
  }
  if (target.type === 'shape') {
    const matches = objects.filter((o) => o.shape === target.shape);
    if (matches.length > 1)
      return `画布中有 ${matches.length} 个 ${target.shape}，请说明选哪一个`;
  }
  return '未找到匹配对象';
}
