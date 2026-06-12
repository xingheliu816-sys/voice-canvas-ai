import { Circle, Rect, Line, Text, RegularPolygon } from 'react-konva';
import type { CanvasObject } from '@/lib/canvas/types';

interface Props {
  obj: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ShapeRenderer({ obj, isSelected, onSelect }: Props) {
  const common = {
    x: obj.x,
    y: obj.y,
    rotation: obj.rotation,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    opacity: obj.opacity,
    stroke: isSelected ? '#3b82f6' : obj.stroke,
    strokeWidth: isSelected ? 2 : obj.strokeWidth,
    onClick: onSelect,
    onTap: onSelect
  };

  switch (obj.shape) {
    case 'circle':
      return <Circle {...common} radius={obj.width / 2} fill={obj.fill} />;
    case 'rect':
      return <Rect {...common} width={obj.width} height={obj.height} fill={obj.fill} />;
    case 'triangle':
      return <RegularPolygon {...common} sides={3} radius={obj.width / 2} fill={obj.fill} />;
    case 'line':
      return <Line {...common} points={[0, 0, obj.width, obj.height]} stroke={obj.fill} strokeWidth={2} />;
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
