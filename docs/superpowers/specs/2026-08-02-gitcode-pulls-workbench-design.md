# GitCode PR 工作台 — 设计规格

日期：2026-08-02  
状态：已定稿  
来源：Issue 工作台平行设计 + 需求对话

## 1. 目标

在现有 GitCode 工作台中实现 **Pull Request 看板**（`/pulls`），交互与 Issue 看板对齐：左栏列表（筛选/排序/分页），右栏 PR 详情（基本信息 + Markdown 正文 + 评论），数据走浏览器直连 GitCode OpenAPI v5。

## 2. 非目标

- 文件 diff / 变更预览
- 合并、评审、标签变更等写操作
- 负责人、评审人筛选
- 独立「合并」筛选项（需求笔误已排除）

## 3. 筛选与排序

| 维度 | 类型 | 触发 |
|------|------|------|
| 标题搜索 | 关键字 | 确认/回车后请求 |
| 状态 | 多选：open / closed / merged | 下拉内确认 |
| 创建者 | 多选 | 下拉内确认 |
| 目标分支 | 多选（base） | 下拉内确认 |
| Label | 多选 | 下拉内确认 |
| 里程碑 | 多选 | 下拉内确认 |
| 排序字段 | created / updated | 变更即请求 |
| 排序方向 | asc / desc | 变更即请求 |

默认：无筛选，创建时间倒序，每页 20 条。

多选语义：同维度 OR，跨维度 AND。能下推 GitCode 的条件优先服务端；多选未完全下推部分客户端二次过滤（与 Issue 一致）。

## 4. 布局与交互

与 Issue 看板相同：

- 左栏：`RepoConfirmBar` → 筛选 → 列表 → 分页
- 右栏：上一条 / 下一条 / 跳号 → 详情
- 默认不选中；筛选/翻页后详情保持不变；上一条/下一条仅限当前页

## 5. 列表项

`#number`、标题、状态、源→目标分支摘要、Label 摘要、更新时间。

## 6. 详情（右栏）

**基本信息**：状态、创建者、负责人、测试人、Label、里程碑、源/目标分支、draft、是否已合并（merged_at）、创建/更新/合并时间。

**正文**：Markdown（GFM）。

**评论**：`GET .../pulls/{n}/comments?comment_type=pr_comment`，时间升序；不含 diff 行评。

**外链**：标题新标签打开 GitCode PR 页。

## 7. 数据层

```
PullsWorkbench
  → GitCodePullRepository (list + meta)
  → fetchPullDetail (detail + comments)
    → fetchGitCode
```

- 列表：`GET /repos/{org}/{repo}/pulls`
- 详情：`GET /repos/{org}/{repo}/pulls/{number}`
- 评论：`GET /repos/{org}/{repo}/pulls/{number}/comments`

## 8. 架构决策

采用 **平行模块**（`lib/pulls/` + `components/pulls/`），复用 `RepoConfirmBar`、`MultiSelect`、分页与 `detailNav` 导航逻辑，不抽取共享 Workbench 框架。

## 9. 测试

- 单元测试：`mapPullItem`、筛选/query 逻辑
- 集成：使用 `.token` 只读 token 对真实仓库验证 list/detail/comments
