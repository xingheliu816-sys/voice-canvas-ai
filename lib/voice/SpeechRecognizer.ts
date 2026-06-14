const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export interface SpeechCallbacks {
  onInterim: (text: string) => void;
  /** 返回 true 表示处理完毕后自动重启监听 */
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
  recognition.maxAlternatives = 1;
  return recognition;
}

export function isBrowserSupported(): boolean {
  return !!SpeechRecognitionAPI;
}
