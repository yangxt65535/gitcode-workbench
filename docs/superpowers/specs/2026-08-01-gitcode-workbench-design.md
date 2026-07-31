# GitCode 工作台 — 设计规格

日期：2026-08-01  
状态：已定稿（待实现计划）  
来源：`idea.md` + 设计对话

## 1. 目标

构建可扩展的 GitCode 大型 SPA 工作台。首版交付 **Issue 看板**：左侧列表（筛选/排序），右侧 iframe 展示 GitCode Issue 详情，支持上一个/下一个/跳号。列表数据首版走 Mock BFF，接口形状对齐未来 GitCode OpenAPI。

参考：[GitCode REST API](https://docs.gitcode.com/en/docs/apis/)（`/api/v5`）。

## 2. 非目标（首版不做）

- 不接真实 GitCode Token / API（仅预留 Repository 抽象与 BFF 边界）
- 不自建 Issue 详情渲染（详情一律 iframe）
- 不实现 Pulls / Repos / Settings 业务（仅路由与占位）
- 不破解或绕过 iframe 的 `X-Frame-Options` / 登录态限制

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
| `/` | 重定向到 `/issues` |
| `/issues` | Issue 看板（实现） |
| `/pulls` | 占位页 |
| `/repos` | 占位页 |
| `/settings` | 占位页 |

### 3.4 BFF API（按模块挂载）

- `GET /api/issues` — 列表（org/repo + 筛选 + 排序）
- `GET /api/issues/meta` — 筛选项（创建者、负责人、Label、里程碑、Issue 类型等）

后续同级扩展示例：`/api/pulls`、`/api/repos`。

### 3.5 全局上下文

- `org`、`repo` 存 `localStorage`，壳层输入，各模块共用
- 筛选/排序**不**持久化；每次进入 Issues 页为默认（未筛选）状态

## 4. 布局与交互

### 4.1 壳层

- 顶栏：产品名「GitCode 工作台」
- 全局 org / repo 输入（失焦或回车写入 localStorage）
- 模块导航：Issues / Pulls / Repos / Settings
- 内容区按路由切换

### 4.2 Issues 页

**左栏（约 36%）**

- 筛选（均可多选）：状态、创建者、负责人、Label、里程碑、Issue 类型
- 排序：字段（创建时间 / 更新时间）+ 方向（正序 / 倒序）
- 列表项展示：编号、标题、状态、标签摘要、更新时间
- 点击列表项选中并加载详情

**右栏（约 64%）**

- 工具条：上一个 / 下一个 + 跳转到 `#number`（输入 + Go）
- 主体：iframe，URL：`https://gitcode.com/{org}/{repo}/issues/{number}`
- **默认不选中**：右侧为空 iframe（`src` 为空）或等价空状态，不自动选第一条

### 4.3 选中与导航规则

1. 进入页面或切换 org/repo：清除选中，详情为空；切换 org/repo 时筛选重置并重拉 meta + issues
2. 筛选/排序变更：列表刷新；**已打开的详情保持不变**（当前 number 继续显示）
3. 若当前详情 number 不在新结果集中：详情仍保留，列表不高亮该项
4. 上一个 / 下一个：仅在**当前筛选结果集**内移动
5. 若当前详情 number 不在结果集：禁用上一个/下一个，直到用户重新点选列表项或成功跳号到结果集内项
6. 跳号：加载该 number 的 GitCode 详情页；若在当前列表中则高亮，否则仅更新 iframe/选中 number，列表不高亮

## 5. 数据流

1. 进入 `/issues` → 读 localStorage 的 org/repo；若为空则不请求，引导填写
2. 有 org/repo → 并行：
   - `GET /api/issues/meta?org=&repo=`
   - `GET /api/issues?...`（默认无筛选，默认排序：更新时间倒序）
3. 用户点选 / 跳号 / 上一个下一个 → 更新选中 number 与 iframe `src`
4. 筛选或排序变更 → 仅重拉 `/api/issues`，**不**清空或改写当前详情
5. 更换 org/repo → 清筛选、清选中、重拉 meta + issues

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
| `type` | Issue 类型，多选，逗号分隔 |
| `sort` | `created` \| `updated`（默认 `updated`） |
| `direction` | `asc` \| `desc`（默认 `desc`） |

多选语义：同一维度内为 OR；不同维度之间为 AND。

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
| org/repo 为空 | 不请求；列表区引导填写 |
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
| 持久化 | 仅 org/repo |
| 筛选维度 | 状态、创建者、负责人、Label、里程碑、Issue 类型（均可多选） |
| 排序 | 创建/更新时间 × 正序/倒序 |
| 默认选中 | 否；空 iframe |
| 筛选后详情 | 保持不变 |
| 应用形态 | 大型 SPA，同级路由预留 |
