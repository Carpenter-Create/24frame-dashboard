import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import AnthropicAws from "@anthropic-ai/aws-sdk";

// Claude provider seam. Founder decision 2026-10-03: Claude runs on Claude
// Platform on AWS (Anthropic-operated, AWS IAM and billing). Its credentials
// are a dedicated CLAUDE_AWS_* namespace, the same rule as NEWS_AWS_*: never
// the shared AWS_* title-bucket keys or another workload's keys.
//
// ANTHROPIC_API_KEY is the cutover fallback only, used while the AWS
// workspace is not configured. Remove it (and this branch) once
// docs/infra/claude-platform-aws.md step 6 is done.
//
// Both endpoints are pinned here. The SDKs otherwise read ANTHROPIC_BASE_URL
// / ANTHROPIC_AWS_BASE_URL from the environment, and a stray value would send
// signed requests somewhere else.

export const CLAUDE_DIRECT_BASE_URL = "https://api.anthropic.com";
export const CLAUDE_REQUEST_TIMEOUT_MS = 60_000;
export const CLAUDE_MAX_RETRIES = 2;

export type ClaudeEnv = Record<string, string | undefined>;

export type ClaudeConfig =
  | {
      provider: "aws";
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      workspaceId: string;
    }
  | { provider: "direct"; apiKey: string };

// An AWS region code. The region becomes the endpoint host, so any other
// value is not a provider: a stray env value cannot move signed requests to
// another host.
const AWS_REGION_PATTERN = /^[a-z]{2}(-[a-z]+)+-\d+$/;

function readTrimmed(env: ClaudeEnv, name: string): string {
  return env[name]?.trim() ?? "";
}

export function claudeAwsBaseUrl(region: string): string {
  return `https://aws-external-anthropic.${region}.api.aws`;
}

/**
 * The provider to call, or null when none is configured. A complete
 * CLAUDE_AWS_* set with a valid region wins. A partial set is not a
 * provider: it falls through to the cutover key, and with no key the
 * feature reports unavailable.
 */
export function readClaudeConfig(env: ClaudeEnv = process.env): ClaudeConfig | null {
  const region = readTrimmed(env, "CLAUDE_AWS_REGION");
  const accessKeyId = readTrimmed(env, "CLAUDE_AWS_ACCESS_KEY_ID");
  const secretAccessKey = readTrimmed(env, "CLAUDE_AWS_SECRET_ACCESS_KEY");
  const workspaceId = readTrimmed(env, "CLAUDE_AWS_WORKSPACE_ID");
  if (AWS_REGION_PATTERN.test(region) && accessKeyId && secretAccessKey && workspaceId) {
    return { provider: "aws", region, accessKeyId, secretAccessKey, workspaceId };
  }
  const apiKey = readTrimmed(env, "ANTHROPIC_API_KEY");
  if (apiKey) return { provider: "direct", apiKey };
  return null;
}

export function createClaudeClient(config: ClaudeConfig): Anthropic {
  if (config.provider === "aws") {
    return new AnthropicAws({
      awsRegion: config.region,
      awsAccessKey: config.accessKeyId,
      awsSecretAccessKey: config.secretAccessKey,
      workspaceId: config.workspaceId,
      baseURL: claudeAwsBaseUrl(config.region),
      timeout: CLAUDE_REQUEST_TIMEOUT_MS,
      maxRetries: CLAUDE_MAX_RETRIES,
    });
  }
  return new Anthropic({
    apiKey: config.apiKey,
    authToken: null,
    baseURL: CLAUDE_DIRECT_BASE_URL,
    timeout: CLAUDE_REQUEST_TIMEOUT_MS,
    maxRetries: CLAUDE_MAX_RETRIES,
  });
}
