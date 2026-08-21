#!/usr/bin/env node
/**
 * Renders a validation-regression report from index.json (crawl output).
 * Used by crawl.yml to open a "[validation]" issue after each crawl.
 *
 * Usage:
 *   node scripts/report-validation.js [--index-path index.json]
 *   (writes the markdown report to stdout)
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const indexPath = process.argv.includes("--index-path")
  ? process.argv[process.argv.indexOf("--index-path") + 1]
  : path.join(__dirname, "..", "index.json");

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const invalid = (index.members || []).filter((m) => !m.valid && m.lastValidationError);
const removed = (index.members || []).filter((m) => !m.valid && !m.lastValidationError);

const lines = [];
lines.push("## make-friends crawl validation report");
lines.push("");
lines.push(`- Generated: ${index.generatedAt || "unknown"}`);
lines.push(`- Members: ${(index.members || []).length}`);
lines.push(`- Invalid entries: ${invalid.length}`);
lines.push("");
if (invalid.length > 0) {
  lines.push("### Profiles needing fixes");
  lines.push("");
  for (const m of invalid) {
    lines.push(`- [ ] @${m.username} (${m.repo})`);
    lines.push(`  - ${m.lastValidationError}`);
  }
  lines.push("");
}
if (removed.length > 0) {
  lines.push("### Profiles removed at the last crawl");
  lines.push("");
  for (const m of removed) lines.push(`- ${m.username} (${m.repo})`);
  lines.push("");
}
if (invalid.length === 0 && removed.length === 0) {
  lines.push("All entries are valid. No action needed.");
  lines.push("");
}

process.stdout.write(lines.join("\n"));
