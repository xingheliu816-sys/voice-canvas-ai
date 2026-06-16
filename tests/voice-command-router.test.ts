import { describe, expect, it, vi } from 'vitest';
import {
  convertToolCallsToCommands,
  processVoiceCommand,
  type GLMToolCall
} from '@/lib/nlu/VoiceCommandRouter';

describe('VoiceCommandRouter', () => {
  it('uses the local parser for high-confidence commands', async () => {
    const llm = vi.fn();

    const result = await processVoiceCommand(
      { text: '画一个红色的圆' },
      { callGLM: llm }
    );

    expect(result.source).toBe('local');
    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]?.type).toBe('CREATE');
    expect(llm).not.toHaveBeenCalled();
  });

  it('forces GLM when the user explicitly asks for AI help', async () => {
    const llm = vi.fn().mockResolvedValue([
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'draw_shape',
          arguments: JSON.stringify({ shape: 'circle', color: '#87CEEB' })
        }
      }
    ]);

    const result = await processVoiceCommand(
      { text: 'AI 帮我画一个天空色圆形' },
      { callGLM: llm }
    );

    expect(result.source).toBe('llm');
    expect(result.ops[0]?.type).toBe('CREATE');
    if (result.ops[0]?.type === 'CREATE') {
      expect(result.ops[0].fill).toBe('#87CEEB');
    }
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it('falls back to fuzzy offline parsing when GLM fails', async () => {
    const llm = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await processVoiceCommand(
      { text: '帮我弄一个天空色的圈圈' },
      { callGLM: llm }
    );

    expect(result.source).toBe('fallback');
    expect(result.warning).toContain('network down');
    expect(result.ops[0]?.type).toBe('CREATE');
    if (result.ops[0]?.type === 'CREATE') {
      expect(result.ops[0].shape).toBe('circle');
    }
  });

  it('converts multiple GLM tool calls to canvas commands', () => {
    const toolCalls: GLMToolCall[] = [
      {
        id: 'call_1',
        type: 'function',
        function: {
          name: 'draw_shape',
          arguments: JSON.stringify({ shape: 'circle', color: 'red', x: 100, y: 120, size: 40 })
        }
      },
      {
        id: 'call_2',
        type: 'function',
        function: {
          name: 'undo',
          arguments: '{}'
        }
      }
    ];

    const commands = convertToolCallsToCommands(toolCalls);

    expect(commands).toHaveLength(2);
    expect(commands[0]?.type).toBe('CREATE');
    expect(commands[1]?.type).toBe('UNDO');
  });
});
