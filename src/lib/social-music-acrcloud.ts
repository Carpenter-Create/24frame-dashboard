import { createHmac } from "node:crypto";

import type { MusicFingerprintAdapter, MusicIdentifyResult, MusicMatchFields } from "@/lib/social-music-scan";

// ACRCloud identify (HMAC-SHA1). Host, access key, and access secret come
// from env. AudD is not implemented; MusicFingerprintAdapter is the seam.

export const ACRCLOUD_IDENTIFY_PATH = "/v1/identify";
export const ACRCLOUD_DATA_TYPE = "audio";
export const ACRCLOUD_SIGNATURE_VERSION = "1";
export const ACRCLOUD_TIMEOUT_MS = 15_000;

export type AcrCloudConfig = {
  host: string;
  accessKey: string;
  accessSecret: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

type AcrMusic = {
  title?: string;
  score?: number;
  acrid?: string;
  label?: string;
  artists?: Array<{ name?: string }>;
  album?: { name?: string };
  external_ids?: { isrc?: string };
};

type AcrBody = {
  status?: { code?: number; msg?: string };
  metadata?: {
    music?: AcrMusic[];
    /** Bucket hits (for example 32978). Phase 0 does not read them. */
    custom_files?: unknown;
  };
};

/**
 * Official identify string-to-sign:
 * METHOD\nURI\nACCESS_KEY\nDATA_TYPE\nSIGNATURE_VERSION\nTIMESTAMP
 */
export function acrCloudStringToSign(input: {
  accessKey: string;
  timestamp: string;
  method?: string;
  uri?: string;
  dataType?: string;
  signatureVersion?: string;
}): string {
  return [
    input.method ?? "POST",
    input.uri ?? ACRCLOUD_IDENTIFY_PATH,
    input.accessKey,
    input.dataType ?? ACRCLOUD_DATA_TYPE,
    input.signatureVersion ?? ACRCLOUD_SIGNATURE_VERSION,
    input.timestamp,
  ].join("\n");
}

export function acrCloudSignature(input: {
  accessKey: string;
  accessSecret: string;
  timestamp: string;
}): string {
  return createHmac("sha1", input.accessSecret)
    .update(acrCloudStringToSign({ accessKey: input.accessKey, timestamp: input.timestamp }))
    .digest("base64");
}

export function acrCloudEndpoint(host: string): string {
  const trimmed = host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!trimmed || !/^[A-Za-z0-9.-]+$/.test(trimmed)) {
    throw new Error("ACRCLOUD_HOST is invalid");
  }
  return `https://${trimmed}${ACRCLOUD_IDENTIFY_PATH}`;
}

function textOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function matchFields(top: AcrMusic, score: number): MusicMatchFields {
  const artist = (top.artists ?? [])
    .map((entry) => textOrNull(entry.name))
    .filter((name): name is string => !!name)
    .join(", ");
  return {
    score,
    title: textOrNull(top.title),
    artist: artist || null,
    album: textOrNull(top.album?.name),
    acrid: textOrNull(top.acrid),
    isrc: textOrNull(top.external_ids?.isrc),
    label: textOrNull(top.label),
  };
}

/**
 * Map an ACRCloud JSON body from metadata.music only.
 * 1001 and an empty music list are no-match.
 * metadata.custom_files is ignored and cannot allow a clip.
 */
export function normalizeAcrCloudBody(body: AcrBody | null): MusicIdentifyResult {
  const code = body?.status?.code;
  if (typeof code !== "number") {
    return { kind: "error", code: "invalid_response", retryable: true };
  }
  if (code === 1001) return { kind: "no_match", code };
  if (code !== 0) return { kind: "error", code: String(code), retryable: true };
  const music = body?.metadata?.music ?? [];
  if (music.length === 0) return { kind: "no_match", code };
  const top = [...music].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  if (!top || typeof top.score !== "number" || !Number.isFinite(top.score)) {
    return { kind: "error", code: "missing_score", retryable: true };
  }
  return { kind: "match", code, ...matchFields(top, top.score) };
}

export function createAcrCloudAdapter(config: AcrCloudConfig): MusicFingerprintAdapter {
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? Date.now;
  const timeoutMs = config.timeoutMs ?? ACRCLOUD_TIMEOUT_MS;
  const endpoint = acrCloudEndpoint(config.host);
  return {
    vendor: "acrcloud",
    async identify(audio: Uint8Array): Promise<MusicIdentifyResult> {
      const timestamp = String(Math.floor(now() / 1000));
      const signature = acrCloudSignature({
        accessKey: config.accessKey,
        accessSecret: config.accessSecret,
        timestamp,
      });
      const form = new FormData();
      form.set("sample", new Blob([new Uint8Array(audio)]), "sample.bin");
      form.set("sample_bytes", String(audio.byteLength));
      form.set("access_key", config.accessKey);
      form.set("data_type", ACRCLOUD_DATA_TYPE);
      form.set("signature_version", ACRCLOUD_SIGNATURE_VERSION);
      form.set("signature", signature);
      form.set("timestamp", timestamp);
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "TimeoutError";
        return { kind: "error", code: timedOut ? "timeout" : "network", retryable: true };
      }
      if (!response.ok) {
        return { kind: "error", code: `http_${response.status}`, retryable: true };
      }
      try {
        return normalizeAcrCloudBody((await response.json()) as AcrBody);
      } catch {
        return { kind: "error", code: "invalid_response", retryable: true };
      }
    },
  };
}

/** One second of silence. Dry-run probe only. Not a commercial recording. */
export function silenceWav(sampleRate = 8000): Uint8Array {
  const samples = sampleRate;
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
}

export function classifyAcrProbe(result: MusicIdentifyResult): "ok" | `failed: ${string}` {
  if (result.kind === "error") {
    if (result.code === "1001") return "ok";
    if (result.code === "2004" || result.code === "0") return "ok";
    return `failed: ${result.code}`;
  }
  return "ok";
}
