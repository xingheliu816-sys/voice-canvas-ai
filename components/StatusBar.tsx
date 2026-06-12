'use client';

interface StatusBarProps {
  text?: string;
  status?: 'idle' | 'listening' | 'processing' | 'error';
}

export default function StatusBar({ text, status = 'idle' }: StatusBarProps) {
  const colors: Record<string, string> = {
    idle: 'bg-neutral-100 border-neutral-200',
    listening: 'bg-blue-50 border-blue-200',
    processing: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200'
  };

  const statusText: Record<string, string> = {
    idle: '等待语音输入',
    listening: '正在听…',
    processing: '处理中…',
    error: '出错'
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 border-t px-4 py-2 text-sm ${colors[status]}`}>
      <span className="text-neutral-500 mr-2">
        {status === 'listening' && '🎤'}
        {status === 'processing' && '⏳'}
        {status === 'error' && '⚠️'}
        {status === 'idle' && '⏸'}
      </span>
      {text || statusText[status]}
    </div>
  );
}
