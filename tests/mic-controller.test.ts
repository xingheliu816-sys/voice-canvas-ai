import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeRecognition {
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  stop = vi.fn();
  abort = vi.fn();
  start = vi.fn(() => {
    this.onstart?.();
  });
}

let recognizer: FakeRecognition | null = null;

vi.mock('@/lib/voice/SpeechRecognizer', () => ({
  createSpeechRecognizer: vi.fn(() => {
    recognizer = new FakeRecognition();
    return recognizer;
  }),
  isBrowserSupported: vi.fn(() => true)
}));

describe('MicController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    recognizer = null;
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({})
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not stop recognition before the first speech result arrives', async () => {
    const { MicController } = await import('@/lib/voice/MicController');
    const controller = new MicController(
      {
        onInterim: vi.fn(),
        onFinal: vi.fn().mockResolvedValue(false),
        onError: vi.fn(),
        onEnd: vi.fn()
      },
      { silenceMs: 600, debug: false }
    );

    await controller.start();
    vi.advanceTimersByTime(700);

    expect(recognizer?.stop).not.toHaveBeenCalled();
  });

  it('stops recognition after silence once a speech result has arrived', async () => {
    const { MicController } = await import('@/lib/voice/MicController');
    const controller = new MicController(
      {
        onInterim: vi.fn(),
        onFinal: vi.fn().mockResolvedValue(false),
        onError: vi.fn(),
        onEnd: vi.fn()
      },
      { silenceMs: 600, debug: false }
    );

    await controller.start();
    recognizer?.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: '画一个红色圆形' }
        }
      ]
    } as unknown as SpeechRecognitionEvent);
    vi.advanceTimersByTime(700);

    expect(recognizer?.stop).toHaveBeenCalledTimes(1);
  });
});
