import { generateKeyPairSync, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const { bindingUpsert } = vi.hoisted(() => ({
  bindingUpsert: vi.fn(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ upsert: bindingUpsert }),
  }),
}));

import { SOCIAL_MUX_PROVIDER, SocialMuxUploadNotBoundError, SocialMuxVideoTooLongError } from "./social-mux";
import {
  createSocialMuxAudioRendition,
  createSocialMuxDirectUpload,
  fetchSocialMuxFrame,
  finalizeSocialMuxDirectUpload,
  mintSocialMuxPlaybackTokens,
  signSocialMuxStaticAudioUrl,
  retrieveSocialMuxAsset,
  signedPlaybackIdFromAsset,
  socialMuxPublishedVideoBound,
  socialMuxSettingsFromUploadInput,
  verifySocialMuxPublishedItems,
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
          duration: 8,
          playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, USER)).resolves.toEqual({
      uploadId: UPLOAD_ID,
      assetId: ASSET_ID,
      playbackId: PLAYBACK_ID,
    });
    expect(bindingUpsert).toHaveBeenCalledWith(
      {
        author_id: USER,
        upload_id: UPLOAD_ID,
        asset_id: ASSET_ID,
        playback_id: PLAYBACK_ID,
      },
      { onConflict: "author_id,asset_id,playback_id", ignoreDuplicates: true },
    );
  });

  it("deletes a ready asset longer than eight minutes and does not bind it", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    bindingUpsert.mockClear();
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
          status: "ready",
          duration: 481,
          playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(finalizeSocialMuxDirectUpload(UPLOAD_ID, USER)).rejects.toBeInstanceOf(SocialMuxVideoTooLongError);
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(`https://api.mux.com/video/v1/assets/${ASSET_ID}`);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "DELETE" });
    expect(bindingUpsert).not.toHaveBeenCalled();
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

  it("requests an audio-only static rendition", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi.fn().mockResolvedValue(muxJson({}));
    vi.stubGlobal("fetch", fetchMock);
    await createSocialMuxAudioRendition(ASSET_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.mux.com/video/v1/assets/${ASSET_ID}/static-renditions`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ resolution: "audio-only" });
  });

  it("treats an existing or in-progress audio rendition as already requested", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { messages: ["Static rendition already exists"] } }), { status: 400 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(createSocialMuxAudioRendition(ASSET_ID)).resolves.toBeUndefined();
  });

  it("rethrows a transient audio rendition error", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { messages: ["unavailable"] } }), { status: 503 })),
    );
    await expect(createSocialMuxAudioRendition(ASSET_ID)).rejects.toThrow(/unavailable/);
  });

  it("accepts a published Mux video only when the member owns the upload and playback id", () => {
    const bound = {
      userId: USER,
      uploadId: UPLOAD_ID,
      assetId: ASSET_ID,
      playbackId: PLAYBACK_ID,
      upload: { asset_id: ASSET_ID, new_asset_settings: { passthrough: `${USER}:clip` } },
      asset: { playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }] },
    };
    expect(socialMuxPublishedVideoBound(bound)).toBe(true);
    expect(socialMuxPublishedVideoBound({ ...bound, assetId: "short" })).toBe(false);
    expect(socialMuxPublishedVideoBound({ ...bound, userId: "someone-else" })).toBe(false);
    expect(
      socialMuxPublishedVideoBound({
        ...bound,
        upload: { asset_id: "otherasset1", new_asset_settings: { passthrough: `${USER}:clip` } },
      }),
    ).toBe(false);
    expect(socialMuxPublishedVideoBound({ ...bound, playbackId: SIGNED_PLAYBACK_ID })).toBe(false);
    expect(
      socialMuxPublishedVideoBound({
        ...bound,
        asset: { playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }], duration: 481 },
      }),
    ).toBe(false);
  });

  it("writes the binding when publish confirms the playback belongs to the asset", async () => {
    vi.stubEnv("MUX_TOKEN_ID", "tid");
    vi.stubEnv("MUX_TOKEN_SECRET", "tsecret");
    bindingUpsert.mockClear();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        muxJson({
          id: UPLOAD_ID,
          asset_id: ASSET_ID,
          new_asset_settings: { passthrough: `${USER}:clip` },
        }),
      )
      .mockResolvedValueOnce(
        muxJson({
          id: ASSET_ID,
          duration: 8,
          playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      verifySocialMuxPublishedItems(
        [
          {
            kind: "video",
            provider: SOCIAL_MUX_PROVIDER,
            uploadId: UPLOAD_ID,
            assetId: ASSET_ID,
            playbackId: PLAYBACK_ID,
          },
        ],
        USER,
      ),
    ).resolves.toBe(true);
    expect(bindingUpsert).toHaveBeenCalledWith(
      {
        author_id: USER,
        upload_id: UPLOAD_ID,
        asset_id: ASSET_ID,
        playback_id: PLAYBACK_ID,
      },
      { onConflict: "author_id,asset_id,playback_id", ignoreDuplicates: true },
    );

    bindingUpsert.mockClear();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          muxJson({
            id: UPLOAD_ID,
            asset_id: ASSET_ID,
            new_asset_settings: { passthrough: `${USER}:clip` },
          }),
        )
        .mockResolvedValueOnce(
          muxJson({
            id: ASSET_ID,
            duration: 8,
            playback_ids: [{ id: SIGNED_PLAYBACK_ID, policy: "signed" }],
          }),
        ),
    );
    await expect(
      verifySocialMuxPublishedItems(
        [
          {
            kind: "video",
            provider: SOCIAL_MUX_PROVIDER,
            uploadId: UPLOAD_ID,
            assetId: ASSET_ID,
            playbackId: PLAYBACK_ID,
          },
        ],
        USER,
      ),
    ).resolves.toBe(false);
    expect(bindingUpsert).not.toHaveBeenCalled();
  });

  it("signs the static audio.m4a URL for the worker", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
    vi.stubEnv("MUX_SIGNING_KEY", "signing-key-id");
    vi.stubEnv("MUX_PRIVATE_KEY", Buffer.from(pem).toString("base64"));
    const url = await signSocialMuxStaticAudioUrl(PLAYBACK_ID);
    expect(url.startsWith(`https://stream.mux.com/${PLAYBACK_ID}/audio.m4a?token=`)).toBe(true);
    const token = new URL(url).searchParams.get("token") ?? "";
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
    expect(JSON.stringify(payload)).not.toContain("asset_start_time");
    expect(JSON.stringify(payload)).not.toContain("asset_end_time");
    expect(readFileSync("src/lib/social-mux-server.ts", "utf8")).not.toContain("asset_start_time");
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

  it("throws Mux's message on a failed API call, and passes a caller's signal", async () => {
    stubMuxEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { messages: ["Asset not found"] } }), { status: 404 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const signal = AbortSignal.timeout(1000);

    await expect(retrieveSocialMuxAsset(ASSET_ID, { signal })).rejects.toMatchObject({
      message: "Asset not found",
      status: 404,
    });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it("reads a frame, and throws on any failed read, a 404 included", async () => {
    stubMuxEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).resolves.toEqual(new Uint8Array([1, 2, 3]));
    const [frameUrl, frameInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(frameUrl).toMatch(/^https:\/\/image\.mux\.com\/.+\/thumbnail\.jpg\?token=/);
    expect(frameInit.signal).toBeInstanceOf(AbortSignal);

    // Nothing deletes a Social asset: a 4xx is configuration, not a gone frame.
    for (const status of [400, 403, 404, 410, 429, 500]) {
      fetchMock.mockResolvedValueOnce(new Response("", { status }));
      await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).rejects.toThrow(
        `Mux image request failed (${status})`,
      );
    }
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array(), { status: 200 }));
    await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).rejects.toThrow("no bytes");
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(fetchSocialMuxFrame(PLAYBACK_ID, { time: 3, width: 768 })).rejects.toThrow("fetch failed");

    // Only an id that is not a Mux id reads nothing, without a request.
    const calls = fetchMock.mock.calls.length;
    await expect(fetchSocialMuxFrame("not a mux id", { time: 3, width: 768 })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });
});
