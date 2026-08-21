# make-friends Product Requirements Document (PRD)
# make-friends 产品需求文档

| Field / 字段 | Value / 内容 |
|---|---|
| Version / 版本 | v1.0 (Draft / 草案) |
| Date / 日期 | 2026-08-13 |
| Status / 状态 | Draft for review / 待评审 |
| Language / 语言 | English / 中文 bilingual, section-by-section |

---

## Executive Summary / 摘要

**English:** make-friends is a GitHub-native social platform where developers meet each other by submitting self-introductions as git commits. The product's core thesis is that every native git action can be translated into a social gesture: a commit is an introduction, a fork is a follow, a merge is a friendship. The platform is federated by design: each member owns their profile data in their own repository, while a central index repository aggregates, validates, renders, and facilitates interactions (Ping, Reply, Link). AI assists onboarding, translation, matching, and ice-breaking to remove language and writer's-block barriers. This document defines the product vision, target users, prioritized functional requirements with acceptance criteria, non-functional requirements, success metrics, and a 6-week delivery roadmap.

**中文:** make-friends 是一个基于 GitHub 原生的社交平台，开发者通过提交自我介绍（git commit）认识彼此。产品的核心论点是：git 的每个原生动作都可以翻译为一种社交手势——commit 是自我介绍，fork 是关注，merge 是建立友谊。平台采用联邦式设计：每位成员在自己的仓库中持有个人数据，中央索引仓库负责聚合、校验、渲染并促成互动（Ping、Reply、Link）。AI 辅助引导填写、翻译、匹配与破冰，消除语言和"不知道写什么"的障碍。本文档定义产品愿景、目标用户、带验收标准的功能需求（按优先级分级）、非功能需求、成功指标与 6 周交付路线图。

---

## 1. Background & Vision / 背景与愿景

**English:** The repository currently contains only a minimal README ("ancient way to make friends... introdue yourself..."). The concept is culturally resonant — committing yourself to a repository is a ritual developers already understand — but a static wall of self-introductions is not social interaction. Without a feedback loop, participants cannot know who saw them, who wants to know them, or who shares their intent. The vision is to evolve make-friends from "a repository where people introduce themselves" into "a social protocol where git gestures are the language of friendship," making it the developer-native way to find language partners, collaborators, mentors, and local friends across the globe.

**中文:** 仓库目前只有一个极简 README（"ancient way to make friends... introdue yourself..."）。这个概念本身具有文化共鸣——把自己提交到一个仓库，是开发者早已熟悉的仪式——但一面静态的自我介绍墙不是社交互动。没有反馈闭环，参与者无法知道谁看到了自己、谁想认识自己、谁和自己有相同意图。愿景是让 make-friends 从"一个人们介绍自己的仓库"进化为"一种以 git 手势为友谊语言的社交协议"，成为全球开发者寻找语伴、合作者、导师和本地朋友的原生方式。

### 1.1 Problem Statement / 问题陈述

**English:** Participation (a commit) is not interaction. Three structural gaps block social value: (1) no feedback loop — participants receive nothing after submitting; (2) no discovery — introductions are scattered in file trees; (3) no intent data — free-text introductions cannot be matched, filtered, or recommended. Additionally, a single-repository model concentrates spam risk, privacy liability, and maintainer bottleneck.

**中文:** 参与（一次 commit）不等于互动。三个结构性缺口阻碍了社交价值：(1) 无反馈闭环——提交后参与者得不到任何反馈；(2) 无发现入口——自我介绍散落在文件树中；(3) 无意图数据——自由文本自我介绍无法被匹配、筛选或推荐。此外，单仓库模式会集中 spam 风险、隐私责任和维护者瓶颈。

### 1.2 Vision Statement / 愿景陈述

**English:** By the end of 2026, make-friends is the standard "git-native" way for developers worldwide to meet: any developer can introduce themselves in under five minutes, receive a Ping from a compatible stranger within a week, and convert real-world friendships into a visible, verifiable graph of git merges.

**中文:** 到 2026 年底，make-friends 成为全球开发者"git 原生"交友的标准方式：任何开发者都能在五分钟内完成自我介绍，一周内收到来自匹配陌生人的 Ping，并将现实中的友谊转化为一张可见、可验证的 git merge 关系图谱。

---

## 2. Target Users & Scenarios / 目标用户与场景

**English:** Primary persona is the global developer community: open-source contributors, language learners, remote workers, and niche-interest hobbyists. The product deliberately stays developer-native (git, issues, PRs) rather than competing with general-purpose social platforms.

**中文:** 主要用户群体为全球开发者社区：开源贡献者、语言学习者、远程工作者和小众兴趣爱好者。产品刻意保持"开发者原生"（git、issue、PR），而非与通用社交平台竞争。

### 2.1 Scenario Map: "Various Social Purposes" Made Concrete / 场景地图："各种社交目的"的具体化

**English:** The vague requirement "various social purposes" is resolved into six primary purpose categories, each mapped to a `lookingFor` value in the profile protocol (see Protocol-SPEC §2.3):

**中文:** 模糊需求"各种社交目的"被解析为六个主要目的类别，每个类别映射到 profile 协议中的一个 `lookingFor` 枚举值（见 Protocol-SPEC §2.3）：

| Scenario / 场景 | Purpose / 目的 | lookingFor | Key fields / 关键字段 |
|---|---|---|---|
| Language exchange / 语言交换 | Practice a foreign language | `language-partner` | `speaks`, `wantsToPractice` |
| Open-source collaboration / 开源协作 | Find project collaborators | `collaborator` | `interests`, `projectLinks` |
| Mentorship / 师徒关系 | Find or become a mentor | `mentor` / `mentee` | `offer`, `lookingFor` |
| City meetups / 城市线下 | Meet locals when traveling or relocating | `local-friend` | `city`, `timezone` |
| Startup pairing / 创业搭档 | Find a co-founder | `cofounder` | `interests`, `projectLinks`, `offer` |
| Casual chat / 随意聊天 | Talk about shared niche interests | `chat` | `interests`, `bestTimeToReach` |

### 2.2 Non-Goals / 非目标

**English:** (1) Not a dating app — no photos-required profiles, no private messaging; interactions are public by default. (2) Not a job board — no resume-centric fields; recruiting signals are derived, not requested. (3) Not a general social network — no feeds, likes on arbitrary content, or algorithmic engagement loops beyond weekly digests and match recommendations.

**中文:** (1) 不是约会应用——不强制照片，没有私信；互动默认公开。(2) 不是招聘平台——不以简历为中心；招聘信号是衍生的，而非主动收集的。(3) 不是通用社交网络——没有信息流、对任意内容的点赞或算法沉迷循环，仅保留每周 Digest 与匹配推荐。

---

## 3. Core Design Principles / 核心设计原则

**English:** Five principles govern every feature decision:

**中文:** 五项原则指导所有功能决策：

| # | Principle / 原则 | Meaning / 含义 |
|---|---|---|
| P1 | Git is the social language / git 即社交语言 | Every native git action maps to a social gesture; features must honor this mapping (see table below), never fight it |
| P2 | Federated by default / 默认联邦 | Members own their profile data in their own repositories; the central repo only indexes |
| P3 | Intent-first data / 意图优先的数据 | Profiles are structured intent declarations (`lookingFor`, `offer`), not free-text essays; matching, filtering, and recommendations all depend on this |
| P4 | Closed interaction loop / 闭环互动 | Every interaction ends in a visible, persistent outcome (Ping → Reply → Link); no dead-end gestures |
| P5 | Trust & safety by design / 安全内建 | Privacy, spam resistance, and security are baseline requirements (P0), not later add-ons |

### 3.1 Git Gesture Mapping Table (P1) / git 手势映射表

**English:** This table is the product's unique, non-replicable identity. It is published in the README and every interaction must be consistent with it:

**中文:** 此表是产品独特且不可复制的身份标识。它将发布在 README 中，所有互动必须与其保持一致：

| Git action / git 动作 | Social meaning / 社交含义 | Product feature / 产品功能 |
|---|---|---|
| `commit` | Self-introduction / update / 自我介绍、更新状态 | Submitting or updating `profile.json` |
| `fork` | Follow / 关注 | Forking someone's intro repository |
| `star` | Appreciation / 欣赏 | Starring the central repo or a member repo |
| `issue @mention` | Greeting (Ping) / 打招呼 | Creating a Ping issue |
| `merge` | Establish friendship / 建立好友关系 | The Link ceremony after mutual confirmation |
| `branch` | Relationship line / 关系线 | Optional per-relationship notes branch |
| `diff` | Fate visualization / 缘分可视化 | Highlighting overlapping fields between two profiles |
| `history` | Social track record / 社交履历 | Every interaction leaves a commit; social history is git history |

---

## 4. Functional Requirements / 功能需求

**English:** Requirements are grouped by priority. P0 is the minimum viable release (2 weeks); P1 ships the interactive social layer; P2 ships AI and gamification. Each requirement includes a user story and acceptance criteria (Given/When/Then). Cross-references: FR-xx requirements reference Protocol-SPEC.md, Architecture.md, and UX.md by section number (e.g., "Protocol-SPEC §2.3").

**中文:** 需求按优先级分组。P0 为最小可行版本（2 周）；P1 交付互动社交层；P2 交付 AI 与游戏化。每个需求包含用户故事和验收标准（Given/When/Then）。交叉引用：FR-xx 需求按章节编号引用 Protocol-SPEC.md、Architecture.md 与 UX.md（如 "Protocol-SPEC §2.3"）。

### 4.1 P0 — Minimum Viable Release / 最小可行版本

#### FR-01 Federated Profile Protocol / 联邦化 Profile 协议
**English:** Members maintain `make-friends/profile.json` in their own repository, following the open schema published by the central repo. The central repo never stores profile content — only a pointer (index entry).

**中文:** 成员在自己的仓库中维护 `make-friends/profile.json`，遵循中央仓库发布的开放 Schema。中央仓库不存储 profile 内容——只存储指针（索引条目）。

**User story / 用户故事:** As a developer, I want to introduce myself in my own repository using a standard format, so that I fully own my data and can leave or delete it at any time.

**Acceptance criteria / 验收标准:**
- Given my profile follows the published schema, when I push `make-friends/profile.json` to my repository, then my data lives in my repository and is never copied into the central repo.
- Given my profile violates the schema, when the central crawler validates it, then the profile is excluded from the index and a validation report is recorded.
- Given a profile `protocolVersion` of 1.0, when the schema evolves, then old profiles remain readable (backward compatibility, see Protocol-SPEC §6).

#### FR-02 Central Index & Card Wall Rendering / 中央索引与卡片墙渲染
**English:** A scheduled GitHub Action crawls member repositories, validates profiles, and produces `index.json`. A rendered site (GitHub Pages) presents the community as a browsable, filterable card wall.

**中文:** 一个定时 GitHub Action 抓取成员仓库、校验 profile 并生成 `index.json`。渲染站点（GitHub Pages）将社区呈现为可浏览、可筛选的卡片墙。

**User story / 用户故事:** As a visitor, I want to browse and filter the community by purpose, city, language, and interests, so that I can quickly find people relevant to my social goal.

**Acceptance criteria / 验收标准:**
- Given the card wall is published, when I open the site, then I can filter by `lookingFor`, `city`, `speaks`, and `interests`.
- Given a member's profile is in the index, when the profile is updated in the member's repository, then the wall reflects the change within the next scheduled crawl (≤ 7 days).
- Given the wall contains 10,000 members, when I load the homepage, then it renders in under 3 seconds (static pre-rendering, lazy-loaded cards).

#### FR-03 Ping (Greeting) / Ping（打招呼）
**English:** Any visitor can initiate contact by creating a structured Ping issue that mentions the target member. The target receives a native GitHub notification. A Ping is public and low-commitment.

**中文:** 任何访客都可以通过创建结构化的 Ping issue 并 @ 目标成员来发起联系。目标成员会收到 GitHub 原生通知。Ping 是公开的、低承诺的。

**User story / 用户故事:** As a member, I want to greet someone with one click, so that I can start a conversation without exposing my email or other private contact.

**Acceptance criteria / 验收标准:**
- Given I am viewing a member's card, when I click "Say hi" (Ping), then a GitHub issue is created with the `[ping]` title prefix, a structured body template (source profile link, optional reason), and an @mention of the target.
- Given a Ping issue is created, when the target has GitHub notifications enabled, then they are notified natively.
- Given a Ping issue exists, when anyone replies, then the conversation continues in that issue thread (Reply flow, FR-04).

#### FR-04 Reply (Conversation) / Reply（回应与对话）
**English:** The Pinged member replies in the same issue thread. The conversation is public, discoverable, and leaves a permanent, verifiable trace — consistent with P1 (history is social track record).

**中文:** 被 Ping 的成员在同一个 issue 线程中回复。对话公开、可发现，并留下永久、可验证的痕迹——符合 P1（历史即社交履历）。

**Acceptance criteria / 验收标准:**
- Given a Ping issue exists, when the target replies, then the reply is visible in the thread and the Ping creator is notified.
- Given a conversation concludes, when both parties say `/link` (FR-05), then the relationship is recorded; otherwise the issue remains an open conversation with no further obligation.

#### FR-05 Link (Mutual Confirmation & Relationship Record) / Link（双向确认与关系记录）
**English:** When both parties confirm with `/link` in the issue thread, an automated process records the relationship in the central `links.json`, and the relationship graph (FR-10) updates. This is the product's core "merge" ceremony: mutual, verifiable, irreversible-by-default (removal supported, see Protocol-SPEC §4.3).

**中文:** 当双方在 issue 线程中都输入 `/link` 确认后，自动化流程将关系记录到中央 `links.json`，关系图谱（FR-10）随之更新。这是产品核心的 "merge" 仪式：双向、可验证、默认不可撤销（支持移除，见 Protocol-SPEC §4.3）。

**User story / 用户故事:** As a member, I want to formally establish a friendship with a verified mutual confirmation, so that our relationship appears in the community graph and our social track records.

**Acceptance criteria / 验收标准:**
- Given a Ping issue thread, when both parties post `/link` (in any order), then a link `{a, b, created_at, issue_url}` is appended to `links.json` and both members receive a confirmation comment in the issue.
- Given a link is recorded, when the site renders, then the two nodes are connected in the relationship graph.
- Given both parties post `/unlink`, when the confirmation process completes, then the link is removed from `links.json` and marked as removed in the issue.

#### FR-06 Anti-Spam Baseline / 反垃圾信息基线
**English:** Strict schema validation, a content rule engine (length, keyword, and link checks), rate limiting, and a maintainer approval gate for new index entries. A `denylist` removes offenders from the index (content in their own repo is untouched).

**中文:** 严格的 Schema 校验、内容规则引擎（长度、关键词与链接检查）、速率限制，以及新索引条目的维护者审批门槛。`denylist` 将违规者从索引中移除（其自有仓库中的内容不受影响）。

**Acceptance criteria / 验收标准:**
- Given a submitted profile fails schema validation (missing required fields, unknown enum values, over-length fields), when validation runs, then it is rejected with a machine-readable report and never enters the index.
- Given a profile contains prohibited content (blacklisted domains, excessive links, detectable placeholder text), when the content rule engine runs, then it is flagged for maintainer review.
- Given a new member requests index entry, when the request arrives, then it requires maintainer approval before appearing on the wall (one-time gate; subsequent updates are automated).
- Given a member is denied entry, when they re-submit with modifications, then the denylist record includes a reason and a re-application path.

#### FR-07 Privacy Baseline / 隐私基线
**English:** Minimal field set by default, explicit publicness notice at submission time, sensitive-information detection (emails, phone numbers, exact coordinates, EXIF-bearing images), and a documented removal path (profile deletion from the member's own repo, plus `unlink` for relationships). The federated design means no data in the central repo to delete.

**中文:** 默认最小字段集、提交时明示公开性、敏感信息检测（邮箱、电话、精确坐标、含 EXIF 的图片），以及文档化的移除路径（从成员自有仓库删除 profile，关系使用 `unlink`）。联邦设计意味着中央仓库中无可删除的数据。

**Acceptance criteria / 验收标准:**
- Given a user starts onboarding, when they see the submission form/CLI, then they are shown the notice: "This content is public and stored in your own repository; removing it is at your discretion."
- Given a profile contains a detectable email or phone number, when validation runs, then it is rejected with a privacy warning.
- Given a member deletes `make-friends/profile.json` from their repository, when the next crawl runs, then their index entry is removed (or marked stale for 30 days before hard removal).

### 4.2 P1 — Interactive Social Layer / 互动社交层

#### FR-08 CLI Tool (`make-friends`) / CLI 工具
**English:** A Node.js/TypeScript CLI distributed via `npx` with four commands: `introduce` (guided onboarding that generates and submits a profile), `ping <username>` (creates a Ping issue), `match` (shows compatibility-ranked candidates), and `graph` (opens the relationship graph). It reuses the GitHub token via the `gh` CLI or OAuth Device Flow.

**中文:** 通过 `npx` 分发的 Node.js/TypeScript CLI，提供四个命令：`introduce`（引导式注册，生成并提交 profile）、`ping <username>`（创建 Ping issue）、`match`（显示按契合度排序的候选者）、`graph`（打开关系图谱）。通过 `gh` CLI 或 OAuth Device Flow 复用 GitHub token。

**User story / 用户故事:** As a developer, I want to introduce myself and interact without touching the GitHub web UI, so that participation feels native to my terminal workflow.

**Acceptance criteria / 验收标准:**
- Given the CLI is installed via `npx make-friends`, when I run `make-friends introduce`, then it interactively collects the required fields, writes `make-friends/profile.json`, and opens a pull request against the central repo index (or instructs me to push to my own repo for federation).
- Given I run `make-friends ping alice-dev`, when the target exists in the index, then a properly formatted Ping issue is created via the GitHub API.
- Given I run `make-friends match`, when candidates exist, then a ranked list with similarity scores and reasons is printed.
- Given I run `make-friends graph`, when a link network exists, then my browser opens the graph page.

#### FR-09 Similarity-Based Recommendations / 相似度推荐
**English:** A scheduled Action computes similarity (field overlap + optional AI semantic similarity, see FR-14) between profiles and produces a "people you might want to know" list on the site and in the weekly digest.

**中文:** 一个定时 Action 计算 profile 之间的相似度（字段重合度 + 可选的 AI 语义相似度，见 FR-14），在站点和每周 Digest 中生成"你可能想认识的人"列表。

**Acceptance criteria / 验收标准:**
- Given two profiles, when both declare the same `lookingFor` and share ≥ 2 interests, then they appear in each other's recommendations.
- Given a member has links, when recommendations are generated, then friends-of-friends are ranked above strangers with equal field overlap.

#### FR-10 Relationship Graph Page / 关系图谱页
**English:** A force-directed graph page renders `links.json`: the full community view and a per-member ego view. Users can explore "friends of friends" (weak links) and filter by purpose/city.

**中文:** 力导向图谱页渲染 `links.json`：社区全览视图和单成员 ego 视图。用户可以探索"朋友的 朋友"（弱连接），并按目的/城市筛选。

**Acceptance criteria / 验收标准:**
- Given `links.json` exists, when the graph page loads, then nodes are members and edges are links, with member cards on hover.
- Given a member is selected, when the ego view opens, then first-degree friends and second-degree connections are visually distinguished.

#### FR-11 Weekly Digest / 每周 Digest
**English:** A weekly issue (and optional email) summarizes: new members in your city, people with the smallest "fate diff" vs. your profile, your friends' updates, and pending un-answered Pings. This is the primary retention hook.

**中文:** 每周一期 issue（可选邮件）汇总：你所在城市的新成员、与你的 profile "缘分 diff" 最小的人、你朋友的动态，以及未回应的 Ping。这是主要的留存钩子。

**Acceptance criteria / 验收标准:**
- Given the weekly schedule triggers, when a member has activity (new links, new Pings, new members in city, new high-similarity profiles), then the digest issue mentions them.
- Given a member has an unanswered Ping older than 7 days, then the digest includes a gentle reminder.

### 4.3 P2 — AI & Gamification / AI 与游戏化

#### FR-12 AI-Guided Onboarding / AI 引导填写
**English:** Instead of a blank form, an interactive AI conversation collects answers and generates a validated `profile.json` draft. Provider-agnostic (any OpenAI-compatible endpoint or local model).

**中文:** 不是空白表单，而是交互式 AI 对话收集答案并生成通过校验的 `profile.json` 草稿。与供应商无关（任何 OpenAI 兼容端点或本地模型）。

**Acceptance criteria / 验收标准:**
- Given a user starts `introduce --ai`, when the conversation covers the required fields, then a schema-valid draft is generated and shown for review before submission.
- Given the user refuses to answer a question, when the conversation continues, then sensible defaults are proposed and flagged for review.

#### FR-13 AI Translation / AI 翻译
**English:** Every profile can be viewed in multiple languages (cache-translated). The site offers a language selector; translations are generated by an Action on demand or in batch, with a machine-translation disclaimer.

**中文:** 每个 profile 都可以多语言查看（缓存翻译）。站点提供语言选择器；翻译由 Action 按需或批量生成，并附带机器翻译声明。

**Acceptance criteria / 验收标准:**
- Given a profile in language A, when a visitor selects language B, then the translated view is served from cache (or generated on first request).
- Given a translation is machine-generated, when it is displayed, then a "machine translation" notice is shown.

#### FR-14 AI Semantic Matching / AI 语义匹配
**English:** Beyond tag overlap, embeddings-based semantic similarity finds hidden affinities (e.g., "Rust developer" and "systems performance researcher"). Batch-computed in the matching Action; results enrich FR-09 recommendations.

**中文:** 超越标签重合，基于 embedding 的语义相似度发现隐性缘分（例如"Rust 开发者"与"系统性能研究者"）。在匹配 Action 中批量计算；结果丰富 FR-09 推荐。

#### FR-15 AI Icebreaker Suggestions / AI 破冰建议
**English:** When creating a Ping, the CLI or site may offer a suggested opening line derived from both profiles ("I see you work on X and I also..."). Explicitly optional and editable.

**中文:** 创建 Ping 时，CLI 或站点可提供基于双方 profile 生成的开场白建议（"我看到你在做 X，我也……"）。明确可选且可编辑。

#### FR-16 Badge System / 徽章系统
**English:** SVGs derived from the member's interaction history: first introduction, first Ping received, first Link, 10 Links, 30-day streak, "fate diff" champion, etc. Badges are embeddable in personal GitHub READMEs — a free viral channel.

**中文:** 基于成员互动历史派生的 SVG 徽章：首次自我介绍、收到第一个 Ping、第一个 Link、10 个 Link、连续 30 天活跃、"缘分 diff" 之王等。徽章可嵌入个人 GitHub README——免费的病毒式传播渠道。

#### FR-17 Mystery Friend / 盲盒朋友
**English:** A daily "random stranger" card on the site: one random member's profile, one-click Ping. Designed for serendipity and for members who feel awkward initiating.

**中文:** 站点上每日一张"随机陌生人"卡片：随机一位成员的 profile，一键 Ping。为意外之喜和不好意思主动发起的人设计。

#### FR-18 City Groups / 城市小组
**English:** Members are aggregated by `city` into group pages, enabling local meetups and travel-friend discovery. A member may join a city group for one or more cities (current and future locations).

**中文:** 成员按 `city` 聚合成小组页面，支持线下聚会和旅行交友发现。成员可以加入一个或多个城市小组（当前与未来所在地）。

**Acceptance criteria / 验收标准:**
- Given a city has ≥ 3 members, when the site renders, then a city group page is generated with member cards and a "meetup" discussion thread.

---

## 5. Non-Functional Requirements / 非功能需求

| ID | Category / 类别 | Requirement / 要求 |
|---|---|---|
| NFR-01 | Privacy / 隐私 | No profile content stored in the central repo; minimal field set; explicit publicness notice; sensitive-information detection on every submission path |
| NFR-02 | Security / 安全 | All rendered content HTML-escaped (XSS-safe); external links https-only with domain reputation check; Actions use least-privilege tokens; CLI published with provenance |
| NFR-03 | Performance / 性能 | Card wall renders < 3s at 10k members; crawl of 10k repos completes within the free Actions quota and GitHub API rate limits |
| NFR-04 | Scalability / 可扩展性 | Architecture supports 10k+ members with incremental rendering; no human review beyond the one-time entry gate and edge-case moderation |
| NFR-05 | Accessibility / 可访问性 | Site meets WCAG 2.1 AA; keyboard-navigable cards and graph |
| NFR-06 | i18n / 国际化 | Site UI in English + Chinese initially; profile translation via FR-13 |
| NFR-07 | Reliability / 可靠性 | Crawl failures are isolated per member (one bad repo never blocks the index); digest and rendering degrade gracefully |

---

## 6. Success Metrics / 成功指标

| Metric / 指标 | Definition / 定义 | Target (6 months) / 目标 |
|---|---|---|
| North star / 北极星 | Monthly completed Links | ≥ 50 links/month at 1,000 members |
| Activation / 激活 | % of submitted profiles receiving ≥ 1 Ping within 30 days | ≥ 30% |
| Engagement / 参与 | % of Pinged members replying within 7 days | ≥ 50% |
| Retention / 留存 | % of members with a second interaction within 90 days | ≥ 25% |
| Content quality / 内容质量 | % of index entries passing automated validation without human review | ≥ 95% |
| Discovery / 发现 | % of new members who joined via a friend's recommendation or badge | ≥ 20% |

---

## 7. Roadmap / 路线图

| Phase / 阶段 | Duration / 周期 | Scope / 范围 |
|---|---|---|
| MVP / 最小可行版本 | 2 weeks / 2 周 | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07 — manual/scripted flows first, then automated |
| Social layer / 社交层 | Weeks 3–4 / 第 3–4 周 | FR-08 (CLI), FR-09, FR-10, FR-11 |
| AI & gamification / AI 与游戏化 | Weeks 5–6 / 第 5–6 周 | FR-12 – FR-18 |
| Stabilization / 稳定期 | Continuous / 持续 | NFR compliance, moderation tooling, metrics dashboard |

**MVP scoping note / MVP 范围说明:** The MVP deliberately runs on manual + scripted flows (a documented procedure and one-off scripts) before investing in Actions automation, to validate the "commit-as-friendship" ritual with real users first.

**中文说明:** MVP 刻意先用手动 + 脚本流程（文档化流程与一次性脚本）验证"commit 即交友"仪式，再投入 Actions 自动化建设。
