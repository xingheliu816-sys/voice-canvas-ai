import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/nlu/RuleEngine';
import { validate } from '@/lib/nlu/SchemaGuard';

describe('canvas management commands', () => {
  it('parses create canvas phrases', () => {
    expect((parse('新建画布') as any).type).toBe('CANVAS_CREATE');
    expect((parse('再开一个画布') as any).type).toBe('CANVAS_CREATE');
  });

  it('parses current canvas deletion with confirmation target', () => {
    const command = parse('删除当前画布') as any;

    expect(command.type).toBe('CANVAS_DELETE');
    expect(command.target).toBe('current');
    expect(validate(command)).toBe(true);
  });

  it('parses canvas switching by index and direction', () => {
    expect(parse('切换到画布一')).toMatchObject({
      type: 'CANVAS_SWITCH',
      target: { index: 1 },
    });
    expect(parse('打开第二个画布')).toMatchObject({
      type: 'CANVAS_SWITCH',
      target: { index: 2 },
    });
    expect(parse('切换到下一个画布')).toMatchObject({
      type: 'CANVAS_SWITCH',
      target: 'next',
    });
  });

  it('parses canvas rename and query commands', () => {
    expect(parse('把当前画布命名为草稿')).toMatchObject({
      type: 'CANVAS_RENAME',
      target: 'current',
      name: '草稿',
    });
    expect((parse('一共有几个画布') as any).type).toBe('CANVAS_QUERY');
  });
});

describe('shape style command parsing', () => {
  it('does not set fill when no color is spoken', () => {
    const command = parse('画一个圆') as any;

    expect(command.type).toBe('CREATE');
    expect(command.fill).toBe('transparent');
    expect(command.stroke).toBe('#111827');
  });

  it('parses hollow colored shapes as transparent fill with colored stroke', () => {
    expect(parse('画一个空心蓝色矩形')).toMatchObject({
      type: 'CREATE',
      shape: 'rect',
      fill: 'transparent',
      stroke: '#0000FF',
    });
  });

  it('parses explicit solid shapes as filled', () => {
    expect(parse('画一个蓝色实心圆')).toMatchObject({
      type: 'CREATE',
      shape: 'circle',
      fill: '#0000FF',
      stroke: '#0000FF',
    });
  });

  it('parses replacement and overwrite phrases separately from create', () => {
    expect((parse('用蓝色圆形替换它') as any).type).toBe('REPLACE');
    expect((parse('清掉原来的再画一个红色圆形') as any).type).toBe('OVERWRITE_CANVAS');
  });
});
