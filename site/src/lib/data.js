// Build-time data loading (Astro SSG, Node environment).
// Reads the generated central data files at the repo root.
import { readFileSync } from "node:fs";

const ROOT = new URL("../../../", import.meta.url);

function loadJson(relPath, fallback) {
  try {
    return JSON.parse(readFileSync(new URL(relPath, ROOT), "utf-8"));
  } catch {
    return fallback;
  }
}

export const index = loadJson("index.json", { indexVersion: 1, members: [] });
export const links = loadJson("links.json", { linksVersion: 1, links: [] });
export const denylist = loadJson("denylist.json", { denylistVersion: 1, entries: [] });

/** Members eligible for rendering: valid and not denylisted. */
export function activeMembers() {
  const denied = new Set((denylist.entries || []).map((e) => e.username));
  return (index.members || [])
    .filter((m) => m.valid === true && !denied.has(m.username))
    .sort((a, b) => (a.username < b.username ? -1 : 1));
}

/** Friendship adjacency list (username -> Set of usernames). */
export function adjacency() {
  const adj = new Map();
  for (const l of links.links || []) {
    if (!adj.has(l.a)) adj.set(l.a, new Set());
    if (!adj.has(l.b)) adj.set(l.b, new Set());
    adj.get(l.a).add(l.b);
    adj.get(l.b).add(l.a);
  }
  return adj;
}

/** Stable color per lookingFor value (UX §2.1: consistent mapping everywhere).
 *  Keys match profile.schema.json lookingFor enum exactly. */
export const LOOKING_FOR_COLORS = {
  "language-partner": "#3b82f6",
  collaborator: "#f59e0b",
  mentor: "#10b981",
  mentee: "#8b5cf6",
  "local-friend": "#ec4899",
  cofounder: "#ef4444",
  chat: "#06b6d4",
};

export function purposeColor(value) {
  return LOOKING_FOR_COLORS[value] || "#64748b";
}

/** Fetch remote profile content at build time (raw.githubusercontent.com).
 *  Async on purpose: SSG renders with top-level await in page frontmatter.
 *  A single failing repo must never block the build (NFR-07) — returns null. */
export async function fetchProfile(repo, profilePath) {
  const url = `https://raw.githubusercontent.com/${repo}/HEAD/${profilePath || "make-friends/profile.json"}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}
