import { useCanvasStore } from './ObjectStore';
import type { CanvasObject } from './types';
import type { Command, CreateCommand } from '@/lib/nlu/types';
import { handleSelect, resolveTarget } from './SelectionManager';

// 保存 stage ref 的函数引用（由 CanvasStage 设置）
let getStageFn: (() => any) | null = null;
export function setStageGetter(fn: () => any) {
  getStageFn = fn;
}

export function executeCommand(cmd: Command): string {
  const store = useCanvasStore.getState();

  switch (cmd.type) {
    case 'CREATE': {
      const obj = createCommandToObject(cmd);
      store.addObject(obj);
      store.selectObject(obj.id);
      return `已添加${obj.name || obj.shape}`;
    }

    case 'DELETE': {
      const targetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (targetId) {
        store.removeObject(targetId);
        return '已删除';
      }
      return '未找到要删除的对象';
    }

    case 'UNDO':
      return '撤销功能即将支持';

    case 'REDO':
      return '重做功能即将支持';

    case 'CLEAR':
      if (cmd.confirmed) {
        store.clearAll();
        return '已清空画布';
      }
      return '请说"确认"来清空画布';

    case 'EXPORT':
      exportAsPNG();
      return '已导出图片';

    case 'SELECT':
      return handleSelect(cmd, store.objects, store.selectObject);

    case 'UNKNOWN':
      return `"${cmd.rawText}" → 暂不支持该指令`;

    default:
      return '未知指令';
  }
}

function createCommandToObject(c: CreateCommand): CanvasObject {
  const store = useCanvasStore.getState();
  const index = store.objects.length;
  return {
    id: c.id,
    name: c.text || c.shape,
    index,
    createdAt: Date.now(),
    batchId: c.batchId,
    shape: c.shape,
    x: c.x || 400,
    y: c.y || 250,
    width: c.width || 100,
    height: c.height || 100,
    fill: c.fill || '#FF0000',
    stroke: c.stroke || '#000000',
    strokeWidth: c.strokeWidth || 1,
    opacity: c.opacity || 1,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    text: c.text,
    fontSize: c.fontSize || 24
  };
}

function exportAsPNG() {
  if (!getStageFn) return;
  const stage = getStageFn();
  if (!stage) return;
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = `voice-canvas-${Date.now()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
