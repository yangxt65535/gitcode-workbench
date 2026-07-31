# GitCode 工作台

GitCode workbench SPA — Issue 看板与 GitCode 集成工作台。

## 快速开始

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。根路径 `/` 会重定向到 `/issues`。

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

## Mock 数据

首版列表数据经 BFF（`GET /api/issues`、`GET /api/issues/meta`）走 `MockIssueRepository`，不接真实 GitCode API。

- 示例 org/repo：`demo-org` / `demo-repo`（mock 数据中的 Issue 链接指向该仓库）
- **任意非空 org/repo 均返回同一份 mock 数据集**（便于试用）；空 org 或 repo 返回空列表
- org/repo 通过顶栏输入，持久化到 `localStorage`；后续接入真实 API 时将按仓库区分数据

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
