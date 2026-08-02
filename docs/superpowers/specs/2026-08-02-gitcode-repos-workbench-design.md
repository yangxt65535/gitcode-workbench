# GitCode Repos 工作台 — 设计规格

日期：2026-08-02  
状态：已实现  
来源：Issue/PR 工作台平行扩展 + 需求对话

## 1. 目标

在现有 GitCode 工作台中实现 **仓库对比页**（`/repos`）：选定主仓与 Fork 仓库后，并排展示两侧分支 commit 列表，按 SHA 着色区分共有 / 独有 commit，并给出 Fork 相对主仓的领先/落后统计与「最后共有 commit」定位。数据走浏览器直连 GitCode OpenAPI v5。

## 2. 非目标

- commit diff / 文件变更预览
- 分支创建、合并、推送等写操作
- 多 Fork 同时对比（仅一个 Fork 用户）
- 服务端 BFF 或 compare/merge-base 专用 API（GitCode 无等价接口时由客户端 SHA 对比实现）

## 3. 布局（2×2）

| 区域 | 内容 |
|------|------|
| 左上 | `RepoConfirmBar` — 主仓 org/repo 确认（共用 Workspace） |
| 右上 | `ForkStatusCard` — Fork 用户名输入 + 确认 |
| 摘要条 | 全量对比统计 + Fork 状态徽章/链接 +「我的账号」快捷切换 |
| 左下 | `CommitPanel` — 主仓 Commits |
| 右下 | `CommitPanel` — Fork Commits |

左右 commit 列表**等高**；顶栏 Fork 详情下沉至摘要条 legend，避免左右高度失衡。

## 4. Fork 解析

- 输入 Fork **用户名**（owner），确认后请求 `GET /repos/{forkOwner}/{upstreamRepo}`。
- 校验 `forked_from_project.full_name`（或 `parent.full_name`）与当前主仓 `org/repo` 一致；否则视为未找到 Fork。
- 默认 Fork 用户名为当前 Token 对应用户；摘要条提供「我的账号」一键切换。
- 主仓 meta 就绪后并行：拉主仓分支列表、解析 Fork、拉 Fork 分支列表。
- Fork 默认分支：与主仓 default 同名则选中，否则取 Fork 第一分支。

## 5. 分支与 commit 列表

- 主仓 / Fork **各自独立**分支下拉；`main` / `master` 置顶，其余字母序（`sortBranchNames`）。
- 列表 newest-first；每项展示 short SHA（可外链 GitCode）、标题行 message、作者与时间。
- **展示分页**：每页 30 条；上一页 / 下一页 / 跳页（与 Issue 列表分页交互一致）。
- **数据分页**：GitCode Commits API `per_page` 最大 100，无单次全量接口；客户端按页拉取直至分支末尾或上限（50 页 × 100 = 5000 条）。

### 5.1 SHA 着色（方案 B）

基于**已加载的全量 SHA 集合**对当前页条目分类：

| 类型 | 含义 | 着色 |
|------|------|------|
| `shared` | 两侧均含该 SHA | 共有 |
| `upstream_only` | 仅主仓 | 仅主仓 |
| `fork_only` | 仅 Fork | 仅 Fork |

「最后共有 commit」：主仓列表自上而下第一个出现在 Fork SHA 集合中的 commit；条目高亮 + legend 可点击按钮。

### 5.2 对比统计（摘要条）

基于**当前已加载**两侧 commit 全量计算（`computeFullDiffStats`）：

| 指标 | 含义 |
|------|------|
| 主仓 N 个 | 主仓当前分支已加载 commit 总数 |
| Fork N 个 | Fork 当前分支已加载 commit 总数 |
| Fork 领先 | 最后共有 commit 之上，Fork 独有 commit 数 |
| 落后 | 最后共有 commit 之上，主仓独有 commit 数 |
| 最后共有 | 上述共有点的 short SHA |

加载未完成时总数显示 `N…`；领先/落后/最后共有的在 `isDiffStatsReady` 为真后展示（找到共有 SHA，或两侧均已拉取完毕）。

### 5.3 「最后共有」跳转

1. 计算该 SHA 在主仓 / Fork 各自列表中的 index → 目标页码（`pageForCommitIndex`）。
2. **先**将两侧页码跳到目标页。
3. 页数据渲染完成后 increment `scrollToLastSharedToken`，`CommitPanel` 内平滑滚动到高亮项。

## 6. 性能与缓存

GitCode 限制单次最多 100 条 commit，上百 commit 需多次请求。优化策略：

| 策略 | 说明 |
|------|------|
| **渐进加载** | 第 1 页返回后立即展示列表与部分统计；后续页后台继续 |
| **并行分页** | 第 1 页串行，之后每批 4 页并行请求 |
| **分支缓存** | `lib/repos/commitCache.ts`，按 `org/repo/branch` 内存缓存 |
| **LRU 上限** | 每个仓库（主仓与 Fork **各自独立**）最多保留 **3 个分支**缓存；超出淘汰最久未访问分支 |
| **缓存失效** | 切换 workspace（组织/仓库确认变更）时 `clearCommitCache()` |

切换已缓存分支时命中缓存，不再请求 API。

## 7. 数据层

```
ReposWorkbench
  → fetchRepoDetail / fetchBranches / resolveForkRepo   (lib/gitcode/fetchRepoData.ts)
  → fetchAllCommitsCached                               (lib/repos/commitCache.ts)
      → fetchAllCommits → fetchCommits
  → classify* / computeFullDiffStats / sliceCommitPage  (lib/repos/commitDiff.ts)
```

**API**

| 用途 | 接口 |
|------|------|
| 主仓详情 | `GET /repos/{org}/{repo}` |
| 分支列表 | `GET /repos/{org}/{repo}/branches?per_page=100` |
| commit 列表 | `GET /repos/{org}/{repo}/commits?sha={branch}&page=&per_page=` |
| Fork 仓库 | `GET /repos/{forkOwner}/{upstreamRepo}` + forked_from 校验 |

**无 Repository 层**：Workbench 直接编排 fetch 与纯函数 diff，与 Issues/Pulls 的 Repository 模式刻意区分（只读、无复杂 query）。

## 8. 状态与生命周期

- 共用 `useWorkspace()`、`useAuth()`；401 → `clearSession()`。
- `workspaceKey` 变更时批量 reset：Fork、分支、commit 列表、页码、缓存、pending scroll。
- 主仓 / Fork commit **分 effect 加载**；切换分支仅 reset 对应侧 page，不重复拉 meta。
- `metaReadyKey` state 标记主仓 meta 就绪，避免默认分支与初值相同导致 commit effect 不触发。

## 9. 架构决策

- 平行模块：`lib/repos/` + `components/repos/`，复用 `RepoConfirmBar`、分页 UI 模式。
- 不抽取共享 Workbench 框架；不引入 compare API 依赖（接口不存在或不可用时的兜底）。
- 分类与统计为**纯函数**，便于单测。

## 10. 测试

| 范围 | 文件 |
|------|------|
| SHA 分类与统计 | `tests/repos/commitDiff.test.ts` |
| 分支排序 | `tests/repos/branchSort.test.ts` |
| 分支缓存 LRU | `tests/repos/commitCache.test.ts` |
| Fork 校验 | `tests/gitcode/fetchRepoData.test.ts` |

集成验证：项目根 `.token` + 仓库 `openFuyao/e2e-auto-test`（默认分支 `main`）。

## 11. 文件清单

```
app/repos/page.tsx
components/repos/ReposWorkbench.tsx
components/repos/CommitPanel.tsx
components/repos/ForkStatusCard.tsx
lib/gitcode/fetchRepoData.ts
lib/repos/types.ts
lib/repos/commitDiff.ts
lib/repos/commitCache.ts
lib/repos/branchSort.ts
tests/repos/*.test.ts
```
