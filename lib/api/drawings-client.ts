import { getProjectSnapshot } from '@/lib/canvas/ObjectStore';
import type { CanvasObject } from '@/lib/canvas/types';

export interface DrawingItem {
  id: string;
  title: string;
  thumbnail_url: string;
  created_at: number;
  updated_at: number;
}

export interface DrawingDetail extends DrawingItem {
  canvas_json: string;
}

export async function fetchDrawings(): Promise<DrawingItem[]> {
  const res = await fetch('/api/drawings');
  if (!res.ok) throw new Error('获取作品列表失败');
  return res.json();
}

export async function fetchDrawing(id: string): Promise<DrawingDetail> {
  const res = await fetch(`/api/drawings/${id}`);
  if (!res.ok) throw new Error('作品不存在');
  return res.json();
}

export async function saveDrawing(title: string): Promise<DrawingItem> {
  const canvasJson = JSON.stringify(getProjectSnapshot(title));
  const thumbnailBase64 = await generateThumbnail();
  const res = await fetch('/api/drawings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, canvasJson, thumbnailBase64 })
  });
  if (!res.ok) throw new Error('保存失败');
  return res.json();
}

export async function updateDrawing(id: string, data: { title?: string; canvasJson?: string; thumbnailBase64?: string }) {
  const res = await fetch(`/api/drawings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('更新失败');
  return res.json();
}

export async function deleteDrawing(id: string) {
  const res = await fetch(`/api/drawings/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除失败');
  return res.json();
}

function generateThumbnail(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) { resolve(''); return; }
    resolve(canvas.toDataURL('image/png'));
  });
}
