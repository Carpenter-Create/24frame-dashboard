import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import {
  ACRCLOUD_IDENTIFY_PATH,
  acrCloudEndpoint,
  acrCloudSignature,
  acrCloudStringToSign,
  createAcrCloudAdapter,
  normalizeAcrCloudBody,
  silenceWav,
} from "@/lib/social-music-acrcloud";
import { decideMusicScan } from "@/lib/social-music-scan";

const ACCESS_KEY = "access-key";
const ACCESS_SECRET = "access-secret";
const TIMESTAMP = "1700000000";

function matchBody(score: number | undefined, extra: Record<string, unknown> = {}) {
  return {
    status: { code: 0, msg: "Success" },
    metadata: {
      music: [
        {
          title: "Fixture Track",
          score,
          acrid: "acr-1",
          label: "Fixture Label",
          artists: [{ name: "Fixture Artist" }],
          album: { name: "Fixture Album" },
          external_ids: { isrc: "USFIX0000001" },
          ...extra,
        },
      ],
    },
  };
}

describe("ACRCloud signing", () => {
  it("signs the official identify string with HMAC-SHA1", () => {
    const stringToSign = ["POST", "/v1/identify", ACCESS_KEY, "audio", "1", TIMESTAMP].join("\n");
    const expected = createHmac("sha1", ACCESS_SECRET).update(stringToSign).digest("base64");
    expect(acrCloudStringToSign({ accessKey: ACCESS_KEY, timestamp: TIMESTAMP })).toBe(stringToSign);
    expect(
      acrCloudSignature({ accessKey: ACCESS_KEY, accessSecret: ACCESS_SECRET, timestamp: TIMESTAMP }),
    ).toBe(expected);
  });

  it("accepts a hostname and rejects a path", () => {
    expect(acrCloudEndpoint("https://identify-eu-west-1.acrcloud.com/")).toBe(
      `https://identify-eu-west-1.acrcloud.com${ACRCLOUD_IDENTIFY_PATH}`,
    );
    expect(() => acrCloudEndpoint("identify.example.com/v1")).toThrow(/ACRCLOUD_HOST/);
  });
});

describe("normalizeAcrCloudBody", () => {
  it("maps a confident match without treating the title as end-user copy", () => {
    expect(normalizeAcrCloudBody(matchBody(91))).toEqual({
      kind: "match",
      code: 0,
      score: 91,
      title: "Fixture Track",
      artist: "Fixture Artist",
      album: "Fixture Album",
      acrid: "acr-1",
      isrc: "USFIX0000001",
      label: "Fixture Label",
    });
  });

  it("keeps the highest score when several music rows return", () => {
    const body = matchBody(40);
    body.metadata.music.push({
      title: "Higher",
      score: 88,
      acrid: "acr-2",
      label: "Other Label",
      artists: [{ name: "Other" }],
      album: { name: "Other Album" },
      external_ids: { isrc: "USFIX0000002" },
    });
    const result = normalizeAcrCloudBody(body);
    expect(result.kind).toBe("match");
    if (result.kind === "match") expect(result.score).toBe(88);
  });

  it("ignores custom_files and never lets a bucket hit allow a music score at the block line", () => {
    const bucket = [{ score: 100, title: "COM_01", audio_id: "32978" }];
    const onlyBucket = normalizeAcrCloudBody({
      status: { code: 0, msg: "Success" },
      metadata: { music: [], custom_files: bucket },
    });
    expect(onlyBucket).toEqual({ kind: "no_match", code: 0 });
    expect(decideMusicScan({ result: onlyBucket })).toBe("allow");

    const under = normalizeAcrCloudBody({
      status: { code: 0, msg: "Success" },
      metadata: { music: [{ title: "Low", score: 24 }], custom_files: bucket },
    });
    expect(under.kind).toBe("match");
    if (under.kind === "match") expect(under.score).toBe(24);
    expect(decideMusicScan({ result: under })).toBe("allow");

    const atLine = normalizeAcrCloudBody({
      status: { code: 0, msg: "Success" },
      metadata: { music: [{ title: "Catalog", score: 25, artists: [{ name: "Artist" }] }], custom_files: bucket },
    });
    expect(atLine.kind).toBe("match");
    if (atLine.kind === "match") {
      expect(atLine.score).toBe(25);
      expect(atLine.title).toBe("Catalog");
    }
    expect(decideMusicScan({ result: atLine })).toBe("block");

    const both = normalizeAcrCloudBody({
      status: { code: 0, msg: "Success" },
      metadata: { music: [{ title: "Catalog", score: 100 }], custom_files: bucket },
    });
    expect(both.kind).toBe("match");
    if (both.kind === "match") expect(both.title).not.toBe("COM_01");
    expect(decideMusicScan({ result: both })).toBe("block");
  });

  it("treats 1001 and an empty music list as no match", () => {
    expect(normalizeAcrCloudBody({ status: { code: 1001, msg: "No result" } })).toEqual({
      kind: "no_match",
      code: 1001,
    });
    expect(normalizeAcrCloudBody({ status: { code: 0, msg: "Success" }, metadata: { music: [] } })).toEqual({
      kind: "no_match",
      code: 0,
    });
  });

  it("retries when a hit has no score", () => {
    expect(normalizeAcrCloudBody(matchBody(undefined))).toEqual({
      kind: "error",
      code: "missing_score",
      retryable: true,
    });
  });

  it("retries known ACRCloud error codes", () => {
    for (const code of [2004, 2005, 3001, 3014]) {
      expect(normalizeAcrCloudBody({ status: { code, msg: "error" } })).toEqual({
        kind: "error",
        code: String(code),
        retryable: true,
      });
    }
  });

  it("retries an unreadable body", () => {
    expect(normalizeAcrCloudBody(null)).toEqual({
      kind: "error",
      code: "invalid_response",
      retryable: true,
    });
  });
});

describe("createAcrCloudAdapter", () => {
  const audio = new Uint8Array([1, 2, 3]);

  function adapter(fetchImpl: typeof fetch) {
    return createAcrCloudAdapter({
      host: "identify-eu-west-1.acrcloud.com",
      accessKey: ACCESS_KEY,
      accessSecret: ACCESS_SECRET,
      fetchImpl,
      now: () => Number(TIMESTAMP) * 1000,
    });
  }

  it("posts the signed multipart sample and normalizes the body", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.get("access_key")).toBe(ACCESS_KEY);
      expect(form.get("sample_bytes")).toBe("3");
      expect(form.get("data_type")).toBe("audio");
      expect(form.get("signature_version")).toBe("1");
      expect(form.get("timestamp")).toBe(TIMESTAMP);
      const expected = createHmac("sha1", ACCESS_SECRET)
        .update(["POST", "/v1/identify", ACCESS_KEY, "audio", "1", TIMESTAMP].join("\n"))
        .digest("base64");
      expect(form.get("signature")).toBe(expected);
      const sample = form.get("sample");
      expect(sample).toBeInstanceOf(Blob);
      expect(new Uint8Array(await (sample as Blob).arrayBuffer())).toEqual(audio);
      return new Response(JSON.stringify(matchBody(80)), { status: 200 });
    });
    const result = await adapter(fetchImpl as typeof fetch).identify(audio);
    expect(result.kind).toBe("match");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://identify-eu-west-1.acrcloud.com/v1/identify",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retries HTTP errors, invalid JSON, and timeouts", async () => {
    const http = adapter(vi.fn(async () => new Response("no", { status: 500 })) as typeof fetch);
    await expect(http.identify(audio)).resolves.toEqual({
      kind: "error",
      code: "http_500",
      retryable: true,
    });

    const badJson = adapter(
      vi.fn(async () => new Response("not-json", { status: 200 })) as typeof fetch,
    );
    await expect(badJson.identify(audio)).resolves.toEqual({
      kind: "error",
      code: "invalid_response",
      retryable: true,
    });

    const timeout = adapter(
      vi.fn(async () => {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      }) as typeof fetch,
    );
    await expect(timeout.identify(audio)).resolves.toEqual({
      kind: "error",
      code: "timeout",
      retryable: true,
    });
  });

  it("builds a silence WAV for the dry-run probe", () => {
    const wav = silenceWav(8);
    expect(Buffer.from(wav.subarray(0, 4)).toString()).toBe("RIFF");
    expect(Buffer.from(wav.subarray(8, 12)).toString()).toBe("WAVE");
    expect(wav.byteLength).toBe(44 + 16);
  });
});
