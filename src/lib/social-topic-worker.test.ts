import { readFileSync } from "node:fs";

import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social-topic-run", () => ({ runSocialTopicBatch: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ admin: true })) }));
vi.mock("@/lib/claude-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/claude-client")>();
  return { ...actual, createClaudeClient: vi.fn(actual.createClaudeClient) };
});
vi.mock("@/lib/s3-social-media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/s3-social-media")>()),
  readSocialMediaObjectFrom: vi.fn(),
}));

import { createClaudeClient } from "@/lib/claude-client";
import { readSocialMediaObjectFrom } from "@/lib/s3-social-media";
import { SOCIAL_TOPIC_FRAME_WIDTH, SOCIAL_TOPIC_LIVE_MEDIA_DEPS } from "@/lib/social-topic-media";
import { runSocialTopicBatch } from "@/lib/social-topic-run";
import { SOCIAL_TOPIC_MODEL_ID } from "@/lib/social-topic-tagging";
import { createAdminClient } from "@/lib/supabase/admin";

import { handler, SOCIAL_TOPIC_S3_REQUEST_HANDLER } from "../../workers/social-topic/handler";

const ENV = {
  CLAUDE_AWS_REGION: "us-west-2",
  CLAUDE_AWS_WORKSPACE_ID: "wrkspc_test",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.test",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  MEDIA_AWS_REGION: "us-east-1",
  S3_MEDIA_SOURCE_BUCKET: "media-bucket",
  MUX_TOKEN_ID: "mux-id",
  MUX_TOKEN_SECRET: "mux-secret",
  MUX_SIGNING_KEY: "mux-signing",
  MUX_PRIVATE_KEY: "mux-private",
};

const SUMMARY = {
  selected: 2,
  tagged: 1,
  declined: 1,
  wait: 0,
  raced: 0,
  unusable: 0,
  error: 0,
  deferred: 0,
};

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const IMAGE_KEY = `posts/${AUTHOR}/22222222-2222-4222-8222-222222222222.jpg`;
const VIDEO_KEY = `posts/${AUTHOR}/33333333-3333-4333-8333-333333333333.mp4`;
const PLAYBACK_ID = "playbackId0001";
const ASSET_ID = "assetId00000001";
const IMAGE_POST = { author_id: AUTHOR, media: [{ kind: "image", key: IMAGE_KEY, contentType: "image/jpeg" }] };
const VIDEO_POST = {
  author_id: AUTHOR,
  media: [
    {
      kind: "video",
      key: VIDEO_KEY,
      contentType: "video/mp4",
      provider: "mux",
      playbackId: PLAYBACK_ID,
      assetId: ASSET_ID,
    },
  ],
};

type Rows = { data: unknown[] | null; error: { message: string } | null };

/**
 * A posts table that answers by the jsonb needle: null for the plain read,
 * else the needle's JSON. Records every builder method called.
 */
function fakeAdmin(rowsFor: (needle: string | null) => Rows) {
  const calls: string[] = [];
  const admin = {
    from(table: string) {
      calls.push(`from:${table}`);
      let needle: string | null = null;
      const query: Record<string, unknown> = {
        then: (resolve: (rows: Rows) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(rowsFor(needle)).then(resolve, reject),
      };
      for (const method of ["select", "eq", "is", "order", "limit", "contains", "update", "insert", "upsert", "delete"]) {
        query[method] = (...args: unknown[]) => {
          calls.push(method);
          if (method === "contains") needle = String(args[1]);
          return query;
        };
      }
      return query;
    },
  };
  return { calls, admin: admin as unknown as ReturnType<typeof createAdminClient> };
}

function postsWithMedia(needle: string | null): Rows {
  if (needle === null) return { data: [{ author_id: AUTHOR, media: [] }], error: null };
  return { data: needle.includes('"video"') ? [VIDEO_POST] : [IMAGE_POST], error: null };
}

function dryRunDeps(rowsFor: (needle: string | null) => Rows = postsWithMedia) {
  const db = fakeAdmin(rowsFor);
  vi.mocked(createAdminClient).mockReturnValueOnce(db.admin);
  const create = vi.fn().mockResolvedValue({ stop_reason: "max_tokens", content: [] });
  vi.mocked(createClaudeClient).mockReturnValueOnce({ messages: { create } } as unknown as Anthropic);
  const retrieveAsset = vi.spyOn(SOCIAL_TOPIC_LIVE_MEDIA_DEPS, "retrieveAsset").mockResolvedValue({ status: "ready" });
  const fetchFrame = vi.spyOn(SOCIAL_TOPIC_LIVE_MEDIA_DEPS, "fetchFrame").mockResolvedValue(new Uint8Array([1]));
  vi.mocked(readSocialMediaObjectFrom).mockResolvedValue({ bytes: new Uint8Array([1]), contentType: "image/jpeg" });
  return { db, create, retrieveAsset, fetchFrame };
}

function loggedLines(): unknown[] {
  return vi.mocked(console.log).mock.calls.map(([line]) => JSON.parse(String(line)));
}

beforeEach(() => {
  for (const [name, value] of Object.entries(ENV)) vi.stubEnv(name, value);
  vi.mocked(runSocialTopicBatch).mockReset().mockResolvedValue(SUMMARY);
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(createClaudeClient).mockReset();
  vi.mocked(readSocialMediaObjectFrom).mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("social topic Lambda handler", () => {
  it("runs whenever invoked: the EventBridge rule is the only switch", async () => {
    vi.stubEnv("SOCIAL_TOPIC_TAGGING", "off");
    expect(await handler({ source: "aws.events", "detail-type": "Scheduled Event" })).toEqual(SUMMARY);
    expect(runSocialTopicBatch).toHaveBeenCalledTimes(1);
  });

  it("fails fast, naming each missing setting", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("MUX_PRIVATE_KEY", " ");
    await expect(handler()).rejects.toThrow("Missing env: SUPABASE_SERVICE_ROLE_KEY, MUX_PRIVATE_KEY");
    expect(runSocialTopicBatch).not.toHaveBeenCalled();
  });

  it("needs the Claude workspace and a valid region", async () => {
    vi.stubEnv("CLAUDE_AWS_REGION", "not a region");
    await expect(handler()).rejects.toThrow("CLAUDE_AWS_REGION and CLAUDE_AWS_WORKSPACE_ID are required");
    expect(runSocialTopicBatch).not.toHaveBeenCalled();
  });

  it("runs one batch with a role-signed Claude client and returns its summary", async () => {
    expect(await handler()).toEqual(SUMMARY);
    const args = vi.mocked(runSocialTopicBatch).mock.calls[0]?.[0];
    expect(args).toMatchObject({ batchSize: 40, budgetMs: 180_000, admin: { admin: true } });
    // The last post can start at the budget and run to its deadline; both fit the 5-minute timeout.
    const run = await vi.importActual<typeof import("@/lib/social-topic-run")>("@/lib/social-topic-run");
    expect(180_000 + run.SOCIAL_TOPIC_POST_DEADLINE_MS).toBeLessThan(300_000);
    expect(args?.client.baseURL).toBe("https://aws-external-anthropic.us-west-2.api.aws");
    expect(typeof args?.mediaDeps?.readImage).toBe("function");
  });

  it("returns the summary even when every post it tried failed; alarms read the log", async () => {
    const failed = { ...SUMMARY, tagged: 0, declined: 0, error: 2 };
    vi.mocked(runSocialTopicBatch).mockResolvedValue(failed);
    await expect(handler()).resolves.toEqual(failed);
    expect(loggedLines()).toEqual([expect.objectContaining({ msg: "social topic tagging done", error: 2 })]);
  });

  it("logs the image build id on the done line, or unknown", async () => {
    vi.stubEnv("SOCIAL_TOPIC_BUILD", "abc1234");
    await handler();
    delete process.env.SOCIAL_TOPIC_BUILD;
    await handler();
    expect(loggedLines()).toEqual([
      { msg: "social topic tagging done", build: "abc1234", ...SUMMARY },
      { msg: "social topic tagging done", build: "unknown", ...SUMMARY },
    ]);
  });

  it("makes S3 timeouts throw instead of only warning", () => {
    expect(SOCIAL_TOPIC_S3_REQUEST_HANDLER).toEqual({
      connectionTimeout: 5_000,
      requestTimeout: 15_000,
      throwOnRequestTimeout: true,
      socketTimeout: 15_000,
    });
  });

  it("carries no static AWS keys of its own", () => {
    const src = readFileSync("workers/social-topic/handler.ts", "utf8");
    expect(src).not.toMatch(/accessKeyId|secretAccessKey|AWS_ACCESS_KEY_ID|MEDIA_AWS_ACCESS_KEY_ID/);
    expect(src).toContain("readClaudeRoleConfig");
  });
});

describe("social topic dry run", () => {
  it("checks every dependency through the live clients, and tags and writes nothing", async () => {
    const { db, create, retrieveAsset, fetchFrame } = dryRunDeps();
    const report = { msg: "social topic dry run", database: "ok", mux: "ok", s3: "ok", claude: "ok" };

    expect(await handler({ dryRun: true })).toEqual(report);
    expect(loggedLines()).toEqual([report]);
    expect(runSocialTopicBatch).not.toHaveBeenCalled();
    expect(db.calls.filter((call) => ["update", "insert", "upsert", "delete"].includes(call))).toEqual([]);
    expect(retrieveAsset).toHaveBeenCalledWith(ASSET_ID);
    expect(fetchFrame).toHaveBeenCalledWith(PLAYBACK_ID, { time: 0, width: SOCIAL_TOPIC_FRAME_WIDTH });
    expect(readSocialMediaObjectFrom).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "media-bucket" }),
      IMAGE_KEY,
    );
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ model: SOCIAL_TOPIC_MODEL_ID, max_tokens: 16 });
    // The Claude client is the role-signed one a real run uses.
    expect(createClaudeClient).toHaveBeenCalledWith({
      provider: "aws-role",
      region: "us-west-2",
      workspaceId: "wrkspc_test",
    });
  });

  it("treats any truthy dryRun as a dry run, so a mistyped value never tags", async () => {
    dryRunDeps();
    await expect(handler({ dryRun: "true" })).resolves.toMatchObject({ msg: "social topic dry run" });
    expect(runSocialTopicBatch).not.toHaveBeenCalled();
  });

  it("skips media checks with a reason when no post has that media", async () => {
    const { retrieveAsset } = dryRunDeps((needle) => (needle === null ? postsWithMedia(null) : { data: [], error: null }));
    expect(await handler({ dryRun: true })).toEqual({
      msg: "social topic dry run",
      database: "ok",
      mux: "skipped: no active post with a Mux video",
      s3: "skipped: no active post with an image",
      claude: "ok",
    });
    expect(retrieveAsset).not.toHaveBeenCalled();
    expect(readSocialMediaObjectFrom).not.toHaveBeenCalled();
  });

  it("skips the frame while the newest video is still preparing", async () => {
    const { retrieveAsset, fetchFrame } = dryRunDeps();
    retrieveAsset.mockResolvedValue({ status: "preparing" });
    await expect(handler({ dryRun: true })).resolves.toMatchObject({ mux: "skipped: newest Mux video is preparing" });
    expect(fetchFrame).not.toHaveBeenCalled();
  });

  it("reports each failure instead of throwing", async () => {
    const { create } = dryRunDeps(() => ({ data: null, error: { message: "connection refused" } }));
    create.mockRejectedValue(new Error("403 workspace denied"));
    expect(await handler({ dryRun: true })).toEqual({
      msg: "social topic dry run",
      database: "failed: Post read failed: connection refused",
      mux: "failed: Post read failed: connection refused",
      s3: "failed: Post read failed: connection refused",
      claude: "failed: 403 workspace denied",
    });
    expect(runSocialTopicBatch).not.toHaveBeenCalled();
  });

  it("reports a Mux or S3 error, a missing frame, or a missing image as failed", async () => {
    let deps = dryRunDeps();
    deps.retrieveAsset.mockRejectedValue(new Error("Mux request failed (401)"));
    vi.mocked(readSocialMediaObjectFrom).mockResolvedValue(null);
    await expect(handler({ dryRun: true })).resolves.toMatchObject({
      mux: "failed: Mux request failed (401)",
      s3: "failed: newest image is missing or unreadable",
    });

    deps = dryRunDeps();
    deps.fetchFrame.mockResolvedValue(null);
    vi.mocked(readSocialMediaObjectFrom).mockRejectedValue(new Error("AccessDenied"));
    await expect(handler({ dryRun: true })).resolves.toMatchObject({
      mux: "failed: Mux returned no frame",
      s3: "failed: AccessDenied",
    });
  });

  it("still throws on missing configuration", async () => {
    vi.stubEnv("MUX_TOKEN_SECRET", "");
    await expect(handler({ dryRun: true })).rejects.toThrow("Missing env: MUX_TOKEN_SECRET");
    vi.stubEnv("MUX_TOKEN_SECRET", "mux-secret");
    vi.stubEnv("CLAUDE_AWS_WORKSPACE_ID", "");
    await expect(handler({ dryRun: true })).rejects.toThrow("CLAUDE_AWS_REGION and CLAUDE_AWS_WORKSPACE_ID are required");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
