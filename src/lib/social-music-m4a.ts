import { SOCIAL_MUSIC_AUDIO_MAX_BYTES } from "@/lib/social-music-audio";

// Static audio.m4a is the whole rendition. Mux instant-clip claims
// (asset_start_time / asset_end_time) trim HLS playback, not this file.
// Each identify window is the AAC frames whose sample time overlaps it.

const M4A_PROBE_BYTES = 64 * 1024;
const M4A_MOOV_MAX_BYTES = 8 * 1024 * 1024;
const SOCIAL_MUSIC_M4A_MAX_BYTES = 32 * 1024 * 1024;
const M4A_MAX_RANGES = 32;

export type M4aAudioWindow = { startSeconds: number; endSeconds: number };

type ByteReader = (start: number, end: number) => Uint8Array;

type Sample = { offset: number; size: number; startTick: number; durationTicks: number };

type AudioIndex = {
  config: Uint8Array;
  timescale: number;
  samples: Sample[];
};

type Box = { type: string; start: number; size: number; headerSize: number };

type Slice = { data: Uint8Array; wholeFile: boolean; total: number | null };

export type ReadM4aAudioWindowOptions = {
  fetchImpl?: typeof fetch;
  probeBytes?: number;
  maxBytes?: number;
};

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}

function fourcc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}

function readBoxHeader(
  bytes: Uint8Array,
  offset: number,
  limit: number,
  filePos: number,
  total: number | null,
): Box | null {
  if (offset + 8 > bytes.length || offset + 8 > limit) return null;
  const size32 = u32(bytes, offset);
  const type = fourcc(bytes, offset + 4);
  if (size32 === 1) {
    if (offset + 16 > bytes.length || offset + 16 > limit) return null;
    const hi = u32(bytes, offset + 8);
    const lo = u32(bytes, offset + 12);
    if (hi !== 0 || lo < 16) return null;
    return { type, start: offset, size: lo, headerSize: 16 };
  }
  if (size32 === 0) {
    const abs = filePos + offset;
    if (total == null || total < abs + 8) return null;
    return { type, start: offset, size: total - abs, headerSize: 8 };
  }
  if (size32 < 8) return null;
  return { type, start: offset, size: size32, headerSize: 8 };
}

function boxEnd(box: Box, limit: number): number | null {
  const end = box.start + box.size;
  if (box.size < box.headerSize || end < box.start || end > limit) return null;
  return end;
}

function children(bytes: Uint8Array, parent: Box): Box[] {
  const parentEnd = boxEnd(parent, parent.start + parent.size);
  if (parentEnd == null) return [];
  const found: Box[] = [];
  let offset = parent.start + parent.headerSize;
  while (offset + 8 <= parentEnd) {
    const child = readBoxHeader(bytes, offset, parentEnd, 0, null);
    if (!child) break;
    const end = boxEnd(child, parentEnd);
    if (end == null) break;
    found.push(child);
    offset = end;
  }
  return found;
}

function findChild(bytes: Uint8Array, parent: Box, type: string): Box | null {
  return children(bytes, parent).find((child) => child.type === type) ?? null;
}

function body(bytes: Uint8Array, box: Box): Uint8Array {
  return bytes.subarray(box.start + box.headerSize, box.start + box.size);
}

function readDescriptor(
  bytes: Uint8Array,
  offset: number,
  limit: number,
): { tag: number; start: number; next: number } | null {
  if (offset >= limit) return null;
  const tag = bytes[offset] ?? 0;
  let pos = offset + 1;
  let length = 0;
  let continued = true;
  for (let i = 0; i < 4 && continued; i += 1) {
    if (pos >= limit) return null;
    const byte = bytes[pos] ?? 0;
    pos += 1;
    length = (length << 7) | (byte & 0x7f);
    continued = (byte & 0x80) !== 0;
  }
  const start = pos;
  const next = start + length;
  if (next > limit || next < start) return null;
  return { tag, start, next };
}

/** Skip the fixed fields that precede child descriptors. */
function descriptorChildren(tag: number, bytes: Uint8Array, start: number, end: number): number {
  if (tag === 0x03) {
    if (start + 3 > end) return end;
    let pos = start + 2;
    const flags = bytes[pos] ?? 0;
    pos += 1;
    if ((flags & 0x80) !== 0) pos += 2;
    if ((flags & 0x40) !== 0) {
      const urlLength = bytes[pos] ?? 0;
      pos += 1 + urlLength;
    }
    if ((flags & 0x20) !== 0) pos += 2;
    return pos;
  }
  if (tag === 0x04) return Math.min(end, start + 13);
  return start;
}

function audioSpecificConfig(esds: Uint8Array): Uint8Array {
  const walk = (offset: number, limit: number): Uint8Array | null => {
    let pos = offset;
    while (pos < limit) {
      const desc = readDescriptor(esds, pos, limit);
      if (!desc || desc.next <= pos) return null;
      if (desc.tag === 0x05) return esds.subarray(desc.start, desc.next);
      if (desc.tag === 0x03 || desc.tag === 0x04) {
        const nested = walk(descriptorChildren(desc.tag, esds, desc.start, desc.next), desc.next);
        if (nested) return nested;
      }
      pos = desc.next;
    }
    return null;
  };
  const config = walk(4, esds.length);
  if (!config || config.length < 2) throw new Error("audio specific config is missing");
  return config;
}

function parseAacConfig(config: Uint8Array): { audioObjectType: number; frequencyIndex: number; channels: number } {
  const first = config[0] ?? 0;
  const second = config[1] ?? 0;
  const audioObjectType = (first >> 3) & 0x1f;
  const frequencyIndex = ((first & 0x07) << 1) | (second >> 7);
  const channels = (second >> 3) & 0x0f;
  if (audioObjectType < 1 || audioObjectType > 4) throw new Error("audio codec is not AAC-LC");
  if (frequencyIndex < 0 || frequencyIndex > 12) throw new Error("audio sample rate is missing");
  if (channels < 1 || channels > 7) throw new Error("audio channel count is missing");
  return { audioObjectType, frequencyIndex, channels };
}

function mp4aConfig(bytes: Uint8Array, entry: Box): Uint8Array {
  const entryEnd = boxEnd(entry, entry.start + entry.size);
  if (entryEnd == null) throw new Error("audio sample entry is truncated");
  let offset = entry.start + 36;
  while (offset + 8 <= entryEnd) {
    const child = readBoxHeader(bytes, offset, entryEnd, 0, null);
    if (!child) break;
    const end = boxEnd(child, entryEnd);
    if (end == null) break;
    if (child.type === "esds") return audioSpecificConfig(body(bytes, child));
    offset = end;
  }
  throw new Error("audio specific config is missing");
}

function parseMdhd(bytes: Uint8Array, box: Box): number {
  const data = body(bytes, box);
  const version = data[0] ?? 0;
  const timescaleAt = version === 1 ? 20 : 12;
  if (data.length < timescaleAt + 4) throw new Error("audio timescale is missing");
  const timescale = u32(data, timescaleAt);
  if (timescale <= 0) throw new Error("audio timescale is missing");
  return timescale;
}

function parseStts(bytes: Uint8Array, box: Box): { count: number; delta: number }[] {
  const data = body(bytes, box);
  if (data.length < 8) throw new Error("audio time table is missing");
  const count = u32(data, 4);
  const rows: { count: number; delta: number }[] = [];
  if (8 + count * 8 > data.length) throw new Error("audio time table is truncated");
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * 8;
    rows.push({ count: u32(data, at), delta: u32(data, at + 4) });
  }
  return rows;
}

function parseStsc(bytes: Uint8Array, box: Box): { firstChunk: number; samplesPerChunk: number }[] {
  const data = body(bytes, box);
  if (data.length < 8) throw new Error("audio chunk table is missing");
  const count = u32(data, 4);
  const rows: { firstChunk: number; samplesPerChunk: number }[] = [];
  if (8 + count * 12 > data.length) throw new Error("audio chunk table is truncated");
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * 12;
    rows.push({ firstChunk: u32(data, at), samplesPerChunk: u32(data, at + 4) });
  }
  return rows;
}

function parseStsz(bytes: Uint8Array, box: Box): number[] {
  const data = body(bytes, box);
  if (data.length < 12) throw new Error("audio sample sizes are missing");
  const constant = u32(data, 4);
  const count = u32(data, 8);
  if (constant > 0) return Array.from({ length: count }, () => constant);
  if (12 + count * 4 > data.length) throw new Error("audio sample sizes are truncated");
  const sizes: number[] = [];
  for (let index = 0; index < count; index += 1) sizes.push(u32(data, 12 + index * 4));
  return sizes;
}

function parseChunkOffsets(bytes: Uint8Array, box: Box): number[] {
  const data = body(bytes, box);
  if (data.length < 8) throw new Error("audio chunk offsets are missing");
  const count = u32(data, 4);
  const wide = box.type === "co64";
  const width = wide ? 8 : 4;
  if (8 + count * width > data.length) throw new Error("audio chunk offsets are truncated");
  const offsets: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * width;
    if (wide) {
      if (u32(data, at) !== 0) throw new Error("audio file is too large");
      offsets.push(u32(data, at + 4));
    } else {
      offsets.push(u32(data, at));
    }
  }
  return offsets;
}

function samplesPerChunk(chunk: number, rows: { firstChunk: number; samplesPerChunk: number }[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.firstChunk > chunk) break;
    count = row.samplesPerChunk;
  }
  if (count <= 0) throw new Error("audio chunk has no samples");
  return count;
}

function placeSamples(
  sizes: number[],
  offsets: number[],
  stsc: { firstChunk: number; samplesPerChunk: number }[],
  stts: { count: number; delta: number }[],
): Sample[] {
  const samples: Sample[] = [];
  let sampleIndex = 0;
  let tick = 0;
  let timing = 0;
  let timingLeft = stts[0]?.count ?? 0;
  for (let chunk = 1; chunk <= offsets.length && sampleIndex < sizes.length; chunk += 1) {
    const perChunk = samplesPerChunk(chunk, stsc);
    let offset = offsets[chunk - 1] ?? 0;
    for (let index = 0; index < perChunk && sampleIndex < sizes.length; index += 1) {
      const size = sizes[sampleIndex] ?? 0;
      const delta = stts[timing]?.delta ?? 0;
      if (size <= 0 || delta <= 0) throw new Error("audio sample table is invalid");
      samples.push({ offset, size, startTick: tick, durationTicks: delta });
      offset += size;
      tick += delta;
      sampleIndex += 1;
      timingLeft -= 1;
      if (timingLeft === 0) {
        timing += 1;
        timingLeft = stts[timing]?.count ?? 0;
      }
    }
  }
  if (sampleIndex !== sizes.length) throw new Error("audio sample table is incomplete");
  return samples;
}

function parseAudioTrak(bytes: Uint8Array, trak: Box): AudioIndex | null {
  const mdia = findChild(bytes, trak, "mdia");
  if (!mdia) return null;
  const hdlr = findChild(bytes, mdia, "hdlr");
  if (!hdlr) return null;
  const handler = body(bytes, hdlr);
  if (handler.length < 12 || fourcc(handler, 8) !== "soun") return null;
  const mdhd = findChild(bytes, mdia, "mdhd");
  const minf = findChild(bytes, mdia, "minf");
  if (!mdhd || !minf) throw new Error("audio track is incomplete");
  const stbl = findChild(bytes, minf, "stbl");
  if (!stbl) throw new Error("audio track is incomplete");
  const stsd = findChild(bytes, stbl, "stsd");
  const sttsBox = findChild(bytes, stbl, "stts");
  const stscBox = findChild(bytes, stbl, "stsc");
  const stszBox = findChild(bytes, stbl, "stsz");
  const stcoBox = findChild(bytes, stbl, "stco") ?? findChild(bytes, stbl, "co64");
  if (!stsd || !sttsBox || !stscBox || !stszBox || !stcoBox) throw new Error("audio track is incomplete");
  const stsdBody = body(bytes, stsd);
  if (stsdBody.length < 8) throw new Error("audio sample entry is missing");
  const entryCount = u32(stsdBody, 4);
  if (entryCount < 1) throw new Error("audio sample entry is missing");
  const entry = readBoxHeader(bytes, stsd.start + stsd.headerSize + 8, stsd.start + stsd.size, 0, null);
  if (!entry || entry.type !== "mp4a") throw new Error("audio sample entry is not AAC");
  const config = mp4aConfig(bytes, entry);
  parseAacConfig(config);
  return {
    config,
    timescale: parseMdhd(bytes, mdhd),
    samples: placeSamples(
      parseStsz(bytes, stszBox),
      parseChunkOffsets(bytes, stcoBox),
      parseStsc(bytes, stscBox),
      parseStts(bytes, sttsBox),
    ),
  };
}

function parseM4aAudioIndex(bytes: Uint8Array): AudioIndex {
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const box = readBoxHeader(bytes, offset, bytes.length, 0, bytes.length);
    if (!box) break;
    const end = boxEnd(box, bytes.length);
    if (end == null) break;
    if (box.type === "moov") {
      for (const trak of children(bytes, box)) {
        if (trak.type !== "trak") continue;
        const audio = parseAudioTrak(bytes, trak);
        if (audio) return audio;
      }
      throw new Error("audio track is missing");
    }
    offset = end;
  }
  throw new Error("audio moov is missing");
}

function windowTicks(window: M4aAudioWindow, timescale: number): { start: number; end: number } {
  if (!Number.isFinite(window.startSeconds) || !Number.isFinite(window.endSeconds) || window.endSeconds <= window.startSeconds) {
    throw new Error("audio window is invalid");
  }
  const start = Math.round(window.startSeconds * timescale);
  const end = Math.round(window.endSeconds * timescale);
  if (end <= start) throw new Error("audio window is invalid");
  return { start, end };
}

function framesInWindow(index: AudioIndex, window: M4aAudioWindow): Sample[] {
  const ticks = windowTicks(window, index.timescale);
  const frames = index.samples.filter(
    (sample) => sample.startTick < ticks.end && sample.startTick + sample.durationTicks > ticks.start,
  );
  if (frames.length === 0) throw new Error("audio window is empty");
  const bytes = frames.reduce((sum, frame) => sum + frame.size + 7, 0);
  if (bytes > SOCIAL_MUSIC_AUDIO_MAX_BYTES) throw new Error("audio window exceeds the sample cap");
  return frames;
}

function adtsHeader(config: Uint8Array, frameLength: number): Uint8Array {
  const parsed = parseAacConfig(config);
  const profile = parsed.audioObjectType - 1;
  const header = new Uint8Array(7);
  header[0] = 0xff;
  header[1] = 0xf1;
  header[2] = ((profile & 0x3) << 6) | ((parsed.frequencyIndex & 0xf) << 2) | ((parsed.channels >> 2) & 0x1);
  header[3] = ((parsed.channels & 0x3) << 6) | ((frameLength >> 11) & 0x3);
  header[4] = (frameLength >> 3) & 0xff;
  header[5] = ((frameLength & 0x7) << 5) | 0x1f;
  header[6] = 0xfc;
  return header;
}

function wrapAdts(config: Uint8Array, frames: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [];
  let total = 0;
  for (const frame of frames) {
    const length = frame.byteLength + 7;
    if (length >= 8192) throw new Error("audio frame is too large");
    const header = adtsHeader(config, length);
    parts.push(header, frame);
    total += length;
  }
  if (total === 0 || total > SOCIAL_MUSIC_AUDIO_MAX_BYTES) throw new Error("audio window exceeds the sample cap");
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function readExact(read: ByteReader, start: number, end: number): Uint8Array {
  if (start < 0 || end < start) throw new Error("audio sample is outside the file");
  const bytes = read(start, end);
  if (bytes.byteLength !== end - start) throw new Error("audio sample is outside the file");
  return bytes;
}

/** AAC ADTS for the frames that overlap `window`. `file` is a whole audio.m4a. */
export function clipM4aAudioWindow(file: Uint8Array, window: M4aAudioWindow): Uint8Array {
  const index = parseM4aAudioIndex(file);
  const frames = framesInWindow(index, window);
  return wrapAdts(
    index.config,
    frames.map((frame) => readExact((start, end) => file.subarray(start, end), frame.offset, frame.offset + frame.size)),
  );
}

function parseContentRange(header: string | null): { start: number; end: number; total: number | null } | null {
  if (!header) return null;
  const match = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(header.trim());
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = match[3] === "*" ? null : Number(match[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  if (total != null && (!Number.isFinite(total) || total < end + 1)) return null;
  return { start, end, total };
}

async function readAtMost(response: Response, maxBytes: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) return { bytes: bytes.subarray(0, maxBytes), truncated: true };
    return { bytes, truncated: false };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (total <= maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value || value.byteLength === 0) continue;
    const room = maxBytes - total;
    if (value.byteLength > room) {
      chunks.push(value.subarray(0, Math.max(0, room)));
      total += Math.max(0, room);
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes: out, truncated };
}

async function readSlice(
  url: string,
  start: number,
  endInclusive: number,
  fetchImpl: typeof fetch,
  maxBytes: number,
): Promise<Slice> {
  const response = await fetchImpl(url, {
    headers: { Range: `bytes=${start}-${endInclusive}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 206) {
    const range = parseContentRange(response.headers.get("content-range"));
    const body = await readAtMost(response, maxBytes);
    if (body.truncated || body.bytes.byteLength === 0 || !range || range.start !== start) {
      throw new Error(body.truncated ? "audio range exceeded the read cap" : "audio range is incomplete");
    }
    const wholeFile = range.start === 0 && range.total != null && body.bytes.byteLength === range.total;
    return { data: body.bytes, wholeFile, total: range.total };
  }
  if (response.status === 200) {
    if (start !== 0) throw new Error("audio host ignored the byte range");
    const body = await readAtMost(response, maxBytes);
    if (body.truncated) throw new Error("audio file exceeded the read cap");
    if (body.bytes.byteLength === 0) throw new Error("audio fetch returned no bytes");
    return { data: body.bytes, wholeFile: true, total: body.bytes.byteLength };
  }
  throw new Error(`audio fetch failed (${response.status})`);
}

type MoovScan =
  | { kind: "found"; start: number; size: number }
  | { kind: "need"; offset: number }
  | { kind: "missing" };

function scanForMoov(prefix: Uint8Array, filePos: number, total: number | null): MoovScan {
  let offset = 0;
  while (offset + 8 <= prefix.length) {
    const box = readBoxHeader(prefix, offset, prefix.length, filePos, total);
    if (!box) {
      if (offset + 8 <= prefix.length && u32(prefix, offset) === 1) return { kind: "need", offset: filePos + offset };
      return { kind: "missing" };
    }
    const absolute = filePos + offset;
    if (box.type === "moov") return { kind: "found", start: absolute, size: box.size };
    const next = offset + box.size;
    if (next <= offset) return { kind: "missing" };
    if (next > prefix.length) return { kind: "need", offset: absolute + box.size };
    offset = next;
  }
  if (offset < prefix.length) return { kind: "need", offset: filePos + offset };
  return { kind: "missing" };
}

async function loadMoov(
  url: string,
  first: Slice,
  fetchImpl: typeof fetch,
  probeBytes: number,
  maxBytes: number,
): Promise<Uint8Array> {
  let prefix = first.data;
  let filePos = 0;
  let total = first.total;
  for (let hop = 0; hop < 6; hop += 1) {
    const located = scanForMoov(prefix, filePos, total);
    if (located.kind === "found") {
      const localStart = located.start - filePos;
      const localEnd = localStart + located.size;
      if (localStart >= 0 && localEnd <= prefix.length) return prefix.subarray(localStart, localEnd);
      if (located.size > M4A_MOOV_MAX_BYTES) throw new Error("audio moov is too large");
      const moov = await readSlice(
        url,
        located.start,
        located.start + located.size - 1,
        fetchImpl,
        Math.min(maxBytes, M4A_MOOV_MAX_BYTES),
      );
      if (moov.data.byteLength < located.size) throw new Error("audio moov is incomplete");
      return moov.data.subarray(0, located.size);
    }
    if (located.kind === "need") {
      const next = await readSlice(url, located.offset, located.offset + probeBytes - 1, fetchImpl, probeBytes);
      prefix = next.data;
      filePos = located.offset;
      total = next.total ?? total;
      continue;
    }
    throw new Error("audio moov is missing");
  }
  throw new Error("audio moov is missing");
}

function mergedFrameRanges(frames: Sample[]): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  for (const frame of frames) {
    const start = frame.offset;
    const end = frame.offset + frame.size;
    const last = ranges[ranges.length - 1];
    if (last && last.end === start) last.end = end;
    else ranges.push({ start, end });
  }
  if (ranges.length > M4A_MAX_RANGES) throw new Error("audio window is fragmented");
  return ranges;
}

/**
 * One identify window from a signed static audio.m4a URL.
 * A complete 200 body is clipped locally. A byte range is used otherwise,
 * and a prefix is never treated as a later window.
 */
export async function readM4aAudioWindow(
  url: string,
  window: M4aAudioWindow,
  options?: ReadM4aAudioWindowOptions,
): Promise<Uint8Array> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const probeBytes = options?.probeBytes ?? M4A_PROBE_BYTES;
  const maxBytes = options?.maxBytes ?? SOCIAL_MUSIC_M4A_MAX_BYTES;
  const first = await readSlice(url, 0, Math.max(0, probeBytes - 1), fetchImpl, maxBytes);
  if (first.wholeFile) return clipM4aAudioWindow(first.data, window);
  const moov = await loadMoov(url, first, fetchImpl, probeBytes, maxBytes);
  const index = parseM4aAudioIndex(moov);
  const frames = framesInWindow(index, window);
  const ranges = mergedFrameRanges(frames);
  const chunks: Uint8Array[] = [];
  for (const range of ranges) {
    const slice = await readSlice(url, range.start, range.end - 1, fetchImpl, SOCIAL_MUSIC_AUDIO_MAX_BYTES);
    if (slice.data.byteLength !== range.end - range.start) throw new Error("audio window is incomplete");
    chunks.push(slice.data);
  }
  const packed = new Uint8Array(frames.reduce((sum, frame) => sum + frame.size, 0));
  let offset = 0;
  for (const chunk of chunks) {
    packed.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const parts: Uint8Array[] = [];
  let cursor = 0;
  for (const frame of frames) {
    parts.push(packed.subarray(cursor, cursor + frame.size));
    cursor += frame.size;
  }
  return wrapAdts(index.config, parts);
}
