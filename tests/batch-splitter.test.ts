import { describe, it, expect } from 'vitest';
import { splitText, buildBatchId } from '@/lib/nlu/BatchSplitter';

describe('BatchSplitter', () => {
  it('单句不拆分', () => {
    expect(splitText('画一个红色的圆')).toEqual(['画一个红色的圆']);
  });

  it('和：拆分', () => {
    expect(splitText('画一个红圆和一个蓝方块')).toHaveLength(2);
  });

  it('还有：拆分', () => {
    expect(splitText('画个圆还有画个三角')).toHaveLength(2);
  });

  it('然后：拆分', () => {
    expect(splitText('画太阳然后画树')).toHaveLength(2);
  });

  it('再画：拆分', () => {
    expect(splitText('画圆再画个方块')).toHaveLength(2);
  });

  it('多连接词', () => {
    const parts = splitText('画红圆和蓝方块还有绿三角');
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it('无连接词不误拆', () => {
    expect(splitText('写"你好世界"')).toEqual(['写"你好世界"']);
  });

  it('buildBatchId 生成唯一 id', () => {
    const a = buildBatchId();
    const b = buildBatchId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^batch_/);
  });
});
