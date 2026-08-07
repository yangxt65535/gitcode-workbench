# GitCode Dashboard — 设计规格

日期：2026-08-08  
状态：已定稿（待实现计划）  
来源：需求对话（左右对半「我的」Issue/PR 看板）

## 1. 目标

新增 **Dashboard** 页面（`/dashboard`）：左右对半展示当前用户在某个组织下 **自己创建的** Issues 与 Pull Requests。支持按创建/更新时间排序，按状态、标签、仓库筛选；选中一侧条目时自动高亮对侧可见的关联项；支持单条 PR 刷新标签与状态。点击不做详情页。

## 2. 非目标

- 详情面板 / iframe / 评论
- Issue 行内单项刷新
- 两侧独立仓库筛选或「一键同步仓库」
- 指派给我的、评审人视角（仅 creator / author）
- 修改 Issue/PR 状态或标签（只读；PR 仅允许元数据刷新）
- 跨组织总览
- 本页筛选状态持久化到 URL（可后续加）
- BFF / API Route / Server Action

## 3. 范围与身份

| 项 | 约定 |
|----|------|
| 身份范围 | 仅「我创建的」：Issue 用 `filter=created`；PR 用 `author={username}` |
| 组织 | 顶栏确认 org（读写现有 `useWorkspace().org`；本页不要求 repo） |
| 仓库 | 顶栏共用：全部 / 多选特定仓，**同时**作用于左右两侧 |
| 导航 | `ModuleNav` 增加 Dashboard → `/dashboard` |

## 4. 布局与筛选

### 4.1 布局

```
[ Org 确认条 ] [ 仓库：全部 | 多选… ]
┌─────────────────────┬─────────────────────┐
│ Issues（左）         │ Pulls（右）          │
│ 状态/标签/排序       │ 状态/标签/排序       │
│ 列表 + 分页          │ 列表 + 分页          │
└─────────────────────┴─────────────────────┘
```

- 无详情栏；点击行只做选中/高亮
- 视觉对齐现有设计 Token（`globals.css`）；列表选中用 `--accent-subtle` + 左侧 2px accent 条

### 4.2 共用筛选（顶栏）

| 维度 | 行为 |
|------|------|
| org | 确认后绑定；切换时重置两侧列表/选中/关联 |
| 仓库 | 全部，或从组织仓库列表多选；变更后两侧重新拉取 |

### 4.3 单侧筛选（各自独立）

| 维度 | 类型 | 默认 |
|------|------|------|
| 状态 | Issue：open / closed / all；PR：open / closed / merged / all | open |
| 标签 | 多选（选项来自当前已加载列表标签并集） | 无 |
| 排序字段 | created / updated | updated |
| 排序方向 | asc / desc | desc |

多选语义：同维度 OR，跨维度 AND。能下推 GitCode 的优先服务端；仓库多选与无法下推的组合在客户端 `queryLogic` 二次过滤。

改单侧筛选时只重置该侧页码；改顶栏仓库/org 时两侧一起重置。

## 5. 列表项与交互

### 5.1 列表展示

每行：`#number`、标题、**仓库名**、状态、标签摘要、排序对应时间。  
标题旁提供外链图标，新标签打开 `html_url`（GitCode 原页）。

### 5.2 选中与关联高亮

1. 单击一行 → primary 选中（accent 左边条 + 浅底）
2. 选中后请求关联 API：
   - Issue → `GET /repos/{org}/{repo}/issues/{n}/pull_requests`
   - PR → `GET /repos/{org}/{repo}/pulls/{n}/issues`
3. 对侧列表中能匹配到的关联项加 **related** 高亮（弱于 primary，如浅底/淡边框，不用第二条左边条）
4. 关联项不在当前列表（被筛选掉或未加载）→ **静默忽略**，不提示、不改筛选
5. 再点同一行 → 取消选中并清除关联高亮；点另一行 → 切换并重拉关联
6. **不**打开详情页

跨仓唯一键：`{repo}#{number}`（同 org 内）。

### 5.3 PR 单项刷新

- 每行 PR 有「刷新」按钮
- 点击只 `GET /repos/{org}/{repo}/pulls/{n}`，原地更新该行 `state`、`labels`、`updated_at`
- 按钮行内 loading；失败轻量提示，不整表清空
- Issue 侧首版不做单项刷新

### 5.4 加载与错误

- `useEffect` + `AbortController`；切换 org/仓库集时 abort
- 401 → `clearSession()` + 可读错误（与现有 Workbench 一致）
- 「全部仓库」拉 PR：并发上限 4–6；顶栏进度「已加载 x/y 个仓库」
- 单仓失败：跳过并累计警告，不阻断其余仓
- 防护：组织仓库数或聚合条数过大时给出上限提示，避免浏览器卡死（具体上限实现计划中定）

## 6. 数据层

### 6.1 目录

```
app/dashboard/page.tsx
components/dashboard/
  DashboardWorkbench.tsx
  DashboardFiltersBar.tsx     # org + 仓库多选
  PaneFilters.tsx             # 单侧状态/标签/排序
  IssuePane.tsx / PullPane.tsx
  DashboardListItem.tsx
lib/dashboard/
  types.ts
  queryLogic.ts
lib/gitcode/
  fetchOrgRepos.ts
  fetchOrgUserIssues.ts       # /orgs/{org}/issues?filter=created
  fetchOrgUserPulls.ts        # 按仓聚合 pulls?author=
  fetchIssueRelatedPulls.ts   # 可从现有 fetchIssueDetail 抽出
  fetchPullRelatedIssues.ts
  refreshPullMeta.ts          # 单 PR → state/labels
tests/dashboard/
  queryLogic.test.ts
  …
```

所有请求经 `lib/gitcode/client.ts` 的 `fetchGitCode()`；Token / username 来自 `useAuth()`。

### 6.2 API 映射

| 用途 | 端点 |
|------|------|
| 组织仓库列表 | `GET /orgs/{org}/repos` |
| 我创建的 Issues | `GET /orgs/{org}/issues?filter=created` |
| 我创建的 PRs | `GET /repos/{org}/{repo}/pulls?author={username}`（按仓） |
| Issue 关联 PR | `GET /repos/{org}/{repo}/issues/{n}/pull_requests` |
| PR 关联 Issue | `GET /repos/{org}/{repo}/pulls/{n}/issues` |
| 刷新单 PR | `GET /repos/{org}/{repo}/pulls/{n}` |

说明：GitCode **无**组织级 PR 列表，故 PR 侧必须按仓聚合。

### 6.3 领域类型要点

- `DashboardIssue` / `DashboardPull`：在现有 Issue/Pull 字段基础上 **必含** `org`、`repo`
- `Selection`：`{ side: "issue" \| "pull"; repo: string; number: number }`
- `relatedKeys: Set<string>`：由关联 API 结果生成，渲染时比对

### 6.4 分页策略

- **Issue**：组织 API 分页；若启用仓库客户端过滤，按需多页拉取直到填满当前展示页或无更多
- **PR**：选定仓分别拉取后客户端合并 → `queryLogic` 排序/筛选 → `slice` 分页（避免跨仓页码错乱）
- 默认每页 20

### 6.5 测试

- 纯函数：`queryLogic`、关联 key 匹配、单 PR meta 合并
- 无 E2E；改完跑 `npm test` 与 `npm run build`

## 7. 与现有模块关系

- **不**复用 `IssuesWorkbench` / `PullsWorkbench` 整页状态机（其绑定单仓 + 详情面板）
- **可**复用：`fetchGitCode`、map 函数、UI 控件（`Button`、`ErrorBanner`、多选等）、设计 Token、`RepoConfirmBar` 的 org 交互模式（本页可裁剪为 Org 确认 + 仓库多选）
- Workspace：读写 `org`；不强制写入 `repo`（避免干扰 Issues/Pulls 页当前仓）

## 8. 验收清单

1. 导航可进入 `/dashboard`；未登录提示配置 Token
2. 确认 org 后左右分别展示我创建的 Issue / PR，行内含仓库名
3. 顶栏「全部」或若干仓筛选同时作用于两侧
4. 两侧可独立按状态、标签、创建/更新时间筛选排序
5. 选中一侧 → 对侧可见关联项高亮；不可见则静默
6. 再点取消选中；切换选中更新关联高亮
7. PR 行「刷新」只更新该行状态/标签，不重拉整表
8. 点击行不出现详情面板；外链可打开 GitCode
9. 401 清会话；切换 org/仓库取消进行中请求
10. `npm test` 与 `npm run build` 通过

## 9. 决策记录

| 决策 | 选择 |
|------|------|
| 架构 | 新模块 Dashboard，组织级聚合（方案 A） |
| 「自己的」 | 仅创建者（A） |
| 仓库筛选 | 顶栏共用，全部或特定仓，作用于两边 |
| 关联不可见 | 静默忽略（C） |
| PR 刷新入口 | 每行刷新按钮（A） |
| 详情 | 不做 |
