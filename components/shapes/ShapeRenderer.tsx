import { useCallback, useState, useEffect } from 'react';
import { Circle, Rect, Line, Text, RegularPolygon, Group, Path, Ellipse, Image as KonvaImage } from 'react-konva';
import type { CanvasObject } from '@/lib/canvas/types';
import type { DrawablePrimitive } from '@/lib/canvas/ObjectFactory';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';

interface Props {
  obj: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
}

function useKonvaImage(src: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    setError(false);
    const image = new window.Image();
    // Only set crossOrigin for cross-origin URLs; same-origin loads work without it
    // and adding crossOrigin would require the server to send CORS headers.
    if (/^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => setImg(image);
    image.onerror = () => setError(true);
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return { img, error };
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

  if (obj.shape === 'image') {
    return <ImageRenderer obj={obj} isSelected={isSelected} onSelect={onSelect} onDragEnd={onDragEnd} />;
  }

  if (obj.shape === 'group') {
    return <GroupRenderer obj={obj} isSelected={isSelected} onSelect={onSelect} onDragEnd={onDragEnd} />;
  }

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

function ImageRenderer({
  obj,
  isSelected,
  onSelect,
  onDragEnd,
}: {
  obj: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: { target: { x: () => number; y: () => number } }) => void;
}) {
  const { img, error } = useKonvaImage(obj.imageSrc);

  if (error || !img) {
    // Placeholder while loading or on error
    return (
      <Rect
        x={obj.x}
        y={obj.y}
        width={obj.width}
        height={obj.height}
        fill="#1a1a2e"
        stroke={isSelected ? '#3b82f6' : '#333'}
        strokeWidth={isSelected ? 2 : 1}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        rotation={obj.rotation}
        scaleX={obj.scaleX}
        scaleY={obj.scaleY}
        opacity={obj.opacity}
      />
    );
  }

  return (
    <KonvaImage
      image={img}
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      scaleX={obj.scaleX}
      scaleY={obj.scaleY}
      opacity={obj.opacity}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      stroke={isSelected ? '#3b82f6' : undefined}
      strokeWidth={isSelected ? 2 : 0}
    />
  );
}

/** 将单个 DrawablePrimitive 渲染为对应的 Konva 元素 */
function renderPrimitive(p: DrawablePrimitive, key: string | number) {
  const common = {
    key,
    x: p.x,
    y: p.y,
    fill: p.fill,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth ?? 0,
    opacity: p.opacity ?? 1,
    rotation: p.rotation ?? 0,
  };

  switch (p.kind) {
    case 'rect':
      return <Rect {...common} width={p.width ?? 10} height={p.height ?? 10} />;
    case 'circle':
      return <Circle {...common} radius={p.radius ?? 10} />;
    case 'ellipse':
      return <Ellipse {...common} radiusX={p.radiusX ?? 10} radiusY={p.radiusY ?? 10} />;
    case 'line':
      return <Line {...common} points={p.points ?? [0, 0, 10, 10]} tension={0} closed={false} />;
    case 'polygon':
      return <Line {...common} points={p.points ?? [0, 0, 10, 0, 5, 10]} tension={0} closed={true} />;
    case 'path':
      return <Path {...common} data={p.pathData ?? ''} />;
    case 'tri':
      return <RegularPolygon {...common} sides={3} radius={p.radius ?? 10} />;
    case 'text':
      return <Text {...common} text={p.text ?? ''} fontSize={p.fontSize ?? 14} />;
    default:
      return null;
  }
}

function GroupRenderer({
  obj,
  isSelected,
  onSelect,
  onDragEnd,
}: {
  obj: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: { target: { x: () => number; y: () => number } }) => void;
}) {
  const children = obj.children;
  if (!children || children.length === 0) return null;

  return (
    <Group
      x={obj.x}
      y={obj.y}
      width={obj.width}
      height={obj.height}
      rotation={obj.rotation}
      scaleX={obj.scaleX}
      scaleY={obj.scaleY}
      opacity={obj.opacity}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
    >
      {/* 选中框 */}
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={obj.width + 8}
          height={obj.height + 8}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[4, 3]}
          listening={false}
        />
      )}
      {children.map((child, i) => renderPrimitive(child, i))}
    </Group>
  );
}
