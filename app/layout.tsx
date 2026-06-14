import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'voice-canvas-ai',
  description: '纯语音控制的绘图工具'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
