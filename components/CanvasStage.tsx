'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import { setStageGetter } from '@/lib/canvas/CommandExecutor';
import ShapeRenderer from './shapes/ShapeRenderer';

export default function CanvasStage() {
  const objects = useCanvasStore((s) => s.objects);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const stageRef = useRef<Konva.Stage>(null);

  const [dims, setDims] = useState({ w: 800, h: 500 });

  useEffect(() => {
    setStageGetter(() => stageRef.current);
  }, []);

  useEffect(() => {
    function resize() {
      setDims({ w: window.innerWidth, h: window.innerHeight - 40 });
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <Stage ref={stageRef} width={dims.w} height={dims.h} className="bg-white">
      <Layer>
        {objects.map((obj) => (
          <ShapeRenderer
            key={obj.id}
            obj={obj}
            isSelected={obj.id === selectedId}
            onSelect={() => selectObject(obj.id)}
          />
        ))}
      </Layer>
    </Stage>
  );
}
