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

const CONVERSATION_FACES = "src/components/social/social-conversation-faces.tsx";
const AVATAR = "src/components/social/social-avatar.tsx";
/** Home-feed Mux, immersive, and the sheets the post card must not import statically. */
const FEED_HEAVY = [
  "src/components/social/social-post-media.tsx",
  "src/components/social/social-feed-carousel.tsx",
  "src/components/social/social-feed-immersive.tsx",
  "src/components/social/social-feed-video.tsx",
  "src/components/social/social-mux-player.tsx",
  "src/components/social/social-mux-player-mount.tsx",
  "src/components/social/social-comment-thread.tsx",
  // The comments window and its parts ride in the thread's lazy chunk
  // (social-comments-window-lock-v1).
  "src/components/social/social-comments-window.tsx",
  "src/components/social/social-comment-row.tsx",
  "src/components/social/use-social-comment-thread.ts",
  "src/components/social/social-post-share-sheet.tsx",
] as const;

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
  it("does not keep a client social-ui barrel", () => {
    expect(existsSync(join(ROOT, "src/components/social/social-ui.tsx"))).toBe(false);
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
      expect(hits(files, FEED_HEAVY), entry).toEqual([]);
    }
    expect(closure("src/app/(app)/social/dms/page.tsx").has(CONVERSATION_FACES)).toBe(true);
    expect(closure("src/app/(app)/social/leaderboard/page.tsx").has(AVATAR)).toBe(true);
    expect(readFileSync(join(ROOT, "src/app/(app)/social/leaderboard/page.tsx"), "utf8")).toContain(
      'from "@/components/social/social-avatar"',
    );
    expect(readFileSync(join(ROOT, CONVERSATION_FACES), "utf8")).toContain('from "./social-avatar"');
  });

  it("keeps Home on the post card and off the Mux and profile faces", () => {
    const home = closure("src/app/(app)/social/page.tsx");
    expect(home.has("src/components/social/social-post-card.tsx")).toBe(true);
    expect(hits(home, PROFILE_FACE)).toEqual([]);
    expect(hits(home, FEED_HEAVY)).toEqual([]);
    expect(home.has(CONVERSATION_FACES)).toBe(false);
  });

  it("keeps profile, activity, and identity off the Home-feed Mux graph", () => {
    for (const entry of [
      "src/app/(app)/social/profile/page.tsx",
      "src/app/(app)/social/u/[handle]/page.tsx",
      "src/components/social/social-activity-history.tsx",
      "src/components/social/social-profile-identity.tsx",
    ]) {
      expect(hits(closure(entry), FEED_HEAVY), entry).toEqual([]);
    }
    const identity = closure("src/components/social/social-profile-identity.tsx");
    expect(identity.has(AVATAR)).toBe(true);
    expect(hits(identity, POST_UI)).toEqual([]);
    expect(readFileSync(join(ROOT, "src/components/social/social-profile-identity.tsx"), "utf8")).toContain(
      'from "./social-avatar"',
    );
    const activity = closure("src/components/social/social-activity-history.tsx");
    expect(activity.has("src/components/social/social-post-card.tsx")).toBe(true);
  });

  it("keeps profile routes on the faces they render, not the DM faces", () => {
    for (const entry of [
      "src/app/(app)/social/profile/page.tsx",
      "src/app/(app)/social/u/[handle]/page.tsx",
    ]) {
      const files = closure(entry);
      expect(files.has("src/components/social/social-profile-identity.tsx"), entry).toBe(true);
      expect(files.has("src/components/social/social-post-card.tsx"), entry).toBe(true);
      expect(files.has(CONVERSATION_FACES), entry).toBe(false);
    }
    const own = closure("src/components/social/social-own-profile.tsx");
    expect(own.has("src/components/social/social-profile-identity.tsx")).toBe(true);
    expect(hits(own, POST_UI)).toEqual([]);
    expect(hits(own, FEED_HEAVY)).toEqual([]);
  });

  it("lazy-loads immersive, media, comments, and share from the post card", () => {
    const card = readFileSync(join(ROOT, "src/components/social/social-post-card.tsx"), "utf8");
    const trigger = readFileSync(join(ROOT, "src/components/social/social-comment-trigger.tsx"), "utf8");
    const share = readFileSync(join(ROOT, "src/components/social/social-post-share-button.tsx"), "utf8");
    for (const heavy of [
      "social-post-media",
      "social-feed-immersive",
      "social-feed-carousel",
      "social-feed-video",
      "social-comment-thread",
      "social-post-share-sheet",
      "social-mux-player",
    ]) {
      expect(card, heavy).not.toMatch(new RegExp(`from ["'][^"']*${heavy}["']`));
    }
    expect(card).toContain('import("./social-post-media")');
    expect(card).toContain('import("./social-feed-immersive")');
    expect(card).toContain('from "./social-avatar"');
    expect(card).toContain('from "./social-comment-trigger"');
    expect(card).toContain('from "./social-post-share-button"');
    expect(trigger).toContain('import("./social-comment-thread")');
    expect(trigger).not.toMatch(/from ["'][^"']*social-comment-thread["']/);
    expect(share).toContain('import("./social-post-share-sheet")');
    expect(share).not.toMatch(/from ["'][^"']*social-post-share-sheet["']/);
    expect(hits(closure("src/components/social/social-post-card.tsx"), FEED_HEAVY)).toEqual([]);
    const explore = closure("src/app/(app)/social/explore/page.tsx");
    expect(explore.has("src/components/social/social-mux-player.tsx")).toBe(true);
  });

  // Edit caption (social-post-caption-window-lock-v1): one host on the Social
  // layout loads the window on first use; the card and its ⋯ only reach the
  // host through a context module.
  it("keeps the caption window off the layout, the card and the owner menu", () => {
    const CAPTION_WINDOW = "src/components/social/social-post-caption-window.tsx";
    const CAPTION_HOST = "src/components/social/social-post-caption-host.tsx";
    const layout = closure("src/app/(app)/social/layout.tsx");
    const card = closure("src/components/social/social-post-card.tsx");
    const owner = closure("src/components/social/social-post-owner.tsx");
    expect(layout.has(CAPTION_HOST)).toBe(true);
    for (const [entry, files] of [
      ["layout", layout],
      ["card", card],
      ["owner", owner],
    ] as const) {
      expect(files.has(CAPTION_WINDOW), entry).toBe(false);
      expect(hits(files, FEED_HEAVY), entry).toEqual([]);
    }
    expect(card.has(CAPTION_HOST)).toBe(false);
    expect(owner.has(CAPTION_HOST)).toBe(false);
  });

  // A post's ⋯ (social-post-owner-menu-lock-v1): the card carries the sheet
  // and the house ask, never the 600-line window shell.
  it("keeps the owner menu on the ask's own module, off the window shell", () => {
    const owner = closure("src/components/social/social-post-owner.tsx");
    expect(owner.has("src/components/chrome/house-window-ask.tsx")).toBe(true);
    expect(owner.has("src/components/social/social-post-owner-sheet.tsx")).toBe(true);
    expect(owner.has("src/components/chrome/house-window.tsx")).toBe(false);
    expect(owner.has("src/components/social/social-post-caption-window.tsx")).toBe(false);
    expect(owner.has("src/components/social/social-post-caption-host.tsx")).toBe(false);
    expect(hits(owner, FEED_HEAVY)).toEqual([]);
  });
});
