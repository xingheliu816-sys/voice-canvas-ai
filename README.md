# voice-canvas-ai · AI 语音绘图工具

> 纯语音控制的 AI 绘图工具。无需鼠标键盘，仅通过自然语言语音指令完成绘图创作。

## Demo 视频

### 哔哩哔哩视频地址
https://www.bilibili.com/video/BV1BcJP6oE9N/

### 百度网盘视频地址
通过网盘分享的文件：20260614_204816.mp4
链接: https://pan.baidu.com/s/1ddmk2wT9DsQ6gTD4qCLR7Q?pwd=lkjh 提取码: lkjh 
--来自百度网盘超级会员v4的分享

## 一键启动

```bash
npm install
npm run dev
```

打开 http://localhost:3000，注册账号后即可使用。

> 首次启动自动创建 `data/app.db`（SQLite）和 `storage/thumbnails/` 目录，**无需任何中间件或外部服务**。

## 浏览器要求

Chrome / Edge 最新版（依赖 Web Speech API 语音识别）。

非 Chrome/Edge 浏览器可正常访问页面，但语音识别功能不可用。

## 是否需要 API Key

**不填 Key 也能完整运行**。系统默认使用本地规则引擎 + Mock 场景演示复合指令拆解。

在 `.env.local` 中配置 `ANTHROPIC_API_KEY` 可启用 LLM 增强解析，处理更复杂的自然语言指令。

## 功能清单

### Must（已完成）

| 类别 | 功能 | 状态 |
|------|------|------|
| 账号 | 注册、登录、HttpOnly Cookie 鉴权 | ✅ |
| 语音 | Web Speech API 实时识别、连续对话自动重启、暂停/恢复 | ✅ |
| 解析 | 规则引擎 + 同义词归一化 + ASR 错字修正 | ✅ |
| 绘图 | 圆、矩形、三角形、直线、文字 | ✅ |
| 样式 | 填充色、描边、透明度、尺寸（大/中/小）、空心/实心 | ✅ |
| 位置 | 九宫格（左上/中间/右下…） | ✅ |
| 选中 | 选中对象、形状/颜色定位 | ✅ |
| 编辑 | 移动、改颜色、放大缩小、旋转、替换、删除 | ✅ |
| 全局 | 撤销、重做、清空（二次确认）、导出 PNG | ✅ |
| 作品 | 保存(canvasJson+缩略图)、列表、打开继续编辑、删除 | ✅ |
| 多画布 | 新建/切换/删除/重命名画布标签页，画布间图形隔离 | ✅ |
| 画布交互 | 缩放(Ctrl+滚轮)、平移(空格+拖拽)、背景色切换(8色) | ✅ |
| 场景 | 10 个 Mock 场景（房子/笑脸/田园/雪人/彩虹…） | ✅ |
| 容错 | 未知指令引导、危险操作确认、语音确认(5秒超时)、ASR 错字修正 | ✅ |
| 多句 | 连接词拆句（"红圆和蓝方块"）+ 按 batch 撤销 | ✅ |
| 文档 | 设计文档、README | ✅ |

### Optional（已实现）

| 类别 | 功能 | 状态 |
|------|------|------|
| LLM | 复杂指令 LLM 解析（可选 Key 增强） | ✅ 已实现 |
| TTS | 语音反馈播报 | ✅ 已实现 |
| 历史 | 指令历史侧栏（时间戳+状态标签） | ✅ 已实现 |
| 引导 | 指令速查帮助（? 键快捷打开+分组图标） | ✅ 已实现 |
| UI | 深色主题设计系统 + 毛玻璃面板 + 可拖拽浮动控件 | ✅ 已实现 |
| 拖拽 | 可拖拽浮动面板（位置 localStorage 记忆+边界钳位） | ✅ 已实现 |
| 旋转 | 旋转、描边粗细 | ⏸ Future Work |
| 图层 | 复杂图层管理 | ❌ 一期范围外 |
| 协作 | 多人协作 | ❌ 一期范围外 |

## 数据存储

本项目**不依赖任何中间件或托管数据库**，所有数据保存在本地磁盘：

- `data/app.db`：SQLite 数据库（用户、作品、指令日志）
- `storage/thumbnails/`：作品缩略图 PNG
- `lib/synonyms/synonyms.json`：同义词配置
- `lib/mock-scenes/*.json`：Mock 场景脚本

localStorage 仅保存运行时临时状态（麦克风偏好等），不作正式存储。

## 项目结构

```
voice-canvas-ai/
├── app/                            # Next.js App Router 页面
│   ├── (auth)/{login,register}     # 登录注册
│   ├── drawings/                   # 作品列表
│   ├── api/auth/*                  # 鉴权 API
│   ├── api/drawings/*              # 作品 CRUD API
│   ├── api/llm/parse/              # LLM 代理
│   ├── api/health/                 # 健康检查
│   └── page.tsx                    # 编辑器主画布
├── components/                     # React 组件
│   ├── CanvasStage.tsx             # Konva 画布（缩放/平移/背景色）
│   ├── CanvasTabs.tsx              # 多画布标签页
│   ├── DraggableFloating.tsx       # 可拖拽浮动面板
│   ├── shapes/ShapeRenderer.tsx    # 形状分发渲染
│   ├── MicButton.tsx               # 麦克风按钮（拖拽+动效）
│   ├── StatusBar.tsx               # 状态条
│   ├── HelpOverlay.tsx             # 指令速查
│   └── CommandLog.tsx              # 指令历史
├── lib/
│   ├── voice/                      # 语音层（ASR + TTS + 状态机）
│   ├── nlu/                        # NLU 层（归一化 + 规则 + Mock + LLM）
│   ├── canvas/                     # 绘图层（Store + Executor + History）
│   ├── db/                         # SQLite 初始化
│   ├── auth/                       # JWT + Cookie 工具
│   ├── api/                        # 前端 API 封装
│   ├── mock-scenes/*.json          # 10 个预置场景
│   └── synonyms/synonyms.json      # 同义词表
├── tests/                          # 测试（103 条）
├── data/                           # SQLite 数据库（运行时创建）
├── storage/thumbnails/             # 缩略图（运行时创建）
└── docs/                           # 设计文档
```

## 依赖清单

| 库 | 版本 | 用途 | 原创/第三方 |
|----|------|------|------------|
| next | ^14.2 | 全栈框架 | 第三方 |
| react / react-dom | ^18.3 | UI 框架 | 第三方 |
| konva / react-konva | ^18 | 画布渲染 | 第三方 |
| zustand | ^4.5 | 状态管理 | 第三方 |
| better-sqlite3 | ^12 | 本地数据库 | 第三方 |
| bcryptjs | ^2 | 密码哈希 | 第三方 |
| jose | ^5 | JWT 签名 | 第三方 |
| @anthropic-ai/sdk | ^0.37 | LLM 调用（可选） | 第三方 |
| tailwindcss | ^3.4 | 样式 | 第三方 |
| vitest | ^1.6 | 测试框架 | 第三方 |
| 多画布标签系统 | - | 画布管理 | **原创** |
| 可拖拽浮动面板 | - | UI 交互 | **原创** |
| NLU 规则引擎 | - | 指令理解 | **原创** |
| 同义词归一化 | - | 口语容错 | **原创** |
| Mock 场景系统 | - | 复合指令演示 | **原创** |
| 语音绘图管线 | - | 端到端串联 | **原创** |
| 设计系统 | - | 深色主题+动效 | **原创** |

## 赛题方向

AI 语音绘图工具——纯语音控制的绘图工具
