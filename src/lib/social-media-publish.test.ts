import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/s3-social-media", () => ({
  headSocialMediaObject: vi.fn(),
  copySocialMediaObject: vi.fn(),
}));

import { copySocialMediaObject, headSocialMediaObject } from "@/lib/s3-social-media";
import { isOwnedSocialMediaKey, type SocialMediaItem } from "@/lib/social-media";
import { publishSocialMediaItems } from "./social-media-publish";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const SECOND = "44444444-4444-4444-8444-444444444444";
const PUBLISHED_ID = "55555555-5555-4555-8555-555555555555";
const SECOND_ID = "66666666-6666-4666-8666-666666666666";
const STAGING = `posts/upload/${USER}/${OBJECT}.jpg`;
const PUBLISHED = `posts/${USER}/${PUBLISHED_ID}.jpg`;
const MUX: SocialMediaItem = {
  kind: "video",
  key: `posts/${USER}/${OBJECT}.mp4`,
  contentType: "video/mp4",
  provider: "mux",
  playbackId: "uNbxnGLKJ00yfbijDO8COxT",
  playbackPolicy: "signed",
};

function image(key: string, contentType: SocialMediaItem["contentType"] = "image/jpeg"): SocialMediaItem {
  return { kind: "image", key, contentType };
}

function head(etag: string | null = '"abc"', bytes = 1200, contentType: string | null = "image/jpeg") {
  return { bytes, contentType, etag };
}

function preconditionFailed() {
  return Object.assign(new Error("At least one of the pre-conditions you specified did not hold"), {
    name: "PreconditionFailed",
    $metadata: { httpStatusCode: 412 },
  });
}

describe("social media publish", () => {
  let errorLog: ReturnType<typeof vi.spyOn>;
  let uuid: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(headSocialMediaObject).mockReset();
    vi.mocked(copySocialMediaObject).mockReset();
    vi.mocked(copySocialMediaObject).mockResolvedValue(undefined);
    errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue(PUBLISHED_ID);
  });

  afterEach(() => {
    errorLog.mockRestore();
    uuid.mockRestore();
  });

  it("draws a fresh random key per publish, never one the upload key and ETag predict", async () => {
    uuid.mockRestore();
    vi.mocked(headSocialMediaObject).mockResolvedValue(head('"abc"'));
    const first = await publishSocialMediaItems([image(STAGING)], USER, "posts");
    const again = await publishSocialMediaItems([image(STAGING), image(STAGING)], USER, "posts");
    const keys = [first, again].flatMap((result) => (result.ok ? result.items.map((item) => item.key) : []));
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) {
      expect(key).not.toBe(STAGING);
      expect(isOwnedSocialMediaKey(key, USER, "posts")).toBe(true);
    }
    expect(copySocialMediaObject).toHaveBeenCalledTimes(3);
  });

  it("copies each upload to its own new key with that item's HEAD ETag", async () => {
    const second = `posts/upload/${USER}/${SECOND}.png`;
    uuid.mockReturnValueOnce(PUBLISHED_ID).mockReturnValueOnce(SECOND_ID);
    vi.mocked(headSocialMediaObject).mockImplementation(async (key) =>
      key === STAGING ? head('"abc"') : head('"def"', 2400, null),
    );
    const result = await publishSocialMediaItems([image(STAGING), image(second, "image/png")], USER, "posts");
    const secondKey = `posts/${USER}/${SECOND_ID}.png`;
    expect(result).toEqual({ ok: true, items: [image(PUBLISHED), image(secondKey, "image/png")] });
    expect(isOwnedSocialMediaKey(PUBLISHED, USER, "posts")).toBe(true);
    expect(isOwnedSocialMediaKey(secondKey, USER, "posts")).toBe(true);
    expect(PUBLISHED).not.toBe(STAGING);
    expect(copySocialMediaObject).toHaveBeenCalledTimes(2);
    expect(copySocialMediaObject).toHaveBeenCalledWith({
      sourceKey: STAGING,
      etag: '"abc"',
      destinationKey: PUBLISHED,
      contentType: "image/jpeg",
    });
    expect(copySocialMediaObject).toHaveBeenCalledWith({
      sourceKey: second,
      etag: '"def"',
      destinationKey: secondKey,
      contentType: "image/png",
    });
  });

  it("publishes a story upload to the stories lane", async () => {
    const story = `stories/upload/${USER}/${OBJECT}.jpg`;
    vi.mocked(headSocialMediaObject).mockResolvedValue(head('"abc"'));
    const result = await publishSocialMediaItems([image(story)], USER, "stories");
    const key = `stories/${USER}/${PUBLISHED_ID}.jpg`;
    expect(result).toEqual({ ok: true, items: [image(key)] });
    expect(isOwnedSocialMediaKey(key, USER, "stories")).toBe(true);
  });

  it("returns Mux items untouched, never HEADed or copied", async () => {
    expect(await publishSocialMediaItems([MUX], USER, "posts")).toEqual({ ok: true, items: [MUX] });
    expect(headSocialMediaObject).not.toHaveBeenCalled();
    expect(copySocialMediaObject).not.toHaveBeenCalled();

    vi.mocked(headSocialMediaObject).mockResolvedValue(head('"abc"'));
    expect(await publishSocialMediaItems([MUX, image(STAGING)], USER, "posts")).toEqual({
      ok: true,
      items: [MUX, image(PUBLISHED)],
    });
    expect(headSocialMediaObject).toHaveBeenCalledTimes(1);
    expect(headSocialMediaObject).toHaveBeenCalledWith(STAGING, expect.any(Function));
    expect(copySocialMediaObject).toHaveBeenCalledTimes(1);
  });

  it("copies nothing unless every upload passes HEAD", async () => {
    const cases = [
      { found: null, error: "missing" },
      { found: head('"abc"', 11 * 1024 * 1024), error: "tooLarge" },
      { found: head('"abc"', 1200, "video/mp4"), error: "type" },
      { found: head(null), error: "missing" },
      { found: head(""), error: "missing" },
    ] as const;
    for (const { found, error } of cases) {
      vi.mocked(headSocialMediaObject).mockResolvedValueOnce(found);
      expect(await publishSocialMediaItems([image(STAGING)], USER, "posts")).toEqual({
        ok: false,
        error,
        kind: "image",
      });
    }

    const second = `posts/upload/${USER}/${SECOND}.jpg`;
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce(head('"abc"')).mockResolvedValueOnce(null);
    expect(await publishSocialMediaItems([image(STAGING), image(second)], USER, "posts")).toEqual({
      ok: false,
      error: "missing",
      kind: "image",
    });
    expect(headSocialMediaObject).toHaveBeenCalledWith(second, expect.any(Function));
    expect(copySocialMediaObject).not.toHaveBeenCalled();
  });

  it("accepts a failed copy when the published key already holds the checked object (a retried copy)", async () => {
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce(head('"abc"')).mockResolvedValueOnce(head('"other"'));
    vi.mocked(copySocialMediaObject).mockRejectedValueOnce(preconditionFailed());
    expect(await publishSocialMediaItems([image(STAGING)], USER, "posts")).toEqual({
      ok: true,
      items: [image(PUBLISHED)],
    });
    expect(headSocialMediaObject).toHaveBeenLastCalledWith(PUBLISHED);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("fails as 'store' when a failed copy left nothing matching at the published key", async () => {
    const destinations = [null, head('"x"', 1201), head('"x"', 1200, "image/png"), head('"x"', 1200, null)];
    for (const destination of destinations) {
      vi.mocked(headSocialMediaObject).mockResolvedValueOnce(head('"abc"')).mockResolvedValueOnce(destination);
      vi.mocked(copySocialMediaObject).mockRejectedValueOnce(preconditionFailed());
      expect(await publishSocialMediaItems([image(STAGING)], USER, "posts")).toEqual({ ok: false, error: "store" });
    }
  });

  it("logs one line per failed copy, with no key, ETag, or message", async () => {
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce(head('"abc"')).mockResolvedValueOnce(null);
    vi.mocked(copySocialMediaObject).mockRejectedValueOnce(
      Object.assign(new Error(`Access Denied for ${STAGING}`), {
        name: "AccessDenied",
        $metadata: { httpStatusCode: 403 },
      }),
    );
    expect(await publishSocialMediaItems([image(STAGING)], USER, "posts")).toEqual({ ok: false, error: "store" });
    expect(errorLog).toHaveBeenCalledTimes(1);
    const line = String(errorLog.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      msg: "social media publish failed",
      lane: "posts",
      step: "copy",
      name: "AccessDenied",
      status: 403,
    });
    expect(line).not.toContain(STAGING);
    expect(line).not.toContain(PUBLISHED);
    expect(line).not.toContain(USER);
    expect(line).not.toContain("abc");
  });

  it("logs a failed upload HEAD with its error name and status, and still answers 'missing'", async () => {
    vi.mocked(headSocialMediaObject).mockImplementation(async (_key, onError) => {
      onError?.(
        Object.assign(new Error(`Forbidden ${STAGING}`), { name: "Forbidden", $metadata: { httpStatusCode: 403 } }),
      );
      return null;
    });
    expect(await publishSocialMediaItems([image(`stories/upload/${USER}/${OBJECT}.jpg`)], USER, "stories")).toEqual({
      ok: false,
      error: "missing",
      kind: "image",
    });
    expect(errorLog).toHaveBeenCalledTimes(1);
    const line = String(errorLog.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      msg: "social media publish failed",
      lane: "stories",
      step: "head",
      name: "Forbidden",
      status: 403,
    });
    expect(line).not.toContain(OBJECT);
    expect(line).not.toContain(USER);
    expect(copySocialMediaObject).not.toHaveBeenCalled();
  });

  it("refuses anything but the author's own upload key on this lane, before any HEAD", async () => {
    const refused = [
      image(`posts/upload/${OTHER}/${OBJECT}.jpg`),
      image(`stories/upload/${USER}/${OBJECT}.jpg`),
      image(`posts/upload/${USER}/${OBJECT}.png`),
      // Strict: a stored-shape key is never a copy source, not even the author's own.
      image(`posts/${USER}/${OBJECT}.jpg`),
      image(`posts/${OTHER}/${OBJECT}.jpg`),
      image(`orgs/${USER}/titles/${OBJECT}/master/a.jpg`),
    ];
    for (const item of refused) {
      expect(await publishSocialMediaItems([item], USER, "posts"), item.key).toEqual({
        ok: false,
        error: "forbidden",
      });
    }
    expect(headSocialMediaObject).not.toHaveBeenCalled();
    expect(copySocialMediaObject).not.toHaveBeenCalled();
  });
});
