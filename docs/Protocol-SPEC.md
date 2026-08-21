# make-friends Protocol Specification
# make-friends 协议规格

| Field / 字段 | Value / 内容 |
|---|---|
| Version / 版本 | v1.0 (Draft / 草案) |
| Date / 日期 | 2026-08-13 |
| Status / 状态 | Draft for review / 待评审 |
| Language / 语言 | English / 中文 bilingual, section-by-section |
| Related docs / 关联文档 | [PRD.md](./PRD.md), [Architecture.md](./Architecture.md), [UX.md](./UX.md) |

---

## Executive Summary / 摘要

**English:** This specification defines the make-friends protocol v1.0: the profile document format (`profile.json` with a complete JSON Schema), the federation model (members own their data; the central repo holds only an index), the interaction protocol (Ping → Reply → Link with machine-readable conventions), submission and PR conventions, and versioning/compatibility policy. All protocol elements are designed so that automation (GitHub Actions) can validate and act on them without human judgment, while humans retain final authority.

**中文:** 本规格定义 make-friends 协议 v1.0：profile 文档格式（`profile.json` 及完整 JSON Schema）、联邦化模型（成员自持数据；中央仓库只持有索引）、互动协议（Ping → Reply → Link 及其机器可读约定）、提交与 PR 规范，以及版本与兼容性策略。所有协议元素都设计为可被自动化（GitHub Actions）无人工判断地校验和操作，而人类保留最终裁决权。

---

## 1. Scope & Versioning / 范围与版本

**English:** The protocol consists of four parts: (P1) Profile Document, (P2) Federation, (P3) Interaction, (P4) Submission Conventions. The protocol follows semantic versioning; this document specifies v1.0. Conformance requirements are written with MUST / SHOULD / MAY per RFC 2119.

**中文:** 协议由四部分组成：(P1) Profile 文档、(P2) 联邦化、(P3) 互动、(P4) 提交规范。协议遵循语义化版本；本文档规定 v1.0。符合性要求按 RFC 2119 使用 MUST / SHOULD / MAY 表述。

- MUST / 必须 — mandatory for conformance / 符合协议必须满足
- SHOULD / 应当 — recommended; deviations require justification / 建议满足；偏离需说明理由
- MAY / 可以 — optional / 可选

---

## 2. P1: Profile Document / Profile 文档

### 2.1 Location & Naming / 位置与命名

**English:** A member profile MUST be a JSON file at `make-friends/profile.json` in the member's own repository (any public repo they control). Optional companion assets (e.g., `avatar.png`) MAY live in the same `make-friends/` directory. The member MUST declare their repository URL when requesting index entry (see §3.3).

**中文:** 成员 profile 必须是其自有仓库（任何由其控制的公开仓库）中 `make-friends/profile.json` 位置的 JSON 文件。可选伴生资产（如 `avatar.png`）可以放在同一 `make-friends/` 目录下。成员在申请索引条目时必须声明其仓库 URL（见 §3.3）。

### 2.2 JSON Schema (v1.0) / JSON Schema 定义

**English:** The authoritative schema is published at `profile.schema.json` in the central repository. The complete v1.0 schema follows:

**中文:** 权威 Schema 发布在中央仓库的 `profile.schema.json`。完整的 v1.0 Schema 如下：

```jsonc
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://github.com/make-friends-globally/make-friends/profile.schema.json",
  "title": "make-friends profile",
  "description": "Self-introduction document for the make-friends federated social protocol (v1.0).",
  "type": "object",
  "additionalProperties": false,
  "required": ["protocolVersion", "name", "timezone", "lookingFor", "interests"],
  "properties": {
    "protocolVersion": {
      "type": "string",
      "const": "1.0",
      "description": "Protocol version this profile conforms to."
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60,
      "description": "Public display name or nickname."
    },
    "timezone": {
      "type": "string",
      "pattern": "^UTC[+-](0?[0-9]|1[0-4])(:30)?$",
      "description": "IANA-free simplified offset, e.g. UTC+8, UTC-5:30."
    },
    "city": {
      "type": "string",
      "minLength": 2,
      "maxLength": 60,
      "description": "City-level location only. MUST NOT contain street-level precision."
    },
    "speaks": {
      "type": "array",
      "items": { "$ref": "#/definitions/language" },
      "minItems": 1,
      "maxItems": 10,
      "uniqueItems": true,
      "description": "Languages the member speaks."
    },
    "wantsToPractice": {
      "type": "array",
      "items": { "$ref": "#/definitions/language" },
      "maxItems": 10,
      "uniqueItems": true,
      "description": "Languages the member wants to practice (language-partner matching)."
    },
    "lookingFor": {
      "type": "array",
      "items": {
        "enum": ["language-partner", "collaborator", "mentor", "mentee", "local-friend", "cofounder", "chat"]
      },
      "minItems": 1,
      "maxItems": 7,
      "uniqueItems": true,
      "description": "Declared social intent; drives matching, filtering, and recommendations."
    },
    "offer": {
      "type": "array",
      "items": {
        "enum": ["mentoring", "code-review", "coffee", "language-practice", "hospitality"]
      },
      "maxItems": 5,
      "uniqueItems": true,
      "description": "What the member can give — social interaction is bidirectional."
    },
    "interests": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 40
      },
      "minItems": 1,
      "maxItems": 20,
      "uniqueItems": true,
      "description": "Free-form interest tags (tech stacks, hobbies, art, sports)."
    },
    "bestTimeToReach": {
      "enum": ["morning", "afternoon", "evening", "night", "flexible"],
      "description": "Preferred window for first contact."
    },
    "projectLinks": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri",
        "pattern": "^https://"
      },
      "maxItems": 5,
      "description": "Public project / blog / portfolio links. MUST be https URLs."
    },
    "contact": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "github": {
          "type": "string",
          "pattern": "^[A-Za-z0-9-]{1,39}$",
          "description": "GitHub username only. No email or phone fields exist in the protocol."
        }
      },
      "description": "Public identity handles. Email/phone MUST NOT be included (privacy baseline, PRD FR-07)."
    },
    "links": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[A-Za-z0-9-]{1,39}$"
      },
      "maxItems": 200,
      "description": "GitHub usernames of confirmed friends (Link ceremony, §4.3). MAY be empty; the central links.json is authoritative, this field is for federation interop and display."
    },
    "bio": {
      "type": "string",
      "maxLength": 500,
      "description": "Short free-text introduction. Optional; structured fields are preferred over prose."
    }
  },
  "definitions": {
    "language": {
      "type": "string",
      "pattern": "^[a-z]{2,3}(-[A-Z]{2})?$",
      "description": "ISO 639-1/639-2 code, optionally with ISO 3166-1 region, e.g. en, zh, en-US."
    }
  }
}
```

### 2.3 Field Semantics & Enumerations / 字段语义与枚举

**English:** Rationale for key fields:

**中文:** 关键字段的设计理由：

| Field / 字段 | Rationale / 理由 |
|---|---|
| `lookingFor` | The product's core "intent-first" data (PRD P3). Each enum value corresponds to a scenario in PRD §2.1. At least one value is required. |
| `offer` | Makes interaction bidirectional; the matching engine weights mutual fit (A offers what B looks for) above one-way fit. |
| `timezone` | Display "their local time now" on cards — a low-cost, high-value affordance for global users. Offset-only keeps the protocol trivial to validate. |
| `city` | Enables city groups (PRD FR-18) and local meetups. Street-level precision is explicitly prohibited (privacy, PRD FR-07). |
| `contact.github` | The only allowed contact field. Email/phone are excluded by design; Ping is the contact channel (PRD FR-03). |
| `links` | Mirrors the central `links.json` for federated interop. The central registry is authoritative to avoid conflicts. |

### 2.4 Example / 示例

```json
{
  "protocolVersion": "1.0",
  "name": "Alice",
  "timezone": "UTC+8",
  "city": "Shanghai",
  "speaks": ["zh", "en"],
  "wantsToPractice": ["ja"],
  "lookingFor": ["collaborator", "language-partner", "local-friend"],
  "offer": ["mentoring", "coffee"],
  "interests": ["rust", "ai", "drumming", "climbing"],
  "bestTimeToReach": "evening",
  "projectLinks": ["https://github.com/alice-dev/awesome-ai"],
  "contact": { "github": "alice-dev" },
  "links": ["bob-dev"],
  "bio": "Systems engineer by day, drummer by night. Learning Japanese."
}
```

---

## 3. P2: Federation Protocol / 联邦化协议

### 3.1 Data Ownership / 数据自持

**English:** Profile content resides exclusively in the member's repository. The central repository MUST NOT store copies of profile content; it stores only index metadata (§3.2). This is the structural answer to privacy: deleting `make-friends/profile.json` from the member's repo removes the data; the next crawl drops the index entry.

**中文:** profile 内容只存在于成员自己的仓库。中央仓库不得存储 profile 内容副本；只存储索引元数据（§3.2）。这是隐私问题的结构性答案：从成员仓库删除 `make-friends/profile.json` 即删除数据；下一次抓取将移除索引条目。

### 3.2 Central Index Format / 中央索引格式

**English:** The central repository maintains `index.json` (generated, not hand-edited):

**中文:** 中央仓库维护 `index.json`（生成物，不手工编辑）：

```jsonc
{
  "indexVersion": 1,
  "generatedAt": "2026-08-13T00:00:00Z",
  "schemaUrl": "https://raw.githubusercontent.com/make-friends-globally/make-friends/main/profile.schema.json",
  "members": [
    {
      "username": "alice-dev",
      "repo": "alice-dev/make-friends-profile",
      "profilePath": "make-friends/profile.json",
      "addedAt": "2026-07-01T00:00:00Z",
      "updatedAt": "2026-08-10T00:00:00Z",
      "valid": true,
      "lastValidationError": null
    }
  ]
}
```

**English:** Rules:

**中文:** 规则：

1. `username` MUST be the member's GitHub username (used for @mentions and links).
2. `repo` MUST be `owner/name`; the crawl fetches `profilePath` from it.
3. A member entry MUST be created only via maintainer-approved PR (entry gate, PRD FR-06). Subsequent updates are automated and require no review.
4. Entries with `valid: false` MUST be excluded from rendering; the error is recorded for the member's next update.

### 3.3 Joining the Index / 加入索引

**English:** A new member submits a PR to the central repo adding one entry to `index.json` (or `requests/new-member.md` with their repo URL). The maintainer verifies: (a) the profile file exists and validates, (b) the repo is owned by the GitHub account, (c) no denylist match. On approval, the entry becomes active and the next crawl ingests the profile.

**中文:** 新成员向中央仓库提交 PR，在 `index.json` 中添加一条条目（或在 `requests/new-member.md` 中提供仓库 URL）。维护者验证：(a) profile 文件存在且通过校验，(b) 仓库归属该 GitHub 账户，(c) 不在 denylist 中。批准后条目生效，下一次抓取将收录该 profile。

### 3.4 Crawling Rules / 抓取规则

**English:** The crawl (weekly schedule, Architecture §3.1) MUST:

**中文:** 抓取（每周定时，见 Architecture §3.1）必须：

1. Fetch `profilePath` from each member repo via the GitHub Contents API (raw URL fallback).
2. Validate against `profile.schema.json`; record `valid` and `lastValidationError`.
3. Update `updatedAt` from the file's latest commit date.
4. Remove entries whose repo no longer exists, whose profile is deleted, or whose repo owner changed.
5. Isolate failures: one failing repo MUST NOT block the others; partial results are acceptable.
6. Respect GitHub API rate limits (batch with conditional requests; treat 404 as removed, 403 as skip-with-note).

### 3.5 Removal & Denylist / 移除与黑名单

**English:** Three removal paths exist:

**中文:** 存在三种移除路径：

| Path / 路径 | Trigger / 触发 | Effect / 效果 |
|---|---|---|
| Voluntary / 自愿退出 | Member deletes `make-friends/profile.json` (or the repo) | Entry removed at next crawl |
| Grace period / 宽限期 | Profile fails validation 3 consecutive crawls | Entry marked stale; hard-removed after 30 days |
| Denylist / 拉黑 | Maintainer adds `denylist.json` entry (spam/abuse, PRD FR-06) | Entry removed from index immediately; rendering excludes it; re-application requires maintainer review |

**English:** `denylist.json` format:

**中文:** `denylist.json` 格式：

```jsonc
{
  "denylistVersion": 1,
  "entries": [
    {
      "username": "spam-bot-99",
      "reason": "placeholder profile content",
      "evidence": "https://github.com/make-friends-globally/make-friends/issues/42",
      "addedAt": "2026-08-13T00:00:00Z",
      "canReapply": true
    }
  ]
}
```

---

## 4. P3: Interaction Protocol / 互动协议

**English:** All interactions happen in public GitHub issues of the central repository (alternatively, member repos MAY host their own Ping issues for their own profiles; the central repo then mirrors references). Conventions below are machine-readable so Actions can act on them (Architecture §3.3).

**中文:** 所有互动都发生在中央仓库的公开 issue 中（成员仓库也可以为自己的 profile 托管 Ping issue；中央仓库随后镜像引用）。以下约定是机器可读的，以便 Actions 对其采取行动（Architecture §3.3）。

### 4.1 Ping / 打招呼

**English:** A Ping is an issue with:

**中文:** Ping 是一个具备以下特征的 issue：

- Title MUST be: `[ping] <target-username>`
- Body MUST follow the template below; `@mention` the target in the body
- The Ping creator MUST NOT include email/phone in the body (enforced by a lint Action)

**Template / 模板:**

```markdown
## Ping: <target-username>

<!-- Protocol: make-friends ping v1.0. Do not edit this section. -->
- **Source profile:** <url of the Ping creator's profile.json>
- **Source intent:** <lookingFor values of the Ping creator>
- **Created at:** <ISO timestamp>

## Why I'm saying hi
<!-- Free text: optional reason, e.g. "We share an interest in rust and you're in Shanghai too." -->
<optional AI icebreaker suggestion (PRD FR-15), editable>

---

<!-- Commands: reply in this thread, or post /link to establish a friendship (mutual confirmation required). -->
```

**English:** The structured "Protocol:" comment block enables automated extraction; content below it is free-form.

**中文:** 结构化的 "Protocol:" 注释块支持自动化提取；其下方内容为自由格式。

### 4.2 Reply / 回应

**English:** Replies are ordinary issue comments. No additional protocol required. The issue thread is the conversation log; it is public and permanent (consistent with P1: history is social track record).

**中文:** 回应就是普通 issue 评论，无需额外协议。issue 线程即对话记录；它是公开且永久的（符合 P1：历史即社交履历）。

### 4.3 Link / 建立关系

**English:** The Link ceremony requires mutual confirmation:

**中文:** Link 仪式需要双向确认：

1. Either party posts `/link` as a comment.
2. The other party MUST post `/link` too (any order; each side once).
3. An Action (Architecture §3.3) detects the second `/link` and appends to `links.json`:

```jsonc
{
  "linksVersion": 1,
  "links": [
    {
      "a": "alice-dev",
      "b": "bob-dev",
      "createdAt": "2026-08-13T00:00:00Z",
      "issueUrl": "https://github.com/make-friends-globally/make-friends/issues/12"
    }
  ]
}
```

4. The Action posts a confirmation comment in the issue, and optionally opens PRs (or comments with instructions) to update both members' `profile.json` `links` arrays — the member's own repo remains the source of truth for display; the central `links.json` is authoritative for the graph.
5. `a < b` lexicographic ordering MUST be used to keep entries canonical (no duplicate a/b inversions).

**English:** Removal: both parties post `/unlink`; the Action removes the entry (recording a tombstone in `links-archive.json` for auditability). If one party is unresponsive, a maintainer MAY remove a link upon a documented request from the other party (e.g., harassment case).

**中文:** 移除：双方都输入 `/unlink`；Action 移除条目（在 `links-archive.json` 中记录墓碑以供审计）。若一方失联，另一方提供书面请求（如骚扰事件）时，维护者可以移除该关系。

### 4.4 Notifications / 通知

**English:** Notifications rely entirely on GitHub's native @mention/issue notification system (web and email). No separate notification infrastructure exists by design. The weekly digest (PRD FR-11) adds passive discovery on top.

**中文:** 通知完全依赖 GitHub 原生的 @mention/issue 通知系统（网页与邮件）。按设计不存在独立的通知基础设施。每周 Digest（PRD FR-11）在之上提供被动发现。

---

## 5. P4: Submission & PR Conventions / 提交与 PR 规范

**English:** These conventions apply to (a) the member's own repository for profile updates, and (b) the central repository for index/denylist changes.

**中文:** 以下规范适用于 (a) 成员自有仓库的 profile 更新，以及 (b) 中央仓库的索引/denylist 变更。

### 5.1 Profile Submission / Profile 提交

**English:** The member's repository SHOULD use the following conventions:

**中文:** 成员仓库应当使用以下约定：

| Item / 项目 | Convention / 约定 |
|---|---|
| Path / 路径 | `make-friends/profile.json` |
| Commit message / 提交信息 | `make-friends: add profile for <username>` (first) / `make-friends: update profile for <username>` (subsequent) |
| Branch / 分支 | `main` for members; the central repo uses `main` for sources and `gh-pages` for the rendered site |
| Validation / 校验 | Run `npx make-friends validate` before pushing (CLI, PRD FR-08) |

### 5.2 Central Repo PRs / 中央仓库 PR

**English:** PR types and their automation:

**中文:** PR 类型及其自动化：

| PR type / 类型 | Trigger / 触发 | Automation / 自动化 |
|---|---|---|
| `[index] add <username>` | New member entry | Schema/ownership checks via Action; requires human approval |
| `[index] remove <username>` | Voluntary removal | Automated after verification |
| `[denylist] add <username>` | Abuse report | Human-only; audit-trail in `denylist.json` |
| `[schema] v1.x` | Schema evolution | Full re-validation of all members; report attached to PR |

### 5.3 PR Checklist (human + automated) / PR 检查清单

**English:** Every central-repo PR MUST pass: (1) automated — profile exists & validates, no denylist match, no email/phone regex hits, https-only links; (2) human — repo ownership plausibility and obvious intent check. The checklist is codified in the PR template.

**中文:** 每个中央仓库 PR 必须通过：(1) 自动化——profile 存在且通过校验、不匹配 denylist、无邮箱/电话正则命中、仅 https 链接；(2) 人工——仓库归属合理性及明显意图检查。清单已编入 PR 模板。

---

## 6. Versioning & Compatibility / 版本与兼容性策略

**English:** The protocol follows semver with protocol-specific rules:

**中文:** 协议遵循语义化版本，并附带协议专属规则：

| Version bump / 版本变更 | Trigger / 触发 | Compatibility / 兼容性 |
|---|---|---|
| MAJOR / 主版本 | Removing/renaming fields, changing enum values, changing required set | Old profiles MUST still render (downgraded); migration guide required; 90-day grace period |
| MINOR / 次版本 | Adding optional fields, extending enums | Old profiles remain fully valid; new fields optional |
| PATCH / 修订版 | Fixing schema typos / clarifications | No behavioral change |

**English:** Enforcement: each profile declares `protocolVersion`; the validator rejects unknown versions with a clear upgrade hint. The central repo keeps the schema at `profile.schema.json` (current) and `profile.schema.v1.0.json` (archived per major). A migration Action MAY auto-upgrade profiles when a minor version adds optional fields.

**中文:** 执行机制：每个 profile 声明 `protocolVersion`；校验器拒绝未知版本并给出清晰的升级提示。中央仓库将当前 Schema 保留在 `profile.schema.json`，并按主版本归档为 `profile.schema.v1.0.json`。当次版本新增可选字段时，迁移 Action 可以自动升级 profile。

---

## 7. Conformance Checklist / 一致性检查清单

**English:** A component (CLI, Action, renderer, member tooling) claiming protocol conformance MUST:

**中文:** 声称符合协议的组件（CLI、Action、渲染器、成员工具）必须：

- [ ] Validate profiles against the published schema before submission / 提交前按发布 Schema 校验 profile
- [ ] Generate Ping issues matching §4.1 (title, template, @mention) / 生成符合 §4.1 的 Ping issue
- [ ] Recognize `/link` and `/unlink` comments and enforce mutual confirmation / 识别 `/link` 与 `/unlink` 评论并强制双向确认
- [ ] Treat `links.json` as the authoritative relationship registry / 将 `links.json` 视为权威关系注册表
- [ ] Never store profile content in the central repo / 绝不在中央仓库存储 profile 内容
- [ ] Respect denylist entries in all rendering and recommendation paths / 在所有渲染与推荐路径中尊重 denylist
- [ ] Refuse profiles containing email/phone contact fields / 拒绝包含邮箱/电话联系字段的 profile
