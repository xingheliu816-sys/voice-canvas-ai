import { requireUser } from '@/lib/auth/guard';
import { validate } from '@/lib/nlu/SchemaGuard';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `你是一个语音绘图指令解析器。将用户的中文自然语言指令转换为标准 JSON 命令。

可用命令类型 (type):
- CREATE: 创建图形 { type: "CREATE", id: "obj_xx", shape: "circle"|"rect"|"triangle"|"line"|"text", fill?: "#颜色", x?: number, y?: number, width?: number, height?: number, text?: string, fontSize?: number, position?: "top-left"|"center"|"bottom-right"等, size?: "small"|"medium"|"large" }
- BATCH: 批量命令 { type: "BATCH", batchId: "batch_xx", commands: [...] }

位置映射: 左上↔top-left, 中间↔center, 右下↔bottom-right, 左↔center-left, 右↔center-right
颜色映射: 红色↔#FF0000, 蓝色↔#0000FF, 绿色↔#00FF00, 黑色↔#000000, 白色↔#FFFFFF, 黄色↔#FFFF00
尺寸映射: 小↔small(60px), 中↔medium(100px), 大↔large(180px)

画布尺寸: 800x500, 坐标系左上角原点, x↔水平, y↔垂直

返回严格要求:
1. 只返回合法 JSON，不要任何解释文字
2. type 必须在白名单: CREATE, BATCH
3. shape 必须在: circle, rect, triangle, line, text
4. x,y 必须是数字且在画布内 (x:0-800, y:0-500)
5. 宽度高度至少 10px

示例:
输入: "在天空中画两朵白云"
输出: {"type":"BATCH","batchId":"b_01","commands":[{"type":"CREATE","id":"c1","shape":"circle","fill":"#FFFFFF","x":200,"y":80,"width":60,"height":60,"position":"top-left"},{"type":"CREATE","id":"c2","shape":"circle","fill":"#FFFFFF","x":350,"y":100,"width":50,"height":50,"position":"top-center"}]}

输入: "画一个大的红色圆"
输出: {"type":"CREATE","id":"c1","shape":"circle","fill":"#FF0000","x":400,"y":250,"width":180,"height":180,"size":"large","position":"center"}`;

export async function POST(req: Request) {
  await requireUser();

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'LLM_NOT_CONFIGURED' }, { status: 503 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
      temperature: 0
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content?.type !== 'text') {
      return Response.json({ error: 'UNEXPECTED_RESPONSE' }, { status: 502 });
    }

    // Try to parse JSON from response text
    const textContent = content.text.trim();
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'NO_JSON_IN_RESPONSE' }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!validate(parsed)) {
      return Response.json({ error: 'INVALID_COMMAND' }, { status: 422 });
    }

    return Response.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.APIError && err.status) {
      return Response.json({ error: 'LLM_ERROR', detail: err.message }, { status: 502 });
    }
    // Timeout or parse error
    return Response.json({ error: 'PARSE_FAILED' }, { status: 422 });
  }
}
