# 实现计划 · voice-canvas-ai

- **关联设计文档**：[2026-06-12-voice-canvas-ai-design.md](../specs/2026-06-12-voice-canvas-ai-design.md)
- **总 PR 数**：14
- **节奏**：每个 PR 单一职责，合并后 main 必须可启动

---

## 0. PR 总览

| # | 主题 | 关键产出 | 风险点 |
|---|------|---------|--------|
| 01 | 项目初始化 | Next.js + TS + Tailwind + Zustand + Vitest 跑通 | Windows 路径/权限 |
| 02 | 数据层 | SQLite 自动建库 + `/api/health` | better-sqlite3 编译 |
| 03 | 登录注册 | Auth API + Cookie + Middleware | JWT 签名密钥 |
| 04 | 页面骨架 | 4 页面 + 路由守卫 | 已登录跳转逻辑 |
| 05 | Konva 画布 | 形状渲染 + ObjectStore | react-konva SSR |
| 06 | 指令模型 | Normalizer + RuleEngine + SchemaGuard + 测试 | 同义词覆盖度 |
| 07 | 语音识别 | Web Speech + 状态机 + 兼容提示 | 非 Chrome 降级 |
| 08 | 命令执行 | Executor + SelectionManager + 端到端跑通 | 选择优先级 |
| 09 | 全局操作 | History + BatchSplitter + Export | Undo 边界 |
| 10 | 作品管理 | Drawings CRUD + 语音保存/打开 | 缩略图 base64 大小 |
| 11 | Mock 场景 | 10 个场景 JSON + MockSceneService | 场景命中冲突 |
| 12 | 可选 LLM | API 代理 + 双校验 + 降级 | 超时与 prompt |
| 13 | UI 打磨 | HelpOverlay + CommandLog + 错误提示 | - |
| 14 | 文档与演示 | 设计文档更新 + README + 录屏 | 视频时长 |

---

## 1. PR-01 · 项目初始化（详细 step-by-step）

**目标**：能 `npm install && npm run dev` 打开页面、`npm test` 通过。

### Step 1.1 创建 Next.js 项目结构

手动建立目录与基础文件（不用 `create-next-app`，避免引入不需要的脚本）：

```
voice-canvas-ai/
├── app/
│   ├── layout.tsx          # 根布局（HTML/body/<html lang="zh-CN">）
│   ├── page.tsx            # 首页（占位）
│   └── globals.css         # Tailwind 入口
├── tests/
│   └── smoke.test.ts       # 烟雾测试，确认 Vitest 跑通
├── .env.local.example
├── .gitignore
├── README.md
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── vitest.config.ts
```

### Step 1.2 `package.json` 关键字段

```json
{
  "name": "voice-canvas-ai",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.6.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

### Step 1.3 `tsconfig.json` 关键配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Step 1.4 Tailwind 配置

`tailwind.config.js`：

```js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
```

`app/globals.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 1.5 Vitest 配置

`vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') }
  }
});
```

`tests/smoke.test.ts`：

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### Step 1.6 `.gitignore`

```
node_modules/
.next/
out/
build/
.env.local
.env*.local
data/*.db
data/*.db-journal
storage/thumbnails/*
!storage/thumbnails/.gitkeep
coverage/
*.log
.DS_Store
.idea/
.vscode/
```

`storage/thumbnails/.gitkeep` 提交一个空文件占位。

### Step 1.7 `.env.local.example`

```
# 可选：填入后启用 LLM 增强解析
ANTHROPIC_API_KEY=

# 必填：JWT 签名密钥（启动时自动校验，未设置则首启随机生成并写入 .env.local）
AUTH_JWT_SECRET=
```

### Step 1.8 `app/layout.tsx` 与 `app/page.tsx` 占位

```tsx
// app/layout.tsx
import './globals.css';

export const metadata = { title: 'voice-canvas-ai', description: '纯语音控制的绘图工具' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl">voice-canvas-ai 正在搭建中…</h1>
    </main>
  );
}
```

### Step 1.9 README 占位

只写一句话 + 后续会补全的提示。完整 README 留到 PR-14。

### Step 1.10 验收

- [ ] `npm install` 成功
- [ ] `npm run dev` 打开 http://localhost:3000 看到"正在搭建中"
- [ ] `npm test` 输出 `1 passed`
- [ ] `npm run typecheck` 无错
- [ ] Git 仓库初始化、首次 commit、PR-01 描述四要素齐全

---

## 2. PR-02 · 数据层（详细 step-by-step）

**目标**：访问 `/api/health` 返回 200，启动时自动建库、建表、建目录。

### Step 2.1 安装依赖

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

> Windows 注意：better-sqlite3 含原生模块。若 `npm install` 失败，运行 `npm config set msvs_version 2022` 后重装，或安装 windows-build-tools。

### Step 2.2 创建 `lib/db/init.ts`

```ts
// lib/db/init.ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const THUMB_DIR = path.join(STORAGE_DIR, 'thumbnails');
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;

  // 首次启动自动创建目录
  for (const dir of [DATA_DIR, STORAGE_DIR, THUMB_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drawings (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      title         TEXT NOT NULL,
      canvas_json   TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_drawings_user_updated
      ON drawings(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS command_logs (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      drawing_id    TEXT,
      raw_text      TEXT NOT NULL,
      parsed_json   TEXT,
      status        TEXT NOT NULL,
      source        TEXT NOT NULL,
      created_at    INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}
```

### Step 2.3 创建 `/api/health`

`app/api/health/route.ts`：

```ts
import { getDB } from '@/lib/db/init';

export const runtime = 'nodejs';   // ★ 强制 Node Runtime
export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  try {
    const db = getDB();
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch {}

  return Response.json({
    status: dbOk ? 'ok' : 'degraded',
    asr: 'web-speech',
    nlu: 'rule-first',
    llm: process.env.ANTHROPIC_API_KEY ? 'enabled' : 'optional',
    storage: dbOk ? 'sqlite' : 'unavailable',
    version: '0.1.0'
  });
}
```

### Step 2.4 next.config.js 适配 better-sqlite3

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3']
  }
};
module.exports = nextConfig;
```

### Step 2.5 验收

- [ ] 首启后 `data/app.db` 自动出现
- [ ] `storage/thumbnails/` 目录自动出现
- [ ] 访问 `/api/health` 返回 `{ status: 'ok', storage: 'sqlite', ... }`
- [ ] DB 内三张表存在（用 sqlite CLI 或 DB Browser 验证）

---

## 3. PR-03 · 登录注册（详细 step-by-step）

**目标**：注册、登录、退出 API 跑通；Middleware 守住作品接口；HttpOnly Cookie 7 天有效。

### Step 3.1 安装依赖

```bash
npm install bcryptjs jose
npm install -D @types/bcryptjs
```

### Step 3.2 创建 `lib/auth/jwt.ts`

```ts
// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SECRET_FILE = path.join(process.cwd(), '.env.local');

function loadOrCreateSecret(): Uint8Array {
  if (process.env.AUTH_JWT_SECRET) {
    return new TextEncoder().encode(process.env.AUTH_JWT_SECRET);
  }
  // 首次启动自动生成并落盘到 .env.local
  const generated = crypto.randomBytes(48).toString('hex');
  const line = `\nAUTH_JWT_SECRET=${generated}\n`;
  try {
    fs.appendFileSync(SECRET_FILE, line);
  } catch {}
  process.env.AUTH_JWT_SECRET = generated;
  return new TextEncoder().encode(generated);
}

export async function signToken(payload: { userId: string; username: string }) {
  const secret = loadOrCreateSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const secret = loadOrCreateSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as { userId: string; username: string; iat: number; exp: number };
}

export const SESSION_COOKIE = 'vca_session';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60
};
```

### Step 3.3 创建 `lib/auth/guard.ts`

```ts
// lib/auth/guard.ts
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifyToken } from './jwt';

export async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) throw new Response('Unauthorized', { status: 401 });
  try {
    return await verifyToken(token);
  } catch {
    throw new Response('Unauthorized', { status: 401 });
  }
}

export async function tryGetUser() {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}
```

### Step 3.4 API Routes

`app/api/auth/register/route.ts`、`login/route.ts`、`logout/route.ts`、`me/route.ts`，全部声明 `export const runtime = 'nodejs'`。

- **register**：校验用户名/密码长度 → bcrypt 哈希 → 写入 users → 自动登录（签 token + 写 cookie）
- **login**：查 users → bcrypt.compare → 签 token + 写 cookie
- **logout**：清 cookie
- **me**：requireUser → 返回 `{ id, username }`

### Step 3.5 `middleware.ts`

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/api/drawings', '/api/logs'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some(p => pathname.startsWith(p))) {
    const token = req.cookies.get('vca_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    // JWT 完整校验在 API Route 内做（避免 Edge Runtime 用 jose）
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/drawings/:path*', '/api/logs/:path*']
};
```

> 说明：Edge Middleware 只做"有无 cookie"快速拦截；完整 JWT 校验在 API Route 的 `requireUser()` 中做（Node Runtime）。

### Step 3.6 验收

- [ ] `curl -X POST /api/auth/register -d '{"username":"alice","password":"12345678"}'` → 200 + Set-Cookie
- [ ] `curl /api/auth/me` 带 cookie → `{ id, username }`
- [ ] `curl /api/drawings` 无 cookie → 401
- [ ] 浏览器 DevTools 看到 Cookie 标记 HttpOnly
- [ ] `vitest` 仍全绿

---

## 4. PR-04 · 页面骨架（详细 step-by-step）

**目标**：4 个页面可访问，未登录访问受保护页跳转登录。

### Step 4.1 目录

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── drawings/page.tsx
├── page.tsx                 # 编辑器入口（占位画布）
└── layout.tsx
components/
└── StatusBar.tsx
lib/auth/
└── server-helpers.ts        # 服务端取登录态工具
```

### Step 4.2 服务端登录态工具

`lib/auth/server-helpers.ts`：

```ts
import { tryGetUser } from './guard';
export async function getCurrentUser() {
  return await tryGetUser();
}
```

### Step 4.3 登录/注册页

- 纯客户端表单（`'use client'`），用 `fetch` 调用 `/api/auth/*`
- 成功后 `router.push('/')`
- 错误时显示提示

### Step 4.4 编辑器与作品列表的访问控制

`app/page.tsx`（编辑器入口）：
- Server Component 调 `getCurrentUser()`
- 未登录 → `redirect('/login')`
- 已登录 → 渲染 `<CanvasPlaceholder />`（PR-05 替换为真画布）

`app/drawings/page.tsx`：同上策略。

### Step 4.5 `components/StatusBar.tsx`

最简版本：固定底部，显示"等待语音输入"，预留 props 接收 `text` / `status`。

### Step 4.6 验收

- [ ] 未登录访问 `/` → 跳到 `/login`
- [ ] 注册 → 自动登录 → 跳到 `/`
- [ ] 退出 → 跳到 `/login`
- [ ] 4 个路径全部可访问

---

## 5. PR-05 · Konva 画布（详细 step-by-step）

**目标**：react-konva 画布可渲染圆/矩形/三角/线/文字，ObjectStore Zustand 管理对象列表。

### Step 5.1 安装依赖

```bash
npm install konva react-konva
```

### Step 5.2 画布对象类型定义

`lib/canvas/types.ts`：

```ts
export type ShapeKind = 'circle' | 'rect' | 'triangle' | 'line' | 'text' | 'polygon';

export interface CanvasObject {
  id: string;
  name?: string;
  index: number;
  createdAt: number;
  batchId?: string;
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // text-specific
  text?: string;
  fontSize?: number;
}
```

### Step 5.3 ObjectStore（Zustand）

`lib/canvas/ObjectStore.ts`：

```ts
import { create } from 'zustand';
import type { CanvasObject } from './types';

interface CanvasState {
  objects: CanvasObject[];
  selectedId: string | null;
  addObject: (obj: CanvasObject) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, changes: Partial<CanvasObject>) => void;
  setObjects: (objs: CanvasObject[]) => void;
  selectObject: (id: string | null) => void;
  clearAll: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  objects: [],
  selectedId: null,
  addObject: (obj) => set((s) => ({ objects: [...s.objects, obj] })),
  removeObject: (id) => set((s) => ({ objects: s.objects.filter(o => o.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),
  updateObject: (id, changes) => set((s) => ({ objects: s.objects.map(o => o.id === id ? { ...o, ...changes } : o) })),
  setObjects: (objs) => set({ objects: objs, selectedId: null }),
  selectObject: (id) => set({ selectedId: id }),
  clearAll: () => set({ objects: [], selectedId: null }),
}));
```

### Step 5.4 形状渲染组件

`components/shapes/CircleShape.tsx` / `RectShape.tsx` / `TriangleShape.tsx` / `LineShape.tsx` / `TextShape.tsx`，每个是 react-konva 的纯渲染组件。统一通过 `ShapeRenderer.tsx` 分发：

```tsx
// components/shapes/ShapeRenderer.tsx
import { Circle, Rect, Line, Text, RegularPolygon } from 'react-konva';
import type { CanvasObject } from '@/lib/canvas/types';

interface Props {
  obj: CanvasObject;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ShapeRenderer({ obj, isSelected, onSelect }: Props) {
  const common = {
    x: obj.x, y: obj.y,
    rotation: obj.rotation,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    opacity: obj.opacity,
    stroke: isSelected ? '#3b82f6' : obj.stroke,
    strokeWidth: isSelected ? 2 : obj.strokeWidth,
    onClick: onSelect,
    onTap: onSelect,
  };

  switch (obj.shape) {
    case 'circle':
      return <Circle {...common} radius={obj.width / 2} fill={obj.fill} />;
    case 'rect':
      return <Rect {...common} width={obj.width} height={obj.height} fill={obj.fill} />;
    case 'triangle':
      return <RegularPolygon {...common} sides={3} radius={obj.width / 2} fill={obj.fill} />;
    case 'line':
      return <Line {...common} points={[0, 0, obj.width, obj.height]} stroke={obj.fill} />;
    case 'text':
      return <Text {...common} text={obj.text} fontSize={obj.fontSize || 24} fill={obj.fill} />;
    default:
      return null;
  }
}
```

### Step 5.5 CanvasStage 组件（SSR 安全）

`components/CanvasStage.tsx`——用 `dynamic` 延迟加载，避免 SSR 报错：

```tsx
'use client';

import { Stage, Layer } from 'react-konva';
import { useCanvasStore } from '@/lib/canvas/ObjectStore';
import ShapeRenderer from './shapes/ShapeRenderer';

function CanvasStageInner() {
  const objects = useCanvasStore((s) => s.objects);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const selectObject = useCanvasStore((s) => s.selectObject);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight - 56} className="bg-white">
      <Layer>
        {objects.map((obj) => (
          <ShapeRenderer
            key={obj.id}
            obj={obj}
            isSelected={obj.id === selectedId}
            onSelect={() => selectObject(obj.id)}
          />
        ))}
      </Layer>
    </Stage>
  );
}
```

然后在容器中用 `next/dynamic`：

```tsx
// app/page.tsx 中的引用
import dynamic from 'next/dynamic';

const CanvasStage = dynamic(() => import('@/components/CanvasStage'), { ssr: false });
```

### Step 5.6 编辑页集成 CanvasStage

更新 `app/page.tsx` 集成 CanvasStage + StatusBar：

```tsx
import { getCurrentUser } from '@/lib/auth/server-helpers';
import { redirect } from 'next/navigation';
import CanvasStageWrapper from './CanvasStageWrapper';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <CanvasStageWrapper />;
}
```

`app/CanvasStageWrapper.tsx`——客户端组件，放 CanvasStage + StatusBar：

```tsx
'use client';

import dynamic from 'next/dynamic';
import StatusBar from '@/components/StatusBar';

const CanvasStage = dynamic(() => import('@/components/CanvasStage'), { ssr: false });

export default function CanvasStageWrapper() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 relative">
        <CanvasStage />
      </div>
      <StatusBar />
    </main>
  );
}
```

### Step 5.7 硬编码测试数据验证渲染

在开发阶段，CanvasStage mount 后往 Store 注入一个测试对象确认渲染链路：

```ts
// 临时在 CanvasStage.tsx 的 useEffect 中：
useEffect(() => {
  if (objects.length === 0) {
    addObject({
      id: 'test1', name: '红圆', index: 0, createdAt: Date.now(),
      shape: 'circle', x: 200, y: 200, width: 100, height: 100,
      fill: '#FF0000', stroke: '#000000', strokeWidth: 1,
      opacity: 1, rotation: 0, scaleX: 1, scaleY: 1
    });
  }
}, []);
```

验证通过后 **删掉** 这个 useEffect 回到空白画布状态。

### Step 5.8 验收

- [ ] 页面加载后看到白色画布（Konva Stage）
- [ ] `window.__STORE__` 能访问对象列表
- [ ] 硬编码红圆正常显示
- [ ] 点击圆 → 蓝色描边（选中态）
- [ ] SSR 不报错（刷新页面无白屏）
- [ ] typecheck + test 全过

---

## 6. PR-06 · 指令模型（详细 step-by-step）

**目标**：NLU 管线（归一化→规则解析→Schema 校验）跑通，至少 30 条测试全绿。

### Step 6.1 创建目录与 Command 类型定义

```bash
mkdir -p lib/nlu lib/synonyms
```

`lib/nlu/types.ts`——完整 Command 类型与白名单：

```ts
// 画布对象元数据（用于精准定位）
export type ShapeKind = 'circle' | 'rect' | 'triangle' | 'line' | 'text' | 'polygon';

// 规范化后的 Command
export type Command = CreateCommand | SelectCommand | ModifyCommand | MoveCommand | DeleteCommand | UndoCommand | RedoCommand | ClearCommand | ExportCommand | QueryCommand | ProjectSaveCommand | ProjectSaveAsCommand | ProjectListCommand | ProjectOpenCommand | ProjectRenameCommand | ProjectDeleteCommand | BatchCommand | UnknownCommand;

export interface CreateCommand {
  type: 'CREATE'; id: string; shape: ShapeKind;
  fill?: string; stroke?: string; strokeWidth?: number; opacity?: number;
  x?: number; y?: number; width?: number; height?: number;
  text?: string; fontSize?: number; name?: string; batchId?: string;
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  size?: 'small' | 'medium' | 'large';
}

export interface SelectCommand { type: 'SELECT'; target: TargetRef; }
export interface ModifyCommand { type: 'MODIFY'; target: TargetRef; changes: Record<string, unknown>; }
export interface MoveCommand { type: 'MOVE'; target: TargetRef; dx?: number; dy?: number; direction?: string; }
export interface DeleteCommand { type: 'DELETE'; target: TargetRef; }
export interface UndoCommand { type: 'UNDO'; }
export interface RedoCommand { type: 'REDO'; }
export interface ClearCommand { type: 'CLEAR'; confirmed?: boolean; }
export interface ExportCommand { type: 'EXPORT'; }
export interface QueryCommand { type: 'QUERY'; question: 'COUNT' | 'CURRENT_SELECTION' | 'DESCRIBE'; }
export interface ProjectSaveCommand { type: 'PROJECT_SAVE'; }
export interface ProjectSaveAsCommand { type: 'PROJECT_SAVE_AS'; title: string; }
export interface ProjectListCommand { type: 'PROJECT_LIST'; }
export interface ProjectOpenCommand { type: 'PROJECT_OPEN'; recent?: number; title?: string; }
export interface ProjectRenameCommand { type: 'PROJECT_RENAME'; title: string; }
export interface ProjectDeleteCommand { type: 'PROJECT_DELETE'; target: 'current' | { title: string }; }
export interface BatchCommand { type: 'BATCH'; batchId: string; commands: Command[]; }
export interface UnknownCommand { type: 'UNKNOWN'; rawText: string; }

export type TargetRef = { type: 'current' } | { type: 'id'; id: string } | { type: 'recent'; n: number } | { type: 'shape'; shape: ShapeKind } | { type: 'color'; color: string } | { type: 'shapeAndColor'; shape: ShapeKind; color: string } | { type: 'index'; index: number } | { type: 'position'; position: string } | { type: 'all' };

export const COMMAND_WHITELIST = ['CREATE','SELECT','MODIFY','MOVE','DELETE','UNDO','REDO','CLEAR','EXPORT','QUERY','BATCH','PROJECT_SAVE','PROJECT_SAVE_AS','PROJECT_LIST','PROJECT_OPEN','PROJECT_RENAME','PROJECT_DELETE'] as const;
```

### Step 6.2 同义词表

`lib/synonyms/synonyms.json`——完整同义词 + ASR 错字：

```json
{
  "verbs": {
    "CREATE": ["画","绘制","添加","来一个","新建","做一个","帮我画","加上","加一个","整一个"],
    "DELETE": ["删除","删掉","去掉","移除","擦掉","删了"],
    "UNDO":   ["撤销","撤回","回退","退回","取消","返回上一步","上一步","撤消"],
    "REDO":   ["重做","恢复","下一步","重来"],
    "CLEAR":  ["清空","全部清除","重新开始","全部删除","清屏"],
    "SAVE":   ["保存","存一下","保存作品","保存一下","存起来"]
  },
  "shapes": {
    "circle":   ["圆","圆形","圆圈","圆球","园形","原型","圈","圈圈"],
    "rect":     ["矩形","方块","方形","长方形","方框","矩型","正方形"],
    "triangle": ["三角","三角形","三角块","三角型","三角行"],
    "line":     ["线","直线","横线","竖线","线条"],
    "text":     ["文字","字","写","写字"]
  },
  "colors": {
    "#FF0000": ["红","红色","大红","朱红","正红","红色的","红的","红颜色"],
    "#0000FF": ["蓝","蓝色","天蓝","湛蓝","天蓝色","蓝色的","蓝的"],
    "#00FF00": ["绿","绿色","草绿","浅绿","绿色的","绿的"],
    "#000000": ["黑","黑色","黑色的","黑的"],
    "#FFFFFF": ["白","白色","白色的","白的"],
    "#FFFF00": ["黄","黄色","金黄色","黄色的","黄的"]
  },
  "positions": {
    "top-left":     ["左上","左上角","西北","左上侧"],
    "top-center":   ["上","上方","上面","顶部","正上"],
    "top-right":    ["右上","右上角","东北","右上侧"],
    "center-left":  ["左","左边","左侧","左面","偏左"],
    "center":       ["中间","正中","中央","中心","正中间","中间位置"],
    "center-right": ["右","右边","右侧","右面","偏右"],
    "bottom-left":  ["左下","左下角","西南","左下侧"],
    "bottom-center":["下","下方","下面","底部","正下"],
    "bottom-right": ["右下","右下角","东南","右下侧"]
  },
  "sizes": {
    "large":  ["大","大的","大点","大一点","大些","特大","巨大"],
    "medium": ["中等","正常","一般","不大不小"],
    "small":  ["小","小的","小点","小一点","小些","迷你","缩小"]
  },
  "asr_fixes": {
    "园形": "圆形",
    "园": "圆",
    "矩型": "矩形",
    "三角型": "三角形",
    "三角行": "三角形",
    "原型": "圆形"
  }
}
```

### Step 6.3 Normalizer 归一化器

`lib/nlu/Normalizer.ts`——文本归一化三阶段：

```ts
import synonyms from '@/lib/synonyms/synonyms.json';

const asrFixes = synonyms.asr_fixes as Record<string, string>;

// 构建反向索引：同义词 → 标准标识符
const reverseMap = new Map<string, { category: string; standard: string }>();
for (const [category, groups] of Object.entries(synonyms)) {
  if (category === 'asr_fixes') continue;
  for (const [standard, words] of Object.entries(groups as Record<string, string[]>)) {
    for (const w of words) {
      reverseMap.set(w, { category, standard });
    }
  }
}

export function normalize(text: string): string {
  let t = text.trim();

  // 阶段 1：ASR 错字修正
  for (const [wrong, correct] of Object.entries(asrFixes)) {
    t = t.replace(new RegExp(wrong, 'g'), correct);
  }

  return t;
}

// 归一化结果：动词标识符 + 颜色值 + 形状标识符 + 位置标识符 + 尺寸标识符 + 数字
export interface Normalized {
  raw: string;
  verb: string | null;
  color: string | null;
  shape: string | null;
  position: string | null;
  size: string | null;
  number: number | null;
  text: string | null;
  isMultiple: boolean;
}

export function analyze(text: string): Normalized {
  const result: Normalized = {
    raw: text,
    verb: null, color: null, shape: null,
    position: null, size: null, number: null,
    text: null, isMultiple: false
  };

  // 检查多对象连接词
  result.isMultiple = /和|还有|然后|再画|接着|另外/.test(text);

  // 数字
  const numMatch = text.match(/(\d+)/);
  if (numMatch) result.number = parseInt(numMatch[1], 10);

  // 带引号文本
  const quoteMatch = text.match(/[''"'""](.+?)[''"'""]/);
  if (quoteMatch) result.text = quoteMatch[1];

  // 按字符长度降序匹配，确保"左上角"优先于"上"
  const sorted = [...reverseMap.entries()]
    .filter(([word]) => text.includes(word))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [word, { category, standard }] of sorted) {
    if (result.verb && result.color && result.shape && result.position && result.size) break;
    if (category === 'verbs' && !result.verb) result.verb = standard;
    if (category === 'colors' && !result.color) result.color = standard;
    if (category === 'shapes' && !result.shape) result.shape = standard;
    if (category === 'positions' && !result.position) result.position = standard;
    if (category === 'sizes' && !result.size) result.size = standard;
  }

  return result;
}
```

### Step 6.4 RuleEngine 规则引擎

`lib/nlu/RuleEngine.ts`——核心解析器，把归一化结果转 Command：

```ts
import { normalize, analyze, type Normalized } from './Normalizer';
import type { Command, CreateCommand } from './types';
import crypto from 'crypto';

function genId(): string {
  return 'obj_' + crypto.randomUUID().slice(0, 8);
}

// 位置 → 画布默认坐标 (800x500 画布)
const POS_DEFAULTS: Record<string, { x: number; y: number }> = {
  'top-left':     { x: 120, y: 100 },
  'top-center':   { x: 400, y: 100 },
  'top-right':    { x: 680, y: 100 },
  'center-left':  { x: 120, y: 250 },
  'center':       { x: 400, y: 250 },
  'center-right': { x: 680, y: 250 },
  'bottom-left':  { x: 120, y: 400 },
  'bottom-center':{ x: 400, y: 400 },
  'bottom-right': { x: 680, y: 400 },
};

const SIZE_DEFAULTS: Record<string, number> = {
  small: 60, medium: 100, large: 180
};

export function parse(rawText: string): Command {
  const norm = analyze(rawText);

  // ── CREATE ──
  if (norm.verb === 'CREATE' || (!norm.verb && (norm.shape || norm.color))) {
    return buildCreate(norm);
  }

  // ── DELETE ──
  if (norm.verb === 'DELETE') {
    return { type: 'DELETE', target: { type: 'current' } };
  }

  // ── UNDO ──
  if (norm.verb === 'UNDO' || rawText.includes('撤销') || rawText.includes('撤回')) {
    return { type: 'UNDO' };
  }

  // ── REDO ──
  if (norm.verb === 'REDO' || rawText.includes('重做') || rawText.includes('恢复')) {
    return { type: 'REDO' };
  }

  // ── CLEAR ──
  if (norm.verb === 'CLEAR' || rawText.includes('清空') || rawText.includes('全部删除')) {
    return { type: 'CLEAR' };
  }

  // ── 容错：有形状/颜色描述但没动词 → 也是 CREATE ──
  if (norm.shape || norm.color) {
    return buildCreate(norm);
  }

  return { type: 'UNKNOWN', rawText };
}

function buildCreate(n: Normalized): CreateCommand {
  const id = genId();
  const shape = (n.shape as CreateCommand['shape']) || 'circle';
  const sizeLabel = n.size || 'medium';
  const size = SIZE_DEFAULTS[sizeLabel] || 100;
  const pos = n.position || 'center';
  const xy = POS_DEFAULTS[pos] || POS_DEFAULTS['center']!;

  return {
    type: 'CREATE', id, shape,
    fill: n.color || '#FF0000',
    stroke: '#000000',
    strokeWidth: 1,
    opacity: 1,
    width: size, height: size,
    x: xy.x, y: xy.y,
    text: n.text || undefined,
    fontSize: 24,
    name: n.text || undefined,
    position: pos as CreateCommand['position'],
    size: sizeLabel as CreateCommand['size']
  };
}
```

### Step 6.5 SchemaGuard 校验器

`lib/nlu/SchemaGuard.ts`——校验 Command 符合 Schema + 白名单：

```ts
import type { Command, CreateCommand } from './types';
import { COMMAND_WHITELIST } from './types';

export function validate(command: Command): boolean {
  // 白名单校验
  if (!COMMAND_WHITELIST.includes(command.type as typeof COMMAND_WHITELIST[number])) {
    return false;
  }
  // Schema 校验
  switch (command.type) {
    case 'CREATE': {
      const c = command as CreateCommand;
      const validShapes = ['circle','rect','triangle','line','text','polygon'];
      if (!validShapes.includes(c.shape)) return false;
      if (typeof c.x !== 'number' || typeof c.y !== 'number') return false;
      if (typeof c.width !== 'number' || c.width < 1) return false;
      return true;
    }
    case 'UNKNOWN':
      return false;
    default:
      return true;
  }
}

export function validateBatch(commands: Command[]): boolean {
  return commands.every(validate);
}
```

### Step 6.6 测试文件

`tests/normalizer.test.ts`——归一化层 20+ 用例：

```ts
import { describe, it, expect } from 'vitest';
import { normalize, analyze } from '@/lib/nlu/Normalizer';

describe('Normalizer', () => {
  describe('normalize (ASR 错字修正)', () => {
    it('园形→圆形', () => { expect(normalize('画个园形')).toContain('圆形'); });
    it('矩型→矩形', () => { expect(normalize('画个矩型')).toContain('矩形'); });
    it('三角型→三角形', () => { expect(normalize('画个三角型')).toContain('三角形'); });
  });

  describe('analyze', () => {
    it('画一个红色的圆', () => {
      const r = analyze('画一个红色的圆');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#FF0000');
      expect(r.shape).toBe('circle');
    });
    it('画个蓝色矩形', () => {
      const r = analyze('画个蓝色矩形');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#0000FF');
      expect(r.shape).toBe('rect');
    });
    it('在左上角画一个绿三角', () => {
      const r = analyze('在左上角画一个绿三角');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#00FF00');
      expect(r.shape).toBe('triangle');
      expect(r.position).toBe('top-left');
    });
    it('画一条直线', () => {
      const r = analyze('画一条直线');
      expect(r.verb).toBe('CREATE');
      expect(r.shape).toBe('line');
    });
    it('写你好', () => {
      const r = analyze('写你好');
      expect(r.verb).toBe('CREATE');
      expect(r.shape).toBe('text');
    });
    it('ASR错字：画个红色园形', () => {
      const r = analyze('画个红色园形');
      expect(r.shape).toBe('circle');
    });
    it('口语：帮我画个红圈', () => {
      const r = analyze('帮我画个红圈');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#FF0000');
      expect(r.shape).toBe('circle');
    });
    it('同义词：来一个黑色方块', () => {
      const r = analyze('来一个黑色方块');
      expect(r.verb).toBe('CREATE');
      expect(r.color).toBe('#000000');
      expect(r.shape).toBe('rect');
    });
    it('在中间画一个大红圆', () => {
      const r = analyze('在中间画一个大红圆');
      expect(r.position).toBe('center');
      expect(r.size).toBe('large');
      expect(r.color).toBe('#FF0000');
    });
    it('写"你好世界"', () => {
      const r = analyze('写"你好世界"');
      expect(r.text).toBe('你好世界');
    });
  });

  describe('多对象', () => {
    it('画一个红圆和一个蓝方块', () => {
      const r = analyze('画一个红圆和一个蓝方块');
      expect(r.isMultiple).toBe(true);
    });
  });
});
```

`tests/parser.test.ts`——规则引擎 25+ 用例：

```ts
import { describe, it, expect } from 'vitest';
import { parse } from '@/lib/nlu/RuleEngine';

describe('RuleEngine', () => {
  describe('CREATE', () => {
    it('画一个红色的圆', () => {
      const r = parse('画一个红色的圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('circle');
        expect(r.fill).toBe('#FF0000');
      }
    });
    it('画个蓝色矩形', () => {
      const r = parse('画个蓝色矩形');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('rect');
    });
    it('在左上角画一个绿三角', () => {
      const r = parse('在左上角画一个绿三角');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('triangle');
        expect(r.position).toBe('top-left');
      }
    });
    it('画一条直线', () => {
      const r = parse('画一条直线');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('line');
    });
    it('写你好', () => {
      const r = parse('写你好');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('text');
    });
    it('ASR错字：画个红色园形', () => {
      const r = parse('画个红色园形');
      expect(r.type).toBe('CREATE');
    });
    it('口语：帮我画个红圈', () => {
      const r = parse('帮我画个红圈');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('circle');
    });
    it('在中间画一个大红圆', () => {
      const r = parse('在中间画一个大红圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.size).toBe('large');
        expect(r.position).toBe('center');
      }
    });
    it('在右下角画一个小的', () => {
      const r = parse('在右下角画一个小的');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.size).toBe('small');
        expect(r.position).toBe('bottom-right');
      }
    });
    it('画个黄三角', () => {
      const r = parse('画个黄三角');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('triangle');
        expect(r.fill).toBe('#FFFF00');
      }
    });
    it('来一个灰色矩形', () => {
      const r = parse('来一个灰色矩形');
      // 灰色不在同义词表，走默认
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('rect');
    });
    it('画一个白圆', () => {
      const r = parse('画一个白圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.fill).toBe('#FFFFFF');
    });
  });

  describe('DELETE', () => {
    it('删除', () => { expect(parse('删除').type).toBe('DELETE'); });
    it('删掉', () => { expect(parse('删掉').type).toBe('DELETE'); });
    it('擦掉', () => { expect(parse('擦掉').type).toBe('DELETE'); });
  });

  describe('UNDO / REDO', () => {
    it('撤销', () => { expect(parse('撤销').type).toBe('UNDO'); });
    it('撤回', () => { expect(parse('撤回').type).toBe('UNDO'); });
    it('重做', () => { expect(parse('重做').type).toBe('REDO'); });
    it('恢复', () => { expect(parse('恢复').type).toBe('REDO'); });
  });

  describe('CLEAR', () => {
    it('清空画布', () => { expect(parse('清空画布').type).toBe('CLEAR'); });
    it('全部删除', () => { expect(parse('全部删除').type).toBe('CLEAR'); });
  });

  describe('UNKNOWN', () => {
    it('跳一支舞', () => {
      expect(parse('跳一支舞').type).toBe('UNKNOWN');
    });
    it('今天天气怎么样', () => {
      expect(parse('今天天气怎么样').type).toBe('UNKNOWN');
    });
  });

  describe('CREATE 自动补全', () => {
    it('没有动词只说红色圆', () => {
      const r = parse('红色圆');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') {
        expect(r.shape).toBe('circle');
        expect(r.fill).toBe('#FF0000');
      }
    });
    it('只说三角形', () => {
      const r = parse('三角形');
      expect(r.type).toBe('CREATE');
      if (r.type === 'CREATE') expect(r.shape).toBe('triangle');
    });
  });
});
```

`tests/schema-guard.test.ts`——校验层 5+ 用例：

```ts
import { describe, it, expect } from 'vitest';
import { validate } from '@/lib/nlu/SchemaGuard';

describe('SchemaGuard', () => {
  it('合法 CREATE', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'circle', x: 100, y: 100, width: 100, height: 100 })).toBe(true);
  });
  it('非法 shape', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'hexagon', x: 0, y: 0, width: 100, height: 100 })).toBe(false);
  });
  it('非法 type', () => {
    expect(validate({ type: 'DANCE', rawText: '跳舞' } as any)).toBe(false);
  });
  it('UNKNOWN 不通过', () => {
    expect(validate({ type: 'UNKNOWN', rawText: 'xxx' })).toBe(false);
  });
  it('合法 UNDO', () => {
    expect(validate({ type: 'UNDO' })).toBe(true);
  });
  it('缺少必填字段', () => {
    expect(validate({ type: 'CREATE', id: 'x', shape: 'circle' } as any)).toBe(false);
  });
});
```

### Step 6.7 验收

- [ ] `npm test` 全部 30+ 测试用例绿色
- [ ] `npm run typecheck` 无错误
- [ ] 覆盖：CREATE（12 条）/ DELETE（3）/ UNDO（2）/ REDO（2）/ CLEAR（2）/ UNKNOWN（2）/ SchemaGuard（6）
- [ ] Normalizer 阶段 1（ASR 错字）生效：`画个园形→画个圆形`
- [ ] 同义词反向索引正确：`来一个蓝方块` → verb=CREATE, color=#0000FF, shape=rect
- [ ] SchemaGuard 拦截非法类型、非法 shape、缺字段

---

## 7. M2 剩余 ~ M5 概览（待逐个 PR 详细化）

### M2（PR-07 ~ PR-09）核心闭环

## 8. PR-07 · 语音识别（详细 step-by-step）

**目标**：点击麦克风 → 说话 → StatusBar 显示识别文本；静默 800ms 自动断句；非 Chrome 提示兼容。

### Step 8.1 创建 Voice Store

`lib/voice/useVoiceStore.ts`——Zustand 管理麦克风状态与识别文本：

```ts
import { create } from 'zustand';

export type VoiceStatus = 'idle' | 'listening' | 'processing' | 'error';

interface VoiceState {
  status: VoiceStatus;
  transcript: string;       // 当前识别文本（实时）
  finalText: string;        // 最终确认文本
  error: string | null;
  browserSupported: boolean;

  setStatus: (s: VoiceStatus) => void;
  setTranscript: (t: string) => void;
  setFinalText: (t: string) => void;
  setError: (e: string | null) => void;
  setBrowserSupported: (b: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  transcript: '',
  finalText: '',
  error: null,
  browserSupported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setFinalText: (finalText) => set({ finalText, transcript: finalText }),
  setError: (error) => set({ error, status: 'error' }),
  setBrowserSupported: (browserSupported) => set({ browserSupported }),
  reset: () => set({ status: 'idle', transcript: '', finalText: '', error: null }),
}));
```

### Step 8.2 SpeechRecognizer

`lib/voice/SpeechRecognizer.ts`——Web Speech API 封装：

```ts
const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null;

export interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export function createSpeechRecognizer(lang = 'zh-CN') {
  if (!SpeechRecognitionAPI) return null;
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;  // 单句模式
  recognition.maxAlternatives = 1;
  return recognition;
}

export function isBrowserSupported(): boolean {
  return !!SpeechRecognitionAPI;
}
```

### Step 8.3 MicController

`lib/voice/MicController.ts`——状态机 + 静默检测：

```ts
import { createSpeechRecognizer, isBrowserSupported, type SpeechCallbacks } from './SpeechRecognizer';

export type MicState = 'idle' | 'listening' | 'processing';

export class MicController {
  private recognition: any = null;
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
      this.callbacks.onError('麦克风权限被拒绝');
      return;
    }
    this.recognition = createSpeechRecognizer();
    if (!this.recognition) return;

    this.recognition.onresult = (e: any) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
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
    this.recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      this.callbacks.onError(`识别错误：${e.error}`);
    };
    this.recognition.onend = () => {
      if (this.state === 'listening') {
        // 还没拿到 final → 用当前 interim 兜底
        this.callbacks.onEnd();
      }
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

  getState(): MicState { return this.state; }
}
```

### Step 8.4 MicButton 组件

`components/MicButton.tsx`：

```tsx
'use client';

import { useCallback, useRef } from 'react';
import { MicController } from '@/lib/voice/MicController';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';

export default function MicButton() {
  const { status, setStatus, setTranscript, setFinalText, setError } = useVoiceStore();
  const micRef = useRef<MicController | null>(null);

  const handleClick = useCallback(() => {
    if (status === 'listening') return;

    setStatus('listening');
    setTranscript('');
    setFinalText('');

    micRef.current = new MicController({
      onInterim: (text) => setTranscript(text),
      onFinal: (text) => {
        setFinalText(text);
        setStatus('processing');
        // PR-08 会接入 NLU 管线
      },
      onError: (err) => setError(err),
      onEnd: () => setStatus('idle'),
    });
    micRef.current.start();
  }, [status, setStatus, setTranscript, setFinalText, setError]);

  const isActive = status === 'listening';

  return (
    <button
      onClick={handleClick}
      disabled={isActive}
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-md transition-colors ${
        isActive
          ? 'bg-red-500 text-white animate-pulse cursor-not-allowed'
          : 'bg-neutral-900 text-white hover:bg-neutral-700'
      }`}
    >
      <span>{isActive ? '●' : '🎤'}</span>
      {isActive ? '正在听…' : '开始讲话'}
    </button>
  );
}
```

### Step 8.5 集成到编辑器页

更新 `app/CanvasStageWrapper.tsx`：

```tsx
'use client';

import dynamic from 'next/dynamic';
import MicButton from '@/components/MicButton';
import StatusBar from '@/components/StatusBar';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';

const CanvasStage = dynamic(() => import('@/components/CanvasStage'), { ssr: false });

export default function CanvasStageWrapper() {
  const { status, transcript, finalText, error, browserSupported } = useVoiceStore();

  return (
    <main className="flex min-h-screen flex-col">
      <MicButton />
      {!browserSupported && (
        <div className="fixed top-4 left-4 z-50 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          建议使用 Chrome 或 Edge 浏览器以获得完整语音体验
        </div>
      )}
      <div className="flex-1 relative">
        <CanvasStage />
      </div>
      <StatusBar
        status={status}
        text={error || transcript || (finalText ? `听到：${finalText}` : undefined)}
      />
    </main>
  );
}
```

### Step 8.6 验收

- [ ] Chrome 打开 → 点"开始讲话" → 说话 → StatusBar 实时显示识别文本
- [ ] 停止说话 800ms → 自动完成，显示"听到：XXX"
- [ ] 非 Chrome 打开 → 顶部显示浏览器兼容提示
- [ ] typecheck + test 全过
## 9. PR-08 · 命令执行（详细 step-by-step）

**目标**：语音→归一化→解析→校验→执行→渲染，**首次端到端跑通**。说"画红色圆" → 画布上出现红圆。

### Step 9.1 CommandExecutor

`lib/canvas/CommandExecutor.ts`——执行 Command 操作 ObjectStore：

```ts
import { useCanvasStore } from './ObjectStore';
import type { CanvasObject } from './types';
import type { Command, CreateCommand } from '@/lib/nlu/types';

export function executeCommand(cmd: Command): string {
  const store = useCanvasStore.getState();

  switch (cmd.type) {
    case 'CREATE': {
      const obj = createCommandToObject(cmd);
      store.addObject(obj);
      store.selectObject(obj.id);
      return `已添加${obj.name || obj.shape}`;
    }
    case 'DELETE': {
      const targetId = resolveTarget(cmd.target, store.objects, store.selectedId);
      if (targetId) {
        store.removeObject(targetId);
        return '已删除';
      }
      return '未找到要删除的对象';
    }
    case 'UNDO':
      // PR-09 实现，暂占位
      return '撤销功能即将支持';
    case 'REDO':
      return '重做功能即将支持';
    case 'CLEAR':
      if (cmd.confirmed) {
        store.clearAll();
        return '已清空画布';
      }
      return '请说"确认"来清空画布';
    case 'EXPORT':
      exportAsPNG();
      return '已导出图片';
    case 'SELECT':
      return handleSelect(cmd, store.objects, store.selectObject);
    default:
      return '未知指令';
  }
}

function createCommandToObject(c: CreateCommand): CanvasObject {
  const index = useCanvasStore.getState().objects.length;
  return {
    id: c.id,
    name: c.text || `${c.shape}`,
    index,
    createdAt: Date.now(),
    batchId: c.batchId,
    shape: c.shape,
    x: c.x || 400, y: c.y || 250,
    width: c.width || 100, height: c.height || 100,
    fill: c.fill || '#FF0000',
    stroke: c.stroke || '#000000',
    strokeWidth: c.strokeWidth || 1,
    opacity: c.opacity || 1,
    rotation: 0,
    scaleX: 1, scaleY: 1,
    text: c.text,
    fontSize: c.fontSize || 24,
  };
}
```

### Step 9.2 SelectionManager

`lib/canvas/SelectionManager.ts`——7 级优先级选中：

```ts
import type { CanvasObject } from './types';
import type { TargetRef } from '@/lib/nlu/types';

// 优先级链解析 target → object id
export function resolveTarget(
  target: TargetRef,
  objects: CanvasObject[],
  currentId: string | null
): string | null {
  // 优先级 1: current
  if (target.type === 'current') return currentId;

  // 优先级 2: id
  if (target.type === 'id') {
    return objects.find(o => o.id === target.id)?.id || null;
  }

  // 优先级 3: recent
  if (target.type === 'recent') {
    if (objects.length === 0) return null;
    return objects[objects.length - target.n]?.id || objects[0]!.id;
  }

  // 优先级 4: shape
  if (target.type === 'shape') {
    return objects.find(o => o.shape === target.shape)?.id || null;
  }

  // 优先级 5: color
  if (target.type === 'color') {
    return objects.find(o => o.fill === target.color)?.id || null;
  }

  // 优先级 6: shape + color
  if (target.type === 'shapeAndColor') {
    return objects.find(o => o.shape === target.shape && o.fill === target.color)?.id || null;
  }

  // 优先级 7: index
  if (target.type === 'index') {
    return objects[target.index]?.id || null;
  }

  return null;
}

// SELECT 指令处理（带澄清计数）
export function handleSelect(
  cmd: { type: 'SELECT'; target: TargetRef },
  objects: CanvasObject[],
  select: (id: string | null) => void
): string {
  const id = resolveTarget(cmd.target, objects, null);
  if (id) {
    select(id);
    const obj = objects.find(o => o.id === id)!;
    return `已选中：${obj.name || obj.shape}`;
  }
  // 尝试形状+颜色匹配的候选计数
  return selectWithClarify(cmd.target, objects, select);
}

function selectWithClarify(
  target: TargetRef,
  objects: CanvasObject[],
  select: (id: string | null) => void
): string {
  if (target.type === 'color') {
    const matches = objects.filter(o => o.fill === target.color);
    if (matches.length > 1) return `画布中有 ${matches.length} 个 ${target.color} 色对象，请说明选哪一个`;
  }
  if (target.type === 'shape') {
    const matches = objects.filter(o => o.shape === target.shape);
    if (matches.length > 1) return `画布中有 ${matches.length} 个 ${target.shape}，请说明选哪一个`;
  }
  return '未找到匹配对象';
}
```

### Step 9.3 Pipeline 串联

`lib/nlu/Pipeline.ts`——识别文本 → 归一化 → 规则解析 → 校验 → 执行：

```ts
import { normalize, analyze } from './Normalizer';
import { parse } from './RuleEngine';
import { validate } from './SchemaGuard';
import { executeCommand } from '@/lib/canvas/CommandExecutor';
import { useVoiceStore } from '@/lib/voice/useVoiceStore';

export function processInput(rawText: string): string {
  const store = useVoiceStore.getState();
  const normalized = normalize(rawText);
  const cmd = parse(normalized);

  if (!validate(cmd)) {
    store.setError('指令校验未通过');
    return `"${rawText}" → 暂不支持`;
  }

  if (cmd.type === 'UNKNOWN') {
    return `"${rawText}" → 暂不支持该指令，请改用基础指令`;
  }

  const result = executeCommand(cmd);
  store.reset();
  return result;
}
```

### Step 9.4 连接语音到管线

更新 `components/MicButton.tsx` 的 onFinal 回调：

```ts
onFinal: (text) => {
  setFinalText(text);
  setStatus('processing');
  const msg = processInput(text);
  setStatus('idle');  // 短暂显示结果后回到 idle
},
```

### Step 9.5 验收

- [ ] 浏览器打开 → 登录 → 点麦克风 → 说"画一个红色的圆" → 画布出现红圆
- [ ] 说"画个蓝色矩形" → 蓝矩形出现
- [ ] 说"左上角画绿色三角形" → 绿三角出现在左上角
- [ ] 说"删除" → 当前选中被删除
- [ ] 说"撤销" → 显示占位提示（PR-09 实现）
- [ ] typecheck + test 全绿
## 10. PR-09 · 全局操作（详细 step-by-step）

**目标**：撤销/重做按 batchId 整批回退；连接词拆句；清空需二次确认；导出缩略图。

### Step 10.1 CommandHistory

`lib/canvas/CommandHistory.ts`——shapes 快照历史栈：

```ts
import type { CanvasObject } from './types';

interface HistoryEntry {
  batchId: string;
  rawText: string;
  before: CanvasObject[];
  after: CanvasObject[];
  createdAt: number;
}

let history: HistoryEntry[] = [];
let undone: HistoryEntry[] = [];

export function pushHistory(batchId: string, rawText: string, before: CanvasObject[], after: CanvasObject[]) {
  history.push({ batchId, rawText, before, after, createdAt: Date.now() });
  undone = [];
  // 限制 50 步
  if (history.length > 50) history.shift();
}

export function undo(): CanvasObject[] | null {
  const entry = history.pop();
  if (!entry) return null;
  undone.push(entry);
  return entry.before;
}

export function redo(): CanvasObject[] | null {
  const entry = undone.pop();
  if (!entry) return null;
  history.push(entry);
  return entry.after;
}

export function clearHistory() {
  history = [];
  undone = [];
}
```

### Step 10.2 BatchSplitter

`lib/nlu/BatchSplitter.ts`——连接词拆句：

```ts
const CONNECTORS = /(和|还有|然后|再画|接着|另外)/;

export function splitText(rawText: string): string[] {
  if (!CONNECTORS.test(rawText)) return [rawText];
  const parts = rawText.split(CONNECTORS).filter(s => s && !CONNECTORS.test(s)).map(s => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [rawText];
}
```

### Step 10.3 更新 Pipeline 支持 BATCH + 撤销 + 清空确认

核心改动：Pipeline.processInput 在每次执行前保存快照；CLEAR 进入确认状态后等待"确认"。

### Step 10.4 更新 CommandExecutor 集成 History

executeCommand 改为接收 before snapshot，创建 CREATE 后保存 after snapshot。

### Step 10.5 验收

- [ ] 画 3 个对象 → "撤销" → 最后一个消失 → 再说"撤销" → 倒数第二个消失
- [ ] "画一个红圆和一个蓝方块" → 拆为 2 个 CREATE → 同 batchId → "撤销" → 2 个一起消失
- [ ] "重做" → 刚撤销的回来
- [ ] "清空画布" → 提示"请说确认" → 说"确认" → 清空
- [ ] "导出图片" → 浏览器下载 PNG
- [ ] typecheck + test 全绿

### M3（PR-10 ~ PR-11）作品 + Mock

## 11. PR-10 · 作品管理（详细 step-by-step）

**目标**：登录后说"保存为我的第一幅画"→作品列表出现→"打开我的作品"→"打开第一幅"→画布加载继续编辑。

### Step 11.1 Drawings CRUD API

`app/api/drawings/route.ts`——GET 列表 + POST 新建：

- 受 Auth Guard 保护，requireUser
- PUT `/api/drawings/:id`——保存（更新 canvas_json + thumbnail）
- DELETE——删除作品 + 缩略图文件
- 所有路由声明 `export const runtime = 'nodejs'`

### Step 11.2 RuleEngine 扩展 PROJECT_* 指令

新增 6 个 L1/L2 作品指令解析。

### Step 11.3 Pipeline 处理作品指令

在 Pipeline 中增加分支：作品类指令调 API，返回结果。

### Step 11.4 作品列表页接入 API

`app/drawings/page.tsx`——客户端获取列表、渲染缩略图网格。

### Step 11.5 验收

- [ ] 保存 3 件作品，数据库有记录 + thumbnails/ 有 PNG
- [ ] 说"打开我的作品"→列表显示缩略图
- [ ] 说"打开第一幅"→画布加载继续编辑
- [ ] 说"删除这个作品"→确认后消失
- [ ] typecheck + test 全绿
- **PR-11 Mock 场景**：10 个场景 JSON、MockSceneService、命中冲突解决、Vitest 校验所有子命令通过 SchemaGuard。

### M4（PR-12）可选 LLM

- **PR-12 LLM 增强**：API 代理（Anthropic SDK + prompt + Schema 校验 + 2.5s 超时）、LLMClient 前端调用（3s 总超时）、ClarifyManager 多轮上下文、降级提示。

### M5（PR-13 ~ PR-14）打磨与交付

- **PR-13 UI 打磨**：HelpOverlay、CommandLog 侧栏、错误样式统一、麦克风权限引导、TTS 反馈。
- **PR-14 文档与演示**：填齐设计文档"实现状态"列、写完整 README、录屏。

---

## 6. 通用约定（每个 PR 都要遵循）

### 6.1 提交前必跑

```bash
npm run typecheck && npm test && npm run dev   # dev 起来手测核心流程
```

### 6.2 PR 描述模板

```markdown
## 标题
{动词}+{对象}：一句话

## 功能描述
- 新增什么 / 解决什么
- 用户怎么用（举例）

## 实现思路
- 技术选型
- 关键文件 / 函数
- 数据存储（如有）

## 测试方式
- [ ] 单元：`npm test -- xxx`
- [ ] 手工：步骤 1/2/3

## 依赖与来源
- 新增第三方库：xxx 或"无"
- 复用过往代码：xxx 或"无"

## 自检
- [ ] 单一职责
- [ ] 无中间件引入
- [ ] 无敏感信息（.env.local / key）
- [ ] main 合并后 npm run dev 可启动
```

### 6.3 commit message 风格

- `feat: 新增 X` / `fix: 修复 Y` / `chore: 调整 Z` / `docs: 更新文档` / `test: 补 X 测试`
- 一次 commit 也聚焦一件事

### 6.4 红线（违反必停）

- ❌ 引入 MySQL / Redis / Mongo / Kafka / Supabase 等中间件
- ❌ 提交 `.env.local` / API key
- ❌ 一个 PR 塞多个不相关功能
- ❌ 合并后 main 跑不起来
- ❌ 在最后一天突击导入大量代码

---

## 7. 当前可立即开工的事项

按本计划，**PR-01 已经具备所有信息可以立即开始**：

1. 创建 `app/`、`tests/` 等目录
2. 写入 7 个根配置文件（package.json / tsconfig.json / next.config.js / tailwind.config.js / postcss.config.js / vitest.config.ts / .gitignore）
3. 写入 `app/layout.tsx`、`app/page.tsx`、`app/globals.css`、`tests/smoke.test.ts`、`.env.local.example`、`README.md`（占位）、`storage/thumbnails/.gitkeep`
4. `npm install && npm run dev && npm test`
5. `git init && git add . && git commit && git push`
6. 创建 PR-01，按 6.2 模板写描述

完工后告诉我，我们继续 PR-02。
