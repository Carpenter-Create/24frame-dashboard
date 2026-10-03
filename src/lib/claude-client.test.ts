import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLAUDE_DIRECT_BASE_URL,
  claudeAwsBaseUrl,
  createClaudeClient,
  readClaudeConfig,
  readClaudeRoleConfig,
} from "./claude-client";

// us-west-2, not vitest's shared AWS_REGION (us-east-1), so a test cannot
// pass by reading the title-bucket region.
const AWS_ENV = {
  CLAUDE_AWS_REGION: "us-west-2",
  CLAUDE_AWS_ACCESS_KEY_ID: "AKIATESTCLAUDE",
  CLAUDE_AWS_SECRET_ACCESS_KEY: "test-secret",
  CLAUDE_AWS_WORKSPACE_ID: "wrkspc_test",
};

function okMessage(): Response {
  return new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5",
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("readClaudeConfig", () => {
  it("uses Claude Platform on AWS when every CLAUDE_AWS_* value is set", () => {
    expect(readClaudeConfig({ ...AWS_ENV, ANTHROPIC_API_KEY: "cutover-key" })).toEqual({
      provider: "aws",
      region: "us-west-2",
      accessKeyId: "AKIATESTCLAUDE",
      secretAccessKey: "test-secret",
      workspaceId: "wrkspc_test",
    });
    expect(readClaudeConfig({ ...AWS_ENV, CLAUDE_AWS_REGION: " eu-west-1 " })).toMatchObject({
      provider: "aws",
      region: "eu-west-1",
    });
  });

  it("refuses a region that is not an AWS region code", () => {
    for (const region of ["evil.example/x", "us-west-2.evil.example", "US-WEST-2", "us_west_2", "uswest2"]) {
      expect(readClaudeConfig({ ...AWS_ENV, CLAUDE_AWS_REGION: region }), region).toBeNull();
      expect(
        readClaudeConfig({ ...AWS_ENV, CLAUDE_AWS_REGION: region, ANTHROPIC_API_KEY: "cutover-key" }),
        region,
      ).toEqual({ provider: "direct", apiKey: "cutover-key" });
    }
  });

  it("falls back to the cutover key when the AWS set is partial", () => {
    for (const name of Object.keys(AWS_ENV)) {
      const partial = { ...AWS_ENV, [name]: " ", ANTHROPIC_API_KEY: "cutover-key" };
      expect(readClaudeConfig(partial), name).toEqual({ provider: "direct", apiKey: "cutover-key" });
      expect(readClaudeConfig({ ...partial, ANTHROPIC_API_KEY: "" }), name).toBeNull();
    }
  });

  it("never borrows another workload's AWS credentials", () => {
    expect(
      readClaudeConfig({
        AWS_REGION: "us-east-1",
        AWS_ACCESS_KEY_ID: "AKIATITLES",
        AWS_SECRET_ACCESS_KEY: "titles-secret",
        MEDIA_AWS_ACCESS_KEY_ID: "AKIAMEDIA",
        MEDIA_AWS_SECRET_ACCESS_KEY: "media-secret",
        ANTHROPIC_AWS_WORKSPACE_ID: "wrkspc_env",
      }),
    ).toBeNull();
    // Each missing CLAUDE_AWS_* value stays missing; a shared name never fills it.
    const shared: Record<string, Record<string, string>> = {
      CLAUDE_AWS_REGION: { AWS_REGION: "us-east-1", AWS_DEFAULT_REGION: "us-east-1" },
      CLAUDE_AWS_ACCESS_KEY_ID: { AWS_ACCESS_KEY_ID: "AKIATITLES" },
      CLAUDE_AWS_SECRET_ACCESS_KEY: { AWS_SECRET_ACCESS_KEY: "titles-secret" },
      CLAUDE_AWS_WORKSPACE_ID: { ANTHROPIC_AWS_WORKSPACE_ID: "wrkspc_env" },
    };
    for (const [name, fill] of Object.entries(shared)) {
      expect(readClaudeConfig({ ...AWS_ENV, [name]: "", ...fill }), name).toBeNull();
    }
  });
});

describe("createClaudeClient", () => {
  it("signs Claude Platform on AWS requests with SigV4 and the workspace header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okMessage());
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_AWS_BASE_URL", "https://elsewhere.example");
    // The cutover key and a stray bearer stay in the env during cutover.
    vi.stubEnv("ANTHROPIC_API_KEY", "cutover-key");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "stray-bearer");

    const config = readClaudeConfig(AWS_ENV);
    if (!config) throw new Error("expected a config");
    await createClaudeClient(config).messages.create({
      model: "claude-sonnet-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "hi" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("https://aws-external-anthropic.us-west-2.api.aws/v1/messages");
    expect(claudeAwsBaseUrl("us-west-2")).toBe("https://aws-external-anthropic.us-west-2.api.aws");
    expect(headerOf(init, "anthropic-workspace-id")).toBe("wrkspc_test");
    expect(headerOf(init, "authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIATESTCLAUDE\/\d{8}\/us-west-2\/aws-external-anthropic\/aws4_request/,
    );
    expect(headerOf(init, "x-api-key")).toBeNull();
  });

  it("pins the cutover key to the Anthropic API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okMessage());
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("ANTHROPIC_BASE_URL", "https://elsewhere.example");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "stray-bearer");

    await createClaudeClient({ provider: "direct", apiKey: "cutover-key" }).messages.create({
      model: "claude-sonnet-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "hi" }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(`${CLAUDE_DIRECT_BASE_URL}/v1/messages`);
    expect(headerOf(init, "x-api-key")).toBe("cutover-key");
    expect(headerOf(init, "authorization")).toBeNull();
    expect(headerOf(init, "anthropic-workspace-id")).toBeNull();
  });
});

describe("role-signed client (Lambda workers)", () => {
  it("needs only a valid region and the workspace", () => {
    expect(readClaudeRoleConfig({ CLAUDE_AWS_REGION: " us-west-2 ", CLAUDE_AWS_WORKSPACE_ID: "wrkspc_test" })).toEqual({
      provider: "aws-role",
      region: "us-west-2",
      workspaceId: "wrkspc_test",
    });
    expect(readClaudeRoleConfig({ CLAUDE_AWS_REGION: "us-west-2" })).toBeNull();
    expect(readClaudeRoleConfig({ CLAUDE_AWS_REGION: "evil.example", CLAUDE_AWS_WORKSPACE_ID: "wrkspc_test" })).toBeNull();
  });

  it("is never what the web app's config returns", () => {
    expect(
      readClaudeConfig({ CLAUDE_AWS_REGION: "us-west-2", CLAUDE_AWS_WORKSPACE_ID: "wrkspc_test" }),
    ).toBeNull();
  });

  it("signs with the runtime's own role credentials, session token included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okMessage());
    vi.stubGlobal("fetch", fetchMock);
    // What Lambda puts in the environment for its execution role.
    vi.stubEnv("AWS_ACCESS_KEY_ID", "ASIAROLECREDS");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "role-secret");
    vi.stubEnv("AWS_SESSION_TOKEN", "role-session-token");
    vi.stubEnv("ANTHROPIC_AWS_BASE_URL", "https://elsewhere.example");

    const config = readClaudeRoleConfig({ CLAUDE_AWS_REGION: "us-west-2", CLAUDE_AWS_WORKSPACE_ID: "wrkspc_test" });
    if (!config) throw new Error("expected a config");
    await createClaudeClient(config).messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "hi" }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("https://aws-external-anthropic.us-west-2.api.aws/v1/messages");
    expect(headerOf(init, "anthropic-workspace-id")).toBe("wrkspc_test");
    expect(headerOf(init, "authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=ASIAROLECREDS\/\d{8}\/us-west-2\/aws-external-anthropic\/aws4_request/,
    );
    expect(headerOf(init, "x-amz-security-token")).toBe("role-session-token");
    expect(headerOf(init, "x-api-key")).toBeNull();
  });
});
