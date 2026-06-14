import { normalize } from './Normalizer';
import { parse, shouldUseNativeDraw, SIMPLE_SHAPE_TRIGGERS } from './RuleEngine';
import { validate } from './SchemaGuard';
import { executeCommand } from '@/lib/canvas/CommandExecutor';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';
import { getProjectSnapshot, normalizeDrawingProject, useCanvasStore } from '@/lib/canvas/ObjectStore';
import { splitText, buildBatchId } from './BatchSplitter';
import { pushHistory, undo, redo, clearHistory } from '@/lib/canvas/CommandHistory';
import { saveDrawing, deleteDrawing, updateDrawing, fetchDrawings, fetchDrawing } from '@/lib/api/drawings-client';
import { matchScene } from './MockSceneService';
import { tryLLM } from './LLMClient';
import { buildObject, buildScene, factoryOutputToCanvasObject } from '@/lib/canvas/ObjectFactory';
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

function getVisibleCenter(store: ReturnType<typeof useCanvasStore.getState>) {
  const vp = store.viewport;
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const h = typeof window !== 'undefined' ? window.innerHeight : 720;
  return {
    x: (w / 2 - vp.x) / (vp.scale || 1),
    y: (h / 2 - vp.y) / (vp.scale || 1)
  };
}

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
  console.log('[pipeline] raw:', rawText, '→ normalized:', normalized);

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

  // ── Mock 场景：仅在用户明确要求"简单图形/示意图/简笔画"，或对象不属于复杂对象时介入 ──
  // "画一棵树/画一个房子"默认走原生绘制 DRAW_OBJECT，"用简单图形画房子"才走几何拼接
  const wantsSimpleShape = SIMPLE_SHAPE_TRIGGERS.test(rawText);
  const wantsNativeDraw = shouldUseNativeDraw(rawText);
  if (wantsSimpleShape || !wantsNativeDraw) {
    const sceneMatch = await matchScene(normalized);
    if (sceneMatch) {
      const { objects: mockObjects, sceneName } = sceneMatch;
      const before = [...useCanvasStore.getState().objects];
      const canvasStore = useCanvasStore.getState();
      for (const obj of mockObjects) canvasStore.addObject(obj);
      const after = [...useCanvasStore.getState().objects];
      pushHistory('mock_batch', rawText, before, after);
      voiceStore.setStatus('executing');

      const sceneLabels: Record<string, string> = {
        tree: '树', house: '房子', sun: '太阳', smile: '笑脸',
        cloud: '云', flower: '花', grass: '草地', mountain: '山',
        snowman: '雪人', heart: '爱心', rainbow: '彩虹',
        'christmas-tree': '圣诞树', taichi: '太极图',
        'traffic-light': '红绿灯', 'sun-and-trees': '太阳和树', garden: '花园'
      };
      const label = sceneLabels[sceneName] || sceneName;
      console.log('[pipeline] mock scene matched:', sceneName, 'wantsSimpleShape:', wantsSimpleShape);
      return `已识别：${rawText}，使用预置场景：${label}（${mockObjects.length} 个元素）`;
    }
  }

  // ── PROJECT_* 作品管理 ──
  const cmd = parse(normalized);
  console.log('[pipeline] parsed command type:', cmd.type);
  if (cmd.type.startsWith('PROJECT_')) {
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
      const partCmd = parse(part);
      if (validate(partCmd) && partCmd.type !== 'UNKNOWN') {
        if (partCmd.type === 'CREATE') (partCmd as any).batchId = batchId;
        const msg = executeCommand(partCmd);
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

  // ── DRAW_OBJECT：原生绘制复杂对象 ──
  if (cmd.type === 'DRAW_OBJECT') {
    voiceStore.setStatus('executing');
    const objData = buildObject(cmd.objectKind);
    if (!objData) {
      voiceStore.setStatus('executing');
      return `暂不支持绘制"${cmd.objectKind}"，请尝试其他对象`;
    }
    const before = [...useCanvasStore.getState().objects];
    const store = useCanvasStore.getState();
    const center = getVisibleCenter(store);
    const offset = store.objects.length * 14;
    const sizeMultiplier = cmd.size === 'large' ? 1.4 : cmd.size === 'small' ? 0.65 : 1.0;
    const id = `draw_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const obj = factoryOutputToCanvasObject(
      objData, id, 0,
      center.x + offset,
      center.y + offset
    );
    obj.scaleX = sizeMultiplier;
    obj.scaleY = sizeMultiplier;
    obj.x = center.x + offset - (objData.width * sizeMultiplier) / 2;
    obj.y = center.y + offset - (objData.height * sizeMultiplier) / 2;
    const added = store.addObject(obj);
    store.selectObject(added.id);
    const after = [...useCanvasStore.getState().objects];
    pushHistory(`draw_obj_${added.id}`, rawText, before, after);
    console.log('[pipeline] DRAW_OBJECT:', cmd.objectKind, '→ id:', added.id, 'size:', sizeMultiplier);
    return `已绘制${objData.name} #${added.number}`;
  }

  // ── DRAW_SCENE：原生绘制场景（分多个对象）──
  if (cmd.type === 'DRAW_SCENE') {
    voiceStore.setStatus('executing');
    const sceneObjects = buildScene(cmd.sceneKind);
    if (!sceneObjects || sceneObjects.length === 0) {
      voiceStore.setStatus('executing');
      return `暂不支持绘制场景"${cmd.sceneKind}"，请尝试其他场景`;
    }
    const before = [...useCanvasStore.getState().objects];
    const store = useCanvasStore.getState();
    const center = getVisibleCenter(store);
    const results: string[] = [];
    let totalOffset = 0;

    for (const sceneObj of sceneObjects) {
      const id = `scene_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const obj = factoryOutputToCanvasObject(
        sceneObj, id, 0,
        center.x + totalOffset + sceneObj.width / 2,
        center.y
      );
      const added = store.addObject(obj);
      totalOffset += sceneObj.width + 20;
      results.push(sceneObj.name);
    }
    const after = [...useCanvasStore.getState().objects];
    pushHistory(`draw_scene_${cmd.sceneKind}`, rawText, before, after);
    console.log('[pipeline] DRAW_SCENE:', cmd.sceneKind, '→', results.length, 'objects');
    return `已绘制场景：${results.join('、')}`;
  }

  // ── IMAGE_GENERATE：AI 生成真实图像，失败时回退到原生绘制 ──
  if (cmd.type === 'IMAGE_GENERATE') {
    voiceStore.setStatus('processing');
    console.log('[pipeline] IMAGE_GENERATE prompt:', cmd.prompt, 'style:', cmd.style);

    const fallbackKind: string | undefined = (cmd as any)._fallbackObjectKind;

    const addImageObject = (imageSrc: string) => {
      const store = useCanvasStore.getState();
      const center = getVisibleCenter(store);
      const offset = store.objects.length * 14;
      const imgObj = {
        id: `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        number: 0, index: 0,
        name: cmd.prompt.slice(0, 20), createdAt: Date.now(),
        shape: 'image' as const,
        x: center.x + offset - 160, y: center.y + offset - 160,
        width: cmd.size?.width || 320, height: cmd.size?.height || 320,
        fill: 'transparent', stroke: '#111827', strokeWidth: 0,
        opacity: 1, rotation: 0, scaleX: 1, scaleY: 1,
        imageSrc, prompt: cmd.prompt
      };
      const before = [...store.objects];
      const added = store.addObject(imgObj);
      store.selectObject(added.id);
      pushHistory(`img_${added.id}`, rawText, before, [...useCanvasStore.getState().objects]);
      console.log('[pipeline] image inserted:', added.id, 'src:', imageSrc.slice(0, 80));
      return added;
    };

    // 回退到原生绘制
    const tryFallbackDraw = (reason: string): string => {
      if (!fallbackKind) {
        return reason || '图像生成失败且无原生绘制回退，请配置 IMAGE_API_KEY 或说"用简单图形画"';
      }
      const objData = buildObject(fallbackKind);
      if (!objData) return reason || `图像生成失败，"${fallbackKind}"也暂不支持原生绘制`;

      const store = useCanvasStore.getState();
      const center = getVisibleCenter(store);
      const offset = store.objects.length * 14;
      const id = `draw_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const obj = factoryOutputToCanvasObject(objData, id, 0, center.x + offset, center.y + offset);
      const before = [...store.objects];
      const added = store.addObject(obj);
      store.selectObject(added.id);
      pushHistory(`draw_fb_${added.id}`, rawText, before, [...useCanvasStore.getState().objects]);
      console.log('[pipeline] IMAGE_GENERATE failed, fallback DRAW_OBJECT:', fallbackKind);
      return `已绘制${objData.name} #${added.number}（AI 图像生成失败：${reason}）`;
    };

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cmd.prompt,
          style: cmd.style || 'realistic',
          width: cmd.size?.width || 512,
          height: cmd.size?.height || 512
        })
      });
      const json = await res.json().catch(() => ({}));
      console.log('[pipeline] image API status:', res.status);

      if (!res.ok) {
        voiceStore.setStatus('executing');
        const reason = json.error || `服务返回 ${res.status}`;
        return tryFallbackDraw(reason);
      }

      if (!json.imageUrl) {
        voiceStore.setStatus('executing');
        return tryFallbackDraw('服务未返回图像地址');
      }

      addImageObject(json.imageUrl);
      voiceStore.setStatus('executing');
      return `已生成真实图像：${cmd.prompt.slice(0, 30)}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : '网络错误';
      console.error('[pipeline] image generate error:', message);
      voiceStore.setStatus('executing');
      return tryFallbackDraw(message);
    }
  }

  // ── 单指令 ──
  if (!validate(cmd)) {
    voiceStore.setStatus('executing');
    return `"${rawText}" → 指令校验未通过，请再说一遍`;
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
    return `已识别："${rawText}"，但暂不支持该指令`;
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
