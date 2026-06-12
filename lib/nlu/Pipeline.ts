import { normalize } from './Normalizer';
import { parse } from './RuleEngine';
import { validate } from './SchemaGuard';
import { executeCommand } from '@/lib/canvas/CommandExecutor';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import { splitText, buildBatchId } from './BatchSplitter';
import { pushHistory, undo, redo, clearHistory } from '@/lib/canvas/CommandHistory';
import { saveDrawing, deleteDrawing, updateDrawing, fetchDrawings, fetchDrawing } from '@/lib/api/drawings-client';
import { matchScene } from './MockSceneService';
import { tryLLM } from './LLMClient';

// CLEAR 确认状态
let pendingClear = false;
// 当前正在编辑的作品 id
let currentDrawingId: string | null = null;

export function getCurrentDrawingId() { return currentDrawingId; }
export function setCurrentDrawingId(id: string | null) { currentDrawingId = id; }

export async function processInput(rawText: string): Promise<string> {
  const voiceStore = useVoiceStore.getState();
  const normalized = normalize(rawText);

  // ── Mock 场景优先 ──
  const mockObjects = await matchScene(normalized);
  if (mockObjects) {
    const before = [...useCanvasStore.getState().objects];
    const canvasStore = useCanvasStore.getState();
    for (const obj of mockObjects) canvasStore.addObject(obj);
    const after = [...useCanvasStore.getState().objects];
    pushHistory('mock_batch', rawText, before, after);
    voiceStore.reset();
    return `已绘制：${mockObjects.length} 个元素`;
  }

  // ── CLEAR 二次确认 ──
  if (pendingClear) {
    pendingClear = false;
    if (rawText.trim() === '确认') {
      useCanvasStore.getState().clearAll();
      clearHistory();
      voiceStore.reset();
      return '已清空画布';
    }
    return '已取消清空操作';
  }

  // ── PROJECT_* 作品管理 ──
  const { type } = parse(normalized);
  if (type.startsWith('PROJECT_')) {
    const result = await handleProject(normalized);
    voiceStore.reset();
    return result;
  }

  // ── BATCH 拆分 ──
  const parts = splitText(normalized);
  if (parts.length > 1) {
    const batchId = buildBatchId();
    const before = [...useCanvasStore.getState().objects];
    const results: string[] = [];
    const allCommands: string[] = [];

    for (const part of parts) {
      const cmd = parse(part);
      if (validate(cmd) && cmd.type !== 'UNKNOWN') {
        // 注入 batchId 到 CREATE 命令
        if (cmd.type === 'CREATE') (cmd as any).batchId = batchId;
        const msg = executeCommand(cmd);
        results.push(msg);
        allCommands.push(part);
      } else {
        results.push(`"${part}" 无法解析`);
      }
    }

    const after = [...useCanvasStore.getState().objects];
    pushHistory(batchId, rawText, before, after);
    voiceStore.reset();
    return results.join('；');
  }

  // ── 单指令 ──
  const cmd = parse(normalized);
  if (!validate(cmd)) {
    voiceStore.setError('指令校验未通过');
    return `"${rawText}" → 暂不支持`;
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
        voiceStore.reset();
        return `已执行 ${llmCmd.commands.length} 条指令`;
      }
      const result = executeCommand(llmCmd);
      const after = [...useCanvasStore.getState().objects];
      pushHistory('llm_batch', rawText, before, after);
      voiceStore.reset();
      return result;
    }
    voiceStore.reset();
    return `"${rawText}" → 暂不支持该指令，请改用基础指令`;
  }

  // CLEAR 未确认 → 进入确认等待
  if (cmd.type === 'CLEAR' && !cmd.confirmed) {
    pendingClear = true;
    voiceStore.reset();
    return '请说"确认"来清空画布';
  }

  // 快照前置
  const before = [...useCanvasStore.getState().objects];

  // UNDO
  if (cmd.type === 'UNDO') {
    const restored = undo();
    if (restored) {
      useCanvasStore.getState().setObjects(restored);
      voiceStore.reset();
      return '已撤销';
    }
    voiceStore.reset();
    return '没有可撤销的操作';
  }

  // REDO
  if (cmd.type === 'REDO') {
    const restored = redo();
    if (restored) {
      useCanvasStore.getState().setObjects(restored);
      voiceStore.reset();
      return '已重做';
    }
    voiceStore.reset();
    return '没有可重做的操作';
  }

  const result = executeCommand(cmd);

  // 快照后置
  const after = [...useCanvasStore.getState().objects];
  const batchId = cmd.type === 'CREATE' ? (cmd as any).batchId || 'batch_solo_' + cmd.id : 'batch_solo';
  pushHistory(batchId, rawText, before, after);

  voiceStore.reset();
  return result;
}

// ── PROJECT_* 异步处理 ──
async function handleProject(normalized: string): Promise<string> {
  const cmd = parse(normalized);

  switch (cmd.type) {
    case 'PROJECT_SAVE': {
      if (currentDrawingId) {
        const canvasJson = JSON.stringify(useCanvasStore.getState().objects);
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
          // 最近的
          if (drawings.length > 0) {
            const detail = await fetchDrawing(drawings[0]!.id);
            loadDrawing(detail);
            return `已打开：${detail.title}`;
          }
          return '没有作品';
        }
        // 最旧的/第一幅：recent=999
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
      await deleteDrawing(currentDrawingId);
      currentDrawingId = null;
      return '已删除作品';
    }

    default:
      return '作品操作暂不支持';
  }
}

function loadDrawing(detail: { canvas_json: string; id: string; title: string }) {
  currentDrawingId = detail.id;
  try {
    const objects = JSON.parse(detail.canvas_json);
    useCanvasStore.getState().setObjects(objects);
    clearHistory();
  } catch {
    // 解析失败
  }
}

