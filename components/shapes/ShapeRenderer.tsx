import { useCallback } from 'react';
import { Circle, Rect, Line, Text, RegularPolygon } from 'react-konva';
import type { CanvasObject } from '@/lib/canvas/types';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';

interface Props {
  obj: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ShapeRenderer({ obj, isSelected, onSelect }: Props) {
  const onDragEnd = useCallback(
    (e: { target: { x: () => number; y: () => number } }) => {
      useCanvasStore.getState().updateObject(obj.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    [obj.id],
  );

  const common = {
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    opacity: obj.opacity,
    stroke: isSelected ? '#3b82f6' : obj.stroke,
    strokeWidth: isSelected ? 2 : obj.strokeWidth,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd,
  };

  switch (obj.shape) {
    case 'circle':
      return <Circle {...common} radius={obj.width / 2} fill={obj.fill} />;
    case 'rect':
      return <Rect {...common} width={obj.width} height={obj.height} fill={obj.fill} />;
    case 'triangle':
      return <RegularPolygon {...common} sides={3} radius={obj.width / 2} fill={obj.fill} />;
    case 'line':
      return <Line {...common} points={[0, 0, obj.width, obj.height]} stroke={obj.stroke} strokeWidth={obj.strokeWidth} />;
    case 'text':
      return (
        <Text
          {...common}
          text={obj.text}
          fontSize={obj.fontSize || 24}
          fill={obj.fill}
          stroke={isSelected ? '#3b82f6' : ''}
        />
      );
    default:
      return null;
  }
}
