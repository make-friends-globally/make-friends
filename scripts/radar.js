#!/usr/bin/env node
/**
 * make-friends friend radar — scout agent, draft-box mode.
 *
 * Discovers GitHub-native people aligned with your interest profile, scores
 * the overlap, infers each candidate's best contact window from their push
 * activity, and drafts a personalized icebreaker into:
 *   reports/friend-radar-<date>.md    (readable report)
 *   reports/friend-radar-<date>.html  (local webapp: cards + copy-to-clipboard)
 *
 * Hard boundary (draft-box mode): this script only OBSERVES public data and
 * WRITES local files. It never sends issues, comments, or messages on
 * anyone's behalf. The final "send" action is always a human decision.
 *
 * Data sources: GitHub REST API (public data only: users, repos, public
 * events). No emails, no profile scraping beyond GitHub, no automation of
 * outbound social actions.
 *
 * Usage:
 *   node scripts/radar.js                 # write both report files
 *   GITHUB_TOKEN=... node scripts/radar.js  # recommended: 5000 req/h vs 60/h
 *
 * Request budget: ~26-34 API calls per run (fits the unauthenticated 60/h limit).
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const API = "https://api.github.com";
const REPO_ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(REPO_ROOT, "scripts", "config", "radar-profile.json");

// Tuning knobs kept small so an unauthenticated run stays within 60 req/h.
const REPOS_PER_TOPIC = 2;
const REPOS_FOR_CONTRIBUTORS = 5;
const MAX_CANDIDATES = 8;
const CANDIDATES_DETAIL_BUDGET = 8; // users + events calls = 2x this
const COMMIT_LOOKUP_BUDGET = 8;     // per-run cap on head-commit fetches (see scoreCandidate)

const CHINA_HINTS = ["china", "shanghai", "beijing", "shenzhen", "hangzhou", "chengdu", "guangzhou", "wuhan", "nanjing", "suzhou", "xi'an", "utc+8"];

let apiCalls = 0;

// GitHub no longer returns commit messages in public PushEvent payloads, so
// subjects are recovered with one /repos/{repo}/commits/{head} call per pushed
// repo. Cached across candidates (several often push to the same repo) to
// protect the rate-limit budget.
const commitSubjectCache = new Map(); // head sha -> commit subject

async function gh(pathname, token) {
  apiCalls += 1;
  const res = await fetch(`${API}${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "make-friends-radar",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new Error("GitHub API rate limit exhausted — set GITHUB_TOKEN or retry later");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status}`);
  return res.json();
}

function loadProfile() {
  const p = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  if (typeof p.owner !== "string" || !p.owner) {
    throw new Error('radar-profile.json: "owner" must be a non-empty string');
  }
  for (const key of ["interests", "seedTopics", "languages"]) {
    if (!Array.isArray(p[key]) || p[key].length === 0) {
      throw new Error(`radar-profile.json: "${key}" must be a non-empty array`);
    }
  }
  return p;
}

/** Interest vocabulary used for scoring (profile keywords, case-insensitive). */
function vocab(profile) {
  const words = [...profile.interests, ...profile.seedTopics];
  return [...new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9-]/g, "")))];
}

/** Phase 1: find actively-maintained repos per seed topic. */
async function findTopicRepos(profile, token) {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const repos = [];
  for (const topic of profile.seedTopics) {
    const q = `topic:${encodeURIComponent(topic)} pushed:>${since}`;
    const data = await gh(`/search/repositories?q=${encodeURIComponent(q)}&sort=updated&per_page=${REPOS_PER_TOPIC}`, token);
    for (const item of data?.items || []) {
      repos.push({ fullName: item.full_name, stars: item.stargazers_count, description: item.description || "", language: (item.language || "").toLowerCase(), topics: item.topics || [], owner: item.owner.login });
    }
  }
  return repos;
}

/** Phase 2: candidate contributors from the strongest repos found. */
async function collectCandidates(repos, profile, token) {
  const seen = new Set([profile.owner.toLowerCase(), ...profile.avoidUsernames.map((u) => u.toLowerCase())]);
  const strongest = [...repos].sort((a, b) => b.stars - a.stars).slice(0, REPOS_FOR_CONTRIBUTORS);
  const candidates = [];
  for (const repo of strongest) {
    const users = await gh(`/repos/${repo.fullName}/contributors?per_page=5`, token);
    for (const u of users || []) {
      if (u.type !== "User") continue;
      const login = u.login;
      if (seen.has(login.toLowerCase())) continue;
      seen.add(login.toLowerCase());
      candidates.push({ login, viaRepo: repo.fullName, viaTopics: repo.topics, viaDesc: repo.description });
    }
  }
  return candidates.slice(0, MAX_CANDIDATES);
}

/** Collapse the UTC-hour push histogram into a contiguous active window. */
function activityWindow(hist) {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total < 2) return null;
  let peak = 0;
  for (let h = 1; h < 24; h++) if (hist[h] > hist[peak]) peak = h;
  const threshold = Math.max(1, Math.ceil(hist[peak] * 0.4));
  let start = peak;
  let end = peak;
  while ((peak - start + 1) < 12 && hist[(start - 1 + 24) % 24] >= threshold) start--;
  while ((end - peak + 1) < 12 && hist[(end + 1) % 24] >= threshold) end++;
  return { start: ((start % 24) + 24) % 24, end: ((end % 24) + 24) % 24, peak, samples: total };
}

function isNowInWindow(win, utcHour) {
  if (win.start <= win.end) return utcHour >= win.start && utcHour <= win.end;
  return utcHour >= win.start || utcHour <= win.end; // window crosses midnight
}

/** "UTC+8" from the radar profile -> numeric offset hours (default 8). */
function parseTzOffset(tz) {
  const m = /UTC([+-])(\d{1,2})(?::(\d{2}))?/.exec(tz || "");
  if (!m) return 8;
  const h = Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0);
  return m[1] === "-" ? -h : h;
}

function fmtWindow(win, offset) {
  const s = (win.start + offset + 24) % 24;
  const e = (win.end + offset + 24) % 24;
  if (win.start === win.end) return `${String(Math.floor(s)).padStart(2, "0")}:00`;
  return `${String(Math.floor(s)).padStart(2, "0")}:00–${String(Math.floor(e)).padStart(2, "0")}:00`;
}

/** Phase 3: score each candidate from their public profile + events. */
async function scoreCandidate(candidate, profile, interests, token) {
  const user = await gh(`/users/${candidate.login}`, token);
  if (!user) return null;
  const events = (await gh(`/users/${candidate.login}/events/public?per_page=15`, token)) || [];

  const pushedRepos = new Map(); // repo -> latest commit subject
  const pushHeads = new Map(); // repo -> { full, head, at } of the most recent push
  const hourHist = new Array(24).fill(0);
  let recentPush = false;
  let lastPushAt = null;
  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  for (const ev of events) {
    if (ev.type !== "PushEvent" || !ev.created_at) continue;
    const at = new Date(ev.created_at);
    if (at > monthAgo) {
      recentPush = true;
      if (!lastPushAt || at > lastPushAt) lastPushAt = at;
      hourHist[at.getUTCHours()] += 1;
      const full = ev.repo?.name || "";
      const repoName = full.split("/").pop();
      if (!repoName) continue;
      const prev = pushHeads.get(repoName);
      if (!prev || at > prev.at) pushHeads.set(repoName, { full, head: ev.payload?.head, at });
      const subject = ev.payload?.commits?.slice(-1)[0]?.message?.split("\n")[0] || "";
      if (subject && !pushedRepos.has(repoName)) pushedRepos.set(repoName, subject);
    }
  }
  // Recover commit subjects that trimmed PushEvent payloads no longer carry.
  let commitLookups = 0;
  const headsByRecency = [...pushHeads.entries()].sort((a, b) => b[1].at - a[1].at);
  for (const [repoName, info] of headsByRecency) {
    if (!info.full || !info.head || pushedRepos.has(repoName)) continue;
    let subject;
    if (commitSubjectCache.has(info.head)) {
      subject = commitSubjectCache.get(info.head);
    } else {
      if (commitLookups >= COMMIT_LOOKUP_BUDGET) continue;
      commitLookups += 1;
      const c = await gh(`/repos/${info.full}/commits/${info.head}`, token).catch(() => null);
      subject = c?.commit?.message?.split("\n")[0] || "";
      commitSubjectCache.set(info.head, subject);
    }
    if (subject) pushedRepos.set(repoName, subject);
  }
  const window = activityWindow(hourHist);

  let score = 0;
  const why = [];

  // The repo that surfaced this candidate is the strongest signal: its topics
  // and description came from the user's own seed interests.
  const compact = (s) => s.toLowerCase().replace(/[-_]/g, "");
  const topicHits = (candidate.viaTopics || []).filter((t) =>
    interests.some((w) => compact(t) === w || compact(t).includes(w.replace(/-/g, "")))
  );
  if (topicHits.length > 0) {
    score += 3;
    why.push(`contributes to ${candidate.viaRepo} (topics: ${topicHits.slice(0, 3).join("/")})`);
  } else if (interests.some((w) => (candidate.viaDesc || "").toLowerCase().includes(w))) {
    score += 2;
    why.push(`contributes to ${candidate.viaRepo} (description match)`);
  }

  const haystack = [user.bio || "", user.company || "", user.blog || ""].join(" ").toLowerCase();
  for (const word of interests) {
    if (haystack.includes(word)) { score += 2; why.push(`profile mentions "${word}"`); }
  }
  for (const repo of pushedRepos.keys()) {
    for (const word of interests) {
      if (compact(repo).includes(compact(word))) {
        score += 2;
        why.push(`actively pushing to ${repo} (${word} signal)`);
        break;
      }
    }
  }
  const location = user.location || "";
  if (location && CHINA_HINTS.some((h) => location.toLowerCase().includes(h))) {
    score += 2;
    why.push(`location: ${location} (near UTC+8)`);
  }
  if (recentPush) { score += 2; why.push("pushed code in the last 30 days"); }
  if ((user.public_repos || 0) > 10) { score += 1; why.push(`${user.public_repos} public repos`); }

  return { user, score, why, pushedRepos, recentPush, topicHits, window, lastPushAt };
}

function draftOpener(cand, profile) {
  const firstRepo = [...cand.pushedRepos.entries()][0];
  const repo = firstRepo ? firstRepo[0] : null;
  const subject = firstRepo ? firstRepo[1].slice(0, 70) : null;
  const shared = cand.topicHits?.[0] || profile.interests[0] || profile.seedTopics[0];
  const lines = [
    `Hi @${cand.user?.login || cand.login}! I ran into your work on ${cand.viaRepo} while digging into ${shared}.`,
    subject
      ? `Your recent push to ${repo} ("${subject}") caught my eye — that's right in the territory I'm exploring.`
      : `Your recent activity in ${repo || "this space"} looks right up my alley.`,
    `I work on ${profile.interests.slice(0, 2).join(" and ")} and would love to trade notes. 我也在做相关方向，欢迎交流!`,
  ];
  return lines.join("\n");
}

/** Contact-window line shared by both report renderers. */
function contactLine(cand, profile, nowUtcHour) {
  if (!cand.window) return null;
  const tz = parseTzOffset(profile.location);
  const local = fmtWindow(cand.window, tz);
  const utc = `${String(cand.window.start).padStart(2, "0")}:00–${String(cand.window.end).padStart(2, "0")}:00`;
  const now = isNowInWindow(cand.window, nowUtcHour) ? " — **within the window right now**" : "";
  return `your ${local} (their peak ${utc} UTC, n=${cand.window.samples})${now}`;
}

function renderReport(profile, scored, nowUtcHour) {
  const date = new Date().toISOString().slice(0, 10);
  const L = [];
  L.push(`# Friend Radar — ${date}`);
  L.push("");
  L.push(`> Scout report generated by \`scripts/radar.js\` (${apiCalls} GitHub API calls).`);
  L.push(`> Profile: interests=${profile.interests.join(", ")} · speaks=${profile.speaks.join("/")} · tz=${profile.location}`);
  L.push(`> **Draft-box mode: nothing was sent. Every contact below is YOUR call.**`);
  L.push("");
  if (scored.length === 0) {
    L.push("No candidates this round. Widen `seedTopics` in scripts/config/radar-profile.json or retry later.");
  }
  scored.forEach((c, i) => {
    L.push(`## ${i + 1}. @${c.login} — score ${c.score}`);
    L.push("");
    L.push(`- **Why matched:** ${c.why.join(" · ") || "—"}`);
    const contact = contactLine(c, profile, nowUtcHour);
    if (contact) L.push(`- **Best contact window:** ${contact}`);
    if (c.lastPushAt) L.push(`- **Last push:** ~${Math.max(0, Math.round((Date.now() - new Date(c.lastPushAt)) / 3600000))}h ago`);
    L.push(`- **Bio:** ${c.user.bio || "—"}${c.user.company ? ` · ${c.user.company}` : ""}`);
    L.push(`- **Location:** ${c.user.location || "—"} · **Followers:** ${c.user.followers}`);
    if (c.pushedRepos.size > 0) {
      L.push("- **Recently pushing to:**");
      for (const [repo, subject] of [...c.pushedRepos.entries()].slice(0, 3)) {
        L.push(`  - ${repo}: "${subject}"`);
      }
    }
    L.push(`- **Profile:** https://github.com/${c.user.login}`);
    L.push(`- **Opener draft** (edit before sending — a ping issue in the make-friends repo, or a comment in their project):`);
    L.push("");
    L.push(`> ${draftOpener(c, profile).replace(/\n/g, "\n> ")}`);
    L.push("");
  });
  L.push("---");
  L.push("Ethics of this report: built from public GitHub data only; no emails collected;");
  L.push("candidates can be added to `avoidUsernames` in the radar profile to disappear forever.");
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Local webapp renderer (single self-contained HTML file).
// Security: candidate-controlled strings (bio, commit subjects, ...) are only
// ever attached via textContent; the embedded JSON escapes "<" so no `</script>`
// breakout is possible.
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderHtml(profile, scored, nowUtcHour, dateStr) {
  const tz = parseTzOffset(profile.location);
  const data = scored.map((c) => ({
    login: c.login,
    score: c.score,
    why: c.why,
    bio: c.user.bio || "",
    company: c.user.company || "",
    location: c.user.location || "",
    followers: c.user.followers || 0,
    pushed: [...c.pushedRepos.entries()].slice(0, 3).map(([repo, subject]) => ({ repo, subject })),
    window: c.window ? {
      start: c.window.start, end: c.window.end, peak: c.window.peak, samples: c.window.samples,
      local: fmtWindow(c.window, tz),
      utc: `${String(c.window.start).padStart(2, "0")}:00–${String(c.window.end).padStart(2, "0")}:00`,
      now: isNowInWindow(c.window, nowUtcHour),
    } : null,
    lastPushAt: c.lastPushAt ? c.lastPushAt.toISOString() : null,
    opener: draftOpener(c, profile),
    viaRepo: c.viaRepo,
  }));

  const payload = JSON.stringify({ profile: { interests: profile.interests, speaks: profile.speaks, tz: profile.location }, date: dateStr, candidates: data })
    .replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Friend Radar — ${esc(dateStr)}</title>
<style>
:root { --bg:#0f172a; --card:#1e293b; --card-hover:#273449; --text:#e2e8f0; --dim:#94a3b8; --accent:#3b82f6; --border:#334155; --ok:#10b981; --warn:#f59e0b; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:ui-sans-serif,system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif; line-height:1.6; }
.wrap { max-width:860px; margin:0 auto; padding:24px 20px 60px; }
h1 { font-size:26px; margin:0 0 4px; }
.meta { color:var(--dim); font-size:13px; margin-bottom:8px; }
.banner { border:1px solid var(--warn); background:rgba(245,158,11,.08); color:var(--warn); border-radius:10px; padding:10px 14px; font-size:13px; margin:16px 0; }
.grid { display:grid; gap:16px; margin-top:20px; }
.card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px; transition:background .15s; }
.card:hover { background:var(--card-hover); }
.top { display:flex; align-items:center; gap:12px; }
.avatar { width:52px; height:52px; border-radius:50%; }
.who { flex:1; min-width:0; }
.login { font-weight:700; font-size:17px; color:var(--text); text-decoration:none; }
.login:hover { color:var(--accent); }
.score { background:var(--accent); color:#fff; font-weight:700; border-radius:999px; padding:4px 12px; font-size:13px; white-space:nowrap; }
.sub { color:var(--dim); font-size:13px; }
.badges { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 2px; }
.badge { font-size:12px; border-radius:999px; padding:3px 10px; background:var(--bg); border:1px solid var(--border); color:var(--dim); }
.badge.now { background:rgba(16,185,129,.12); border-color:var(--ok); color:var(--ok); font-weight:600; }
.why { color:var(--dim); font-size:13px; margin:8px 0; }
.pushes { margin:8px 0; padding-left:18px; font-size:13px; }
.pushes li { margin:2px 0; }
.pushes code { color:#7dd3fc; }
.opener { background:var(--bg); border:1px solid var(--border); border-radius:10px; padding:12px 14px; margin-top:10px; font-size:13.5px; white-space:pre-wrap; }
.actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
button, a.btn { border:1px solid var(--border); background:var(--bg); color:var(--text); border-radius:8px; padding:7px 14px; font-size:13px; cursor:pointer; text-decoration:none; }
button:hover, a.btn:hover { background:var(--card-hover); }
button.copied { border-color:var(--ok); color:var(--ok); }
footer { margin-top:28px; color:var(--dim); font-size:12px; border-top:1px solid var(--border); padding-top:14px; }
.empty { text-align:center; color:var(--dim); padding:60px 0; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Friend Radar</h1>
  <div class="meta" id="meta"></div>
  <div class="banner">Draft-box mode / 草稿箱模式 — this app only READS public GitHub data and drafts openers. Nothing is ever sent automatically. 发送动作永远由你本人决定。</div>
  <div class="grid" id="grid"></div>
  <div class="empty" id="empty" style="display:none">No candidates this round. / 本轮无候选——调整 scripts/config/radar-profile.json 的 seedTopics 后重跑。</div>
  <footer>Built from public GitHub data only · no emails collected · add a login to <code>avoidUsernames</code> in the radar profile to hide a candidate forever · generated by scripts/radar.js</footer>
</div>
<script>
const DATA = ${payload};
const tzOffset = 8; // viewer's local time, from radar profile
const meta = document.getElementById("meta");
meta.textContent = \`date \${DATA.date} · interests: \${DATA.profile.interests.join(", ")} · speaks: \${DATA.profile.speaks.join("/")} · \${DATA.candidates.length} candidates\`;

function ago(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return mins + " min ago";
  if (mins < 48 * 60) return Math.round(mins / 60) + " h ago";
  return Math.round(mins / 1440) + " d ago";
}

// navigator.clipboard.writeText can hang forever without user activation
// (e.g. scripted clicks); race it with a timeout, then fall back to execCommand.
async function copyText(t) {
  try {
    await Promise.race([
      navigator.clipboard.writeText(t),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 800)),
    ]);
    return true;
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

for (const c of DATA.candidates) {
  const card = document.createElement("div");
  card.className = "card";

  const top = document.createElement("div"); top.className = "top";
  const img = document.createElement("img");
  img.className = "avatar"; img.alt = "";
  img.src = "https://github.com/" + c.login + ".png?size=96";
  const who = document.createElement("div"); who.className = "who";
  const a = document.createElement("a");
  a.className = "login"; a.href = "https://github.com/" + c.login;
  a.target = "_blank"; a.rel = "noopener noreferrer";
  a.textContent = "@" + c.login;
  const sub = document.createElement("div"); sub.className = "sub";
  sub.textContent = [c.location || null, c.company || null, c.followers + " followers"].filter(Boolean).join(" · ");
  who.append(a, sub);
  const score = document.createElement("div"); score.className = "score";
  score.textContent = "score " + c.score;
  top.append(img, who, score);
  card.append(top);

  if (c.bio) {
    const bio = document.createElement("div"); bio.className = "why";
    bio.textContent = c.bio;
    card.append(bio);
  }

  const badges = document.createElement("div"); badges.className = "badges";
  if (c.window) {
    const b = document.createElement("span");
    b.className = "badge" + (c.window.now ? " now" : "");
    b.textContent = c.window.now
      ? "NOW is a good time — their active window is " + c.window.local + " your time"
      : "best window " + c.window.local + " your time (peak " + c.window.utc + " UTC, n=" + c.window.samples + ")";
    badges.append(b);
  }
  if (c.lastPushAt) {
    const b = document.createElement("span"); b.className = "badge";
    b.textContent = "last push " + ago(c.lastPushAt);
    badges.append(b);
  }
  if (badges.children.length) card.append(badges);

  if (c.why.length) {
    const why = document.createElement("div"); why.className = "why";
    why.textContent = "Why matched: " + c.why.join(" · ");
    card.append(why);
  }

  if (c.pushed.length) {
    const ul = document.createElement("ul"); ul.className = "pushes";
    for (const p of c.pushed) {
      const li = document.createElement("li");
      const code = document.createElement("code"); code.textContent = p.repo;
      li.append(code, document.createTextNode(": “" + p.subject + "”"));
      ul.append(li);
    }
    card.append(ul);
  }

  const opener = document.createElement("div"); opener.className = "opener";
  opener.textContent = c.opener;
  card.append(opener);

  const actions = document.createElement("div"); actions.className = "actions";
  const copy = document.createElement("button");
  copy.textContent = "Copy opener / 复制开场白";
  copy.addEventListener("click", async () => {
    const ok = await copyText(c.opener);
    copy.textContent = ok ? "Copied ✓" : "Copy failed — select the text manually";
    copy.classList.add("copied");
    setTimeout(() => { copy.textContent = "Copy opener / 复制开场白"; copy.classList.remove("copied"); }, 1600);
  });
  const gh = document.createElement("a");
  gh.className = "btn"; gh.href = "https://github.com/" + c.login;
  gh.target = "_blank"; gh.rel = "noopener noreferrer";
  gh.textContent = "GitHub profile ↗";
  actions.append(copy, gh);
  card.append(actions);

  document.getElementById("grid").append(card);
}
if (!DATA.candidates.length) document.getElementById("empty").style.display = "block";
</script>
</body>
</html>
`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || "";
  const profile = loadProfile();
  const interests = vocab(profile);
  const nowUtcHour = new Date().getUTCHours();
  console.log(`radar: scanning topics [${profile.seedTopics.join(", ")}] as @${profile.owner}${token ? "" : " (no GITHUB_TOKEN — 60 req/h budget)"}`);

  const repos = await findTopicRepos(profile, token);
  console.log(`radar: ${repos.length} repos found`);
  const candidates = await collectCandidates(repos, profile, token);
  console.log(`radar: ${candidates.length} candidates, scoring with ${CANDIDATES_DETAIL_BUDGET} detailed lookups`);

  const scored = [];
  for (const candidate of candidates.slice(0, CANDIDATES_DETAIL_BUDGET)) {
    try {
      const result = await scoreCandidate(candidate, profile, interests, token);
      if (result && result.score > 0) scored.push({ login: candidate.login, viaRepo: candidate.viaRepo, ...result });
    } catch (err) {
      console.warn(`radar: skip @${candidate.login}: ${err.message}`);
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const dateStr = new Date().toISOString().slice(0, 10);
  const outDir = path.join(REPO_ROOT, "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outMd = path.join(outDir, `friend-radar-${dateStr}.md`);
  const outHtml = path.join(outDir, `friend-radar-${dateStr}.html`);
  fs.writeFileSync(outMd, renderReport(profile, scored, nowUtcHour));
  fs.writeFileSync(outHtml, renderHtml(profile, scored, nowUtcHour, dateStr));
  console.log(`radar: report written -> ${outMd} (+ .html webapp) (${scored.length} candidates, ${apiCalls} API calls)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`radar: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { vocab, activityWindow, isNowInWindow, parseTzOffset, fmtWindow, contactLine, draftOpener, renderReport, renderHtml, loadProfile };
