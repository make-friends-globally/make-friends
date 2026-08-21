# make-friends

> A commit is an introduction. A merge is a friendship.
>
> 一次 commit 就是一次自我介绍；一次 merge 就是一段友谊。

make-friends is a git-native social protocol: developers introduce themselves
by committing a `profile.json` to **their own repository**, get discovered on a
community card wall, and turn real conversations into a visible graph of
friendships — all with plain GitHub gestures.

make-friends 是一个 git 原生的社交协议：开发者向**自己的仓库**提交 `profile.json` 完成自我介绍，在社区卡片墙上被发现，并用纯粹的 GitHub 手势把真实对话变成一张可见的友谊图谱。

**Your data lives in your repository.** The central index stores only a pointer.
Delete your profile and you are gone at the next crawl — no central data to remove.
**你的数据存放在你的仓库中。** 中央索引只保存指针；删除 profile，下一次抓取即移除你。

## The language of the wall / 手势语言

| Git action / git 动作 | Social meaning / 社交含义 | In make-friends / 在 make-friends 中 |
|---|---|---|
| `commit` | introduce yourself / 自我介绍 | push `make-friends/profile.json` to your repo |
| `fork` | follow / 关注 | fork someone's intro repository |
| `star` | appreciate / 欣赏 | star the central repo or a member repo |
| `issue @mention` | say hi / 打招呼 | open a `[ping]` issue |
| `merge` | become friends / 建立友谊 | the `/link` ceremony (mutual confirmation) |
| `diff` | compare fates / 缘分可视化 | overlapping fields between two profiles |
| `history` | social track record / 社交履历 | every interaction leaves a commit |

## Join in 5 minutes / 五分钟加入

1. **Commit your intro.** Create `make-friends/profile.json` at the root of any repo you own. Start from [profile.schema.json](profile.schema.json) or the example in [requests/new-member.md](requests/new-member.md). 在你拥有的任意仓库根目录创建 `make-friends/profile.json`（格式见 [profile.schema.json](profile.schema.json) 与 [requests/new-member.md](requests/new-member.md)）。
2. **Add yourself to the index.** Open a PR titled `[index] add <username>` that adds your entry to [index.json](index.json) — or open an issue titled `[index] add <username>` with your repo URL. A maintainer verifies ownership and approves once. 提交标题为 `[index] add <username>` 的 PR 将你的条目加入 [index.json](index.json)，或发同名 issue 附上仓库 URL。维护者核验归属后一次性审批。
3. **Appear on the wall.** The crawler runs every Monday 00:30 UTC; you show up within 7 days. 抓取器每周一 00:30 UTC 运行，你将在 7 天内出现在卡片墙上。

Validate locally first / 先本地校验:

```bash
node scripts/validate-cli.js make-friends/profile.json
```

## Say hi / 打招呼

Open an issue with title `[ping] <username>` (use the **"Ping: say hi"** template). Reply in the thread. When you both want to make it official:

- `/link` — establish a friendship (mutual confirmation required; the bot merges it into [links.json](links.json))
- `/unlink` — archive a friendship (mutual confirmation required)

创建标题为 `[ping] <username>` 的 issue（使用 "Ping: say hi" 模板）即可打招呼。在线程中回复。当双方都想正式确立关系时：

- `/link` — 建立友谊（需双向确认；机器人将其合并进 [links.json](links.json)）
- `/unlink` — 归档一段友谊（需双向确认）

This is a public conversation — no email needed. 这是公开对话——不需要邮箱。

## Rules of the house / 社区规则

- `lookingFor` values are fixed: `language-partner`, `collaborator`, `mentor`, `mentee`, `local-friend`, `cofounder`, `chat`.
- `timezone` is a simplified UTC offset (`UTC+8`, `UTC-5:30`) — no IANA names.
- No email addresses, phone numbers, or exact GPS coordinates in profiles — public contact happens in issues.
- No spam, no abuse. Offenders are removed via [denylist.json](denylist.json) (content in their own repo is untouched).
- All external links must be `https://`.

- `lookingFor` 取值固定：`language-partner`、`collaborator`、`mentor`、`mentee`、`local-friend`、`cofounder`、`chat`。
- `timezone` 为简化 UTC 偏移（`UTC+8`、`UTC-5:30`）——不使用 IANA 名称。
- profile 中禁止邮箱、电话与精确 GPS 坐标——公开联系发生在 issue 中。
- 禁止垃圾信息与骚扰。违规者通过 [denylist.json](denylist.json) 移除（其自有仓库内容不受影响）。
- 所有外部链接必须为 `https://`。

## How it works / 工作原理

```
member repo            central repo (this one)
┌────────────────┐     ┌─────────────────────────────┐
│ profile.json   │ ──▶ │ index.json  (pointer only)  │
│ (your data)    │     │ links.json  (friendships)   │
└────────────────┘     │ crawl.yml  → weekly refresh │
                       │ validate-pr.yml → entry gate│
                       │ link-hooks.yml → /link API  │
                       └─────────────────────────────┘
```

## Repository layout / 仓库结构

| Path / 路径 | Purpose / 用途 |
|---|---|
| [profile.schema.json](profile.schema.json) | authoritative profile schema (draft-07) / 权威 profile 规范 |
| [index.json](index.json) | generated member index / 生成的成员索引 |
| [links.json](links.json) | friendship registry (generated) / 友谊注册表（生成物） |
| [denylist.json](denylist.json) | abuse blocklist (maintainer-only) / 违规拉黑名单（仅维护者） |
| [requests/](requests/) | join guides / 加入指南 |
| [scripts/](scripts/) | zero-dependency Node scripts (validate, crawl, links) / 零依赖 Node 脚本 |
| [.github/workflows/](.github/workflows/) | Actions: crawl, validate-pr, link-hooks, render / 自动化工作流 |
| [docs/](docs/) | PRD, Protocol-SPEC, Architecture, UX (bilingual) / 设计文档（中英双语） |

## Documentation / 文档

- [PRD](docs/PRD.md) — vision, requirements, roadmap / 愿景、需求、路线图
- [Protocol-SPEC](docs/Protocol-SPEC.md) — the wire protocol / 协议规范
- [Architecture](docs/Architecture.md) — system design / 系统设计
- [UX](docs/UX.md) — experience and flows / 体验与流程

## Status / 状态

MVP: schema + validation + crawl + link ceremony + card wall (see roadmap in [PRD](docs/PRD.md)). 目前处于 MVP 阶段：Schema、校验、抓取、Link 仪式与卡片墙（路线图见 [PRD](docs/PRD.md)）。
