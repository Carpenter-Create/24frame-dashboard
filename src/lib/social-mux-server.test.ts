import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialMuxUploadNotBoundError } from "./social-mux";
import {
  createSocialMuxDirectUpload,
  fetchSocialMuxFrame,
  finalizeSocialMuxDirectUpload,
  isSocialMuxPermanentError,
  mintSocialMuxPlaybackTokens,
  retrieveSocialMuxAsset,
  signedPlaybackIdFromAsset,
  SocialMuxRequestError,
  socialMuxSettingsFromUploadInput,
} from "./social-mux-server";

const UPLOAD_ID = "zd01Pe2bNpYhxbrwYABgFE";
const ASSET_ID = "SqQnqz6s5MBuXGvJaUWdXu";
const PLAYBACK_ID = "uNbxnGLKJ00yfbijDO8COxT";
const SIGNED_PLAYBACK_ID = "signedPlaybackId01";
const USER = "11111111-1111-4111-8111-111111111111";

function muxJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("social Mux server client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("creates a direct upload with the locked encode settings", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi.fn().mockResolvedValue(
      muxJson({
        id: UPLOAD_ID,
        url: "https://storage.googleapis.com/mux-upload",
        status: "waiting",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createSocialMuxDirectUpload({
        settings: { videoQuality: "basic", maxResolutionTier: "2160p" },
        passthrough: "user:object",
      }),
    ).resolves.toEqual({
      uploadId: UPLOAD_ID,
      url: "https://storage.googleapis.com/mux-upload",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mux.com/video/v1/uploads",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("tid:tsecret").toString("base64")}`,
        }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      new_asset_settings: Record<string, unknown>;
    };
    expect(body.new_asset_settings).toMatchObject({
      playback_policies: ["signed"],
      video_quality: "basic",
      max_resolution_tier: "2160p",
      passthrough: "user:object",
    });
  });

  it("finalizes an upload once Mux has a signed playback id bound to the caller", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        muxJson({
          id: UPLOAD_ID,
          status: "asset_created",
          asset_id: ASSET_ID,
          new_asset_settings: { passthrough: `${USER}:object` },
        }),
      )
      .mockResolvedValueOnce(
        muxJson({
          id: ASSET_ID,
          status: "preparing",
          playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, USER)).resolves.toEqual({
      uploadId: UPLOAD_ID,
      assetId: ASSET_ID,
      playbackId: PLAYBACK_ID,
    });
  });

  it("rejects finalize when the passthrough only shares a user id prefix", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi.fn().mockResolvedValue(
      muxJson({
        id: UPLOAD_ID,
        status: "asset_created",
        asset_id: ASSET_ID,
        new_asset_settings: { passthrough: `${USER}9:object` },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, USER)).rejects.toBeInstanceOf(
      SocialMuxUploadNotBoundError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects finalize when the upload passthrough does not start with the caller", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi.fn().mockResolvedValue(
      muxJson({
        id: UPLOAD_ID,
        status: "asset_created",
        asset_id: ASSET_ID,
        new_asset_settings: { passthrough: "22222222-2222-4222-8222-222222222222:object" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, USER)).rejects.toBeInstanceOf(
      SocialMuxUploadNotBoundError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`https://api.mux.com/video/v1/uploads/${UPLOAD_ID}`);
  });

  it("rejects finalize when the upload has no passthrough", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi.fn().mockResolvedValue(
      muxJson({ id: UPLOAD_ID, status: "asset_created", asset_id: ASSET_ID }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, USER)).rejects.toBeInstanceOf(
      SocialMuxUploadNotBoundError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects finalize before calling Mux when the caller id is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, "  ")).rejects.toBeInstanceOf(
      SocialMuxUploadNotBoundError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mints signed playback, thumbnail, and storyboard JWTs", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    vi.stubEnv("MUX_SIGNING_KEY", "signing-key-id");
    vi.stubEnv("MUX_PRIVATE_KEY", Buffer.from(pem).toString("base64"));

    const tokens = await mintSocialMuxPlaybackTokens(PLAYBACK_ID);
    const claims = [tokens.playback, tokens.thumbnail, tokens.storyboard].map((token) => {
      const [header, body, signature] = token.split(".");
      expect(header && body && signature).toBeTruthy();
      expect(
        verify(
          "RSA-SHA256",
          Buffer.from(`${header}.${body}`),
          publicKey,
          Buffer.from(signature!, "base64url"),
        ),
      ).toBe(true);
      return JSON.parse(Buffer.from(body!, "base64url").toString()) as {
        sub?: string;
        aud?: string;
        kid?: string;
        time?: string;
      };
    });
    expect(claims.map((claim) => claim.aud)).toEqual(["v", "t", "s"]);
    expect(claims.every((claim) => claim.sub === PLAYBACK_ID && claim.kid === "signing-key-id")).toBe(true);
    expect(claims.map((claim) => claim.time)).toEqual([undefined, "0", undefined]);
  });

  it("maps live and video intents without client pixel fields", () => {
    expect(socialMuxSettingsFromUploadInput({ intent: "live" })).toEqual({
      intent: "live",
      settings: { videoQuality: "plus", maxResolutionTier: "1080p" },
    });
    expect(socialMuxSettingsFromUploadInput({ intent: "video" }).settings.maxResolutionTier).toBe(
      "2160p",
    );
    expect(
      signedPlaybackIdFromAsset({
        playback_ids: [
          { id: PLAYBACK_ID, policy: "public" },
          { id: SIGNED_PLAYBACK_ID, policy: "signed" },
        ],
      }),
    ).toBe(SIGNED_PLAYBACK_ID);
    expect(
      signedPlaybackIdFromAsset({
        playback_ids: [{ id: PLAYBACK_ID, policy: "public" }],
      }),
    ).toBeNull();
  });
});

describe("social Mux server: topic tagging reads", () => {
  function stubMuxEnv() {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    vi.stubEnv("MUX_SIGNING_KEY", "signing-key-id");
    vi.stubEnv("MUX_PRIVATE_KEY", Buffer.from(pem).toString("base64"));
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("treats a 4xx other than auth, timeout, and rate limit as permanent", () => {
    for (const status of [400, 404, 409, 410, 412, 422]) {
      expect(isSocialMuxPermanentError(new SocialMuxRequestError("x", status)), String(status)).toBe(true);
    }
    for (const status of [401, 403, 408, 429, 500, 502, 503]) {
      expect(isSocialMuxPermanentError(new SocialMuxRequestError("x", status)), String(status)).toBe(false);
    }
    expect(isSocialMuxPermanentError(new Error("Mux request failed (404)"))).toBe(false);
    expect(isSocialMuxPermanentError(new DOMException("timed out", "TimeoutError"))).toBe(false);
  });

  it("carries the HTTP status on a failed API call, and passes a caller's signal", async () => {
    stubMuxEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { messages: ["Asset not found"] } }), { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const signal = AbortSignal.timeout(1000);

    const error = await retrieveSocialMuxAsset(ASSET_ID, { signal }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(SocialMuxRequestError);
    expect(error).toMatchObject({ message: "Asset not found", status: 404 });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it("reads a frame, null when Mux says it is gone, and throws otherwise", async () => {
    stubMuxEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).resolves.toEqual(new Uint8Array([1, 2, 3]));
    const [frameUrl, frameInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(frameUrl).toMatch(/^https:\/\/image\.mux\.com\/.+\/thumbnail\.jpg\?token=/);
    expect(frameInit.signal).toBeInstanceOf(AbortSignal);

    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
    await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).resolves.toBeNull();

    for (const status of [403, 429, 500]) {
      fetchMock.mockResolvedValueOnce(new Response("", { status }));
      await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).rejects.toMatchObject({ status });
    }
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).rejects.toThrow("fetch failed");
  });
});
