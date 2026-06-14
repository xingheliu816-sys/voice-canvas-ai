import { create } from 'zustand';

export type VoiceStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'executing'
  | 'confirming'
  | 'paused'
  | 'error';

interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  finalText: string;
  error: string | null;
  browserSupported: boolean;
  /** 是否允许自动重启监听（用户主动暂停时置 false） */
  autoRestart: boolean;
  /** 画布上方短暂提示文字，例如"已作图" */
  topMessage: string;

  setStatus: (s: VoiceStatus) => void;
  setTranscript: (t: string) => void;
  setFinalText: (t: string) => void;
  /** 设置错误：不再把 status 锁到 error，让 MicController 自动重启 */
  setError: (e: string | null) => void;
  setBrowserSupported: (b: boolean) => void;
  setAutoRestart: (v: boolean) => void;
  setTopMessage: (msg: string) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  transcript: '',
  finalText: '',
  error: null,
  autoRestart: true,
  topMessage: '',
  browserSupported: true,

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setFinalText: (finalText) => set({ finalText, transcript: finalText }),
  setError: (error) => set({ error }),
  setBrowserSupported: (browserSupported) => set({ browserSupported }),
  setAutoRestart: (autoRestart) => set({ autoRestart }),
  setTopMessage: (topMessage) => set({ topMessage }),
  reset: () => set({ status: 'idle', transcript: '', finalText: '', error: null, topMessage: '' })
}));
