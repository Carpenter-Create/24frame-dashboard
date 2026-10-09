import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
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

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { AVATAR_CLEARED, avatarObjectKey, avatarQuarantineObjectKey, avatarRecheckObjectKey } from "./account-avatar";
import { SOCIAL_IMAGE_PREVIOUS_KEY_METADATA, SOCIAL_IMAGE_REENCODED_METADATA } from "./social-image-reencode";
import {
  deleteAvatarObject,
  deleteReplacedAvatarObjects,
  hasAvatarObject,
  headAvatarObject,
  presignAvatarGet,
  putAvatarObject,
  putAvatarRecheckObject,
  quarantineAvatarObject,
  signedAvatarUrl,
  signedAvatarUrls,
  storeAvatarReplacement,
} from "./s3-avatars";

const UID = "11111111-1111-4111-8111-111111111111";
const KEY = `avatars/${UID}/avatar`;

describe("s3-avatars dedicated bucket", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    process.env.S3_AVATARS_BUCKET = "test-avatars-bucket";
    process.env.S3_BUCKET = "test-bucket";
  });

  it("PUTs to S3_AVATARS_BUCKET under avatars/{uid}/avatar, not S3_BUCKET", async () => {
    mockSend.mockResolvedValueOnce({});
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer(),
    );
    const body = new Uint8Array(jpeg.byteLength + 13);
    body.set(jpeg);
    body.set(new TextEncoder().encode("TRAILER-AUDIO"), jpeg.byteLength);
    await putAvatarObject(UID, body, "image/jpeg");
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input.Bucket).toBe("test-avatars-bucket");
    expect(cmd.input.Bucket).not.toBe(process.env.S3_BUCKET);
    expect(cmd.input.Key).toBe(KEY);
    expect(cmd.input.ContentType).toBe("image/jpeg");
    expect(cmd.input.ACL).toBeUndefined();
    expect(Buffer.from(cmd.input.Body as Uint8Array).includes(Buffer.from("TRAILER-AUDIO"))).toBe(false);
  });

  it("refuses when S3_AVATARS_BUCKET is the title bucket", async () => {
    process.env.S3_AVATARS_BUCKET = process.env.S3_BUCKET;
    await expect(putAvatarObject(UID, new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg")).rejects.toThrow(
      /dedicated bucket/,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("DELETEs the same avatars/{uid}/avatar key on the dedicated bucket", async () => {
    mockSend.mockResolvedValueOnce({});
    await deleteAvatarObject(UID);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0]?.[0] as DeleteObjectCommand;
    expect(cmd).toBeInstanceOf(DeleteObjectCommand);
    expect(cmd.input.Bucket).toBe("test-avatars-bucket");
    expect(cmd.input.Key).toBe(KEY);
  });

  it("HEADs the avatars bucket only — missing key is empty, not an invented photo", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("NotFound"), { name: "NotFound", $metadata: { httpStatusCode: 404 } }),
    );
    await expect(headAvatarObject(UID)).resolves.toBe(false);
    const cmd = mockSend.mock.calls[0]?.[0] as HeadObjectCommand;
    expect(cmd).toBeInstanceOf(HeadObjectCommand);
    expect(cmd.input.Bucket).toBe("test-avatars-bucket");
    expect(cmd.input.Key).toBe(KEY);
  });

  it("signs a short-lived GET on the avatars bucket", async () => {
    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/signed-avatar");
    await expect(presignAvatarGet(UID)).resolves.toBe("https://s3.example/signed-avatar");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const [s3, cmd, opts] = mockGetSignedUrl.mock.calls[0] as unknown as [
      unknown,
      GetObjectCommand,
      { expiresIn: number; signingDate: Date },
    ];
    expect(s3).toBeTruthy();
    expect(cmd).toBeInstanceOf(GetObjectCommand);
    expect(cmd.input.ResponseCacheControl).toBe("private, max-age=300");
    expect(opts.expiresIn).toBe(600);
    expect(opts.signingDate).toBeInstanceOf(Date);
  });

  it("reuses the same presign window inside one TTL so the browser can cache the face", async () => {
    mockGetSignedUrl.mockResolvedValue("https://s3.example/signed-avatar");
    await presignAvatarGet(UID);
    await presignAvatarGet(UID);
    const first = mockGetSignedUrl.mock.calls[0]?.[2] as { expiresIn: number; signingDate: Date };
    const second = mockGetSignedUrl.mock.calls[1]?.[2] as { expiresIn: number; signingDate: Date };
    expect(first.expiresIn).toBe(second.expiresIn);
    expect(first.signingDate.getTime()).toBe(second.signingDate.getTime());
  });

  it("returns null when no object exists so the card stays empty", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("NotFound"), { name: "NotFound", $metadata: { httpStatusCode: 404 } }),
    );
    await expect(signedAvatarUrl(UID)).resolves.toBeNull();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("does not sign a cleared avatar, and signs a recheck key instead of the canonical object", async () => {
    await expect(signedAvatarUrl(UID, AVATAR_CLEARED)).resolves.toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
    mockSend.mockResolvedValueOnce({});
    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/recheck");
    const objectId = "22222222-2222-4222-8222-222222222222";
    const key = avatarRecheckObjectKey(UID, objectId);
    await expect(signedAvatarUrl(UID, key)).resolves.toBe("https://s3.example/recheck");
    const head = mockSend.mock.calls[0]?.[0] as HeadObjectCommand;
    expect(head.input.Key).toBe(key);
    expect(head.input.Key).not.toBe(KEY);
  });

  it("hasAvatarObject is true only when HEAD succeeds, and never throws", async () => {
    mockSend.mockResolvedValueOnce({});
    await expect(hasAvatarObject(UID)).resolves.toBe(true);
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("NotFound"), { name: "NotFound", $metadata: { httpStatusCode: 404 } }),
    );
    await expect(hasAvatarObject(UID)).resolves.toBe(false);
    mockSend.mockRejectedValueOnce(new Error("AccessDenied"));
    await expect(hasAvatarObject(UID)).resolves.toBe(false);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("maps ids to the edge proxy without HEAD or RSA", async () => {
    const other = "22222222-2222-4222-8222-222222222222";
    const faces = await signedAvatarUrls([UID, other, UID, ""]);
    expect(faces.size).toBe(2);
    expect(faces.get(UID)).toBe(`/api/social/avatar/${UID}`);
    expect(faces.get(other)).toBe(`/api/social/avatar/${other}`);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("returns an empty map when no ids are passed", async () => {
    await expect(signedAvatarUrls([])).resolves.toEqual(new Map());
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("confirms a replacement with the put ETag and does not head the object", async () => {
    mockSend.mockResolvedValueOnce({ ETag: '"put-etag"' });
    const objectId = "22222222-2222-4222-8222-222222222222";
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer(),
    );
    const stored = await storeAvatarReplacement({
      userId: UID,
      objectId,
      body: jpeg,
      contentType: "image/jpeg",
    });
    expect(stored).toEqual({ key: avatarRecheckObjectKey(UID, objectId), etag: '"put-etag"' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input.Key).toBe(stored.key);
    expect(cmd.input.Key).not.toBe(KEY);
    expect(cmd.input.IfNoneMatch).toBe("*");
  });

  it("confirms a replacement with HeadObject when the put has no ETag", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({ ETag: '"head-etag"' });
    const objectId = "22222222-2222-4222-8222-222222222222";
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 4, g: 5, b: 6 } } }).jpeg().toBuffer(),
    );
    const stored = await storeAvatarReplacement({
      userId: UID,
      objectId,
      body: jpeg,
      contentType: "image/jpeg",
    });
    expect(stored.etag).toBe('"head-etag"');
    const head = mockSend.mock.calls[1]?.[0] as HeadObjectCommand;
    expect(head).toBeInstanceOf(HeadObjectCommand);
    expect(head.input.Key).toBe(stored.key);
  });

  it("does not return a replacement key when the object cannot be confirmed", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockRejectedValueOnce(Object.assign(new Error("NotFound"), { name: "NotFound" }));
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 7, g: 8, b: 9 } } }).jpeg().toBuffer(),
    );
    await expect(
      storeAvatarReplacement({
        userId: UID,
        objectId: "22222222-2222-4222-8222-222222222222",
        body: jpeg,
        contentType: "image/jpeg",
      }),
    ).rejects.toThrow(/NotFound/);
    expect(mockSend.mock.calls.some((call) => call[0] instanceof DeleteObjectCommand)).toBe(false);
  });

  it("deletes the canonical face and the previous recheck key, and keeps quarantine", async () => {
    mockSend.mockResolvedValue({});
    const previous = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(UID, "33333333-3333-4333-8333-333333333333");
    await deleteReplacedAvatarObjects(UID, previous, next);
    const keys = mockSend.mock.calls.map((call) => (call[0] as DeleteObjectCommand).input.Key);
    expect(keys).toEqual([avatarObjectKey(UID), previous]);
    mockSend.mockClear();
    const quarantine = avatarQuarantineObjectKey(UID, "44444444-4444-4444-8444-444444444444");
    await deleteReplacedAvatarObjects(UID, quarantine, next);
    const kept = mockSend.mock.calls.map((call) => (call[0] as DeleteObjectCommand).input.Key);
    expect(kept).toEqual([avatarObjectKey(UID)]);
    expect(kept).not.toContain(quarantine);
    expect(kept).not.toContain(next);
  });

  it("marks a published face as re-encoded", async () => {
    mockSend.mockResolvedValueOnce({});
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer(),
    );
    await putAvatarObject(UID, jpeg, "image/jpeg");
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_REENCODED_METADATA]).toBe("1");
  });

  it("refuses IfNoneMatch overwrite on a recheck face and records the previous key", async () => {
    mockSend.mockResolvedValueOnce({});
    const objectId = "22222222-2222-4222-8222-222222222222";
    const key = await putAvatarRecheckObject({
      userId: UID,
      objectId,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
      previousKey: KEY,
    });
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(key).toBe(avatarRecheckObjectKey(UID, objectId));
    expect(cmd.input.IfNoneMatch).toBe("*");
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_REENCODED_METADATA]).toBe("1");
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_PREVIOUS_KEY_METADATA]).toBe(KEY);
  });

  it("deletes the canonical face and this member's recheck copy, and leaves another member's key", async () => {
    mockSend.mockResolvedValue({});
    const own = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    await deleteAvatarObject(UID, own);
    const keys = mockSend.mock.calls.map((call) => (call[0] as DeleteObjectCommand).input.Key);
    expect(keys).toEqual([KEY, own]);
    mockSend.mockClear();
    const other = "33333333-3333-4333-8333-333333333333";
    await deleteAvatarObject(UID, avatarRecheckObjectKey(other, "22222222-2222-4222-8222-222222222222"));
    const left = mockSend.mock.calls.map((call) => (call[0] as DeleteObjectCommand).input.Key);
    expect(left).toEqual([KEY]);
  });

  it("moves a canonical face into quarantine and never signs that key", async () => {
    mockSend.mockResolvedValue({});
    const objectId = "22222222-2222-4222-8222-222222222222";
    const dest = await quarantineAvatarObject(UID, objectId);
    expect(dest).toBe(avatarQuarantineObjectKey(UID, objectId));
    const copy = mockSend.mock.calls[0]?.[0] as CopyObjectCommand;
    const removed = mockSend.mock.calls[1]?.[0] as DeleteObjectCommand;
    expect(copy).toBeInstanceOf(CopyObjectCommand);
    expect(copy.input.Key).toBe(dest);
    expect(copy.input.IfNoneMatch).toBe("*");
    expect(removed).toBeInstanceOf(DeleteObjectCommand);
    expect(removed.input.Key).toBe(KEY);
    mockSend.mockClear();
    await expect(signedAvatarUrl(UID, dest)).resolves.toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("signs this member's canonical face when the pointer names another member's recheck key", async () => {
    const other = "33333333-3333-4333-8333-333333333333";
    const foreign = avatarRecheckObjectKey(other, "22222222-2222-4222-8222-222222222222");
    mockSend.mockResolvedValueOnce({});
    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/canonical");
    await expect(signedAvatarUrl(UID, foreign)).resolves.toBe("https://s3.example/canonical");
    const head = mockSend.mock.calls[0]?.[0] as HeadObjectCommand;
    expect(head.input.Key).toBe(KEY);
    expect(head.input.Key).not.toBe(foreign);
  });
});
