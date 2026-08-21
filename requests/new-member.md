# Join make-friends / 加入 make-friends

> Your data lives in **your** repository. The central index only stores a pointer
> to it. Deleting your profile removes you at the next crawl.
>
> 你的数据存放在**你自己的**仓库中。中央索引只保存指向它的指针。
> 删除你的 profile，下一次抓取就会将你移除。

## The rule of the game / 游戏规则

| git gesture / git 手势 | social meaning / 社交含义 |
|---|---|
| `commit` your profile | introduce yourself / 自我介绍 |
| `fork` someone | follow them / 关注某人 |
| `merge` a link request | become friends / 建立友谊 |
| `diff` two profiles | compare your fates / 缘分可视化 |

## Step 1 — Create your profile / 创建你的 profile

Create `make-friends/profile.json` at the root of **your own** GitHub repository
(any repo you own works — e.g. `you/make-friends-profile`).

在你**自己的** GitHub 仓库根目录创建 `make-friends/profile.json`（任何你拥有的仓库都可以）。

```json
{
  "protocolVersion": "1.0",
  "name": "Your Display Name",
  "bio": "One or two lines about yourself.",
  "timezone": "UTC+8",
  "city": "Shanghai",
  "speaks": ["en", "zh-CN"],
  "wantsToPractice": ["ja"],
  "lookingFor": ["chat", "collaborator"],
  "offer": ["code-review", "coffee"],
  "interests": ["rust", "linux"],
  "bestTimeToReach": "evening",
  "projectLinks": ["https://github.com/you/awesome-ai"],
  "contact": { "github": "you" }
}
```

Rules / 规则:

- `protocolVersion` must be `1.0` (see [profile.schema.json](../profile.schema.json)).
- `timezone` is a simplified UTC offset: `UTC+8`, `UTC-5:30` (no IANA names).
- `lookingFor` must use the allowed values: `language-partner`, `collaborator`, `mentor`, `mentee`, `local-friend`, `cofounder`, `chat`.
- `offer` uses the fixed values: `mentoring`, `code-review`, `coffee`, `language-practice`, `hospitality`.
- No email addresses, phone numbers, or exact GPS coordinates. Public contact happens in issues, never in profiles.
- All external links must be `https://`.

- `protocolVersion` 必须为 `1.0`（见 [profile.schema.json](../profile.schema.json)）。
- `timezone` 为简化 UTC 偏移：`UTC+8`、`UTC-5:30`（不使用 IANA 名称）。
- `lookingFor` 必须使用允许值：`language-partner`、`collaborator`、`mentor`、`mentee`、`local-friend`、`cofounder`、`chat`。
- `offer` 使用固定值：`mentoring`、`code-review`、`coffee`、`language-practice`、`hospitality`。
- 禁止邮箱、电话号码和精确 GPS 坐标。公开联系发生在 issue 中，绝不在 profile 里。
- 所有外部链接必须为 `https://`。

**This profile is public.** It lives in your repository and appears on the
community wall. Do not put anything here you would not put on your GitHub bio.

**此 profile 是公开的。** 它存放在你的仓库中，并会出现在社区卡片墙上。
不要写入任何你不会写在 GitHub 个人简介里的内容。

## Step 2 — Add yourself to the index / 将你加入索引

Two options / 两种方式（任选其一）:

### Option A: Pull request (preferred / 推荐)

1. Fork this repository.
2. Add one entry to `index.json` under `members`:

   ```json
   {
     "username": "you",
     "repo": "you/make-friends-profile",
     "profilePath": "make-friends/profile.json",
     "valid": false,
     "lastValidationError": null
   }
   ```

3. Open a PR titled `[index] add you`. The automated check (validate-pr.yml)
   fetches and validates your profile; a maintainer then confirms ownership and
   approves.

### Option B: Request issue / 请求 issue

Open an issue titled `[index] add <username>` and paste your repo URL. A
maintainer will add the entry for you.

## Step 3 — Appear on the wall / 出现在卡片墙上

The crawler runs every Monday 00:30 UTC. You will appear on the card wall
within 7 days. While you wait: ping someone! Open an issue with title
`[ping] <username>` (use the "Ping: say hi" template).

抓取器每周一 00:30 UTC 运行。你将在 7 天内出现在卡片墙上。
等待期间可以先 Ping 别人！创建标题为 `[ping] <username>` 的 issue
（使用 "Ping: say hi" 模板）。

## Staying / 停留

- Update your profile by pushing new commits to your own repo. The next crawl picks it up automatically.
- Leave by deleting `make-friends/profile.json`. Your entry is dropped at the next crawl. No central data to delete — by design.
- Abused? Maintainers can add you to `denylist.json` (spam, harassment). Re-application is possible after maintainer review.

- 更新 profile：向你的仓库推送新 commit，下一次抓取自动生效。
- 退出：删除 `make-friends/profile.json`，下一次抓取即移除你的条目。按设计，中央仓库没有可删除的数据。
- 违规：维护者可将你加入 `denylist.json`（垃圾信息、骚扰）。复审后可重新申请。

## Verify locally / 本地验证

```bash
node scripts/validate-cli.js make-friends/profile.json
```

prints `valid: true` when your profile passes schema + content rules.

输出 `valid: true` 表示你的 profile 通过 schema 与内容规则校验。
