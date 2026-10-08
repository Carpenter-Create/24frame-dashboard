// Cut a time window out of a downloaded audio.m4a inside the worker.
// Mux static-rendition time claims are not used: they do not trim audio.m4a.
// A file that cannot be parsed fails closed. The caller never identifies it.

export type SocialMusicAudioWindow = { startSeconds: number; endSeconds: number };

type Sample = { offset: number; size: number; duration: number };

type ParsedAudio = {
  timescale: number;
  samples: Sample[];
  ftyp: Uint8Array;
  stsd: Uint8Array;
};

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl"]);

export function sliceSocialMusicAudio(file: Uint8Array, window: SocialMusicAudioWindow): Uint8Array {
  if (!Number.isFinite(window.startSeconds) || !Number.isFinite(window.endSeconds) || window.endSeconds <= window.startSeconds) {
    throw new Error("m4a_unreadable");
  }
  const parsed = parseAudio(file);
  const startTick = Math.round(window.startSeconds * parsed.timescale);
  const endTick = Math.max(startTick + 1, Math.round(window.endSeconds * parsed.timescale));
  let tick = 0;
  const chosen: Sample[] = [];
  for (const sample of parsed.samples) {
    const sampleEnd = tick + sample.duration;
    if (sampleEnd > startTick && tick < endTick) chosen.push(sample);
    tick = sampleEnd;
  }
  if (chosen.length === 0) throw new Error("m4a_window_empty");
  const payload = concat(chosen.map((sample) => copyBytes(file, sample.offset, sample.size)));
  return rebuild(parsed, chosen, payload);
}

function parseAudio(file: Uint8Array): ParsedAudio {
  if (file.byteLength < 8) throw new Error("m4a_unreadable");
  const top = readBoxes(file, 0, file.byteLength);
  const ftyp = top.find((box) => box.type === "ftyp");
  const moov = top.find((box) => box.type === "moov");
  const mdat = top.find((box) => box.type === "mdat");
  if (!ftyp || !moov || !mdat) throw new Error("m4a_unreadable");

  const found: {
    timescale: number;
    stsd: Uint8Array | null;
    stts: { count: number; delta: number }[] | null;
    sizes: number[] | null;
    chunks: number[] | null;
    stsc: { first: number; per: number }[] | null;
  } = { timescale: 0, stsd: null, stts: null, sizes: null, chunks: null, stsc: null };

  const walk = (start: number, end: number) => {
    for (const box of readBoxes(file, start, end)) {
      if (box.type === "mdhd") {
        found.timescale = readMdhdTimescale(file, box.payloadStart, box.end);
      } else if (box.type === "stsd") {
        found.stsd = file.slice(box.start, box.end);
      } else if (box.type === "stts") {
        found.stts = readStts(file, box.payloadStart, box.end);
      } else if (box.type === "stsz") {
        found.sizes = readStsz(file, box.payloadStart, box.end);
      } else if (box.type === "stco") {
        found.chunks = readChunkOffsets(file, box.payloadStart, box.end, 4);
      } else if (box.type === "co64") {
        found.chunks = readChunkOffsets(file, box.payloadStart, box.end, 8);
      } else if (box.type === "stsc") {
        found.stsc = readStsc(file, box.payloadStart, box.end);
      } else if (CONTAINERS.has(box.type)) {
        walk(box.payloadStart, box.end);
      }
    }
  };
  walk(moov.payloadStart, moov.end);

  if (!found.timescale || !found.stsd || !found.stts || !found.sizes || !found.chunks || !found.stsc) {
    throw new Error("m4a_unreadable");
  }
  if (found.sizes.length === 0) throw new Error("m4a_unreadable");
  const durations = expandDurations(found.stts, found.sizes.length);
  const samples = placeSamples(found.sizes, durations, found.chunks, found.stsc);
  for (const sample of samples) {
    if (sample.offset + sample.size > file.byteLength) throw new Error("m4a_unreadable");
  }
  return { timescale: found.timescale, samples, ftyp: file.slice(ftyp.start, ftyp.end), stsd: found.stsd };
}

type Box = { type: string; start: number; payloadStart: number; end: number };

function readBoxes(file: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    const size32 = readU32(file, offset);
    const type = typeAt(file, offset + 4);
    let header = 8;
    let size = size32;
    if (size32 === 1) {
      if (offset + 16 > end) throw new Error("m4a_unreadable");
      const large = readU64(file, offset + 8);
      if (large > Number.MAX_SAFE_INTEGER) throw new Error("m4a_unreadable");
      size = large;
      header = 16;
    } else if (size32 === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) throw new Error("m4a_unreadable");
    boxes.push({ type, start: offset, payloadStart: offset + header, end: offset + size });
    offset += size;
  }
  return boxes;
}

function readMdhdTimescale(file: Uint8Array, start: number, end: number): number {
  const version = file[start] ?? 0;
  const timescaleAt = version === 1 ? start + 20 : start + 12;
  if (timescaleAt + 4 > end) throw new Error("m4a_unreadable");
  const timescale = readU32(file, timescaleAt);
  if (timescale === 0) throw new Error("m4a_unreadable");
  return timescale;
}

function readStts(file: Uint8Array, start: number, end: number): { count: number; delta: number }[] {
  const count = readU32(file, start + 4);
  const entries: { count: number; delta: number }[] = [];
  let offset = start + 8;
  for (let index = 0; index < count; index += 1) {
    if (offset + 8 > end) throw new Error("m4a_unreadable");
    const sampleCount = readU32(file, offset);
    const delta = readU32(file, offset + 4);
    if (sampleCount === 0 || delta === 0) throw new Error("m4a_unreadable");
    entries.push({ count: sampleCount, delta });
    offset += 8;
  }
  return entries;
}

function readStsz(file: Uint8Array, start: number, end: number): number[] {
  const constant = readU32(file, start + 4);
  const count = readU32(file, start + 8);
  if (count === 0) throw new Error("m4a_unreadable");
  if (constant > 0) return Array.from({ length: count }, () => constant);
  const sizes: number[] = [];
  let offset = start + 12;
  for (let index = 0; index < count; index += 1) {
    if (offset + 4 > end) throw new Error("m4a_unreadable");
    const size = readU32(file, offset);
    if (size === 0) throw new Error("m4a_unreadable");
    sizes.push(size);
    offset += 4;
  }
  return sizes;
}

function readChunkOffsets(file: Uint8Array, start: number, end: number, width: 4 | 8): number[] {
  const count = readU32(file, start + 4);
  const offsets: number[] = [];
  let offset = start + 8;
  for (let index = 0; index < count; index += 1) {
    if (offset + width > end) throw new Error("m4a_unreadable");
    const value = width === 8 ? readU64(file, offset) : readU32(file, offset);
    if (value > Number.MAX_SAFE_INTEGER) throw new Error("m4a_unreadable");
    offsets.push(value);
    offset += width;
  }
  return offsets;
}

function readStsc(file: Uint8Array, start: number, end: number): { first: number; per: number }[] {
  const count = readU32(file, start + 4);
  if (count === 0) throw new Error("m4a_unreadable");
  const entries: { first: number; per: number }[] = [];
  let offset = start + 8;
  for (let index = 0; index < count; index += 1) {
    if (offset + 12 > end) throw new Error("m4a_unreadable");
    const first = readU32(file, offset);
    const per = readU32(file, offset + 4);
    if (first === 0 || per === 0) throw new Error("m4a_unreadable");
    entries.push({ first, per });
    offset += 12;
  }
  return entries;
}

function expandDurations(entries: { count: number; delta: number }[], sampleCount: number): number[] {
  const durations: number[] = [];
  for (const entry of entries) {
    for (let index = 0; index < entry.count; index += 1) durations.push(entry.delta);
  }
  if (durations.length !== sampleCount) throw new Error("m4a_unreadable");
  return durations;
}

function placeSamples(
  sizes: number[],
  durations: number[],
  chunks: number[],
  stsc: { first: number; per: number }[],
): Sample[] {
  const samples: Sample[] = [];
  let sampleIndex = 0;
  for (let chunk = 1; chunk <= chunks.length && sampleIndex < sizes.length; chunk += 1) {
    let per = 0;
    for (const entry of stsc) {
      if (entry.first <= chunk) per = entry.per;
    }
    if (per === 0) throw new Error("m4a_unreadable");
    let offset = chunks[chunk - 1] ?? 0;
    for (let index = 0; index < per && sampleIndex < sizes.length; index += 1) {
      const size = sizes[sampleIndex] ?? 0;
      const duration = durations[sampleIndex] ?? 0;
      samples.push({ offset, size, duration });
      offset += size;
      sampleIndex += 1;
    }
  }
  if (sampleIndex !== sizes.length) throw new Error("m4a_unreadable");
  return samples;
}

function rebuild(parsed: ParsedAudio, chosen: Sample[], payload: Uint8Array): Uint8Array {
  const duration = chosen.reduce((sum, sample) => sum + sample.duration, 0);
  const groups: { count: number; delta: number }[] = [];
  for (const sample of chosen) {
    const last = groups[groups.length - 1];
    if (last && last.delta === sample.duration) last.count += 1;
    else groups.push({ count: 1, delta: sample.duration });
  }
  const stts = box(
    "stts",
    concat([
      u32(0),
      u32(groups.length),
      ...groups.flatMap((group) => [u32(group.count), u32(group.delta)]),
    ]),
  );
  const stsc = box("stsc", concat([u32(0), u32(1), u32(1), u32(chosen.length), u32(1)]));
  const stsz = box(
    "stsz",
    concat([u32(0), u32(0), u32(chosen.length), ...chosen.map((sample) => u32(sample.size))]),
  );
  const stco = box("stco", concat([u32(0), u32(1), u32(0)]));
  const stbl = box("stbl", concat([parsed.stsd, stts, stsc, stsz, stco]));
  const minf = box("minf", concat([box("smhd", concat([u32(0), u16(0), u16(0)])), dinf(), stbl]));
  const mdia = box(
    "mdia",
    concat([
      mdhd(parsed.timescale, duration),
      box("hdlr", concat([u32(0), u32(0), fourcc("soun"), u32(0), u32(0), u32(0), utf8("SoundHandler\0")])),
      minf,
    ]),
  );
  const trak = box("trak", concat([tkhd(duration), mdia]));
  const moov = box("moov", concat([mvhd(parsed.timescale, duration), trak]));
  const mdatHeader = 8;
  const chunkOffset = parsed.ftyp.byteLength + moov.byteLength + mdatHeader;
  const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
  view.setUint32(moov.byteLength - 4, chunkOffset);
  return concat([parsed.ftyp, moov, box("mdat", payload)]);
}

function dinf(): Uint8Array {
  const url = box("url ", u32(1));
  return box("dinf", box("dref", concat([u32(0), u32(1), url])));
}

function mdhd(timescale: number, duration: number): Uint8Array {
  return box("mdhd", concat([u32(0), u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0)]));
}

function mvhd(timescale: number, duration: number): Uint8Array {
  return box(
    "mvhd",
    concat([
      u32(0),
      u32(0),
      u32(0),
      u32(timescale),
      u32(duration),
      u32(0x00010000),
      u16(0x0100),
      u16(0),
      u32(0),
      u32(0),
      matrix(),
      u32(0),
      u32(0),
      u32(0),
      u32(0),
      u32(0),
      u32(0),
      u32(2),
    ]),
  );
}

function tkhd(duration: number): Uint8Array {
  return box(
    "tkhd",
    concat([
      u32(7),
      u32(0),
      u32(0),
      u32(1),
      u32(0),
      u32(duration),
      u32(0),
      u32(0),
      u16(0),
      u16(0),
      u16(0x0100),
      u16(0),
      matrix(),
      u32(0),
      u32(0),
    ]),
  );
}

function matrix(): Uint8Array {
  return concat([
    u32(0x00010000),
    u32(0),
    u32(0),
    u32(0),
    u32(0x00010000),
    u32(0),
    u32(0),
    u32(0),
    u32(0x40000000),
  ]);
}

function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.byteLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.byteLength);
  out.set(fourcc(type), 4);
  out.set(payload, 8);
  return out;
}

function fourcc(type: string): Uint8Array {
  if (type.length !== 4) throw new Error("m4a_unreadable");
  return Uint8Array.from(type, (char) => char.charCodeAt(0));
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value);
  return out;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function copyBytes(file: Uint8Array, offset: number, size: number): Uint8Array {
  if (offset < 0 || size <= 0 || offset + size > file.byteLength) throw new Error("m4a_unreadable");
  return file.slice(offset, offset + size);
}

function typeAt(file: Uint8Array, offset: number): string {
  return String.fromCharCode(file[offset] ?? 0, file[offset + 1] ?? 0, file[offset + 2] ?? 0, file[offset + 3] ?? 0);
}

function readU32(file: Uint8Array, offset: number): number {
  return new DataView(file.buffer, file.byteOffset, file.byteLength).getUint32(offset);
}

function readU64(file: Uint8Array, offset: number): number {
  return Number(new DataView(file.buffer, file.byteOffset, file.byteLength).getBigUint64(offset));
}
