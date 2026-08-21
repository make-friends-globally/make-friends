#!/usr/bin/env node
/**
 * make-friends index crawler (Architecture §3.1, Protocol-SPEC §3.4).
 *
 * Fetches every member's profile from their own repository, validates it
 * against profile.schema.json + content rules, and regenerates index.json.
 *
 * Behavior:
 *   - 404 on the profile path  -> entry marked removed (dropped next run)
 *   - 403 / network failure    -> entry skipped with a note (failure isolation)
 *   - denylisted members       -> excluded from rendering, skipped
 *   - profile hash unchanged   -> entry untouched (cheap incremental crawl)
 *
 * Usage:
 *   node scripts/crawl.js [--dry-run] [--index-path index.json]
 *
 * Environment:
 *   GITHUB_TOKEN   optional; raises raw.githubusercontent.com rate limits
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateProfile, contentHash, loadJson } = require("./lib/validate.js");

const REPO_ROOT = path.join(__dirname, "..");
const RAW_BASE = "https://raw.githubusercontent.com";

function usage() {
  console.error("usage: node scripts/crawl.js [--dry-run] [--index-path index.json]");
  process.exit(2);
}

async function fetchRaw(repo, profilePath, token) {
  const url = `${RAW_BASE}/${repo}/HEAD/${profilePath}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { headers });
  if (res.status === 404) return { status: 404, body: null };
  if (res.status === 403) return { status: 403, body: null };
  if (!res.ok) return { status: res.status, body: null };
  return { status: 200, body: await res.text() };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const indexArg = args.find((a) => a.startsWith("--index-path="));
  const indexPath = indexArg ? indexArg.split("=")[1] : path.join(REPO_ROOT, "index.json");
  if (args.some((a) => !["--dry-run"].includes(a) && !a.startsWith("--index-path="))) usage();

  if (!fs.existsSync(indexPath)) {
    console.error(`error: ${indexPath} not found; create it first (see requests/new-member.md)`);
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN || "";
  const index = loadJson(indexPath);
  const schema = loadJson(path.join(REPO_ROOT, "profile.schema.json"));
  const rules = loadJson(path.join(REPO_ROOT, "scripts", "rules.json")).rules;
  const deny = fs.existsSync(path.join(REPO_ROOT, "denylist.json"))
    ? new Set((loadJson(path.join(REPO_ROOT, "denylist.json")).entries || []).map((e) => e.username))
    : new Set();

  const now = new Date().toISOString();
  const stats = { total: 0, ok: 0, failed: 0, removed: 0, skipped: 0, denied: 0 };
  const next = { ...index, indexVersion: index.indexVersion || 1, generatedAt: now, members: [] };

  for (const member of index.members || []) {
    stats.total += 1;
    if (deny.has(member.username)) {
      stats.denied += 1;
      continue; // denylisted: excluded from rendering entirely
    }

    let fetched;
    try {
      fetched = await fetchRaw(member.repo, member.profilePath || "make-friends/profile.json", token);
    } catch (err) {
      stats.skipped += 1;
      next.members.push({ ...member, valid: false, lastValidationError: `network error: ${err.message}` });
      continue;
    }

    if (fetched.status === 404) {
      stats.removed += 1;
      continue; // profile deleted or repo gone: drop the entry
    }
    if (fetched.status !== 200) {
      stats.skipped += 1;
      next.members.push({ ...member, valid: false, lastValidationError: `fetch status ${fetched.status}` });
      continue;
    }

    let profile;
    try {
      profile = JSON.parse(fetched.body);
    } catch (err) {
      stats.failed += 1;
      next.members.push({ ...member, valid: false, lastValidationError: `invalid JSON: ${err.message}` });
      continue;
    }

    const report = validateProfile(profile, { schema, rules });
    const hash = report.hash;

    if (!report.valid) {
      stats.failed += 1;
      next.members.push({
        ...member,
        valid: false,
        lastValidationError: report.errors.map((e) => `[${e.rule}] ${e.path || "$"}: ${e.message}`).join("; "),
      });
      continue;
    }

    // Incremental: unchanged content keeps the original timestamps.
    const unchanged = member.valid === true && member.hash === hash;
    stats.ok += 1;
    next.members.push({
      ...member,
      valid: true,
      hash,
      lastValidationError: null,
      updatedAt: unchanged ? member.updatedAt : now,
      addedAt: member.addedAt || now,
    });
  }

  next.members.sort((a, b) => (a.username < b.username ? -1 : 1));

  if (dryRun) {
    console.log(JSON.stringify({ stats, next }, null, 2));
    return;
  }
  fs.writeFileSync(indexPath, JSON.stringify(next, null, 2) + "\n");
  console.log(`crawl complete: ${JSON.stringify(stats)} -> ${indexPath}`);
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
