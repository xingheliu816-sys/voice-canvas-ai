'use client';

import { useState, useCallback } from 'react';
import { saveDrawing, updateDrawing } from '@/lib/api/drawings-client';
import { getProjectSnapshot } from '@/lib/canvas/ObjectStore';
import { getCurrentDrawingId, setCurrentDrawingId } from '@/lib/nlu/Pipeline';

export default function SaveButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 2500);
  }, []);

  const handleSave = useCallback(async () => {
    const currentId = getCurrentDrawingId();
    if (currentId) {
      setSaving(true);
      try {
        const canvasJson = JSON.stringify(getProjectSnapshot());
        await updateDrawing(currentId, { canvasJson });
        setCurrentDrawingId(currentId);
        showMessage('已保存');
      } catch {
        showMessage('保存失败，请确认已登录', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }
    // No current drawing → show naming dialog
    setShowDialog(true);
    setName('');
  }, [showMessage]);

  const handleSaveAs = useCallback(async () => {
    const title = name.trim();
    if (!title) {
      showMessage('请输入作品名称', 'error');
      return;
    }
    setSaving(true);
    try {
      const item = await saveDrawing(title);
      setCurrentDrawingId(item.id);
      setShowDialog(false);
      showMessage(`已保存：${item.title}`);
    } catch {
      showMessage('保存失败，请确认已登录', 'error');
    } finally {
      setSaving(false);
    }
  }, [name, showMessage]);

  return (
    <>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          bg-accent-primary/10 text-accent-primary border border-accent-primary/20
          hover:bg-accent-primary/20 hover:border-accent-primary/30
          transition-all duration-200 disabled:opacity-50"
        title="保存作品"
      >
        {saving ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        )}
        <span>{saving ? '保存中…' : '保存作品'}</span>
      </button>

      {/* Message toast */}
      {message && (
        <div className={`fixed top-14 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full text-xs font-medium shadow-lg animate-fade-in ${
          messageType === 'success'
            ? 'bg-accent-emerald/90 text-white'
            : 'bg-red-500/90 text-white'
        }`}>
          {message}
        </div>
      )}

      {/* Naming dialog */}
      {showDialog && (
        <>
          <div
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowDialog(false)}
          />
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-light rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/10">
              <h3 className="font-display font-semibold text-warm-light mb-1">保存作品</h3>
              <p className="text-[11px] text-warm-muted mb-4">请输入作品名称</p>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAs(); }}
                placeholder="例如：我的第一幅画"
                className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-white/10 text-sm text-warm-light placeholder:text-warm-dark focus:outline-none focus:border-accent-primary/50 transition-colors mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium text-warm-muted hover:text-warm-light transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAs}
                  disabled={saving || !name.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-40 transition-all"
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
