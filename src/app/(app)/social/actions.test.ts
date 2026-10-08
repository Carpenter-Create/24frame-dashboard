import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  followInsertRow,
  likeInsertRow,
  postInsertRow,
  profileInsertRow,
  SOCIAL,
  storyLikeInsertRow,
} from "@/lib/social";
import { SocialMuxUploadNotBoundError } from "@/lib/social-mux";
import { revalidatePath } from "next/cache";
import {
  addSocialDmPeople,
  createSocialPost,
  sendSocialDm,
  createSocialProfile,
  clearSocialWelcomeVideo,
  clearSocialProfileCover,
  saveSocialProfileCover,
  saveSocialWelcomeVideo,
  createSocialStory,
  openSocialDm,
  startSocialDm,
  createSocialMuxUpload,
  finalizeSocialMuxUpload,
  presignSocialMediaUpload,
  reportSocialMediaUploadFailure,
  updateSocialBio,
} from "./actions";
import {
  createSocialComment,
  deleteSocialComment,
  sendSocialStoryItem,
  sendSocialPostShare,
  toggleSocialFollow,
  toggleSocialLike,
  toggleSocialStoryLike,
} from "./light-actions";
import { commentInsertRow } from "@/lib/social-comments";
import { SOCIAL_FRAME_AI_ID } from "@/lib/social-frame-ai";

vi.mock("@/lib/s3-social-media", () => ({
  presignSocialMediaPut: vi.fn(),
  headSocialMediaObject: vi.fn(async () => ({ bytes: 1200, contentType: null, etag: '"e1"' })),
  copySocialMediaObject: vi.fn(async () => undefined),
}));

vi.mock("@/lib/social-mux-server", () => ({
  createSocialMuxDirectUpload: vi.fn(),
  finalizeSocialMuxDirectUpload: vi.fn(),
  verifySocialMuxPublishedItems: vi.fn(async () => true),
  socialMuxSettingsFromUploadInput: vi.fn(() => ({
    intent: "video",
    settings: { videoQuality: "basic", maxResolutionTier: "2160p" },
  })),
}));

import { copySocialMediaObject, headSocialMediaObject, presignSocialMediaPut } from "@/lib/s3-social-media";
import { isOwnedSocialMediaKey } from "@/lib/social-media";
import {
  createSocialMuxDirectUpload,
  finalizeSocialMuxDirectUpload,
  socialMuxSettingsFromUploadInput,
  verifySocialMuxPublishedItems,
} from "@/lib/social-mux-server";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function user() {
  return { id: "u1", email: "ada@example.com" };
}

// Publish draws a random id, so read back the key the server copied to.
function publishedCopyKey(call = 0): string {
  return vi.mocked(copySocialMediaObject).mock.calls[call]?.[0].destinationKey ?? "";
}

function stub({
  profile = null,
  insertError = null,
  insertErrors = [],
  updateError = null,
  rpcError = null,
  rpcData = null,
}: {
  profile?: { id: string; handle?: string; display_name?: string; status?: string; bio?: string | null } | null;
  insertError?: { message: string; code?: string } | null;
  insertErrors?: Array<{ message: string; code?: string } | null>;
  updateError?: { message: string; code?: string } | null;
  rpcError?: { message: string } | null;
  rpcData?: unknown;
} = {}) {
  const inserts: { table: string; row: unknown }[] = [];
  const updates: { table: string; row: unknown }[] = [];
  const deletes: { table: string }[] = [];
  let insertIndex = 0;
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.delete = vi.fn(() => {
      deletes.push({ table });
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => ({ data: profile, error: null }));
    chain.insert = vi.fn((row: unknown) => {
      inserts.push({ table, row });
      const error = insertErrors[insertIndex] ?? insertError ?? null;
      insertIndex += 1;
      const result = {
        data: table === "comments" ? { id: "c1", created_at: "2026-09-21T12:00:00.000Z" } : null,
        error,
      };
      const next: Record<string, unknown> = {};
      next.select = vi.fn(() => next);
      next.single = vi.fn(async () => result);
      next.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return next;
    });
    chain.update = vi.fn((row: unknown) => {
      updates.push({ table, row });
      return chain;
    });
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error: updateError }).then(resolve);
    return chain;
  });
  const rpc = vi.fn(async () => ({ data: rpcData, error: rpcError }));
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc, inserts, updates, deletes };
}

const POST_SHARE_AUTHOR = "11111111-1111-4111-8111-111111111111";
const POST_SHARE_ATTEMPT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function postShareForm(peerIds: string[], note?: string) {
  const form = new FormData();
  form.set("post_id", "p1");
  form.set("attempt_id", POST_SHARE_ATTEMPT);
  for (const id of peerIds) form.append("peer_id", id);
  if (note) form.set("note", note);
  return form;
}

function mockPostShare({
  followeeIds = ["u2", "u3"],
  groupId = null,
  access = true,
  accessError = null,
  failInsertPeers,
}: {
  followeeIds?: string[];
  groupId?: string | null;
  access?: boolean | null;
  accessError?: { message: string } | null;
  failInsertPeers?: Set<string>;
} = {}) {
  const objectId = "22222222-2222-4222-8222-222222222222";
  const media = [
    {
      kind: "video" as const,
      key: `posts/${POST_SHARE_AUTHOR}/${objectId}.mp4`,
      contentType: "video/mp4" as const,
      provider: "mux" as const,
      playbackId: "abc12345xx",
    },
  ];
  const inserted = new Set<string>();
  const failOnce = new Set(failInsertPeers ?? []);
  const inserts: { table: string; row: unknown }[] = [];
  const allowProfiles = [
    ...followeeIds.map((id, index) => ({
      id,
      handle: `peer${index}`,
      display_name: index === 0 ? "Lauren" : `Person ${id}`,
      status: "active" as const,
    })),
    { id: "u1", handle: "ada", display_name: "Ada", status: "active" as const },
  ];
  const from = vi.fn((table: string) => {
    const calls: string[] = [];
    const eqs: [string, string][] = [];
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.eq = vi.fn((column: string, value: string) => {
      eqs.push([column, value]);
      return chain;
    });
    chain.order = vi.fn(self);
    chain.range = vi.fn(self);
    chain.in = vi.fn(() => {
      calls.push("in");
      return chain;
    });
    chain.contains = vi.fn(() => {
      calls.push("contains");
      return chain;
    });
    chain.limit = vi.fn(self);
    chain.maybeSingle = vi.fn(async () => {
      if (table === "posts") {
        return {
          data: {
            id: "p1",
            author_id: POST_SHARE_AUTHOR,
            body: "DO YALL KNOW",
            status: "active",
            group_id: groupId,
            media,
          },
          error: null,
        };
      }
      return {
        data: { id: "u1", handle: "ada", display_name: "Ada", status: "active", bio: null },
        error: null,
      };
    });
    chain.insert = vi.fn((row: { conversation_id?: string }) => {
      const peerId = String(row.conversation_id ?? "").replace(/^conv-/, "");
      const fail = failOnce.has(peerId);
      if (fail) failOnce.delete(peerId);
      else inserted.add(peerId);
      const error = fail ? { message: "insert failed" } : null;
      if (!error) inserts.push({ table, row });
      const result = { data: null, error };
      return {
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
    });
    chain.then = (resolve: (value: unknown) => unknown) => {
      if (table === "follows") {
        return Promise.resolve({
          data: followeeIds.map((id) => ({ followee_id: id })),
          error: null,
        }).then(resolve);
      }
      if (table === "profiles" && calls.includes("in")) {
        return Promise.resolve({ data: allowProfiles, error: null }).then(resolve);
      }
      if (table === "messages" && calls.includes("contains")) {
        const conversationId = eqs.find(([column]) => column === "conversation_id")?.[1] ?? "";
        const peerId = conversationId.replace(/^conv-/, "");
        const data = inserted.has(peerId) ? [{ id: `prior-${peerId}` }] : [];
        return Promise.resolve({ data, error: null }).then(resolve);
      }
      return Promise.resolve({ data: null, error: null }).then(resolve);
    };
    return chain;
  });
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === "get_dm_inbox") return { data: [], error: null };
    if (name === "can_access_group_content") return { data: access, error: accessError };
    if (name === "open_or_get_direct_conversation") {
      return { data: `conv-${String(args?.p_peer ?? "")}`, error: null };
    }
    return { data: null, error: { message: "unexpected rpc" } };
  });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc, inserts };
}

describe("social actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue(user() as never);
  });

  it("saves a bare handle on the ensured self row and does not invent an org row", async () => {
    const { inserts, updates, from } = stub();
    const form = new FormData();
    form.set("handle", "@Ada_Lovelace");
    form.set("first_name", "Ada");
    form.set("middle_name", "");
    form.set("last_name", "Lovelace");

    const result = await createSocialProfile(form);
    expect(result).toEqual({});
    expect(inserts).toEqual([
      {
        table: "profiles",
        row: profileInsertRow({
          userId: "u1",
          handle: "ada",
          displayName: "",
        }),
      },
    ]);
    expect(updates).toEqual([
      {
        table: "profiles",
        row: { handle: "Ada_Lovelace", display_name: "Ada Lovelace" },
      },
    ]);
    expect(from).not.toHaveBeenCalledWith("organizations");
    expect(from).not.toHaveBeenCalledWith("memberships");
  });

  it("composes First + Middle + Last onto display_name and rejects a blank last name", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@adam");
    form.set("first_name", "Adam");
    form.set("middle_name", "James");
    form.set("last_name", "Carpenter");
    expect(await createSocialProfile(form)).toEqual({});
    expect(updates).toEqual([
      {
        table: "profiles",
        row: { handle: "adam", display_name: "Adam James Carpenter" },
      },
    ]);

    const blankLast = new FormData();
    blankLast.set("handle", "@adam");
    blankLast.set("first_name", "Adam");
    blankLast.set("last_name", "");
    expect(await createSocialProfile(blankLast)).toEqual({ error: SOCIAL.profile.lastNameRequired });
  });

  it("stores typed handle casing and rejects a leading period", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@AdamC");
    form.set("first_name", "Adam");
    form.set("last_name", "Carpenter");
    expect(await createSocialProfile(form)).toEqual({});
    expect(updates[0]).toEqual({
      table: "profiles",
      row: { handle: "AdamC", display_name: "Adam Carpenter" },
    });

    const dotted = new FormData();
    dotted.set("handle", "@.AdamC");
    dotted.set("first_name", "Adam");
    dotted.set("last_name", "Carpenter");
    expect(await createSocialProfile(dotted)).toEqual({ error: SOCIAL.profile.handleInvalid });
  });

  it("rejects a case-insensitive handle collision", async () => {
    stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
      updateError: { message: "duplicate key", code: "23505" },
    });
    const form = new FormData();
    form.set("handle", "@OtherUser");
    form.set("first_name", "Ada");
    form.set("last_name", "Lovelace");
    expect(await createSocialProfile(form)).toEqual({ error: SOCIAL.profile.handleTaken });
  });

  it("persists ordered Profession slugs on crafts and the first as primary_role", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@ada");
    form.set("first_name", "Ada");
    form.set("last_name", "Lovelace");
    form.set("crafts", JSON.stringify(["actor", "steadicam", "host", "screenwriter"]));
    expect(await createSocialProfile(form)).toEqual({});
    expect(updates).toEqual([
      {
        table: "profiles",
        row: {
          handle: "ada",
          display_name: "Ada Lovelace",
          crafts: ["actor", "steadicam_operator", "host", "screenwriter"],
          primary_role: "actor",
        },
      },
    ]);

    const cleared = new FormData();
    cleared.set("handle", "@ada");
    cleared.set("first_name", "Ada");
    cleared.set("last_name", "Lovelace");
    cleared.set("crafts", "[]");
    expect(await createSocialProfile(cleared)).toEqual({});
    expect(updates[1]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        crafts: [],
        primary_role: null,
      },
    });
  });

  it("persists selected Topics on profiles.topics, separate from crafts", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@ada");
    form.set("first_name", "Ada");
    form.set("last_name", "Lovelace");
    form.set("topics", JSON.stringify(["Acting", "Financing", "actor"]));
    expect(await createSocialProfile(form)).toEqual({});
    expect(updates[0]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        topics: ["Acting", "Financing"],
      },
    });
  });

  it("saves a normalized IMDb name URL and clears a blank claim", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@ada");
    form.set("first_name", "Ada");
    form.set("last_name", "Lovelace");
    form.set("imdb_url", "https://www.imdb.com/name/nm0000158/?ref_=nv");
    expect(await createSocialProfile(form)).toEqual({});
    expect(updates[0]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        imdb_url: "https://www.imdb.com/name/nm0000158/",
      },
    });

    const cleared = new FormData();
    cleared.set("handle", "@ada");
    cleared.set("first_name", "Ada");
    cleared.set("last_name", "Lovelace");
    cleared.set("imdb_url", "");
    expect(await createSocialProfile(cleared)).toEqual({});
    expect(updates[1]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        imdb_url: null,
      },
    });

    const bad = new FormData();
    bad.set("handle", "@ada");
    bad.set("first_name", "Ada");
    bad.set("last_name", "Lovelace");
    bad.set("imdb_url", "https://www.imdb.com/title/tt0111161/");
    expect(await createSocialProfile(bad)).toEqual({ error: SOCIAL.profile.imdbInvalid });
  });

  it("persists ordered external links on website_url and rejects a bad URL", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@ada");
    form.set("first_name", "Ada");
    form.set("last_name", "Lovelace");
    form.set("links", JSON.stringify(["https://instagram.com/ada", "https://youtube.com/@ada"]));
    expect(await createSocialProfile(form)).toEqual({});
    expect(updates[0]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        website_url: JSON.stringify(["https://instagram.com/ada", "https://youtube.com/@ada"]),
      },
    });

    const single = new FormData();
    single.set("handle", "@ada");
    single.set("first_name", "Ada");
    single.set("last_name", "Lovelace");
    single.set("links", JSON.stringify(["instagram.com/ada"]));
    expect(await createSocialProfile(single)).toEqual({});
    expect(updates[1]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        website_url: "https://instagram.com/ada",
      },
    });

    const cleared = new FormData();
    cleared.set("handle", "@ada");
    cleared.set("first_name", "Ada");
    cleared.set("last_name", "Lovelace");
    cleared.set("links", JSON.stringify(["", ""]));
    expect(await createSocialProfile(cleared)).toEqual({});
    expect(updates[2]).toEqual({
      table: "profiles",
      row: {
        handle: "ada",
        display_name: "Ada Lovelace",
        website_url: null,
      },
    });

    const bad = new FormData();
    bad.set("handle", "@ada");
    bad.set("first_name", "Ada");
    bad.set("last_name", "Lovelace");
    bad.set("links", JSON.stringify(["not-a-url"]));
    expect(await createSocialProfile(bad)).toEqual({ error: SOCIAL.profile.linkInvalid });
  });

  it("saves the profile cover pointer as the published copy of a single owned still", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const other = "33333333-3333-4333-8333-333333333333";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { updates } = stub({
      profile: { id: author, handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const upload = `posts/upload/${author}/${object}.jpg`;
    const form = new FormData();
    form.set("media", JSON.stringify([{ kind: "image", key: upload, contentType: "image/jpeg" }]));
    expect(await saveSocialProfileCover(form)).toEqual({});
    const published = publishedCopyKey();
    expect(isOwnedSocialMediaKey(published, author, "posts")).toBe(true);
    expect(headSocialMediaObject).toHaveBeenCalledWith(upload, expect.any(Function));
    expect(copySocialMediaObject).toHaveBeenCalledWith({
      sourceKey: upload,
      etag: '"e1"',
      destinationKey: published,
      contentType: "image/jpeg",
    });
    // A cover with no original (an older client, or an original too large to keep)
    // clears any stored original and framing so the pair never goes stale.
    expect(updates).toEqual([
      { table: "profiles", row: { cover_key: published, cover_source_key: null, cover_crop: null } },
    ]);

    const foreign = new FormData();
    foreign.set(
      "media",
      JSON.stringify([{ kind: "image", key: `posts/upload/${other}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    expect(await saveSocialProfileCover(foreign)).toEqual({ error: SOCIAL.stories.mediaType });
    const stored = new FormData();
    stored.set(
      "media",
      JSON.stringify([{ kind: "image", key: `posts/${author}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    expect(await saveSocialProfileCover(stored)).toEqual({ error: SOCIAL.stories.mediaType });
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce(null);
    expect(await saveSocialProfileCover(form)).toEqual({ error: SOCIAL.home.mediaMissing });
    expect(copySocialMediaObject).toHaveBeenCalledTimes(1);
    expect(updates).toHaveLength(1);
  });

  it("keeps the original: publishes the crop and the original, stores both with the framing", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { updates } = stub({
      profile: { id: author, handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const croppedUpload = `posts/upload/${author}/22222222-2222-4222-8222-222222222222.jpg`;
    const sourceUpload = `posts/upload/${author}/44444444-4444-4444-8444-444444444444.png`;
    const crop = { x: 0.125, y: 0, w: 0.75, h: 1 };
    const form = new FormData();
    form.set("media", JSON.stringify([{ kind: "image", key: croppedUpload, contentType: "image/jpeg" }]));
    form.set("source", JSON.stringify([{ kind: "image", key: sourceUpload, contentType: "image/png" }]));
    form.set("crop", JSON.stringify(crop));
    expect(await saveSocialProfileCover(form)).toEqual({});
    expect(headSocialMediaObject).toHaveBeenCalledWith(croppedUpload, expect.any(Function));
    expect(headSocialMediaObject).toHaveBeenCalledWith(sourceUpload, expect.any(Function));
    expect(copySocialMediaObject).toHaveBeenCalledTimes(2);
    const copies = vi.mocked(copySocialMediaObject).mock.calls.map(([input]) => input);
    const coverCopy = copies.find((copy) => copy.sourceKey === croppedUpload)!.destinationKey;
    const sourceCopy = copies.find((copy) => copy.sourceKey === sourceUpload)!.destinationKey;
    expect(isOwnedSocialMediaKey(coverCopy, author, "posts")).toBe(true);
    expect(isOwnedSocialMediaKey(sourceCopy, author, "posts")).toBe(true);
    expect(sourceCopy).toMatch(/\.png$/);
    expect(coverCopy).not.toBe(sourceCopy);
    // One update: cover, original and framing together.
    expect(updates).toEqual([
      { table: "profiles", row: { cover_key: coverCopy, cover_source_key: sourceCopy, cover_crop: crop } },
    ]);
  });

  it("refuses a malformed framing or original and stores nothing", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const other = "33333333-3333-4333-8333-333333333333";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { updates } = stub({
      profile: { id: author, handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const media = JSON.stringify([
      { kind: "image", key: `posts/upload/${author}/22222222-2222-4222-8222-222222222222.jpg`, contentType: "image/jpeg" },
    ]);
    const source = (key: string, contentType = "image/jpeg") =>
      JSON.stringify([{ kind: contentType.startsWith("video") ? "video" : "image", key, contentType }]);
    const ownSource = source(`posts/upload/${author}/44444444-4444-4444-8444-444444444444.jpg`);
    const cases: Array<[string | null, string | null]> = [
      [ownSource, JSON.stringify({ x: 0.6, y: 0, w: 0.5, h: 1 })],
      [ownSource, JSON.stringify({ x: 0, y: 0.5, w: 1, h: 0.6 })],
      [ownSource, JSON.stringify({ x: "0", y: 0, w: 1, h: 1 })],
      [ownSource, JSON.stringify({ x: 0, y: 0, w: 1 })],
      [ownSource, JSON.stringify({ x: 0, y: 0, w: 0, h: 1 })],
      [ownSource, null],
      [source(`posts/upload/${other}/44444444-4444-4444-8444-444444444444.jpg`), JSON.stringify({ x: 0, y: 0, w: 1, h: 1 })],
      [source(`posts/${author}/44444444-4444-4444-8444-444444444444.jpg`), JSON.stringify({ x: 0, y: 0, w: 1, h: 1 })],
      [source(`posts/upload/${author}/44444444-4444-4444-8444-444444444444.mp4`, "video/mp4"), JSON.stringify({ x: 0, y: 0, w: 1, h: 1 })],
      [media, JSON.stringify({ x: 0, y: 0, w: 1, h: 1 })],
      [null, JSON.stringify({ x: 1.5, y: 0, w: 1, h: 1 })],
    ];
    for (const [sourceField, cropField] of cases) {
      const form = new FormData();
      form.set("media", media);
      if (sourceField !== null) form.set("source", sourceField);
      if (cropField !== null) form.set("crop", cropField);
      expect(await saveSocialProfileCover(form)).toEqual({ error: SOCIAL.stories.mediaType });
    }
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("repositions against the original stored on the profile and never a client-sent key", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const other = "33333333-3333-4333-8333-333333333333";
    const storedSource = `posts/${author}/55555555-5555-4555-8555-555555555555.jpg`;
    const storedCover = `posts/${author}/77777777-7777-4777-8777-777777777777.jpg`;
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const eqs: Array<[string, unknown]> = [];
    const updates: unknown[] = [];
    const selects: string[] = [];
    let updatedRows: unknown = [{ id: author }];
    let storedRow: Record<string, unknown> | null = {
      id: author,
      handle: "ada",
      display_name: "Ada Lovelace",
      status: "active",
      cover_key: storedCover,
      cover_source_key: storedSource,
    };
    const from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      let updating = false;
      chain.select = vi.fn((columns: string) => {
        selects.push(columns);
        return chain;
      });
      chain.eq = vi.fn((column: string, value: unknown) => {
        eqs.push([column, value]);
        return chain;
      });
      chain.maybeSingle = vi.fn(async () => ({ data: storedRow, error: null }));
      chain.update = vi.fn((row: unknown) => {
        updating = true;
        updates.push(row);
        return chain;
      });
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: updating ? updatedRows : null, error: null }).then(resolve);
      return chain;
    });
    vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);

    const crop = { x: 0, y: 0.3, w: 1, h: 0.5 };
    const form = new FormData();
    form.set(
      "media",
      JSON.stringify([
        { kind: "image", key: `posts/upload/${author}/22222222-2222-4222-8222-222222222222.jpg`, contentType: "image/jpeg" },
      ]),
    );
    form.set("crop", JSON.stringify(crop));
    form.set("opened", storedCover);
    // Not a field the server reads: a reposition never names the original.
    form.set("cover_source_key", `posts/${other}/66666666-6666-4666-8666-666666666666.jpg`);
    expect(await saveSocialProfileCover(form)).toEqual({});
    expect(selects).toContain("cover_key, cover_source_key");
    expect(copySocialMediaObject).toHaveBeenCalledTimes(1);
    const published = publishedCopyKey();
    expect(updates).toEqual([{ cover_key: published, cover_crop: crop }]);
    // The update lands only on the cover the editor opened and its original.
    expect(eqs).toContainEqual(["cover_key", storedCover]);
    expect(eqs).toContainEqual(["cover_source_key", storedSource]);
    expect(JSON.stringify(updates)).not.toContain(other);

    // The original changed under us (another tab): nothing matched, refuse.
    updatedRows = [];
    expect(await saveSocialProfileCover(form)).toEqual({ error: SOCIAL.profile.coverCropFailed });

    // No stored original (a cover saved before originals were kept): refuse
    // before publishing anything.
    vi.mocked(copySocialMediaObject).mockClear();
    updates.length = 0;
    storedRow = {
      id: author,
      handle: "ada",
      display_name: "Ada Lovelace",
      status: "active",
      cover_key: storedCover,
      cover_source_key: null,
    };
    expect(await saveSocialProfileCover(form)).toEqual({ error: SOCIAL.profile.coverCropFailed });
    storedRow = {
      id: author,
      handle: "ada",
      display_name: "Ada Lovelace",
      status: "active",
      cover_key: storedCover,
      cover_source_key: `posts/${other}/55555555-5555-4555-8555-555555555555.jpg`,
    };
    expect(await saveSocialProfileCover(form)).toEqual({ error: SOCIAL.profile.coverCropFailed });
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("refuses a reposition when another tab replaced the cover after the editor opened", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    // Tab A opens Reposition on cover A (original A, framing A).
    const coverA = `posts/${author}/77777777-7777-4777-8777-777777777777.jpg`;
    // Tab B then saves a new photo: a new cover, original and framing.
    const coverB = `posts/${author}/88888888-8888-4888-8888-888888888888.jpg`;
    const sourceB = `posts/${author}/99999999-9999-4999-8999-999999999999.png`;
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const updates: unknown[] = [];
    const row = {
      id: author,
      handle: "ada",
      display_name: "Ada Lovelace",
      status: "active",
      cover_key: coverB,
      cover_source_key: sourceB,
      cover_crop: { x: 0, y: 0.1, w: 1, h: 0.4 },
    };
    const from = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      const filters: Array<[string, unknown]> = [];
      let updating = false;
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn((column: string, value: unknown) => {
        filters.push([column, value]);
        return chain;
      });
      chain.maybeSingle = vi.fn(async () => ({ data: row, error: null }));
      chain.update = vi.fn((patch: unknown) => {
        updating = true;
        updates.push(patch);
        return chain;
      });
      // A real update matches only rows that pass every filter.
      chain.then = (resolve: (value: unknown) => unknown) => {
        const match = filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value);
        return Promise.resolve({ data: updating && match ? [{ id: author }] : [], error: null }).then(resolve);
      };
      return chain;
    });
    vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);

    // Tab A saves its framing of original A.
    const form = new FormData();
    form.set(
      "media",
      JSON.stringify([
        { kind: "image", key: `posts/upload/${author}/22222222-2222-4222-8222-222222222222.jpg`, contentType: "image/jpeg" },
      ]),
    );
    form.set("crop", JSON.stringify({ x: 0, y: 0.3, w: 1, h: 0.5 }));
    form.set("opened", coverA);
    expect(await saveSocialProfileCover(form)).toEqual({ error: SOCIAL.profile.coverCropFailed });
    // Refused before publishing: no orphan copy, and B's cover, original and framing stand.
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("removes the cover, its original and its framing together", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { updates, deletes } = stub({
      profile: { id: author, handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    expect(await clearSocialProfileCover()).toEqual({});
    expect(updates).toEqual([
      { table: "profiles", row: { cover_key: null, cover_source_key: null, cover_crop: null } },
    ]);
    expect(deletes).toEqual([]);
    expect(copySocialMediaObject).not.toHaveBeenCalled();
  });

  it("saves and clears the welcome video pointer without deleting media", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { updates } = stub({
      profile: { id: author, handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const upload = `posts/upload/${author}/${object}.mp4`;
    const form = new FormData();
    form.set("media", JSON.stringify([{ kind: "video", key: upload, contentType: "video/mp4" }]));
    expect(await saveSocialWelcomeVideo(form)).toEqual({ error: SOCIAL.stories.mediaType });
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(await clearSocialWelcomeVideo()).toEqual({});
    expect(updates).toEqual([{ table: "profiles", row: { welcome_video_key: null } }]);
  });

  it("rejects a blank handle after stripping @", async () => {
    stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("handle", "@@@");
    expect(await createSocialProfile(form)).toEqual({ error: SOCIAL.profile.handleRequired });
    expect(SOCIAL.profile.handleRequired).toBe("Handle is required");
  });

  it("rejects charset, length, and dotted-edge misses and persists typed casing", async () => {
    stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const invalid = new FormData();
    invalid.set("handle", "Ada-C");
    expect(await createSocialProfile(invalid)).toEqual({ error: SOCIAL.profile.handleInvalid });

    const dotted = new FormData();
    dotted.set("handle", ".AdamC");
    expect(await createSocialProfile(dotted)).toEqual({ error: SOCIAL.profile.handleInvalid });

    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const valid = new FormData();
    valid.set("handle", "@AdamC");
    valid.set("display_name", "Ada Lovelace");
    expect(await createSocialProfile(valid)).toEqual({});
    expect(updates).toEqual([
      { table: "profiles", row: { handle: "AdamC", display_name: "Ada Lovelace" } },
    ]);
  });

  it("rejects a blank handle when ensure cannot insert a row", async () => {
    const { inserts } = stub({
      insertError: { message: "null value in column birth_date", code: "23502" },
    });
    const form = new FormData();
    form.set("handle", "@");
    expect(await createSocialProfile(form)).toEqual({ error: SOCIAL.profile.handleRequired });
    expect(inserts).toEqual([]);
  });

  it("inserts the submitted handle when ensure cannot create the row", async () => {
    const { inserts, updates } = stub({
      insertErrors: [
        { message: "null value in column birth_date", code: "23502" },
        { message: "null value in column birth_date", code: "23502" },
        null,
      ],
    });
    const form = new FormData();
    form.set("handle", "@Ada_Lovelace");
    form.set("display_name", "Ada Lovelace");
    expect(await createSocialProfile(form)).toEqual({});
    expect(inserts).toHaveLength(3);
    expect(inserts[2]).toEqual({
      table: "profiles",
      row: profileInsertRow({
        userId: "u1",
        handle: "Ada_Lovelace",
        displayName: "Ada Lovelace",
      }),
    });
    expect(inserts[0].row).not.toHaveProperty("birth_date");
    expect(inserts[2].row).not.toHaveProperty("birth_date");
    expect(updates).toEqual([]);
  });

  it("ensures a self profile on the first Social write and then posts", async () => {
    const { inserts } = stub({ profile: null });
    const form = new FormData();
    form.set("body", "hello");
    await expect(createSocialPost(form)).rejects.toThrow("REDIRECT:/social");
    expect(inserts).toEqual([
      {
        table: "profiles",
        row: profileInsertRow({
          userId: "u1",
          handle: "ada",
          displayName: "",
        }),
      },
      {
        table: "posts",
        row: postInsertRow({ authorId: "u1", body: "hello" }),
      },
    ]);
  });

  it("never writes a topic from the form: nobody picks a topic", async () => {
    const { inserts } = stub({ profile: null });
    const form = new FormData();
    form.set("body", "hello");
    form.set("category", "Music");
    await expect(createSocialPost(form)).rejects.toThrow("REDIRECT:/social");
    const post = inserts.find((insert) => insert.table === "posts")?.row as Record<string, unknown>;
    expect(post).toEqual(postInsertRow({ authorId: "u1", body: "hello" }));
    expect(post).not.toHaveProperty("category");
  });

  it("ensures a self profile before a story write", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: null });
    const object = "22222222-2222-4222-8222-222222222222";
    const media = [
      {
        kind: "video" as const,
        key: `stories/${author}/${object}.mp4`,
        contentType: "video/mp4" as const,
        provider: "mux" as const,
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        uploadId: "zd01Pe2bNpYhxbrwYABgFE",
        assetId: "SqQnqz6s5MBuXGvJaUWdXu",
        playbackPolicy: "signed" as const,
      },
    ];
    const form = new FormData();
    form.set("media", JSON.stringify(media));
    expect(await createSocialStory(form)).toEqual({});
    expect(inserts[0]).toEqual({
      table: "profiles",
      row: profileInsertRow({
        userId: author,
        handle: "ada",
        displayName: "",
      }),
    });
    expect(inserts[1]).toMatchObject({
      table: "stories",
      row: {
        author_id: author,
        body: null,
        media,
        status: "active",
      },
    });
  });

  it("likes a post for self when a profile exists", async () => {
    const { inserts } = stub({ profile: { id: "u1" } });
    const form = new FormData();
    form.set("post_id", "p1");
    form.set("liked", "0");
    expect(await toggleSocialLike(form)).toEqual({});
    expect(inserts).toEqual([{ table: "likes", row: likeInsertRow("u1", "p1") }]);
  });

  it("likes a story item and removes that like without a redirect", async () => {
    const liked = stub({ profile: { id: "u1" } });
    const like = new FormData();
    like.set("story_id", "s1");
    like.set("liked", "0");
    expect(await toggleSocialStoryLike(like)).toEqual({});
    expect(liked.inserts).toEqual([{ table: "likes", row: storyLikeInsertRow("u1", "s1") }]);

    const unlike = stub({ profile: { id: "u1" } });
    const remove = new FormData();
    remove.set("story_id", "s1");
    remove.set("liked", "1");
    expect(await toggleSocialStoryLike(remove)).toEqual({});
    expect(unlike.inserts).toEqual([]);
    expect(unlike.deletes).toEqual([{ table: "likes" }]);
  });

  it("sends this story item to one peer on the existing DM path and stays put", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const objectId = "22222222-2222-4222-8222-222222222222";
    const media = [
      {
        kind: "image" as const,
        key: `stories/${author}/${objectId}.jpg`,
        contentType: "image/jpeg" as const,
      },
    ];
    const inserts: { table: string; row: unknown }[] = [];
    const from = vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => {
        if (table === "stories") {
          return {
            data: {
              id: "s1",
              author_id: author,
              status: "active",
              expires_at: "2099-01-01T00:00:00.000Z",
              media,
            },
            error: null,
          };
        }
        return {
          data: { id: "u1", handle: "ada", display_name: "Ada", status: "active", bio: null },
          error: null,
        };
      });
      chain.insert = vi.fn((row: unknown) => {
        inserts.push({ table, row });
        const result = { data: null, error: null };
        return {
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
      });
      return chain;
    });
    const rpc = vi.fn(async () => ({ data: "conv-1", error: null }));
    vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
    const form = new FormData();
    form.set("story_id", "s1");
    form.set("peer_id", "u2");
    expect(await sendSocialStoryItem(form)).toEqual({});
    expect(rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u2" });
    expect(from).not.toHaveBeenCalledWith("conversations");
    expect(inserts).toEqual([
      {
        table: "messages",
        row: {
          sender_id: "u1",
          conversation_id: "conv-1",
          body: "You sent @ada's story",
          media: [
            ...media,
            {
              kind: "story-share",
              storyId: "s1",
              authorId: author,
              expiresAt: "2099-01-01T00:00:00.000Z",
              authorHandle: "ada",
            },
          ],
          status: "active",
        },
      },
    ]);

    form.set("peer_id", "u1");
    expect(await sendSocialStoryItem(form)).toEqual({});
    expect(rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u1" });
    expect(inserts).toHaveLength(2);
    expect(inserts[1]).toMatchObject({
      table: "messages",
      row: { sender_id: "u1", conversation_id: "conv-1", body: "You sent @ada's story" },
    });
  });

  it("does not open a direct conversation when the story peer is 24Frame AI", async () => {
    const { rpc, inserts } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
    });
    const form = new FormData();
    form.set("story_id", "s1");
    form.set("peer_id", SOCIAL_FRAME_AI_ID);
    expect(await sendSocialStoryItem(form)).toEqual({ error: SOCIAL.stories.sendFailed });
    expect(rpc).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("sends a post share card to each selected person", async () => {
    const { from, rpc, inserts } = mockPostShare();
    const form = postShareForm(["u2", "u3"], "watch this");
    expect(await sendSocialPostShare(form)).toEqual({});
    expect(rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u2" });
    expect(rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u3" });
    expect(rpc).not.toHaveBeenCalledWith("can_access_group_content", expect.anything());
    expect(from).not.toHaveBeenCalledWith("conversations");
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({
      table: "messages",
      row: {
        sender_id: "u1",
        conversation_id: "conv-u2",
        body: "watch this",
        status: "active",
      },
    });
    const row = inserts[0]?.row as { media: Array<Record<string, unknown>> };
    expect(row.media.at(-1)).toMatchObject({
      kind: "post-share",
      postId: "p1",
      authorId: POST_SHARE_AUTHOR,
      authorHandle: "ada",
      caption: "DO YALL KNOW",
      attemptId: POST_SHARE_ATTEMPT,
    });
    expect(row.media.some((item) => item.playbackId === "abc12345xx")).toBe(true);
    expect(JSON.stringify(row)).not.toMatch(/\/social\/p\/|https?:/);
  });

  it("does not open a direct conversation when a post share peer is 24Frame AI", async () => {
    const { rpc, inserts } = mockPostShare();
    const result = await sendSocialPostShare(postShareForm([SOCIAL_FRAME_AI_ID, "u2"]));
    expect(result.failedPeerIds).toContain(SOCIAL_FRAME_AI_ID);
    const opened = rpc.mock.calls
      .filter(([name]) => name === "open_or_get_direct_conversation")
      .map(([, args]) => (args as { p_peer: string }).p_peer);
    expect(opened).toEqual(["u2"]);
    expect(inserts).toHaveLength(1);
  });

  it("refuses a peer who is not on the story-send allowlist", async () => {
    const { rpc, inserts } = mockPostShare({ followeeIds: ["u2"] });
    const result = await sendSocialPostShare(postShareForm(["u2", "u9"]));
    expect(result.failedPeerIds).toEqual(["u9"]);
    expect(result.error).toBe(SOCIAL.post.shareFailed);
    expect(inserts).toHaveLength(1);
    const opened = rpc.mock.calls
      .filter(([name]) => name === "open_or_get_direct_conversation")
      .map(([, args]) => (args as { p_peer: string }).p_peer);
    expect(opened).toEqual(["u2"]);
  });

  it("refuses a group post when the recipient cannot view it and copies no media", async () => {
    const { rpc, inserts } = mockPostShare({
      followeeIds: ["u2"],
      groupId: "g1",
      access: false,
    });
    const result = await sendSocialPostShare(postShareForm(["u2"]));
    expect(result.failedPeerIds).toEqual(["u2"]);
    expect(result.error).toBe(SOCIAL.post.shareFailedPeers("Lauren"));
    expect(inserts).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("can_access_group_content", { p_group: "g1", p_user: "u2" });
    expect(rpc).not.toHaveBeenCalledWith("open_or_get_direct_conversation", expect.anything());
    expect(JSON.stringify(inserts)).not.toContain("abc12345xx");
    const send = readFileSync("src/app/(app)/social/light-actions.ts", "utf8");
    const fn = send.slice(
      send.indexOf("export async function sendSocialPostShare"),
      send.indexOf("export async function listStorySendPeople"),
    );
    const view = fn.indexOf("recipientMayViewPost");
    expect(view).toBeGreaterThan(-1);
    expect(fn.indexOf("ownedMediaItems")).toBeGreaterThan(view);
    expect(fn.indexOf("open_or_get_direct_conversation")).toBeGreaterThan(view);
  });

  it("fails closed when the group access check errors", async () => {
    const { rpc, inserts } = mockPostShare({
      followeeIds: ["u2"],
      groupId: "g1",
      accessError: { message: "no" },
    });
    const result = await sendSocialPostShare(postShareForm(["u2"]));
    expect(result.failedPeerIds).toEqual(["u2"]);
    expect(inserts).toEqual([]);
    expect(rpc).not.toHaveBeenCalledWith("open_or_get_direct_conversation", expect.anything());
  });

  it("skips peers already sent for this attempt when the sheet retries", async () => {
    const { inserts } = mockPostShare({ failInsertPeers: new Set(["u3"]) });
    const form = postShareForm(["u2", "u3"]);
    const first = await sendSocialPostShare(form);
    expect(first.failedPeerIds).toEqual(["u3"]);
    expect(inserts).toHaveLength(1);
    expect(await sendSocialPostShare(form)).toEqual({});
    expect(inserts).toHaveLength(2);
    const rooms = inserts.map((entry) => (entry.row as { conversation_id: string }).conversation_id);
    expect(rooms.filter((id) => id === "conv-u2")).toEqual(["conv-u2"]);
    expect(rooms.filter((id) => id === "conv-u3")).toEqual(["conv-u3"]);
  });

  it("does not open a conversation when the share attempt id is missing", async () => {
    const { rpc, inserts } = mockPostShare();
    const form = new FormData();
    form.set("post_id", "p1");
    form.append("peer_id", "u2");
    expect(await sendSocialPostShare(form)).toEqual({ error: SOCIAL.post.shareFailed });
    expect(inserts).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("creates a comment when a profile exists", async () => {
    const { inserts } = stub({ profile: { id: "u1" } });
    const form = new FormData();
    form.set("post_id", "p1");
    form.set("body", "  hello  ");
    expect(await createSocialComment(form)).toEqual({
      id: "c1",
      created_at: "2026-09-21T12:00:00.000Z",
    });
    expect(inserts).toEqual([{ table: "comments", row: commentInsertRow({ postId: "p1", authorId: "u1", body: "hello" }) }]);
  });

  it("rejects an empty comment body", async () => {
    stub({ profile: { id: "u1" } });
    const form = new FormData();
    form.set("post_id", "p1");
    form.set("body", "   ");
    expect(await createSocialComment(form)).toEqual({ error: SOCIAL.post.commentMissing });
  });

  it("soft-deletes own comment", async () => {
    const { updates } = stub({ profile: { id: "u1" } });
    const form = new FormData();
    form.set("comment_id", "c1");
    expect(await deleteSocialComment(form)).toEqual({});
    expect(updates[0]).toMatchObject({
      table: "comments",
      row: { deleted_at: expect.any(String) },
    });
  });

  it("opens a DM through the RPC and never inserts conversations", async () => {
    const { from, rpc } = stub({
      profile: { id: "u1" },
      rpcData: "conv-1",
    });
    const form = new FormData();
    form.set("peer_id", "u2");
    await expect(openSocialDm(form)).rejects.toThrow("REDIRECT:/social/dms/conv-1");
    expect(rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u2" });
    expect(from).not.toHaveBeenCalledWith("conversations");
    expect(from).not.toHaveBeenCalledWith("conversation_participants");
  });

  it("sends a DM and returns to the latest thread path", async () => {
    stub({ profile: { id: "u1" } });
    const form = new FormData();
    form.set("conversation_id", "conv-1");
    form.set("body", "hello");
    await expect(sendSocialDm(form)).rejects.toThrow("REDIRECT:/social/dms/conv-1");
  });

  it("refuses adding people into an existing thread", async () => {
    const rpc = vi.fn();
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(), rpc } as never);
    const form = new FormData();
    form.set("conversation_id", "conv-1");
    form.set("handles", "carol");
    expect(await addSocialDmPeople(form)).toEqual({ error: SOCIAL.dms.membershipSealed });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses an oversized add-people batch before the RPC", async () => {
    const rpc = vi.fn();
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: { id: "u1" }, error: null })),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: table === "profiles" ? [{ id: "u1" }] : { id: "u1" },
            error: null,
          }).then(resolve),
      };
      return chain;
    });
    vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);

    const form = new FormData();
    form.set("conversation_id", "conv-1");
    form.set("handles", Array.from({ length: 33 }, (_, i) => `peer${i}`).join(" "));
    expect(await addSocialDmPeople(form)).toEqual({ error: SOCIAL.dms.membershipSealed });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("quiets a blocked add-people RPC error", async () => {
    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: { id: "u1" }, error: null })),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: table === "profiles" ? [{ id: "u3", handle: "carol" }] : { id: "u1" },
            error: null,
          }).then(resolve),
      };
      return chain;
    });
    const rpc = vi.fn(async () => ({ data: null, error: { message: "blocked" } }));
    vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);

    const form = new FormData();
    form.set("conversation_id", "conv-1");
    form.set("handles", "carol");
    expect(await addSocialDmPeople(form)).toEqual({ error: SOCIAL.dms.membershipSealed });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("opens a 1:1 from one selected person", async () => {
    const { rpc, from } = stub({ profile: { id: "u1" }, rpcData: "conv-1" });
    const form = new FormData();
    form.append("peer_id", "u2");
    await expect(startSocialDm(form)).rejects.toThrow("REDIRECT:/social/dms/conv-1");
    expect(rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u2" });
    expect(from).not.toHaveBeenCalledWith("conversations");
  });

  it("creates a fresh group from two other people", async () => {
    const { rpc, from } = stub({ profile: { id: "u1" }, rpcData: "conv-g" });
    const form = new FormData();
    form.append("peer_id", "u2");
    form.append("peer_id", "u3");
    await expect(startSocialDm(form)).rejects.toThrow("REDIRECT:/social/dms/conv-g");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("create_group_conversation", { p_peers: ["u2", "u3"] });
    expect(from).not.toHaveBeenCalledWith("conversations");
    expect(from).not.toHaveBeenCalledWith("conversation_participants");
  });

  it("sets an optional name on a fresh multi-party DM and leaves a 1:1 untitled", async () => {
    const named = stub({ profile: { id: "u1" }, rpcData: "conv-g" });
    const form = new FormData();
    form.append("peer_id", "u2");
    form.append("peer_id", "u3");
    form.set("title", "Desk room");
    await expect(startSocialDm(form)).rejects.toThrow("REDIRECT:/social/dms/conv-g");
    expect(named.rpc).toHaveBeenNthCalledWith(1, "create_group_conversation", { p_peers: ["u2", "u3"] });
    expect(named.rpc).toHaveBeenNthCalledWith(2, "set_group_conversation_title", {
      p_conversation: "conv-g",
      p_title: "Desk room",
    });

    const direct = stub({ profile: { id: "u1" }, rpcData: "conv-1" });
    const one = new FormData();
    one.append("peer_id", "u2");
    one.set("title", "Nope");
    await expect(startSocialDm(one)).rejects.toThrow("REDIRECT:/social/dms/conv-1");
    expect(direct.rpc).toHaveBeenCalledTimes(1);
    expect(direct.rpc).toHaveBeenCalledWith("open_or_get_direct_conversation", { p_peer: "u2" });
  });

  it("rejects an overlong group name before creating a room", async () => {
    const { rpc } = stub({ profile: { id: "u1" }, rpcData: "conv-g" });
    const form = new FormData();
    form.append("peer_id", "u2");
    form.append("peer_id", "u3");
    form.set("title", "x".repeat(81));
    expect(await startSocialDm(form)).toEqual({ error: SOCIAL.dms.titleInvalid });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("persists the published copy of an image upload and the Mux video label on posts.media", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const upload = `posts/upload/${author}/${object}.jpg`;
    const native = new FormData();
    native.set("body", "with media");
    native.set(
      "media",
      JSON.stringify([
        { kind: "image", key: upload, contentType: "image/jpeg" },
        { kind: "video", key: `posts/upload/${author}/${object}.mp4`, contentType: "video/mp4" },
      ]),
    );
    expect(await createSocialPost(native)).toEqual({ error: SOCIAL.home.mediaType });
    const media = [
      { kind: "image" as const, key: upload, contentType: "image/jpeg" as const },
      {
        kind: "video" as const,
        key: `posts/${author}/${object}.mp4`,
        contentType: "video/mp4" as const,
        provider: "mux" as const,
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        uploadId: "zd01Pe2bNpYhxbrwYABgFE",
        assetId: "SqQnqz6s5MBuXGvJaUWdXu",
        playbackPolicy: "signed" as const,
      },
    ];
    const form = new FormData();
    form.set("body", "with media");
    form.set("media", JSON.stringify(media));
    await expect(createSocialPost(form)).rejects.toThrow("REDIRECT:/social");
    const published = publishedCopyKey();
    expect(isOwnedSocialMediaKey(published, author, "posts")).toBe(true);
    expect(headSocialMediaObject).toHaveBeenCalledTimes(1);
    expect(headSocialMediaObject).toHaveBeenCalledWith(upload, expect.any(Function));
    expect(copySocialMediaObject).toHaveBeenCalledTimes(1);
    expect(copySocialMediaObject).toHaveBeenCalledWith({
      sourceKey: upload,
      etag: '"e1"',
      destinationKey: published,
      contentType: "image/jpeg",
    });
    expect(inserts).toEqual([
      {
        table: "posts",
        row: postInsertRow({
          authorId: author,
          body: "with media",
          media: [{ ...media[0], key: published }, media[1]],
        }),
      },
    ]);
  });

  it("rejects a post when the stored object is missing, oversized, or a different type", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const form = new FormData();
    form.set("body", "Testing a post with a photo attached");
    form.set(
      "media",
      JSON.stringify([{ kind: "image", key: `posts/upload/${author}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce(null);
    expect(await createSocialPost(form)).toEqual({ error: SOCIAL.home.mediaMissing });
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce({
      bytes: 11 * 1024 * 1024,
      contentType: "image/jpeg",
      etag: '"e1"',
    });
    expect(await createSocialPost(form)).toEqual({ error: SOCIAL.home.mediaTooLarge });
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce({ bytes: 1200, contentType: "video/mp4", etag: '"e1"' });
    expect(await createSocialPost(form)).toEqual({ error: SOCIAL.home.mediaType });
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce({ bytes: 1200, contentType: "image/jpeg", etag: null });
    expect(await createSocialPost(form)).toEqual({ error: SOCIAL.home.mediaMissing });
    expect(headSocialMediaObject).toHaveBeenCalledWith(`posts/upload/${author}/${object}.jpg`, expect.any(Function));

    const second = "44444444-4444-4444-8444-444444444444";
    const pair = new FormData();
    pair.set("body", "two stills");
    pair.set(
      "media",
      JSON.stringify([
        { kind: "image", key: `posts/upload/${author}/${object}.jpg`, contentType: "image/jpeg" },
        { kind: "image", key: `posts/upload/${author}/${second}.jpg`, contentType: "image/jpeg" },
      ]),
    );
    vi.mocked(headSocialMediaObject)
      .mockResolvedValueOnce({ bytes: 1200, contentType: "image/jpeg", etag: '"e1"' })
      .mockResolvedValueOnce(null);
    expect(await createSocialPost(pair)).toEqual({ error: SOCIAL.home.mediaMissing });
    expect(headSocialMediaObject).toHaveBeenCalledWith(`posts/upload/${author}/${second}.jpg`, expect.any(Function));
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("shows the upload failure and inserts nothing when the publish copy fails", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const form = new FormData();
    form.set("body", "photo");
    form.set(
      "media",
      JSON.stringify([{ kind: "image", key: `posts/upload/${author}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    vi.mocked(copySocialMediaObject).mockRejectedValueOnce(
      Object.assign(new Error("Access Denied"), { name: "AccessDenied", $metadata: { httpStatusCode: 403 } }),
    );
    vi.mocked(headSocialMediaObject)
      .mockResolvedValueOnce({ bytes: 1200, contentType: null, etag: '"e1"' })
      .mockResolvedValueOnce(null);
    expect(await createSocialPost(form)).toEqual({ error: SOCIAL.home.uploadFailed });
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(inserts).toEqual([]);
    errorLog.mockRestore();
  });

  it("rejects another author's media key on create, before any HEAD or copy", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const other = "33333333-3333-4333-8333-333333333333";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    for (const key of [`posts/upload/${other}/${object}.jpg`, `posts/${other}/${object}.jpg`]) {
      const postForm = new FormData();
      postForm.set("body", "nope");
      postForm.set("media", JSON.stringify([{ kind: "image", key, contentType: "image/jpeg" }]));
      expect(await createSocialPost(postForm)).toEqual({ error: SOCIAL.home.mediaForbidden });
    }
    for (const key of [`stories/upload/${other}/${object}.mp4`, `stories/${other}/${object}.mp4`]) {
      const storyForm = new FormData();
      storyForm.set("media", JSON.stringify([{ kind: "video", key, contentType: "video/mp4" }]));
      expect(await createSocialStory(storyForm)).toEqual({ error: SOCIAL.home.mediaForbidden });
    }
    expect(headSocialMediaObject).not.toHaveBeenCalled();
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("refuses the author's own stored-shape key as a source: only upload keys publish", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const postForm = new FormData();
    postForm.set("body", "old key");
    postForm.set(
      "media",
      JSON.stringify([{ kind: "image", key: `posts/${author}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    expect(await createSocialPost(postForm)).toEqual({ error: SOCIAL.home.mediaForbidden });
    const storyForm = new FormData();
    storyForm.set(
      "media",
      JSON.stringify([{ kind: "image", key: `stories/${author}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    expect(await createSocialStory(storyForm)).toEqual({ error: SOCIAL.home.mediaForbidden });
    expect(headSocialMediaObject).not.toHaveBeenCalled();
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("rejects title-bucket keys on create", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const form = new FormData();
    form.set("body", "nope");
    form.set(
      "media",
      JSON.stringify([
        {
          kind: "video",
          key: `orgs/${author}/titles/${object}/master/clip.mp4`,
          contentType: "video/mp4",
        },
      ]),
    );
    expect(await createSocialPost(form)).toEqual({ error: SOCIAL.home.mediaForbidden });
    expect(inserts).toEqual([]);
  });

  it("presigns a member media PUT and never uses a title key", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    stub({ profile: { id: author } });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(object);
    vi.mocked(presignSocialMediaPut).mockResolvedValue("https://s3.example/put");
    const form = new FormData();
    form.set("content_type", "image/jpeg");
    form.set("byte_length", "1200");
    expect(await presignSocialMediaUpload(form)).toEqual({
      key: `posts/upload/${author}/${object}.jpg`,
      url: "https://s3.example/put",
      kind: "image",
      contentType: "image/jpeg",
    });
    expect(presignSocialMediaPut).toHaveBeenCalledWith(`posts/upload/${author}/${object}.jpg`, "image/jpeg", 1200);
  });

  it("accepts a still on story create and stories-lane presign", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const upload = `stories/upload/${author}/${object}.jpg`;
    const form = new FormData();
    form.set("media", JSON.stringify([{ kind: "image", key: upload, contentType: "image/jpeg" }]));
    expect(await createSocialStory(form)).toEqual({});
    const published = publishedCopyKey();
    expect(isOwnedSocialMediaKey(published, author, "stories")).toBe(true);
    expect(copySocialMediaObject).toHaveBeenCalledWith({
      sourceKey: upload,
      etag: '"e1"',
      destinationKey: published,
      contentType: "image/jpeg",
    });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      table: "stories",
      row: {
        media: [{ kind: "image", key: published, contentType: "image/jpeg" }],
      },
    });

    vi.spyOn(crypto, "randomUUID").mockReturnValue(object);
    vi.mocked(presignSocialMediaPut).mockResolvedValue("https://s3.example/put");
    const imageSign = new FormData();
    imageSign.set("content_type", "image/jpeg");
    imageSign.set("byte_length", "1200");
    imageSign.set("lane", "stories");
    expect(await presignSocialMediaUpload(imageSign)).toEqual({
      key: `stories/upload/${author}/${object}.jpg`,
      url: "https://s3.example/put",
      kind: "image",
      contentType: "image/jpeg",
    });
    expect(presignSocialMediaPut).toHaveBeenCalledWith(
      `stories/upload/${author}/${object}.jpg`,
      "image/jpeg",
      1200,
    );

    vi.mocked(presignSocialMediaPut).mockResolvedValue("https://s3.example/put");
    const videoSign = new FormData();
    videoSign.set("content_type", "video/mp4");
    videoSign.set("byte_length", "1200");
    videoSign.set("lane", "stories");
    expect(await presignSocialMediaUpload(videoSign)).toEqual({
      key: `stories/upload/${author}/${object}.mp4`,
      url: "https://s3.example/put",
      kind: "video",
      contentType: "video/mp4",
    });
    expect(presignSocialMediaPut).toHaveBeenCalledWith(`stories/upload/${author}/${object}.mp4`, "video/mp4", 1200);
  });

  it("rejects a story when the stored object is missing, oversized, or a different type", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    const form = new FormData();
    form.set(
      "media",
      JSON.stringify([{ kind: "image", key: `stories/upload/${author}/${object}.jpg`, contentType: "image/jpeg" }]),
    );
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce(null);
    expect(await createSocialStory(form)).toEqual({ error: SOCIAL.stories.photoMissing });
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce({
      bytes: 11 * 1024 * 1024,
      contentType: "image/jpeg",
      etag: '"e1"',
    });
    expect(await createSocialStory(form)).toEqual({ error: SOCIAL.home.mediaTooLarge });
    vi.mocked(headSocialMediaObject).mockResolvedValueOnce({ bytes: 1200, contentType: "video/mp4", etag: '"e1"' });
    expect(await createSocialStory(form)).toEqual({ error: SOCIAL.stories.photoMediaType });
    expect(headSocialMediaObject).toHaveBeenCalledWith(`stories/upload/${author}/${object}.jpg`, expect.any(Function));
    const video = new FormData();
    video.set(
      "media",
      JSON.stringify([{ kind: "video", key: `stories/upload/${author}/${object}.mp4`, contentType: "video/mp4" }]),
    );
    expect(await createSocialStory(video)).toEqual({ error: SOCIAL.stories.mediaType });
    expect(copySocialMediaObject).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("creates a Mux direct upload for Social Video and finalizes the playback id", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    stub({ profile: { id: author } });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(object);
    vi.mocked(createSocialMuxDirectUpload).mockResolvedValue({
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      url: "https://storage.googleapis.com/mux-upload",
    });
    const start = new FormData();
    start.set("content_type", "video/mp4");
    start.set("byte_length", "1200");
    start.set("intent", "video");
    start.set("source_width", "3840");
    start.set("source_height", "2160");
    expect(await createSocialMuxUpload(start)).toEqual({
      key: `posts/${author}/${object}.mp4`,
      url: "https://storage.googleapis.com/mux-upload",
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      kind: "video",
      contentType: "video/mp4",
    });
    expect(socialMuxSettingsFromUploadInput).toHaveBeenCalledWith({
      intent: "video",
    });
    expect(presignSocialMediaPut).not.toHaveBeenCalled();
    expect(createSocialMuxDirectUpload).toHaveBeenCalledWith({
      settings: { videoQuality: "basic", maxResolutionTier: "2160p" },
      passthrough: `${author}:${object}`,
    });

    vi.mocked(finalizeSocialMuxDirectUpload).mockResolvedValue({
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      assetId: "SqQnqz6s5MBuXGvJaUWdXu",
      playbackId: "uNbxnGLKJ00yfbijDO8COxT",
    });
    const finish = new FormData();
    finish.set("upload_id", "zd01Pe2bNpYhxbrwYABgFE");
    finish.set("key", `posts/${author}/${object}.mp4`);
    finish.set("content_type", "video/mp4");
    expect(await finalizeSocialMuxUpload(finish)).toEqual({
      item: {
        kind: "video",
        key: `posts/${author}/${object}.mp4`,
        contentType: "video/mp4",
        provider: "mux",
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        uploadId: "zd01Pe2bNpYhxbrwYABgFE",
        assetId: "SqQnqz6s5MBuXGvJaUWdXu",
        playbackPolicy: "signed",
      },
    });
    expect(finalizeSocialMuxDirectUpload).toHaveBeenCalledWith("zd01Pe2bNpYhxbrwYABgFE", author);

    vi.mocked(finalizeSocialMuxDirectUpload).mockRejectedValue(new SocialMuxUploadNotBoundError());
    expect(await finalizeSocialMuxUpload(finish)).toEqual({ error: SOCIAL.home.mediaForbidden });

    vi.mocked(finalizeSocialMuxDirectUpload).mockRejectedValue(new Error("Mux playback id is still preparing"));
    expect(await finalizeSocialMuxUpload(finish)).toEqual({ error: SOCIAL.home.videoPreparing });
  });

  it("logs why an upload step failed, without keys or URLs", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    stub({ profile: { id: author } });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(object);
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const lines = () => logged.mock.calls.map(([line]) => JSON.parse(String(line)));

    // muxRequest attaches the HTTP status to its error.
    vi.mocked(createSocialMuxDirectUpload).mockRejectedValueOnce(
      Object.assign(new Error("Plan asset limit reached"), { status: 402 }),
    );
    const start = new FormData();
    start.set("content_type", "video/mp4");
    start.set("byte_length", "1200");
    start.set("lane", "stories");
    expect(await createSocialMuxUpload(start)).toEqual({ error: SOCIAL.home.uploadFailed });
    expect(lines()).toEqual([
      {
        msg: "social media upload failed",
        lane: "stories",
        step: "mux-create",
        name: "Error",
        status: 402,
        cause: null,
        detail: "Plan asset limit reached",
      },
    ]);

    logged.mockClear();
    vi.mocked(finalizeSocialMuxDirectUpload).mockRejectedValueOnce(
      Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }),
    );
    const finish = new FormData();
    finish.set("upload_id", "zd01Pe2bNpYhxbrwYABgFE");
    finish.set("key", `stories/${author}/${object}.mp4`);
    finish.set("content_type", "video/mp4");
    expect(await finalizeSocialMuxUpload(finish)).toEqual({ error: SOCIAL.home.videoPreparing });
    expect(lines()).toEqual([
      {
        msg: "social media upload failed",
        lane: "stories",
        step: "mux-finalize",
        name: "TypeError",
        status: null,
        cause: "ECONNRESET",
        detail: "fetch failed",
      },
    ]);

    logged.mockClear();
    vi.mocked(finalizeSocialMuxDirectUpload).mockRejectedValueOnce(new SocialMuxUploadNotBoundError());
    expect(await finalizeSocialMuxUpload(finish)).toEqual({ error: SOCIAL.home.mediaForbidden });
    expect(logged).not.toHaveBeenCalled();

    vi.mocked(presignSocialMediaPut).mockRejectedValueOnce(
      Object.assign(new Error("Access Denied"), { name: "AccessDenied", $metadata: { httpStatusCode: 403 } }),
    );
    const photo = new FormData();
    photo.set("content_type", "image/jpeg");
    photo.set("byte_length", "1200");
    expect(await presignSocialMediaUpload(photo)).toEqual({ error: SOCIAL.home.uploadFailed });
    expect(lines()).toEqual([
      {
        msg: "social media upload failed",
        lane: "posts",
        step: "presign",
        name: "AccessDenied",
        status: 403,
        cause: null,
        detail: "Access Denied",
      },
    ]);
    logged.mockRestore();
  });

  it("logs a browser PUT failure the client reports, and only a known step", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    stub({ profile: { id: author } });
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const report = (fields: Record<string, string>) => {
      const form = new FormData();
      for (const [name, value] of Object.entries(fields)) form.set(name, value);
      return reportSocialMediaUploadFailure(form);
    };

    await report({ step: "mux-put", lane: "stories", status: "0", url: "https://storage.example/x" });
    await report({ step: "s3-put", lane: "posts", status: "403" });
    await report({ step: "s3-put", lane: "posts", status: "9000" });
    await report({ step: "copy", lane: "posts", status: "500" });
    await report({ step: "presign", lane: "posts", status: "500" });
    expect(logged.mock.calls.map(([line]) => JSON.parse(String(line)))).toEqual([
      {
        msg: "social media upload failed",
        lane: "stories",
        step: "mux-put",
        name: "UploadPutFailed",
        status: 0,
        cause: null,
        detail: null,
      },
      expect.objectContaining({ lane: "posts", step: "s3-put", status: 403 }),
      expect.objectContaining({ lane: "posts", step: "s3-put", status: null }),
    ]);
    expect(logged.mock.calls.some(([line]) => String(line).includes("storage.example"))).toBe(false);
    logged.mockRestore();
  });

  it("rejects a Mux post or story when publish cannot verify the member owns the upload", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    const { inserts } = stub({ profile: { id: author } });
    vi.mocked(verifySocialMuxPublishedItems).mockResolvedValue(false);
    const mux = {
      kind: "video",
      contentType: "video/mp4",
      provider: "mux",
      playbackId: "uNbxnGLKJ00yfbijDO8COxT",
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      assetId: "SqQnqz6s5MBuXGvJaUWdXu",
      playbackPolicy: "signed",
    };
    const post = new FormData();
    post.set("body", "clip");
    post.set("media", JSON.stringify([{ ...mux, key: `posts/${author}/${object}.mp4` }]));
    expect(await createSocialPost(post)).toEqual({ error: SOCIAL.home.mediaForbidden });
    const story = new FormData();
    story.set("media", JSON.stringify([{ ...mux, key: `stories/${author}/${object}.mp4` }]));
    expect(await createSocialStory(story)).toEqual({ error: SOCIAL.home.mediaForbidden });
    expect(inserts).toEqual([]);
    expect(verifySocialMuxPublishedItems).toHaveBeenCalled();
    vi.mocked(verifySocialMuxPublishedItems).mockResolvedValue(true);
  });

  it("opens a Mux upload on the stories lane and finalizes that key", async () => {
    const author = "11111111-1111-4111-8111-111111111111";
    const object = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getAuthUser).mockResolvedValue({ id: author, email: "ada@example.com" } as never);
    stub({ profile: { id: author } });
    vi.spyOn(crypto, "randomUUID").mockReturnValue(object);
    vi.mocked(createSocialMuxDirectUpload).mockResolvedValue({
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      url: "https://storage.googleapis.com/mux-upload",
    });
    const form = new FormData();
    form.set("content_type", "video/mp4");
    form.set("byte_length", "1200");
    form.set("lane", "stories");
    expect(await createSocialMuxUpload(form)).toEqual({
      key: `stories/${author}/${object}.mp4`,
      url: "https://storage.googleapis.com/mux-upload",
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      kind: "video",
      contentType: "video/mp4",
    });
    expect(createSocialMuxDirectUpload).toHaveBeenCalled();
    vi.mocked(finalizeSocialMuxDirectUpload).mockResolvedValue({
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      assetId: "SqQnqz6s5MBuXGvJaUWdXu",
      playbackId: "uNbxnGLKJ00yfbijDO8COxT",
    });
    const finish = new FormData();
    finish.set("upload_id", "zd01Pe2bNpYhxbrwYABgFE");
    finish.set("key", `stories/${author}/${object}.mp4`);
    finish.set("content_type", "video/mp4");
    expect(await finalizeSocialMuxUpload(finish)).toMatchObject({
      item: { playbackId: "uNbxnGLKJ00yfbijDO8COxT", key: `stories/${author}/${object}.mp4` },
    });
  });

  it("stores bio newlines and counts them toward 150", async () => {
    const { updates } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("bio", "Founder\nInvestor");
    expect(await updateSocialBio(form)).toEqual({});
    expect(updates).toEqual([{ table: "profiles", row: { bio: "Founder\nInvestor" } }]);
  });

  it("rejects a bio over 150 including newlines", async () => {
    stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    });
    const form = new FormData();
    form.set("bio", `a\n${"b".repeat(149)}`);
    expect(await updateSocialBio(form)).toEqual({ error: SOCIAL.profile.bioLimit });
  });

  it("inserts a follow, notifies the followee, and does not rewrite Home", async () => {
    const { inserts, rpc } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
    });
    const form = new FormData();
    form.set("followee_id", "u2");
    form.set("handle", "joshua");
    form.set("following", "0");
    expect(await toggleSocialFollow(form)).toEqual({});
    expect(inserts).toEqual([{ table: "follows", row: followInsertRow("u1", "u2") }]);
    expect(rpc).toHaveBeenCalledWith("notify_new_follower", {
      p_followee: "u2",
      p_title: SOCIAL.follow.newFollowerTitle,
      p_body: "@ada followed you",
      p_source_refs: { actor_id: "u1", handle: "ada", path: "/social/u/ada" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes a follow and does not notify", async () => {
    const { inserts, deletes, rpc } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
    });
    const form = new FormData();
    form.set("followee_id", "u2");
    form.set("handle", "joshua");
    form.set("following", "1");
    expect(await toggleSocialFollow(form)).toEqual({});
    expect(inserts).toEqual([]);
    expect(deletes).toEqual([{ table: "follows" }]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("treats a unique follow insert as already following and skips notify", async () => {
    const { rpc } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
      insertError: { message: "duplicate key value", code: "23505" },
    });
    const form = new FormData();
    form.set("followee_id", "u2");
    form.set("handle", "joshua");
    form.set("following", "0");
    expect(await toggleSocialFollow(form)).toEqual({});
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces a follow insert failure instead of swallowing it", async () => {
    const { rpc } = stub({
      profile: { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
      insertError: { message: "new row violates row-level security", code: "42501" },
    });
    const form = new FormData();
    form.set("followee_id", "u2");
    form.set("following", "0");
    expect(await toggleSocialFollow(form)).toEqual({
      error: "new row violates row-level security",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
