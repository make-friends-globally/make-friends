# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

全球开发者社区（开源贡献者、语言学习者、远程工作者、小众兴趣爱好者），以 GitHub 为日常工具的人群。次要受众：关注开发者社交实验的社区观察者（HN / V2EX / Twitter 读者）。

## Product Purpose

make-friends 是一个 git 原生社交协议：开发者向自己的仓库提交 `profile.json` 完成自我介绍，在社区卡片墙被发现，用纯 GitHub 手势（ping issue、/link 命令）把真实对话变成可见的友谊图谱。成功标准（2026 年底愿景）：成为开发者"git 原生"交友的标准方式——五分钟完成介绍、一周内收到匹配陌生人的 ping、友谊沉淀为可见的 git merge 图谱。

## Positioning

git 的每个原生动作都映射为一种社交手势，此映射表是产品不可复制的身份：commit = 自我介绍，fork = 关注，star = 欣赏，issue @mention = 打招呼（ping），merge = 建立友谊（/link 仪式），diff = 缘分可视化，history = 社交履历。联邦式数据主权：数据在成员自己的仓库里，中央索引只存指针，删除 profile 即在下一次抓取后彻底消失。

## Operating Context

参与完全发生在 GitHub 上：Use template 建仓库 → 编辑 make-friends/profile.json → commit → 提 PR/issue 加入 index → 每日 00:30 UTC 抓取上墙。互动通过 issue（[ping] 模板）与机器人命令（/link、/unlink）完成。零依赖 Node 脚本驱动校验、抓取与渲染；GitHub Actions 自动化。站点为 Astro 静态站，部署于 GitHub Pages。

## Capabilities and Constraints

- 已实现（MVP，未上线）：profile schema（draft-07）、validate-cli、每日爬虫、/link 双向确认仪式、卡片墙站点、友谊图谱页、四个 Actions workflow。
- lookingFor 枚举固定：language-partner、collaborator、mentor、mentee、local-friend、cofounder、chat。
- timezone 为简化 UTC 偏移；禁止邮箱/电话/精确 GPS；外链必须 https。
- 一次性人工审批是反 spam 闸门，不拆。
- **当前 0 成员、0 链接**（2026-08-28 确认）：一切对外材料不得声称已有社区规模、用户证言或数据。

## Brand Commitments

- 中英双语并重（所有区块双语对照），仓库组织名 make-friends-globally 指向全球开发者。
- 核心口号：「A commit is an introduction. A merge is a friendship. / 一次 commit 就是一次自我介绍；一次 merge 就是一段友谊。」
- 语气：开发者原生、协议感、有温度但不卖弄；不装企业感。

## Evidence on Hand

- 协议手势映射表（README / PRD §3.1）——真实的、可展示的产品机制。
- profile-template/（三步浏览器加入）、profile.schema.json、validate-cli、links.json、index.json（当前为空）。
- site/（Astro 卡片墙 + 图谱页，深蓝 slate + 蓝 accent 的功能型站点——这是站点的世界，不是品牌的全部）。
- 缺失且不得编造：成员数据、用户证言、使用量统计、媒体报道。

## Product Principles

1. Git 即社交语言——一切交互必须忠于手势映射表。
2. 联邦优先——数据主权在成员仓库，中央只有指针。
3. 意图优先——结构化意图声明（lookingFor/offer）取代自由文本。
4. 闭环互动——每个手势都有可见、持久的结局（ping → reply → link）。
5. 信任内建——隐私、反 spam、安全是基线而非补丁。
