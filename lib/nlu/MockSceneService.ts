import type { CanvasObject } from '@/lib/canvas/types';

interface MockScene {
  name: string;
  keywords: string[];
  objects: CanvasObject[];
}

const scenes: MockScene[] = [];

// 启动时加载所有场景
async function loadScenes() {
  if (scenes.length > 0) return;
  const files = [
    'house', 'smile', 'sun-and-trees', 'garden', 'snowman',
    'traffic-light', 'heart', 'rainbow', 'christmas-tree', 'taichi'
  ];
  for (const name of files) {
    try {
      const mod = await import(`@/lib/mock-scenes/${name}.json`);
      scenes.push(mod.default || mod);
    } catch {}
  }
}

// 匹配场景：关键词命中
export async function matchScene(text: string): Promise<CanvasObject[] | null> {
  await loadScenes();
  const lower = text.toLowerCase();
  for (const scene of scenes) {
    if (scene.keywords.some((kw) => lower.includes(kw))) {
      // 为每个对象生成唯一 id 避免冲突
      const batchPrefix = `mock_${scene.name}_${Date.now()}_`;
      return scene.objects.map((obj, i) => ({
        ...obj,
        id: batchPrefix + i,
        index: 0,
        createdAt: Date.now(),
        batchId: batchPrefix.slice(0, -1)
      }));
    }
  }
  return null;
}

// 获取所有已加载场景名
export function getSceneNames(): string[] {
  return scenes.map((s) => s.name);
}
