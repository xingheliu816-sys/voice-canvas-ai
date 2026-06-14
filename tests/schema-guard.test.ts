import { describe, it, expect } from 'vitest';
import { validate, validateBatch } from '@/lib/nlu/SchemaGuard';

describe('SchemaGuard', () => {
  it('合法 CREATE', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'circle', x: 100, y: 100, width: 100, height: 100 })).toBe(true);
  });

  it('合法 CREATE - rect', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'rect', x: 0, y: 0, width: 50, height: 50 })).toBe(true);
  });

  it('非法 shape', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'hexagon', x: 0, y: 0, width: 100, height: 100 })).toBe(false);
  });

  it('非法 type（白名单外）', () => {
    expect(validate({ type: 'DANCE', rawText: '跳舞' } as any)).toBe(false);
  });

  it('UNKNOWN 不通过', () => {
    expect(validate({ type: 'UNKNOWN', rawText: 'xxx' })).toBe(false);
  });

  it('合法 UNDO', () => {
    expect(validate({ type: 'UNDO' })).toBe(true);
  });

  it('合法 CLEAR', () => {
    expect(validate({ type: 'CLEAR' })).toBe(true);
  });

  it('合法 IMAGE_GENERATE', () => {
    expect(validate({ type: 'IMAGE_GENERATE', prompt: 'a tree' })).toBe(true);
  });

  it('非法 IMAGE_GENERATE（空 prompt）', () => {
    expect(validate({ type: 'IMAGE_GENERATE', prompt: '' } as any)).toBe(false);
  });

  it('合法 PROJECT_SAVE', () => {
    expect(validate({ type: 'PROJECT_SAVE' })).toBe(true);
  });

  it('合法 PROJECT_SAVE_AS', () => {
    expect(validate({ type: 'PROJECT_SAVE_AS', title: 'test' })).toBe(true);
  });

  it('CREATE 缺少 x/y', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'circle', width: 100, height: 100 } as any)).toBe(false);
  });

  it('CREATE width 为 0', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'circle', x: 0, y: 0, width: 0, height: 100 })).toBe(false);
  });

  describe('validateBatch', () => {
    it('全部合法', () => {
      expect(validateBatch([
        { type: 'CREATE', id: 'a', shape: 'circle', x: 0, y: 0, width: 50, height: 50 },
        { type: 'UNDO' }
      ])).toBe(true);
    });

    it('一个非法则全否', () => {
      expect(validateBatch([
        { type: 'CREATE', id: 'a', shape: 'circle', x: 0, y: 0, width: 50, height: 50 },
        { type: 'UNKNOWN', rawText: 'x' }
      ])).toBe(false);
    });
  });
});
