# GitCode 工作台

GitCode workbench SPA，用于高效执行本人在 GitCode 企业开源研发工作中的一些操作。

线上静态站：[https://yangxt65535.github.io/gitcode-workbench/](https://yangxt65535.github.io/gitcode-workbench/)（`master` 推送后由 GitHub Actions 自动部署）。

## 快速开始

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。根路径 `/` 会进入 `/dashboard`。

1. 点击右上角 **配置 Token**，粘贴 GitCode Personal Access Token 并确认（浏览器直连 GitCode 校验用户）。
2. 在各模块 **左栏顶部**填写组织 / 仓库，点击 **确认**（写入 `localStorage` 并拉取数据）。Issues / Pulls 每次新会话需再次确认仓库后才会发请求，不会沿用上次仓库自动拉取。
3. 使用筛选、排序与分页浏览列表；右侧展示详情。

运行测试：

```bash
npm test
```

## 功能概览

### Dashboard（`/dashboard`）

- 左右对半：组织内「与我相关」的 Issues（我创建的 ∪ 我负责的）/ PRs（我提交的）（无详情页）
- 顶栏共用仓库筛选（全部或指定仓）；两侧各自状态 / 标签 / 排序
- 选中一侧自动高亮对侧可见关联项；确认组织/仓库时重新拉取列表；行内可刷新标签与状态
- **渐进式加载**：首屏每个数据流只拉 1 页（20 条），先渲染再后台逐页补齐；翻页按需补拉。补齐完成前总数显示「N+」，选中条目会加速对侧数据拉齐

### Issues（`/issues`）

- 默认只拉取 **open** 状态；状态 / 创建者 / 指派人 / Label / 里程碑 / 标题搜索
- 列表标题可新标签打开 GitCode；第二行以创建者开头（不展示状态文案）
- 创建时间、更新时间排序与分页；详情可手动刷新，列表刷新合并到筛选区确认按钮
- **渐进式分页**：列表先渲染当前页，后台按页补齐；请求期间分页栏禁用并显示加载中，总数/总页随加载递增直到精确
- 右侧详情：基本信息、Markdown 正文、评论、关联 PR

### Pull Requests（`/pulls`）

- 默认只拉取 **open** 状态；状态 / 创建者 / 目标分支 / Label / 里程碑 / 标题搜索
- 列表标题可新标签打开 GitCode；第二行以创建者开头（不展示状态文案）
- 创建时间、更新时间排序与分页；详情可手动刷新，列表刷新合并到筛选区确认按钮
- **渐进式分页**：同 Issues
- 右侧详情：基本信息、Markdown 正文、PR 评论

### Repos（`/repos`）

- 2×2 布局：左上主仓确认、右上 Fork 用户确认
- 主仓 / Fork 分支 commit 列表，按 SHA 着色（共有 / 仅主仓 / 仅 Fork）；栏头可刷新该侧 commit
- 全量 commit 拉取与分页；摘要栏显示主仓/Fork 总数、领先/落后、最后共有 commit
- 点击「最后共有」自动跳页并滚动到对应条目

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 进入 Dashboard |
| `/dashboard` | 组织级我的 Issue/PR 双栏看板 |
| `/issues` | Issue 看板（列表 + 详情） |
| `/pulls` | PR 看板（列表 + 详情） |
| `/repos` | 仓库对比（Fork 状态 + 主仓/Fork commit 对比） |
| `/design-system` | 设计规范样例页（色板、按钮、列表行等） |

## Token 与 API

- Token / 用户名保存在浏览器 `localStorage`，仅本机使用；有 XSS 风险，勿在共享电脑长期存放。
- 前端直连 GitCode OpenAPI（`https://api.gitcode.com/api/v5`），无服务端 BFF；适合 GitHub Pages 静态托管。
- 未配置 Token 时各模块提示「请先配置 GitCode Token」。
- 列表均为渐进式加载：先渲染首批数据再按需补拉，请求期间分页控件禁用；`total_count` / `total_page` 响应头常被 CORS 隐藏，总数随后台加载递增直到精确（或到达页数上限显示近似值）。统一分页组件 `EntityPager`（上一页 / 摘要 / 跳页 / 下一页），刷新入口在各模块筛选区确认按钮。

## GitHub Pages

推送 `master` 后，workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) 会：

1. `npm ci` → `npm test` → `GITHUB_PAGES=true npm run build`（静态导出到 `out/`，`basePath=/gitcode-workbench`）
2. 部署到 GitHub Pages

仓库需在 **Settings → Pages → Source** 选择 **GitHub Actions**。

本地预览静态产物：

```bash
GITHUB_PAGES=true npm run build   # Windows PowerShell: $env:GITHUB_PAGES='true'; npm run build
npx serve out
```

注意：带 `basePath` 的构建应通过 `http://localhost:3000/gitcode-workbench/` 访问；本地日常开发请用 `npm run dev`（无 basePath）。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 静态导出到 `out/` |
| `npm run start` | 用 `serve` 预览 `out/` |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run test:watch` | Vitest 监听模式 |

## 设计 Token

全局 CSS 变量定义在 `app/globals.css` 的 `:root` 中，包括颜色、圆角、动画与字体。可视化样例见 `/design-system`。

## 贡献与 AI 协作

代码结构、模块约定与 Agent 开发须知见 [AGENTS.md](./AGENTS.md)。

模块设计规格见 `docs/superpowers/specs/`（Issues 总览、[Dashboard](docs/superpowers/specs/2026-08-08-gitcode-dashboard-design.md)、 [PR](docs/superpowers/specs/2026-08-02-gitcode-pulls-workbench-design.md)、 [Repos](docs/superpowers/specs/2026-08-02-gitcode-repos-workbench-design.md)）。
