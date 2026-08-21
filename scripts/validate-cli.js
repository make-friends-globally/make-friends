#!/usr/bin/env node
/**
 * make-friends CLI validator entry point.
 *
 * Usage:
 *   node scripts/validate-cli.js <profile.json> [--json]
 *
 * Exit codes:
 *   0 — valid
 *   1 — validation failed
 *   2 — usage / IO error
 */

"use strict";

const fs = require("node:fs");
const { validateProfile } = require("./lib/validate.js");

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const fileArg = args.find((a) => !a.startsWith("--"));

  if (!fileArg) {
    console.error("usage: node scripts/validate-cli.js <profile.json> [--json]");
    process.exit(2);
  }

  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(fileArg, "utf8"));
  } catch (err) {
    console.error(`error: cannot read or parse ${fileArg}: ${err.message}`);
    process.exit(2);
  }

  const report = validateProfile(profile);

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.valid) {
    console.log(`ok: ${fileArg} is valid (hash ${report.hash.slice(0, 12)})`);
  } else {
    console.error(`fail: ${fileArg} has ${report.errors.length} issue(s):`);
    for (const err of report.errors) {
      console.error(`  - [${err.rule}] ${err.path || "$"}: ${err.message}`);
    }
  }
  process.exit(report.valid ? 0 : 1);
}

main();
