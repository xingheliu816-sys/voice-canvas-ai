import { createSpeechRecognizer, isBrowserSupported } from './SpeechRecognizer';
import type { SpeechCallbacks } from './SpeechRecognizer';

export interface MicOptions {
  /** 静音多少 ms 后自动结束本轮识别，默认 600 */
  silenceMs?: number;
  /** 单条指令最长时长 ms，默认 15000 */
  maxDurationMs?: number;
  /** 执行完毕后多少 ms 后自动重启监听，默认 150 */
  autoRestartMs?: number;
  /** 是否打印诊断日志，默认 true（dev 阶段） */
  debug?: boolean;
}

const SILENCE_END_MS = 1200;
const STATUS_MESSAGE_DURATION_MS = 1000;

export class MicController {
  private recognition: SpeechRecognition | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: SpeechCallbacks;
  private silenceMs: number;
  private maxDurationMs: number;
  private autoRestartMs: number;
  private debug: boolean;
  private _paused = false;
  private _active = false;
  private _running = false;
  /** 单轮识别的累计 final 文本 */
  private currentFinalText = '';
  /** 最后一次 interim 文本，用于 final 为空时的兜底 */
  private lastInterimText = '';

  constructor(callbacks: SpeechCallbacks, options: MicOptions = {}) {
    this.callbacks = callbacks;
    this.silenceMs = options.silenceMs ?? SILENCE_END_MS;
    this.maxDurationMs = options.maxDurationMs ?? 15000;
    this.autoRestartMs = options.autoRestartMs ?? 150;
    this.debug = options.debug ?? true;
  }

  private log(...args: unknown[]) {
    if (this.debug) console.log('[Voice]', ...args);
  }

  get paused() { return this._paused; }
  get active() { return this._active; }

  async start() {
    if (this._paused) {
      this.log('start() skipped: paused');
      return;
    }
    if (this._active) {
      this.log('start() skipped: already active');
      return;
    }
    if (this._running) {
      this.log('start() skipped: recognition running');
      return;
    }
    if (!isBrowserSupported()) {
      this.callbacks.onError('浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }

    // 取消正在播放的 TTS，避免 TTS 声音被麦克风捕获造成反馈环
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      this.log('getUserMedia failed', err);
      this.callbacks.onError('麦克风权限被拒绝，请在浏览器设置中开启麦克风权限');
      return;
    }

    this.recognition = createSpeechRecognizer();
    if (!this.recognition) {
      this.callbacks.onError('无法创建语音识别器');
      return;
    }

    // 重置每轮缓冲
    this.currentFinalText = '';
    this.lastInterimText = '';

    (this.recognition as any).onstart = () => {
      this.log('recognition.onstart — listening');
    };

    this.recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]!;
        const t = result[0]!.transcript;
        if (result.isFinal) {
          this.currentFinalText += t;
          this.log('final fragment:', JSON.stringify(t));
        } else {
          interim += t;
        }
      }
      // 任何识别结果都重置静音计时
      this.resetSilence();
      if (interim) {
        this.lastInterimText = interim;
        this.callbacks.onInterim(interim);
      }
    };

    this.recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      this.log('onerror:', e.error, (e as any).message);
      // aborted 是 stop()/abort() 主动触发，忽略
      if (e.error === 'aborted') return;
      // no-speech：没有检测到声音，静默等待自动重启，不提示
      if (e.error === 'no-speech') {
        return;
      }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this._paused = true; // 硬错误，阻止自动重启
        this.callbacks.onError('麦克风权限未开启，请在浏览器中允许麦克风');
        return;
      }
      if (e.error === 'audio-capture') {
        this._paused = true; // 硬错误，阻止自动重启
        this.callbacks.onError('未检测到可用麦克风');
        return;
      }
      if (e.error === 'network') {
        // 网络错误：短暂提示但不锁死，让 onend 自动重启
        this.callbacks.onInterim('语音识别网络异常，正在重试');
        return;
      }
      // 其他未知错误
      this.callbacks.onError(`语音识别异常（${e.error}），正在重试`);
    };

    this.recognition.onend = async () => {
      this.log('recognition.onend — finalText:', JSON.stringify(this.currentFinalText), 'lastInterim:', JSON.stringify(this.lastInterimText));
      this._active = false;
      this._running = false;
      this.clearTimers();

      // final 文本优先，空则用最后一次 interim 兜底
      const finalText = this.currentFinalText.trim() || this.lastInterimText.trim();
      this.currentFinalText = '';
      this.lastInterimText = '';

      if (finalText) {
        this.log('-> calling onFinal with:', JSON.stringify(finalText));
        const shouldRestart = await this.callbacks.onFinal(finalText);
        this.log('-> onFinal returned shouldRestart=', shouldRestart);
        if (shouldRestart && !this._paused) {
          this.scheduleRestart();
        }
      } else {
        // 完全无识别结果：静默自动重启，不提示错误
        this.log('-> no speech detected, silent auto-restart');
        if (!this._paused) {
          this.scheduleRestart();
        }
      }
      this.callbacks.onEnd();
    };

    this._active = true;
    this._running = true;
    try {
      this.recognition.start();
      this.log('recognition.start() called');
    } catch (err) {
      this.log('recognition.start() threw', err);
      this._active = false;
      this._running = false;
      this.callbacks.onError(`启动识别失败：${(err as Error).message}`);
      return;
    }
    this.startMaxDuration();
  }

  private resetSilence() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.log('silence timeout fired → stop()');
      if (this.recognition) {
        try { this.recognition.stop(); } catch { /* ignore */ }
      }
    }, this.silenceMs);
  }

  private startMaxDuration() {
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    this.maxDurationTimer = setTimeout(() => {
      this.log('max duration reached → stop()');
      if (this.recognition) {
        try { this.recognition.stop(); } catch { /* ignore */ }
      }
    }, this.maxDurationMs);
  }

  private scheduleRestart() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.log(`scheduling restart in ${this.autoRestartMs}ms`);
    this.restartTimer = setTimeout(() => {
      if (!this._paused && !this._active) {
        this.start();
      }
    }, this.autoRestartMs);
  }

  private clearTimers() {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.maxDurationTimer) { clearTimeout(this.maxDurationTimer); this.maxDurationTimer = null; }
  }

  /** 暂停语音监听（保留恢复能力） */
  pause() {
    this.log('pause()');
    this._paused = true;
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    if (this.recognition) {
      try { this.recognition.abort(); } catch { /* ignore */ }
      this.recognition = null;
    }
    this.clearTimers();
    this._active = false;
    this._running = false;
  }

  /** 从暂停恢复 */
  resume() {
    this.log('resume()');
    this._paused = false;
    this.start();
  }

  /** 完全停止，不再自动重启 */
  stop() {
    this.log('stop()');
    this._paused = true;
    if (this.restartTimer) { clearTimeout(this.restartTimer); this.restartTimer = null; }
    if (this.recognition) {
      try { this.recognition.abort(); } catch { /* ignore */ }
      this.recognition = null;
    }
    this.clearTimers();
    this._active = false;
    this._running = false;
  }
}
