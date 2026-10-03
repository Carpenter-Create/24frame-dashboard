import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { MuxAssetData } from "@/lib/social-mux-server";
import {
  SOCIAL_TOPIC_FRAME_WIDTH,
  SOCIAL_TOPIC_MEDIA_WAIT_MS,
  type SocialTopicMediaDeps,
} from "@/lib/social-topic-media";
import {
  buildSocialTopicContent,
  SOCIAL_TOPIC_LOGIC_VERSION,
  SOCIAL_TOPIC_MAX_TOKENS,
  SOCIAL_TOPIC_SYSTEM,
  type SocialTopicContentBlock,
  type SocialTopicInput,
  type SocialTopicResult,
  type SocialTopicWrite,
} from "@/lib/social-topic-tagging";
import type { Database } from "@/lib/supabase/database.types";

import {
  classifySocialTopic,
  decideSocialPostTopic,
  SOCIAL_TOPIC_CUT_OFF_RETRY_MS,
  SOCIAL_TOPIC_REQUEST_MAX_RETRIES,
  SOCIAL_TOPIC_REQUEST_TIMEOUT_MS,
  tagSocialPostTopic,
  type SocialTopicPost,
} from "./social-topic-tagger";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const STAMP = NOW.toISOString();
// Five minutes old: still inside the media wait.
const YOUNG = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
const TWO_HOURS_AGO = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();

const AUTHOR = "6f1c2d3e-4a5b-4c6d-8e7f-8091a2b3c4d5";
const STRANGER = "0a1b2c3d-4e5f-4a6b-9c7d-8e9fa0b1c2d3";
const POST_ID = "11111111-2222-4333-8444-555555555555";
const OWN_IMAGE_KEY = `posts/${AUTHOR}/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.png`;
const STRANGER_IMAGE_KEY = `posts/${STRANGER}/aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff.png`;
const PLAYBACK_ID = "playbackId0001";
const ASSET_ID = "assetId00000001";

const NO_TOPIC: SocialTopicWrite = {
  category: null,
  category_source: null,
  category_confidence: null,
  category_logic_version: null,
  category_tagged_at: STAMP,
};

type ParseRequest = {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: string; content: SocialTopicContentBlock[] }[];
  output_config: { effort: string; format: { type: string; parse: (content: string) => unknown } };
};
type ParseResponse = { stop_reason: string; content: { type: string; text?: string }[] };

function reply(text: string, stopReason = "end_turn"): ParseResponse {
  return { stop_reason: stopReason, content: [{ type: "text", text }] };
}

function answer(topic: SocialTopicResult["topic"] | string, confidence: number, stopReason = "end_turn"): ParseResponse {
  return reply(JSON.stringify({ topic, confidence }), stopReason);
}

function fakeClient(response: ParseResponse | Error = answer("Cinematography", 0.92)) {
  const create = vi.fn<(request: ParseRequest, options?: unknown) => Promise<ParseResponse>>();
  if (response instanceof Error) create.mockRejectedValue(response);
  else create.mockResolvedValue(response);
  return {
    create,
    client: { messages: { create } } as unknown as Anthropic,
    request(): ParseRequest {
      const call = create.mock.lastCall;
      if (!call) throw new Error("expected a model call");
      return call[0];
    },
  };
}

type WriteResult = { data: { id: string }[] | null; error: { message: string } | null };

// Records each builder call per table. profiles ends at maybeSingle, posts at select.
function fakeAdmin({
  crafts,
  craftsError = null,
  write = { data: [{ id: POST_ID }], error: null },
}: { crafts?: unknown; craftsError?: { message: string } | null; write?: WriteResult } = {}) {
  const ops: Record<string, unknown[][]> = {};
  const from = vi.fn((table: string) => {
    if (table !== "profiles" && table !== "posts") throw new Error(`unexpected table ${table}`);
    const log = (ops[table] ??= []);
    const terminal = table === "profiles" ? "maybeSingle" : "select";
    const result =
      table === "profiles" ? { data: crafts === undefined ? null : { crafts }, error: craftsError } : write;
    const query: Record<string, (...args: unknown[]) => unknown> = {};
    for (const name of ["select", "update", "eq", "is", "or", "maybeSingle"]) {
      query[name] = (...args) => {
        log.push([name, ...args]);
        return name === terminal ? Promise.resolve(result) : query;
      };
    }
    return query;
  });
  return { from, ops, admin: { from } as unknown as SupabaseClient<Database> };
}

function expectGuardedWrite(log: unknown[][] | undefined, values: SocialTopicWrite) {
  expect(log?.[0]).toEqual(["update", values]);
  expect(log).toEqual(
    expect.arrayContaining([
      ["eq", "id", POST_ID],
      ["is", "category_tagged_at", null],
      // No topic, or an AI topic a caption edit reopened. Never an author's
      // topic, or one recorded before provenance (a topic with no source).
      ["or", "category.is.null,category_source.eq.ai"],
      // Only the caption it read: an unedited post must still be unedited.
      ["is", "edited_at", null],
    ]),
  );
}

function imageItem(key: string) {
  return { kind: "image", key, contentType: "image/png" };
}

function videoItem() {
  return {
    kind: "video",
    key: `posts/${AUTHOR}/aaaaaaaa-bbbb-4ccc-8ddd-000000000000.mp4`,
    contentType: "video/mp4",
    provider: "mux",
    playbackId: PLAYBACK_ID,
    assetId: ASSET_ID,
  };
}

function readyAsset(owner = AUTHOR): MuxAssetData {
  return {
    id: ASSET_ID,
    status: "ready",
    duration: 20,
    passthrough: `${owner}:aaaaaaaa-bbbb-4ccc-8ddd-000000000000`,
    playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
  };
}

const PREPARING: MuxAssetData = { ...readyAsset(), status: "preparing" };
const FRAME = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

function fakeDeps() {
  return {
    readImage: vi.fn<SocialTopicMediaDeps["readImage"]>(async () => null),
    retrieveAsset: vi.fn<SocialTopicMediaDeps["retrieveAsset"]>(async () => readyAsset()),
    fetchFrame: vi.fn<SocialTopicMediaDeps["fetchFrame"]>(async () => null),
  };
}

function post(overrides: Partial<SocialTopicPost> = {}): SocialTopicPost {
  return {
    id: POST_ID,
    author_id: AUTHOR,
    body: "Lighting a night exterior with one HMI. #nightshoot",
    media: [],
    created_at: YOUNG,
    edited_at: null,
    ...overrides,
  };
}

const INPUT: SocialTopicInput = {
  caption: "Blocking the cast for tomorrow's oner.",
  crafts: ["Director"],
  images: [],
};

describe("classifySocialTopic", () => {
  it("asks Sonnet 5.5 with the topic prompt, low effort, and a structured format", async () => {
    const model = fakeClient(answer("Directors", 0.88));

    expect(await classifySocialTopic(model.client, INPUT)).toEqual({
      result: { topic: "Directors", confidence: 0.88 },
      unusable: null,
    });

    expect(model.create).toHaveBeenCalledTimes(1);
    expect(model.request()).toMatchObject({
      model: "claude-sonnet-5-5",
      max_tokens: SOCIAL_TOPIC_MAX_TOKENS,
      system: SOCIAL_TOPIC_SYSTEM,
      messages: [{ role: "user", content: buildSocialTopicContent(INPUT) }],
      output_config: { effort: "low", format: { type: "json_schema" } },
    });
    // Bounded so one post fits the run's per-post deadline.
    expect(model.create.mock.lastCall?.[1]).toEqual({
      timeout: SOCIAL_TOPIC_REQUEST_TIMEOUT_MS,
      maxRetries: SOCIAL_TOPIC_REQUEST_MAX_RETRIES,
      signal: undefined,
    });
    const stop = new AbortController();
    await classifySocialTopic(model.client, INPUT, stop.signal);
    expect(model.create.mock.lastCall?.[1]).toMatchObject({ signal: stop.signal });
    expect(SOCIAL_TOPIC_REQUEST_TIMEOUT_MS * (SOCIAL_TOPIC_REQUEST_MAX_RETRIES + 1)).toBeLessThan(90_000);
  });

  // The structured format shapes the JSON; the API does not enforce the list.
  it("matches a topic to its locked spelling and discards anything else", async () => {
    const cases: [string, SocialTopicResult | null][] = [
      [JSON.stringify({ topic: " cinematography ", confidence: 0.9 }), { topic: "Cinematography", confidence: 0.9 }],
      [JSON.stringify({ topic: "FILM FESTIVALS", confidence: 0.85 }), { topic: "Film Festivals", confidence: 0.85 }],
      [JSON.stringify({ topic: "None", confidence: 0.7 }), { topic: "none", confidence: 0.7 }],
      [JSON.stringify({ topic: "Film festival", confidence: 0.9 }), null],
      [JSON.stringify({ topic: "Cooking", confidence: 0.9 }), null],
      [JSON.stringify({ topic: 7, confidence: 0.9 }), null],
      [JSON.stringify({ topic: "Music" }), null],
      ["null", null],
    ];
    for (const [text, expected] of cases) {
      expect(await classifySocialTopic(fakeClient(reply(text)).client, INPUT), text).toEqual(
        expected ? { result: expected, unusable: null } : { result: null, unusable: "unreadable" },
      );
    }
  });

  it("gives the model a format that accepts only the locked topics or none", async () => {
    const model = fakeClient();
    await classifySocialTopic(model.client, INPUT);
    const { format } = model.request().output_config;

    expect(format.parse('{"topic":"Casting","confidence":0.9}')).toEqual({ topic: "Casting", confidence: 0.9 });
    expect(format.parse('{"topic":"none","confidence":0.4}')).toEqual({ topic: "none", confidence: 0.4 });
    expect(() => format.parse('{"topic":"Cooking","confidence":0.9}')).toThrow();
  });

  it("says why there is no usable answer: a refusal, a cut-off, or an unreadable answer", async () => {
    const cases: [ParseResponse, string][] = [
      // A well-formed answer still does not count past a refusal or a cut-off.
      [answer("Acting", 0.99, "refusal"), "refusal"],
      [answer("Acting", 0.99, "max_tokens"), "cut_off"],
      [reply('{"topic":"Acting","confid', "max_tokens"), "cut_off"],
      [answer("Acting", 0.99, "model_context_window_exceeded"), "cut_off"],
      [reply('{"topic":"Acting","confid'), "unreadable"],
      [answer("Cooking", 0.9), "unreadable"],
      [reply("I can't help classify this content."), "unreadable"],
      [{ stop_reason: "end_turn", content: [] }, "unreadable"],
      [answer("Acting", 0.99, "stop_sequence"), "unreadable"],
    ];
    for (const [response, unusable] of cases) {
      expect(await classifySocialTopic(fakeClient(response).client, INPUT), JSON.stringify(response)).toEqual({
        result: null,
        unusable,
      });
    }
  });

  // The real SDK: a refusal with text must not throw (messages.parse did),
  // or the post would be retried every run. An API error still throws.
  it("reports a real refusal or cut-off and throws on an API error", async () => {
    const sdk = (body: unknown, status = 200) =>
      new Anthropic({
        apiKey: "test-key",
        authToken: null,
        baseURL: "https://claude.test",
        maxRetries: 0,
        fetch: (async () =>
          new Response(JSON.stringify(body), {
            status,
            headers: { "content-type": "application/json" },
          })) as typeof fetch,
      });
    const message = (stopReason: string, text: string) => ({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5-5",
      stop_reason: stopReason,
      content: [{ type: "text", text }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    expect(
      await classifySocialTopic(sdk(message("refusal", "I can't help classify this content.")), INPUT),
    ).toEqual({ result: null, unusable: "refusal" });
    expect(await classifySocialTopic(sdk(message("max_tokens", '{"topic":"Dir')), INPUT)).toEqual({
      result: null,
      unusable: "cut_off",
    });
    expect(
      await classifySocialTopic(sdk(message("end_turn", '{"topic":"Directors","confidence":0.9}')), INPUT),
    ).toEqual({ result: { topic: "Directors", confidence: 0.9 }, unusable: null });
    await expect(
      classifySocialTopic(sdk({ type: "error", error: { type: "api_error", message: "boom" } }, 500), INPUT),
    ).rejects.toThrow();
  });
});

describe("decideSocialPostTopic", () => {
  it("returns null while the post's video is still preparing, without calling the model", async () => {
    const model = fakeClient();
    const db = fakeAdmin();
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(PREPARING);

    const decided = await decideSocialPostTopic({
      admin: db.admin,
      client: model.client,
      post: post({ media: [videoItem()] }),
      now: NOW,
      mediaDeps: deps,
    });

    expect(decided).toBeNull();
    expect(deps.retrieveAsset).toHaveBeenCalledWith(ASSET_ID);
    expect(model.create).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  });

  it("stamps a post with nothing to read as no topic, without calling the model", async () => {
    // No caption, and no image or video frame can be read.
    for (const media of [null, [imageItem(OWN_IMAGE_KEY)], [videoItem()]]) {
      const model = fakeClient();
      const db = fakeAdmin();

      const decided = await decideSocialPostTopic({
        admin: db.admin,
        client: model.client,
        post: post({ body: "  \n ", media }),
        now: NOW,
        mediaDeps: fakeDeps(),
      });

      expect(decided).toEqual({ write: NO_TOPIC, result: null, unusable: null, imageCount: 0 });
      expect(model.create).not.toHaveBeenCalled();
      expect(db.from).not.toHaveBeenCalled();
    }
  });

  it("passes the caption and the author's crafts as profession labels", async () => {
    const model = fakeClient();
    const db = fakeAdmin({ crafts: ["director_of_photography", "colorist"] });

    await decideSocialPostTopic({ admin: db.admin, client: model.client, post: post(), now: NOW, mediaDeps: fakeDeps() });

    expect(db.ops.profiles).toEqual([
      ["select", "crafts"],
      ["eq", "id", AUTHOR],
      ["maybeSingle"],
    ]);
    expect(model.request().messages).toEqual([
      {
        role: "user",
        content: buildSocialTopicContent({
          caption: "Lighting a night exterior with one HMI. #nightshoot",
          crafts: ["Director of Photography", "Colorist"],
          images: [],
        }),
      },
    ]);
  });

  it("throws instead of classifying without crafts when the profile read fails", async () => {
    const model = fakeClient();
    const db = fakeAdmin({ craftsError: { message: "connection reset" } });

    await expect(
      tagSocialPostTopic({ admin: db.admin, client: model.client, post: post(), now: NOW, mediaDeps: fakeDeps() }),
    ).rejects.toThrow("Crafts read failed: connection reset");
    expect(model.create).not.toHaveBeenCalled();
    expect(db.ops.posts).toBeUndefined();
  });

  it("lists no crafts when the author has no profile row", async () => {
    const model = fakeClient();
    const db = fakeAdmin();

    await decideSocialPostTopic({ admin: db.admin, client: model.client, post: post(), now: NOW, mediaDeps: fakeDeps() });

    const [first] = model.request().messages[0]!.content;
    expect(first).toMatchObject({ type: "text", text: expect.stringContaining("Author's crafts: none listed") });
  });

  it("shows the model only images the author owns", async () => {
    const model = fakeClient();
    const deps = fakeDeps();
    const png = await sharp({ create: { width: 16, height: 8, channels: 3, background: "#336699" } }).png().toBuffer();
    deps.readImage.mockResolvedValue({ bytes: png, contentType: "image/png" });

    const decided = await decideSocialPostTopic({
      admin: fakeAdmin().admin,
      client: model.client,
      post: post({ body: null, media: [imageItem(STRANGER_IMAGE_KEY), imageItem(OWN_IMAGE_KEY)] }),
      now: NOW,
      mediaDeps: deps,
    });

    expect(deps.readImage.mock.calls).toEqual([[OWN_IMAGE_KEY]]);
    expect(decided?.imageCount).toBe(1);
    const content = model.request().messages[0]!.content;
    expect(content.filter((block) => block.type === "image")).toHaveLength(1);
    expect(content).toContainEqual({ type: "text", text: "Image 1" });
  });

  it("classifies a video with no caption by its frames", async () => {
    const model = fakeClient(answer("Cinematography", 0.9));
    const deps = fakeDeps();
    deps.fetchFrame.mockResolvedValue(FRAME);

    const decided = await decideSocialPostTopic({
      admin: fakeAdmin().admin,
      client: model.client,
      post: post({ body: null, media: [videoItem()] }),
      now: NOW,
      mediaDeps: deps,
    });

    expect(decided?.write.category).toBe("Cinematography");
    expect(decided?.imageCount).toBe(3);
    // 15%, 50%, and 85% into the 20-second video.
    expect(deps.fetchFrame.mock.calls).toEqual(
      [3, 10, 17].map((time) => [PLAYBACK_ID, { time, width: SOCIAL_TOPIC_FRAME_WIDTH }]),
    );
    const data = Buffer.from(FRAME).toString("base64");
    expect(model.request().messages[0]!.content).toEqual(
      buildSocialTopicContent({
        caption: null,
        crafts: [],
        images: [3, 10, 17].map((time) => ({ label: `Video frame at ${time}s`, mediaType: "image/jpeg" as const, data })),
      }),
    );
  });

  it("never reads a Mux asset the author did not upload", async () => {
    const model = fakeClient();
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset(STRANGER));
    deps.fetchFrame.mockResolvedValue(FRAME);

    await decideSocialPostTopic({
      admin: fakeAdmin().admin,
      client: model.client,
      post: post({ media: [videoItem()] }),
      now: NOW,
      mediaDeps: deps,
    });

    expect(deps.fetchFrame).not.toHaveBeenCalled();
    expect(model.request().messages[0]!.content).toEqual(
      buildSocialTopicContent({ caption: post().body, crafts: [], images: [] }),
    );
  });

  it("stops waiting for a preparing video an hour after the post, and classifies without it", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(PREPARING);
    deps.fetchFrame.mockResolvedValue(FRAME);
    const args = { admin: fakeAdmin().admin, now: NOW, mediaDeps: deps };

    const almost = fakeClient();
    const justUnderAnHour = new Date(NOW.getTime() - SOCIAL_TOPIC_MEDIA_WAIT_MS + 1000).toISOString();
    expect(
      await decideSocialPostTopic({
        ...args,
        client: almost.client,
        post: post({ media: [videoItem()], created_at: justUnderAnHour }),
      }),
    ).toBeNull();
    expect(almost.create).not.toHaveBeenCalled();

    const waited = fakeClient();
    const anHour = new Date(NOW.getTime() - SOCIAL_TOPIC_MEDIA_WAIT_MS).toISOString();
    const decided = await decideSocialPostTopic({
      ...args,
      client: waited.client,
      post: post({ media: [videoItem()], created_at: anHour }),
    });
    expect(decided?.write.category).toBe("Cinematography");
    expect(deps.fetchFrame).not.toHaveBeenCalled();
    expect(waited.request().messages[0]!.content).toEqual(
      buildSocialTopicContent({ caption: post().body, crafts: [], images: [] }),
    );
  });

  it("returns the model's answer, or why it was unusable, beside the write", async () => {
    const args = { admin: fakeAdmin().admin, post: post(), now: NOW, mediaDeps: fakeDeps() };

    const low = await decideSocialPostTopic({ ...args, client: fakeClient(answer("Producers", 0.6)).client });
    expect(low).toEqual({
      write: NO_TOPIC,
      result: { topic: "Producers", confidence: 0.6 },
      unusable: null,
      imageCount: 0,
    });

    const refused = await decideSocialPostTopic({
      ...args,
      client: fakeClient(answer("Producers", 0.99, "refusal")).client,
    });
    expect(refused).toEqual({ write: NO_TOPIC, result: null, unusable: "refusal", imageCount: 0 });
  });
});

describe("tagSocialPostTopic", () => {
  it("writes a confident topic only while the post has no topic and no look", async () => {
    const db = fakeAdmin();

    const outcome = await tagSocialPostTopic({
      admin: db.admin,
      client: fakeClient(answer("Cinematography", 0.92)).client,
      post: post(),
      now: NOW,
      mediaDeps: fakeDeps(),
    });

    expect(outcome).toBe("tagged");
    expect(db.from.mock.calls.filter(([table]) => table === "posts")).toHaveLength(1);
    expectGuardedWrite(db.ops.posts, {
      category: "Cinematography",
      category_source: "ai",
      category_confidence: 0.92,
      category_logic_version: SOCIAL_TOPIC_LOGIC_VERSION,
      category_tagged_at: STAMP,
    });
  });

  // A re-tag after a caption edit goes through the same write, so a look
  // with no topic also clears every column of the old AI topic.
  it("stamps the look alone and declines for none or low confidence", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const response of [answer("none", 0.95), answer("Cinematography", 0.79)]) {
      const db = fakeAdmin();
      const outcome = await tagSocialPostTopic({
        admin: db.admin,
        client: fakeClient(response).client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      });

      expect(outcome, JSON.stringify(response)).toBe("declined");
      expectGuardedWrite(db.ops.posts, NO_TOPIC);
    }
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("stamps an unusable answer like none, counts it apart, and logs why", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cases: [ParseResponse, string][] = [
      [answer("Cinematography", 0.99, "refusal"), "refusal"],
      [answer("Cinematography", 0.99, "max_tokens"), "cut_off"],
      [answer("Cooking", 0.99), "unreadable"],
    ];
    for (const [response, reason] of cases) {
      warn.mockClear();
      const db = fakeAdmin();
      const model = fakeClient(response);
      const outcome = await tagSocialPostTopic({
        admin: db.admin,
        client: model.client,
        // Past the cut-off retry hour, so a cut-off is stamped too.
        post: post({ created_at: TWO_HOURS_AGO }),
        now: NOW,
        mediaDeps: fakeDeps(),
      });

      expect(outcome, reason).toBe("unusable");
      // Not retried: a retry bills again for the same answer.
      expect(model.create).toHaveBeenCalledTimes(1);
      expectGuardedWrite(db.ops.posts, NO_TOPIC);
      expect(warn.mock.calls).toEqual([
        [JSON.stringify({ msg: "social topic unusable answer", postId: POST_ID, reason })],
      ]);
    }

    // Raced: nothing was stamped, so nothing is logged; the next run reads it.
    warn.mockClear();
    const raced = fakeAdmin({ write: { data: [], error: null } });
    expect(
      await tagSocialPostTopic({
        admin: raced.admin,
        client: fakeClient(answer("Acting", 0.99, "refusal")).client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      }),
    ).toBe("raced");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("retries a cut-off answer for an hour after the post or its edit, writing nothing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const justUnderAnHour = new Date(NOW.getTime() - SOCIAL_TOPIC_CUT_OFF_RETRY_MS + 1000).toISOString();
    for (const row of [
      post(),
      post({ created_at: justUnderAnHour }),
      // An edit restarts the hour, however old the post.
      post({ created_at: TWO_HOURS_AGO, edited_at: YOUNG }),
    ]) {
      const db = fakeAdmin();
      await expect(
        tagSocialPostTopic({
          admin: db.admin,
          client: fakeClient(answer("Cinematography", 0.99, "max_tokens")).client,
          post: row,
          now: NOW,
          mediaDeps: fakeDeps(),
        }),
      ).rejects.toThrow("Claude answer was cut off");
      expect(db.ops.posts).toBeUndefined();
    }
    // A refusal is not retried, however young the post.
    const refused = fakeAdmin();
    expect(
      await tagSocialPostTopic({
        admin: refused.admin,
        client: fakeClient(answer("Cinematography", 0.99, "refusal")).client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      }),
    ).toBe("unusable");
    warn.mockRestore();
  });

  it("reports a race when the guarded update matches no row", async () => {
    for (const data of [[], null]) {
      const db = fakeAdmin({ write: { data, error: null } });
      const outcome = await tagSocialPostTopic({
        admin: db.admin,
        client: fakeClient().client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      });

      expect(outcome).toBe("raced");
      expect(db.ops.posts?.[0]?.[0]).toBe("update");
    }
  });

  it("waits without a model call or a write while media is preparing", async () => {
    const model = fakeClient();
    const db = fakeAdmin();
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(PREPARING);

    const outcome = await tagSocialPostTopic({
      admin: db.admin,
      client: model.client,
      post: post({ media: [videoItem()] }),
      now: NOW,
      mediaDeps: deps,
    });

    expect(outcome).toBe("wait");
    expect(model.create).not.toHaveBeenCalled();
    expect(db.ops.posts).toBeUndefined();
  });

  it("throws without writing when the model call fails", async () => {
    const db = fakeAdmin();

    await expect(
      tagSocialPostTopic({
        admin: db.admin,
        client: fakeClient(new Error("overloaded")).client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      }),
    ).rejects.toThrow("overloaded");
    expect(db.ops.posts).toBeUndefined();
  });

  // A missing asset too: nothing in the app deletes one, so it points at
  // configuration, and the post waits for the fix instead of losing its frames.
  it("leaves the post untouched on any Mux error, a missing asset included", async () => {
    for (const error of [
      new Error("Mux request failed (503)"),
      new Error("Mux request failed (404)"),
      new Error("fetch failed"),
    ]) {
      const db = fakeAdmin();
      const model = fakeClient();
      const deps = fakeDeps();
      deps.retrieveAsset.mockRejectedValue(error);

      await expect(
        tagSocialPostTopic({
          admin: db.admin,
          client: model.client,
          post: post({ media: [videoItem()] }),
          now: NOW,
          mediaDeps: deps,
        }),
      ).rejects.toThrow(error.message);
      expect(model.create).not.toHaveBeenCalled();
      expect(db.ops.posts).toBeUndefined();
    }
  });

  it("writes nothing once the run has given up on the post", async () => {
    const db = fakeAdmin();
    const stop = new AbortController();
    const model = fakeClient();
    model.create.mockImplementation(async () => {
      stop.abort(new Error("post timed out after 90000 ms"));
      return answer("Cinematography", 0.92);
    });

    await expect(
      tagSocialPostTopic({
        admin: db.admin,
        client: model.client,
        post: post({ media: [videoItem()] }),
        now: NOW,
        mediaDeps: fakeDeps(),
        signal: stop.signal,
      }),
    ).rejects.toThrow("post timed out");
    expect(model.create.mock.lastCall?.[1]).toMatchObject({ signal: stop.signal });
    expect(db.ops.posts).toBeUndefined();

    // Given up while the media was read: no model call either.
    const unread = fakeAdmin();
    const late = new AbortController();
    const deps = fakeDeps();
    deps.readImage.mockImplementation(async () => {
      late.abort(new Error("post timed out after 90000 ms"));
      return null;
    });
    const idle = fakeClient();
    await expect(
      tagSocialPostTopic({
        admin: unread.admin,
        client: idle.client,
        post: post({ media: [imageItem(OWN_IMAGE_KEY)] }),
        now: NOW,
        mediaDeps: deps,
        signal: late.signal,
      }),
    ).rejects.toThrow("post timed out");
    expect(idle.create).not.toHaveBeenCalled();
    expect(unread.ops.posts).toBeUndefined();
  });

  it("writes an edited post only while it still has the caption it read", async () => {
    const edited = "2026-10-03T11:58:30.123456+00:00";
    const db = fakeAdmin();

    await tagSocialPostTopic({
      admin: db.admin,
      client: fakeClient().client,
      post: post({ edited_at: edited }),
      now: NOW,
      mediaDeps: fakeDeps(),
    });

    expect(db.ops.posts).toContainEqual(["eq", "edited_at", edited]);
    expect(db.ops.posts).not.toContainEqual(["is", "edited_at", null]);
  });

  it("reports a race when the caption changed while it ran", async () => {
    // The guarded update matched nothing: the author edited mid-run.
    const db = fakeAdmin({ write: { data: [], error: null } });
    expect(
      await tagSocialPostTopic({
        admin: db.admin,
        client: fakeClient().client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      }),
    ).toBe("raced");
  });

  it("throws when the write fails", async () => {
    const db = fakeAdmin({ write: { data: null, error: { message: "permission denied" } } });

    await expect(
      tagSocialPostTopic({
        admin: db.admin,
        client: fakeClient().client,
        post: post(),
        now: NOW,
        mediaDeps: fakeDeps(),
      }),
    ).rejects.toThrow("Topic write failed: permission denied");
  });
});

describe("the guarded write as the real client sends it", () => {
  it("PATCHes only a post with no look and no topic or an AI topic, with every column of a no-topic look", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const edited = "2026-10-03T11:58:30.123456+00:00";
    const writes: { url: URL; body: unknown }[] = [];
    const admin = createClient<Database>("https://db.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          if (init?.method === "PATCH") writes.push({ url, body: JSON.parse(String(init.body)) });
          // profiles: no row; posts: the one row the write matched.
          const rows = url.pathname.endsWith("/posts") ? [{ id: POST_ID }] : [];
          return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
        }) as typeof fetch,
      },
    });

    const outcome = await tagSocialPostTopic({
      admin,
      client: fakeClient(answer("none", 0.9)).client,
      post: post({ edited_at: edited }),
      now: NOW,
      mediaDeps: fakeDeps(),
    });

    expect(outcome).toBe("declined");
    expect(writes).toHaveLength(1);
    const [{ url, body }] = writes as [{ url: URL; body: unknown }];
    expect(url.pathname).toBe("/rest/v1/posts");
    // A re-tag deciding none removes the old AI topic, not just the stamp.
    expect(body).toEqual(NO_TOPIC);
    expect(url.searchParams.get("id")).toBe(`eq.${POST_ID}`);
    expect(url.searchParams.get("category_tagged_at")).toBe("is.null");
    expect(url.searchParams.getAll("or")).toEqual(["(category.is.null,category_source.eq.ai)"]);
    expect(url.searchParams.has("category")).toBe(false);
    expect(url.searchParams.get("edited_at")).toBe(`eq.${edited}`);
  });
});
