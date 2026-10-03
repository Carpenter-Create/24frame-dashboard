import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social-topic-run", () => ({ runSocialTopicBatch: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ admin: true })) }));

import { createAdminClient } from "@/lib/supabase/admin";
import { runSocialTopicBatch } from "@/lib/social-topic-run";

import { handler, SOCIAL_TOPIC_S3_REQUEST_HANDLER } from "../../workers/social-topic/handler";

const ENV = {
  SOCIAL_TOPIC_TAGGING: "on",
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
  error: 0,
  deferred: 0,
  strayTracksDeleted: 0,
  strayErrors: 0,
};

beforeEach(() => {
  for (const [name, value] of Object.entries(ENV)) vi.stubEnv(name, value);
  vi.mocked(runSocialTopicBatch).mockReset().mockResolvedValue(SUMMARY);
  vi.mocked(createAdminClient).mockClear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("social topic Lambda handler", () => {
  it("does nothing while SOCIAL_TOPIC_TAGGING is not on", async () => {
    vi.stubEnv("SOCIAL_TOPIC_TAGGING", "");
    expect(await handler()).toEqual({ skipped: "disabled" });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(runSocialTopicBatch).not.toHaveBeenCalled();
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

  it("fails the invocation when every post it tried failed, deferred posts aside", async () => {
    vi.mocked(runSocialTopicBatch).mockResolvedValue({ ...SUMMARY, tagged: 0, declined: 0, error: 2 });
    await expect(handler()).rejects.toThrow("every attempted post failed (2)");

    // A slow outage: three posts time out, the budget defers the rest.
    vi.mocked(runSocialTopicBatch).mockResolvedValue({
      ...SUMMARY, selected: 40, tagged: 0, declined: 0, wait: 0, raced: 0, error: 3, deferred: 37,
    });
    await expect(handler()).rejects.toThrow("every attempted post failed (3)");
  });

  it("succeeds when any attempted post did not fail, or nothing was tried", async () => {
    vi.mocked(runSocialTopicBatch).mockResolvedValue({
      ...SUMMARY, selected: 40, tagged: 0, declined: 0, wait: 1, raced: 0, error: 2, deferred: 37,
    });
    await expect(handler()).resolves.toMatchObject({ error: 2 });
    vi.mocked(runSocialTopicBatch).mockResolvedValue({
      ...SUMMARY, selected: 0, tagged: 0, declined: 0, wait: 0, raced: 0, error: 0, deferred: 0,
    });
    await expect(handler()).resolves.toMatchObject({ selected: 0 });
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
