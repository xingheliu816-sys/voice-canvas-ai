import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import { processInput } from '@/lib/nlu/Pipeline';

describe('DRAW_OBJECT 原生绘制 + IMAGE_GENERATE 回退', () => {
  beforeEach(() => {
    useCanvasStore.getState().resetProject();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── 默认：原生绘制（不调 API，无水印）──

  it('画一辆汽车 → 直接原生绘制，不调 API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const message = await processInput('画一辆汽车');
    const objects = useCanvasStore.getState().objects;

    expect(message).toMatch(/已绘制汽车/);
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({ shape: 'group', objectKind: '汽车' });
    expect(objects[0].imageSrc).toBeUndefined();
    // 确保没有调 /api/image/generate
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('画一棵树 → 直接原生绘制', async () => {
    const message = await processInput('画一棵树');
    const objects = useCanvasStore.getState().objects;

    expect(message).toMatch(/已绘制树/);
    expect(objects[0]).toMatchObject({ shape: 'group', objectKind: '树' });
  });

  it('画一个房子 → 直接原生绘制，有结构细节', async () => {
    const message = await processInput('画一个房子');
    const objects = useCanvasStore.getState().objects;

    expect(message).toMatch(/已绘制房子/);
    expect(objects[0]).toMatchObject({ shape: 'group', objectKind: '房子' });
    expect(objects[0].children?.length).toBeGreaterThan(5);
  });

  it('画一个公园 → 场景原生绘制', async () => {
    const message = await processInput('画一个公园');
    const objects = useCanvasStore.getState().objects;

    expect(message).toMatch(/已绘制场景/);
    expect(objects.length).toBeGreaterThanOrEqual(1);
    expect(objects.every((o) => o.shape === 'group')).toBe(true);
  });

  // ── 带 AI 触发词 → IMAGE_GENERATE（失败时回退原生）──

  it('画真实的汽车 → IMAGE_GENERATE 成功', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: vi.fn().mockResolvedValue({ imageUrl: '/files/test-car.png' })
    }));

    const message = await processInput('画真实的汽车');
    const objects = useCanvasStore.getState().objects;

    expect(message).toMatch(/已生成真实图像/);
    expect(objects[0]).toMatchObject({ shape: 'image', imageSrc: '/files/test-car.png' });
  });

  it('画真实的汽车 → IMAGE_GENERATE 失败回退原生', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 503,
      json: vi.fn().mockResolvedValue({ error: 'no key' })
    }));

    const message = await processInput('画真实的汽车');
    const objects = useCanvasStore.getState().objects;

    expect(message).toMatch(/已绘制汽车/);
    expect(objects[0]).toMatchObject({ shape: 'group', objectKind: '汽车' });
  });

  // ── 可编辑性 ──

  it('原生对象可选中和删除', async () => {
    await processInput('画一棵树');
    const obj = useCanvasStore.getState().objects[0]!;
    useCanvasStore.getState().selectObject(obj.id);
    expect(useCanvasStore.getState().selectedId).toBe(obj.id);
    useCanvasStore.getState().removeObject(obj.id);
    expect(useCanvasStore.getState().objects).toHaveLength(0);
  });
});
