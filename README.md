# GitCode 工作台

GitCode workbench SPA，用于高效执行本人在 GitCode 企业开源研发工作中的一些操作。

## 快速开始

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。根路径 `/` 会重定向到 `/issues`。

1. 点击右上角 **配置 Token**，粘贴 GitCode Personal Access Token 并确认（会请求 GitCode 校验用户信息）。
2. 在 Issues **左栏顶部**填写组织 / 仓库，点击 **确认**（写入 `localStorage` 并拉取数据）。
3. 筛选 / 排序变更会立即刷新列表；详情通过 iframe 嵌入 GitCode 页面。

运行测试：

```bash
npm test
```

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 重定向到 `/issues` |
| `/issues` | Issue 看板（列表 + iframe 详情） |
| `/pulls` | 占位页（首版未实现） |
| `/repos` | 占位页（首版未实现） |
| `/settings` | 占位页（首版未实现） |
| `/design-system` | 设计规范样例页（色板、按钮、列表行等） |

## Token 与 API

- Token / 用户名保存在浏览器 `localStorage`（`gitcode.workbench.token`、`gitcode.workbench.username`），仅本机使用；有 XSS 风险，勿在共享电脑长期存放。
- 校验：`POST /api/auth/token` → GitCode `GET /api/v5/user`
- Issues：`GET /api/issues`、`GET /api/issues/meta` 需 `Authorization: Bearer <token>`，经 BFF 调用 GitCode `GET /api/v5/repos/{owner}/{repo}/issues`
- 未配置 Token 时 Issues 页提示「请先配置 GitCode Token」，不再对业务请求使用 Mock
- Mock 数据仅保留给单元测试

Issue 详情一律通过 iframe 嵌入 GitCode 页面，不自建详情渲染。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 检查 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run test:watch` | Vitest 监听模式 |

## 设计 Token

全局 CSS 变量定义在 `app/globals.css` 的 `:root` 中，包括颜色、圆角、动画与字体。可视化样例见 `/design-system`。
