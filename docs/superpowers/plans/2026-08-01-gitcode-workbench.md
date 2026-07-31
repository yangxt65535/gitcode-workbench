# GitCode 工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建可扩展的 GitCode SPA 工作台：先交付设计规范样例页，再交付 Mock BFF 驱动的 Issue 看板（列表筛选排序 + iframe 详情导航）。

**Architecture:** Next.js App Router 作为 SPA 壳；模块路由同级预留；Issues 经 Route Handlers BFF 调用 `IssueRepository`（首版 `MockIssueRepository`）；详情用 GitCode iframe；org/repo 经 React Context + localStorage 共享。

**Tech Stack:** Next.js 15 (App Router) + TypeScript + React 19 + CSS Modules / 全局 CSS 变量 + Vitest（Repository 单测）

## Global Constraints

- 实现顺序：先 `/design-system` 样例，经人工确认视觉后，再写 Issues 业务 UI
- 视觉：简约中性 + 单强调色 `#2563EB`；圆角控件 4–6px / 面板 6–8px；动画仅 120–180ms ease-out 反馈
- 数据：首版仅 Mock，不接真实 GitCode Token
- 持久化：仅 `org` / `repo`（localStorage）；筛选排序不持久化
- 默认不选中 Issue；筛选/排序变更不改变已打开详情
- 上一个/下一个仅在当前结果集内；当前 number 不在结果集时禁用
- Spec：`docs/superpowers/specs/2026-08-01-gitcode-workbench-design.md`

---

## File Structure

```
app/
  layout.tsx                 # 根布局：globals + WorkspaceProvider + AppShell
  page.tsx                   # redirect → /issues
  globals.css                # CSS 变量与基础样式
  design-system/page.tsx     # 设计规范样例（业务前）
  issues/page.tsx            # Issue 看板
  pulls/page.tsx             # 占位
  repos/page.tsx             # 占位
  settings/page.tsx          # 占位（含链到 design-system）
  api/issues/route.ts        # GET 列表
  api/issues/meta/route.ts   # GET meta
components/
  shell/AppShell.tsx         # 顶栏、导航、org/repo、内容区
  shell/ModuleNav.tsx
  shell/RepoInputs.tsx
  ui/Button.tsx
  ui/TextInput.tsx
  ui/MultiSelect.tsx
  ui/EmptyState.tsx
  ui/ErrorBanner.tsx
  issues/IssueFilters.tsx
  issues/IssueList.tsx
  issues/IssueListItem.tsx
  issues/IssueDetailPanel.tsx
  issues/IssuesWorkbench.tsx
lib/
  workspace/storage.ts       # localStorage 读写
  workspace/WorkspaceContext.tsx
  issues/types.ts
  issues/parseQuery.ts       # 解析 URLSearchParams → 查询对象
  issues/repository.ts       # IssueRepository 接口 + getIssueRepository()
  issues/mockData.ts
  issues/mockIssueRepository.ts
  issues/detailNav.ts        # prev/next 可用性与索引计算（可单测）
tests/
  issues/mockIssueRepository.test.ts
  issues/detailNav.test.ts
package.json
vitest.config.ts
tsconfig.json
next.config.ts
README.md
```

---

### Task 1: Scaffold Next.js + 设计 Token

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `README.md`
- Create: `.gitignore`（含 `.next`, `node_modules`, `.env*`）

**Interfaces:**
- Produces: Next app 可 `npm run dev`；`:root` 上定义全部 CSS 变量

- [ ] **Step 1: 初始化项目文件**

在仓库根目录创建 Next.js + TS 工程（可用 `npx create-next-app@latest . --typescript --eslint --app --src-dir=false --tailwind=false --import-alias "@/*" --turbopack`，若目录非空则手动写等价文件）。**不要启用 Tailwind**——用全局 CSS 变量 + CSS Modules / 普通 class，避免与设计 token 冲突。

`package.json` scripts 至少包含：

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

devDependencies 增加：`vitest`, `@vitejs/plugin-react`, `jsdom`（若测 DOM 需要）。

- [ ] **Step 2: 写入 `app/globals.css` token**

```css
:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --border: #e5e7eb;
  --text: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --accent: #2563eb;
  --accent-subtle: #eff6ff;
  --danger: #dc2626;
  --success: #059669;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --duration: 150ms;
  --ease: ease-out;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Noto Sans SC", sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  font-family: var(--font);
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
}

a {
  color: var(--accent);
  text-decoration: none;
}

button,
input,
select {
  font: inherit;
}
```

- [ ] **Step 3: 最小 `app/layout.tsx` 与 `app/page.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitCode 工作台",
  description: "GitCode workbench SPA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/issues");
}
```

- [ ] **Step 4: 安装依赖并验证启动**

Run: `npm install && npm run dev`  
Expected: 本地可打开；访问 `/` 重定向（此时 `/issues` 可能 404，下任务补齐）

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts app .gitignore README.md
git commit -m "chore: scaffold Next.js app with design tokens"
```

---

### Task 2: 基础 UI 组件 + `/design-system` 样例页

**Files:**
- Create: `components/ui/Button.tsx`, `TextInput.tsx`, `MultiSelect.tsx`, `EmptyState.tsx`, `ErrorBanner.tsx` + 各自 `*.module.css`（或同目录 css）
- Create: `app/design-system/page.tsx`
- Create: `components/shell/AppShell.tsx`, `ModuleNav.tsx`, `RepoInputs.tsx`（壳可先简化：样例页也包在壳里）
- Create: `lib/workspace/storage.ts`, `WorkspaceContext.tsx`
- Modify: `app/layout.tsx` — 包裹 `WorkspaceProvider` + `AppShell`
- Create: `app/issues/page.tsx`, `app/pulls/page.tsx`, `app/repos/page.tsx`, `app/settings/page.tsx` — Issues/其余暂占位文案

**Interfaces:**
- Produces:
  - `Button` props: `{ variant: "primary" | "secondary" | "ghost"; disabled?: boolean; onClick?; children; type? }`
  - `TextInput` props: `{ value; onChange; placeholder?; onBlur?; onKeyDown? }`
  - `MultiSelect` props: `{ label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }`
  - `readWorkspace(): { org: string; repo: string }` / `writeWorkspace({ org, repo })`
  - `useWorkspace(): { org; repo; setOrg; setRepo; commitRepo }`

**CHECKPOINT（人工）:** 本任务完成后必须停下来，让用户打开 `/design-system` 确认视觉，再进入 Task 3+ 业务实现。

- [ ] **Step 1: 实现 `lib/workspace/storage.ts`**

```ts
const ORG_KEY = "gitcode.workbench.org";
const REPO_KEY = "gitcode.workbench.repo";

export function readWorkspace(): { org: string; repo: string } {
  if (typeof window === "undefined") return { org: "", repo: "" };
  return {
    org: localStorage.getItem(ORG_KEY) ?? "",
    repo: localStorage.getItem(REPO_KEY) ?? "",
  };
}

export function writeWorkspace(next: { org: string; repo: string }): void {
  localStorage.setItem(ORG_KEY, next.org.trim());
  localStorage.setItem(REPO_KEY, next.repo.trim());
}
```

- [ ] **Step 2: 实现 `WorkspaceContext` + 壳组件**

- 顶栏高 52px，背景 `--surface`，底边 `--border`
- 左侧标题「GitCode 工作台」
- 中部 org / repo 两个 `TextInput`，blur 或 Enter 调用 `writeWorkspace` + context 更新
- 导航链接：`/issues` `/pulls` `/repos` `/settings`；当前路由用 `border-bottom: 2px solid var(--accent)`，transition `border-color var(--duration) var(--ease)`
- `AppShell` 内容区 `flex: 1; min-height: 0; overflow: hidden`

- [ ] **Step 3: 实现 UI 基础组件样式**

按钮：高 32px，圆角 `var(--radius-md)`，primary 背景 accent / 白字；secondary 白底边框；ghost 无边框。`:active { transform: translateY(1px); }` 过渡 `var(--duration)`。

输入：高 32px，圆角 `var(--radius-md)`，`border: 1px solid var(--border)`；`:focus { outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent); outline-offset: 1px; }`

`MultiSelect`：可用原生 `<select multiple>` 或 checkbox 下拉面板；样式对齐输入框；展开可用 max-height 过渡（≤180ms）。

列表行示意 class：`.row` hover `background: #f3f4f6`；`.rowSelected` 背景 `--accent-subtle` + `box-shadow: inset 2px 0 0 var(--accent)`。

- [ ] **Step 4: 实现 `/design-system` 页**

必须展示分区：
1. 色板（色块 + token 名）
2. 按钮三种 + disabled
3. 输入框 focus 态说明
4. MultiSelect 示例（绑定本地 state）
5. 列表行：默认 / hover 提示 / 选中
6. EmptyState、ErrorBanner
7. 简易左右分栏示意（左 36% / 右 64%，细边框）

Settings 占位页加链接：「查看设计规范样例 → `/design-system`」。

Issues/Pulls/Repos 占位：「模块开发中」+ `EmptyState`。

- [ ] **Step 5: 手动打开样例并截图自检**

Run: `npm run dev` → 打开 `http://localhost:3000/design-system`  
Expected: 视觉符合 spec §2.5；无大圆角、无紫渐变、无多余动画

- [ ] **Step 6: Commit**

```bash
git add app components lib
git commit -m "feat: add app shell, UI primitives, and design-system sample page"
```

- [ ] **Step 7: 等待用户确认视觉基线**

向用户确认 `/design-system` 是否 OK。未确认前不要开始 Task 3。

---

### Task 3: Issue 类型 + MockRepository（TDD）

**Files:**
- Create: `lib/issues/types.ts`, `mockData.ts`, `mockIssueRepository.ts`, `repository.ts`, `parseQuery.ts`
- Test: `tests/issues/mockIssueRepository.test.ts`

**Interfaces:**
- Produces:

```ts
// lib/issues/types.ts
export type IssueState = "open" | "closed";

export interface IssueLabel {
  name: string;
  color?: string;
}

export interface IssueUser {
  login: string;
}

export interface Issue {
  number: number;
  title: string;
  state: IssueState;
  labels: IssueLabel[];
  milestone: string | null;
  issue_type: string;
  user: IssueUser;
  assignees: IssueUser[];
  created_at: string; // ISO
  updated_at: string; // ISO
  html_url: string;
}

export interface IssueQuery {
  org: string;
  repo: string;
  state?: string[];
  creator?: string[];
  assignee?: string[];
  label?: string[];
  milestone?: string[];
  type?: string[];
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
}

export interface IssueMeta {
  states: string[];
  creators: string[];
  assignees: string[];
  labels: string[];
  milestones: string[];
  types: string[];
}

export interface IssueRepository {
  list(query: IssueQuery): Promise<Issue[]>;
  meta(org: string, repo: string): Promise<IssueMeta>;
}
```

```ts
// lib/issues/repository.ts
import { MockIssueRepository } from "./mockIssueRepository";
import type { IssueRepository } from "./types";

export function getIssueRepository(): IssueRepository {
  return new MockIssueRepository();
}
```

- [ ] **Step 1: 写失败单测**

```ts
// tests/issues/mockIssueRepository.test.ts
import { describe, expect, it } from "vitest";
import { MockIssueRepository } from "@/lib/issues/mockIssueRepository";

const base = {
  org: "demo-org",
  repo: "demo-repo",
  sort: "updated" as const,
  direction: "desc" as const,
};

describe("MockIssueRepository", () => {
  const repo = new MockIssueRepository();

  it("filters by state OR within dimension", async () => {
    const rows = await repo.list({ ...base, state: ["open"] });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.state === "open")).toBe(true);
  });

  it("ANDs across dimensions", async () => {
    const rows = await repo.list({
      ...base,
      state: ["open"],
      label: ["bug"],
    });
    expect(
      rows.every(
        (r) => r.state === "open" && r.labels.some((l) => l.name === "bug"),
      ),
    ).toBe(true);
  });

  it("sorts by created asc", async () => {
    const rows = await repo.list({
      ...base,
      sort: "created",
      direction: "asc",
    });
    const times = rows.map((r) => Date.parse(r.created_at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("meta aggregates unique options", async () => {
    const meta = await repo.meta("demo-org", "demo-repo");
    expect(meta.states).toEqual(expect.arrayContaining(["open", "closed"]));
    expect(meta.labels.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run 确认失败**

Run: `npm test`  
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `mockData.ts`（≥12 条）**

覆盖：open/closed；多 creator；多 assignee；labels：`bug`/`enhancement`/`docs`；milestones：`v1.0`/`v1.1`/null；types：`defect`/`feature`/`task`。`html_url` 形如 `https://gitcode.com/demo-org/demo-repo/issues/{n}`。

- [ ] **Step 4: 实现 `MockIssueRepository`**

过滤规则：某维度 `undefined` 或 `[]` → 不限制；否则该维度 OR；维度间 AND。`assignee` 匹配 `assignees[].login`；`creator` 匹配 `user.login`；`label` 匹配 `labels[].name`；`type` 匹配 `issue_type`；`milestone` 匹配字符串（含需要匹配「无里程碑」时用特殊值 `__none__` **仅当测试需要**——首版若 meta 不含空里程碑，则只匹配非空名）。

排序默认 `updated` + `desc`。

`meta`：从全量 mock 聚合去重排序后的 options；`states` 固定 `["open","closed"]`。

- [ ] **Step 5: 实现 `parseQuery`**

```ts
export function splitCsv(v: string | null): string[] | undefined {
  if (!v || !v.trim()) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
```

从 `URLSearchParams` 构建 `IssueQuery`；缺 `org`/`repo` 时由 route 返回 400。

- [ ] **Step 6: Run 测试通过**

Run: `npm test`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/issues tests/issues vitest.config.ts
git commit -m "feat: add mock issue repository with filter/sort tests"
```

---

### Task 4: BFF Route Handlers

**Files:**
- Create: `app/api/issues/route.ts`, `app/api/issues/meta/route.ts`

**Interfaces:**
- Consumes: `getIssueRepository()`, `splitCsv` / parse helpers
- Produces: JSON `{ items: Issue[] }` 与 `{ meta: IssueMeta }`

- [ ] **Step 1: 实现 `GET /api/issues`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getIssueRepository } from "@/lib/issues/repository";
import { splitCsv } from "@/lib/issues/parseQuery";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const org = sp.get("org")?.trim() ?? "";
  const repo = sp.get("repo")?.trim() ?? "";
  if (!org || !repo) {
    return NextResponse.json(
      { message: "org and repo are required" },
      { status: 400 },
    );
  }
  const sort = sp.get("sort") === "created" ? "created" : "updated";
  const direction = sp.get("direction") === "asc" ? "asc" : "desc";
  const items = await getIssueRepository().list({
    org,
    repo,
    state: splitCsv(sp.get("state")),
    creator: splitCsv(sp.get("creator")),
    assignee: splitCsv(sp.get("assignee")),
    label: splitCsv(sp.get("label")),
    milestone: splitCsv(sp.get("milestone")),
    type: splitCsv(sp.get("type")),
    sort,
    direction,
  });
  return NextResponse.json({ items });
}
```

- [ ] **Step 2: 实现 `GET /api/issues/meta`**

同样校验 org/repo；返回 `{ meta }`。

- [ ] **Step 3: 手动 curl 验证**

Run:

```bash
curl "http://localhost:3000/api/issues?org=demo-org&repo=demo-repo&state=open&sort=updated&direction=desc"
curl "http://localhost:3000/api/issues/meta?org=demo-org&repo=demo-repo"
```

Expected: 200 + JSON；缺参 400

- [ ] **Step 4: Commit**

```bash
git add app/api
git commit -m "feat: add issues list and meta BFF routes"
```

---

### Task 5: `detailNav` 纯函数（TDD）+ Issues 工作台 UI

**Files:**
- Create: `lib/issues/detailNav.ts`
- Test: `tests/issues/detailNav.test.ts`
- Create: `components/issues/IssueFilters.tsx`, `IssueList.tsx`, `IssueListItem.tsx`, `IssueDetailPanel.tsx`, `IssuesWorkbench.tsx` + css
- Modify: `app/issues/page.tsx` — 渲染 `IssuesWorkbench`

**Interfaces:**
- Produces:

```ts
export function indexInResults(
  numbers: number[],
  selected: number | null,
): number {
  if (selected == null) return -1;
  return numbers.indexOf(selected);
}

export function canNavigate(
  numbers: number[],
  selected: number | null,
): { prev: boolean; next: boolean } {
  const i = indexInResults(numbers, selected);
  if (i < 0) return { prev: false, next: false };
  return { prev: i > 0, next: i < numbers.length - 1 };
}

export function neighbor(
  numbers: number[],
  selected: number | null,
  dir: -1 | 1,
): number | null {
  const i = indexInResults(numbers, selected);
  if (i < 0) return null;
  return numbers[i + dir] ?? null;
}

export function buildIssueUrl(
  org: string,
  repo: string,
  number: number,
): string {
  return `https://gitcode.com/${org}/${repo}/issues/${number}`;
}

export function parseJumpNumber(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 ? n : null;
}
```

- [ ] **Step 1: 为 `detailNav` 写测并实现至 PASS**

覆盖：无选中禁用；不在列表禁用；在列表两端边界；`parseJumpNumber` 拒绝 `0`/`abc`/`1.5`。

- [ ] **Step 2: 实现 `IssuesWorkbench` 状态机**

状态：
- `filters`: 各多选数组 + `sort` + `direction`（进入页默认空筛选、`updated`/`desc`）
- `items: Issue[]`, `meta`, `loading`, `error`
- `selectedNumber: number | null`（默认 `null`）

行为：
1. `org/repo` 为空 → 不请求，列表 `EmptyState`「请先填写组织和仓库」
2. 有 org/repo → 并行拉 meta + issues
3. org/repo 变化（来自 context）→ 清 filters、清 `selectedNumber`、重拉
4. filters/sort 变化 → 只重拉 issues，**保留** `selectedNumber`
5. 点击行 → `setSelectedNumber(n)`
6. prev/next → 用 `neighbor`；不可用时按钮 `disabled`
7. 跳号 → `parseJumpNumber`，合法则 `setSelectedNumber`
8. iframe：`selectedNumber == null` 时不设 `src`（或 `srcDoc` 空），显示空状态文案；有值则 `src={buildIssueUrl(...)}`，下方小字提示需登录 GitCode

- [ ] **Step 3: 接线 Filters / List / DetailPanel**

左 36% / 右 64%；列表加载中显示骨架条（3–5 行灰色块，无动画循环也可静态）；错误用 `ErrorBanner` + 重试按钮。

- [ ] **Step 4: 手动验收清单**

- [ ] 默认右侧空、无自动选中
- [ ] 点选后 iframe URL 正确
- [ ] 改筛选后详情 number 不变；若不在新列表则无高亮且 prev/next 禁用
- [ ] 在列表内 prev/next 正常
- [ ] 非法跳号不生效
- [ ] 刷新后 org/repo 恢复，筛选重置

- [ ] **Step 5: Commit**

```bash
git add lib/issues components/issues app/issues tests/issues
git commit -m "feat: implement issues workbench with list filters and iframe detail"
```

---

### Task 6: README 与收尾验证

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 写清启动方式与路由**

说明：`npm install` / `npm run dev` / `npm test`；路由表；Mock 固定 `demo-org`/`demo-repo`（任意 org/repo 都返回同一 mock 集即可——在 `MockIssueRepository` 中忽略 org/repo 差异或仅校验非空）；设计样例路径。

明确：任意非空 org/repo 均返回同一份 mock（便于试用），注释标明后续按仓区分。

- [ ] **Step 2: 全量验证**

Run: `npm test && npm run build`  
Expected: 测试通过；生产构建成功

- [ ] **Step 3: Commit**

```bash
git add README.md lib/issues/mockIssueRepository.ts
git commit -m "docs: add workbench usage notes and finalize mock behavior"
```

---

## Self-Review Notes

| Spec 项 | 对应 Task |
|---------|-----------|
| 设计规范 + `/design-system` 先于业务 | Task 2 + checkpoint |
| SPA 壳 + 同级路由预留 | Task 2 |
| org/repo localStorage | Task 2 |
| Mock BFF `/api/issues` + meta | Task 3–4 |
| 多选筛选 + 排序 | Task 3–5 |
| 默认不选中、筛选保持详情 | Task 5 |
| prev/next/跳号规则 | Task 5 + detailNav 测试 |
| 错误/空/加载 | Task 5 |
| 不接真 API / 不绕 iframe | 全局约束 + Task 5 文案 |

无 TBD 占位；类型名在 Task 3/5 一致。
