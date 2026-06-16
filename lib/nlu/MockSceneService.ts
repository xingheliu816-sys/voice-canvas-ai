import type { CanvasObject } from '@/lib/canvas/types';

interface MockScene {
  name: string;
  keywords: string[];
  objects: CanvasObject[];
}

const scenes: MockScene[] = [];

async function loadScenes() {
  if (scenes.length > 0) return;
  const files = [
    'tree', 'house', 'sun', 'smile', 'cloud', 'flower', 'grass', 'mountain',
    'sun-and-trees', 'garden', 'snowman', 'traffic-light', 'heart', 'rainbow',
    'christmas-tree', 'taichi'
  ];
  for (const name of files) {
    try {
      const mod = await import(`@/lib/mock-scenes/${name}.json`);
      scenes.push(mod.default || mod);
    } catch { /* scene file may not exist yet */ }
  }
}

export async function matchScene(text: string): Promise<{ objects: CanvasObject[]; sceneName: string } | null> {
  await loadScenes();
  // 收集所有匹配，按关键词长度降序排列，优先匹配更长/更具体的关键词
  let bestMatch: { scene: MockScene; kwLen: number } | null = null;
  for (const scene of scenes) {
    for (const kw of scene.keywords) {
      if (text.includes(kw) && kw.length > (bestMatch?.kwLen ?? 0)) {
        bestMatch = { scene, kwLen: kw.length };
      }
    }
  }
  if (bestMatch) {
    const scene = bestMatch.scene;
    const batchPrefix = `mock_${scene.name}_${Date.now()}_`;
    const objects = scene.objects.map((obj, i) => ({
      ...obj,
      id: batchPrefix + i,
      index: 0,
      createdAt: Date.now(),
      batchId: batchPrefix.slice(0, -1)
    }));
    return { objects, sceneName: scene.name };
  }
  return null;
}

export function getSceneNames(): string[] {
  return scenes.map((s) => s.name);
}
