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
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('text');
        expect(r.text).toBe('你好');
      }
    });

    it('添加文字时默认文字可见', () => {
      const r = parse('写你好');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.fill).toBe('#111827');
        expect(r.stroke).toBe('#111827');
      }
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

  describe('DRAW_OBJECT / IMAGE_GENERATE 路由', () => {
    // ── 默认：不触发 AI → 走原生绘制 ──
    it('画一辆汽车 → DRAW_OBJECT（默认原生绘制，不调 API）', () => {
      const r = parse('画一辆汽车');
      expect(r.type).toBe('DRAW_OBJECT');
      if (r.type === 'DRAW_OBJECT') expect(r.objectKind).toBe('car');
    });

    it('画一只猫 → DRAW_OBJECT', () => {
      const r = parse('画一只猫');
      expect(r.type).toBe('DRAW_OBJECT');
      if (r.type === 'DRAW_OBJECT') expect(r.objectKind).toBe('cat');
    });

    it('画一个房子 → DRAW_OBJECT', () => {
      const r = parse('画一个房子');
      expect(r.type).toBe('DRAW_OBJECT');
      if (r.type === 'DRAW_OBJECT') expect(r.objectKind).toBe('house');
    });

    it('画一棵树 → DRAW_OBJECT', () => {
      const r = parse('画一棵树');
      expect(r.type).toBe('DRAW_OBJECT');
      if (r.type === 'DRAW_OBJECT') expect(r.objectKind).toBe('tree');
    });

    it('画一个机器人 → DRAW_OBJECT', () => {
      const r = parse('画一个机器人');
      expect(r.type).toBe('DRAW_OBJECT');
      if (r.type === 'DRAW_OBJECT') expect(r.objectKind).toBe('robot');
    });

    // ── 带 AI 触发词 → 走 IMAGE_GENERATE ──
    it('画一个真实的房子 → IMAGE_GENERATE（"真实"触发 AI 生成）', () => {
      const r = parse('画一个真实的房子');
      expect(r.type).toBe('IMAGE_GENERATE');
      if (r.type === 'IMAGE_GENERATE') {
        expect(r.style).toBe('realistic');
        expect((r as any)._fallbackObjectKind).toBe('house');
      }
    });

    it('生成一个3D机器人 → IMAGE_GENERATE 3d（"3D"触发 AI 生成）', () => {
      const r = parse('生成一个3D机器人');
      expect(r.type).toBe('IMAGE_GENERATE');
      if (r.type === 'IMAGE_GENERATE') {
        expect(r.style).toBe('3d');
        expect((r as any)._fallbackObjectKind).toBe('robot');
      }
    });

    it('画一个立体建模汽车 → IMAGE_GENERATE 3d', () => {
      const r = parse('画一个立体建模汽车');
      expect(r.type).toBe('IMAGE_GENERATE');
      if (r.type === 'IMAGE_GENERATE') {
        expect(r.style).toBe('3d');
      }
    });

    it('画真实的照片风格树 → IMAGE_GENERATE', () => {
      const r = parse('画真实的照片风格树');
      expect(r.type).toBe('IMAGE_GENERATE');
      if (r.type === 'IMAGE_GENERATE') {
        expect((r as any)._fallbackObjectKind).toBe('tree');
      }
    });

    it('生成图片一只猫 → IMAGE_GENERATE（明确说生成图片）', () => {
      const r = parse('生成图片一只猫');
      expect(r.type).toBe('IMAGE_GENERATE');
    });

    // ── 场景 → 始终原生 ──
    it('画一个公园 → DRAW_SCENE（场景始终走原生绘制）', () => {
      const r = parse('画一个公园');
      expect(r.type).toBe('DRAW_SCENE');
      if (r.type === 'DRAW_SCENE') expect(r.sceneKind).toBe('park');
    });

    // ── 反例 ──
    it('用简单图形画一个房子 → mock 兜底', () => {
      const r = parse('用简单图形画一个房子');
      expect(r.type).not.toBe('DRAW_OBJECT');
      expect(r.type).not.toBe('IMAGE_GENERATE');
    });

    it('画一个圆 → CREATE（基础几何）', () => {
      const r = parse('画一个圆');
      expect(r.type).toBe('CREATE');
    });

    it('删除汽车 → DELETE', () => {
      const r = parse('删除汽车');
      expect(r.type).toBe('DELETE');
    });
  });

  describe('PROJECT_SAVE 作品保存', () => {
    it('保存作品 → PROJECT_SAVE', () => {
      expect(parse('保存作品').type).toBe('PROJECT_SAVE');
    });
    it('保存为 我的第一幅画 → PROJECT_SAVE_AS', () => {
      const r = parse('保存为 我的第一幅画') as any;
      expect(r.type).toBe('PROJECT_SAVE_AS');
      expect(r.title).toBe('我的第一幅画');
    });
    it('保存一下 → PROJECT_SAVE', () => {
      expect(parse('保存一下').type).toBe('PROJECT_SAVE');
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
