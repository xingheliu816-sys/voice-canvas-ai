import type { CanvasObject } from './types';
import type { TargetRef } from '@/lib/nlu/types';

/**
 * 解析目标引用为图形 id。
 *
 * 默认行为（type=current）按需求规约：
 *  1. 如果有当前选中图形 → 用之
 *  2. 否则退回到最近创建的图形（数组末尾）
 */
export function resolveTarget(
  target: TargetRef,
  objects: CanvasObject[],
  currentId: string | null
): string | null {
  if (target.type === 'current') {
    if (currentId && objects.some((o) => o.id === currentId)) return currentId;
    // fallback: 最近创建（数组最后一项）
    return objects.length ? objects[objects.length - 1]!.id : null;
  }

  if (target.type === 'id') {
    return objects.find((o) => o.id === target.id)?.id || null;
  }

  if (target.type === 'recent') {
    if (objects.length === 0) return null;
    const idx = Math.max(objects.length - target.n, 0);
    return objects[idx]?.id || null;
  }

  if (target.type === 'number') {
    return objects.find((o) => o.number === target.number)?.id || null;
  }

  if (target.type === 'shape') {
    return objects.find((o) => o.shape === target.shape)?.id || null;
  }

  if (target.type === 'color') {
    return objects.find((o) => o.fill === target.color)?.id || null;
  }

  if (target.type === 'shapeAndColor') {
    return objects.find((o) => o.shape === target.shape && o.fill === target.color)?.id || null;
  }

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
    return `已选中：${obj.name || `${obj.shape} #${obj.number}`}`;
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
  if (target.type === 'number') {
    return `未找到编号 ${target.number} 的图形`;
  }
  return '未找到匹配对象';
}
