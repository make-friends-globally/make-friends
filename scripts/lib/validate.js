/**
 * make-friends zero-dependency validator.
 *
 * Implements the subset of JSON Schema draft-07 used by profile.schema.json
 * (required, type, const, enum, pattern, min/maxLength, min/maxItems,
 * uniqueItems, additionalProperties, local $ref to #/definitions/*) plus the
 * content rule engine defined in scripts/rules.json (Architecture §7.2).
 *
 * Usage:
 *   const { validateProfile } = require("./lib/validate.js");
 *   const report = validateProfile(profileObject);
 *   // report = { valid: boolean, errors: [{ path, rule, message }] }
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const RULES_PATH = path.join(__dirname, "..", "rules.json");
const SCHEMA_PATH = path.join(__dirname, "..", "..", "profile.schema.json");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Resolve a local $ref like "#/definitions/language" against a schema. */
function resolveRef(ref, schema) {
  if (!ref.startsWith("#/")) return null;
  const parts = ref.slice(2).split("/").map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let node = schema;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return null;
    node = node[part];
  }
  return node;
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Validate a single value against one schema node. Returns array of errors. */
function checkNode(value, node, schema, pathStr, errors) {
  if (node === true || node === undefined) return;
  if (node === false) {
    errors.push({ path: pathStr, rule: "schema", message: "value is forbidden" });
    return;
  }

  if (node.const !== undefined && value !== node.const) {
    errors.push({ path: pathStr, rule: "const", message: `expected ${JSON.stringify(node.const)}` });
  }

  if (node.type !== undefined) {
    const t = typeOf(value);
    const expected = Array.isArray(node.type) ? node.type : [node.type];
    if (!expected.includes(t)) {
      errors.push({ path: pathStr, rule: "type", message: `expected ${expected.join("|")}, got ${t}` });
      return;
    }
  }

  if (node.enum !== undefined && !node.enum.includes(value)) {
    errors.push({ path: pathStr, rule: "enum", message: `must be one of ${JSON.stringify(node.enum)}` });
  }

  if (typeof value === "string") {
    if (node.pattern !== undefined && !new RegExp(node.pattern).test(value)) {
      errors.push({ path: pathStr, rule: "pattern", message: `does not match ${node.pattern}` });
    }
    if (node.minLength !== undefined && value.length < node.minLength) {
      errors.push({ path: pathStr, rule: "minLength", message: `shorter than ${node.minLength}` });
    }
    if (node.maxLength !== undefined && value.length > node.maxLength) {
      errors.push({ path: pathStr, rule: "maxLength", message: `longer than ${node.maxLength}` });
    }
  }

  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) {
      errors.push({ path: pathStr, rule: "minItems", message: `fewer than ${node.minItems} items` });
    }
    if (node.maxItems !== undefined && value.length > node.maxItems) {
      errors.push({ path: pathStr, rule: "maxItems", message: `more than ${node.maxItems} items` });
    }
    if (node.uniqueItems === true) {
      const seen = new Set();
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          errors.push({ path: pathStr, rule: "uniqueItems", message: `duplicate item ${key}` });
          break;
        }
        seen.add(key);
      }
    }
    if (node.items !== undefined && node.items !== true) {
      const itemNode = node.items.$ref ? resolveRef(node.items.$ref, schema) : node.items;
      value.forEach((item, i) => checkNode(item, itemNode, schema, `${pathStr}[${i}]`, errors));
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (node.properties !== undefined) {
      for (const [key, propNode] of Object.entries(node.properties)) {
        if (value[key] !== undefined) {
          const child = propNode.$ref ? resolveRef(propNode.$ref, schema) : propNode;
          checkNode(value[key], child, schema, pathStr ? `${pathStr}.${key}` : key, errors);
        }
      }
    }
    if (node.additionalProperties === false && node.properties !== undefined) {
      for (const key of Object.keys(value)) {
        if (!(key in node.properties)) {
          errors.push({ path: pathStr ? `${pathStr}.${key}` : key, rule: "additionalProperties", message: `unknown property "${key}"` });
        }
      }
    }
  }
}

/** Validate a profile against the published schema. */
function validateSchema(profile, schema) {
  const errors = [];
  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
    return { valid: false, errors: [{ path: "$", rule: "type", message: "profile must be a JSON object" }] };
  }
  for (const required of schema.required || []) {
    if (profile[required] === undefined) {
      errors.push({ path: required, rule: "required", message: `missing required property "${required}"` });
    }
  }
  checkNode(profile, schema, schema, "", errors);
  return { valid: errors.length === 0, errors };
}

/** Flatten a profile into all string values (for wildcard rules). */
function flattenStrings(profile) {
  const out = [];
  const walk = (value, key) => {
    if (typeof value === "string") out.push({ key, value });
    else if (Array.isArray(value)) value.forEach((v) => walk(v, key));
    else if (value !== null && typeof value === "object")
      Object.entries(value).forEach(([k, v]) => walk(v, k));
  };
  walk(profile, "");
  return out;
}

/** Apply the content rule engine (scripts/rules.json). */
function applyContentRules(profile, rules) {
  const errors = [];
  const flatten = (value, key) => {
    if (typeof value === "string") return [{ key, value }];
    if (Array.isArray(value)) return value.flatMap((v) => flatten(v, key));
    if (value !== null && typeof value === "object")
      return Object.entries(value).flatMap(([k, v]) => flatten(v, k));
    return [];
  };
  const strings = flatten(profile, "");

  for (const rule of rules) {
    if (rule.id === "duplicate-content") continue; // handled by the crawler
    switch (rule.kind) {
      case "presence": {
        if (rule.id === "min-bio-or-structured") {
          const required = new Set(["protocolVersion", "name", "timezone", "lookingFor", "interests"]);
          const structured = Object.keys(profile).filter((k) => !required.has(k));
          if (structured.length === 0 && !profile.bio) {
            errors.push({ path: "$", rule: rule.id, message: "no structured fields beyond the required set and no bio" });
          }
        }
        break;
      }
      case "count": {
        const value = profile[rule.field];
        if (Array.isArray(value) && value.length > rule.max) {
          errors.push({ path: rule.field, rule: rule.id, message: `more than ${rule.max} items` });
        }
        break;
      }
      case "regex": {
        const re = new RegExp(rule.pattern, rule.flags || "");
        const targets = rule.field === "*" ? strings : flatten(profile[rule.field], rule.field);
        for (const { key, value } of targets) {
          if (re.test(value)) {
            errors.push({ path: key || rule.field, rule: rule.id, message: `matches forbidden pattern ${rule.pattern}` });
          }
        }
        break;
      }
      case "url": {
        const urls = Array.isArray(profile[rule.field]) ? profile[rule.field] : [];
        for (const url of urls) {
          let host = "";
          try {
            host = new URL(url).hostname.toLowerCase();
          } catch {
            errors.push({ path: rule.field, rule: rule.id, message: `invalid URL ${url}` });
            continue;
          }
          if ((rule.blocklist || []).some((d) => host === d || host.endsWith(`.${d}`))) {
            errors.push({ path: rule.field, rule: rule.id, message: `blocklisted domain ${host}` });
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return errors;
}

/** Content hash used by the crawler for duplicate detection. */
function contentHash(profile) {
  const canonical = JSON.stringify(profile, Object.keys(profile).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/** Full validation: schema + content rules. */
function validateProfile(profile, options = {}) {
  const schema = options.schema || loadJson(SCHEMA_PATH);
  const rules = options.rules || loadJson(RULES_PATH).rules;
  const report = validateSchema(profile, schema);
  const ruleErrors = applyContentRules(profile, rules);
  const errors = [...report.errors, ...ruleErrors];
  return { valid: errors.length === 0, errors, hash: contentHash(profile) };
}

module.exports = { validateProfile, validateSchema, applyContentRules, contentHash, loadJson };
