import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { build, type BuildResult } from "esbuild";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DOCKERFILE = readFileSync(`${ROOT}workers/social-music/Dockerfile`, "utf8");
const ESBUILD_COMMAND =
  "pnpm exec esbuild workers/social-music/handler.ts --bundle --platform=node --format=cjs " +
  "--target=node22 --conditions=react-server --outfile=/out/index.js";
const MAX_BUNDLE_BYTES = 15 * 1024 * 1024;
const OUT_DIR = `${ROOT}node_modules/.cache/social-music-bundle`;
const OUT_FILE = `${OUT_DIR}/index.js`;

let result: BuildResult<{ metafile: true; write: false }>;

beforeAll(async () => {
  result = await build({
    absWorkingDir: ROOT,
    entryPoints: ["workers/social-music/handler.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    conditions: ["react-server"],
    outfile: OUT_FILE,
    metafile: true,
    write: false,
  });
}, 120_000);

describe("social music Lambda bundle", () => {
  it("is built with the Dockerfile's esbuild command", () => {
    expect(DOCKERFILE.replace(/\s*\\\r?\n\s*/g, " ")).toContain(ESBUILD_COMMAND);
  });

  it("needs only files the image copies in", () => {
    const copied = [...DOCKERFILE.matchAll(/^COPY (?!--from)(.+) \S+$/gm)].flatMap((match) =>
      match[1].split(" "),
    );
    const missing = Object.keys(result.metafile.inputs).filter(
      (input) =>
        !input.startsWith("node_modules/") &&
        (/\.test\.tsx?$/.test(input) || !copied.some((path) => input === path || input.startsWith(`${path}/`))),
    );
    expect(missing).toEqual([]);
  });

  it("stays a sane size", () => {
    expect(result.outputFiles[0]?.contents.byteLength).toBeLessThan(MAX_BUNDLE_BYTES);
  });

  it("loads and exports the handler", () => {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, result.outputFiles[0]!.contents);
    const nodeRequire = createRequire(import.meta.url);
    delete nodeRequire.cache[OUT_FILE];
    expect(typeof nodeRequire(OUT_FILE).handler).toBe("function");
  }, 60_000);
});
