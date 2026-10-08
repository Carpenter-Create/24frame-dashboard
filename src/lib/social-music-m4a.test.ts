import { describe, expect, it } from "vitest";

import { sliceSocialMusicAudio } from "@/lib/social-music-m4a";

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

function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.byteLength);
  new DataView(out.buffer).setUint32(0, out.byteLength);
  out.set(Uint8Array.from(type, (char) => char.charCodeAt(0)), 4);
  out.set(payload, 8);
  return out;
}

/** Three 12-second samples with distinct bytes, one chunk. */
function threeWindowFile(): { file: Uint8Array; samples: Uint8Array[] } {
  const samples = [
    Uint8Array.from([1, 1, 1, 1]),
    Uint8Array.from([2, 2, 2, 2, 2]),
    Uint8Array.from([3, 3, 3, 3, 3, 3]),
  ];
  const timescale = 1000;
  const delta = 12_000;
  const ftyp = box("ftyp", concat([u32(0x69736f6d), u32(0), u32(0x69736f6d)]));
  const mp4a = box(
    "mp4a",
    concat([new Uint8Array(6), u16(1), new Uint8Array(8), u16(2), u16(16), u16(0), u16(0), u32(44100 << 16)]),
  );
  const stsd = box("stsd", concat([u32(0), u32(1), mp4a]));
  const stts = box("stts", concat([u32(0), u32(1), u32(samples.length), u32(delta)]));
  const stsc = box("stsc", concat([u32(0), u32(1), u32(1), u32(samples.length), u32(1)]));
  const stsz = box("stsz", concat([u32(0), u32(0), u32(samples.length), u32(4), u32(5), u32(6)]));
  const stco = box("stco", concat([u32(0), u32(1), u32(0)]));
  const stbl = box("stbl", concat([stsd, stts, stsc, stsz, stco]));
  const minf = box(
    "minf",
    concat([box("smhd", concat([u32(0), new Uint8Array(4)])), box("dinf", box("dref", concat([u32(0), u32(0)]))), stbl]),
  );
  const mdhd = box("mdhd", concat([u32(0), u32(0), u32(0), u32(timescale), u32(delta * samples.length), u16(0x55c4), u16(0)]));
  const hdlr = box("hdlr", concat([u32(0), u32(0), u32(0x736f756e), u32(0), u32(0), u32(0)]));
  const mdia = box("mdia", concat([mdhd, hdlr, minf]));
  const trak = box("trak", concat([box("tkhd", new Uint8Array(92)), mdia]));
  const mvhd = box("mvhd", concat([u32(0), u32(0), u32(0), u32(timescale), u32(delta * samples.length), new Uint8Array(76)]));
  const moov = box("moov", concat([mvhd, trak]));
  const payload = concat(samples);
  const file = concat([ftyp, moov, box("mdat", payload)]);
  const chunkOffset = ftyp.byteLength + moov.byteLength + 8;
  new DataView(file.buffer).setUint32(ftyp.byteLength + moov.byteLength - 4, chunkOffset);
  return { file, samples };
}

describe("sliceSocialMusicAudio", () => {
  it("cuts distinct windows out of the file and rejects a file it cannot parse", () => {
    const { file, samples } = threeWindowFile();
    const first = sliceSocialMusicAudio(file, { startSeconds: 0, endSeconds: 12 });
    const second = sliceSocialMusicAudio(file, { startSeconds: 12, endSeconds: 24 });
    const third = sliceSocialMusicAudio(file, { startSeconds: 24, endSeconds: 36 });
    expect(Buffer.from(first).includes(Buffer.from(samples[0]!))).toBe(true);
    expect(Buffer.from(first).includes(Buffer.from(samples[1]!))).toBe(false);
    expect(Buffer.from(second).includes(Buffer.from(samples[1]!))).toBe(true);
    expect(Buffer.from(second).includes(Buffer.from(samples[0]!))).toBe(false);
    expect(Buffer.from(third).includes(Buffer.from(samples[2]!))).toBe(true);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
    expect(() => sliceSocialMusicAudio(new Uint8Array([1, 2, 3, 4]), { startSeconds: 0, endSeconds: 12 })).toThrow(
      /m4a_unreadable/,
    );
    expect(() => sliceSocialMusicAudio(file, { startSeconds: 36, endSeconds: 48 })).toThrow(/m4a_window_empty/);
  });
});
