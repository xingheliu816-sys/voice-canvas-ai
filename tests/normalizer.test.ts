import { describe, it, expect } from 'vitest';
import { normalize, analyze } from '@/lib/nlu/Normalizer';

describe('Normalizer', () => {
  describe('normalize - ASR 错字修正', () => {
    it('园形→圆形', () => { expect(normalize('画个园形')).toBe('画个圆形'); });
    it('矩型→矩形', () => { expect(normalize('画个矩型')).toBe('画个矩形'); });
    it('三角型→三角形', () => { expect(normalize('画个三角型')).toBe('画个三角形'); });
    it('原型→圆形', () => { expect(normalize('画原型')).toBe('画圆形'); });
  });

  describe('analyze - 基础 CREATE', () => {
    it('画一个红色的圆', () => {
      const r = analyze('画一个红色的圆');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#FF0000');
      expect(r.shape).toBe('circle');
    });

    it('画个蓝色矩形', () => {
      const r = analyze('画个蓝色矩形');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#0000FF');
      expect(r.shape).toBe('rect');
    });

    it('在左上角画一个绿三角', () => {
      const r = analyze('在左上角画一个绿三角');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#00FF00');
      expect(r.shape).toBe('triangle');
      expect(r.position).toBe('top-left');
    });

    it('画一条直线', () => {
      const r = analyze('画一条直线');
      expect(r.verb).toBe('CREATE');
      expect(r.shape).toBe('line');
    });

    it('写你好', () => {
      const r = analyze('写你好');
      expect(r.shape).toBe('text');
    });
  });

  describe('analyze - 容错与同义词', () => {
    it('ASR错字：画个红色园形', () => {
      const r = analyze('画个红色园形');
      expect(r.shape).toBe('circle');
    });

    it('口语：帮我画个红圈', () => {
      const r = analyze('帮我画个红圈');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#FF0000');
      expect(r.shape).toBe('circle');
    });

    it('同义词：来一个黑色方块', () => {
      const r = analyze('来一个黑色方块');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#000000');
      expect(r.shape).toBe('rect');
    });

    it('在中间画一个大红圆', () => {
      const r = analyze('在中间画一个大红圆');
      expect(r.position).toBe('center');
      expect(r.size).toBe('large');
      expect(r.color).toBe('#FF0000');
    });

    it('在右下角画一个小的', () => {
      const r = analyze('在右下角画一个小的');
      expect(r.position).toBe('bottom-right');
      expect(r.size).toBe('small');
    });
  });

  describe('analyze - 引号文本', () => {
    it('写"你好世界"', () => {
      const r = analyze('写"你好世界"');
      expect(r.text).toBe('你好世界');
    });
  });

  describe('analyze - 多对象检测', () => {
    it('画一个红圆和一个蓝方块', () => {
      const r = analyze('画一个红圆和一个蓝方块');
      expect(r.isMultiple).toBe(true);
    });

    it('画太阳然后画三棵树', () => {
      const r = analyze('画太阳然后画三棵树');
      expect(r.isMultiple).toBe(true);
    });
  });

  describe('analyze - 数字提取', () => {
    it('画3个圆', () => {
      const r = analyze('画3个圆');
      expect(r.number).toBe(3);
    });
  });
});
