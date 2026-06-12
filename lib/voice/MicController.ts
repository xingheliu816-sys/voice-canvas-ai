import { createSpeechRecognizer, isBrowserSupported } from './SpeechRecognizer';
import type { SpeechCallbacks } from './SpeechRecognizer';

export type MicState = 'idle' | 'listening' | 'processing';

export class MicController {
  private recognition: SpeechRecognition | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private state: MicState = 'idle';
  private callbacks: SpeechCallbacks;
  private silenceMs: number;

  constructor(callbacks: SpeechCallbacks, silenceMs = 800) {
    this.callbacks = callbacks;
    this.silenceMs = silenceMs;
  }

  async start() {
    if (!isBrowserSupported()) {
      this.callbacks.onError('浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.callbacks.onError('麦克风权限被拒绝，请在浏览器设置中开启麦克风权限');
      return;
    }

    this.recognition = createSpeechRecognizer();
    if (!this.recognition) return;

    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i]![0]!.transcript;
        if (e.results[i]!.isFinal) final += t;
        else interim += t;
      }
      if (interim) {
        this.callbacks.onInterim(interim);
        this.resetSilence();
      }
      if (final) {
        this.callbacks.onFinal(final);
        this.state = 'processing';
      }
    };

    this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this.callbacks.onError(`识别错误：${e.error}`);
    };

    this.recognition.onend = () => {
      if (this.state === 'listening') {
        this.callbacks.onEnd();
      }
      this.state = 'idle';
    };

    this.state = 'listening';
    this.recognition.start();
    this.resetSilence();
  }

  private resetSilence() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.state === 'listening' && this.recognition) {
        this.recognition.stop();
      }
    }, this.silenceMs);
  }

  stop() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this.state = 'idle';
  }

  getState(): MicState {
    return this.state;
  }
}
