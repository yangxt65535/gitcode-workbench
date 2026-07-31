# GitCode Token 配置与真 API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 顶栏配置 GitCode Token（校验用户、localStorage、清除）；未配置时 Issues 提示配置；已配置后经 BFF 调用真实 GitCode Issues API。

**Architecture:** 客户端 AuthContext + localStorage；`POST /api/auth/token` 校验；`/api/issues*` 读 Bearer 后用 `GitCodeIssueRepository` 调 `https://api.gitcode.com/api/v5`。Mock 仅保留单测。

**Tech Stack:** 现有 Next.js App Router + TypeScript；GitCode REST `/api/v5`（Bearer / PRIVATE-TOKEN）。

## Global Constraints

- UI 文案用「配置 Token / 清除 Token」，不用「登录 / 退出登录」
- Token + username 存 localStorage：`gitcode.workbench.token`、`gitcode.workbench.username`
- 弹窗不回填明文 Token；`type=password`
- 未配置 Token：Issues 不请求；EmptyState「请先配置 GitCode Token」
- 已配置：Issues 请求带 `Authorization: Bearer <token>`；BFF 401 → 清本地态并提示
- 服务端不把 Token 写入磁盘；仅当次请求使用
- 设计 token / 小圆角 / 少量动画遵循现有规范
- Spec：`docs/superpowers/specs/2026-08-01-gitcode-token-auth-design.md`
- Issues 列表 API：`GET https://api.gitcode.com/api/v5/repos/{owner}/{repo}/issues`
- 用户校验：`GET https://api.gitcode.com/api/v5/user`

---

## File Structure

```
lib/auth/storage.ts
lib/auth/AuthContext.tsx
lib/gitcode/client.ts              # fetchGitCode(path, { token, searchParams })
lib/gitcode/mapIssue.ts            # raw → Issue
lib/issues/gitcodeIssueRepository.ts
lib/issues/repository.ts           # getIssueRepository(token) → GitCode
lib/issues/authHeader.ts           # extractBearer(req)
app/api/auth/token/route.ts
app/api/issues/route.ts            # require bearer
app/api/issues/meta/route.ts
components/ui/Modal.tsx (+ css)
components/auth/TokenStatus.tsx
components/auth/TokenModal.tsx
components/shell/AppShell.tsx      # 右上 TokenStatus
app/layout.tsx                     # AuthProvider
components/issues/IssuesWorkbench.tsx
tests/gitcode/mapIssue.test.ts
tests/auth/extractBearer.test.ts   # 或 authHeader
README.md
```

---

### Task 1: Auth storage + BFF token 校验

**Files:**
- Create: `lib/auth/storage.ts`, `lib/auth/AuthContext.tsx`, `lib/gitcode/client.ts`, `app/api/auth/token/route.ts`
- Test: `tests/gitcode/clientAuth.test.ts`（可选纯函数：解析 user JSON）

**Interfaces:**
- `readAuth(): { token: string; username: string } | null`
- `writeAuth({ token, username })` / `clearAuth()`
- `useAuth(): { token, username, setSession, clearSession, ready }`
- `fetchGitCodeUser(token): Promise<{ login: string; name?: string; avatar_url?: string }>`
- `POST /api/auth/token` → `{ username }` or 401

- [ ] **Step 1:** 实现 storage + `fetchGitCode` helper（Base `https://api.gitcode.com/api/v5`，header Bearer，401 抛错）
- [ ] **Step 2:** 实现 `POST /api/auth/token`（trim token；空 → 400；调 `/user`；返回 `username: login`）
- [ ] **Step 3:** 实现 `AuthContext`（hydration 后读 storage；`ready` 避免闪烁）
- [ ] **Step 4:** `npm run build` 通过；Commit `feat: add token auth storage and validate BFF`

---

### Task 2: Token UI（顶栏 + 弹窗）

**Files:**
- Create: `components/ui/Modal.tsx`, `Modal.module.css`, `components/auth/TokenStatus.tsx`, `TokenModal.tsx` + css
- Modify: `AppShell.tsx` / `AppShell.module.css`, `app/layout.tsx`

- [ ] **Step 1:** Modal 组件（遮罩、居中、Esc/点遮罩关闭可选）
- [ ] **Step 2:** TokenModal：password 输入、确认调 `/api/auth/token`、错误展示、清除按钮（已配置时）
- [ ] **Step 3:** TokenStatus：未配置「配置 Token」；已配置显示 username；点击开弹窗
- [ ] **Step 4:** AppShell 右上放 TokenStatus（nav 左侧或最右侧——**最右侧**）
- [ ] **Step 5:** layout 包 `AuthProvider`；Commit `feat: add token config modal in app shell`

---

### Task 3: GitCodeIssueRepository + 保护 Issues API

**Files:**
- Create: `lib/gitcode/mapIssue.ts`, `lib/issues/gitcodeIssueRepository.ts`, `lib/issues/authHeader.ts`
- Modify: `lib/issues/repository.ts`, `app/api/issues/route.ts`, `app/api/issues/meta/route.ts`
- Test: `tests/gitcode/mapIssue.test.ts`

**Behavior:**
- `extractBearer(req)`：从 `Authorization: Bearer …` 取 token；无则 null
- `getIssueRepository(token: string): IssueRepository` → `new GitCodeIssueRepository(token)`
- `list`：请求 `/repos/{org}/{repo}/issues`，query 映射：
  - `state`：若多选含 open+closed 或不限 → `state=all`；单值则传该值
  - `labels`：逗号（GitCode 单参数；多 label 由 API 语义决定，不足则客户端二次 filter）
  - `sort`/`direction`/`assignee`/`creator`/`milestone`：能传则传；多选维度对 API 只传第一个或拉 `per_page=100` 多页后本地 AND/OR 过滤（**推荐**：拉最多 3 页 `per_page=100`，再按现有 Mock 过滤逻辑本地过滤，保证多选语义）
- `meta`：基于拉全量（或前 N 页）聚合，同 Mock 的 uniqueSorted
- 无 Bearer → 401 `{ message: "token required" }`

- [ ] **Step 1:** TDD `mapIssue` fixture → `Issue`
- [ ] **Step 2:** 实现 repository + 改 routes
- [ ] **Step 3:** `npm test && npm run build`；Commit `feat: serve issues via GitCode API with bearer token`

---

### Task 4: IssuesWorkbench 鉴权门闩 + README

**Files:**
- Modify: `components/issues/IssuesWorkbench.tsx`, `README.md`

- [ ] **Step 1:** 无 token → 不 fetch；EmptyState「请先配置 GitCode Token」
- [ ] **Step 2:** fetch 带 `Authorization: Bearer ${token}`；401 → `clearSession()` + 错误文案
- [ ] **Step 3:** README 说明配置 Token、localStorage、真 API
- [ ] **Step 4:** 全量 `npm test && npm run build`；Commit `feat: gate issues UI on configured token`

---

## Self-Review

| Spec 项 | Task |
|---------|------|
| 配置/清除 Token UI | 2 |
| BFF 校验 /user | 1 |
| localStorage | 1 |
| Issues 无 Token 提示 | 4 |
| Issues 真 API + Bearer | 3–4 |
| 401 清态 | 4 |
| Mock 仅测 | 3（routes 不再 get Mock） |
