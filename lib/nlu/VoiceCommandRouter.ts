import { analyze, normalize } from './Normalizer';
import { parse } from './RuleEngine';
import { validate } from './SchemaGuard';
import type { Command, CreateCommand, TargetRef } from './types';
import { DEFAULT_SHAPE_STYLE, type ShapeKind } from '@/lib/canvas/types';

export type VoiceCommandSource = 'local' | 'llm' | 'fallback';

export interface VoiceCommandRequest {
  text: string;
  canvasState?: unknown;
  recentCommands?: string[];
}

export interface VoiceCommandResult {
  source: VoiceCommandSource;
  ops: Command[];
  latencyMs: number;
  warning?: string;
  question?: string;
}

export interface GLMToolCall {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface GLMMessage {
  role: string;
  content?: string | null;
  tool_calls?: GLMToolCall[];
}

interface GLMResponse {
  choices?: Array<{ message?: GLMMessage }>;
}

interface RouterDeps {
  callGLM?: (request: VoiceCommandRequest) => Promise<GLMToolCall[]>;
  now?: () => number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const DEFAULT_X = CANVAS_WIDTH / 2;
const DEFAULT_Y = CANVAS_HEIGHT / 2;
const DEFAULT_SIZE = 100;

const AI_TRIGGER_WORDS = [
  'ai',
  'AI',
  '智能',
  '帮我',
  '你觉得',
  '随便',
  '自动',
  '设计',
  '创意'
];

const COLOR_MAP: Record<string, string> = {
  red: '#FF0000',
  红: '#FF0000',
  红色: '#FF0000',
  blue: '#0000FF',
  蓝: '#0000FF',
  蓝色: '#0000FF',
  green: '#00FF00',
  绿: '#00FF00',
  绿色: '#00FF00',
  yellow: '#FFFF00',
  黄: '#FFFF00',
  黄色: '#FFFF00',
  black: '#000000',
  黑: '#000000',
  黑色: '#000000',
  white: '#FFFFFF',
  白: '#FFFFFF',
  白色: '#FFFFFF',
  sky: '#87CEEB',
  天空色: '#87CEEB'
};

const SHAPE_KEYWORDS: Array<[RegExp, ShapeKind]> = [
  [/圆|圈|球|园|元|circle/i, 'circle'],
  [/方|矩|框|rectangle|square/i, 'rect'],
  [/线|直线|line/i, 'line'],
  [/三角|triangle/i, 'triangle'],
  [/文字|文本|字|text/i, 'text']
];

export async function processVoiceCommand(
  request: VoiceCommandRequest,
  deps: RouterDeps = {}
): Promise<VoiceCommandResult> {
  const startedAt = deps.now?.() ?? Date.now();
  const text = request.text.trim();
  const normalized = normalize(text);
  const localCommand = parse(normalized);

  if (!isExplicitAiRequest(text) && validate(localCommand) && localCommand.type !== 'UNKNOWN') {
    return {
      source: 'local',
      ops: [localCommand],
      latencyMs: elapsed(startedAt, deps.now)
    };
  }

  try {
    const callLLM = deps.callGLM ?? callGLM;
    const toolCalls = await callLLM(request);
    const commands = convertToolCallsToCommands(toolCalls);
    if (commands.length > 0) {
      return {
        source: 'llm',
        ops: commands,
        latencyMs: elapsed(startedAt, deps.now)
      };
    }

    const question = extractAskUserQuestion(toolCalls);
    if (question) {
      return {
        source: 'llm',
        ops: [],
        question,
        latencyMs: elapsed(startedAt, deps.now)
      };
    }
  } catch (err) {
    const fallback = offlineFallback(normalized);
    return {
      source: 'fallback',
      ops: fallback,
      latencyMs: elapsed(startedAt, deps.now),
      warning: err instanceof Error ? err.message : String(err)
    };
  }

  return {
    source: 'fallback',
    ops: offlineFallback(normalized),
    latencyMs: elapsed(startedAt, deps.now),
    warning: 'GLM returned no executable tool calls'
  };
}

export async function callGLM(request: VoiceCommandRequest): Promise<GLMToolCall[]> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    throw new Error('GLM_API_KEY is not configured');
  }

  const baseUrl = (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '');
  const model = process.env.GLM_MODEL || 'glm-4';
  const timeoutMs = Number(process.env.LLM_TIMEOUT || 5000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(request),
        tools: GLM_TOOLS,
        tool_choice: 'auto',
        temperature: 0.1,
        stream: false
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`GLM API ${response.status}: ${detail.slice(0, 180)}`);
    }

    const payload = (await response.json()) as GLMResponse;
    return payload.choices?.[0]?.message?.tool_calls ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export function convertToolCallsToCommands(toolCalls: GLMToolCall[]): Command[] {
  const commands: Command[] = [];

  for (const call of toolCalls) {
    const command = convertToolCallToCommand(call);
    if (command && validate(command)) {
      commands.push(command);
    }
  }

  return commands;
}

function convertToolCallToCommand(call: GLMToolCall): Command | null {
  const args = safeParseArgs(call.function.arguments);

  switch (call.function.name) {
    case 'draw_shape':
      return buildCreateFromTool(args);
    case 'modify_shape':
      return { type: 'MODIFY', target: buildTarget(args.target), changes: buildModifyChanges(args) };
    case 'delete_shape':
      return { type: 'DELETE', target: buildTarget(args.target) };
    case 'move_shape':
      return buildMoveFromTool(args);
    case 'change_color':
      return {
        type: 'MODIFY',
        target: buildTarget(args.target),
        changes: { fill: normalizeColor(args.color), stroke: normalizeColor(args.color) }
      };
    case 'undo':
      return { type: 'UNDO' };
    case 'redo':
      return { type: 'REDO' };
    case 'clear_canvas':
      return { type: 'CLEAR' };
    default:
      return null;
  }
}

function buildCreateFromTool(args: Record<string, unknown>): CreateCommand {
  const shape = normalizeShape(args.shape);
  const size = toNumber(args.size, DEFAULT_SIZE);
  const color = normalizeColor(args.color);
  const filled = typeof args.filled === 'boolean' ? args.filled : Boolean(args.color);
  const style = filled
    ? { ...DEFAULT_SHAPE_STYLE, fill: color, stroke: color }
    : { ...DEFAULT_SHAPE_STYLE, stroke: color || DEFAULT_SHAPE_STYLE.stroke };

  return {
    type: 'CREATE',
    id: buildId(),
    shape,
    x: clamp(toNumber(args.x, DEFAULT_X), 0, CANVAS_WIDTH),
    y: clamp(toNumber(args.y, DEFAULT_Y), 0, CANVAS_HEIGHT),
    width: Math.max(10, size),
    height: Math.max(10, size),
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: toNumber(args.strokeWidth, style.strokeWidth),
    opacity: toNumber(args.opacity, style.opacity)
  };
}

function buildMoveFromTool(args: Record<string, unknown>): Command {
  const direction = typeof args.direction === 'string' ? args.direction : '';
  const distance = toNumber(args.distance, 50);
  let dx = toNumber(args.dx, 0);
  let dy = toNumber(args.dy, 0);

  if (!dx && !dy) {
    if (/左|left/i.test(direction)) dx = -distance;
    if (/右|right/i.test(direction)) dx = distance;
    if (/上|up/i.test(direction)) dy = -distance;
    if (/下|down/i.test(direction)) dy = distance;
  }

  return { type: 'MOVE', target: buildTarget(args.target), dx, dy };
}

function buildModifyChanges(args: Record<string, unknown>): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  if (args.color) {
    const color = normalizeColor(args.color);
    changes.fill = color;
    changes.stroke = color;
  }
  if (typeof args.scale === 'number') changes.scale = args.scale;
  if (typeof args.rotation === 'number') changes.rotation = args.rotation;
  return changes;
}

function offlineFallback(text: string): Command[] {
  const normalized = analyze(text);
  const shape = (normalized.shape as ShapeKind | null) ?? matchShape(text);
  if (!shape) {
    return [{ type: 'UNKNOWN', rawText: text }];
  }

  const color = normalized.color ?? matchColor(text) ?? DEFAULT_SHAPE_STYLE.stroke;
  const command = buildCreateFromTool({ shape, color, filled: Boolean(normalized.color ?? matchColor(text)) });
  return validate(command) ? [command] : [{ type: 'UNKNOWN', rawText: text }];
}

function buildMessages(request: VoiceCommandRequest) {
  return [
    { role: 'system', content: buildSystemPrompt(request.canvasState, request.recentCommands) },
    { role: 'user', content: request.text }
  ];
}

function buildSystemPrompt(canvasState: unknown, recentCommands: string[] = []): string {
  return `你是一个语音绘图助手。用户通过语音下达绘图指令，你必须转换为 tool calls，不要输出解释文本。

# 画布信息
- 画布尺寸：${CANVAS_WIDTH}x${CANVAS_HEIGHT}
- 坐标系：左上角(0,0)，右下角(${CANVAS_WIDTH},${CANVAS_HEIGHT})
- 默认位置：中心(${DEFAULT_X},${DEFAULT_Y})
- 默认大小：${DEFAULT_SIZE}
- 未指定颜色时：fill 使用 transparent，stroke 使用 #111827，strokeWidth 使用 2

# 当前画布状态
${JSON.stringify(canvasState ?? {}, null, 2)}

# 最近指令
${recentCommands.slice(-3).join('\n') || '无'}

# 关键规则
1. 简单绘图调用 draw_shape，复杂指令拆成多个 tool calls。
2. 用户说"那个/它/刚才的"时，target 使用 last。
3. 模糊到无法确定形状时，调用 ask_user。
4. 只有用户明确说覆盖、替换原图、清空原来的再画，才允许 clear_canvas；普通绘制必须追加。
5. STT 容错："园/源/元"按"圆"理解，"矩型/具形"按"矩形"理解。`;
}

function extractAskUserQuestion(toolCalls: GLMToolCall[]): string | undefined {
  const ask = toolCalls.find((call) => call.function.name === 'ask_user');
  if (!ask) return undefined;
  const args = safeParseArgs(ask.function.arguments);
  return typeof args.question === 'string' ? args.question : undefined;
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function normalizeShape(value: unknown): ShapeKind {
  const raw = String(value || '').toLowerCase();
  if (raw === 'rectangle' || raw === 'square' || raw === 'rect') return 'rect';
  if (raw === 'triangle') return 'triangle';
  if (raw === 'line' || raw === 'arrow') return 'line';
  if (raw === 'text') return 'text';
  return 'circle';
}

function normalizeColor(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_SHAPE_STYLE.stroke;
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  return COLOR_MAP[raw] ?? raw;
}

function buildTarget(value: unknown): TargetRef {
  if (typeof value === 'string') {
    if (value === 'last' || value === 'current') return { type: 'current' };
    if (value === 'all') return { type: 'all' };
  }
  return { type: 'current' };
}

function matchShape(text: string): ShapeKind | null {
  return SHAPE_KEYWORDS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

function matchColor(text: string): string | null {
  for (const [name, color] of Object.entries(COLOR_MAP)) {
    if (text.includes(name)) return color;
  }
  return null;
}

function isExplicitAiRequest(text: string): boolean {
  return AI_TRIGGER_WORDS.some((word) => text.includes(word));
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildId(): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `obj_${uuid.slice(0, 8)}`;
}

function elapsed(startedAt: number, now?: () => number): number {
  return Math.max(0, (now?.() ?? Date.now()) - startedAt);
}

export const GLM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'draw_shape',
      description: '绘制基本形状到画布',
      parameters: {
        type: 'object',
        properties: {
          shape: { type: 'string', enum: ['circle', 'rectangle', 'line', 'triangle', 'text', 'arrow'] },
          color: { type: 'string', description: '颜色名或 #hex' },
          x: { type: 'number' },
          y: { type: 'number' },
          size: { type: 'number' },
          filled: { type: 'boolean' },
          strokeWidth: { type: 'number' },
          opacity: { type: 'number' }
        },
        required: ['shape']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'modify_shape',
      description: '修改当前或指定图形的大小、旋转或颜色',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['current', 'last', 'all'] },
          scale: { type: 'number' },
          rotation: { type: 'number' },
          color: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_shape',
      description: '删除图形',
      parameters: {
        type: 'object',
        properties: { target: { type: 'string', enum: ['current', 'last', 'all'] } }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'move_shape',
      description: '移动图形',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['current', 'last'] },
          direction: { type: 'string' },
          distance: { type: 'number' },
          dx: { type: 'number' },
          dy: { type: 'number' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'change_color',
      description: '修改图形颜色',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['current', 'last', 'all'] },
          color: { type: 'string' }
        },
        required: ['color']
      }
    }
  },
  { type: 'function', function: { name: 'undo', description: '撤销上一步', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'redo', description: '重做上一步', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'clear_canvas', description: '清空画布，仅在用户明确要求清空时使用', parameters: { type: 'object', properties: {} } } },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description: '用户意图过于模糊时反问',
      parameters: {
        type: 'object',
        properties: { question: { type: 'string' } },
        required: ['question']
      }
    }
  }
] as const;
