'use client';

import { useState, createContext, useContext, useEffect } from 'react';

interface LogEntry {
  id: string;
  text: string;
  result: string;
  time: number;
}

const CommandLogContext = createContext<{
  logs: LogEntry[];
  addLog: (text: string, result: string) => void;
}>({ logs: [], addLog: () => {} });

export function useCommandLog() {
  return useContext(CommandLogContext);
}

// Simple module-level log storage
let commandLogs: LogEntry[] = [];
let listeners: (() => void)[] = [];

export function addCommandLog(text: string, result: string) {
  commandLogs = [{ id: Date.now().toString(), text, result, time: Date.now() }, ...commandLogs].slice(0, 50);
  listeners.forEach((l) => l());
  return result;
}

export default function CommandLogPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>(commandLogs);

  useEffect(() => {
    const fn = () => setLogs([...commandLogs]);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 text-xs bg-white border border-neutral-200 rounded px-3 py-1.5 text-neutral-500 hover:text-neutral-700"
      >
        历史 ({logs.length})
      </button>

      {open && (
        <div className="fixed inset-y-0 left-0 z-[100] w-80 bg-white border-r shadow-lg overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
            <h2 className="font-medium">指令历史</h2>
            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600">&times;</button>
          </div>
          <div className="p-2 space-y-1">
            {logs.length === 0 && <p className="text-xs text-neutral-400 p-2">还没有指令</p>}
            {logs.map((l) => (
              <div key={l.id} className="text-xs p-2 rounded bg-neutral-50">
                <div className="text-neutral-700">&ldquo;{l.text}&rdquo;</div>
                <div className="text-neutral-400 mt-0.5">{l.result}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
