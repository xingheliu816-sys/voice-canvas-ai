# AI 语音绘图工具 · 设计文档（Design Spec）

- **项目名**：voice-canvas-ai
- **赛题方向**：AI 语音绘图工具——纯语音控制的绘图工具
- **版本**：v1.0（设计阶段）
- **日期**：2026-06-12
- **作者**：单人独立完成

---

## 0. 概述

本项目是一款基于浏览器的 **AI 语音绘图工具**。用户通过自然语言语音指令完成绘图、编辑、保存、管理作品全流程，**不依赖鼠标键盘**（除浏览器麦克风授权所需的一次性手势）。

### 0.1 三句话价值主张

- **听得懂**：规则引擎 + LLM 双轨，简单指令秒响应，复杂指令也能拆。
- **不掉链**：网络断了、key 没填、识别错了都有兜底，永远能继续画。
- **可沉淀**：作品可保存、回看、继续编辑，不是一次性玩具。

### 0.2 整体策略

- **本地规则优先 + 预置 Mock 演示 + 可选 LLM 增强**
- **零中间件**：SQLite 单文件 + 本地文件系统，评委 clone 即跑
- **API Key 安全**：仅在 `.env.local` 中，服务端代理调用，前端永不暴露

### 0.3 关于"纯语音"的边界说明

> 题目要求"用户不能使用鼠标或键盘"。本项目对"纯语音"做如下定义：
>
> **"纯语音控制"指的是绘图创作过程中不依赖鼠标键盘。** 应用启动后需要一次性点击"开始监听"按钮（或按空格唤醒）以授权浏览器麦克风权限——这是浏览器安全策略限制（用户手势才能调用麦克风），不是产品设计选择。一旦进入监听状态，所有绘图、编辑、撤销、保存均通过语音完成。

---

## 1. 需求分析

### 1.1 用户角色

| 角色 | 描述 | 关键诉求 |
|------|------|---------|
| 访客 | 未登录用户 | 试用核心功能、看 Mock 演示场景 |
| 注册用户 | 有账号的用户 | 保存作品、管理作品、查看历史 |
| 评委 | 比赛评分者 | clone 即跑、看完整功能、可选填 key 体验 LLM |

### 1.2 功能性需求（FR）

#### FR-1 语音输入与识别

- **FR-1.1** 浏览器麦克风采集，Web Speech API 实时识别（中文）
- **FR-1.2** 静默检测（VAD-like），停顿 800ms 自动结束本句
- **FR-1.3** 识别结果实时回显（"听到："），用户能看到识别文本
- **FR-1.4** Web Speech 不可用时降级到云端 ASR 代理；都失败时显示文本输入框（应急兜底，不计入"纯语音"主流程）

#### FR-2 指令理解（NLU）

- **FR-2.1** **规则引擎**——本地正则 + 同义词表，覆盖基础指令
  - 动词同义词：画/绘制/添加/来一个 → `CREATE`
  - 颜色同义词：红色/大红/朱红 → `#FF0000`
  - 形状同义词：圆/圆形/圆圈 → `circle`
  - 位置同义词：左上/左上角/西北 → `top-left`
- **FR-2.2** **连接词拆句**——"画一个红圆和一个蓝方块" → 拆为两条指令
- **FR-2.3** **LLM 增强**（可选）——填了 key 后，规则未命中时自动调用 LLM 走结构化输出
- **FR-2.4** **Mock 场景**——预置 5-10 个复合场景脚本（"画太阳和三棵树"、"画房子"、"画笑脸"、"画田园风光"等），无 key 也能演示复杂拆解

#### FR-3 绘图能力

- **FR-3.1** 基础图形——圆、矩形、三角形、直线、多边形
- **FR-3.2** 文字——指定内容、字号、颜色
- **FR-3.3** 样式属性——填充色、描边色、描边粗细、透明度
- **FR-3.4** 位置语言——九宫格（左上/正中/右下…）、相对位置（"在 X 下面"）、具体坐标

#### FR-4 对象编辑

- **FR-4.1** 选中——"选中那个圆"、"选中第二个对象"、"选中红色的"
- **FR-4.2** 变换——移动、放大缩小、旋转
- **FR-4.3** 修改——改颜色、改大小、改位置
- **FR-4.4** 删除——"删除那个圆"

#### FR-5 全局操作

- **FR-5.1** 撤销 / 重做（历史栈，至少 50 步）
- **FR-5.2** 清空画布（带二次语音确认）
- **FR-5.3** 导出 PNG
- **FR-5.4** **保存作品到当前登录账号**，保存内容包括：作品标题、画布 JSON、缩略图 PNG、创建时间、更新时间。未登录用户保存时引导登录。

#### FR-6 反馈与问答

- **FR-6.1** TTS 语音反馈（"已添加红色圆"、"未理解指令，请重试"）
- **FR-6.2** 状态条文字提示同步显示
- **FR-6.3** 语音问答——"画布上有几个对象"、"现在选中的是什么"

#### FR-7 用户系统

- **FR-7.1** 注册（用户名 + 密码，密码 bcrypt 哈希）
- **FR-7.2** 登录（session token，存 HttpOnly Cookie）
- **FR-7.3** 登录态保持——**使用 HttpOnly Cookie 保存登录态，默认有效期 7 天，避免前端 JavaScript 直接读取 token**。Cookie 配置 `HttpOnly + SameSite=Lax + Secure（生产环境）`，防 XSS 窃取。

#### FR-8 作品管理

- **FR-8.1** 保存——名称、画布 JSON、缩略图 PNG、创建时间、更新时间
- **FR-8.2** 列表——按更新时间倒序，显示缩略图
- **FR-8.3** 打开——加载 JSON 到 Konva，继续编辑
- **FR-8.4** 删除、重命名
- **FR-8.5** 作品归属用户，未登录不可保存

#### FR-9 指令历史（可选）

- **FR-9.1** 记录每条语音指令的原文、解析结果、执行状态
- **FR-9.2** 用户可在"历史"页查看（可由语音"打开历史"触发）

### 1.3 非功能性需求（NFR）

| 类别 | 指标 | 目标值 |
|------|------|--------|
| 延迟 | 规则路径端到端 | < 800ms |
| 延迟 | LLM 路径端到端 | < 2s |
| 延迟 | 超时降级阈值 | 3s（超时改走规则或返回错误） |
| 准确率 | 安静环境中文指令 | > 90% |
| 容错 | 未识别指令的引导提示 | 100% 覆盖 |
| 兼容性 | 浏览器 | Chrome / Edge 最新版（Web Speech 限制） |
| 启动 | 评委 clone 后启动命令数 | 1 条（`npm run dev`） |
| 部署 | 零中间件、零外部数据库 | 强制 |

### 1.4 边界与非目标（YAGNI）

**本期不做**：

- ❌ 移动端适配（桌面浏览器优先）
- ❌ 多人协作画板
- ❌ 矢量精修工具（贝塞尔编辑、节点操作）
- ❌ 上传图片素材
- ❌ AI 文生图（这是另一个赛题）
- ❌ 多语言（仅中文）
- ❌ 复杂图层管理（仅扁平对象列表）

### 1.5 验收标准（DoD）

- ✅ 评委 clone 后无任何配置可启动并体验基础绘图（不填 key）
- ✅ 5 个 Mock 场景可在无 key 状态下完整演示复杂指令拆解
- ✅ 用户可注册、登录、保存至少 3 个作品、打开继续编辑、删除作品
- ✅ 规则指令端到端延迟 < 800ms（演示视频中可见时间戳）
- ✅ 网络断开时仍可继续绘图（规则引擎离线可用）
- ✅ 录屏中至少展示一次"识别错误后用户重试"的容错场景

---

## 2. 指令能力清单与覆盖矩阵

### 2.1 指令分类总览

把所有指令按"动作-对象-修饰"三段式拆分。规则引擎本质是一个解析器，把自然语言映射成结构化 `Command` 对象。

```ts
// 画布对象基础元数据（用于精准定位）
type CanvasObject = {
  id: string;          // 唯一标识，如 "obj_a3f9c2"
  name?: string;       // 可选语义名："太阳"、"左边的圆"
  index: number;       // 创建顺序，0 起
  createdAt: number;   // 时间戳，用于"最近创建"定位
  batchId?: string;    // 同批次绑定，用于按批撤销
  shape: ShapeKind;
  style: Style;
  transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number };
};

// 规范化后的内部 Command 表示
type Command =
  | { type: 'CREATE'; id: string; shape: ShapeKind; style?: Style; position?: Position; text?: string; name?: string }
  | { type: 'SELECT'; target: TargetRef }
  | { type: 'MODIFY'; target: TargetRef; changes: Partial<Style | Position | Size> }
  | { type: 'MOVE';   target: TargetRef; delta: Position | RelativeMove }
  | { type: 'DELETE'; target: TargetRef }
  | { type: 'UNDO' | 'REDO' | 'CLEAR' | 'EXPORT' }
  | { type: 'QUERY';  question: 'COUNT' | 'CURRENT_SELECTION' | 'DESCRIBE' }
  | { type: 'PROJECT_SAVE' }
  | { type: 'PROJECT_SAVE_AS'; title: string }
  | { type: 'PROJECT_LIST' }
  | { type: 'PROJECT_OPEN'; recent?: number; title?: string }
  | { type: 'PROJECT_RENAME'; title: string }
  | { type: 'PROJECT_DELETE'; target: 'current' | { title: string } }
  | { type: 'BATCH'; batchId: string; commands: Command[] };

// 命令白名单（用于 LLM 输出校验）
const COMMAND_WHITELIST = [
  'CREATE', 'SELECT', 'MODIFY', 'MOVE', 'DELETE',
  'UNDO', 'REDO', 'CLEAR', 'EXPORT',
  'QUERY', 'BATCH',
  'PROJECT_SAVE', 'PROJECT_SAVE_AS', 'PROJECT_LIST',
  'PROJECT_OPEN', 'PROJECT_RENAME', 'PROJECT_DELETE'
] as const;
```

**关键设计**：

- 每个 CREATE 命令在生成时分配 `id`、`name`、`createdAt`、`index`，写入对象元数据，供后续 SELECT/MODIFY 定位
- 一次语音输入若拆解为多条命令，统一打上同一个 `batchId`；撤销时按 `batchId` 整批回退（用户体感：说一句话画了 5 个对象，"撤销"一次性消失）

### 2.2 未知指令处理与降级机制

这是整个 NLU 层的**核心管线**，所有指令都必须走完这条管线才能执行。

**处理顺序（5 阶段）**：

1. **文本归一化**：原始 ASR 文本进入归一化器，做三件事：
   - 同义词替换（见 2.6 表）
   - 常见 ASR 错字修正（"园形→圆形"、"矩型→矩形"、"三角型→三角形"）
   - 口语化映射（"帮我画个"→"画"、"来一个"→"画"、"加上"→"画"）

2. **本地规则解析**：归一化后的文本进入规则引擎。能匹配 → 生成标准 `Command` → 直接执行（< 800ms 路径）。

3. **目标歧义澄清**：规则匹配成功但**引用不明**时（如"删除红色的"但有多个红色对象），不执行命令，进入**澄清状态**：
   - TTS + 状态条："画布中有 3 个红色对象，请说'第一个红色圆形'或'全部红色对象'"
   - 等待下一句语音输入做二次匹配

4. **LLM 增强（可选）**：规则未命中且**系统已配置 LLM API Key** 时，调用服务端 LLM 代理：
   - Prompt 要求 LLM **必须返回符合 Command Schema 的 JSON**
   - 返回 JSON 进入校验流程（见阶段 5）

5. **命令白名单校验（强制安全屏障）**：所有 LLM 返回结果**必须通过**以下两道校验：
   - Schema 校验：JSON 结构符合 `Command` 类型
   - 白名单校验：`type` 必须在 `COMMAND_WHITELIST` 中
   - 任一校验失败 → **拒绝执行**，TTS 提示："当前版本不支持该操作"

**降级出口**：

- 未配置 LLM Key + 规则未命中 → TTS："暂不支持该指令，请改用基础指令，例如'画一个红色圆'"
- LLM 调用超时（>3s） → 自动降级到规则引擎结果（若有）或返回错误
- LLM 返回非法命令 → 拒绝执行

**原则总结**：先规则归一化，再本地解析，必要时调用可选 LLM，**最终必须通过命令白名单校验**——无法确认或不支持的指令**一律不执行**。

### 2.3 指令能力清单（计划支持 / 实际实现 / 未完成原因）

> L1 = 必做(Must)、L2 = 应做(Should)、L3 = 选做(Could)。实现阶段每完成一项标 ✅，未完成标 ⏸ 并补"未完成原因"列。

#### 2.3.1 创建类（CREATE）

| 优先级 | 指令样例 | 解析为 | 实现状态 | 未完成原因 |
|--------|---------|--------|---------|------------|
| L1 | "画一个红色的圆" | `CREATE circle, fill=red, pos=center` | ✅ 已实现 | - |
| L1 | "画个蓝色矩形" | `CREATE rect, fill=blue` | ✅ 已实现 | - |
| L1 | "在左上角画一个绿三角" | `CREATE triangle, fill=green, pos=top-left` | ✅ 已实现 | - |
| L1 | "画一条直线" | `CREATE line, default-style` | ✅ 已实现 | - |
| L1 | "写一个'你好'" | `CREATE text, content=你好` | ✅ 已实现 | - |
| L2 | "在(100,200)画一个圆" | `CREATE circle, pos=(100,200)` | ✅ 已实现 | - |
| L2 | "画一个大的红圆" | `CREATE circle, size=large, fill=red` | ✅ 已实现 | - |
| L2 | "画一个 0.5 透明度的方块" | `CREATE rect, alpha=0.5` | ✅ 已实现 | - |
| L3 | "在太阳下面画两棵树" | `BATCH [SELECT sun, CREATE tree×2 near-below]` | ⏸ 部分实现 | 相对位置 SELECT + CREATE 链路复杂，规则引擎仅覆盖连接词拆分 |
| L3 | "画一只小猫" | LLM 兜底 → 失败时降级 | ✅ LLM路径已实现 | 无 Key 时降级为提示"暂不支持具象图形" |
| L3 | "画一只小猫" | LLM 兜底 → 失败时降级 | ✅ 已实现 | - |

#### 2.3.2 选中类（SELECT）—— 选择优先级链

**SELECT 解析优先级（高到低）**：

```
1. 精确 id / 当前选中对象（"选中刚才那个"、"选中 obj_xx"）
2. 最近创建对象（"选中刚画的"）
3. 形状 + 颜色组合（"选中红色的圆"）
4. 位置描述（"选中左边那个"）
5. 序号描述（"选中第二个"）
6. 多条件筛选（"选中左上角的红色圆"）
7. 无法确定 → 进入澄清状态
```

| 优先级 | 指令样例 | 解析为 | 实现状态 | 未完成原因 |
|--------|---------|--------|---------|------------|
| L1 | "选中那个圆" | `SELECT shape=circle` | ✅ 已实现 | - |
| L1 | "选中红色的" | `SELECT fill=red` | ✅ 已实现 | - |
| L1 | "选中刚才那个" / "选中刚画的" | `SELECT recent=1` | ✅ 已实现 | - |
| L2 | "选中第二个" | `SELECT index=1` | ✅ 已实现 | - |
| L2 | "选中左边那个" | `SELECT pos=left-most` | ✅ 已实现 | - |
| L2 | "全选" | `SELECT all` | ✅ 已实现 | - |
| L3 | "选中左上角的红色圆" | 多条件 AND | ⏸ 未实现 | 多条件组合选择优先级链复杂度高，一期仅单条件匹配 |

**澄清示例**：

```
用户：选中红色的
系统：画布中有 3 个红色对象，请说"第一个红色圆形"或"全部红色对象"
用户：第一个红色圆形
系统：[执行 SELECT shape=circle AND fill=red AND index=0]
```

#### 2.3.3 修改类（MODIFY / MOVE）

| 优先级 | 指令样例 | 解析为 | 实现状态 | 未完成原因 |
|--------|---------|--------|---------|------------|
| L1 | "改成红色" | `MODIFY current, fill=red` | ✅ 已实现 | - |
| L1 | "放大一点" | `MODIFY current, scale=1.2` | ✅ 已实现 | - |
| L1 | "缩小" | `MODIFY current, scale=0.7` | ✅ 已实现 | - |
| L1 | "向右移动" | `MOVE current, dx=+50` | ✅ 已实现 | - |
| L2 | "向右移动 100" | `MOVE current, dx=+100` | ✅ 已实现 | - |
| L2 | "旋转 45 度" | `MODIFY current, rotate=45` | ✅ 已实现 | - |
| L2 | "描边变粗" | `MODIFY current, strokeWidth=+2` | ✅ 已实现 | - |
| L3 | "把红色圆都变蓝" | `BATCH [SELECT ALL, MODIFY ALL]` | ⏸ 未实现 | 批量多对象修改需 SELECT ALL + 批量 MODIFY，一期仅单对象操作 |

#### 2.3.4 删除与全局

| 优先级 | 指令样例 | 解析为 | 二次确认 | 实现状态 | 未完成原因 |
|--------|---------|--------|---------|---------|------------|
| L1 | "删除" / "删除这个" | `DELETE current` | 否（可撤销） | ✅ 已实现 | - |
| L1 | "撤销" / "取消" | `UNDO`（按 batchId 整批回退） | 否 | ✅ 已实现 | - |
| L1 | "重做" | `REDO` | 否 | ✅ 已实现 | - |
| L1 | "清空画布" / "全部删除" | `CLEAR` | **必须** | ✅ 已实现 | - |
| L1 | "导出" / "下载图片" | `EXPORT` | 否 | ✅ 已实现 | - |

#### 2.3.5 问答与反馈

| 优先级 | 指令样例 | 解析为 | 实现状态 | 未完成原因 |
|--------|---------|--------|---------|------------|
| L2 | "现在画布上有几个对象" | `QUERY COUNT` → TTS | ✅ 已实现 | - |
| L2 | "当前选中的是什么" | `QUERY CURRENT_SELECTION` → TTS | ✅ 已实现 | - |
| L3 | "描述一下画布" | `QUERY DESCRIBE`（需 LLM） | ⏸ 未实现 | QUERY DESCRIBE 需 LLM 自然语言生成画布描述，一期优先基础问答 |

#### 2.3.6 作品管理类（PROJECT）

| 优先级 | 指令样例 | 解析为 | 二次确认 | 实现状态 | 未完成原因 |
|--------|---------|--------|---------|---------|------------|
| L1 | "保存作品" / "保存一下" | `PROJECT_SAVE` | 否 | ✅ 已实现 | - |
| L1 | "保存为我的第一幅画" | `PROJECT_SAVE_AS title=...` | 否 | ✅ 已实现 | - |
| L1 | "打开我的作品" / "我的作品" | `PROJECT_LIST` | 否 | ✅ 已实现 | - |
| L1 | "打开上一幅作品" | `PROJECT_OPEN recent=1` | 否 | ✅ 已实现 | - |
| L2 | "打开春天" | `PROJECT_OPEN title=春天` | 否 | ✅ 已实现 | - |
| L2 | "重命名为春天" | `PROJECT_RENAME title=春天` | 否 | ✅ 已实现 | - |
| L1 | "删除这个作品" | `PROJECT_DELETE target=current` | **必须** | ✅ 已实现 | - |

**关键约束**：所有 PROJECT_* 指令要求**用户已登录**。未登录时 TTS："请先登录后再保存作品，游客可临时体验绘图功能"。

#### 2.3.7 复合场景（BATCH）

**统一约束**：一次语音输入产生的多条命令，无论走哪条路径，**必须共享同一个 `batchId`**。UNDO 默认按 batch 整批回退。

**路径 A：规则引擎拆句**
触发关键词："和"、"还有"、"然后"、"再"、"接着"、"另外"

- "画一个红圆和一个蓝方块" → `BATCH [CREATE red-circle, CREATE blue-rect]`

**路径 B：Mock 场景脚本**（无 key 也能演示）
预置 5-10 个高频场景，本地 JSON 存放：

| 场景关键词 | 拆解为 | 元素数 | 实现状态 |
|---------|--------|--------|---------|
| "画个笑脸" | 黄圆 + 两眼 + 弧线嘴 | 4 | ⏸ 待开发 |
| "画个房子" | 矩形墙 + 三角顶 + 门 + 窗 | 4 | ⏸ 待开发 |
| "画田园风光" | 蓝天 + 太阳 + 远山 + 三树 + 草地 | 7 | ⏸ 待开发 |
| "画太阳" | 圆 + 8 条放射线 | 9 | ⏸ 待开发 |
| "画雪人" | 三白圆 + 黑眼 + 胡萝卜鼻 | 6 | ⏸ 待开发 |
| "画交通灯" | 黑矩形 + 三圆 | 4 | ⏸ 待开发 |
| "画爱心" | 心形 path | 1-3 | ⏸ 待开发 |
| "画彩虹" | 7 条同心弧 | 7 | ⏸ 待开发 |
| "画圣诞树" | 三三角 + 树干 + 星 | 5 | ⏸ 待开发 |
| "画太极图" | 阴阳 path | 2-3 | ⏸ 待开发 |

**路径 C：LLM 拆解**（填 key 后）
自由表达 → LLM 返回 BATCH JSON → **Schema + 白名单校验** → 顺序执行

### 2.4 容错与重试矩阵

| 错误类型 | 触发条件 | 处理策略 |
|---------|---------|---------|
| 识别歧义 | ASR 文本规则无命中、LLM 也低置信 | TTS："没听清，您是想…？"+ 列出 top 2 候选 |
| 指令不完整 | 缺关键参数（"画一个"没说形状） | TTS："您想画什么形状？" 进入对话式补全 |
| 引用不明 | "选中那个" 但无候选 / 多候选 | TTS："请告诉我选哪一个，比如'选红色的'" |
| 同义词缺失 | 用户用了规则表外的词 | 启用 LLM 兜底；无 key 则 TTS 引导用同义词 |
| 网络失败 | LLM 调用超时（>3s） | 自动降级到规则引擎，TTS："网络慢，先用本地理解" |
| 执行失败 | 形状参数非法（尺寸超画布） | 自动夹紧到合法范围，TTS 静默反馈 |
| 撤销提示 | "不是这个" / "重来" | UNDO 最后一个 batch，TTS："已撤销，请重试" |
| 危险操作确认 | CLEAR / PROJECT_DELETE | 必须语音二次确认（"说'确认'继续"） |
| 未知指令 | 不在规则列表且无法归一化 | 有 LLM Key 时尝试解析；无 Key 或校验失败时 TTS："暂不支持，请改用基础指令" |
| 非法命令 | LLM 返回白名单外的动作 | 拒绝执行，TTS："当前版本不支持该操作" |
| 浏览器不支持 | 非 Chrome/Edge 或无 Web Speech | 提示更换浏览器，启用"文本输入 Debug 模式" |
| 麦克风权限被拒 | 用户拒绝授权 | 提示"请在浏览器设置中开启麦克风权限" |
| 未登录保存 | 未登录时说"保存作品" | TTS："请先登录后再保存作品" |
| 数据库保存失败 | SQLite 写入异常 | TTS："保存失败，请重试"，记录错误日志 |

### 2.5 同义词与归一化表

实现上是 `lib/synonyms/synonyms.json`，规则引擎启动时加载。**特别加入 ASR 常见错字组**。

> **关于动词聚合标识**：`verbs` 字段中的 `CREATE` / `DELETE` / `UNDO` / `REDO` / `CLEAR` / `SAVE` 是**归一化阶段的中间标识符**，用于把同义动词聚合成一个意图 token。最终 Command type 由规则引擎根据上下文决定——例如 `SAVE` 词命中后，是否带"为 XX"决定生成 `PROJECT_SAVE` 还是 `PROJECT_SAVE_AS`。

```json
{
  "verbs": {
    "CREATE": ["画", "绘制", "添加", "来一个", "新建", "做一个", "帮我画", "加上"],
    "DELETE": ["删除", "删掉", "去掉", "移除", "擦掉"],
    "UNDO":   ["撤销", "撤回", "回退", "退回", "取消", "返回上一步", "上一步"],
    "REDO":   ["重做", "恢复", "下一步"],
    "CLEAR":  ["清空", "全部清除", "重新开始", "全部删除"],
    "SAVE":   ["保存", "存一下", "保存作品", "保存一下"]
  },
  "shapes": {
    "circle":   ["圆", "圆形", "圆圈", "圆球", "园形", "原型", "圈"],
    "rect":     ["矩形", "方块", "方形", "长方形", "方框", "矩型"],
    "triangle": ["三角", "三角形", "三角块", "三角型"],
    "line":     ["线", "直线", "横线", "竖线"],
    "text":     ["文字", "字", "写", "写字"]
  },
  "colors": {
    "#FF0000": ["红", "红色", "大红", "朱红", "正红"],
    "#0000FF": ["蓝", "蓝色", "天蓝", "湛蓝", "天蓝色"],
    "#00FF00": ["绿", "绿色", "草绿", "浅绿"],
    "#000000": ["黑", "黑色"],
    "#FFFFFF": ["白", "白色"],
    "#FFFF00": ["黄", "黄色", "金黄色"]
  },
  "positions": {
    "top-left":     ["左上", "左上角", "西北"],
    "top-right":    ["右上", "右上角", "东北"],
    "center":       ["中间", "正中", "中央", "中心"],
    "bottom-left":  ["左下", "左下角", "西南"],
    "bottom-right": ["右下", "右下角", "东南"]
  },
  "sizes": {
    "large":  ["大", "大的", "大点", "大一点"],
    "medium": ["中等", "正常"],
    "small":  ["小", "小的", "小点", "小一点"]
  }
}
```

### 2.6 测试用例约定

**强制约定**：

- 每个 **L1** 指令至少提供 **2 条**测试语句（含错字 / 口语版本）
- 每个 **L2** 指令至少提供 **1 条**测试语句
- 每个 **L3** Mock 场景提供 **1 条** mock 测试

**测试用例文件**：`tests/parser.test.ts`，覆盖归一化 + 规则解析两层。

**示例**：

```ts
// L1 - CREATE
expect(parse("画一个红色圆形"))
  .toMatchObject({ type: 'CREATE', shape: 'circle', style: { fill: '#FF0000' }, position: 'center' });
expect(parse("帮我画个红圈"))
  .toMatchObject({ type: 'CREATE', shape: 'circle', style: { fill: '#FF0000' } });
expect(parse("画个园形"))  // ASR 错字
  .toMatchObject({ type: 'CREATE', shape: 'circle' });

// L1 - MODIFY
expect(parse("把它变大一点"))
  .toMatchObject({ type: 'MODIFY', target: 'current', changes: { scale: 1.2 } });

// L3 - BATCH
expect(parse("画一个红圆和一个蓝方块"))
  .toMatchObject({
    type: 'BATCH',
    batchId: expect.any(String),
    commands: [
      { type: 'CREATE', shape: 'circle', style: { fill: '#FF0000' } },
      { type: 'CREATE', shape: 'rect',   style: { fill: '#0000FF' } }
    ]
  });

// 未知指令
expect(parse("跳一支舞")).toMatchObject({ type: 'UNKNOWN' });
```

---

## 3. 系统架构与模块划分

### 3.1 架构定位

> **本项目采用 Next.js 全栈一体架构。** 前端页面、API Routes、SQLite 本地数据库均在同一个 Next.js 项目中运行，单一进程启动（`npm run dev`），无独立后端服务、无外部数据库、无任何中间件依赖。
>
> 这不是"前后端分离 + 独立 Flask/Spring Boot 后端"的形态。所有服务端逻辑通过 Next.js API Routes 实现。

### 3.2 整体架构图

```
┌────────────────────────────────────────────────────────────────────┐
│                       Next.js 全栈一体应用                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Browser-Side (React Pages)                   │  │
│  │                                                                │  │
│  │  ┌──────────────┐   ┌────────────────┐   ┌────────────────┐  │  │
│  │  │ Voice Layer  │   │   NLU Layer    │   │  Canvas Layer  │  │  │
│  │  │ Web Speech   │──▶│ Normalizer     │──▶│ Konva Stage    │  │  │
│  │  │ VAD/Silence  │   │ Rule Engine    │   │ Object Store   │  │  │
│  │  │ TTS Speaker  │◀──│ MockSceneSvc   │   │ CommandHistory │  │  │
│  │  │              │   │ LLM Client     │   │ Selection Mgr  │  │  │
│  │  │              │   │ Schema Guard ★ │   │ Thumbnailer    │  │  │
│  │  └──────────────┘   └───────┬────────┘   └────────────────┘  │  │
│  └─────────────────────────────┼────────────────────────────────┘  │
│                                │ fetch (only when needed)            │
│  ┌─────────────────────────────▼────────────────────────────────┐  │
│  │            API Routes Layer (Node.js Runtime ★)              │  │
│  │                                                                │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │       Auth Guard / Session Middleware ★ (强制)          │  │  │
│  │  │     校验 HttpOnly Cookie，拦截未授权请求                  │  │  │
│  │  └─┬──────────┬──────────────┬──────────────┬─────────────┘  │  │
│  │    ▼          ▼              ▼              ▼                 │  │
│  │  ┌─────┐  ┌─────────┐   ┌─────────┐    ┌────────────────┐    │  │
│  │  │Auth │  │Drawings │   │  Logs   │    │   LLM Proxy    │    │  │
│  │  │     │  │  CRUD   │   │(可选历史)│    │ + Schema Guard │    │  │
│  │  └──┬──┘  └────┬────┘   └────┬────┘    └────┬───────────┘    │  │
│  │     │          │             │              │                 │  │
│  │  ┌──▼──────────▼─────────────▼──┐    ┌──────▼──────────┐     │  │
│  │  │     SQLite (better-sqlite3)   │    │  Anthropic SDK  │     │  │
│  │  │     data/app.db               │    │  (需 .env.local)│     │  │
│  │  └───────────────┬───────────────┘    └─────────────────┘     │  │
│  │                  ▼                                              │  │
│  │     ┌─────────────────────────┐                                │  │
│  │     │ storage/thumbnails/*.png │                                │  │
│  │     └─────────────────────────┘                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Static / Config Resources                          │  │
│  │  lib/mock-scenes/*.json      （Mock 场景脚本，独立模块）         │  │
│  │  lib/synonyms/synonyms.json  （同义词表 + ASR 错字）             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘

★ = 本次架构关键约束
```

**核心原则**：

- **一体化部署**：单一 Next.js 项目，单一 `npm run dev` 启动
- **客户端为主战场**：ASR、NLU 规则、Canvas、TTS 全在浏览器端，**离线可用**
- **服务端强约束**：所有 SQLite/文件系统 API Route 显式声明 `runtime = "nodejs"`
- **零中间件**：SQLite 单文件 + 本地文件系统 + localStorage（仅运行时临时状态）

### 3.3 数据层分级

| 层级 | 存储位置 | 用途 | 是否持久 |
|------|---------|------|---------|
| **正式数据** | `data/app.db`（SQLite） | 用户账号、作品元数据、画布 JSON、指令日志 | ✅ 持久 |
| **缩略图** | `storage/thumbnails/*.png` | 作品列表封面 | ✅ 持久 |
| **配置资源** | `lib/mock-scenes/*.json`、`lib/synonyms/synonyms.json` | 应用启动加载 | ✅（源码） |
| **运行时状态** | 浏览器 localStorage | 麦克风开关偏好、UI 折叠状态、未保存草稿（自动恢复用） | ⚠️ 仅辅助，不作正式存储 |

**重要规则**：所有可继续编辑的作品数据**必须**写入 SQLite + 文件系统，localStorage **不作为**正式作品存储。

### 3.4 前端模块划分

#### 3.4.1 Voice Layer

| 模块 | 文件 | 职责 |
|------|------|------|
| `MicController` | `lib/voice/MicController.ts` | 麦克风启停、权限请求、状态机 |
| `SpeechRecognizer` | `lib/voice/SpeechRecognizer.ts` | Web Speech API 封装、实时文本流 |
| `SilenceDetector` | `lib/voice/SilenceDetector.ts` | 静默 800ms 自动断句 |
| `Speaker` | `lib/voice/Speaker.ts` | TTS 语音反馈（SpeechSynthesis） |

状态机：`IDLE → LISTENING → PROCESSING → (CLARIFYING) → IDLE`

#### 3.4.2 NLU Layer

| 模块 | 文件 | 职责 |
|------|------|------|
| `Normalizer` | `lib/nlu/Normalizer.ts` | 同义词替换 + ASR 错字修正 + 口语映射 |
| `RuleEngine` | `lib/nlu/RuleEngine.ts` | 正则 + 模式匹配，输出 Command |
| `BatchSplitter` | `lib/nlu/BatchSplitter.ts` | 连接词拆句 |
| **`MockSceneService`** ★ | `lib/nlu/MockSceneService.ts` | 从 `lib/mock-scenes/*.json` 加载场景，返回标准 BATCH Command |
| `LLMClient` | `lib/nlu/LLMClient.ts` | 调 `/api/llm/parse` |
| **`SchemaGuard`** ★ | `lib/nlu/SchemaGuard.ts` | Command Schema + 白名单双校验 |
| `ClarifyManager` | `lib/nlu/ClarifyManager.ts` | 澄清状态管理（多轮上下文） |

**NLU 主管线**：

```ts
// lib/nlu/Pipeline.ts
async function parse(rawText: string, ctx: Context): Promise<Command> {
  const text = normalizer.normalize(rawText);              // 阶段 1

  const mockHit = mockSceneService.match(text);            // 阶段 2a
  if (mockHit && schemaGuard.validate(mockHit)) return tagBatchId(mockHit);

  const ruleHit = ruleEngine.parse(text);                  // 阶段 2b
  if (ruleHit) {
    const split = batchSplitter.split(ruleHit);
    if (schemaGuard.validate(split)) return tagBatchId(split);
  }

  if (clarifyManager.isPending()) {                        // 阶段 3
    return clarifyManager.resolve(text);
  }

  if (ctx.llmEnabled) {                                    // 阶段 4
    const llmResult = await llmClient.parse(text, { timeout: 3000 });
    if (llmResult && schemaGuard.validate(llmResult)) {    // 阶段 5
      return tagBatchId(llmResult);
    }
  }

  return { type: 'UNKNOWN', rawText };
}
```

#### 3.4.3 Canvas Layer

| 模块 | 文件 | 职责 |
|------|------|------|
| `CanvasStage` | `components/CanvasStage.tsx` | Konva Stage 容器、响应式布局 |
| `ObjectStore` | `lib/canvas/ObjectStore.ts` | 对象列表（Zustand store） |
| `CommandExecutor` | `lib/canvas/CommandExecutor.ts` | 执行 Command → 操作 Store |
| **`CommandHistory`** ★ | `lib/canvas/CommandHistory.ts` | 命令级历史栈（按 batchId 分组） |
| `SelectionManager` | `lib/canvas/SelectionManager.ts` | 选中/取消、当前选中 |
| `ShapeRenderer` | `components/shapes/*.tsx` | 各形状的 react-konva 组件 |
| `Thumbnailer` | `lib/canvas/Thumbnailer.ts` | Stage.toDataURL() → 缩略图 PNG |

**CommandHistory 设计**：

```ts
type HistoryItem = {
  batchId: string;
  rawText: string;
  commands: Command[];
  beforeSnapshot: ObjectSnapshot;
  afterSnapshot: ObjectSnapshot;
  createdAt: number;
};
```

**实现策略（分阶段）**：

- **首版**：采用 shapes 快照实现撤销/重做（`before/after Snapshot`），简单可靠
- **后续可升级**：转为纯命令级历史（仅存 commands，UNDO 时反向回放），节省内存

UNDO 默认按 batchId 整批回退。

#### 3.4.4 UI Layer

| 模块 | 文件 | 职责 |
|------|------|------|
| `app/page.tsx` | 入口 | 画布主界面 |
| `app/(auth)/login/page.tsx` | 登录页 | 用户名密码登录 |
| `app/(auth)/register/page.tsx` | 注册页 | 注册表单 |
| `app/drawings/page.tsx` | 作品列表 | 缩略图网格，语音可控 |
| `components/StatusBar.tsx` | 状态条 | 识别文本/执行状态/错误提示 |
| `components/CommandLog.tsx` | 指令历史侧栏 | 最近指令显示（可隐藏） |
| `components/MicButton.tsx` | 麦克风按钮 | 仅启动用 |
| `components/HelpOverlay.tsx` | 帮助层 | 列出可用指令 |

#### 3.4.5 全局状态（Zustand stores）

```ts
useVoiceStore        // 麦克风状态、识别文本、TTS 队列
useCanvasStore       // 对象列表、选中、CommandHistory
useAuthStore         // 当前用户（从 /api/auth/me 加载）
useDrawingStore      // 当前作品 id、标题、保存状态
useNLUStore          // 澄清状态、上次指令、Mock 命中
```

### 3.5 后端模块划分（Next.js API Routes）

#### 3.5.1 Node Runtime 强制声明

所有涉及 SQLite 或文件系统读写的 API Route **必须**在文件顶部声明：

```ts
export const runtime = "nodejs";
```

> Next.js 部分 Route Handler 默认可能跑在 Edge Runtime，但 SQLite（better-sqlite3 含原生模块）和 `fs` 模块需要 Node 环境。**未声明 nodejs runtime 的路由可能在生产环境裂开**。

#### 3.5.2 Auth Guard / Session Middleware

| 文件 | 职责 |
|------|------|
| `middleware.ts` | 拦截 `/api/drawings/*` 和 `/api/logs/*`，校验 HttpOnly Cookie 中的 JWT |
| `lib/auth/guard.ts` | 提供 `requireUser(req)` 工具，在 API Route 内强制鉴权 |

**保护范围（强制）**：

- `GET    /api/drawings`        — 仅返回当前用户作品
- `POST   /api/drawings`        — 仅允许当前用户创建
- `GET    /api/drawings/[id]`   — 校验作品 `user_id` 等于当前用户
- `PATCH  /api/drawings/[id]`   — 同上
- `DELETE /api/drawings/[id]`   — 同上
- `POST   /api/logs`            — 仅写入当前用户日志
- `GET    /api/logs`            — 仅返回当前用户日志

**关键安全约束**：未鉴权请求一律返回 401；非作品所有者访问返回 404（不暴露作品存在性）。**未登录用户不可保存/读取/修改/删除任何作品**。

#### 3.5.3 路由总览

| 路由 | 行为 | 鉴权 | Runtime |
|------|------|------|---------|
| `POST /api/auth/register` | 注册（bcrypt 哈希） | 否 | nodejs |
| `POST /api/auth/login` | 登录，签 JWT，写 HttpOnly Cookie | 否 | nodejs |
| `POST /api/auth/logout` | 清 Cookie | 是 | nodejs |
| `GET  /api/auth/me` | 当前用户信息 | 是 | nodejs |
| `GET    /api/drawings` | 列出当前用户作品（updated_at DESC） | **是** | nodejs |
| `POST   /api/drawings` | 新建作品（title + canvasJSON + thumbnail） | **是** | nodejs |
| `GET    /api/drawings/[id]` | 读取作品详情（仅本人） | **是** | nodejs |
| `PATCH  /api/drawings/[id]` | 重命名 / 覆盖保存 | **是** | nodejs |
| `DELETE /api/drawings/[id]` | 删除作品 + 缩略图文件 | **是** | nodejs |
| `POST /api/llm/parse` | LLM 解析代理（Schema Guard） | 是 | nodejs |
| `POST /api/logs` | 记录指令日志 | **是** | nodejs |
| `GET  /api/logs` | 查询历史指令 | **是** | nodejs |
| **`GET /api/health`** ★ | 系统健康检查 | 否 | nodejs |

#### 3.5.4 `/api/health` 接口设计

```ts
// app/api/health/route.ts
export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    asr: "web-speech",
    nlu: "rule-first",
    llm: process.env.ANTHROPIC_API_KEY ? "enabled" : "optional",
    storage: "sqlite",
    version: "0.1.0"
  });
}
```

**用途**：评委一打开 `http://localhost:3000/api/health` 就能确认项目运行正常，也方便录屏时展示。

#### 3.5.5 Cookie 配置

```ts
{
  httpOnly: true,                                  // 防 XSS
  sameSite: 'lax',                                 // 防 CSRF
  secure: process.env.NODE_ENV === 'production',   // 生产强制 HTTPS
  maxAge: 7 * 24 * 60 * 60,                        // 7 天
  path: '/'
}
```

#### 3.5.6 LLM 代理设计

```ts
// app/api/llm/parse/route.ts
export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireUser(req);  // Auth Guard

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "LLM_NOT_CONFIGURED" }, { status: 503 });
  }

  const { text, context } = await req.json();
  const result = await callClaude(text, context, { timeout: 2500 });

  // 服务端先做一层 Schema 校验，前端再做一层（防御性）
  if (!validateCommandSchema(result)) {
    return Response.json({ error: "INVALID_COMMAND" }, { status: 422 });
  }

  return Response.json(result);
}
```

### 3.6 数据库 Schema（SQLite）

```sql
-- data/app.db
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,                 -- bcrypt hash
  created_at  INTEGER NOT NULL
);

CREATE TABLE drawings (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  title         TEXT NOT NULL,
  canvas_json   TEXT NOT NULL,               -- Konva 对象树 JSON 字符串
  thumbnail_url TEXT NOT NULL,               -- /thumbnails/{id}.png（相对路径）
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_drawings_user_updated ON drawings(user_id, updated_at DESC);

CREATE TABLE command_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  drawing_id    TEXT,
  raw_text      TEXT NOT NULL,
  parsed_json   TEXT,                        -- Command JSON
  status        TEXT NOT NULL,               -- 'ok' | 'unknown' | 'rejected' | 'clarify'
  source        TEXT NOT NULL,               -- 'rule' | 'mock' | 'llm'
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3.7 关键流程时序

#### 3.7.1 作品保存流程（双产物：canvasJson + 缩略图）

```
1. 用户语音"保存为我的第一幅画"
2. NLU → PROJECT_SAVE_AS title="我的第一幅画"
3. Konva Stage
     ↓
   导出 canvasJson  ← 能继续编辑的真正数据
     ↓
   Stage.toDataURL() → 缩略图 PNG  ← 作品列表展示用
     ↓
   POST /api/drawings { title, canvasJson, thumbnail_base64 }
     ↓
4. 后端：
   - Auth Guard 校验用户
   - SQLite 写入 drawings 表（canvas_json 字段保存完整 JSON）
   - 解码 thumbnail_base64 → 写入 storage/thumbnails/{drawingId}.png
   - 返回 { id, title, updatedAt }
5. TTS "已保存：我的第一幅画"
```

**关键约束**：

- ✅ canvasJson 是真正能继续编辑的数据（含所有 id、style、transform、batchId）
- ✅ PNG 仅作小封面用于作品列表
- ❌ 不能只保存 PNG（否则无法继续编辑）

#### 3.7.2 简单指令路径（< 800ms 达标）

```
T+0ms     用户说"画一个红色圆"
T+50ms    Web Speech 返回部分识别文本
T+850ms   用户停止说话
T+900ms   final 文本到达
T+910ms   Normalizer 归一化
T+920ms   RuleEngine 解析 → Command
T+930ms   SchemaGuard 校验通过
T+940ms   Executor 写入 ObjectStore
T+950ms   react-konva 重渲染
T+1000ms  Speaker TTS "已添加红色圆"
```

从"用户说完话"为 T+0 计算，实际绘制延迟约 **100ms**，远好于 800ms 目标。

#### 3.7.3 LLM 路径（< 2s）+ 3s 降级

```
T+0ms     用户说"在天空中画两朵漂浮的云彩"
T+1200ms  规则未命中 → 进入 LLM
T+1210ms  POST /api/llm/parse（带 timeout=2500ms）
T+2800ms  Claude 返回 BATCH JSON
T+2810ms  服务端 SchemaGuard 校验
T+2820ms  前端 SchemaGuard 再校验（防御性）
T+2850ms  Executor 顺序执行 5 个子命令（同一 batchId）
T+2900ms  TTS "已绘制两朵云彩"

—— 若 T+3200ms 仍未返回 → 主动放弃 → TTS "网络慢，请改用基础指令" ——
```

### 3.8 关键技术决策对照

| 决策 | 选择 | 拒绝项 | 原因 |
|------|------|--------|------|
| 部署形态 | Next.js 全栈一体 | 前后端分离 | 一键启动、零中间件 |
| 状态管理 | Zustand | Redux | 单人项目，Redux 样板代码冗余 |
| Canvas | react-konva | 原生 Canvas | 对象化模型契合"选中第二个圆" |
| 数据库 | better-sqlite3 | sqlite3 / Supabase | 同步 API + 单文件 + 合规 |
| 认证 | jose（JWT）+ HttpOnly Cookie | next-auth / localStorage token | 后者过重 / 前者防 XSS |
| 密码 | bcryptjs | argon2 | 纯 JS 无原生编译，Windows 友好 |
| LLM SDK | @anthropic-ai/sdk | OpenAI SDK | 默认 Claude，可平替 |
| Runtime | Node.js（显式） | Edge | SQLite + fs 需要 Node 环境 |
| 样式 | Tailwind CSS | CSS Modules | 开发快、约束少 |

### 3.9 目录结构

```
voice-canvas-ai/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── drawings/page.tsx                  # 作品列表
│   ├── api/
│   │   ├── auth/{register,login,logout,me}/route.ts
│   │   ├── drawings/route.ts              # GET列表 + POST新建
│   │   ├── drawings/[id]/route.ts         # GET/PATCH/DELETE
│   │   ├── llm/parse/route.ts
│   │   ├── logs/route.ts
│   │   └── health/route.ts                # ★ 健康检查
│   ├── page.tsx                           # 主画布
│   └── layout.tsx
├── middleware.ts                          # ★ Auth Guard 中间件
├── components/
│   ├── CanvasStage.tsx
│   ├── StatusBar.tsx
│   ├── MicButton.tsx
│   ├── CommandLog.tsx
│   ├── HelpOverlay.tsx
│   └── shapes/*.tsx
├── lib/
│   ├── voice/                             # ASR + TTS + VAD
│   ├── nlu/
│   │   ├── Normalizer.ts
│   │   ├── RuleEngine.ts
│   │   ├── BatchSplitter.ts
│   │   ├── MockSceneService.ts            # ★ 独立模块
│   │   ├── LLMClient.ts
│   │   ├── SchemaGuard.ts                 # ★ 双校验
│   │   └── ClarifyManager.ts
│   ├── mock-scenes/                       # ★ Mock 场景独立目录
│   │   ├── house.json
│   │   ├── smile.json
│   │   ├── sun-and-trees.json
│   │   ├── garden.json
│   │   ├── snowman.json
│   │   ├── traffic-light.json
│   │   ├── heart.json
│   │   ├── rainbow.json
│   │   ├── christmas-tree.json
│   │   └── taichi.json
│   ├── synonyms/synonyms.json
│   ├── canvas/                            # ObjectStore + Executor + History
│   ├── db/                                # SQLite 初始化 + 查询
│   └── auth/                              # JWT + Cookie + Guard 工具
├── data/
│   └── app.db                             # SQLite（运行时创建）
├── storage/
│   └── thumbnails/                        # 运行时创建
├── tests/
│   ├── parser.test.ts
│   ├── normalizer.test.ts
│   ├── schema-guard.test.ts
│   └── mock-scenes.test.ts
├── docs/
│   └── specs/
│       └── 2026-06-12-voice-canvas-ai-design.md
├── .env.local.example
├── .gitignore
├── README.md
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 4. 开发里程碑与 PR 拆分

### 4.1 总体规划

**节奏原则**（严格遵循比赛规范）：

- ✅ **每个 PR 单一职责**——一个 PR 只做一件事
- ✅ **持续交付**——多日均衡提交，禁止临尾突击
- ✅ **每个 PR 合并后 main 必须可运行**——`npm run dev` 能启动，不能出现"等后面补完才能跑"的半成品状态
- ✅ **PR 描述四要素**——标题 / 功能描述 / 实现思路 / 测试方式

**PR 数量**：**14 个 PR**（控制在 10-14 之间，避免拆得过碎导致合并 + 写描述拖慢节奏）。

### 4.2 范围锁定表（Must / Optional）

> 这是最重要的**红线**。开发过程中所有时间冲突，按此表决策。

#### 4.2.1 Must（必须完成）

| 类别 | 项目 |
|------|------|
| 账号系统 | 注册、登录、退出、HttpOnly Cookie 鉴权 |
| 作品系统 | 作品列表、新建作品、保存作品、打开继续编辑、缩略图、导出 PNG |
| 语音识别 | Web Speech API、识别文本展示、状态提示 |
| 指令解析 | Command Schema、规则引擎、同义词归一化、ASR 错字修正 |
| 绘图能力 | 画圆 / 矩形 / 三角形 / 直线 / 文字 |
| 选中能力 | 选择最后一个 / 当前对象 |
| 编辑能力 | 移动 / 改颜色 / 放大缩小 / 删除 |
| 全局操作 | 撤销 / 重做 / 清空（带确认） / 导出 PNG |
| 复杂场景 | Mock 复杂场景（至少 5-10 个） |
| 容错 | 未知指令引导、危险操作二次确认、未登录提示 |
| 交付物 | 设计文档、README、Demo 视频 |

#### 4.2.2 Optional（有时间再做）

| 类别 | 项目 |
|------|------|
| 真实 LLM | 复杂指令的 LLM 解析（可选 Key 增强） |
| 语音反馈 | TTS 语音播报 |
| 指令历史 | 指令历史详情页（command_logs 完整可视化） |
| 作品 | 作品搜索 |
| 高级编辑 | 图层管理 |
| 进阶 ASR | 本地 Whisper、云端 ASR 代理 |
| 协作 | 多人协作画板 |
| 高级选中 | 精确序号选中、多条件筛选、位置语言全集 |
| 旋转/描边 | 旋转、描边粗细等 L2 修改 |
| 用户指南 | `docs/user-guide.md`（如时间紧只写到 README 即可） |

**决策原则**：

- L1 指令**必须稳定**——优先保证它们能 100% 演示通过
- L2 指令**尽量完成**——不影响核心闭环时全力推进
- L3 / Optional 项**只做 Mock / LLM 增强**——不强求规则引擎覆盖

### 4.3 PR 拆分明细（14 个 PR）

#### PR-01 · 项目初始化

- **范围**：Next.js + TypeScript + Tailwind + Zustand 骨架、基础目录、`README.md`（占位）、`.gitignore`、`.env.local.example`、Vitest 配置
- **依赖**：next 14、react 18、typescript、tailwindcss、zustand、vitest
- **验收**：`npm install && npm run dev` 打开空白页；`npm test` 通过

#### PR-02 · 数据层

- **范围**：
  - `lib/db/init.ts`——首启自动建库 + 建表（`users` / `drawings` / `command_logs`）+ 创建 `data/`、`storage/thumbnails/` 目录
  - `app/api/health/route.ts`——返回 status/asr/nlu/llm/storage
  - 所有 API Route 顶部声明 `export const runtime = "nodejs"`
- **依赖**：better-sqlite3
- **验收**：访问 `/api/health` 返回 200；`data/app.db` 自动生成且三表存在

#### PR-03 · 登录注册

- **范围**：
  - `app/api/auth/{register,login,logout,me}/route.ts`
  - `lib/auth/jwt.ts`（jose 签 JWT）、`lib/auth/guard.ts`（`requireUser` 工具）
  - `middleware.ts`（Auth Guard 拦截 `/api/drawings/*` 和 `/api/logs/*`）
  - bcrypt 密码哈希、HttpOnly Cookie（7 天）
- **依赖**：bcryptjs、jose
- **验收**：curl 跑通注册→登录→`/api/auth/me` 返回当前用户；未登录访问受保护接口 → 401

#### PR-04 · 页面骨架

- **范围**：登录页、注册页、作品列表页（空状态）、编辑器页（空画布）、统一布局 `app/layout.tsx`、`StatusBar.tsx` 占位
- **验收**：4 个页面可访问；登录状态下导航正常；未登录访问编辑器/作品页跳转到登录

#### PR-05 · Konva 画布

- **范围**：`components/CanvasStage.tsx`（react-konva）、`lib/canvas/ObjectStore.ts`（Zustand 对象列表）、`components/shapes/*.tsx`（圆/矩形/三角/线/文字基础组件）
- **依赖**：konva、react-konva
- **验收**：开发者工具往 Store 注入一个圆能正常渲染；切换页面后 Store 清空

#### PR-06 · 指令模型

- **范围**：
  - `lib/nlu/types.ts`（Command 类型 + COMMAND_WHITELIST）
  - `lib/synonyms/synonyms.json`（完整同义词 + ASR 错字组）
  - `lib/nlu/Normalizer.ts` + `lib/nlu/RuleEngine.ts`（先实现 CREATE/DELETE/UNDO/REDO/CLEAR）
  - `lib/nlu/SchemaGuard.ts`（Schema + 白名单校验）
  - `tests/normalizer.test.ts` + `tests/parser.test.ts` + `tests/schema-guard.test.ts`
- **验收**：L1 CREATE/DELETE/UNDO/REDO/CLEAR 测试用例全绿；至少 30 条归一化用例覆盖

#### PR-07 · 语音识别

- **范围**：`lib/voice/MicController.ts`、`SpeechRecognizer.ts`、`SilenceDetector.ts`、`components/MicButton.tsx`、StatusBar 显示识别文本、浏览器兼容提示
- **验收**：点麦克风→说话→状态条显示识别文本；静默 800ms 自动断句；非 Chrome/Edge 显示兼容提示

#### PR-08 · 命令执行

- **范围**：
  - `lib/canvas/CommandExecutor.ts`——执行 CREATE / SELECT / MODIFY / MOVE / DELETE
  - `lib/canvas/SelectionManager.ts`——SELECT 优先级链（精确 id / 最近创建 / 形状+颜色 / 位置 / 序号）
  - 接入 Pipeline：识别文本 → Normalizer → RuleEngine → SchemaGuard → Executor → ObjectStore
- **验收**：说"画一个红色圆" → 圆出现；"选中那个圆" → 高亮；"改成蓝色" → 变蓝；"向右移动" → 移动；"删除" → 消失
- **可演示**：**首次端到端跑通，这是项目最关键的节点**

#### PR-09 · 全局操作

- **范围**：
  - `lib/canvas/CommandHistory.ts`（shapes 快照实现）
  - `lib/nlu/BatchSplitter.ts`（连接词拆句 + batchId 整批撤销）
  - UNDO / REDO / CLEAR（带二次确认）/ EXPORT（PNG 下载）
  - `lib/canvas/Thumbnailer.ts`（Stage.toDataURL）
- **验收**：连续画 5 个对象 → "撤销" → 最后一个消失；说"画一个红圆和一个蓝方块" → "撤销" → 两个一起消失；"清空" → 提示"确认清空" → "确认" → 清空；"导出图片" → 浏览器下载 PNG

#### PR-10 · 作品管理

- **范围**：
  - `app/api/drawings/route.ts` + `app/api/drawings/[id]/route.ts`（受 Auth Guard 保护）
  - 扩展 RuleEngine 支持 PROJECT_SAVE / SAVE_AS / LIST / OPEN / RENAME / DELETE 指令
  - 作品列表页缩略图网格、语音打开/删除（带二次确认）
  - 保存流程：导出 canvasJson + thumbnail → POST → SQLite + 文件系统
- **验收**：登录→说"保存为我的第一幅画"→作品列表出现→说"打开我的作品"→进入列表→说"打开第一幅"→画布加载→可继续编辑

#### PR-11 · Mock 场景

- **范围**：`lib/mock-scenes/*.json`（house / smile / sun-and-trees / garden / snowman / traffic-light / heart / rainbow / christmas-tree / taichi）、`lib/nlu/MockSceneService.ts`、`tests/mock-scenes.test.ts`
- **验收**：每个场景命中后能正确绘制；测试断言所有 BATCH 子命令通过 SchemaGuard

#### PR-12 · 可选 LLM 增强

- **范围**：`app/api/llm/parse/route.ts`（含 prompt + 服务端 SchemaGuard 校验 + 2.5s 超时）、`lib/nlu/LLMClient.ts`（前端调用 + 3s 总超时）、`lib/nlu/ClarifyManager.ts`、`.env.local.example` 补 `ANTHROPIC_API_KEY`
- **依赖**：@anthropic-ai/sdk
- **验收**：填 key 后说"画一只可爱的小猫" → LLM 返回 BATCH → 绘制；不填 key 时 → 503 → 前端友好降级提示

#### PR-13 · UI 打磨

- **范围**：HelpOverlay 指令速查表、`CommandLog` 侧栏、错误提示统一样式、麦克风权限引导、未登录保存提示、TTS 反馈（Optional：时间紧可仅文字反馈）
- **验收**：首次访问看到帮助；每条指令执行后 StatusBar 有反馈；错误状态提示清晰

#### PR-14 · 文档与演示

- **范围**：
  - 完成 `docs/specs/2026-06-12-voice-canvas-ai-design.md`（"计划/实现/未完成"三列对照填齐）
  - 完善 `README.md`
  - （Optional）`docs/user-guide.md`
  - 录屏：基础绘图 + 容错重试 + Mock 场景 + 登录保存 + 打开作品继续编辑
  - 跑提交合规自检
- **验收**：README 链接可播放、视频有声、覆盖核心模块、自检清单全勾

### 4.4 风险与硬性应对

| 风险 | 应对（硬性） |
|------|------------|
| **风险 1：Web Speech API 不兼容** | README 明确推荐 Chrome / Edge；提供 Mock 指令演示模式（不依赖 ASR 也能展示绘图） |
| **风险 2：LLM Key 未配置** | 默认规则引擎独立运行；复杂场景使用 Mock JSON；**LLM 不作为核心依赖** |
| **风险 3：SQLite / 文件系统在 Edge Runtime 不可用** | 所有涉及数据库和文件写入的 Route Handler **显式声明 `export const runtime = "nodejs"`** |
| **风险 4：登录注册占用时间过多** | 只做用户名 + 密码注册；**不做邮箱验证码、找回密码、第三方登录** |
| **风险 5：指令解析范围失控** | L1 指令必须稳定；L2 尽量完成；L3 / Optional 只做 Mock / LLM 增强 |
| **风险 6：每个 PR 合并后 main 不可启动** | 每个 PR 提交前手工跑一次 `npm run dev` + `npm test`，确认无 break |

### 4.5 交付物清单

最终提交**必须**包含以下全部内容：

#### 4.5.1 代码与配置

- ✅ `README.md`
- ✅ `docs/specs/2026-06-12-voice-canvas-ai-design.md`（设计文档）
- ✅ （Optional）`docs/user-guide.md`
- ✅ `.env.local.example`
- ✅ 首次启动自动创建逻辑：`data/app.db`、`storage/thumbnails/` 目录
- ✅ `lib/mock-scenes/*.json`（至少 5-10 个）
- ✅ `lib/synonyms/synonyms.json`

#### 4.5.2 外部交付

- ✅ **Demo 视频链接**（B 站或云盘，有声讲解，覆盖核心模块）
- ✅ **PR 记录**（公开仓库，14 个 PR 全部可见，时间均匀分布）

#### 4.5.3 README 必备结构

README **必须**包含以下章节：

1. **项目介绍**——一句话定位 + 选定赛题方向
2. **Demo 视频**（顶部，可播放，有声）
3. **一键启动**——`npm install && npm run dev` 一条命令
4. **浏览器要求**——明确 Chrome / Edge 最新版
5. **数据存储说明**——SQLite + 本地文件系统、首次启动自动创建
6. **依赖清单**——表格列出所有第三方库 + 版本 + 用途 + 原创/第三方
7. **是否需要 API Key**——明确说明：**不填 key 也能运行**（规则引擎 + Mock 场景）；填 key 增强 LLM 解析；key 在 `.env.local`
8. **功能清单**——L1 / L2 / L3 三档对照
9. **目录结构**

---

## 附录 A · Future Work（未完成项预留）

实现阶段未能完成的项，在最终文档中将在此处填写"未完成原因"：

| 项目 | 预填原因 |
|------|---------|
| 移动端适配 | 一期范围外，Web Speech 在 iOS Safari 不稳 |
| 本地 Whisper 兜底 | 模型 200MB 评委环境难保证，云端代理更可控 |
| 多人协作画板 | 一期范围外，需要 WebSocket + CRDT |
| 矢量精修工具 | 与"纯语音控制"价值主张冲突 |
| AI 文生图 | 另一赛题方向，本期聚焦"指令理解" |
| 多语言（英文等） | Web Speech zh-CN 优先，资源不足 |
| 复杂图层管理 | 一期采用扁平列表足够，复杂度不值 |

## 附录 B · 实现状态汇总

实现阶段会维护这张表，作为提交时"计划/实现/未完成"的最终对照。

| 模块 | L1 计划 | L1 实现 | L2 计划 | L2 实现 | L3 计划 | L3 实现 |
|------|---------|---------|---------|---------|---------|---------|
| CREATE | 5 | ⏸ | 3 | ⏸ | 2 | ⏸ |
| SELECT | 3 | ⏸ | 3 | ⏸ | 1 | ⏸ |
| MODIFY/MOVE | 4 | ⏸ | 3 | ⏸ | 1 | ⏸ |
| 全局操作 | 5 | ⏸ | - | - | - | - |
| 作品管理 | 4 | ⏸ | 2 | ⏸ | - | - |
| 问答反馈 | - | - | 2 | ⏸ | 1 | ⏸ |
| 复合 BATCH | - | - | - | - | 10 (Mock) | ⏸ |

⏸ = 待开发；✅ = 已实现；❌ = 未实现（在附录 A 补原因）
