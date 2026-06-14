import { create } from 'zustand';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error';

interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  finalText: string;
  error: string | null;
  browserSupported: boolean;

  setStatus: (s: VoiceStatus) => void;
  setTranscript: (t: string) => void;
  setFinalText: (t: string) => void;
  setError: (e: string | null) => void;
  setBrowserSupported: (b: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  transcript: '',
  finalText: '',
  error: null,
  browserSupported:
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setFinalText: (finalText) => set({ finalText, transcript: finalText }),
  setError: (error) => set({ error, status: 'error' }),
  setBrowserSupported: (browserSupported) => set({ browserSupported }),
  reset: () => set({ status: 'idle', transcript: '', finalText: '', error: null })
}));
