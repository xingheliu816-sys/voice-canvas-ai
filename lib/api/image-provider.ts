export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';

export function resolveImageGenerationEndpoint(baseUrl: string, explicitEndpoint?: string): string {
  if (explicitEndpoint?.trim()) return explicitEndpoint.trim();

  const normalized = baseUrl.replace(/\/$/, '');
  if (/open\.bigmodel\.cn\/api\/paas\/v4$/.test(normalized)) {
    return `${normalized}/images/generations`;
  }
  if (/\/v1$/.test(normalized)) {
    return `${normalized}/images/generations`;
  }
  return `${normalized}/v1/images/generations`;
}

export function buildImageGenerationBody(input: {
  endpoint: string;
  model: string;
  prompt: string;
  size: ImageSize;
}) {
  const body: Record<string, unknown> = {
    model: input.model,
    prompt: input.prompt,
    size: input.size
  };

  if (!/open\.bigmodel\.cn/i.test(input.endpoint)) {
    body.n = 1;
    body.response_format = 'b64_json';
  }

  return body;
}
