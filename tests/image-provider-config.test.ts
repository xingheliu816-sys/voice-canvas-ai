import { describe, expect, it } from 'vitest';
import {
  buildImageGenerationBody,
  resolveImageGenerationEndpoint
} from '@/lib/api/image-provider';

describe('image provider configuration', () => {
  it('uses OpenAI images endpoint by default', () => {
    expect(resolveImageGenerationEndpoint('https://api.openai.com')).toBe(
      'https://api.openai.com/v1/images/generations'
    );
  });

  it('uses BigModel GLM image endpoint without appending /v1', () => {
    expect(resolveImageGenerationEndpoint('https://open.bigmodel.cn/api/paas/v4')).toBe(
      'https://open.bigmodel.cn/api/paas/v4/images/generations'
    );
  });

  it('omits OpenAI-only response_format for BigModel GLM requests', () => {
    const body = buildImageGenerationBody({
      endpoint: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
      model: 'cogview-3-flash',
      prompt: 'a car',
      size: '1024x1024'
    });

    expect(body).toMatchObject({
      model: 'cogview-3-flash',
      prompt: 'a car',
      size: '1024x1024'
    });
    expect(body).not.toHaveProperty('response_format');
  });
});
