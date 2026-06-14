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
  /** 是否允许自动重启监听（暂停时置 false） */
  autoRestart: boolean;

  setStatus: (s: VoiceStatus) => void;
  setTranscript: (t: string) => void;
  setFinalText: (t: string) => void;
  setError: (e: string | null) => void;
  setBrowserSupported: (b: boolean) => void;
  setAutoRestart: (v: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  transcript: '',
  finalText: '',
  error: null,
  autoRestart: true,
  // 初始 true 避免 SSR hydration 不匹配，客户端 mount 后通过 useEffect 更新真实值
  browserSupported: true,

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setFinalText: (finalText) => set({ finalText, transcript: finalText }),
  setError: (error) => set({ error, status: 'error', autoRestart: false }),
  setBrowserSupported: (browserSupported) => set({ browserSupported }),
  setAutoRestart: (autoRestart) => set({ autoRestart }),
  reset: () =>
    set({ status: 'idle', transcript: '', finalText: '', error: null }),
}));
