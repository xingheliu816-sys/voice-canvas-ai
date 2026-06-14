import { describe, it, expect } from 'vitest';
import { parse } from '@/lib/nlu/RuleEngine';

describe('RuleEngine', () => {
  describe('CREATE', () => {
    it('画一个红色的圆', () => {
      const r = parse('画一个红色的圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('circle');
        expect(r.fill).toBe('#FF0000');
      }
    });

    it('画个蓝色矩形', () => {
      const r = parse('画个蓝色矩形');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('rect');
    });

    it('在左上角画一个绿三角', () => {
      const r = parse('在左上角画一个绿三角');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('triangle');
        expect(r.position).toBe('top-left');
      }
    });

    it('画一条直线', () => {
      const r = parse('画一条直线');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('line');
    });

    it('写你好', () => {
      const r = parse('写你好');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('text');
    });

    it('ASR错字：画个红色园形', () => {
      const r = parse('画个红色园形');
      expect(r.type).toBe('CREATE');
    });

    it('口语：帮我画个红圈', () => {
      const r = parse('帮我画个红圈');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('circle');
    });

    it('在中间画一个大红圆', () => {
      const r = parse('在中间画一个大红圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.size).toBe('large');
        expect(r.position).toBe('center');
      }
    });

    it('在右下角画一个小的', () => {
      const r = parse('在右下角画一个小的');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.size).toBe('small');
        expect(r.position).toBe('bottom-right');
      }
    });

    it('画个黄三角', () => {
      const r = parse('画个黄三角');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('triangle');
        expect(r.fill).toBe('#FFFF00');
      }
    });

    it('画一个白圆', () => {
      const r = parse('画一个白圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.fill).toBe('#FFFFFF');
    });

    it('来一个黑色方块', () => {
      const r = parse('来一个黑色方块');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('rect');
        expect(r.fill).toBe('#000000');
      }
    });

    it('生成唯一 id', () => {
      const r1 = parse('画一个圆');
      const r2 = parse('画一个圆');
      if (r1.type === 'CREATE' && r2.type === 'CREATE') {
        expect(r1.id).not.toBe(r2.id);
      }
    });
  });

  describe('DELETE', () => {
    it('删除', () => { expect(parse('删除').type).toBe('DELETE'); });
    it('删掉', () => { expect(parse('删掉').type).toBe('DELETE'); });
    it('擦掉', () => { expect(parse('擦掉').type).toBe('DELETE'); });
  });

  describe('UNDO / REDO', () => {
    it('撤销', () => { expect(parse('撤销').type).toBe('UNDO'); });
    it('撤回', () => { expect(parse('撤回').type).toBe('UNDO'); });
    it('重做', () => { expect(parse('重做').type).toBe('REDO'); });
    it('恢复', () => { expect(parse('恢复').type).toBe('REDO'); });
  });

  describe('CLEAR', () => {
    it('清空画布', () => { expect(parse('清空画布').type).toBe('CLEAR'); });
    it('全部删除', () => { expect(parse('全部删除').type).toBe('CLEAR'); });
  });

  describe('UNKNOWN', () => {
    it('跳一支舞', () => {
      expect(parse('跳一支舞').type).toBe('UNKNOWN');
    });

    it('今天天气怎么样', () => {
      expect(parse('今天天气怎么样').type).toBe('UNKNOWN');
    });
  });

  describe('CREATE 自动补全（无动词）', () => {
    it('没有动词只说红色圆', () => {
      const r = parse('红色圆形');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('circle');
        expect(r.fill).toBe('#FF0000');
      }
    });

    it('只说三角形', () => {
      const r = parse('三角形');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('triangle');
    });
  });
});
