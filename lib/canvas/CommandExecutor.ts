import { useCanvasStore } from './ObjectStore';
import { DEFAULT_SHAPE_STYLE, type CanvasObject } from './types';
import type { Command, CreateCommand } from '@/lib/nlu/types';
import { handleSelect, resolveTarget } from './SelectionManager';

let getStageFn: (() => any) | null = null;
export function setStageGetter(fn: () => any) {
  getStageFn = fn;
}

let getViewportSizeFn: (() => { width: number; height: number }) | null = null;
export function setViewportSizeGetter(fn: () => { width: number; height: number }) {
  getViewportSizeFn = fn;
}

const POSITION_KEYWORDS = new Set([
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right'
]);

export function executeCommand(cmd: Command): string {
  const store = useCanvasStore.getState();

  switch (cmd.type) {
    case 'CREATE': {
      const obj = createCommandToObject(cmd);
      const added = store.addObject(obj);
      store.selectObject(added.id);
      return `已新增${shapeLabel(added.shape)} #${added.number}`;
    }

    case 'DELETE': {
      const targetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (targetId) {
        const obj = store.objects.find((o) => o.id === targetId);
        store.removeObject(targetId);
        return obj ? `已删除${shapeLabel(obj.shape)} #${obj.number}` : '已删除';
      }
      return '未找到要删除的对象';
    }

    case 'MOVE': {
      const moveTargetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (!moveTargetId) return '没有可以移动的图形，请先画一个';
      const obj = store.objects.find((o) => o.id === moveTargetId);
      if (!obj) return '未找到要移动的图形';
      const dx = cmd.dx || 0;
      const dy = cmd.dy || 0;
      if (dx === 0 && dy === 0) return '请说出移动方向，例如向右移动';
      store.updateObject(moveTargetId, { x: obj.x + dx, y: obj.y + dy });
      return `已移动${shapeLabel(obj.shape)} #${obj.number}`;
    }

    case 'MODIFY': {
      const modTargetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (!modTargetId) return '请先选中要修改的图形';
      const obj = store.objects.find((o) => o.id === modTargetId);
      if (!obj) return '未找到要修改的图形';

      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(cmd.changes)) {
        resolved[key] = typeof val === 'function' ? (val as (arg: typeof obj) => unknown)(obj) : val;
      }
      if (resolved.scale !== undefined) delete resolved.scale;

      store.updateObject(modTargetId, resolved);
      if (resolved.fill) return `已修改${shapeLabel(obj.shape)} #${obj.number} 颜色`;
      if (resolved.width) return `已调整${shapeLabel(obj.shape)} #${obj.number} 大小`;
      if (resolved.rotation) return `已旋转${shapeLabel(obj.shape)} #${obj.number}`;
      return `已修改${shapeLabel(obj.shape)} #${obj.number}`;
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
        number: current.number,
        index: current.number,
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
      return `已替换${shapeLabel(current.shape)} #${current.number}`;
    }

    case 'OVERWRITE_CANVAS': {
      if (!cmd.confirmed) return '覆盖画布需要确认';
      store.clearAll();
      for (const sub of cmd.commands) {
        if (sub.type !== 'CREATE') continue;
        const obj = createCommandToObject(sub);
        const added = useCanvasStore.getState().addObject(obj);
        useCanvasStore.getState().selectObject(added.id);
      }
      return '已覆盖当前画布';
    }

    case 'CANVAS_CREATE': {
      const canvas = store.createCanvas(cmd.name);
      return `已创建${canvas.name}`;
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

    // 旧 CANVAS_CONFIG 兼容
    case 'CANVAS_CONFIG': {
      if (cmd.action === 'zoom-in') {
        store.zoomBy(1 + 0.2, viewportCenter());
        return '已放大画布';
      }
      if (cmd.action === 'zoom-out') {
        store.zoomBy(1 / 1.2, viewportCenter());
        return '已缩小画布';
      }
      if (cmd.action === 'reset-view') {
        store.resetView();
        return '已重置画布视图';
      }
      return '未知画布操作';
    }

    case 'CANVAS_PAN': {
      const { x, y } = cmd.delta;
      if (x === 0 && y === 0) return '请说出画布移动方向';
      store.panBy(x, y);
      return '已移动画布';
    }

    case 'CANVAS_ZOOM': {
      if (typeof cmd.scaleTo === 'number') {
        store.zoomTo(cmd.scaleTo, viewportCenter());
      } else if (typeof cmd.scaleDelta === 'number') {
        const factor = cmd.scaleDelta >= 0 ? 1 + cmd.scaleDelta : 1 / (1 - cmd.scaleDelta);
        store.zoomBy(factor, viewportCenter());
      }
      const percent = Math.round(useCanvasStore.getState().viewport.scale * 100);
      return `画布缩放 ${percent}%`;
    }

    case 'CANVAS_RESET_VIEW': {
      store.resetView();
      return '已重置画布视图';
    }

    case 'CANVAS_BACKGROUND':
    case 'CANVAS_SET_BACKGROUND': {
      store.setCanvasBackground(cmd.color);
      return '已修改画布背景';
    }

    case 'CANVAS_QUERY': {
      const state = useCanvasStore.getState();
      const index = state.canvases.findIndex((canvas) => canvas.id === state.activeCanvasId) + 1;
      const current = state.canvases.find((canvas) => canvas.id === state.activeCanvasId);
      return `当前是${current?.name || `画布 ${index}`}，共有 ${state.canvases.length} 个画布`;
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

    case 'IMAGE_GENERATE': {
      return `正在生成图像: ${cmd.prompt}`;
    }

    case 'DRAW_OBJECT': {
      return `正在绘制: ${cmd.objectKind}`;
    }

    case 'DRAW_SCENE': {
      return `正在绘制场景: ${cmd.sceneKind}`;
    }

    case 'SELECT':
      return handleSelect(cmd, store.objects, store.selectObject);

    case 'UNKNOWN':
      return `"${cmd.rawText}" → 暂不支持该指令`;

    default:
      return '未知指令';
  }
}

/** 当前可视区域中心，对应画布世界坐标 */
function visibleCenterWorld(): { x: number; y: number } {
  const { width, height } = viewportSizePx();
  const { x: vx, y: vy, scale } = useCanvasStore.getState().viewport;
  return {
    x: (width / 2 - vx) / (scale || 1),
    y: (height / 2 - vy) / (scale || 1)
  };
}

function viewportSizePx() {
  if (getViewportSizeFn) return getViewportSizeFn();
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return { width: 1200, height: 720 };
}

/** Stage 局部中心，用于缩放锚点 */
function viewportCenter() {
  const { width, height } = viewportSizePx();
  return { x: width / 2, y: height / 2 };
}

function createCommandToObject(c: CreateCommand): CanvasObject {
  const explicitPosition = c.position && POSITION_KEYWORDS.has(c.position) && c.position !== 'center';
  const usingCenter = !explicitPosition;

  // 默认放在画布可视中心；如果是显式位置（左上、右下…）保留 RuleEngine 解析的 xy
  let x = c.x ?? 0;
  let y = c.y ?? 0;
  if (usingCenter) {
    const center = visibleCenterWorld();
    const width = c.width || 100;
    const height = c.height || 100;
    // CanvasObject 的 x/y 对部分形状代表中心（circle/triangle）、对 rect/text 代表左上角
    // 让所有形状默认以可视中心为参考：rect / text 减去半宽高
    const adjust = c.shape === 'rect' || c.shape === 'text';
    x = adjust ? center.x - width / 2 : center.x;
    y = adjust ? center.y - height / 2 : center.y;

    // 简单错开：如果已有图形覆盖在该中心点附近，按现有数量偏移
    const store = useCanvasStore.getState();
    const overlap = store.objects.filter((obj) => Math.abs(obj.x - x) < 40 && Math.abs(obj.y - y) < 40).length;
    if (overlap > 0) {
      const total = store.objects.length;
      const offset = ((total % 6) + 1) * 28;
      x += offset;
      y += offset;
    }
  }

  return {
    id: c.id,
    number: 0, // store.addObject 会根据 nextNumber 赋值
    index: 0,
    name: c.text || c.shape,
    createdAt: Date.now(),
    batchId: c.batchId,
    shape: c.shape,
    x,
    y,
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
    polygon: '多边形',
    image: '图片',
    group: '对象组'
  };
  return labels[shape] || '图形';
}

function exportAsPNG() {
  if (!getStageFn) return;
  const stage = getStageFn();
  if (!stage) return;
  // 导出时尝试隐藏编号标签
  const labelLayer: any = stage.findOne('.shape-number-layer');
  const prevVisible = labelLayer ? labelLayer.visible() : true;
  if (labelLayer) {
    labelLayer.visible(false);
    labelLayer.getStage()?.draw?.();
  }
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  if (labelLayer) {
    labelLayer.visible(prevVisible);
    labelLayer.getStage()?.draw?.();
  }
  const link = document.createElement('a');
  link.download = `voice-canvas-${Date.now()}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
