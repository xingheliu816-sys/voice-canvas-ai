import { normalize, analyze, type Normalized } from './Normalizer';
import type { Command, CreateCommand } from './types';
import { DEFAULT_SHAPE_STYLE } from '@/lib/canvas/types';

// 用全局 Web Crypto API 而非 Node 'crypto' 模块，确保浏览器端可用。
// 部分浏览器 + 非 https 环境可能缺失 randomUUID，故加回退方案。
function genId(): string {
  const g = (typeof globalThis !== 'undefined' ? globalThis : window) as any;
  const uuid =
    g?.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return 'obj_' + uuid.slice(0, 8);
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

const fillNoneWords = ['不填充', '空心', '透明', '只有边框', '只要线条', '无填充'];
const solidWords = ['实心', '填充', '填满'];
const strokeWords = ['边框', '描边', '线条'];

const CHINESE_NUMBER_MAP: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10
};

export function parse(rawText: string): Command {
  const norm = analyze(rawText);

  const canvasCommand = parseCanvas(rawText);
  if (canvasCommand) return canvasCommand;

  const overwriteCommand = parseOverwrite(rawText);
  if (overwriteCommand) return overwriteCommand;

  const replaceCommand = parseReplace(rawText);
  if (replaceCommand) return replaceCommand;

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

  // ── MOVE ──（在 CREATE 之前，避免方向词被误判为位置）
  if (norm.verb === 'MOVE') {
    return buildMove(rawText);
  }

  // ── MODIFY ──
  if (norm.verb === 'MODIFY') {
    return buildModify(norm, rawText);
  }

  // ── CREATE ──（显式动词 或 隐式：有形状/颜色描述）
  if (norm.verb === 'CREATE' || norm.shape || norm.color) {
    return buildCreate(norm, rawText);
  }

  return { type: 'UNKNOWN', rawText };
}

function buildCreate(n: Normalized, rawText = n.raw): CreateCommand {
  const id = genId();
  const shape = (n.shape as CreateCommand['shape']) || 'circle';
  const sizeLabel = n.size || 'medium';
  const size = SIZE_DEFAULTS[sizeLabel] || 100;
  const pos = n.position || 'center';
  const xy = POS_DEFAULTS[pos] || POS_DEFAULTS['center']!;
  const text = n.text || (shape === 'text' ? extractTextContent(rawText) : null);
  const style = resolveStyle(rawText, n.color, shape);

  return {
    type: 'CREATE', id, shape,
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    width: size, height: size,
    x: xy.x, y: xy.y,
    text: text || undefined,
    fontSize: 24,
    name: text || undefined,
    position: pos as CreateCommand['position'],
    size: sizeLabel as CreateCommand['size']
  };
}

function resolveStyle(rawText: string, color: string | null, shape?: CreateCommand['shape']) {
  const fillNone = fillNoneWords.some((word) => rawText.includes(word));
  const solid = solidWords.some((word) => rawText.includes(word));
  const strokeOnly = strokeWords.some((word) => rawText.includes(word)) && !solid;

  if (!color) {
    if (shape === 'text') {
      return { ...DEFAULT_SHAPE_STYLE, fill: DEFAULT_SHAPE_STYLE.stroke };
    }
    return { ...DEFAULT_SHAPE_STYLE };
  }
  if (fillNone || strokeOnly) {
    return { ...DEFAULT_SHAPE_STYLE, stroke: color, fill: 'transparent' };
  }
  return { ...DEFAULT_SHAPE_STYLE, stroke: color, fill: color };
}

function extractTextContent(rawText: string): string | null {
  const quoted = rawText.match(/["“”'‘’](.+?)["“”'‘’]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();

  const match = rawText.match(
    /(?:添加文字|加上文字|放上文字|输入文字|文字是|文字为|写上|写下|写字|输入|打出|写)\s*(?:一个|一段|一句|几个字|文字|为|成|叫|[:：])?\s*(.+)/
  );
  const text = match?.[1]?.trim();
  return text || null;
}

function parseReplace(raw: string): Command | null {
  if (!/替换|换成|换为|换掉/.test(raw)) return null;
  const shapeText = raw.replace(/替换|原图|原来的|当前图形|刚才那个|它|这个|用|把|成|为/g, '');
  const create = buildCreate(analyze(shapeText || raw), raw);
  return {
    type: 'REPLACE',
    target: { type: 'current' },
    newShape: {
      shape: create.shape,
      fill: create.fill,
      stroke: create.stroke,
      strokeWidth: create.strokeWidth,
      opacity: create.opacity,
      width: create.width,
      height: create.height,
      text: create.text,
      fontSize: create.fontSize
    }
  };
}

function parseOverwrite(raw: string): Command | null {
  if (!/覆盖原图|替换原图|把原来的图换成这个|清掉原来的再画|清除原来的再画|清空原来的再画/.test(raw)) {
    return null;
  }
  const drawText = raw
    .replace(/覆盖原图|替换原图|把原来的图换成这个|清掉原来的再画|清除原来的再画|清空原来的再画/g, '画')
    .trim();
  return {
    type: 'OVERWRITE_CANVAS',
    commands: [buildCreate(analyze(drawText), drawText)]
  };
}

function parseCanvas(raw: string): Command | null {
  // ── 画布视图控制 ──
  if (/放大画布|画布放大|放大视图/.test(raw)) return { type: 'CANVAS_CONFIG', action: 'zoom-in' };
  if (/缩小画布|画布缩小|缩小视图/.test(raw)) return { type: 'CANVAS_CONFIG', action: 'zoom-out' };
  if (/重置视图|还原视图|恢复视图|回到默认视图|重置缩放/.test(raw)) return { type: 'CANVAS_CONFIG', action: 'reset-view' };

  // ── 画布背景颜色 ──
  const bgMatch = raw.match(/(?:画布背景|背景|画布颜色|画布)(?:改为|换成|设置为|改成|设成|调成|变成)(\S+)/);
  if (bgMatch?.[1]) {
    const colorName = bgMatch[1];
    // 通过 Normalizer 解析颜色名
    const colorNorm = analyze(colorName);
    if (colorNorm.color) {
      return { type: 'CANVAS_BACKGROUND', color: colorNorm.color };
    }
  }

  if (/现在在哪个画布|当前是第几个画布|一共有几个画布/.test(raw)) {
    return { type: 'CANVAS_QUERY' };
  }

  const renameMatch =
    raw.match(/把当前画布命名为(.+)/) ||
    raw.match(/重命名当前画布为(.+)/) ||
    raw.match(/这个画布叫(.+)/);
  if (renameMatch?.[1]) {
    return { type: 'CANVAS_RENAME', target: 'current', name: renameMatch[1].trim() };
  }

  if (/回到上一个画布|切换到上一个画布/.test(raw)) {
    return { type: 'CANVAS_SWITCH', target: 'prev' };
  }
  if (/切换到下一个画布|打开下一个画布/.test(raw)) {
    return { type: 'CANVAS_SWITCH', target: 'next' };
  }
  if (/切换到|打开/.test(raw) && raw.includes('画布')) {
    const index = parseCanvasIndex(raw);
    if (index) return { type: 'CANVAS_SWITCH', target: { index } };
  }

  if (/删除当前画布|删除这个画布|删掉当前画布|移除当前画布/.test(raw)) {
    return { type: 'CANVAS_DELETE', target: 'current' };
  }

  if (/新建画布|新增画布|创建一个新画布|再开一个画布|添加画布|新建一张画布/.test(raw)) {
    return { type: 'CANVAS_CREATE' };
  }

  return null;
}

function parseCanvasIndex(raw: string): number | null {
  const digitMatch = raw.match(/(?:画布|第)(\d+)/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);

  const chineseMatch = raw.match(/(?:画布|第)([一二两三四五六七八九十])/);
  if (chineseMatch?.[1]) return CHINESE_NUMBER_MAP[chineseMatch[1]] || null;

  const ordinalMatch = raw.match(/(第一|第二|第三|第四|第五|第六|第七|第八|第九|第十)个画布/);
  if (ordinalMatch?.[1]) {
    const key = ordinalMatch[1].replace('第', '') as keyof typeof CHINESE_NUMBER_MAP;
    return CHINESE_NUMBER_MAP[key] || null;
  }

  return null;
}

// ── MOVE 指令：移动选中图形 ──
// 支持：移动 / 向左移动 / 向右移动3步 / 往上挪 / 向下移动 / 往左移 / 挪到右边
function buildMove(rawText: string): Command {
  // 方向词检测
  const dirLeft   = /(?:向|往)左/.test(rawText);
  const dirRight  = /(?:向|往)右/.test(rawText);
  const dirUp     = /(?:向|往)上/.test(rawText);
  const dirDown   = /(?:向|往)下/.test(rawText);

  // 步数提取（"3步"、"5格"、"移动3"）
  const stepMatch = rawText.match(/(\d+)\s*(?:步|格|个?单位)?/);
  const step = stepMatch?.[1] ? Number(stepMatch[1]) : 1;

  const DELTA = 60; // 单步像素

  let dx = 0;
  let dy = 0;
  if (dirLeft)  dx = -step * DELTA;
  if (dirRight) dx =  step * DELTA;
  if (dirUp)    dy = -step * DELTA;
  if (dirDown)  dy =  step * DELTA;

  // 默认：无方向 → 视为"移动"但需要上下文 → 不设置偏移量（容错）
  return { type: 'MOVE', target: { type: 'current' }, dx, dy, direction: undefined };
}

// ── MODIFY 指令：修改选中图形的属性 ──
// 支持：改成蓝色 / 换成红色 / 变大 / 缩小 / 放大一点 / 旋转
function buildModify(n: Normalized, rawText: string): Command {
  const changes: Record<string, unknown> = {};

  // 颜色修改
  if (n.color) {
    changes.fill = n.color;
    changes.stroke = n.color;
  }

  // 大小修改
  if (/放大|变大|加大|调大|变大一点/.test(rawText)) {
    changes.width  = (obj?: any) => (obj?.width  || 100) * 1.3;
    changes.height = (obj?: any) => (obj?.height || 100) * 1.3;
    changes.scale = 1.3;
  } else if (/缩小|变小|减小|调小|变小一点/.test(rawText)) {
    changes.width  = (obj?: any) => Math.max(20, (obj?.width  || 100) * 0.7);
    changes.height = (obj?: any) => Math.max(20, (obj?.height || 100) * 0.7);
    changes.scale = 0.7;
  }

  // 旋转
  if (/旋转|转一下|转一转/.test(rawText)) {
    const rotMatch = rawText.match(/(\d+)\s*(?:度|°)/);
    changes.rotation = (obj?: any) => ((obj?.rotation || 0) + (rotMatch?.[1] ? Number(rotMatch[1]) : 45));
  }

  return { type: 'MODIFY', target: { type: 'current' }, changes };
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
