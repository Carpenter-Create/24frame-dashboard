import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const STUDIO = "src/components/social/social-story-studio.tsx";
const STORY_CREATE = "src/app/(app)/social/stories/new/page.tsx";
const SOCIAL_APP = "src/app/(app)/social";

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

/** Value import / re-export specifiers. `import type` and `export type` are erased. */
function valueSpecifiers(source: string, followDynamic = true): string[] {
  const text = stripComments(source);
  const specs: string[] = [];
  const fromRe = /\b(?:import|export)\s+(type\s+)?[^"'();]*?\sfrom\s+["']([^"']+)["']/g;
  const sideRe = /\bimport\s+["']([^"']+)["']/g;
  const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of text.matchAll(fromRe)) {
    if (match[1]) continue;
    if (match[2]) specs.push(match[2]);
  }
  for (const match of text.matchAll(sideRe)) {
    if (match[1]) specs.push(match[1]);
  }
  if (followDynamic) {
    for (const match of text.matchAll(dynRe)) {
      if (match[1]) specs.push(match[1]);
    }
  }
  return specs;
}

function resolveSpecifier(fromFile: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? join(ROOT, "src", spec.slice(2))
    : spec.startsWith(".")
      ? resolve(dirname(join(ROOT, fromFile)), spec)
      : null;
  if (!base) return null;
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate.slice(ROOT.length + 1);
    }
  }
  return null;
}

/** Shortest value-import path from entry to target, or null. */
function importPath(entry: string, target: string, followDynamic = true): string[] | null {
  const parents = new Map<string, string | null>();
  const queue = [entry];
  parents.set(entry, null);
  while (queue.length > 0) {
    const file = queue.shift();
    if (!file) break;
    if (file === target) {
      const path: string[] = [];
      let cursor: string | null = file;
      while (cursor) {
        path.push(cursor);
        cursor = parents.get(cursor) ?? null;
      }
      return path.reverse();
    }
    let source: string;
    try {
      source = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const spec of valueSpecifiers(source, followDynamic)) {
      const next = resolveSpecifier(file, spec);
      if (!next || parents.has(next)) continue;
      parents.set(next, file);
      queue.push(next);
    }
  }
  return null;
}

function socialRouteEntries(dir: string): string[] {
  const entries: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      entries.push(...socialRouteEntries(abs));
      continue;
    }
    if (name === "page.tsx" || name === "layout.tsx") {
      entries.push(abs.slice(ROOT.length + 1));
    }
  }
  return entries;
}

const SHARED_SHELL = ["src/app/layout.tsx", "src/app/(app)/layout.tsx"] as const;

const LIGHT_SURFACES = [
  "src/app/(app)/social/dms/[id]/page.tsx",
  "src/app/(app)/social/profile/page.tsx",
  "src/app/(app)/social/groups/page.tsx",
  "src/app/(app)/social/groups/new/page.tsx",
  "src/app/(app)/social/stories/[id]/page.tsx",
  "src/components/social/social-dm-compose.tsx",
  "src/components/social/social-profile-create-form.tsx",
  "src/components/social/social-bio-form.tsx",
  "src/components/social/social-group-forms.tsx",
  "src/components/social/social-story-reply.tsx",
  "src/components/social/social-message-button.tsx",
  "src/components/social/social-profile-photo-form.tsx",
] as const;

const HEAVY = [
  "src/components/social/social-create-compose.tsx",
  "src/lib/social-media-upload.ts",
  "src/lib/social-compose-video.ts",
  STUDIO,
] as const;

describe("social form surface boundary", () => {
  it("keeps Story studio off DM, Profile, and every other non-create Social route", () => {
    const routes = socialRouteEntries(join(ROOT, SOCIAL_APP)).filter((file) => file !== STORY_CREATE);
    expect(routes).toEqual(expect.arrayContaining([
      "src/app/(app)/social/dms/[id]/page.tsx",
      "src/app/(app)/social/profile/page.tsx",
      "src/app/(app)/social/layout.tsx",
    ]));
    const leaks = [...routes, ...SHARED_SHELL]
      .map((entry) => importPath(entry, STUDIO))
      .filter((path): path is string[] => path !== null)
      .map((path) => path.join(" -> "));
    expect(leaks).toEqual([]);
  });

  it("keeps Story create on the studio module", () => {
    const page = readFileSync(STORY_CREATE, "utf8");
    expect(page).toContain('import { SocialStoryCompose } from "@/components/social/social-story-studio"');
    expect(page).toContain("<SocialStoryCompose ");
    expect(existsSync(join(ROOT, "src/components/social/social-forms.tsx"))).toBe(false);
    const path = importPath(STORY_CREATE, STUDIO);
    expect(path).toEqual([STORY_CREATE, STUDIO]);
    expect(importPath(STORY_CREATE, "src/components/social/social-create-compose.tsx")).toBeNull();
  });

  it("keeps DM, profile-create, bio, group, and story-reply off the create and video-upload module", () => {
    // Static graph only. Welcome upload is a dynamic import, so the profile
    // page does not load that module up front. Story studio still follows
    // dynamic imports in the test above.
    const leaks = LIGHT_SURFACES.flatMap((entry) =>
      HEAVY.flatMap((target) => {
        const path = importPath(entry, target, false);
        return path ? [path.join(" -> ")] : [];
      }),
    );
    expect(leaks).toEqual([]);
    const welcome = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
    const pick = welcome.slice(welcome.indexOf("async function onWelcomePick"), welcome.indexOf("async function onWelcomeRemove"));
    expect(pick).toContain('import("@/lib/social-media-upload")');
    expect(pick).not.toContain('from "@/lib/social-media-upload"');
    const dm = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    expect(dm).toContain('from "@/components/social/social-dm-compose"');
    expect(profile).toContain('from "@/components/social/social-profile-create-form"');
    expect(importPath("src/components/social/social-create-compose.tsx", STUDIO)).toBeNull();
    expect(importPath("src/app/(app)/social/create/page.tsx", "src/components/social/social-create-compose.tsx")).toEqual([
      "src/app/(app)/social/create/page.tsx",
      "src/components/social/social-create-compose.tsx",
    ]);
  });
});
