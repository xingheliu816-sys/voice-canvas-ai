# DeepSeek 语音指令路由设计

## 目标

为现有 voice-canvas-ai 增加统一的 `/api/voice-command` 入口，把用户语音识别后的文本转换为画布操作 JSON。该入口采用三层策略：本地规则优先、DeepSeek Function Calling 增强、离线模糊兜底。

## 设计原则

- 保持现有 Next.js + React Konva 架构，不引入 Python 后端或 Fabric.js。
- 不新增 npm 依赖，DeepSeek 使用标准 `fetch` 调用 OpenAI 兼容 `/chat/completions`。
- LLM 输出必须转换为现有 `Command` 类型，并通过 `SchemaGuard.validate` 二次校验。
- 普通绘图命令默认追加图形，覆盖、清空、替换必须由显式语音意图触发。
- 未配置 `DEEPSEEK_API_KEY`、网络失败或超时，都不能阻断基础绘图。

## 请求流程

```text
Web Speech API
  -> 文本指令
  -> POST /api/voice-command
     -> Layer 1 本地规则引擎
     -> Layer 2 DeepSeek tools
     -> Layer 3 离线兜底
  -> { source, ops, latencyMs, warning? }
  -> 前端执行现有 CommandExecutor
```

## 路由策略

1. 显式 AI 触发词优先走 DeepSeek，包括 `AI`、`智能`、`帮我`、`你觉得`、`随便`、`自动`、`设计`、`创意`。
2. 非 AI 触发且本地规则命中合法命令时，直接返回 `source: "local"`。
3. 本地未命中或用户明确要求 AI 时，调用 DeepSeek `deepseek-chat`。
4. DeepSeek 异常时，使用关键词模糊匹配形状和颜色，并返回 `source: "fallback"` 与 warning。

## DeepSeek Tool 映射

DeepSeek 返回的 tool calls 不直接进入画布，而是映射为现有命令：

| Tool | Command |
|------|---------|
| `draw_shape` | `CREATE` |
| `modify_shape` | `MODIFY` |
| `delete_shape` | `DELETE` |
| `move_shape` | `MOVE` |
| `change_color` | `MODIFY` |
| `undo` | `UNDO` |
| `redo` | `REDO` |
| `clear_canvas` | `CLEAR` |
| `ask_user` | 返回 `question`，不执行画布操作 |

## 配置

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
LLM_TIMEOUT=5000
```

真实 Key 只写入 `.env.local`，示例配置写入 `.env.local.example`。

## 错误处理

- 缺少文本：返回 `400 TEXT_REQUIRED`。
- JSON 非法：返回 `400 BAD_JSON`。
- DeepSeek 非 2xx：进入 fallback，并在 `warning` 里返回截断后的错误信息。
- DeepSeek 返回非法 tool call：丢弃非法命令；若无可执行命令则进入 fallback。
- `ask_user` 不执行命令，交给 UI 后续作为提示展示。

## 测试范围

- 高置信本地规则命中时不调用 LLM。
- 显式 AI 触发词强制调用 DeepSeek。
- DeepSeek 失败时进入离线兜底。
- 多个 tool calls 能映射为多个现有画布命令。
