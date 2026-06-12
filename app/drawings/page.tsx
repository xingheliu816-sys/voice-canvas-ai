'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchDrawings } from '@/lib/api/drawings-client';
import type { DrawingItem } from '@/lib/api/drawings-client';

export default function DrawingsPage() {
  const router = useRouter();
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrawings()
      .then(setDrawings)
      .catch(() => setError('加载失败，请确认已登录'))
      .finally(() => setLoading(false));
  }, []);

  async function handleOpen(d: DrawingItem) {
    try {
      const res = await fetch(`/api/drawings/${d.id}`);
      const detail = await res.json();
      if (detail.canvas_json) {
        // 存到 sessionStorage，让编辑器读取
        sessionStorage.setItem('load_drawing', JSON.stringify(detail));
        router.push('/');
      }
    } catch {
      setError('打开失败');
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">我的作品</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">返回画布</Link>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-neutral-400">加载中…</p>
      ) : drawings.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-lg mb-2">还没有作品</p>
          <p className="text-sm">回到画布，用语音说"保存为作品名称"来创建第一幅作品</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {drawings.map((d) => (
            <div
              key={d.id}
              onClick={() => handleOpen(d)}
              className="cursor-pointer rounded-lg border border-neutral-200 bg-white p-3 hover:border-blue-400 hover:shadow transition-all"
            >
              <div className="aspect-square bg-neutral-50 rounded mb-2 overflow-hidden flex items-center justify-center">
                {d.thumbnail_url ? (
                  <img
                    src={d.thumbnail_url}
                    alt={d.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-neutral-300 text-xs">无缩略图</span>
                )}
              </div>
              <p className="text-sm font-medium truncate">{d.title}</p>
              <p className="text-xs text-neutral-400 mt-1">
                {new Date(d.updated_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
