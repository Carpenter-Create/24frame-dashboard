import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(function S3ClientMock() {
      return { send: mockSend };
    }),
  };
});

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomUUID: () => "33333333-3333-4333-8333-333333333333",
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { DeleteObjectCommand, DeleteObjectTaggingCommand, GetObjectTaggingCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { captureException } from "@sentry/nextjs";

import { avatarObjectKey, avatarRecheckObjectKey } from "@/lib/account-avatar";
import { uploadAccountPhoto } from "./actions";

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "ada@example.com", name: "Ada" };
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const PREVIOUS = avatarRecheckObjectKey(USER.id, "22222222-2222-4222-8222-222222222222");
const NEXT = avatarRecheckObjectKey(USER.id, "33333333-3333-4333-8333-333333333333");
const HOLD = { TagSet: [{ Key: "gc-hold", Value: "quarantine" }] };

function ctx() {
  const org = { id: ORG_ID, name: "Acme", status: "active" };
  return {
    user: USER,
    rows: [{ role: "account_owner", organizations: org }],
    orgs: [{ id: org.id, name: org.name }],
    activeOrg: org,
    activeRole: "account_owner",
    canOperate: true,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

describe("uploadAccountPhoto live hold", () => {
  beforeEach(() => {
    mockSend.mockReset();
    process.env.S3_AVATARS_BUCKET = "test-avatars-bucket";
    process.env.S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(captureException).mockReset();
  });

  it("treats a live hold result as a landed upload", async () => {
    // The decision read still shows the old pointer, so the swap is a re-hold.
    // applyAvatarHoldTag then reads the new key, strips gc-hold, and returns "live".
    const reads = [PREVIOUS, PREVIOUS, PREVIOUS, NEXT, NEXT, NEXT];
    let read = 0;
    const maybeSingle = vi.fn(async () => ({ data: { avatar_key: reads[read++] ?? NEXT }, error: null }));
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    vi.mocked(createClient).mockResolvedValue({
      from: (table: string) => {
        if (table !== "profiles") throw new Error(`unexpected from(${table})`);
        return { select };
      },
    } as never);
    const result = { data: [] as { id: string }[], error: null };
    const chain = {
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      select: vi.fn(() => chain),
      then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfilled, onRejected),
    };
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({ update: () => chain }),
    } as never);
    let tagReads = 0;
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectTaggingCommand) {
        tagReads += 1;
        return tagReads === 1 || tagReads === 3 ? HOLD : { TagSet: [] };
      }
      if (command instanceof PutObjectCommand) return { ETag: '"etag"' };
      return {};
    });
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer(),
    );
    const body = new FormData();
    body.set("photo", new File([jpeg], "face.jpg", { type: "image/jpeg" }));
    await expect(uploadAccountPhoto(body)).resolves.toEqual({});
    const deleted = mockSend.mock.calls
      .filter((call) => call[0] instanceof DeleteObjectCommand)
      .map((call) => (call[0] as DeleteObjectCommand).input.Key);
    expect(deleted).toEqual([avatarObjectKey(USER.id), PREVIOUS]);
    expect(mockSend.mock.calls.some((call) => call[0] instanceof DeleteObjectTaggingCommand)).toBe(true);
    expect(captureException).not.toHaveBeenCalled();
    expect(NEXT).toBe(avatarRecheckObjectKey(USER.id, "33333333-3333-4333-8333-333333333333"));
  });
});
