'use client';

import { useCanvasStore } from '@/lib/canvas/ObjectStore';

export default function CanvasTabs() {
  const canvases = useCanvasStore((s) => s.canvases);
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId);
  const switchCanvas = useCanvasStore((s) => s.switchCanvas);
  const createCanvas = useCanvasStore((s) => s.createCanvas);
  const deleteCanvas = useCanvasStore((s) => s.deleteCanvas);

  function handleDelete() {
    if (canvases.length <= 1) {
      window.alert('至少需要保留一个画布');
      return;
    }
    if (!window.confirm('删除当前画布会清除其中所有图形，确认删除吗？')) return;
    deleteCanvas('current');
  }

  return (
    <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
      <div className="flex items-center gap-1.5 rounded-lg bg-surface-elevated/70 p-1 ring-1 ring-white/[0.06]">
        {canvases.map((canvas) => {
          const active = canvas.id === activeCanvasId;
          return (
            <button
              key={canvas.id}
              type="button"
              onClick={() => switchCanvas({ id: canvas.id })}
              className={`h-8 max-w-40 truncate rounded-md px-3 text-xs font-medium transition-colors ${
                active
                  ? 'bg-warm-light text-surface-deep'
                  : 'text-warm-muted hover:bg-white/[0.06] hover:text-warm-light'
              }`}
              title={canvas.name}
            >
              {canvas.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => createCanvas()}
          className="flex h-8 w-8 items-center justify-center rounded-md text-warm-muted transition-colors hover:bg-white/[0.06] hover:text-warm-light"
          title="新建画布"
          aria-label="新建画布"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated/60 text-warm-muted ring-1 ring-white/[0.06] transition-colors hover:text-red-400"
        title="删除当前画布"
        aria-label="删除当前画布"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4h8v2M9 10v8M15 10v8M5 6l1 14h12l1-14" />
        </svg>
      </button>
    </div>
  );
}
