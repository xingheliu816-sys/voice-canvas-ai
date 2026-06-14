import { useCanvasStore } from './ObjectStore';
import { DEFAULT_SHAPE_STYLE, type CanvasObject } from './types';
import type { Command, CreateCommand } from '@/lib/nlu/types';
import { handleSelect, resolveTarget } from './SelectionManager';

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
      return `已在当前画布新增一个${shapeLabel(obj.shape)}`;
    }

    case 'DELETE': {
      const targetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (targetId) {
        store.removeObject(targetId);
        return '已删除';
      }
      return '未找到要删除的对象';
    }

    case 'MOVE': {
      const moveTargetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (!moveTargetId) return '请先选中要移动的图形';
      const obj = store.objects.find((o) => o.id === moveTargetId);
      if (!obj) return '未找到要移动的图形';
      const newX = obj.x + (cmd.dx || 0);
      const newY = obj.y + (cmd.dy || 0);
      store.updateObject(moveTargetId, { x: newX, y: newY });
      return `已将${shapeLabel(obj.shape)}移动到新位置`;
    }

    case 'MODIFY': {
      const modTargetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (!modTargetId) return '请先选中要修改的图形';
      const obj = store.objects.find((o) => o.id === modTargetId);
      if (!obj) return '未找到要修改的图形';

      // 展开函数型 changes（如 scale）
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(cmd.changes)) {
        resolved[key] = typeof val === 'function' ? (val as (arg: typeof obj) => unknown)(obj) : val;
      }

      if (resolved.scale !== undefined) {
        delete resolved.scale;
      }

      store.updateObject(modTargetId, resolved);
      if (resolved.fill) return `已将${shapeLabel(obj.shape)}改为指定颜色`;
      if (resolved.width) return `已调整${shapeLabel(obj.shape)}大小`;
      if (resolved.rotation) return `已旋转${shapeLabel(obj.shape)}`;
      return `已修改${shapeLabel(obj.shape)}`;
    }

    case 'REPLACE': {
      const targetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (!targetId) return '请先选择要替换的图形';
      const current = store.objects.find((obj) => obj.id === targetId);
      if (!current) return '未找到要替换的图形';

      const replacement: CanvasObject = {
        ...current,
        ...cmd.newShape,
        id: current.id,
        index: current.index,
        createdAt: current.createdAt,
        x: cmd.newShape.x ?? current.x,
        y: cmd.newShape.y ?? current.y,
        width: cmd.newShape.width ?? current.width,
        height: cmd.newShape.height ?? current.height,
        rotation: current.rotation,
        scaleX: current.scaleX,
        scaleY: current.scaleY
      };
      store.replaceObject(targetId, replacement);
      return '当前图形已替换';
    }

    case 'OVERWRITE_CANVAS': {
      if (!cmd.confirmed) return '覆盖画布需要确认';
      store.clearAll();
      for (const sub of cmd.commands) {
        if (sub.type !== 'CREATE') continue;
        const obj = createCommandToObject(sub);
        useCanvasStore.getState().addObject(obj);
        useCanvasStore.getState().selectObject(obj.id);
      }
      return '已覆盖当前画布';
    }

    case 'CANVAS_CREATE': {
      const canvas = store.createCanvas(cmd.name);
      return `已创建${canvas.name}，并切换到该画布`;
    }

    case 'CANVAS_DELETE': {
      const result = store.deleteCanvas(cmd.target);
      if (!result.ok && result.reason === 'last-canvas') return '至少需要保留一个画布';
      if (!result.ok) return '未找到要删除的画布';
      return `已删除${result.deleted.name}`;
    }

    case 'CANVAS_SWITCH': {
      const canvas = store.switchCanvas(cmd.target);
      return canvas ? `已切换到${canvas.name}` : '未找到该画布';
    }

    case 'CANVAS_RENAME': {
      const canvas = store.renameCanvas(cmd.target, cmd.name);
      return canvas ? `当前画布已重命名为${cmd.name}` : '未找到该画布';
    }

    case 'CANVAS_CONFIG': {
      const stage = getStageFn?.();
      const api = stage?.__zoomApi;
      if (!api) return '画布暂未就绪';
      if (cmd.action === 'zoom-in') {
        api.zoomIn();
        return '已放大画布';
      }
      if (cmd.action === 'zoom-out') {
        api.zoomOut();
        return '已缩小画布';
      }
      if (cmd.action === 'reset-view') {
        api.resetView();
        return '已重置视图';
      }
      return '未知画布操作';
    }

    case 'CANVAS_BACKGROUND': {
      store.setCanvasBackground(cmd.color);
      return `已将画布背景改为指定颜色`;
    }

    case 'CANVAS_QUERY': {
      const state = useCanvasStore.getState();
      const index = state.canvases.findIndex((canvas) => canvas.id === state.activeCanvasId) + 1;
      return `当前是画布 ${index}，共有 ${state.canvases.length} 个画布`;
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
    fill: c.fill ?? DEFAULT_SHAPE_STYLE.fill,
    stroke: c.stroke ?? DEFAULT_SHAPE_STYLE.stroke,
    strokeWidth: c.strokeWidth ?? DEFAULT_SHAPE_STYLE.strokeWidth,
    opacity: c.opacity ?? DEFAULT_SHAPE_STYLE.opacity,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    text: c.text,
    fontSize: c.fontSize || 24
  };
}

function shapeLabel(shape: CanvasObject['shape']) {
  const labels: Record<CanvasObject['shape'], string> = {
    circle: '圆形',
    rect: '矩形',
    triangle: '三角形',
    line: '直线',
    text: '文字',
    polygon: '多边形'
  };
  return labels[shape] || '图形';
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
