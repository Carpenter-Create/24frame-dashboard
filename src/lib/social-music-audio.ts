// Mux-native audio for the music scan. The worker asks for an audio-only
// static rendition once the asset is ready, then reads audio.m4a.

/** One identify window stays under ACRCloud's 5 MB sample cap. */
export const SOCIAL_MUSIC_AUDIO_MAX_BYTES = 5 * 1024 * 1024;

export type MuxAudioFile = {
  name?: string;
  ext?: string;
  status?: string;
  resolution?: string;
};

export type MuxAudioAsset = {
  status?: string | null;
  duration?: number | null;
  static_renditions?: { files?: MuxAudioFile[] } | MuxAudioFile[] | null;
};

export type MuxAudioRenditionState =
  | "asset_preparing"
  | "asset_errored"
  | "rendition_missing"
  | "rendition_preparing"
  | "rendition_errored"
  | "ready";

function renditionFiles(asset: MuxAudioAsset): MuxAudioFile[] {
  const raw = asset.static_renditions;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.files)) return raw.files;
  return [];
}

function isAudioFile(file: MuxAudioFile): boolean {
  return file.resolution === "audio-only" || file.name === "audio.m4a" || file.ext === "m4a";
}

export function muxAudioRenditionState(asset: MuxAudioAsset): MuxAudioRenditionState {
  if (asset.status === "errored") return "asset_errored";
  if (asset.status !== "ready") return "asset_preparing";
  const audio = renditionFiles(asset).filter(isAudioFile);
  if (audio.length === 0) return "rendition_missing";
  if (audio.some((file) => file.status === "ready")) return "ready";
  // skipped and errored stay held. Phase 0 does not treat a silent or
  // skipped clip as clean. The worker retries, then the staff queue
  // lists the row as Unfinished. The video does not go live.
  if (audio.some((file) => file.status === "errored" || file.status === "skipped")) {
    return "rendition_errored";
  }
  return "rendition_preparing";
}

/** Already requested or in progress is a poll, not a failed attempt. */
export function muxAudioRenditionRequestSettled(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : NaN;
  const message = error instanceof Error ? error.message : "";
  if (status === 409) return true;
  return /already exists|already requested|already been requested|in progress/i.test(message);
}

export async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.ok) {
    throw new Error(`audio fetch failed (${response.status})`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error("audio fetch returned no bytes");
    return bytes.byteLength > maxBytes ? bytes.subarray(0, maxBytes) : bytes;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;
    const room = maxBytes - total;
    const slice = value.byteLength > room ? value.subarray(0, room) : value;
    chunks.push(slice);
    total += slice.byteLength;
    if (value.byteLength > room) {
      await reader.cancel();
      break;
    }
  }
  if (total === 0) throw new Error("audio fetch returned no bytes");
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
