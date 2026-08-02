# AGENTS.md

面向 AI Agent 与代码贡献者的开发指南。用户使用说明见 [README.md](./README.md)。

## 硬性约束

| 约束 | 说明 |
|------|------|
| **纯静态 SPA** | `next.config.ts` 启用 `output: "export"`，**禁止**添加 API Route、Server Action、SSR 数据获取 |
| **浏览器直连 GitCode** | 所有 GitCode 请求经 `lib/gitcode/client.ts` 的 `fetchGitCode()`，Token 从 `useAuth()` 读取 |
| **无 BFF** | 不可引入后端代理；CORS 限制需在客户端处理（如 Issue/PR 分页总数探测） |
| **GitHub Pages 兼容** | CI 构建设 `GITHUB_PAGES=true` 启用 `basePath=/gitcode-workbench`；新增路由须为静态可导出页面 |
| **禁止提交密钥** | `.token`、真实 PAT 等敏感文件不得入库 |

## 技术栈

- Next.js 15 App Router（静态导出）
- React 19 + TypeScript
- CSS Modules（无 Tailwind）
- Vitest + jsdom
- GitCode OpenAPI v5：`https://api.gitcode.com/api/v5`

## 目录结构

```
app/                    # 路由入口（薄包装，渲染 *Workbench）
components/
  issues/ pulls/ repos/ # 各模块 UI（Workbench + List + Detail + Filters）
  shell/                # AppShell、ModuleNav
  ui/                   # 通用组件（Button、Modal、TextInput…）
  auth/                 # Token 配置 UI
lib/
  auth/                 # AuthContext + localStorage
  workspace/            # WorkspaceContext + org/repo localStorage
  gitcode/              # fetchGitCode、map*、fetch*Detail、fetchRepoData
  issues/ pulls/ repos/ # 领域类型、queryLogic、Repository（如有）
tests/                  # 与 lib/ 镜像的单元测试
docs/superpowers/       # 设计文档与实现计划（参考用，非运行时依赖）
```

## 模块模式

三个工作台（Issues / Pulls / Repos）遵循相同骨架，新增模块请对齐：

```
app/{module}/page.tsx          → 渲染 {Module}Workbench
components/{module}/           → Workbench 编排 + 子组件
lib/{module}/types.ts          → 领域类型
lib/{module}/queryLogic.ts     → 纯函数筛选/排序（可单测）
lib/gitcode/map*.ts            → GitCode 原始 JSON → 领域类型
lib/gitcode/fetch*Detail.ts    → 详情/评论 API（Issues、Pulls）
lib/{module}/gitcode*Repository.ts  → 列表分页与 meta 拉取（Issues、Pulls）
```

**Repos 例外**：无 Repository 层，Workbench 直接调用 `lib/gitcode/fetchRepoData.ts` 与 `lib/repos/commitDiff.ts`。

### 共享上下文

- **`useWorkspace()`** — 当前 `org` / `repo`；切换仓库时 Workbench 须重置本地 state（见下节）。
- **`useAuth()`** — `token`、`username`、`ready`；401 时调用 `clearSession()`。
- **`RepoConfirmBar`** — Issues / Pulls / Repos 共用，写入 Workspace。

### Workbench 状态约定

1. **workspace 绑定重置**：维护 `boundWorkspace` 与 `workspaceKey = org + repo`；不等时批量 reset filters/page/列表/error。
2. **请求取消**：`useEffect` 内创建 `AbortController`，cleanup 中 `abort()`。
3. **401 统一处理**：捕获 `GitCodeHttpError` 且 `status === 401` → `clearSession()` + 用户可读错误。
4. **meta 与列表分离加载**（Repos）：分支 meta 就绪后再拉 commit；分支切换时重置 page 与 pending scroll。
5. **避免 effect 循环**：默认分支与 state 初值相同时，用 `metaReadyKey` state（非 ref）触发 commit 加载。

## GitCode API 层

```typescript
// 所有请求入口
fetchGitCode(path, { token, searchParams?, signal? })

// 错误类型
GitCodeHttpError { status, message }

// 映射函数命名
mapGitCodeIssue / mapGitCodePull / mapGitCodeCommit / mapGitCodeComment
```

- 新增 API 调用：在 `lib/gitcode/` 添加 fetch/map，**不要**在组件内拼 URL。
- Issue/PR 列表：`total_count` / `total_page` 响应头常被 CORS 隐藏，Repository 内有 totals 探测与缓存逻辑，修改分页时须读 `gitcodeIssueRepository.ts` / `gitcodePullRepository.ts`。
- Repos commit：`fetchAllCommits()` 最多 50 页 × 100 条；展示分页用 `sliceCommitPage()`。

## 测试

```bash
npm test                  # 全量
npm test -- --run tests/issues/…  # 单文件
```

| 测什么 | 放哪里 |
|--------|--------|
| 纯函数（queryLogic、commitDiff、map*） | `tests/{module}/` 或 `tests/gitcode/` |
| Mock 数据 | 仅测试用，`lib/issues/mockData.ts`、`mockIssueRepository.ts` |
| UI 组件 | 当前无 E2E；优先测 lib 纯函数 |

**常用测试仓库**：`openFuyao/e2e-auto-test`（默认分支 `main`）。本地 Token 放项目根 `.token`（已 gitignore），**勿提交**。

修改后至少运行 `npm test` 与 `npm run build`。

## UI 与样式

- 复用 `components/ui/` 现有组件，保持 CSS Modules 命名：`ComponentName.module.css`。
- 设计 Token 在 `app/globals.css` `:root`；样例页 `/design-system`。
- 中文 UI 文案；日期用 `toLocaleString("zh-CN", …)`。

## 设计文档

| 文档 | 内容 |
|------|------|
| `docs/superpowers/specs/2026-08-01-gitcode-workbench-design.md` | 整体工作台 |
| `docs/superpowers/specs/2026-08-02-gitcode-pulls-workbench-design.md` | PR 模块 |
| `docs/superpowers/plans/` | 实现计划 |

实现新功能前先读相关 spec；**spec 与代码冲突时以代码为准**，但应更新 spec 或在本文件注明偏差。

## 提交规范

遵循现有 Conventional Commits：

```
feat: …    # 新功能
fix: …     # 缺陷修复
```

- 用户未明确要求时**不要**自动 commit / push。
- 按功能分 commit（如 PR 与 Repos 分开），勿提交 `.token`。

## 常见陷阱

1. **静态导出** — 不能用 `next/image` 优化、`headers()`、`cookies()`、动态 API。
2. **CORS 分页总数** — 勿假设响应头一定有 `total_count`。
3. **Repos 分支切换** — 主仓与 Fork commit 分 effect 加载，避免重复请求；切换分支重置 page。
4. **最后共有跳转** — 先 `pageForCommitIndex` 改页码，页渲染完成后再 increment `scrollToLastSharedToken` 触发滚动。
5. **PowerShell** — 本地命令用 `;` 链接，不用 `&&`；设置 env 用 `$env:VAR='value'`。

## 最小改动原则

- 只改与任务相关的文件；不重排无关代码。
- 新模块对齐 Issues/Pulls 模式，不引入新框架。
- 注释仅解释非显而易见的业务逻辑。
