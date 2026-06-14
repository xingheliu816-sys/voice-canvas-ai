'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '登录失败');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-deep p-4">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-accent-secondary/5 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-sm relative animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-warm-light tracking-tight">
            Voice Canvas
          </h1>
          <p className="text-warm-muted text-sm mt-1.5">用声音创作，释放想象力</p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="text-xs text-red-400 bg-red-400/5 border border-red-400/15 rounded-lg px-3 py-2.5 animate-slide-up">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-warm-muted uppercase tracking-wider">用户名</span>
            <input
              className="input-dark mt-1.5"
              placeholder="输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-warm-muted uppercase tracking-wider">密码</span>
            <input
              type="password"
              className="input-dark mt-1.5"
              placeholder="输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeLinecap="round" />
                </svg>
                登录中…
              </span>
            ) : (
              '登录'
            )}
          </button>

          <p className="text-center text-xs text-warm-muted pt-1">
            没有账号？
            <Link href="/register" className="text-accent-secondary hover:underline ml-1 font-medium">
              注册
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
