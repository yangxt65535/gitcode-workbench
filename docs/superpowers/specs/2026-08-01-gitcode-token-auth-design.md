# GitCode Token 配置与真 API — 设计规格

日期：2026-08-01  
状态：已定稿（待实现计划）  
关联：`docs/superpowers/specs/2026-08-01-gitcode-workbench-design.md`（基线工作台）

## 1. 目标

在工作台顶栏提供 **配置 GitCode Personal Access Token** 的能力（非「登录」产品概念）：弹窗输入 Token → BFF 调 GitCode 校验用户 → 成功后写入 localStorage 并显示用户名；支持清除 Token。未配置 Token 时 Issues 不请求数据并提示配置；已配置后 Issues 经 BFF 走真实 GitCode API。

参考：[GitCode Users API](https://docs.gitcode.com/en/docs/users/)、[OpenAPI 鉴权](https://docs.gitcode.com/en/docs/apis/)。

## 2. 非目标

- 不做 OAuth / 账号密码登录 / Session Cookie
- 不把 Token 持久化到服务端磁盘或 `.env`（`.env` 若存在不作为本功能运行时来源）
- 不在弹窗回显已保存的明文 Token
- 不改变 Issue 详情 iframe 方案
- 本轮不强制实现 Pulls/Repos 真 API

## 3. 决策记录

| 决策 | 选择 |
|------|------|
| 产品概念 | 配置 Token，不是登录 |
| 未配置时 Issues | 提示配置 Token，不走业务 Mock |
| 已配置时 Issues | BFF + 真 GitCode API |
| 退出 | 支持「清除 Token」 |
| 调用方式 | 方案 1：浏览器 ↔ 本站 BFF ↔ GitCode（避 CORS） |
| 本地存储 | localStorage：token + username |

## 4. 架构

### 4.1 客户端

- `AuthContext`（命名可保留 tech 含义，UI 文案不用「登录」）：
  - 状态：`token: string | null`、`username: string | null`
  - 动作：`setSession({ token, username })`、`clearSession()`
- localStorage keys：
  - `gitcode.workbench.token`
  - `gitcode.workbench.username`
- 刷新页面：若有 token + username，恢复为已配置态（不强制每次启动重新校验；Issues 若 401 再提示失效）
- Issues 等受保护请求：`Authorization: Bearer <token>`

### 4.2 BFF

| 方法 | 路径 | 行为 |
|------|------|------|
| `POST` | `/api/auth/token` | body `{ token: string }`；服务端请求 `GET https://api.gitcode.com/api/v5/user`，鉴权优先 `Authorization: Bearer`，失败可回退 `PRIVATE-TOKEN`；成功 `200 { username, name?, avatar_url? }`（`username` 取 API 的 `login` 或等价字段）；Token 无效/缺失 `401` |
| `GET` | `/api/issues` | 无/无效 Bearer → `401`；有则 `GitCodeIssueRepository.list` |
| `GET` | `/api/issues/meta` | 同上 → `meta` |

- 服务端 **不** 将 Token 写入文件或全局单例跨请求缓存；仅当次请求使用。
- `MockIssueRepository`：默认业务路径不再使用；保留供单测。

### 4.3 GitCodeIssueRepository（首版范围）

- 实现 `IssueRepository`：`list` / `meta` 对齐现有 query 约定（多选逗号、sort/direction）。
- 调用 GitCode Issues 相关 `/api/v5` 接口（具体 path 以实现时文档为准，如仓库 Issues 列表）；字段映射到现有 `Issue` / `IssueMeta` 形状。
- 若 GitCode 某筛选项能力不足：在 BFF 侧对返回结果做二次过滤/排序（文档中注明降级），保证前端契约不变。

## 5. UI 与交互

### 5.1 顶栏右上 TokenStatus

- **未配置**：文案「配置 Token」，点击打开弹窗。
- **已配置**：显示 `username`；点击打开同一弹窗（更换 / 清除）。

### 5.2 Token 弹窗

- 标题：「配置 GitCode Token」
- `type=password` 输入框；说明可指向 Personal Access Token 创建入口（文案简短）。
- 主按钮「确认」：请求中禁用；失败在弹窗内展示错误；成功关闭弹窗并更新顶栏用户名。
- 已配置时：输入框为空（不回填 Token）；提供「清除 Token」；确认新 Token 则覆盖存储。

### 5.3 Issues 页

- 无 Token：不发 list/meta；`EmptyState`：「请先配置 GitCode Token」。
- 有 Token：现有换仓/筛选/详情规则不变；请求带 Bearer。
- 收到 `401`：提示 Token 无效，建议重新配置；并 `clearSession()`（避免反复失败）。

### 5.4 视觉

遵循既有设计规范（简约、小圆角、少量动画）；弹窗为居中 modal + 遮罩，圆角 `var(--radius-lg)`。

## 6. 错误处理

| 场景 | 行为 |
|------|------|
| Token 为空点确认 | 前端校验，不请求 |
| GitCode 401/403 | 弹窗或 Issues：「Token 无效或权限不足」 |
| 网络/5xx | 「无法连接 GitCode，请稍后重试」 |
| Issues 无 org/repo | 提示填写并**确认**组织仓库（与基线 Issues 左栏一致）；与缺 Token 提示分层 |

## 7. 测试

- BFF `/api/auth/token`：可用 mock fetch 测 200/401 分支（不把真实 Token 写入仓库）。
- `GitCodeIssueRepository` 字段映射单测（fixture JSON）。
- 手动：配置成功显示用户名；清除后 Issues 空态；错误 Token 弹窗报错。

## 8. 安全注意（实现约束）

- 勿将 Token 打进客户端日志、错误上报正文、URL query。
- README 说明：Token 存 localStorage，有 XSS 风险；仅建议本机使用。
