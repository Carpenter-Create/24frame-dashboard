import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { build, type BuildResult } from "esbuild";
import { beforeAll, describe, expect, it } from "vitest";

// Builds the topic tagging Lambda bundle the way workers/social-topic/Dockerfile
// does, so a bundle the image cannot build or load fails here, not at deploy.
// No Docker needed.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DOCKERFILE = readFileSync(`${ROOT}workers/social-topic/Dockerfile`, "utf8");
// The options below mirror this command; the first test keeps them in step.
const ESBUILD_COMMAND =
  "pnpm exec esbuild workers/social-topic/handler.ts --bundle --platform=node --format=cjs " +
  "--target=node22 --conditions=react-server --external:sharp --outfile=/out/index.js";
// About twice today's size (5 MB). A jump means something heavy got pulled in.
const MAX_BUNDLE_BYTES = 10 * 1024 * 1024;
// Inside node_modules so the bundle's require("sharp") resolves, as it does
// from the image's copied node_modules.
const OUT_DIR = `${ROOT}node_modules/.cache/social-topic-bundle`;
const OUT_FILE = `${OUT_DIR}/index.js`;

let result: BuildResult<{ metafile: true; write: false }>;

beforeAll(async () => {
  result = await build({
    absWorkingDir: ROOT,
    entryPoints: ["workers/social-topic/handler.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    conditions: ["react-server"],
    external: ["sharp"],
    outfile: OUT_FILE,
    metafile: true,
    write: false,
  });
}, 120_000);

describe("social topic Lambda bundle", () => {
  it("is built with the Dockerfile's esbuild command", () => {
    expect(DOCKERFILE.replace(/\s*\\\r?\n\s*/g, " ")).toContain(ESBUILD_COMMAND);
  });

  it("needs only files the image copies in", () => {
    // Every COPY source in the build stage: root files, src/lib, the worker.
    const copied = [...DOCKERFILE.matchAll(/^COPY (?!--from)(.+) \S+$/gm)].flatMap((m) => m[1].split(" "));
    const missing = Object.keys(result.metafile.inputs).filter(
      (input) =>
        !input.startsWith("node_modules/") &&
        // .dockerignore keeps test files out of the image.
        (/\.test\.tsx?$/.test(input) || !copied.some((path) => input === path || input.startsWith(`${path}/`))),
    );
    expect(missing).toEqual([]);
  });

  it("stays a sane size", () => {
    expect(result.outputFiles[0].contents.byteLength).toBeLessThan(MAX_BUNDLE_BYTES);
  });

  it("loads, sharp included, and exports the handler", () => {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_FILE, result.outputFiles[0].contents);
    const nodeRequire = createRequire(import.meta.url);
    delete nodeRequire.cache[OUT_FILE];
    expect(typeof nodeRequire(OUT_FILE).handler).toBe("function");
  }, 60_000);
});
