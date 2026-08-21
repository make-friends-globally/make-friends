#!/usr/bin/env node
/**
 * make-friends Link processor (Architecture §3.3, Protocol-SPEC §4.3).
 *
 * Consumes a GitHub issue_comment event and enforces the mutual-confirmation
 * ceremony:
 *
 *   /link   -> both parties confirm -> entry appended to links.json
 *   /unlink -> both parties confirm -> entry moved to links-archive.json
 *
 * Idempotency: processed comment ids are recorded in
 * scripts/state/links-state.json so retries never double-process.
 *
 * Usage (inside GitHub Actions):
 *   node scripts/links.js
 *
 * Environment:
 *   GITHUB_EVENT_PATH   path to the issue_comment payload (Actions-provided)
 *   GITHUB_TOKEN        token with issues:write scope
 *   GITHUB_REPOSITORY   owner/repo (Actions-provided)
 *
 * Local testing:
 *   GITHUB_EVENT_PATH=event.json GITHUB_TOKEN=... GITHUB_REPOSITORY=o/r \
 *     node scripts/links.js
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { loadJson } = require("./lib/validate.js");

const REPO_ROOT = path.join(__dirname, "..");
const STATE_DIR = path.join(__dirname, "state");
const STATE_FILE = path.join(STATE_DIR, "links-state.json");
const LINKS_FILE = path.join(REPO_ROOT, "links.json");
const ARCHIVE_FILE = path.join(REPO_ROOT, "links-archive.json");

const API_BASE = "https://api.github.com";

function readJson(file, fallback) {
  return fs.existsSync(file) ? loadJson(file) : fallback;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

async function api(url, token, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "make-friends-link-processor",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function postComment(repo, issueNumber, body, token) {
  return api(`${API_BASE}/repos/${repo}/issues/${issueNumber}/comments`, token, "POST", { body });
}

/** Canonical link object with a < b ordering (Protocol-SPEC §4.3 rule 5). */
function makeLink(a, b, issueUrl, createdAt) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return { a: x, b: y, createdAt, issueUrl };
}

function linkKey(link) {
  return `${link.a}::${link.b}`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!repo || !eventPath) {
    console.error("error: GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required");
    process.exit(2);
  }
  const localMode = !token; // without a token: update state files only, print the reply

  const event = readJson(eventPath, {});
  if (event.action !== "created") {
    console.log("skip: not a comment-created event");
    return;
  }

  const issue = event.issue || {};
  const comment = event.comment || {};
  if (!/^\[ping\] /i.test(issue.title || "")) {
    console.log(`skip: issue #${issue.number} is not a ping issue`);
    return;
  }
  if (!comment.body || !comment.user || !comment.user.login) return;

  const command = (comment.body.trim().match(/^\/(link|unlink)$/i) || [])[1];
  if (!command) {
    console.log("skip: no /link or /unlink command in comment");
    return;
  }

  const issueNumber = issue.number;
  const commenter = comment.user.login;
  const issueCreator = (issue.user || {}).login;
  const issueUrl = issue.html_url || `https://github.com/${repo}/issues/${issueNumber}`;
  const now = new Date().toISOString();

  // --- state ----------------------------------------------------------------
  const state = readJson(STATE_FILE, { confirmations: {}, processedComments: [] });
  if (state.processedComments.includes(comment.id)) {
    console.log(`skip: comment ${comment.id} already processed`);
    return;
  }
  state.processedComments.push(comment.id);

  const links = readJson(LINKS_FILE, { linksVersion: 1, links: [] });
  const archive = readJson(ARCHIVE_FILE, { linksVersion: 1, links: [] });
  const linksByKey = new Map(links.links.map((l) => [linkKey(l), l]));

  // --- confirmations --------------------------------------------------------
  const key = String(issueNumber);
  state.confirmations[key] = state.confirmations[key] || {};
  state.confirmations[key][command] = state.confirmations[key][command] || {};
  state.confirmations[key][command][commenter] = { at: now };

  const confirmers = Object.keys(state.confirmations[key][command] || {});
  const bothConfirmed = confirmers.includes(issueCreator) && confirmers.length >= 2;

  let reply = null;
  if (!bothConfirmed) {
    reply =
      `:link: ${commenter} confirmed \`/${command}\`. ` +
      (issueCreator && !confirmers.includes(issueCreator)
        ? `${issueCreator}, reply \`/${command}\` to confirm.`
        : "Waiting for the other side to confirm.");
  } else if (command === "link") {
    const entry = makeLink(issueCreator, commenter, issueUrl, now);
    linksByKey.set(linkKey(entry), entry);
    delete state.confirmations[key];
    reply =
      `Friendship merged: ${entry.a} and ${entry.b} are now linked. ` +
      `See the graph at https://make-friends-globally.github.io/make-friends/graph/`;
  } else {
    // /unlink
    const entry = makeLink(issueCreator, commenter, issueUrl, now);
    const removed = linksByKey.get(linkKey(entry));
    if (removed) {
      linksByKey.delete(linkKey(entry));
      archive.links.push({ ...removed, archivedAt: now });
    }
    delete state.confirmations[key];
    reply = `This link was archived on ${now.slice(0, 10)} (removal confirmed by both sides).`;
  }

  // --- persist ---------------------------------------------------------------
  links.links = [...linksByKey.values()].sort((x, y) =>
    x.a === y.a ? (x.b < y.b ? -1 : 1) : x.a < y.a ? -1 : 1
  );
  writeJson(LINKS_FILE, links);
  writeJson(ARCHIVE_FILE, archive);
  writeJson(STATE_FILE, state);

  if (reply) {
    if (localMode) {
      console.log(`[local] would comment on #${issueNumber}: ${reply}`);
    } else {
      await postComment(repo, issueNumber, reply, token);
    }
  }

  console.log(`ok: ${command} processed for issue #${issueNumber} (confirmed: ${bothConfirmed})`);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
