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
function valueSpecifiers(source: string): string[] {
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
  for (const match of text.matchAll(dynRe)) {
    if (match[1]) specs.push(match[1]);
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
function importPath(entry: string, target: string): string[] | null {
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
    for (const spec of valueSpecifiers(source)) {
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

const SHARED_SHELL = [
  "src/app/layout.tsx",
  "src/app/(app)/layout.tsx",
  "src/components/social/social-forms.tsx",
] as const;

describe("social-forms Story studio boundary", () => {
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

  it("keeps Story create on the studio module, not the social-forms barrel", () => {
    const page = readFileSync(STORY_CREATE, "utf8");
    const forms = readFileSync("src/components/social/social-forms.tsx", "utf8");
    expect(page).toContain('import { SocialStoryCompose } from "@/components/social/social-story-studio"');
    expect(page).toContain("<SocialStoryCompose ");
    expect(forms).not.toContain("social-story-studio");
    expect(forms).not.toContain("SocialStoryCompose");
    const path = importPath(STORY_CREATE, STUDIO);
    expect(path).toEqual([STORY_CREATE, STUDIO]);
  });
});
