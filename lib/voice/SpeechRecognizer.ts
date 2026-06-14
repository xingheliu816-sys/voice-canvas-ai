const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => Promise<boolean>;
  onError: (error: string) => void;
  onEnd: () => void;
}

export function createSpeechRecognizer(lang = 'zh-CN') {
  if (!SpeechRecognitionAPI) return null;
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;
  return recognition;
}

export function isBrowserSupported(): boolean {
  return !!SpeechRecognitionAPI;
}
