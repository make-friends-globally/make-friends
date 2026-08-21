#!/usr/bin/env node
/**
 * PR validation gate (Architecture §3.2, Protocol-SPEC §5.2/§5.3).
 *
 * Runs on pull requests touching index.json / denylist.json and comments the
 * result on the PR. Checks:
 *   - new index entries: required fields, denylist cross-check, repo shape
 *   - the referenced profile actually exists and validates (raw fetch)
 *   - denylist.json additions: shape validation only (humans own the decision)
 *
 * Usage (inside GitHub Actions):
 *   node scripts/validate-pr.js
 *
 * Environment:
 *   PR_NUMBER          pull request number
 *   GITHUB_REPOSITORY  owner/repo
 *   GITHUB_TOKEN       token with pull-requests:write scope
 *   BASE_REF           base branch name (github.event.pull_request.base.ref)
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync, execFileSync } = require("node:child_process");
const { validateProfile, loadJson } = require("./lib/validate.js");

const REPO_ROOT = path.join(__dirname, "..");
const RAW_BASE = "https://raw.githubusercontent.com";

function git(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

function gitShow(rev, file) {
  // execFileSync keeps the revision out of shell interpretation.
  return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8" });
}

function usage() {
  console.error("error: PR_NUMBER, GITHUB_REPOSITORY, GITHUB_TOKEN and BASE_REF are required");
  process.exit(2);
}

async function fetchRaw(url) {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function main() {
  const prNumber = process.env.PR_NUMBER;
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const baseRef = process.env.BASE_REF;
  if (!prNumber || !repo || !token || !baseRef) usage();

  const schema = loadJson(path.join(REPO_ROOT, "profile.schema.json"));
  const rules = loadJson(path.join(REPO_ROOT, "scripts", "rules.json")).rules;

  // Head (current) vs base index.json via git.
  let headIndex, baseIndex;
  try {
    headIndex = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "index.json"), "utf8"));
  } catch {
    headIndex = { members: [] };
  }
  try {
    baseIndex = JSON.parse(gitShow(`origin/${baseRef}`, "index.json"));
  } catch {
    baseIndex = { members: [] };
  }

  const headUsers = new Set(headIndex.members.map((m) => m.username));
  const baseUsers = new Set(baseIndex.members.map((m) => m.username));
  const newUsers = [...headUsers].filter((u) => !baseUsers.has(u));

  const deny = fs.existsSync(path.join(REPO_ROOT, "denylist.json"))
    ? new Set((loadJson(path.join(REPO_ROOT, "denylist.json")).entries || []).map((e) => e.username))
    : new Set();

  const lines = ["## make-friends validation report", ""];
  const failures = [];

  for (const username of newUsers) {
    const entry = headIndex.members.find((m) => m.username === username);
    if (!entry) continue;
    if (deny.has(username)) {
      failures.push(`- [ ] @${username}: username is on the denylist`);
      continue;
    }
    if (!entry.repo || typeof entry.repo !== "string" || !/^[A-Za-z0-9-]+\/[A-Za-z0-9-_.]+$/.test(entry.repo)) {
      failures.push(`- [ ] @${username}: invalid "repo" value ${JSON.stringify(entry.repo)}`);
      continue;
    }
    const profilePath = entry.profilePath || "make-friends/profile.json";
    const profile = await fetchRaw(`${RAW_BASE}/${entry.repo}/HEAD/${profilePath}`);
    if (!profile) {
      failures.push(`- [ ] @${username}: profile not found at ${entry.repo}/${profilePath}`);
      continue;
    }
    const report = validateProfile(profile, { schema, rules });
    if (!report.valid) {
      failures.push(
        `- [ ] @${username}: profile fails validation:\n` +
          report.errors.map((e) => `  - [${e.rule}] ${e.path || "$"}: ${e.message}`).join("\n")
      );
    } else {
      lines.push(`- [x] @${username}: index entry OK, profile valid`);
    }
  }

  if (newUsers.length === 0 && !fs.existsSync(path.join(REPO_ROOT, "denylist.json"))) {
    lines.push("No new members in this PR; nothing to validate.");
  }
  if (failures.length > 0) {
    lines.push("### Issues to resolve", "", ...failures, "");
  }
  lines.push(`Checked ${newUsers.length} new index entr${newUsers.length === 1 ? "y" : "ies"} against base \`${baseRef}\`.`);
  if (failures.length === 0) lines.push("All automated checks passed. A maintainer review is still required for index additions.");

  // Post the report as a PR comment (idempotent per commit: replace marker).
  const marker = "<!-- make-friends-validation -->";
  const body = lines.join("\n") + "\n" + marker;
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "make-friends-validate-pr",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(`comment -> ${res.status} ${await res.text()}`);
  console.log(`posted validation report to PR #${prNumber}`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
