# GitCode 工作台

GitCode workbench SPA，用于高效执行本人在 GitCode 企业开源研发工作中的一些操作。

线上静态站：[https://yangxt65535.github.io/gitcode-workbench/](https://yangxt65535.github.io/gitcode-workbench/)（`master` 推送后由 GitHub Actions 自动部署）。

## 快速开始

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。根路径 `/` 会进入 `/issues`。

1. 点击右上角 **配置 Token**，粘贴 GitCode Personal Access Token 并确认（浏览器直连 GitCode 校验用户）。
2. 在 Issues **左栏顶部**填写组织 / 仓库，点击 **确认**（写入 `localStorage` 并拉取数据）。
3. 使用名称搜索 / 多选筛选 / 排序与分页浏览列表；右侧展示详情（Markdown 正文、评论、关联 PR）。

运行测试：

```bash
npm test
```

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 进入 Issues |
| `/issues` | Issue 看板（列表 + 详情） |
| `/pulls` | 占位页（首版未实现） |
| `/repos` | 占位页（首版未实现） |
| `/settings` | 占位页（首版未实现） |
| `/design-system` | 设计规范样例页（色板、按钮、列表行等） |

## Token 与 API

- Token / 用户名保存在浏览器 `localStorage`（`gitcode.workbench.token`、`gitcode.workbench.username`），仅本机使用；有 XSS 风险，勿在共享电脑长期存放。
- 前端直连 GitCode OpenAPI（`https://api.gitcode.com/api/v5`），无服务端 BFF；适合 GitHub Pages 静态托管。
- 未配置 Token 时 Issues 页提示「请先配置 GitCode Token」
- Mock 数据仅保留给单元测试

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
