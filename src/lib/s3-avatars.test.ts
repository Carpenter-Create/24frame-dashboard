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

import { CopyObjectCommand, DeleteObjectCommand, DeleteObjectTaggingCommand, GetObjectCommand, GetObjectTaggingCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, PutObjectTaggingCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { AVATAR_CLEARED, AVATAR_QUARANTINE_HOLD_TAG, avatarObjectKey, avatarPointerNamesKey, avatarQuarantineObjectKey, avatarRecheckObjectKey, avatarServeKey } from "./account-avatar";
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
  releaseAvatarHoldTag,
  signedAvatarUrl,
  signedAvatarUrls,
  storeAvatarReplacement,
} from "./s3-avatars";

const UID = "11111111-1111-4111-8111-111111111111";
const KEY = `avatars/${UID}/avatar`;
const HOLD = { TagSet: [{ Key: "gc-hold", Value: "quarantine" }] };
const clearedPointer = async () => AVATAR_CLEARED;

function deletedKeys(): string[] {
  return mockSend.mock.calls
    .filter((call) => call[0] instanceof DeleteObjectCommand)
    .map((call) => (call[0] as DeleteObjectCommand).input.Key)
    .filter((key): key is string => typeof key === "string");
}

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
    await deleteAvatarObject(UID, null, clearedPointer);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0]?.[0] as DeleteObjectCommand;
    expect(cmd).toBeInstanceOf(DeleteObjectCommand);
    expect(cmd.input.Bucket).toBe("test-avatars-bucket");
    expect(cmd.input.Key).toBe(KEY);
    expect(mockSend.mock.calls.some((call) => call[0] instanceof ListObjectsV2Command)).toBe(false);
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
    mockSend.mockResolvedValueOnce(HOLD);
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
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls[1]?.[0]).toBeInstanceOf(GetObjectTaggingCommand);
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input.Key).toBe(stored.key);
    expect(cmd.input.Key).not.toBe(KEY);
    expect(cmd.input.IfNoneMatch).toBe("*");
  });

  it("confirms a replacement with HeadObject when the put has no ETag", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({ ETag: '"head-etag"' });
    mockSend.mockResolvedValueOnce(HOLD);
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

  it("does not return a replacement key when the put and the head both omit an ETag", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({});
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
    ).rejects.toThrow(/did not confirm/);
    expect(mockSend.mock.calls.some((call) => call[0] instanceof DeleteObjectCommand)).toBe(false);
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

  it("deletes the canonical face and the previous recheck key, and leaves the new key", async () => {
    const previous = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(UID, "33333333-3333-4333-8333-333333333333");
    const quarantine = avatarQuarantineObjectKey(UID, "44444444-4444-4444-8444-444444444444");
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) {
        return { Contents: [{ Key: quarantine }, { Key: next }, { Key: previous }], IsTruncated: false };
      }
      return {};
    });
    await deleteReplacedAvatarObjects(UID, previous, next, async () => next);
    expect(deletedKeys()).toEqual([avatarObjectKey(UID), previous]);
    expect(deletedKeys()).not.toContain(next);
    expect(deletedKeys()).not.toContain(quarantine);
    expect(mockSend.mock.calls.filter((call) => call[0] instanceof ListObjectsV2Command)).toHaveLength(0);
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
    mockSend.mockResolvedValueOnce(HOLD);
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
    expect(cmd.input.Tagging).toBe(AVATAR_QUARANTINE_HOLD_TAG);
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_REENCODED_METADATA]).toBe("1");
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_PREVIOUS_KEY_METADATA]).toBe(KEY);
  });

  it("does not return a recheck key when the hold tag is missing", async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockResolvedValueOnce({ TagSet: [] });
    await expect(
      putAvatarRecheckObject({
        userId: UID,
        objectId: "22222222-2222-4222-8222-222222222222",
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
        previousKey: KEY,
      }),
    ).rejects.toThrow(/hold tag was not stored/);
  });

  it("tags a replacement face for the 30-day hold and confirms the tag was stored", async () => {
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer(),
    );
    mockSend.mockResolvedValueOnce({ ETag: '"face"' });
    mockSend.mockResolvedValueOnce(HOLD);
    const stored = await storeAvatarReplacement({
      userId: UID,
      objectId: "22222222-2222-4222-8222-222222222222",
      body: jpeg,
      contentType: "image/jpeg",
    });
    const put = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(put.input.Tagging).toBe(AVATAR_QUARANTINE_HOLD_TAG);
    const tagged = mockSend.mock.calls[1]?.[0] as GetObjectTaggingCommand;
    expect(tagged).toBeInstanceOf(GetObjectTaggingCommand);
    expect(tagged.input.Key).toBe(stored.key);
  });

  it("does not return a replacement when the hold tag is missing", async () => {
    const jpeg = new Uint8Array(
      await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer(),
    );
    mockSend.mockResolvedValueOnce({ ETag: '"face"' });
    mockSend.mockResolvedValueOnce({ TagSet: [] });
    await expect(
      storeAvatarReplacement({
        userId: UID,
        objectId: "22222222-2222-4222-8222-222222222222",
        body: jpeg,
        contentType: "image/jpeg",
      }),
    ).rejects.toThrow(/hold tag was not stored/);
  });

  it("releases the hold with DeleteObjectTagging and confirms no gc-hold tag remains", async () => {
    const key = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectTaggingCommand) return { TagSet: [] };
      return {};
    });
    await releaseAvatarHoldTag(UID, key);
    const removed = mockSend.mock.calls[0]?.[0] as DeleteObjectTaggingCommand;
    const read = mockSend.mock.calls[1]?.[0] as GetObjectTaggingCommand;
    expect(removed).toBeInstanceOf(DeleteObjectTaggingCommand);
    expect(removed).not.toBeInstanceOf(PutObjectTaggingCommand);
    expect(removed.input.Key).toBe(key);
    expect(read).toBeInstanceOf(GetObjectTaggingCommand);
    expect(read.input.Key).toBe(key);
    await expect(releaseAvatarHoldTag(UID, avatarObjectKey(UID))).rejects.toThrow(/recheck key/);
  });

  it("fails closed when the tag delete throws", async () => {
    const key = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    mockSend.mockRejectedValueOnce(new Error("tag delete failed"));
    await expect(releaseAvatarHoldTag(UID, key)).rejects.toThrow(/tag delete failed/);
    expect(mockSend.mock.calls.some((call) => call[0] instanceof GetObjectTaggingCommand)).toBe(false);
  });

  it("fails closed when gc-hold is still present after the tag delete", async () => {
    const key = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectTaggingCommand) return HOLD;
      return {};
    });
    await expect(releaseAvatarHoldTag(UID, key)).rejects.toThrow(/hold tag remains/);
  });

  it("treats NoSuchTagSet as no gc-hold tag", async () => {
    const key = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof DeleteObjectTaggingCommand) return {};
      if (command instanceof GetObjectTaggingCommand) {
        throw Object.assign(new Error("NoSuchTagSet"), { name: "NoSuchTagSet" });
      }
      return {};
    });
    await expect(releaseAvatarHoldTag(UID, key)).resolves.toBeUndefined();
  });

  it("deletes the exact keys a remove read and leaves another member's key", async () => {
    const own = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    const quarantine = avatarQuarantineObjectKey(UID, "44444444-4444-4444-8444-444444444444");
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) return { Contents: [{ Key: quarantine }, { Key: own }], IsTruncated: false };
      return {};
    });
    await deleteAvatarObject(UID, own, clearedPointer);
    expect(deletedKeys()).toEqual([own, KEY]);
    expect(deletedKeys()).not.toContain(quarantine);
    expect(mockSend.mock.calls.some((call) => call[0] instanceof ListObjectsV2Command)).toBe(false);
    mockSend.mockClear();
    const other = "33333333-3333-4333-8333-333333333333";
    const foreign = avatarRecheckObjectKey(other, "22222222-2222-4222-8222-222222222222");
    await deleteAvatarObject(UID, foreign, clearedPointer);
    expect(deletedKeys()).toEqual([KEY]);
    expect(deletedKeys()).not.toContain(foreign);
  });

  it("leaves a newer face that is stored and pointed during remove, and that face is still served", async () => {
    const previous = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    const newer = avatarRecheckObjectKey(UID, "33333333-3333-4333-8333-333333333333");
    let pointer: string | null = AVATAR_CLEARED;
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) {
        return { Contents: [{ Key: newer }, { Key: previous }, { Key: KEY }], IsTruncated: false };
      }
      if (command instanceof HeadObjectCommand) return {};
      return {};
    });
    mockGetSignedUrl.mockResolvedValue("https://s3.example/newer");
    await deleteAvatarObject(UID, previous, async () => {
      pointer = newer;
      return pointer;
    });
    expect(deletedKeys()).toEqual([previous, KEY]);
    expect(deletedKeys()).not.toContain(newer);
    expect(mockSend.mock.calls.filter((call) => call[0] instanceof ListObjectsV2Command)).toHaveLength(0);
    await expect(signedAvatarUrl(UID, pointer)).resolves.toBe("https://s3.example/newer");
    const head = mockSend.mock.calls.find((call) => call[0] instanceof HeadObjectCommand)?.[0] as HeadObjectCommand;
    expect(head.input.Key).toBe(newer);
    expect(avatarServeKey(UID, pointer)).toBe(newer);
  });

  it("re-reads the pointer before each delete and leaves the key that read names", async () => {
    const previous = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    let reads = 0;
    await deleteAvatarObject(UID, previous, async () => {
      reads += 1;
      return reads === 1 ? AVATAR_CLEARED : null;
    });
    expect(reads).toBe(2);
    expect(deletedKeys()).toEqual([previous]);
    expect(deletedKeys()).not.toContain(KEY);
    expect(avatarPointerNamesKey(UID, null, KEY)).toBe(true);
  });

  it("moves a canonical face into quarantine and never signs that key", async () => {
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectTaggingCommand) return HOLD;
      return {};
    });
    const objectId = "22222222-2222-4222-8222-222222222222";
    const dest = await quarantineAvatarObject(UID, objectId, clearedPointer);
    expect(dest).toBe(avatarQuarantineObjectKey(UID, objectId));
    const copy = mockSend.mock.calls[0]?.[0] as CopyObjectCommand;
    const removed = mockSend.mock.calls.find((call) => call[0] instanceof DeleteObjectCommand)?.[0] as DeleteObjectCommand;
    expect(copy).toBeInstanceOf(CopyObjectCommand);
    expect(copy.input.Key).toBe(dest);
    expect(copy.input.IfNoneMatch).toBe("*");
    expect(copy.input.TaggingDirective).toBe("REPLACE");
    expect(copy.input.Tagging).toBe(AVATAR_QUARANTINE_HOLD_TAG);
    expect(removed).toBeInstanceOf(DeleteObjectCommand);
    expect(removed.input.Key).toBe(KEY);
    const tagged = mockSend.mock.calls.find((call) => call[0] instanceof GetObjectTaggingCommand)?.[0] as GetObjectTaggingCommand;
    expect(tagged.input.Key).toBe(dest);
    const copyOrder = mockSend.mock.calls.findIndex((call) => call[0] instanceof CopyObjectCommand);
    const tagOrder = mockSend.mock.calls.findIndex((call) => call[0] instanceof GetObjectTaggingCommand);
    const deleteOrder = mockSend.mock.calls.findIndex((call) => call[0] instanceof DeleteObjectCommand);
    expect(copyOrder).toBeLessThan(tagOrder);
    expect(tagOrder).toBeLessThan(deleteOrder);
    mockSend.mockClear();
    await expect(signedAvatarUrl(UID, dest)).resolves.toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("does not delete the canonical face when the quarantine tag is missing", async () => {
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectTaggingCommand) return { TagSet: [] };
      return {};
    });
    await expect(
      quarantineAvatarObject(UID, "22222222-2222-4222-8222-222222222222", clearedPointer),
    ).rejects.toThrow(/hold tag was not stored/);
    expect(deletedKeys()).toEqual([]);
  });

  it("does not delete the canonical face when the pointer names it", async () => {
    mockSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectTaggingCommand) return HOLD;
      return {};
    });
    const dest = await quarantineAvatarObject(UID, "22222222-2222-4222-8222-222222222222", async () => null);
    expect(dest).toBe(avatarQuarantineObjectKey(UID, "22222222-2222-4222-8222-222222222222"));
    expect(deletedKeys()).toEqual([]);
    expect(avatarPointerNamesKey(UID, null, KEY)).toBe(true);
  });

  it("does not delete a replaced key when the re-read names it", async () => {
    const previous = avatarRecheckObjectKey(UID, "22222222-2222-4222-8222-222222222222");
    const next = avatarRecheckObjectKey(UID, "33333333-3333-4333-8333-333333333333");
    let reads = 0;
    await deleteReplacedAvatarObjects(UID, previous, next, async () => {
      reads += 1;
      return reads === 1 ? AVATAR_CLEARED : previous;
    });
    expect(deletedKeys()).toEqual([KEY]);
    expect(deletedKeys()).not.toContain(previous);
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
