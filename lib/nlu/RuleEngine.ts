import { normalize, analyze, type Normalized } from './Normalizer';
import type { Command, CreateCommand, TargetRef } from './types';
import { DEFAULT_SHAPE_STYLE } from '@/lib/canvas/types';

// 用全局 Web Crypto API 而非 Node 'crypto' 模块，确保浏览器端可用。
function genId(): string {
  const g = (typeof globalThis !== 'undefined' ? globalThis : window) as any;
  const uuid =
    g?.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return 'obj_' + uuid.slice(0, 8);
}

// 位置 → 画布默认坐标 (800x500 画布参考)。CommandExecutor 会用 viewport 中心覆盖 "center"
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
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10
};

const ORDINAL_PREFIX: Record<string, number> = {
  第一: 1, 第二: 2, 第三: 3, 第四: 4, 第五: 5,
  第六: 6, 第七: 7, 第八: 8, 第九: 9, 第十: 10
};

// 移动步长
const MOVE_STEP_DEFAULT = 50;
const MOVE_STEP_LITTLE = 30;
const MOVE_STEP_SOME = 50;
const MOVE_STEP_LOT = 100;

// 画布平移步长
const PAN_STEP_DEFAULT = 80;
const PAN_STEP_LITTLE = 40;
const PAN_STEP_LOT = 200;

// 画布缩放步长
const ZOOM_STEP = 0.2;

export function parse(rawText: string): Command {
  const norm = analyze(rawText);

  const canvasViewCommand = parseCanvasViewport(rawText);
  if (canvasViewCommand) return canvasViewCommand;

  const canvasCommand = parseCanvas(rawText);
  if (canvasCommand) return canvasCommand;

  const overwriteCommand = parseOverwrite(rawText);
  if (overwriteCommand) return overwriteCommand;

  const replaceCommand = parseReplace(rawText);
  if (replaceCommand) return replaceCommand;

  // ── CLEAR（必须在 DELETE 之前）
  if (
    norm.verb === 'CLEAR' ||
    rawText.includes('清空') ||
    rawText.includes('全部删除') ||
    rawText.includes('全部清除')
  ) {
    return { type: 'CLEAR' };
  }

  // ── DELETE ──
  if (
    norm.verb === 'DELETE' ||
    rawText.includes('删除') ||
    rawText.includes('删掉') ||
    rawText.includes('擦掉')
  ) {
    return { type: 'DELETE', target: pickShapeTarget(rawText) };
  }

  // ── UNDO ──
  if (norm.verb === 'UNDO' || rawText.includes('撤销') || rawText.includes('撤回')) {
    return { type: 'UNDO' };
  }

  // ── REDO ──
  if (norm.verb === 'REDO' || rawText.includes('重做') || rawText.includes('恢复')) {
    return { type: 'REDO' };
  }

  // ── 复杂对象 → 原生绘制（DRAW_OBJECT / DRAW_SCENE）──
  const imageCmd = parseDrawObject(rawText, norm);
  if (imageCmd) return imageCmd;

  // ── PROJECT 作品管理 ──
  const proj = parseProject(rawText);
  if (proj) return proj;

  // ── SELECT by 编号 ──
  if (/选中|选择|选/.test(rawText)) {
    const number = extractShapeNumber(rawText);
    if (number) {
      return { type: 'SELECT', target: { type: 'number', number } };
    }
  }

  // ── MOVE（在 CREATE 之前，避免方向词被误判为位置）──
  if (norm.verb === 'MOVE' || /(?:往|向)(?:左|右|上|下)/.test(rawText)) {
    return buildMove(rawText);
  }

  // ── MODIFY ──
  if (norm.verb === 'MODIFY') {
    return buildModify(norm, rawText);
  }

  // ── CREATE ──
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
  // "换成红色" 等同义 MODIFY 已经在 norm.verb=MODIFY 时被处理；只有出现"替换/换掉/换成…图形"的句式才进入 REPLACE
  // 简化策略：如果只是颜色变化 → 留给 buildModify
  const onlyColor = !analyze(raw).shape && /换成|改成/.test(raw);
  if (onlyColor) return null;

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

// ── 画布视图（缩放 / 平移 / 重置）──
function parseCanvasViewport(raw: string): Command | null {
  const mentionsCanvas = /画布|视图|背景|页面/.test(raw);

  // RESET VIEW
  if (/重置视图|还原视图|恢复视图|回到默认视图|重置缩放|重置画布视图|重置画布位置|把画布移到中间|画布回到中间/.test(raw)) {
    return { type: 'CANVAS_RESET_VIEW' };
  }

  // ZOOM
  if (/放大画布|画布放大|放大视图/.test(raw)) {
    const scaleTo = parsePercent(raw);
    if (scaleTo !== null) return { type: 'CANVAS_ZOOM', scaleTo };
    return { type: 'CANVAS_ZOOM', scaleDelta: ZOOM_STEP };
  }
  if (/缩小画布|画布缩小|缩小视图/.test(raw)) {
    return { type: 'CANVAS_ZOOM', scaleDelta: -ZOOM_STEP };
  }
  if (/把画布(?:放大|缩小)?到/.test(raw)) {
    const scaleTo = parsePercent(raw);
    if (scaleTo !== null) return { type: 'CANVAS_ZOOM', scaleTo };
  }

  // CANVAS_PAN：必须明确说"画布"，否则归 MOVE
  if (mentionsCanvas && /(?:向|往)(?:左|右|上|下)|移动|平移|挪/.test(raw)) {
    if (raw.includes('画布')) {
      // 排除"在画布上画…"这种 CREATE 语句
      if (!/画(?:一|个|条|块|圆|方|三角|矩形|线|文字|字|图)/.test(raw)) {
        return buildCanvasPan(raw);
      }
    }
  }

  return null;
}

function parsePercent(raw: string): number | null {
  const m1 = raw.match(/百分之(\d+)/);
  if (m1?.[1]) return Number(m1[1]) / 100;
  const m2 = raw.match(/(\d+)\s*%/);
  if (m2?.[1]) return Number(m2[1]) / 100;
  const m3 = raw.match(/(\d+)\s*倍/);
  if (m3?.[1]) return Number(m3[1]);
  return null;
}

function buildCanvasPan(raw: string): Command {
  const left  = /(?:向|往)左/.test(raw);
  const right = /(?:向|往)右/.test(raw);
  const up    = /(?:向|往)上/.test(raw);
  const down  = /(?:向|往)下/.test(raw);
  const step = resolvePanStep(raw);

  let dx = 0;
  let dy = 0;
  // 画布平移：用户视角向右移动画布 = 内容向右、Konva stage.x 增加
  if (left)  dx = -step;
  if (right) dx =  step;
  if (up)    dy = -step;
  if (down)  dy =  step;
  return { type: 'CANVAS_PAN', delta: { x: dx, y: dy } };
}

function resolvePanStep(raw: string): number {
  if (/一点|稍微|轻微|少许/.test(raw)) return PAN_STEP_LITTLE;
  if (/很多|许多|大幅|大点|大一点/.test(raw)) return PAN_STEP_LOT;
  const m = raw.match(/(\d+)\s*(?:像素|px|个单位)?/);
  if (m?.[1]) return Number(m[1]);
  return PAN_STEP_DEFAULT;
}

function parseCanvas(raw: string): Command | null {
  // ── 画布背景颜色 ──
  const bgMatch = raw.match(/(?:画布背景|背景|画布颜色|画布)(?:改为|换成|设置为|改成|设成|调成|变成|换为)(\S+)/);
  if (bgMatch?.[1]) {
    const colorName = bgMatch[1];
    const colorNorm = analyze(colorName);
    if (colorNorm.color) {
      return { type: 'CANVAS_BACKGROUND', color: colorNorm.color };
    }
  }

  if (/现在在哪个画布|当前是第几个画布|一共有几个画布|当前是哪个画布|查看画布/.test(raw)) {
    return { type: 'CANVAS_QUERY' };
  }

  const renameMatch =
    raw.match(/把当前画布命名为(.+)/) ||
    raw.match(/重命名当前画布为(.+)/) ||
    raw.match(/这个画布叫(.+)/) ||
    raw.match(/当前画布叫(.+)/);
  if (renameMatch?.[1]) {
    return { type: 'CANVAS_RENAME', target: 'current', name: renameMatch[1].trim() };
  }

  if (/回到上一个画布|切换到上一个画布|上一个画布/.test(raw)) {
    return { type: 'CANVAS_SWITCH', target: 'prev' };
  }
  if (/切换到下一个画布|打开下一个画布|下一个画布/.test(raw)) {
    return { type: 'CANVAS_SWITCH', target: 'next' };
  }
  if (/切换到|打开/.test(raw) && raw.includes('画布')) {
    const index = parseCanvasIndex(raw);
    if (index) return { type: 'CANVAS_SWITCH', target: { index } };
  }

  if (/删除当前画布|删除这个画布|删掉当前画布|移除当前画布/.test(raw)) {
    return { type: 'CANVAS_DELETE', target: 'current' };
  }

  if (/新建画布|新增画布|创建一个新画布|再开一个画布|添加画布|新建一张画布|新增一个画布/.test(raw)) {
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

// ── 图形编号提取：一号 / 1号 / 编号1 / 第一个图形 / 第一个 ──
function extractShapeNumber(raw: string): number | null {
  // 排除"画布一"
  const withoutCanvas = raw.replace(/画布\s*[一二两三四五六七八九十\d]+/g, '');

  // 编号 1 / 编号一
  const codeMatch = withoutCanvas.match(/编号\s*(\d+|[一二两三四五六七八九十])/);
  if (codeMatch?.[1]) {
    const v = codeMatch[1];
    if (/^\d+$/.test(v)) return Number(v);
    return CHINESE_NUMBER_MAP[v] || null;
  }

  // 第一个图形 / 第一个
  for (const [prefix, n] of Object.entries(ORDINAL_PREFIX)) {
    if (withoutCanvas.includes(prefix)) {
      // 排除 "第一幅"（作品语境）
      if (withoutCanvas.includes(`${prefix}幅`)) continue;
      return n;
    }
  }

  // 1 号图形 / 一号图形 / 1 号
  const numDigit = withoutCanvas.match(/(\d+)\s*号/);
  if (numDigit?.[1]) return Number(numDigit[1]);
  const numChinese = withoutCanvas.match(/([一二两三四五六七八九十])\s*号/);
  if (numChinese?.[1]) return CHINESE_NUMBER_MAP[numChinese[1]] || null;

  return null;
}

function pickShapeTarget(raw: string): TargetRef {
  const number = extractShapeNumber(raw);
  if (number) return { type: 'number', number };
  // 形状词
  const norm = analyze(raw);
  if (norm.shape) {
    return norm.color
      ? { type: 'shapeAndColor', shape: norm.shape as any, color: norm.color }
      : { type: 'shape', shape: norm.shape as any };
  }
  if (norm.color) return { type: 'color', color: norm.color };
  return { type: 'current' };
}

// ── MOVE 指令 ──
function buildMove(rawText: string): Command {
  const dirLeft  = /(?:向|往)左/.test(rawText);
  const dirRight = /(?:向|往)右/.test(rawText);
  const dirUp    = /(?:向|往)上/.test(rawText);
  const dirDown  = /(?:向|往)下/.test(rawText);

  let step = MOVE_STEP_DEFAULT;
  if (/一点|稍微|轻微|少许/.test(rawText)) step = MOVE_STEP_LITTLE;
  else if (/一些/.test(rawText)) step = MOVE_STEP_SOME;
  else if (/很多|许多|大幅|远一点|多一点/.test(rawText)) step = MOVE_STEP_LOT;

  // 显式数字（"向右移动 100" / "向下移动 100 像素"）
  const numMatch = rawText.match(/(\d+)\s*(?:步|格|个单位|像素|px)?/);
  if (numMatch?.[1]) {
    const n = Number(numMatch[1]);
    // 避免和 "一号图形 1" 这样的编号冲突 → 只有同时含方向词时才用作步长
    if (dirLeft || dirRight || dirUp || dirDown) step = n;
  }

  let dx = 0;
  let dy = 0;
  if (dirLeft)  dx = -step;
  if (dirRight) dx =  step;
  if (dirUp)    dy = -step;
  if (dirDown)  dy =  step;

  const target = pickShapeTarget(rawText);
  return { type: 'MOVE', target, dx, dy };
}

// ── MODIFY 指令 ──
function buildModify(n: Normalized, rawText: string): Command {
  const changes: Record<string, unknown> = {};

  if (n.color) {
    changes.fill = n.color;
    changes.stroke = n.color;
  }

  if (/放大|变大|加大|调大|变大一点/.test(rawText)) {
    changes.width  = (obj?: any) => (obj?.width  || 100) * 1.3;
    changes.height = (obj?: any) => (obj?.height || 100) * 1.3;
    changes.scale = 1.3;
  } else if (/缩小|变小|减小|调小|变小一点/.test(rawText)) {
    changes.width  = (obj?: any) => Math.max(20, (obj?.width  || 100) * 0.7);
    changes.height = (obj?: any) => Math.max(20, (obj?.height || 100) * 0.7);
    changes.scale = 0.7;
  }

  if (/旋转|转一下|转一转/.test(rawText)) {
    const rotMatch = rawText.match(/(\d+)\s*(?:度|°)/);
    changes.rotation = (obj?: any) => ((obj?.rotation || 0) + (rotMatch?.[1] ? Number(rotMatch[1]) : 45));
  }

  const target = pickShapeTarget(rawText);
  return { type: 'MODIFY', target, changes };
}

function parseProject(raw: string): Command | null {
  if (/删除这个作品|删除作品/.test(raw)) {
    return { type: 'PROJECT_DELETE', target: 'current' };
  }

  const saveAsMatch = raw.match(/保存为(.+)/);
  if (saveAsMatch) {
    return { type: 'PROJECT_SAVE_AS', title: saveAsMatch[1]!.trim() };
  }

  if (/保存作品|保存一下|存一下|保存/.test(raw)) {
    return { type: 'PROJECT_SAVE' };
  }

  if (/打开我的作品|我的作品|作品列表/.test(raw)) {
    return { type: 'PROJECT_LIST' };
  }

  const renameMatch = raw.match(/重命名为(.+)/);
  if (renameMatch) {
    return { type: 'PROJECT_RENAME', title: renameMatch[1]!.trim() };
  }

  const openMatch = raw.match(/打开(.+)/);
  if (openMatch && !/我的作品/.test(raw) && !/画布/.test(openMatch[1] || '')) {
    const title = openMatch[1]!.trim();
    if (title === '上一幅作品' || title === '上一个') return { type: 'PROJECT_OPEN', recent: 1 };
    if (title === '第一幅' || title === '第一个') return { type: 'PROJECT_OPEN', recent: 999 };
    return { type: 'PROJECT_OPEN', title };
  }

  return null;
}

// ── 复杂对象路由：默认 DRAW_OBJECT，显式 AI 触发时 IMAGE_GENERATE ──

// 用户明确要求"简单/几何/示意图"等关键词时，走 mock 几何拼接
export const SIMPLE_SHAPE_TRIGGERS = /用?简单图形|用?几何图形|示意图|简笔画|草图|线稿|简易|卡通几何|几何拼接|示意/;

// 用户明确说"生成图片/插入图片"等 → 强制走 IMAGE_GENERATE
const IMAGE_ONLY_TRIGGERS = /生成图片|生成一张图|插入图片|导入图片|用图片生成|生成照片|贴图|用AI生成图片/;

// 带这些风格词 + 复杂对象 → 走 IMAGE_GENERATE（AI 生成真实图片）
const IMAGE_STYLE_TRIGGERS = /真实|照片|写实|逼真|3[dD]|三维|建模|立体|等距|等轴|高级风格|建模风格|模型风格|AI生成|AI画|ai画|人工智能/;

// 统一对象映射：同时包含 objectKind（用于 DRAW_OBJECT）和 prompt（用于 IMAGE_GENERATE）
const OBJECT_MAP: Array<{ pattern: RegExp; objectKind: string; prompt: string; imgStyle: string }> = [
  { pattern: /汽车|轿车|跑车|卡车|车辆|自行车|摩托车|公交车|car\b|truck|bicycle|motorcycle|bus/i, objectKind: 'car', prompt: 'a realistic car, clean design, isolated subject, white background', imgStyle: 'realistic' },
  { pattern: /火车|飞机|轮船|airplane|ship|train/i, objectKind: 'car', prompt: 'a realistic vehicle, clean isolated subject, white background', imgStyle: 'realistic' },
  { pattern: /猫|cat\b/i, objectKind: 'cat', prompt: 'a cute cat, realistic detailed fur, isolated on white background', imgStyle: 'realistic' },
  { pattern: /狗|dog\b/i, objectKind: 'dog', prompt: 'a cute dog, realistic detailed fur, isolated on white background', imgStyle: 'realistic' },
  { pattern: /兔子|鸟|鱼|宠物|animal/i, objectKind: 'cat', prompt: 'a cute animal, realistic detailed, isolated on white background', imgStyle: 'realistic' },
  { pattern: /马|horse/i, objectKind: 'cat', prompt: 'a realistic horse, full body, isolated on white background', imgStyle: 'realistic' },
  { pattern: /狮子|lion/i, objectKind: 'cat', prompt: 'a majestic lion, realistic, isolated on white background', imgStyle: 'realistic' },
  { pattern: /老虎|tiger/i, objectKind: 'cat', prompt: 'a realistic tiger, isolated on white background', imgStyle: 'realistic' },
  { pattern: /熊|bear/i, objectKind: 'cat', prompt: 'a realistic bear, isolated on white background', imgStyle: 'realistic' },
  { pattern: /猴子|monkey/i, objectKind: 'cat', prompt: 'a cute monkey, realistic, isolated on white background', imgStyle: 'realistic' },
  { pattern: /大象|elephant/i, objectKind: 'cat', prompt: 'a realistic elephant, isolated on white background', imgStyle: 'realistic' },
  { pattern: /长颈鹿|giraffe/i, objectKind: 'cat', prompt: 'a realistic giraffe, isolated on white background', imgStyle: 'realistic' },
  { pattern: /熊猫|panda/i, objectKind: 'cat', prompt: 'a cute panda, realistic, isolated on white background', imgStyle: 'realistic' },
  { pattern: /恐龙|dinosaur/i, objectKind: 'cat', prompt: 'a realistic dinosaur, isolated on white background', imgStyle: 'realistic' },
  { pattern: /龙/i, objectKind: 'cat', prompt: 'a majestic dragon, realistic style, isolated on white background', imgStyle: 'realistic' },
  { pattern: /人物|人像|小孩|男孩|女孩|老人|男人|女人|学生|老师|医生|警察|消防员|宇航员|person|character|child|boy|girl/i, objectKind: 'person', prompt: 'a person figure, full body, clean studio lighting, isolated on white background', imgStyle: 'realistic' },
  { pattern: /机器人|robot/i, objectKind: 'robot', prompt: 'a robot character, futuristic design, clean details, isolated on white background', imgStyle: '3d' },
  { pattern: /无人机|飞行器|drone/i, objectKind: 'robot', prompt: 'a futuristic drone, clean design, isolated on white background', imgStyle: '3d' },
  { pattern: /房子|房屋|屋子|小屋|别墅|楼房|公寓|house/i, objectKind: 'house', prompt: 'a detailed house with windows, doors and roof, architectural design, isolated on white background', imgStyle: 'realistic' },
  { pattern: /建筑|建筑模型|摩天大楼|城堡|寺庙|教堂|building|skyscraper|castle/i, objectKind: 'house', prompt: 'a detailed building, architectural design, clean lines, isolated on white background', imgStyle: 'realistic' },
  { pattern: /松树|松柏|pine/i, objectKind: 'pine', prompt: 'a realistic pine tree, detailed needles, isolated on white background', imgStyle: 'realistic' },
  { pattern: /树|树木|大树|小树|绿树|树苗|森林|椰子树|樱花树|tree|forest/i, objectKind: 'tree', prompt: 'a beautiful realistic tree with detailed leaves and trunk, isolated on white background', imgStyle: 'realistic' },
  { pattern: /花|花朵|向日葵|玫瑰|郁金香|植物|flower/i, objectKind: 'flower', prompt: 'a beautiful flower, detailed petals, isolated on white background', imgStyle: 'realistic' },
  { pattern: /草|草地|草坪|plant|grass/i, objectKind: 'flower', prompt: 'realistic grass and plants, isolated on white background', imgStyle: 'realistic' },
  { pattern: /山|山脉|山峰|mountain/i, objectKind: 'mountain', prompt: 'a realistic mountain landscape, detailed, isolated on white background', imgStyle: 'realistic' },
  { pattern: /太阳|sun/i, objectKind: 'sun', prompt: 'a bright sun, isolated on white background', imgStyle: 'realistic' },
  { pattern: /云|云朵|cloud/i, objectKind: 'cloud', prompt: 'a fluffy cloud, isolated on white background', imgStyle: 'realistic' },
  { pattern: /雪人|snowman/i, objectKind: 'snowman', prompt: 'a cute snowman, isolated on white background', imgStyle: 'realistic' },
  { pattern: /雨伞|伞|umbrella/i, objectKind: 'umbrella', prompt: 'a colorful umbrella, isolated on white background', imgStyle: 'realistic' },
  { pattern: /蛋糕|面包|汉堡|寿司|苹果|香蕉|水果|饮料|咖啡|c(?:a?)ke|bread|burger|sushi|fruit|coffee/i, objectKind: 'flower', prompt: 'a delicious food item, realistic, isolated on white background', imgStyle: 'realistic' },
];

// 场景 → sceneKind 映射（命中后走 DRAW_SCENE 原生绘制）
const SCENE_KIND_MAP: Array<{ pattern: RegExp; sceneKind: string }> = [
  { pattern: /公园|park/i, sceneKind: 'park' },
  { pattern: /花园|garden/i, sceneKind: 'garden' },
  { pattern: /村庄|村子|village/i, sceneKind: 'village' },
  { pattern: /城市|c(?:i?)ty/i, sceneKind: 'city' },
  { pattern: /教室|课堂|classroom/i, sceneKind: 'classroom' },
  { pattern: /未来城市|科幻城市|科幻场景|future.?city/i, sceneKind: 'future_city' },
  { pattern: /海边|海滩|beach/i, sceneKind: 'beach' },
];

export function shouldUseNativeDraw(rawText: string): boolean {
  if (SIMPLE_SHAPE_TRIGGERS.test(rawText)) return false;
  if (IMAGE_ONLY_TRIGGERS.test(rawText)) return false;
  return OBJECT_MAP.some((o) => o.pattern.test(rawText)) ||
         SCENE_KIND_MAP.some((s) => s.pattern.test(rawText));
}

/** @deprecated 旧名，新代码用 shouldUseNativeDraw */
export const shouldUseImageGeneration = shouldUseNativeDraw;

function parseDrawObject(rawText: string, norm: ReturnType<typeof analyze>): Command | null {
  // 用户明确要求简单图形 → 不走
  if (SIMPLE_SHAPE_TRIGGERS.test(rawText)) return null;

  // 明确要求"生成图片" → 强制 IMAGE_GENERATE
  if (IMAGE_ONLY_TRIGGERS.test(rawText)) return parseExplicitImageGenerate(rawText, norm);

  const hasCreateIntent = /画|生成|创建|添加|来|要|做|给|插入|放|弄/.test(rawText);

  // 基础几何形状不走
  const isBasicShape = !!norm.shape && ['circle', 'rect', 'triangle', 'line', 'text'].includes(norm.shape);
  if (isBasicShape) return null;

  // 用户话语里是否带了"真实/照片/3D/建模/AI生成"等 AI 图像触发词
  const wantsAI = IMAGE_STYLE_TRIGGERS.test(rawText);

  // ── 场景匹配（长词优先）→ 始终走 DRAW_SCENE 原生绘制 ──
  if (hasCreateIntent) {
    let bestScene: string | null = null;
    let bestLen = 0;
    for (const s of SCENE_KIND_MAP) {
      if (s.pattern.test(rawText)) {
        const m = rawText.match(s.pattern);
        if (m && m[0].length > bestLen) { bestScene = s.sceneKind; bestLen = m[0].length; }
      }
    }
    if (bestScene) {
      return { type: 'DRAW_SCENE', sceneKind: bestScene, position: norm.position || undefined };
    }
  }

  // ── 对象匹配（长词优先）──
  if (hasCreateIntent) {
    let bestMatch: typeof OBJECT_MAP[0] | null = null;
    let bestLen = 0;
    for (const o of OBJECT_MAP) {
      if (o.pattern.test(rawText)) {
        const m = rawText.match(o.pattern);
        if (m && m[0].length > bestLen) { bestMatch = o; bestLen = m[0].length; }
      }
    }
    if (bestMatch) {
      // 带 AI 图像风格触发词 → IMAGE_GENERATE（AI 生成真实图片，失败回退原生绘制）
      if (wantsAI) {
        const subject = cleanSubject(rawText);
        const prompt = subject || bestMatch.prompt;
        const styleHas3d = /3[dD]|三维|建模|立体/.test(rawText);
        return {
          type: 'IMAGE_GENERATE',
          prompt,
          style: (styleHas3d ? '3d' : bestMatch.imgStyle) as 'realistic' | '3d' | 'isometric' | 'cartoon',
          size: { width: 512, height: 512 },
          position: norm.position || undefined,
          _fallbackObjectKind: bestMatch.objectKind,
        } as any;
      }

      // 默认 → DRAW_OBJECT 原生绘制（不调 API，不贴图，无水印）
      const size = /大|large|big/i.test(rawText) ? 'large' :
                   /小|small/i.test(rawText) ? 'small' :
                   'medium' as const;
      return { type: 'DRAW_OBJECT', objectKind: bestMatch.objectKind, position: norm.position || undefined, size };
    }
  }

  return null;
}

function cleanSubject(rawText: string): string {
  return rawText
    .replace(/画|生成|创建|添加|来|要|做|给|插入|放|弄|一个|一张|一幅|一只|一棵|一辆|一座|一间|个|张|幅|只|棵|辆|座|间/g, '')
    .replace(/真实的|真实|照片|写实|逼真|3[dD]|三维|建模|立体|等距|等轴|卡通|cartoon|realistic|isometric|高级|场景|的/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 仅用户明确说"生成图片/插入图片"等才走图片模式
function parseExplicitImageGenerate(rawText: string, norm: ReturnType<typeof analyze>): Command | null {
  const subject = rawText
    .replace(/生成图片|生成一张图|插入图片|导入图片|用图片生成|生成照片|贴图|用AI生成图片/g, '')
    .replace(/画|生成|创建|添加|一个|一张|一幅|个|张|幅/g, '')
    .trim();
  if (!subject) return null;
  return {
    type: 'IMAGE_GENERATE',
    prompt: subject,
    style: 'realistic',
    size: { width: 384, height: 384 },
    position: norm.position || undefined
  };
}
