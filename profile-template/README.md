# make-friends profile starter / 自我介绍起始模板

Zero command lines needed — everything below happens in your browser.
不需要任何命令行——以下全部在浏览器里完成。

## 3 steps to join / 三步加入

### 1. Create your profile repo / 创建你的 profile 仓库

Click **"Use this template"** (top-right of this page, if this repo is marked
as a template) → **Create a new repository**. Name it anything, e.g.
`make-friends-profile`. Public visibility works best.

点击本页右上角 **"Use this template"** → **Create a new repository**。
名字随意（如 `make-friends-profile`），建议 Public 可见性。

No "Use this template" button? Just create an empty repo on github.com/new,
then add the file `make-friends/profile.json` by hand (copy the contents of
[make-friends/profile.json](make-friends/profile.json) as your starting point).
没有模板按钮？在 github.com/new 新建空仓库，然后手动创建 `make-friends/profile.json`
文件（复制 [make-friends/profile.json](make-friends/profile.json) 的内容作为起点）。

### 2. Fill in your intro / 填写你的自我介绍

Open `make-friends/profile.json` in your new repo, click the pencil icon,
and replace the placeholder values:

在新仓库中打开 `make-friends/profile.json`，点铅笔图标，替换占位值：

| Field / 字段 | What to put / 填什么 |
|---|---|
| `name` | your display name / 你的显示名（≤ 60 字符） |
| `bio` | one or two lines / 一两句话介绍自己 |
| `timezone` | keep `UTC+8` if you are in China / 中国用户保持 `UTC+8` 即可 |
| `city` | city-level only — never a street address / 只填城市，禁止街道级地址 |
| `speaks` | languages you speak / 你会说的语言 |
| `lookingFor` | pick from: `language-partner`, `collaborator`, `mentor`, `mentee`, `local-friend`, `cofounder`, `chat` |
| `interests` | free-form tags / 自由标签（技术栈、爱好） |

Click **Commit changes** — that's your introduction. That commit *is* the ritual.
点 **Commit changes**——这就是你的自我介绍。这个 commit 就是仪式本身。

Do NOT put email addresses, phone numbers, or links that are not `https://` —
the validation bot will flag them.
不要写邮箱、电话或非 `https://` 链接——校验机器人会标记它们。

### 3. Add yourself to the index / 把自己加入索引

Go to the central repo and open an issue titled
`[index] add <your-github-username>`, pasting your new repo URL. A maintainer
approves once, and the daily crawler puts you on the wall within 24 hours.

回到中央仓库，发一个标题为 `[index] add <你的GitHub用户名>` 的 issue，
附上你的新仓库地址。维护者一次性批准后，每日抓取器会在 24 小时内
把你放上卡片墙。

## After you appear / 上墙之后

Update your intro anytime by committing to this repo — no approval needed
after the first one. Delete `make-friends/profile.json` to leave; the next
crawl removes you. Your data always lives in YOUR repository.

随时向本仓库 commit 更新介绍——首次审批后无需再批。删除
`make-friends/profile.json` 即退出，下一次抓取自动移除。
你的数据永远存放在你自己的仓库中。

---

For maintainers / 维护者说明: mark this repo as a template
(Settings → check "Template repository") so newcomers get the one-click
"Use this template" flow. The `profile.json` here validates against
`profile.schema.json` v1.0 — keep them in sync when the schema evolves.
