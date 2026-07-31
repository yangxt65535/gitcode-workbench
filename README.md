# GitCode 工作台

GitCode workbench SPA — Issue 看板与 GitCode 集成工作台。

## 开发

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。根路径 `/` 会重定向到 `/issues`。

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

全局 CSS 变量定义在 `app/globals.css` 的 `:root` 中，包括颜色、圆角、动画与字体。
