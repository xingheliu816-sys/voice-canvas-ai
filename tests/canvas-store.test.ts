import { beforeEach, describe, expect, it } from 'vitest';
import { executeCommand } from '@/lib/canvas/CommandExecutor';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import { parse } from '@/lib/nlu/RuleEngine';

function resetCanvasStore() {
  const store = useCanvasStore.getState() as any;
  if (typeof store.resetProject === 'function') {
    store.resetProject();
    return;
  }
  store.setObjects?.([]);
}

describe('canvas store and executor', () => {
  beforeEach(() => {
    resetCanvasStore();
  });

  it('adds create commands instead of replacing existing objects', () => {
    for (const text of ['画一个圆', '画一个矩形', '画一个三角形']) {
      const cmd = parse(text);
      expect(cmd.type).toBe('CREATE');
      executeCommand(cmd);
    }

    expect(useCanvasStore.getState().objects.map((obj) => obj.shape)).toEqual([
      'circle',
      'rect',
      'triangle',
    ]);
  });

  it('uses outline style when the user does not specify a color', () => {
    const cmd = parse('画一个圆');
    expect(cmd.type).toBe('CREATE');
    executeCommand(cmd);

    const [circle] = useCanvasStore.getState().objects;
    expect(circle?.fill).toBe('transparent');
    expect(circle?.stroke).toBe('#111827');
    expect(circle?.strokeWidth).toBe(2);
  });

  it('keeps each canvas objects isolated', () => {
    const store = useCanvasStore.getState() as any;
    expect(typeof store.createCanvas).toBe('function');
    expect(typeof store.switchCanvas).toBe('function');

    executeCommand(parse('画一个圆'));
    const firstCanvasId = useCanvasStore.getState().activeCanvasId;

    const created = store.createCanvas();
    expect(useCanvasStore.getState().activeCanvasId).toBe(created.id);
    executeCommand(parse('画一个矩形'));
    expect(useCanvasStore.getState().objects.map((obj) => obj.shape)).toEqual(['rect']);

    useCanvasStore.getState().switchCanvas(firstCanvasId);
    expect(useCanvasStore.getState().objects.map((obj) => obj.shape)).toEqual(['circle']);
  });
});
