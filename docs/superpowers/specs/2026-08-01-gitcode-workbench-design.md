# GitCode 工作台 — 设计规格

日期：2026-08-01  
状态：已定稿（含设计规范；待实现计划）  
来源：`idea.md` + 设计对话

## 1. 目标

构建可扩展的 GitCode 大型 SPA 工作台。首版交付 **Issue 看板**：左侧列表（筛选/排序），右侧 iframe 展示 GitCode Issue 详情，支持上一个/下一个/跳号。列表数据首版走 Mock BFF，接口形状对齐未来 GitCode OpenAPI。

实现顺序约束：**先落地前端设计规范与一般样例页，再写 Issue 业务代码。**

参考：[GitCode REST API](https://docs.gitcode.com/en/docs/apis/)（`/api/v5`）。

## 2. 非目标（首版不做）

- 不接真实 GitCode Token / API（仅预留 Repository 抽象与 BFF 边界）
- 不自建 Issue 详情渲染（详情一律 iframe）
- 不实现 Pulls / Repos / Settings 业务（仅路由与占位）
- 不破解或绕过 iframe 的 `X-Frame-Options` / 登录态限制
- 不做厚重视觉体系（大圆角、强渐变、多阴影、装饰性动效）

## 2.5 前端设计规范

### 原则

- **简约**：中性灰 + 单一强调色；避免紫系渐变、奶油衬线风、报纸密排风
- **克制圆角**：控件 `4–6px`，面板 `6–8px`；不用大胶囊（`rounded-full` 仅用于极小状态点）
- **少量动画**：仅用于层级与反馈（导航指示、列表选中、按钮按下、面板展开）；时长约 `120–180ms`，`ease-out`；禁止循环/装饰性动效
- **清晰层级**：靠字重、间距、细分割线区分，少用阴影（阴影若用则单层、低对比）

### 颜色（CSS 变量）

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg` | `#F7F8FA` | 页面背景 |
| `--surface` | `#FFFFFF` | 面板/顶栏 |
| `--border` | `#E5E7EB` | 分割线、输入框边 |
| `--text` | `#111827` | 主文字 |
| `--text-secondary` | `#6B7280` | 次要文字 |
| `--text-muted` | `#9CA3AF` | 占位/禁用 |
| `--accent` | `#2563EB` | 链接、主按钮、选中强调（单一强调色） |
| `--accent-subtle` | `#EFF6FF` | 选中行/弱高亮背景 |
| `--danger` | `#DC2626` | 错误提示 |
| `--success` | `#059669` | 成功/open 等正向状态（少量使用） |

状态色（Issue open/closed）用文字 + 小色点，不用大色块填充整行。

### 字体与间距

- 字体：系统栈优先（`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif`），保证中文清晰；不做展示用装饰字体
- 字号：12 / 13 / 14 / 16；列表主标题 14，辅助信息 12–13
- 间距基准：`4 / 8 / 12 / 16 / 24`

### 组件约定（样例页需覆盖）

- 按钮：主（accent 实心）、次（边框）、文字按钮；高 32px；圆角 6px
- 输入框 / 下拉多选：高 32px；边框 `--border`；圆角 6px；focus 用 accent 细环
- 导航：顶栏高度 48–56px；当前模块用底边或文字色强调，可加短时下划线过渡
- 列表行：hover 浅底；选中 `--accent-subtle` + 左侧 2px accent 条（可短时 fade-in）
- 空状态：居中次要文字，无插画 compulsory

### 一般样例页（业务前必做）

- 路由：`/design-system`（开发期可从 Settings 或顶栏隐藏入口进入；正式导航可不展示）
- 内容：色板、按钮、输入、多选筛选条、列表行（默认/hover/选中）、空状态、错误条、简易分栏布局示意
- 验收：确认视觉基线后再实现 `/issues` 业务 UI（复用同一套 CSS 变量与组件样式）

## 3. 架构

### 3.1 技术栈

- Next.js（App Router）+ TypeScript
- 客户端主导的 SPA 体验；服务端提供 Route Handlers 作为 BFF

### 3.2 分层

```
UI (App Shell + 模块页)
  → fetch BFF Route Handlers
    → IssueRepository（接口）
      → MockIssueRepository（首版）
      → GitCodeIssueRepository（后续）
```

### 3.3 路由（预留同级模块）

| 路径 | 首版行为 |
|------|----------|
| `/` | 重定向到 `/dashboard` |
| `/issues` | Issue 看板（实现） |
| `/pulls` | 占位页 |
| `/repos` | 占位页 |
| `/settings` | 占位页 |
| `/design-system` | 设计规范一般样例（业务前交付） |

### 3.4 BFF API（按模块挂载）

- `GET /api/issues` — 列表（org/repo + 筛选 + 排序）
- `GET /api/issues/meta` — 筛选项（创建者、负责人、Label、里程碑等）

后续同级扩展示例：`/api/pulls`、`/api/repos`。

### 3.5 全局上下文

- `org`、`repo` 存 `localStorage`，由 Issues 左栏「确认」写入；各模块可读同一已确认值
- Issues / Pulls **不**在初次打开时用上次仓库自动请求：须本会话再次点「确认」；仓库输入不预填上次值（组织仍可预填）
- 输入框内草稿在点击「确认」前**不**触发列表/meta 请求，也**不**写入 localStorage
- 筛选/排序**不**持久化；每次进入 Issues/Pulls 页默认状态为 **open**；排序变更立即触发列表请求；多选筛选需在下拉内点「确认」后才触发

## 4. 布局与交互

### 4.1 壳层

- 顶栏：产品名「GitCode 工作台」+ 模块导航（Issues / Pulls / Repos / Settings）+ 右上 Token 状态
- **顶栏不再放置** org / repo 输入
- 内容区按路由切换

### 4.2 Issues 页

**左栏（约 36%）**

- **顶部**：组织、仓库输入 +「确认」按钮（确认后才写入 localStorage 并触发 meta/list 请求）
- 其下为筛选：**名称搜索**（GitCode `search`；确认/回车后请求；**清空**一键清除草稿并取消已应用搜索）+ 多选：状态、创建者、负责人、Label、里程碑（**无类型筛选**，API 不支持）
- 多选下拉：**勾选仅改草稿**；面板内「确认」后才写入筛选并重拉列表；「重置」清空草稿勾选；关闭面板（点外部/Esc）不应用草稿
- 排序：字段（创建时间 / 更新时间）+ 方向（正序 / 倒序）；**默认创建时间倒序**；变更后立即重拉列表
- 列表项展示：编号、标题、状态、标签摘要、更新时间
- **分页**：上一页 / 下一页 + **页码输入跳转**；默认每页 20 条；筛选确认/排序/换仓确认后回到第 1 页
- 点击列表项选中并加载详情
- 尚未确认有效 org/repo：列表区引导「请填写组织和仓库并确认」

**右栏（约 64%）**

- 工具条：上一个 / 下一个 + 跳转到 `#number`（输入 + Go）
- 主体：展示 Issue **基本信息**（状态、创建者、负责人、标签、里程碑、类型、时间、**关联 PR**）与 **正文**、**评论列表**
- 关联 PR 来自 `GET .../issues/{number}/pull_requests`；条目可点击，**新标签打开** GitCode PR 页（优先 API `html_url`，否则 `/pulls/{n}`）
- 正文与评论按 **Markdown（GFM）** 渲染；不启用原始 HTML 注入
- 评论按 `created_at` **升序**（旧 → 新）
- 顶部标题为可点击链接，**新标签打开**真实 GitCode Issue 页面；不再依赖 iframe 嵌入
- **默认不选中**：右侧空状态，不自动选第一条

### 4.3 选中与导航规则

1. 进入页面或**确认切换** org/repo：清除选中，详情为空；确认新 org/repo 时筛选重置并重拉 meta + issues
2. 筛选/排序变更：列表刷新；**已打开的详情保持不变**（当前 number 继续显示）
3. 若当前详情 number 不在新结果集中：详情仍保留，列表不高亮该项
4. 上一个 / 下一个：仅在**当前页结果集**内移动
5. 若当前详情 number 不在当前页结果集：禁用上一个/下一个，直到用户重新点选列表项或成功跳号到当前页内项
6. 跳号：加载该 number 的详情（基本信息 + 评论）；若在当前列表中则高亮，否则仅更新选中 number，列表不高亮

## 5. 数据流

1. 进入 `/issues` → 读 localStorage 的已确认 **org** 预填组织；**不**预填上次仓库、**不**自动请求，引导填写仓库并确认
2. 用户点击「确认」且 org/repo 均非空 → 写入 localStorage → 并行：
   - `GET /api/issues/meta?org=&repo=`（轻量抽样聚合筛选项，不拉全量）
   - `GET /api/issues?...&page=1&per_page=20`（GitCode 服务端分页；默认 `state=open`，创建时间倒序）
3. 用户点选 / 跳号 / 上一个下一个 → 更新选中 number 与详情（上一个/下一个仅限**当前页**结果集）
4. 名称搜索确认、多选筛选点「确认」或排序变更 → 重置为第 1 页并重拉 `/api/issues`，**不**清空或改写当前详情
5. 翻页 → 重拉 `/api/issues`（带 page），详情保持不变
6. 再次确认更换 org/repo → 清筛选、清选中、页码回 1、重拉 meta + issues
7. 仅编辑输入框草稿、未点确认 → **不**发请求、**不**改已确认上下文
8. 多选下拉仅勾选未点确认 / 关闭面板 → **不**改已应用筛选、**不**发请求
9. 名称搜索仅改输入未点确认 → **不**发请求

## 6. API 约定

### 6.1 查询参数

| 参数 | 说明 |
|------|------|
| `org`, `repo` | 必填 |
| `state` | 多选，逗号分隔（如 `open,closed`） |
| `creator` | 多选，逗号分隔 |
| `assignee` | 多选，逗号分隔 |
| `label` | 多选，逗号分隔 |
| `milestone` | 多选，逗号分隔 |
| `search` | 名称/标题关键字，对应 GitCode Issues 列表 `search` |
| `sort` | `created` \| `updated`（默认 `created`） |
| `direction` | `asc` \| `desc`（默认 `desc`） |
| `page` | 页码，从 1 起，默认 `1` |
| `per_page` | 每页条数，默认 `20`，最大 `100` |

列表响应：`{ items, page, per_page, total_count, total_page }`（`total_*` 来自 GitCode 响应头，缺失时可为 `null`）。

多选语义：同一维度内为 OR；不同维度之间为 AND。能下推到 GitCode 的条件（`state`/`labels`/`search`/`sort`/`direction`/`page` 及单个 creator/assignee/milestone 等）优先服务端过滤；多选未完全下推的部分仍可能在当页二次过滤。**不提供类型筛选。**

### 6.2 列表项字段（最小集）

`number`, `title`, `state`, `labels[]`, `milestone`, `issue_type`, `user`（创建者）, `assignees[]`, `created_at`, `updated_at`, `html_url`

字段命名尽量贴近 GitCode API v5，便于后续替换 Repository 实现。

### 6.3 Mock

- 内置固定数据集，覆盖多状态、多标签、多负责人、多里程碑、多类型
- `MockIssueRepository` 在服务端按 query 过滤与排序后返回
- `meta` 从同一数据集聚合去重选项

## 7. 错误与边界

| 场景 | 行为 |
|------|------|
| org/repo 未确认或为空 | 不请求；列表区引导填写并确认 |
| API 4xx/5xx | 列表区错误提示 + 重试 |
| iframe 无法展示（未登录/私有库/嵌入限制） | 右侧说明需在浏览器登录 GitCode 且具备权限；不尝试绕过 |
| 跳号非正整数 | 前端校验，不跳转 |
| 加载中 | 列表骨架或 spinner |

## 8. 测试（首版）

- `MockIssueRepository`：多选过滤、跨维度 AND、排序正序/倒序单测
- 手动验收：换仓、多选筛选、排序、默认空详情、筛选后详情不变、上一个/下一个禁用规则、跳号

## 9. 后续扩展（不在首版范围）

- `GitCodeIssueRepository`：Token（环境变量或 Settings）、调用 `/api/v5` Issues
- 实现 Pulls / Repos / Settings 模块
- 列表分页与无限滚动（若 mock/真 API 数据量变大）

## 10. 决策记录

| 决策 | 选择 |
|------|------|
| 数据来源 | 先 Mock，经 BFF Route Handler |
| 持久化 | 仅已确认的 org/repo（点确认后写入） |
| org/repo 入口 | Issues 左栏顶部 + 确认按钮；顶栏不放 |
| 筛选/排序触发 | 多选：下拉内确认后请求；排序：变更即请求；并重置到第 1 页 |
| 列表分页 | GitCode 服务端分页；默认 per_page=20 |
| 筛选维度 | 名称搜索；状态、创建者、负责人、Label、里程碑（均可多选）；无类型 |
| 排序 | 创建/更新时间 × 正序/倒序 |
| 默认选中 | 否；空 iframe |
| 筛选后详情 | 保持不变 |
| 应用形态 | 大型 SPA，同级路由预留 |
| 视觉 | 简约中性 + 单强调色；小圆角；少量反馈动画 |
| 实现顺序 | 先 `/design-system` 样例，再 Issue 业务 |
