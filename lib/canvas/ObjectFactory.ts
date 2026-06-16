// 复杂对象的原生矢量绘制工厂 —— 输出 CanvasObject 可直接插入画布

import type { CanvasObject } from './types';

// ── 图元类型（用于 GroupObject.children）──
export type PrimitiveKind = 'rect' | 'circle' | 'ellipse' | 'line' | 'polygon' | 'path' | 'text' | 'tri';

export interface DrawablePrimitive {
  kind: PrimitiveKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  points?: number[];
  pathData?: string;
  text?: string;
  fontSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  sides?: number;
}

export type ObjectKind = 'tree' | 'pine' | 'house' | 'car' | 'robot' | 'flower' | 'cloud' | 'sun' | 'mountain' | 'grass' | 'person' | 'cat' | 'dog' | 'umbrella' | 'snowman' | 'heart' | 'rainbow' | 'christmas-tree';

export type SceneKind = 'park' | 'garden' | 'village' | 'classroom' | 'city' | 'future_city' | 'beach';

interface FactoryOutput {
  children: DrawablePrimitive[];
  width: number;
  height: number;
  name: string;
}

// ═══════════════════════════════════════════
// 对象工厂函数
// ═══════════════════════════════════════════

function treeFactory(): FactoryOutput {
  return {
    name: '树',
    width: 140,
    height: 200,
    children: [
      // 树干 — 带渐变的梯形，用两个重叠 rect 模拟
      { kind: 'rect', x: 52, y: 90, width: 36, height: 90, fill: '#8B5A2B', stroke: '#5C3A1A', strokeWidth: 2, opacity: 1 },
      { kind: 'rect', x: 56, y: 90, width: 28, height: 90, fill: '#A0722E', stroke: 'none', strokeWidth: 0, opacity: 1 },
      // 树冠底影
      { kind: 'circle', x: 70, y: 58, radius: 58, fill: '#15803D', stroke: 'none', strokeWidth: 0, opacity: 0.6 },
      // 树冠 — 多层重叠圆
      { kind: 'circle', x: 70, y: 48, radius: 52, fill: '#22C55E', stroke: '#15803D', strokeWidth: 2, opacity: 1 },
      { kind: 'circle', x: 42, y: 62, radius: 42, fill: '#16A34A', stroke: '#15803D', strokeWidth: 1.5, opacity: 0.92 },
      { kind: 'circle', x: 98, y: 62, radius: 42, fill: '#16A34A', stroke: '#15803D', strokeWidth: 1.5, opacity: 0.92 },
      { kind: 'circle', x: 56, y: 38, radius: 36, fill: '#4ADE80', stroke: '#22C55E', strokeWidth: 1, opacity: 0.85 },
      { kind: 'circle', x: 84, y: 38, radius: 36, fill: '#4ADE80', stroke: '#22C55E', strokeWidth: 1, opacity: 0.85 },
      // 顶部高光
      { kind: 'circle', x: 70, y: 32, radius: 24, fill: '#86EFAC', stroke: 'none', strokeWidth: 0, opacity: 0.55 },
    ]
  };
}

function pineTreeFactory(): FactoryOutput {
  return {
    name: '松树',
    width: 90,
    height: 190,
    children: [
      { kind: 'rect', x: 36, y: 110, width: 18, height: 60, fill: '#6B3A2A', stroke: '#4A2518', strokeWidth: 1.5 },
      // 三角形树冠层叠
      { kind: 'polygon', x: 45, y: 100, points: [-40, 0, 40, 0, 0, -55], fill: '#15803D', stroke: '#0F5C2A', strokeWidth: 1.5 },
      { kind: 'polygon', x: 45, y: 62, points: [-34, 0, 34, 0, 0, -48], fill: '#16A34A', stroke: '#0F5C2A', strokeWidth: 1.5 },
      { kind: 'polygon', x: 45, y: 28, points: [-24, 0, 24, 0, 0, -38], fill: '#22C55E', stroke: '#15803D', strokeWidth: 1 },
      { kind: 'polygon', x: 45, y: 2, points: [-14, 0, 14, 0, 0, -22], fill: '#4ADE80', stroke: '#22C55E', strokeWidth: 1 },
    ]
  };
}

function houseFactory(): FactoryOutput {
  return {
    name: '房子',
    width: 240,
    height: 220,
    children: [
      // 阴影底
      { kind: 'rect', x: 12, y: 175, width: 216, height: 20, fill: '#D2B48C', stroke: 'none', strokeWidth: 0, opacity: 0.25 },
      // 墙体
      { kind: 'rect', x: 20, y: 70, width: 200, height: 120, fill: '#F5DEB3', stroke: '#8B7355', strokeWidth: 2.5 },
      // 墙面砖缝纹理
      { kind: 'line', x: 20, y: 90, points: [0, 0, 200, 0], fill: 'none', stroke: '#DDC8A0', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 20, y: 110, points: [0, 0, 200, 0], fill: 'none', stroke: '#DDC8A0', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 20, y: 130, points: [0, 0, 200, 0], fill: 'none', stroke: '#DDC8A0', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 20, y: 150, points: [0, 0, 200, 0], fill: 'none', stroke: '#DDC8A0', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 20, y: 170, points: [0, 0, 200, 0], fill: 'none', stroke: '#DDC8A0', strokeWidth: 1, opacity: 0.6 },
      // 屋顶三角形
      { kind: 'polygon', x: 120, y: 72, points: [-120, 0, 120, 0, 0, -58], fill: '#CC3333', stroke: '#8B0000', strokeWidth: 2.5 },
      // 屋顶高光
      { kind: 'polygon', x: 120, y: 72, points: [-60, 0, 60, 0, 0, -32], fill: '#DD4444', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
      // 烟囱
      { kind: 'rect', x: 170, y: 10, width: 22, height: 40, fill: '#A0522D', stroke: '#6B3410', strokeWidth: 2 },
      { kind: 'rect', x: 167, y: 6, width: 28, height: 8, fill: '#6B3410', stroke: '#4A2008', strokeWidth: 1.5 },
      // 门
      { kind: 'rect', x: 95, y: 110, width: 50, height: 80, fill: '#8B4513', stroke: '#5C3010', strokeWidth: 2 },
      { kind: 'circle', x: 135, y: 152, radius: 4, fill: '#FFD700', stroke: '#B8860B', strokeWidth: 1 },
      // 门板装饰
      { kind: 'rect', x: 100, y: 115, width: 40, height: 30, fill: '#A0522D', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
      // 左窗
      { kind: 'rect', x: 38, y: 100, width: 40, height: 40, fill: '#87CEEB', stroke: '#5C3010', strokeWidth: 2.5 },
      { kind: 'line', x: 58, y: 100, points: [0, 0, 0, 40], fill: 'none', stroke: '#5C3010', strokeWidth: 1.5, opacity: 0.7 },
      { kind: 'line', x: 38, y: 120, points: [0, 0, 40, 0], fill: 'none', stroke: '#5C3010', strokeWidth: 1.5, opacity: 0.7 },
      // 右窗
      { kind: 'rect', x: 162, y: 100, width: 40, height: 40, fill: '#87CEEB', stroke: '#5C3010', strokeWidth: 2.5 },
      { kind: 'line', x: 182, y: 100, points: [0, 0, 0, 40], fill: 'none', stroke: '#5C3010', strokeWidth: 1.5, opacity: 0.7 },
      { kind: 'line', x: 162, y: 120, points: [0, 0, 40, 0], fill: 'none', stroke: '#5C3010', strokeWidth: 1.5, opacity: 0.7 },
      // 门廊台阶
      { kind: 'rect', x: 88, y: 184, width: 64, height: 8, fill: '#C4A882', stroke: '#8B7355', strokeWidth: 1 },
    ]
  };
}

function carFactory(): FactoryOutput {
  return {
    name: '汽车',
    width: 260,
    height: 130,
    children: [
      // 阴影
      { kind: 'ellipse', x: 130, y: 118, radiusX: 110, radiusY: 8, fill: '#999', stroke: 'none', strokeWidth: 0, opacity: 0.3 },
      // 车身下部
      { kind: 'rect', x: 20, y: 60, width: 220, height: 50, fill: '#E03131', stroke: '#B91C1C', strokeWidth: 2.5, opacity: 1 },
      // 车身上部（驾驶舱）
      { kind: 'path', x: 70, y: 20, pathData: 'M0,40 L30,0 L120,0 L150,40 Z', fill: '#EF4444', stroke: '#B91C1C', strokeWidth: 2 },
      // 前挡风
      { kind: 'path', x: 96, y: 23, pathData: 'M0,34 L20,0 L60,0 L70,34 Z', fill: '#A0D8EF', stroke: '#7BAFC9', strokeWidth: 1.5, opacity: 0.8 },
      // 后挡风
      { kind: 'path', x: 140, y: 23, pathData: 'M0,34 L8,0 L28,0 L36,34 Z', fill: '#A0D8EF', stroke: '#7BAFC9', strokeWidth: 1.5, opacity: 0.8 },
      // 前轮
      { kind: 'circle', x: 70, y: 98, radius: 26, fill: '#222', stroke: '#111', strokeWidth: 3 },
      { kind: 'circle', x: 70, y: 98, radius: 14, fill: '#888', stroke: '#666', strokeWidth: 1.5 },
      { kind: 'circle', x: 70, y: 98, radius: 5, fill: '#AAA', stroke: 'none', strokeWidth: 0 },
      // 后轮
      { kind: 'circle', x: 190, y: 98, radius: 26, fill: '#222', stroke: '#111', strokeWidth: 3 },
      { kind: 'circle', x: 190, y: 98, radius: 14, fill: '#888', stroke: '#666', strokeWidth: 1.5 },
      { kind: 'circle', x: 190, y: 98, radius: 5, fill: '#AAA', stroke: 'none', strokeWidth: 0 },
      // 前灯
      { kind: 'circle', x: 26, y: 82, radius: 8, fill: '#FEF08A', stroke: '#CA8A04', strokeWidth: 1.5 },
      // 尾灯
      { kind: 'rect', x: 232, y: 78, width: 10, height: 16, fill: '#DC2626', stroke: '#991B1B', strokeWidth: 1.5, opacity: 1 },
      // 门把手
      { kind: 'rect', x: 105, y: 70, width: 20, height: 5, fill: '#FCA5A5', stroke: 'none', strokeWidth: 0, opacity: 0.7 },
      // 前保险杠
      { kind: 'rect', x: 14, y: 100, width: 30, height: 14, fill: '#FCA5A5', stroke: '#B91C1C', strokeWidth: 1, opacity: 0.6 },
    ]
  };
}

function robotFactory(): FactoryOutput {
  return {
    name: '机器人',
    width: 140,
    height: 200,
    children: [
      // 天线
      { kind: 'line', x: 70, y: 0, points: [0, 20, 0, 0], fill: 'none', stroke: '#666', strokeWidth: 3 },
      { kind: 'circle', x: 70, y: 0, radius: 5, fill: '#EF4444', stroke: '#991B1B', strokeWidth: 1.5 },
      // 头部
      { kind: 'rect', x: 40, y: 20, width: 60, height: 50, fill: '#94A3B8', stroke: '#64748B', strokeWidth: 2.5, opacity: 1 },
      // 眼睛
      { kind: 'circle', x: 56, y: 42, radius: 8, fill: '#0EA5E9', stroke: '#0369A1', strokeWidth: 2 },
      { kind: 'circle', x: 84, y: 42, radius: 8, fill: '#0EA5E9', stroke: '#0369A1', strokeWidth: 2 },
      { kind: 'circle', x: 57, y: 41, radius: 3, fill: '#fff', stroke: 'none', strokeWidth: 0, opacity: 0.7 },
      { kind: 'circle', x: 85, y: 41, radius: 3, fill: '#fff', stroke: 'none', strokeWidth: 0, opacity: 0.7 },
      // 嘴巴
      { kind: 'rect', x: 56, y: 56, width: 28, height: 6, fill: '#334155', stroke: 'none', strokeWidth: 0, opacity: 1 },
      // 脖子
      { kind: 'rect', x: 58, y: 70, width: 24, height: 14, fill: '#64748B', stroke: '#475569', strokeWidth: 1.5 },
      // 身体
      { kind: 'rect', x: 30, y: 82, width: 80, height: 70, fill: '#64748B', stroke: '#475569', strokeWidth: 2.5 },
      // 身体面板
      { kind: 'rect', x: 44, y: 94, width: 52, height: 36, fill: '#334155', stroke: '#1E293B', strokeWidth: 1.5 },
      { kind: 'circle', x: 62, y: 112, radius: 5, fill: '#22C55E', stroke: '#15803D', strokeWidth: 1, opacity: 0.9 },
      { kind: 'circle', x: 78, y: 112, radius: 5, fill: '#0EA5E9', stroke: '#0369A1', strokeWidth: 1, opacity: 0.9 },
      // 左臂
      { kind: 'rect', x: 10, y: 88, width: 22, height: 56, fill: '#94A3B8', stroke: '#64748B', strokeWidth: 2 },
      // 左手
      { kind: 'circle', x: 22, y: 146, radius: 12, fill: '#64748B', stroke: '#475569', strokeWidth: 2 },
      // 右臂
      { kind: 'rect', x: 108, y: 88, width: 22, height: 56, fill: '#94A3B8', stroke: '#64748B', strokeWidth: 2 },
      // 右手
      { kind: 'circle', x: 118, y: 146, radius: 12, fill: '#64748B', stroke: '#475569', strokeWidth: 2 },
      // 左腿
      { kind: 'rect', x: 42, y: 152, width: 24, height: 36, fill: '#475569', stroke: '#334155', strokeWidth: 2 },
      // 左脚
      { kind: 'rect', x: 36, y: 180, width: 32, height: 12, fill: '#334155', stroke: '#1E293B', strokeWidth: 1.5 },
      // 右腿
      { kind: 'rect', x: 74, y: 152, width: 24, height: 36, fill: '#475569', stroke: '#334155', strokeWidth: 2 },
      // 右脚
      { kind: 'rect', x: 72, y: 180, width: 32, height: 12, fill: '#334155', stroke: '#1E293B', strokeWidth: 1.5 },
    ]
  };
}

function flowerFactory(): FactoryOutput {
  return {
    name: '花',
    width: 100,
    height: 160,
    children: [
      // 茎
      { kind: 'line', x: 50, y: 70, points: [0, 0, 0, 80], fill: 'none', stroke: '#22C55E', strokeWidth: 4 },
      // 叶子
      { kind: 'path', x: 50, y: 110, pathData: 'M0,0 Q20,-16 40,-6 Q20,4 0,0 Z', fill: '#16A34A', stroke: '#15803D', strokeWidth: 1 },
      { kind: 'path', x: 50, y: 100, pathData: 'M0,0 Q-20,-16 -40,-6 Q-20,4 0,0 Z', fill: '#16A34A', stroke: '#15803D', strokeWidth: 1 },
      // 花瓣 — 5 瓣围绕中心
      { kind: 'circle', x: 50, y: 30, radius: 18, fill: '#F472B6', stroke: '#DB2777', strokeWidth: 1.5 }, // 上
      { kind: 'circle', x: 30, y: 48, radius: 18, fill: '#F9A8D4', stroke: '#DB2777', strokeWidth: 1.5 }, // 左上
      { kind: 'circle', x: 70, y: 48, radius: 18, fill: '#F9A8D4', stroke: '#DB2777', strokeWidth: 1.5 }, // 右上
      { kind: 'circle', x: 34, y: 64, radius: 16, fill: '#F472B6', stroke: '#DB2777', strokeWidth: 1.5 }, // 左下
      { kind: 'circle', x: 66, y: 64, radius: 16, fill: '#F472B6', stroke: '#DB2777', strokeWidth: 1.5 }, // 右下
      // 花蕊
      { kind: 'circle', x: 50, y: 50, radius: 10, fill: '#FEF08A', stroke: '#CA8A04', strokeWidth: 1.5 },
    ]
  };
}

function cloudFactory(): FactoryOutput {
  return {
    name: '云',
    width: 180,
    height: 90,
    children: [
      { kind: 'circle', x: 50, y: 48, radius: 32, fill: '#F1F5F9', stroke: '#CBD5E1', strokeWidth: 2 },
      { kind: 'circle', x: 90, y: 34, radius: 38, fill: '#F8FAFC', stroke: '#CBD5E1', strokeWidth: 2 },
      { kind: 'circle', x: 130, y: 48, radius: 32, fill: '#F1F5F9', stroke: '#CBD5E1', strokeWidth: 2 },
      { kind: 'circle', x: 70, y: 54, radius: 28, fill: '#fff', stroke: 'none', strokeWidth: 0 },
      { kind: 'circle', x: 110, y: 54, radius: 28, fill: '#fff', stroke: 'none', strokeWidth: 0 },
      { kind: 'rect', x: 50, y: 56, width: 80, height: 24, fill: '#fff', stroke: 'none', strokeWidth: 0 },
    ]
  };
}

function sunFactory(): FactoryOutput {
  return {
    name: '太阳',
    width: 140,
    height: 140,
    children: [
      // 光线 — 8 条
      ...[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x = 70 + Math.cos(rad) * 48;
        const y = 70 + Math.sin(rad) * 48;
        return { kind: 'line' as const, x: 70, y: 70, points: [Math.cos(rad) * 28, Math.sin(rad) * 28, Math.cos(rad) * 56, Math.sin(rad) * 56], fill: 'none', stroke: '#FBBF24', strokeWidth: 4, opacity: 0.6 };
      }),
      // 太阳本体
      { kind: 'circle', x: 70, y: 70, radius: 36, fill: '#FBBF24', stroke: '#F59E0B', strokeWidth: 3 },
      // 高光
      { kind: 'circle', x: 58, y: 56, radius: 12, fill: '#FEF3C7', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
    ]
  };
}

function mountainFactory(): FactoryOutput {
  return {
    name: '山',
    width: 300,
    height: 180,
    children: [
      // 后山
      { kind: 'polygon', x: 150, y: 10, points: [-150, 150, 80, 130, 0, 0, -80, 130], fill: '#64748B', stroke: '#475569', strokeWidth: 2 },
      // 后山雪顶
      { kind: 'polygon', x: 150, y: 38, points: [-30, 0, 30, 0, 0, 30], fill: '#F1F5F9', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
      // 前山
      { kind: 'polygon', x: 150, y: 50, points: [-150, 110, 150, 110, 60, -20, -60, -20], fill: '#78716C', stroke: '#57534E', strokeWidth: 2 },
      // 前山雪顶
      { kind: 'polygon', x: 150, y: 55, points: [-25, 0, 25, 0, 0, 16], fill: '#E7E5E4', stroke: 'none', strokeWidth: 0, opacity: 0.4 },
      // 底部草地
      { kind: 'rect', x: 0, y: 150, width: 300, height: 12, fill: '#4ADE80', stroke: '#22C55E', strokeWidth: 1, opacity: 0.6 },
    ]
  };
}

function personFactory(): FactoryOutput {
  return {
    name: '人物',
    width: 80,
    height: 170,
    children: [
      // 头
      { kind: 'circle', x: 40, y: 18, radius: 18, fill: '#FED7AA', stroke: '#FBA574', strokeWidth: 2 },
      // 眼睛
      { kind: 'circle', x: 33, y: 16, radius: 3, fill: '#222', stroke: 'none', strokeWidth: 0 },
      { kind: 'circle', x: 47, y: 16, radius: 3, fill: '#222', stroke: 'none', strokeWidth: 0 },
      // 嘴
      { kind: 'path', x: 40, y: 26, pathData: 'M-5,0 Q0,5 5,0', fill: 'none', stroke: '#E8815A', strokeWidth: 1.5 },
      // 身体
      { kind: 'rect', x: 20, y: 40, width: 40, height: 56, fill: '#3B82F6', stroke: '#2563EB', strokeWidth: 2 },
      // 领口
      { kind: 'polygon', x: 40, y: 44, points: [-10, 0, 10, 0, 0, 10], fill: '#2563EB', stroke: 'none', strokeWidth: 0 },
      // 左臂
      { kind: 'rect', x: 6, y: 44, width: 16, height: 46, fill: '#3B82F6', stroke: '#2563EB', strokeWidth: 1.5 },
      // 右臂
      { kind: 'rect', x: 58, y: 44, width: 16, height: 46, fill: '#3B82F6', stroke: '#2563EB', strokeWidth: 1.5 },
      // 左腿
      { kind: 'rect', x: 24, y: 96, width: 16, height: 56, fill: '#1E293B', stroke: '#0F172A', strokeWidth: 2 },
      // 右腿
      { kind: 'rect', x: 40, y: 96, width: 16, height: 56, fill: '#1E293B', stroke: '#0F172A', strokeWidth: 2 },
      // 鞋
      { kind: 'rect', x: 20, y: 148, width: 20, height: 10, fill: '#111', stroke: '#000', strokeWidth: 1.5 },
      { kind: 'rect', x: 40, y: 148, width: 20, height: 10, fill: '#111', stroke: '#000', strokeWidth: 1.5 },
    ]
  };
}

function catFactory(): FactoryOutput {
  return {
    name: '猫',
    width: 120,
    height: 120,
    children: [
      // 尾巴
      { kind: 'path', x: 100, y: 70, pathData: 'M0,0 Q20,-30 30,-10 Q35,5 10,20', fill: 'none', stroke: '#F97316', strokeWidth: 8, opacity: 0.9 },
      // 身体
      { kind: 'ellipse', x: 60, y: 76, radiusX: 40, radiusY: 30, fill: '#F97316', stroke: '#EA580C', strokeWidth: 2 },
      // 头
      { kind: 'circle', x: 44, y: 34, radius: 26, fill: '#F97316', stroke: '#EA580C', strokeWidth: 2 },
      // 左耳
      { kind: 'polygon', x: 28, y: 18, points: [-14, 0, 4, 0, -6, -18], fill: '#F97316', stroke: '#EA580C', strokeWidth: 1.5 },
      { kind: 'polygon', x: 30, y: 22, points: [-8, 0, 0, 0, -5, -10], fill: '#FED7AA', stroke: 'none', strokeWidth: 0 },
      // 右耳
      { kind: 'polygon', x: 60, y: 18, points: [-4, 0, 14, 0, 6, -18], fill: '#F97316', stroke: '#EA580C', strokeWidth: 1.5 },
      { kind: 'polygon', x: 58, y: 22, points: [0, 0, 8, 0, 5, -10], fill: '#FED7AA', stroke: 'none', strokeWidth: 0 },
      // 眼睛
      { kind: 'ellipse', x: 34, y: 32, radiusX: 5, radiusY: 7, fill: '#22C55E', stroke: '#15803D', strokeWidth: 1 },
      { kind: 'ellipse', x: 56, y: 32, radiusX: 5, radiusY: 7, fill: '#22C55E', stroke: '#15803D', strokeWidth: 1 },
      { kind: 'ellipse', x: 34, y: 32, radiusX: 2, radiusY: 4, fill: '#111', stroke: 'none', strokeWidth: 0 },
      { kind: 'ellipse', x: 56, y: 32, radiusX: 2, radiusY: 4, fill: '#111', stroke: 'none', strokeWidth: 0 },
      // 鼻子
      { kind: 'polygon', x: 46, y: 40, points: [-4, 0, 4, 0, 0, 4], fill: '#F472B6', stroke: '#DB2777', strokeWidth: 1 },
      // 嘴
      { kind: 'path', x: 46, y: 44, pathData: 'M-6,0 Q-3,6 0,0 Q3,6 6,0', fill: 'none', stroke: '#EA580C', strokeWidth: 1.2 },
      // 前腿
      { kind: 'rect', x: 28, y: 86, width: 14, height: 24, fill: '#F97316', stroke: '#EA580C', strokeWidth: 1.5 },
      { kind: 'rect', x: 78, y: 86, width: 14, height: 24, fill: '#F97316', stroke: '#EA580C', strokeWidth: 1.5 },
      // 胡须
      { kind: 'line', x: 34, y: 42, points: [-16, 0, -6, 2], fill: 'none', stroke: '#FED7AA', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 34, y: 44, points: [-16, 0, -6, 0], fill: 'none', stroke: '#FED7AA', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 56, y: 42, points: [16, 0, 6, 2], fill: 'none', stroke: '#FED7AA', strokeWidth: 1, opacity: 0.6 },
      { kind: 'line', x: 56, y: 44, points: [16, 0, 6, 0], fill: 'none', stroke: '#FED7AA', strokeWidth: 1, opacity: 0.6 },
    ]
  };
}

function dogFactory(): FactoryOutput {
  return {
    name: '狗',
    width: 140,
    height: 130,
    children: [
      // 尾巴
      { kind: 'path', x: 120, y: 58, pathData: 'M0,0 Q16,-20 10,-36', fill: 'none', stroke: '#D97706', strokeWidth: 8, opacity: 0.9 },
      // 身体
      { kind: 'ellipse', x: 70, y: 80, radiusX: 50, radiusY: 34, fill: '#D97706', stroke: '#B45309', strokeWidth: 2 },
      // 身体浅色腹部
      { kind: 'ellipse', x: 60, y: 90, radiusX: 28, radiusY: 16, fill: '#FDE68A', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
      // 头
      { kind: 'circle', x: 28, y: 46, radius: 28, fill: '#D97706', stroke: '#B45309', strokeWidth: 2 },
      // 鼻口部
      { kind: 'ellipse', x: 10, y: 54, radiusX: 16, radiusY: 14, fill: '#FDE68A', stroke: '#D97706', strokeWidth: 1 },
      // 鼻子
      { kind: 'circle', x: 3, y: 48, radius: 5, fill: '#111', stroke: '#000', strokeWidth: 1 },
      // 眼睛
      { kind: 'circle', x: 22, y: 36, radius: 5, fill: '#fff', stroke: '#111', strokeWidth: 1.5 },
      { kind: 'circle', x: 23, y: 36, radius: 3, fill: '#111', stroke: 'none', strokeWidth: 0 },
      // 左耳（垂耳）
      { kind: 'ellipse', x: 46, y: 34, radiusX: 10, radiusY: 20, fill: '#B45309', stroke: '#92400E', strokeWidth: 1.5, rotation: 20 },
      // 嘴/舌头
      { kind: 'path', x: 8, y: 56, pathData: 'M-4,2 Q0,8 4,2', fill: '#EF4444', stroke: 'none', strokeWidth: 0, opacity: 0.6 },
      // 前腿
      { kind: 'rect', x: 36, y: 100, width: 16, height: 24, fill: '#D97706', stroke: '#B45309', strokeWidth: 1.5 },
      { kind: 'rect', x: 88, y: 100, width: 16, height: 24, fill: '#D97706', stroke: '#B45309', strokeWidth: 1.5 },
      // 斑点
      { kind: 'circle', x: 72, y: 68, radius: 8, fill: '#B45309', stroke: 'none', strokeWidth: 0, opacity: 0.4 },
      { kind: 'circle', x: 82, y: 84, radius: 6, fill: '#B45309', stroke: 'none', strokeWidth: 0, opacity: 0.4 },
    ]
  };
}

function snowmanFactory(): FactoryOutput {
  return {
    name: '雪人',
    width: 120,
    height: 170,
    children: [
      // 下球
      { kind: 'circle', x: 60, y: 120, radius: 44, fill: '#F8FAFC', stroke: '#CBD5E1', strokeWidth: 2 },
      // 中球
      { kind: 'circle', x: 60, y: 72, radius: 30, fill: '#F8FAFC', stroke: '#CBD5E1', strokeWidth: 2 },
      // 上球（头）
      { kind: 'circle', x: 60, y: 34, radius: 22, fill: '#F8FAFC', stroke: '#CBD5E1', strokeWidth: 2 },
      // 帽子
      { kind: 'rect', x: 44, y: 6, width: 32, height: 16, fill: '#1E293B', stroke: '#0F172A', strokeWidth: 1.5 },
      { kind: 'rect', x: 38, y: 20, width: 44, height: 6, fill: '#1E293B', stroke: '#0F172A', strokeWidth: 1 },
      // 眼睛
      { kind: 'circle', x: 52, y: 30, radius: 3, fill: '#111', stroke: 'none', strokeWidth: 0 },
      { kind: 'circle', x: 68, y: 30, radius: 3, fill: '#111', stroke: 'none', strokeWidth: 0 },
      // 胡萝卜鼻子
      { kind: 'polygon', x: 60, y: 36, points: [-3, -2, 3, -2, 0, 10], fill: '#F97316', stroke: '#EA580C', strokeWidth: 1 },
      // 纽扣
      { kind: 'circle', x: 60, y: 62, radius: 3, fill: '#1E293B', stroke: '#0F172A', strokeWidth: 1 },
      { kind: 'circle', x: 60, y: 76, radius: 3, fill: '#1E293B', stroke: '#0F172A', strokeWidth: 1 },
      // 围巾
      { kind: 'rect', x: 42, y: 48, width: 36, height: 8, fill: '#DC2626', stroke: '#991B1B', strokeWidth: 1 },
      { kind: 'rect', x: 36, y: 52, width: 8, height: 18, fill: '#DC2626', stroke: '#991B1B', strokeWidth: 1 },
      // 手臂（树枝）
      { kind: 'line', x: 30, y: 68, points: [-24, 0, 0, -10], fill: 'none', stroke: '#8B5A2B', strokeWidth: 4 },
      { kind: 'line', x: 90, y: 68, points: [24, 0, 0, -10], fill: 'none', stroke: '#8B5A2B', strokeWidth: 4 },
    ]
  };
}

function umbrellaFactory(): FactoryOutput {
  return {
    name: '伞',
    width: 140,
    height: 110,
    children: [
      // 伞面
      { kind: 'path', x: 70, y: 18, pathData: 'M-60,0 Q-30,-30 0,-38 Q30,-30 60,0 Z', fill: '#3B82F6', stroke: '#2563EB', strokeWidth: 2 },
      // 伞面弧顶高光
      { kind: 'path', x: 70, y: 22, pathData: 'M-30,0 Q-15,-14 0,-18 Q15,-14 30,0 Z', fill: '#60A5FA', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
      // 伞骨线
      { kind: 'line', x: 70, y: 18, points: [-50, 0, 0, -36], fill: 'none', stroke: '#2563EB', strokeWidth: 1, opacity: 0.5 },
      { kind: 'line', x: 70, y: 18, points: [0, -36, 50, 0], fill: 'none', stroke: '#2563EB', strokeWidth: 1, opacity: 0.5 },
      // 伞顶
      { kind: 'circle', x: 70, y: 2, radius: 4, fill: '#DB2777', stroke: '#991B1B', strokeWidth: 1.5 },
      // 伞柄
      { kind: 'line', x: 70, y: 18, points: [0, 0, 0, 80], fill: 'none', stroke: '#78716C', strokeWidth: 4 },
      // 伞柄弯钩
      { kind: 'path', x: 70, y: 98, pathData: 'M0,0 Q0,12 -14,12', fill: 'none', stroke: '#78716C', strokeWidth: 4 },
    ]
  };
}

// ═══════════════════════════════════════════
// 场景工厂函数
// ═══════════════════════════════════════════

function parkFactory(): { name: string; objects: FactoryOutput[] } {
  return {
    name: '公园',
    objects: [
      { name: '草地', width: 400, height: 80, children: [
        { kind: 'rect', x: 0, y: 10, width: 400, height: 60, fill: '#86EFAC', stroke: '#4ADE80', strokeWidth: 1.5, opacity: 0.7 },
        { kind: 'path', x: 0, y: 10, pathData: 'M0,0 Q50,-6 100,2 Q150,-4 200,0 Q250,-6 300,2 Q350,-4 400,0 L400,20 L0,20 Z', fill: '#4ADE80', stroke: 'none', strokeWidth: 0, opacity: 0.5 },
      ]},
      { name: '小路', width: 400, height: 40, children: [
        { kind: 'path', x: 50, y: 40, pathData: 'M0,0 Q50,-6 100,4 Q160,-2 220,6 Q300,-4 350,0', fill: 'none', stroke: '#D4A574', strokeWidth: 22, opacity: 0.6 },
      ]},
    ]
  };
}

function gardenFactory(): { name: string; objects: FactoryOutput[] } {
  return {
    name: '花园',
    objects: [
      { name: '草地', width: 400, height: 80, children: [
        { kind: 'rect', x: 0, y: 0, width: 400, height: 70, fill: '#86EFAC', stroke: '#4ADE80', strokeWidth: 1.5, opacity: 0.6 },
        { kind: 'rect', x: 0, y: 60, width: 400, height: 20, fill: '#6B4423', stroke: '#5C3A1A', strokeWidth: 1, opacity: 0.4 },
      ]},
      { name: '栅栏', width: 300, height: 60, children: [
        ...[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280].map((x) => ({
          kind: 'rect' as const, x: x + 10, y: 10, width: 6, height: 40, fill: '#D4A574', stroke: '#B8955C', strokeWidth: 1,
        })),
        { kind: 'rect', x: 0, y: 18, width: 300, height: 6, fill: '#C49564', stroke: '#B8955C', strokeWidth: 1 },
        { kind: 'rect', x: 0, y: 36, width: 300, height: 6, fill: '#C49564', stroke: '#B8955C', strokeWidth: 1 },
      ]},
    ]
  };
}

function villageFactory(): { name: string; objects: FactoryOutput[] } {
  return {
    name: '村庄',
    objects: [
      { name: '天空', width: 500, height: 80, children: [
        { kind: 'rect', x: 0, y: 0, width: 500, height: 80, fill: '#E0F2FE', stroke: 'none', strokeWidth: 0 },
        { kind: 'circle', x: 420, y: 30, radius: 24, fill: '#FEF08A', stroke: '#FACC15', strokeWidth: 1.5, opacity: 0.8 },
      ]},
      { name: '远山', width: 500, height: 100, children: [
        { kind: 'polygon', x: 250, y: 20, points: [-250, 80, 250, 80, 100, -20, -100, -20], fill: '#A8A29E', stroke: '#78716C', strokeWidth: 1.5, opacity: 0.6 },
      ]},
      { name: '草地', width: 500, height: 60, children: [
        { kind: 'rect', x: 0, y: 0, width: 500, height: 50, fill: '#86EFAC', stroke: '#4ADE80', strokeWidth: 1, opacity: 0.6 },
      ]},
      { name: '小路', width: 300, height: 40, children: [
        { kind: 'path', x: 100, y: 20, pathData: 'M0,0 Q40,-4 80,2 Q140,-2 200,0', fill: 'none', stroke: '#D4A574', strokeWidth: 16, opacity: 0.5 },
      ]},
    ]
  };
}

function cityFactory(): { name: string; objects: FactoryOutput[] } {
  return {
    name: '城市',
    objects: [
      { name: '天空', width: 500, height: 100, children: [
        { kind: 'rect', x: 0, y: 0, width: 500, height: 100, fill: '#DBEAFE', stroke: 'none', strokeWidth: 0 },
      ]},
      // 建筑群
      { name: '建筑1', width: 80, height: 160, children: [
        { kind: 'rect', x: 10, y: 20, width: 60, height: 140, fill: '#94A3B8', stroke: '#64748B', strokeWidth: 2 },
        ...[0, 1, 2, 3, 4].map((i) => ({
          kind: 'rect' as const, x: 18, y: 30 + i * 30, width: 18, height: 22, fill: '#DBEAFE', stroke: '#93C5FD', strokeWidth: 1,
        })),
        { kind: 'rect', x: 16, y: 10, width: 48, height: 14, fill: '#64748B', stroke: '#475569', strokeWidth: 1.5 },
      ]},
      { name: '建筑2', width: 60, height: 200, children: [
        { kind: 'rect', x: 10, y: 10, width: 40, height: 190, fill: '#78716C', stroke: '#57534E', strokeWidth: 2 },
        ...[0, 1, 2, 3, 4, 5].map((i) => ({
          kind: 'rect' as const, x: 16, y: 20 + i * 30, width: 14, height: 22, fill: '#DBEAFE', stroke: '#93C5FD', strokeWidth: 1,
        })),
        { kind: 'rect', x: 14, y: 2, width: 32, height: 12, fill: '#57534E', stroke: '#44403C', strokeWidth: 1.5 },
      ]},
      { name: '建筑3', width: 100, height: 130, children: [
        { kind: 'rect', x: 5, y: 30, width: 90, height: 100, fill: '#9CA3AF', stroke: '#6B7280', strokeWidth: 2 },
        { kind: 'rect', x: 12, y: 36, width: 40, height: 70, fill: '#BFDBFE', stroke: '#93C5FD', strokeWidth: 1 },
        { kind: 'rect', x: 56, y: 36, width: 32, height: 50, fill: '#BFDBFE', stroke: '#93C5FD', strokeWidth: 1 },
        { kind: 'rect', x: 10, y: 20, width: 80, height: 14, fill: '#6B7280', stroke: '#4B5563', strokeWidth: 1.5 },
      ]},
      { name: '地面', width: 500, height: 30, children: [
        { kind: 'rect', x: 0, y: 0, width: 500, height: 20, fill: '#6B7280', stroke: '#4B5563', strokeWidth: 1.5, opacity: 0.5 },
      ]},
    ]
  };
}

// ═══════════════════════════════════════════
// 查询与构建
// ═══════════════════════════════════════════

const OBJECT_FACTORIES: Record<string, () => FactoryOutput> = {
  tree: treeFactory,
  pine: pineTreeFactory,
  house: houseFactory,
  car: carFactory,
  robot: robotFactory,
  flower: flowerFactory,
  cloud: cloudFactory,
  sun: sunFactory,
  mountain: mountainFactory,
  person: personFactory,
  cat: catFactory,
  dog: dogFactory,
  snowman: snowmanFactory,
  umbrella: umbrellaFactory,
};

const SCENE_FACTORIES: Record<string, () => { name: string; objects: FactoryOutput[] }> = {
  park: parkFactory,
  garden: gardenFactory,
  village: villageFactory,
  city: cityFactory,
};

export const SUPPORTED_OBJECTS = Object.keys(OBJECT_FACTORIES);
export const SUPPORTED_SCENES = Object.keys(SCENE_FACTORIES);

/** 根据对象类型获取原生绘制数据 */
export function buildObject(objectKind: string): FactoryOutput | null {
  const factory = OBJECT_FACTORIES[objectKind];
  return factory ? factory() : null;
}

/** 根据场景类型获取场景对象列表 */
export function buildScene(sceneKind: string): FactoryOutput[] | null {
  const factory = SCENE_FACTORIES[sceneKind];
  return factory ? factory().objects : null;
}

/** 场景名称映射 */
export function getSceneName(sceneKind: string): string {
  const factory = SCENE_FACTORIES[sceneKind];
  return factory ? factory().name : sceneKind;
}

/** 将 FactoryOutput 转为 CanvasObject（用于直接插入画布） */
export function factoryOutputToCanvasObject(
  output: FactoryOutput,
  id: string,
  number: number,
  baseX: number,
  baseY: number
): CanvasObject {
  return {
    id,
    number,
    index: number,
    name: output.name,
    createdAt: Date.now(),
    shape: 'group',
    x: baseX - output.width / 2,
    y: baseY - output.height / 2,
    width: output.width,
    height: output.height,
    fill: 'transparent',
    stroke: '#111827',
    strokeWidth: 0,
    opacity: 1,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    objectKind: output.name,
    children: output.children,
  };
}
