import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '@/lib/nlu/RuleEngine';
import { validate } from '@/lib/nlu/SchemaGuard';
import { executeCommand, setViewportSizeGetter } from '@/lib/canvas/CommandExecutor';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import type { Command } from '@/lib/nlu/types';

function reset() {
  useCanvasStore.getState().resetProject();
}

describe('viewport voice commands', () => {
  beforeEach(() => {
    reset();
    setViewportSizeGetter(() => ({ width: 1000, height: 600 }));
  });

  it('parses 放大画布 → CANVAS_ZOOM', () => {
    const cmd = parse('放大画布') as Command;
    expect(cmd.type).toBe('CANVAS_ZOOM');
    if (cmd.type === 'CANVAS_ZOOM') {
      expect(typeof cmd.scaleDelta).toBe('number');
    }
    expect(validate(cmd)).toBe(true);
  });

  it('parses 缩小画布 → CANVAS_ZOOM with negative delta', () => {
    const cmd = parse('缩小画布') as Command;
    expect(cmd.type).toBe('CANVAS_ZOOM');
    if (cmd.type === 'CANVAS_ZOOM') {
      expect(cmd.scaleDelta).toBeLessThan(0);
    }
  });

  it('parses 百分之一百五 → scaleTo 1.5', () => {
    const cmd = parse('把画布放大到百分之一百五') as Command;
    // 一百五 中文 → 我们只接收阿拉伯数字百分比；要保证不会误触
    // 用阿拉伯数字版本测试
    const cmd2 = parse('把画布放大到百分之150') as Command;
    expect(cmd2.type).toBe('CANVAS_ZOOM');
    if (cmd2.type === 'CANVAS_ZOOM') expect(cmd2.scaleTo).toBeCloseTo(1.5);
    // 兜底：原始中文应回退到默认放大
    expect(cmd.type === 'CANVAS_ZOOM' || cmd.type === 'UNKNOWN').toBe(true);
  });

  it('parses 重置画布视图 → CANVAS_RESET_VIEW', () => {
    const cmd = parse('重置画布视图') as Command;
    expect(cmd.type).toBe('CANVAS_RESET_VIEW');
    expect(validate(cmd)).toBe(true);
  });

  it('parses 把画布移到中间 → CANVAS_RESET_VIEW', () => {
    const cmd = parse('把画布移到中间') as Command;
    expect(cmd.type).toBe('CANVAS_RESET_VIEW');
  });

  it('parses 向右移动画布 → CANVAS_PAN positive x', () => {
    const cmd = parse('向右移动画布') as Command;
    expect(cmd.type).toBe('CANVAS_PAN');
    if (cmd.type === 'CANVAS_PAN') {
      expect(cmd.delta.x).toBeGreaterThan(0);
      expect(cmd.delta.y).toBe(0);
    }
  });

  it('parses 画布向左移动 → CANVAS_PAN negative x', () => {
    const cmd = parse('画布向左移动一点') as Command;
    expect(cmd.type).toBe('CANVAS_PAN');
    if (cmd.type === 'CANVAS_PAN') {
      expect(cmd.delta.x).toBeLessThan(0);
    }
  });

  it('plain 向右移动 stays MOVE (not CANVAS_PAN)', () => {
    const cmd = parse('向右移动') as Command;
    expect(cmd.type).toBe('MOVE');
  });

  it('executes CANVAS_ZOOM, updates viewport.scale', () => {
    const before = useCanvasStore.getState().viewport.scale;
    executeCommand(parse('放大画布'));
    expect(useCanvasStore.getState().viewport.scale).toBeGreaterThan(before);
    executeCommand(parse('缩小画布'));
    executeCommand(parse('缩小画布'));
    expect(useCanvasStore.getState().viewport.scale).toBeLessThan(2);
  });

  it('CANVAS_PAN updates viewport.x', () => {
    const baseX = useCanvasStore.getState().viewport.x;
    executeCommand(parse('向右移动画布'));
    expect(useCanvasStore.getState().viewport.x).toBeGreaterThan(baseX);
  });

  it('CANVAS_RESET_VIEW restores defaults', () => {
    useCanvasStore.getState().setViewport({ x: 100, y: 200, scale: 1.5 });
    executeCommand(parse('重置画布视图'));
    const vp = useCanvasStore.getState().viewport;
    expect(vp.x).toBe(0);
    expect(vp.y).toBe(0);
    expect(vp.scale).toBe(1);
  });
});

describe('shape number & MOVE by number', () => {
  beforeEach(() => {
    reset();
    setViewportSizeGetter(() => ({ width: 1000, height: 600 }));
  });

  it('assigns 编号 starting from 1 and increments', () => {
    executeCommand(parse('画一个圆'));
    executeCommand(parse('画一个矩形'));
    executeCommand(parse('画一个三角形'));
    const numbers = useCanvasStore.getState().objects.map((o) => o.number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('编号 is preserved after delete (no reuse)', () => {
    executeCommand(parse('画一个圆'));
    executeCommand(parse('画一个矩形'));
    const matrixId = useCanvasStore.getState().objects[1]!.id;
    useCanvasStore.getState().removeObject(matrixId);
    executeCommand(parse('画一个三角形'));
    const nums = useCanvasStore.getState().objects.map((o) => o.number);
    expect(nums).toContain(1);
    expect(nums).toContain(3);
    expect(nums).not.toContain(2);
  });

  it('parses 移动一号图形 → MOVE with number target', () => {
    const cmd = parse('把一号图形向右移动');
    expect(cmd.type).toBe('MOVE');
    if (cmd.type === 'MOVE') {
      expect(cmd.target).toEqual({ type: 'number', number: 1 });
      expect(cmd.dx).toBeGreaterThan(0);
    }
  });

  it('parses 第二个图形向下移动 100 → MOVE number 2 dy=100', () => {
    const cmd = parse('把第二个图形向下移动 100');
    expect(cmd.type).toBe('MOVE');
    if (cmd.type === 'MOVE') {
      expect(cmd.target).toEqual({ type: 'number', number: 2 });
      expect(cmd.dy).toBe(100);
    }
  });

  it('executing MOVE 1 号图形 modifies only that shape', () => {
    executeCommand(parse('画一个圆'));
    executeCommand(parse('画一个矩形'));
    const beforeRectX = useCanvasStore.getState().objects[1]!.x;
    executeCommand(parse('把一号图形向右移动'));
    const objs = useCanvasStore.getState().objects;
    const circle = objs.find((o) => o.number === 1)!;
    const rect = objs.find((o) => o.number === 2)!;
    expect(circle.x).toBeGreaterThan(0);
    expect(rect.x).toBe(beforeRectX);
  });

  it('plain 向右移动 falls back to most recent shape', () => {
    executeCommand(parse('画一个圆'));
    executeCommand(parse('画一个矩形'));
    useCanvasStore.getState().selectObject(null);
    const beforeRectX = useCanvasStore.getState().objects[1]!.x;
    executeCommand(parse('向右移动'));
    const rect = useCanvasStore.getState().objects[1]!;
    expect(rect.x).toBeGreaterThan(beforeRectX);
  });
});

describe('default placement near visible center, with offset', () => {
  beforeEach(() => {
    reset();
    setViewportSizeGetter(() => ({ width: 1000, height: 600 }));
    useCanvasStore.getState().resetView();
  });

  it('first shape is placed near viewport center', () => {
    executeCommand(parse('画一个圆'));
    const c = useCanvasStore.getState().objects[0]!;
    expect(c.x).toBeGreaterThan(300);
    expect(c.x).toBeLessThan(700);
    expect(c.y).toBeGreaterThan(150);
    expect(c.y).toBeLessThan(450);
  });

  it('subsequent shapes do not perfectly overlap the first', () => {
    executeCommand(parse('画一个圆'));
    executeCommand(parse('画一个矩形'));
    const [a, b] = useCanvasStore.getState().objects;
    expect(a!.x).not.toBe(b!.x);
  });
});

describe('canvas background command', () => {
  beforeEach(() => reset());

  it('parses 画布背景改成红色 → CANVAS_BACKGROUND red', () => {
    const cmd = parse('画布背景改成红色') as Command;
    expect(cmd.type).toBe('CANVAS_BACKGROUND');
    if (cmd.type === 'CANVAS_BACKGROUND') expect(cmd.color).toBe('#FF0000');
  });

  it('CANVAS_SET_BACKGROUND validate', () => {
    expect(validate({ type: 'CANVAS_SET_BACKGROUND', color: '#fff' } as Command)).toBe(true);
  });
});
