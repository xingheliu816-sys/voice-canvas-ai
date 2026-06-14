import { normalize } from './Normalizer';
import { parse } from './RuleEngine';
import { validate } from './SchemaGuard';
import { executeCommand } from '@/lib/canvas/CommandExecutor';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { getProjectSnapshot, normalizeDrawingProject, useCanvasStore } from '@/lib/canvas/ObjectStore';
import { splitText, buildBatchId } from './BatchSplitter';
import { pushHistory, undo, redo, clearHistory } from '@/lib/canvas/CommandHistory';
import { saveDrawing, deleteDrawing, updateDrawing, fetchDrawings, fetchDrawing } from '@/lib/api/drawings-client';
import { matchScene } from './MockSceneService';
import { tryLLM } from './LLMClient';
import type { Command, OverwriteCanvasCommand } from './types';

// ── 确认状态 ──
let pendingClear = false;
let pendingClearTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDelete = false;
let pendingDeleteTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCanvasDelete = false;
let pendingCanvasDeleteTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOverwrite: OverwriteCanvasCommand | null = null;
let pendingOverwriteTimer: ReturnType<typeof setTimeout> | null = null;

const CONFIRM_TIMEOUT_MS = 5000;

// ── 语音控制命令 ──
const PAUSE_PHRASES = ['停止监听', '结束讲话', '暂停语音', '退出语音模式', '暂停'];
const CONFIRM_PHRASES = ['确认', '确认清空', '确认删除', '确定', '好的'];

function isPauseCommand(text: string): boolean {
  return PAUSE_PHRASES.some((p) => text.includes(p));
}

function isConfirmPhrase(text: string): boolean {
  return CONFIRM_PHRASES.some((p) => text.trim() === p || text.includes(p));
}

function cancelPendingClear() {
  pendingClear = false;
  if (pendingClearTimer) { clearTimeout(pendingClearTimer); pendingClearTimer = null; }
}

function cancelPendingDelete() {
  pendingDelete = false;
  if (pendingDeleteTimer) { clearTimeout(pendingDeleteTimer); pendingDeleteTimer = null; }
}

function cancelPendingCanvasDelete() {
  pendingCanvasDelete = false;
  if (pendingCanvasDeleteTimer) { clearTimeout(pendingCanvasDeleteTimer); pendingCanvasDeleteTimer = null; }
}

function cancelPendingOverwrite() {
  pendingOverwrite = null;
  if (pendingOverwriteTimer) { clearTimeout(pendingOverwriteTimer); pendingOverwriteTimer = null; }
}

// 当前正在编辑的作品 id
let currentDrawingId: string | null = null;

export function getCurrentDrawingId() { return currentDrawingId; }
export function setCurrentDrawingId(id: string | null) { currentDrawingId = id; }

export async function processInput(rawText: string): Promise<string> {
  const voiceStore = useVoiceStore.getState();
  const normalized = normalize(rawText);

  // ── 语音暂停命令（优先级最高）──
  if (isPauseCommand(rawText)) {
    cancelPendingClear();
    cancelPendingDelete();
    cancelPendingCanvasDelete();
    cancelPendingOverwrite();
    voiceStore.setAutoRestart(false);
    voiceStore.setStatus('paused');
    return '语音监听已暂停，点击按钮继续';
  }

  // ── CLEAR 二次确认 ──
  if (pendingClear) {
    cancelPendingClear();
    if (isConfirmPhrase(rawText)) {
      useCanvasStore.getState().clearAll();
      clearHistory();
      voiceStore.setStatus('executing');
      return '已清空画布';
    }
    voiceStore.setStatus('executing');
    return '已取消清空操作';
  }

  // ── CANVAS_DELETE 二次确认 ──
  if (pendingCanvasDelete) {
    cancelPendingCanvasDelete();
    if (isConfirmPhrase(rawText)) {
      const result = executeCommand({ type: 'CANVAS_DELETE', target: 'current', confirmed: true } as Command);
      voiceStore.setStatus('executing');
      return result;
    }
    voiceStore.setStatus('executing');
    return '已取消删除画布操作';
  }

  // ── OVERWRITE_CANVAS 二次确认 ──
  if (pendingOverwrite) {
    const command = pendingOverwrite;
    cancelPendingOverwrite();
    if (isConfirmPhrase(rawText)) {
      const before = [...useCanvasStore.getState().objects];
      const result = executeCommand({ ...command, confirmed: true });
      const after = [...useCanvasStore.getState().objects];
      pushHistory('overwrite_canvas', rawText, before, after);
      voiceStore.setStatus('executing');
      return result;
    }
    voiceStore.setStatus('executing');
    return '已取消覆盖画布操作';
  }

  // ── PROJECT_DELETE 二次确认 ──
  if (pendingDelete) {
    cancelPendingDelete();
    if (isConfirmPhrase(rawText)) {
      if (currentDrawingId) {
        await deleteDrawing(currentDrawingId);
        currentDrawingId = null;
      }
      voiceStore.setStatus('executing');
      return '已删除作品';
    }
    voiceStore.setStatus('executing');
    return '已取消删除操作';
  }

  // ── Mock 场景优先 ──
  const mockObjects = await matchScene(normalized);
  if (mockObjects) {
    const before = [...useCanvasStore.getState().objects];
    const canvasStore = useCanvasStore.getState();
    for (const obj of mockObjects) canvasStore.addObject(obj);
    const after = [...useCanvasStore.getState().objects];
    pushHistory('mock_batch', rawText, before, after);
    voiceStore.setStatus('executing');
    return `已绘制：${mockObjects.length} 个元素`;
  }

  // ── PROJECT_* 作品管理 ──
  const { type } = parse(normalized);
  if (type.startsWith('PROJECT_')) {
    const result = await handleProject(normalized);
    voiceStore.setStatus('executing');
    return result;
  }

  // ── BATCH 拆分 ──
  const parts = splitText(normalized);
  if (parts.length > 1) {
    const batchId = buildBatchId();
    const before = [...useCanvasStore.getState().objects];
    const results: string[] = [];

    for (const part of parts) {
      const cmd = parse(part);
      if (validate(cmd) && cmd.type !== 'UNKNOWN') {
        if (cmd.type === 'CREATE') (cmd as any).batchId = batchId;
        const msg = executeCommand(cmd);
        results.push(msg);
      } else {
        results.push(`"${part}" 无法解析`);
      }
    }

    const after = [...useCanvasStore.getState().objects];
    pushHistory(batchId, rawText, before, after);
    voiceStore.setStatus('executing');
    return results.join('；');
  }

  // ── 单指令 ──
  const cmd = parse(normalized);
  if (!validate(cmd)) {
    voiceStore.setStatus('error');
    voiceStore.setAutoRestart(false);
    return `"${rawText}" → 指令校验未通过`;
  }

  if (cmd.type === 'UNKNOWN') {
    // 尝试 LLM（可选增强）
    const llmCmd = await tryLLM(normalized);
    if (llmCmd && llmCmd.type !== 'UNKNOWN') {
      const before = [...useCanvasStore.getState().objects];
      if (llmCmd.type === 'BATCH') {
        for (const sub of llmCmd.commands) {
          if (validate(sub)) executeCommand(sub);
        }
        const after = [...useCanvasStore.getState().objects];
        pushHistory(llmCmd.batchId, rawText, before, after);
        voiceStore.setStatus('executing');
        return `已执行 ${llmCmd.commands.length} 条指令`;
      }
      const result = executeCommand(llmCmd);
      const after = [...useCanvasStore.getState().objects];
      pushHistory('llm_batch', rawText, before, after);
      voiceStore.setStatus('executing');
      return result;
    }
    voiceStore.setStatus('executing');
    return `"${rawText}" → 暂不支持该指令，请改用基础指令`;
  }

  // CLEAR → 进入确认等待
  if (cmd.type === 'CLEAR' && !cmd.confirmed) {
    pendingClear = true;
    pendingClearTimer = setTimeout(() => {
      if (pendingClear) {
        cancelPendingClear();
        useVoiceStore.getState().setStatus('executing');
      }
    }, CONFIRM_TIMEOUT_MS);
    voiceStore.setStatus('confirming');
    return '这是危险操作，请说"确认"来清空画布，5秒后自动取消';
  }

  if (cmd.type === 'CANVAS_DELETE' && !cmd.confirmed) {
    if (useCanvasStore.getState().canvases.length <= 1) {
      voiceStore.setStatus('executing');
      return '至少需要保留一个画布';
    }
    pendingCanvasDelete = true;
    pendingCanvasDeleteTimer = setTimeout(() => {
      if (pendingCanvasDelete) {
        cancelPendingCanvasDelete();
        useVoiceStore.getState().setStatus('executing');
      }
    }, CONFIRM_TIMEOUT_MS);
    voiceStore.setStatus('confirming');
    return '删除当前画布会清除其中所有图形，请说确认删除或取消。';
  }

  if (cmd.type === 'OVERWRITE_CANVAS' && !cmd.confirmed) {
    pendingOverwrite = cmd;
    pendingOverwriteTimer = setTimeout(() => {
      if (pendingOverwrite) {
        cancelPendingOverwrite();
        useVoiceStore.getState().setStatus('executing');
      }
    }, CONFIRM_TIMEOUT_MS);
    voiceStore.setStatus('confirming');
    return '覆盖当前画布会清除其中所有图形，请说确认或取消。';
  }

  // 快照前置
  const before = [...useCanvasStore.getState().objects];

  // UNDO
  if (cmd.type === 'UNDO') {
    const restored = undo();
    if (restored) {
      useCanvasStore.getState().setObjects(restored);
      voiceStore.setStatus('executing');
      return '已撤销';
    }
    voiceStore.setStatus('executing');
    return '没有可撤销的操作';
  }

  // REDO
  if (cmd.type === 'REDO') {
    const restored = redo();
    if (restored) {
      useCanvasStore.getState().setObjects(restored);
      voiceStore.setStatus('executing');
      return '已重做';
    }
    voiceStore.setStatus('executing');
    return '没有可重做的操作';
  }

  const result = executeCommand(cmd);

  // 快照后置
  const after = [...useCanvasStore.getState().objects];
  const batchId = cmd.type === 'CREATE' ? (cmd as any).batchId || 'batch_solo_' + cmd.id : 'batch_solo';
  pushHistory(batchId, rawText, before, after);

  voiceStore.setStatus('executing');
  return result;
}

// ── PROJECT_* 异步处理 ──
async function handleProject(normalized: string): Promise<string> {
  const cmd = parse(normalized);

  switch (cmd.type) {
    case 'PROJECT_SAVE': {
      if (currentDrawingId) {
        const canvasJson = JSON.stringify(getProjectSnapshot());
        await updateDrawing(currentDrawingId, { canvasJson });
        return '已保存当前作品';
      }
      return '请说"保存为作品名称"来创建作品';
    }

    case 'PROJECT_SAVE_AS': {
      const item = await saveDrawing(cmd.title);
      currentDrawingId = item.id;
      return `已保存：${item.title}`;
    }

    case 'PROJECT_LIST':
      window.location.href = '/drawings';
      return '打开作品列表';

    case 'PROJECT_OPEN': {
      let drawings = await fetchDrawings();
      if (cmd.recent) {
        if (cmd.recent === 1) {
          if (drawings.length > 0) {
            const detail = await fetchDrawing(drawings[0]!.id);
            loadDrawing(detail);
            return `已打开：${detail.title}`;
          }
          return '没有作品';
        }
        if (drawings.length > 0) {
          const detail = await fetchDrawing(drawings[drawings.length - 1]!.id);
          loadDrawing(detail);
          return `已打开：${detail.title}`;
        }
        return '没有作品';
      }
      if (cmd.title) {
        const match = drawings.find((d) => d.title.includes(cmd.title!));
        if (match) {
          const detail = await fetchDrawing(match.id);
          loadDrawing(detail);
          return `已打开：${detail.title}`;
        }
        return `未找到包含"${cmd.title}"的作品`;
      }
      return '请指定作品名称';
    }

    case 'PROJECT_RENAME': {
      if (!currentDrawingId) return '请先打开一个作品';
      await updateDrawing(currentDrawingId, { title: cmd.title });
      return `已重命名为：${cmd.title}`;
    }

    case 'PROJECT_DELETE': {
      if (!currentDrawingId) return '没有正在编辑的作品';
      // 危险操作，需要二次确认
      pendingDelete = true;
      pendingDeleteTimer = setTimeout(() => {
        if (pendingDelete) {
          cancelPendingDelete();
          const vs = useVoiceStore.getState();
          if (vs.status === 'confirming') vs.setStatus('executing');
        }
      }, CONFIRM_TIMEOUT_MS);
      useVoiceStore.getState().setStatus('confirming');
      return '这是危险操作，请说"确认"来删除作品，5秒后自动取消';
    }

    default:
      return '作品操作暂不支持';
  }
}

function loadDrawing(detail: { canvas_json: string; id: string; title: string }) {
  currentDrawingId = detail.id;
  try {
    const payload = JSON.parse(detail.canvas_json);
    useCanvasStore.getState().loadProject(normalizeDrawingProject(payload, detail.title));
    clearHistory();
  } catch {
    // 解析失败
  }
}
