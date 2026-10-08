import { describe, expect, it } from "vitest";

import { clipM4aAudioWindow, readM4aAudioWindow } from "@/lib/social-music-m4a";

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value);
  return bytes;
}

function box(type: string, payload: Uint8Array): Uint8Array {
  const header = new Uint8Array(8);
  new DataView(header.buffer).setUint32(0, 8 + payload.byteLength);
  header.set([type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)], 4);
  return concat([header, payload]);
}

function descriptor(tag: number, payload: Uint8Array): Uint8Array {
  return concat([new Uint8Array([tag, payload.byteLength]), payload]);
}

/** AAC-LC, 48 kHz, stereo. */
const ASC = new Uint8Array([0x11, 0x90]);

function esds(): Uint8Array {
  const specific = descriptor(0x05, ASC);
  const config = descriptor(
    0x04,
    concat([new Uint8Array([0x40, 0x15, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), specific]),
  );
  const es = descriptor(0x03, concat([new Uint8Array([0x00, 0x01, 0x00]), config]));
  return box("esds", concat([new Uint8Array(4), es]));
}

function mp4a(): Uint8Array {
  return box(
    "mp4a",
    concat([
      new Uint8Array(6),
      u16(1),
      new Uint8Array(8),
      u16(2),
      u16(16),
      u16(0),
      u16(0),
      u32(48_000 << 16),
      esds(),
    ]),
  );
}

function mdhd(timescale: number, duration: number): Uint8Array {
  return box("mdhd", concat([new Uint8Array(4), u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0)]));
}

function hdlr(): Uint8Array {
  return box("hdlr", concat([new Uint8Array(4), u32(0), new Uint8Array([0x73, 0x6f, 0x75, 0x6e]), new Uint8Array(12), new Uint8Array([0])]));
}

function stsd(): Uint8Array {
  return box("stsd", concat([new Uint8Array(4), u32(1), mp4a()]));
}

function stts(count: number, delta: number): Uint8Array {
  return box("stts", concat([new Uint8Array(4), u32(1), u32(count), u32(delta)]));
}

function stsc(entries: { firstChunk: number; samplesPerChunk: number }[]): Uint8Array {
  return box(
    "stsc",
    concat([
      new Uint8Array(4),
      u32(entries.length),
      ...entries.flatMap((entry) => [u32(entry.firstChunk), u32(entry.samplesPerChunk), u32(1)]),
    ]),
  );
}

function stsz(sizes: number[]): Uint8Array {
  return box("stsz", concat([new Uint8Array(4), u32(0), u32(sizes.length), ...sizes.map((size) => u32(size))]));
}

function stco(offsets: number[]): Uint8Array {
  return box("stco", concat([new Uint8Array(4), u32(offsets.length), ...offsets.map((offset) => u32(offset))]));
}

function audioMoov(input: {
  frameCount: number;
  frameSize: number;
  delta: number;
  timescale: number;
  chunks: { firstChunk: number; samplesPerChunk: number; offset: number }[];
}): Uint8Array {
  const trak = box(
    "trak",
    concat([
      box("mdia", concat([
        mdhd(input.timescale, input.frameCount * input.delta),
        hdlr(),
        box("minf", concat([
          box("smhd", new Uint8Array(8)),
          box("dinf", box("dref", concat([new Uint8Array(4), u32(1), box("url ", new Uint8Array(4))]))),
          box("stbl", concat([
            stsd(),
            stts(input.frameCount, input.delta),
            stsc(input.chunks.map((chunk) => ({ firstChunk: chunk.firstChunk, samplesPerChunk: chunk.samplesPerChunk }))),
            stsz(Array.from({ length: input.frameCount }, () => input.frameSize)),
            stco(input.chunks.map((chunk) => chunk.offset)),
          ])),
        ])),
      ])),
    ]),
  );
  return box("moov", concat([box("mvhd", new Uint8Array(100)), trak]));
}

function frames(count: number, size: number): Uint8Array[] {
  return Array.from({ length: count }, (_, index) => {
    const frame = new Uint8Array(size);
    frame[0] = index;
    frame[1] = 0x10;
    return frame;
  });
}

function payloads(adts: Uint8Array): number[] {
  const marks: number[] = [];
  let offset = 0;
  while (offset + 7 <= adts.byteLength) {
    const b3 = adts[offset + 3] ?? 0;
    const b4 = adts[offset + 4] ?? 0;
    const b5 = adts[offset + 5] ?? 0;
    const length = ((b3 & 0x03) << 11) | (b4 << 3) | ((b5 & 0xe0) >> 5);
    if (length < 7) break;
    marks.push(adts[offset + 7] ?? -1);
    offset += length;
  }
  return marks;
}

describe("clipM4aAudioWindow", () => {
  it("returns the AAC frames in the requested window, not the start of the file", () => {
    const sample = frames(10, 4);
    const draft = audioMoov({
      frameCount: 10,
      frameSize: 4,
      delta: 100,
      timescale: 1000,
      chunks: [{ firstChunk: 1, samplesPerChunk: 10, offset: 0 }],
    });
    const payloadStart = draft.byteLength + 8;
    const moov = audioMoov({
      frameCount: 10,
      frameSize: 4,
      delta: 100,
      timescale: 1000,
      chunks: [{ firstChunk: 1, samplesPerChunk: 10, offset: payloadStart }],
    });
    const file = concat([moov, box("mdat", concat(sample))]);
    const early = clipM4aAudioWindow(file, { startSeconds: 0, endSeconds: 0.5 });
    const late = clipM4aAudioWindow(file, { startSeconds: 0.5, endSeconds: 1 });
    expect(payloads(early)).toEqual([0, 1, 2, 3, 4]);
    expect(payloads(late)).toEqual([5, 6, 7, 8, 9]);
    expect(Array.from(late.subarray(0, 7))).toEqual([0xff, 0xf1, 0x4c, 0x80, 0x01, 0x7f, 0xfc]);
  });

  it("reads a later chunk when the moov follows the media", () => {
    const sample = frames(10, 4);
    const gap = new Uint8Array(32).fill(0xab);
    const ftyp = box("ftyp", new Uint8Array(12));
    const firstOffset = ftyp.byteLength + 8;
    const secondOffset = firstOffset + 5 * 4 + gap.byteLength;
    const mdat = box("mdat", concat([...sample.slice(0, 5), gap, ...sample.slice(5)]));
    const moov = audioMoov({
      frameCount: 10,
      frameSize: 4,
      delta: 480,
      timescale: 4800,
      chunks: [
        { firstChunk: 1, samplesPerChunk: 5, offset: firstOffset },
        { firstChunk: 2, samplesPerChunk: 5, offset: secondOffset },
      ],
    });
    const file = concat([ftyp, mdat, moov]);
    const late = clipM4aAudioWindow(file, { startSeconds: 0.5, endSeconds: 1 });
    expect(payloads(late)).toEqual([5, 6, 7, 8, 9]);
    expect(Array.from(late).includes(0xab)).toBe(false);
  });
});

describe("readM4aAudioWindow", () => {
  function server(file: Uint8Array, mode: "range" | "full" | "prefix") {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      const range = new Headers(init?.headers).get("range") ?? "";
      calls.push(range);
      const match = /bytes=(\d+)-(\d+)/.exec(range);
      const start = match ? Number(match[1]) : 0;
      const requestedEnd = match ? Number(match[2]) : file.length - 1;
      if (mode === "prefix") {
        return new Response(new Uint8Array(file), {
          status: 200,
          headers: { "content-length": String(file.length) },
        });
      }
      if (mode === "full" || !match) {
        return new Response(new Uint8Array(file), { status: 200 });
      }
      if (start >= file.length) return new Response(null, { status: 416 });
      const end = Math.min(requestedEnd, file.length - 1);
      const slice = new Uint8Array(file.subarray(start, end + 1));
      return new Response(slice, {
        status: 206,
        headers: { "content-range": `bytes ${start}-${end}/${file.length}` },
      });
    };
    return { fetchImpl, calls };
  }

  function lateFile(): Uint8Array {
    const sample = frames(10, 4);
    const ftyp = box("ftyp", new Uint8Array(16));
    const firstOffset = ftyp.byteLength + 8;
    const mdat = box("mdat", concat(sample));
    const moov = audioMoov({
      frameCount: 10,
      frameSize: 4,
      delta: 100,
      timescale: 1000,
      chunks: [{ firstChunk: 1, samplesPerChunk: 10, offset: firstOffset }],
    });
    return concat([ftyp, mdat, moov]);
  }

  it("fetches the moov and the later sample range instead of the opening bytes", async () => {
    const file = lateFile();
    const { fetchImpl, calls } = server(file, "range");
    const late = await readM4aAudioWindow("https://stream.mux.com/play/audio.m4a?token=t", { startSeconds: 0.5, endSeconds: 1 }, {
      fetchImpl,
      probeBytes: 40,
    });
    expect(payloads(late)).toEqual([5, 6, 7, 8, 9]);
    expect(calls.some((call) => call.startsWith("bytes=0-"))).toBe(true);
    expect(calls.some((call) => /^bytes=[1-9]/.test(call))).toBe(true);
    const sampleCall = calls.find((call) => call !== calls[0]);
    expect(sampleCall?.startsWith("bytes=0-")).toBe(false);
  });

  it("clips a later window when the host returns the whole file", async () => {
    const file = lateFile();
    const { fetchImpl, calls } = server(file, "full");
    const late = await readM4aAudioWindow("https://stream.mux.com/play/audio.m4a?token=t", { startSeconds: 0.5, endSeconds: 1 }, {
      fetchImpl,
      probeBytes: 32,
    });
    expect(payloads(late)).toEqual([5, 6, 7, 8, 9]);
    expect(calls).toEqual(["bytes=0-31"]);
  });

  it("refuses a truncated prefix when the host ignores the byte range", async () => {
    const file = lateFile();
    const { fetchImpl } = server(file, "prefix");
    await expect(
      readM4aAudioWindow("https://stream.mux.com/play/audio.m4a?token=t", { startSeconds: 0.5, endSeconds: 1 }, {
        fetchImpl,
        probeBytes: 32,
        maxBytes: 80,
      }),
    ).rejects.toThrow(/read cap/);
  });
});
