export const runtime = 'nodejs';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  buildImageGenerationBody,
  resolveImageGenerationEndpoint,
  type ImageSize
} from '@/lib/api/image-provider';

async function generateWithOpenAI(
  prompt: string,
  size: ImageSize
): Promise<string> {
  const apiKey = process.env.IMAGE_API_KEY;
  if (!apiKey) {
    throw new Error('IMAGE_API_KEY not configured');
  }

  const baseUrl = process.env.IMAGE_API_BASE_URL || 'https://api.openai.com';
  const model = process.env.IMAGE_MODEL || 'dall-e-3';
  const endpoint = resolveImageGenerationEndpoint(baseUrl, process.env.IMAGE_API_GENERATIONS_URL);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(buildImageGenerationBody({
      endpoint,
      model,
      prompt: `${prompt}, clean background, centered subject, suitable for canvas placement`,
      size
    }))
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Image API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const imageBuffer = await extractImageBuffer(json);

  // Save to local storage
  const dir = path.join(process.cwd(), 'storage', 'generated-images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.png`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, imageBuffer);

  return `/api/files/generated-images/${filename}`;
}

async function extractImageBuffer(json: any): Promise<Buffer> {
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, 'base64');

  const url = json.data?.[0]?.url;
  if (typeof url === 'string' && url) {
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      throw new Error(`Image download ${imageRes.status}`);
    }
    return Buffer.from(await imageRes.arrayBuffer());
  }

  throw new Error('No image data in response');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, style, width, height } = body as {
      prompt: string;
      style?: string;
      width?: number;
      height?: number;
    };

    if (!prompt?.trim()) {
      return Response.json({ error: '请提供图像描述(prompt)' }, { status: 400 });
    }

    const apiKey = process.env.IMAGE_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: '当前未配置图像生成服务(IMAGE_API_KEY)，无法生成真实风格图片。你可以配置 IMAGE_API_KEY 后使用该功能。' },
        { status: 503 }
      );
    }

    // Add style guidance to prompt
    const styleHints: Record<string, string> = {
      realistic: 'photorealistic, highly detailed, realistic textures and lighting',
      '3d': '3D rendered, isometric view, clean materials, soft studio lighting, Blender style',
      isometric: 'isometric view, clean vector style, 3D isometric rendering',
      cartoon: 'flat cartoon style, clean outlines, vibrant colors, simple shapes'
    };
    const styleHint = styleHints[style || 'realistic'] || styleHints['realistic'];
    const fullPrompt = `${prompt}, ${styleHint}, isolated subject, transparent or clean white background, professional quality`;

    // Map size to DALL-E sizes
    const w = width || 512;
    const h = height || 512;
    let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
    if (w > h * 1.3) size = '1792x1024';
    else if (h > w * 1.3) size = '1024x1792';

    const imageUrl = await generateWithOpenAI(fullPrompt, size);

    return Response.json({
      imageUrl,
      prompt: fullPrompt,
      provider: 'openai'
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[image/generate]', message);
    return Response.json({ error: `图像生成失败: ${message}` }, { status: 500 });
  }
}
