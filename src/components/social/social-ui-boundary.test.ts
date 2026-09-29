import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** Post chrome that used to ride along inside social-ui.tsx. */
const POST_UI = [
  "src/components/social/social-post-card.tsx",
  "src/components/social/social-feed-carousel.tsx",
  "src/components/social/social-feed-immersive.tsx",
  "src/components/social/social-feed-video.tsx",
  "src/components/social/social-comment-thread.tsx",
  "src/components/social/social-post-share-sheet.tsx",
  "src/components/social/social-post-owner.tsx",
] as const;

/** Profile face chrome that used to ride along inside the same barrel. */
const PROFILE_FACE = [
  "src/components/social/social-profile-identity.tsx",
  "src/components/social/social-profile-banner.tsx",
  "src/components/social/social-profile-stats.tsx",
  "src/components/social/social-profile-links.tsx",
  "src/components/social/social-highlights.tsx",
] as const;

const BARREL = "src/components/social/social-ui.tsx";
const CONVERSATION_FACES = "src/components/social/social-conversation-faces.tsx";

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}

function hasValueSpecifier(clause: string): boolean {
  const brace = clause.indexOf("{");
  const before = (brace === -1 ? clause : clause.slice(0, brace)).replace(/,$/, "").trim();
  if (before === "*") return true;
  if (before.length > 0 && before !== "type") return true;
  if (brace === -1) return !clause.startsWith("type");
  const named = clause.slice(brace + 1, clause.lastIndexOf("}"));
  return named
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => !part.startsWith("type "));
}

/** Value imports and value re-exports. Type-only edges are erased and do not pull UI. */
function valueSpecs(src: string): string[] {
  const text = stripComments(src);
  const specs: string[] = [];
  const fromRe = /(?:^|\n)\s*(import|export)\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = fromRe.exec(text))) {
    const clause = match[2].trim();
    if (clause.startsWith("type ") || clause.startsWith("type{")) continue;
    if (hasValueSpecifier(clause)) specs.push(match[3]);
  }
  const sideRe = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  while ((match = sideRe.exec(text))) specs.push(match[1]);
  return specs;
}

function resolveSpec(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = resolve(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function closure(entryRel: string): Set<string> {
  const seen = new Set<string>();
  const stack = [resolve(ROOT, entryRel)];
  while (stack.length > 0) {
    const file = stack.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const spec of valueSpecs(src)) {
      const next = resolveSpec(file, spec);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return new Set([...seen].map((file) => file.slice(ROOT.length + 1)));
}

function hits(files: Set<string>, banned: readonly string[]): string[] {
  return banned.filter((file) => files.has(file));
}

describe("social-ui import boundary", () => {
  it("keeps the client barrel from re-exporting UI modules", () => {
    const barrel = readFileSync(BARREL, "utf8");
    expect(barrel.startsWith('"use client"')).toBe(true);
    expect(barrel).toContain('export { socialAuthorPostCard } from "@/lib/social-author-post-card"');
    expect(hits(closure(BARREL), [...POST_UI, ...PROFILE_FACE])).toEqual([]);
  });

  it("keeps DM, For You, follows, and leaderboard off the post and profile faces", () => {
    const light = [
      "src/app/(app)/social/dms/page.tsx",
      "src/app/(app)/social/leaderboard/page.tsx",
      "src/components/social/social-for-you.tsx",
      "src/components/social/social-follows-list.tsx",
      "src/components/social/social-conversation-faces.tsx",
      "src/components/social/social-person-row.tsx",
    ];
    for (const entry of light) {
      const files = closure(entry);
      expect(hits(files, POST_UI), entry).toEqual([]);
      expect(hits(files, PROFILE_FACE), entry).toEqual([]);
      expect(files.has(BARREL), entry).toBe(false);
    }
    expect(closure("src/app/(app)/social/dms/page.tsx").has(CONVERSATION_FACES)).toBe(true);
  });

  it("keeps Home on the post card and off the profile face", () => {
    const home = closure("src/app/(app)/social/page.tsx");
    expect(home.has("src/components/social/social-post-card.tsx")).toBe(true);
    expect(hits(home, PROFILE_FACE)).toEqual([]);
    expect(home.has(BARREL)).toBe(false);
    expect(home.has(CONVERSATION_FACES)).toBe(false);
  });

  it("keeps profile routes on the faces they render, not the barrel or DM faces", () => {
    for (const entry of [
      "src/app/(app)/social/profile/page.tsx",
      "src/app/(app)/social/u/[handle]/page.tsx",
    ]) {
      const files = closure(entry);
      expect(files.has("src/components/social/social-profile-identity.tsx"), entry).toBe(true);
      expect(files.has("src/components/social/social-post-card.tsx"), entry).toBe(true);
      expect(files.has(BARREL), entry).toBe(false);
      expect(files.has(CONVERSATION_FACES), entry).toBe(false);
    }
    const own = closure("src/components/social/social-own-profile.tsx");
    expect(own.has("src/components/social/social-profile-identity.tsx")).toBe(true);
    expect(hits(own, POST_UI)).toEqual([]);
    expect(own.has(BARREL)).toBe(false);

    const identity = closure("src/components/social/social-profile-identity.tsx");
    expect(hits(identity, POST_UI)).toEqual([]);
    expect(identity.has(BARREL)).toBe(false);
  });
});
