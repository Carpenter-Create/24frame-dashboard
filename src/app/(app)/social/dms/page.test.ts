import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { renderServerMarkup } from "@/lib/render-server-markup";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import { SOCIAL, socialRelativeTime } from "@/lib/social";
import { SOCIAL_DM_INBOX_ROW_CLASS } from "@/lib/social-chrome";
import { dmThreadDayLabel, dmThreadTimeLabel } from "@/lib/social-dm-thread-format";
import SocialDmsPage from "./page";
import SocialDmThreadPage from "./[id]/page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/s3-avatars", () => ({
  signedAvatarUrl: vi.fn().mockResolvedValue(null),
  signedAvatarUrls: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock("@/lib/s3-education", () => ({
  signedEducationCoverUrls: vi.fn(async () => new Map()),
}));
vi.mock("../actions", () => ({
  addSocialDmPeople: vi.fn(),
  sendSocialDm: vi.fn(),
  setSocialDmTitle: vi.fn(),
  markSocialDmRead: vi.fn(),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  addSocialDmPeople: vi.fn(),
  sendSocialDm: vi.fn(),
  setSocialDmTitle: vi.fn(),
  markSocialDmRead: vi.fn(),
}));

function ctx() {
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: [],
    orgs: [],
    activeOrg: null,
    activeRole: null,
    canOperate: false,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

function inboxFrom(profiles: unknown) {
  return vi.fn((table: string) => {
    if (table === "profiles") return chain(profiles);
    if (table === "follows" || table === "courses" || table === "messages") return chain([]);
    throw new Error(`unexpected from(${table})`);
  });
}

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.is = vi.fn(self);
  c.or = vi.fn(self);
  c.order = vi.fn(self);
  c.range = vi.fn(async () => ({ data: result, error: null }));
  c.maybeSingle = vi.fn(async () => ({
    data: Array.isArray(result) ? (result[0] ?? null) : result,
    error: null,
  }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: result, error: null }).then(resolve);
  return c;
}

describe("social DMs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(signedAvatarUrls).mockResolvedValue(new Map());
  });

  it("lists a group room with initials when faces are missing", async () => {
    const from = inboxFrom([
      { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
      { id: "u2", handle: "bob", display_name: "Bob One", status: "active" },
      { id: "u3", handle: "carol", display_name: "Carol One", status: "active" },
    ]);
    const rpc = vi.fn(async () => ({
      data: [
        {
          conversation_id: "c-group",
          last_message_at: "2026-09-12T14:00:00.000Z",
          unread_count: 1,
          muted: false,
          peer_id: null,
          kind: "group",
          title: null,
          participant_ids: ["u2", "u3"],
        },
      ],
      error: null,
    }));
    vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);

    const html = await renderServerMarkup(await SocialDmsPage());
    expect(html).toContain("data-social-dms");
    expect(html).toContain('data-social-dm-kind="group"');
    expect(html).toContain("Bob One, Carol One");
    expect(html).toContain("data-social-conversation-faces");
    expect(html).toContain("BO");
    expect(html).toContain("CO");
    expect(html).toContain("data-social-dms-header");
    expect(html).toContain("data-social-dms-title");
    expect(html).toContain(">ada<");
    expect(html).toContain("data-social-dms-search");
    expect(html).toContain('placeholder="Search"');
    expect(html).toContain('data-social-icon="pencil-simple"');
    expect(html).toContain('href="/social/dms/new"');
    expect(html).toContain("data-social-dm-unread");
    expect(html).toContain("bg-accent");
    expect(html).toContain('aria-label="1 unread"');
    expect(html).not.toContain(">1 unread<");
    expect(html).toContain("data-social-dm-time");
    expect(html).toContain(socialRelativeTime("2026-09-12T14:00:00.000Z"));
    expect(html).toContain(SOCIAL_DM_INBOX_ROW_CLASS);
    expect(SOCIAL_DM_INBOX_ROW_CLASS).not.toContain("border-b");
    expect(html).not.toContain(SOCIAL.dms.subtitle);
    expect(html).toContain("data-social-for-you");
    expect(html).toContain("lg:max-w-[720px]");
    expect(html).toContain("lg:max-w-[1052px]");
    expect(html).toContain("gap-[32px]");
    expect(html).not.toContain("lg:max-w-[600px]");
    expect(html).not.toContain("lg:max-w-[932px]");
    expect(html).toContain("w-[300px]");
    expect(html).toContain("lg:flex");
    expect(html).not.toContain("892");
    const title = html.slice(html.indexOf("data-social-dms-title"), html.indexOf("data-social-dms-start"));
    expect(title).not.toContain("24Frame");
    const ai = html.indexOf('data-social-dm-kind="frame-ai"');
    const group = html.indexOf('data-social-dm-kind="group"');
    expect(ai).toBeGreaterThan(-1);
    expect(ai).toBeLessThan(group);
    expect(html).toContain('href="/social/dms/24frame-ai"');
    expect(html).toContain("data-social-frame-ai-face");
    expect(html).toContain("data-house-ai-mark");
    expect(html).toContain("24Frame AI");
    expect(rpc).toHaveBeenCalledWith("get_dm_inbox", { p_limit: 51 });
    expect(html).not.toContain("data-social-dms-truncated");
  });

  it("keeps compose on the pencil and a quiet empty inbox", async () => {
    const from = inboxFrom([
      { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
    ]);
    vi.mocked(createClient).mockResolvedValue({
      from,
      rpc: vi.fn(async () => ({ data: [], error: null })),
    } as never);

    const html = await renderServerMarkup(await SocialDmsPage());
    expect(html).not.toContain("data-social-dms-empty");
    expect(html).not.toContain(SOCIAL.dms.empty);
    expect(html).toContain('data-social-dm-kind="frame-ai"');
    expect(html).toContain("24Frame AI");
    expect(html).toContain('href="/social/dms/24frame-ai"');
    expect(html).toContain("data-social-frame-ai-face");
    expect(html).toContain("data-social-dms-start");
    expect(html).toContain(`aria-label="${SOCIAL.dms.newMessage}"`);
    expect(html).not.toContain(`>${SOCIAL.dms.newMessage}<`);
    expect(html).not.toContain(SOCIAL.dms.startCta);
    expect(html).not.toContain(`>${SOCIAL.dms.title}<`);
    expect(html).toContain('href="/social/dms/new"');
    expect(html).toContain(">ada<");
    expect(html).not.toContain(SOCIAL.dms.subtitle);
  });

  it("omits the list title when the viewer has no handle and keeps the pencil", async () => {
    const from = inboxFrom([
      { id: "u1", handle: "   ", display_name: "", status: "active" },
    ]);
    vi.mocked(createClient).mockResolvedValue({
      from,
      rpc: vi.fn(async () => ({ data: [], error: null })),
    } as never);

    const html = await renderServerMarkup(await SocialDmsPage());
    expect(html).toContain("data-social-dms-header");
    expect(html).not.toContain("data-social-dms-title");
    expect(html).not.toContain(`>${SOCIAL.dms.title}<`);
    expect(html).not.toContain(">Messages<");
    expect(html).toContain(`aria-label="${SOCIAL.dms.newMessage}"`);
    expect(html).toContain("ml-auto");
    expect(html).toContain("data-social-dms-search");
    expect(html).toContain('placeholder="Search"');
    expect(html).toContain('href="/social/dms/new"');
    expect(html).not.toContain(SOCIAL.dms.startCta);
    expect(html).not.toContain("Notes");
    expect(html).not.toContain("Requests");
  });

  it("shows the viewer on a direct room with no other peer", async () => {
    const from = inboxFrom([
      { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
      { id: "u2", handle: "bob", display_name: "Bob One", status: "active" },
    ]);
    vi.mocked(signedAvatarUrls).mockResolvedValue(new Map([["u1", "https://cdn.example/ada.jpg"]]));
    vi.mocked(createClient).mockResolvedValue({
      from,
      rpc: vi.fn(async () => ({
        data: [
          {
            conversation_id: "c-self",
            last_message_at: "2026-09-24T12:00:00.000Z",
            unread_count: 0,
            muted: false,
            peer_id: null,
            kind: "direct",
            title: null,
            participant_ids: [],
          },
          {
            conversation_id: "c-bob",
            last_message_at: "2026-09-24T11:00:00.000Z",
            unread_count: 0,
            muted: false,
            peer_id: "u2",
            kind: "direct",
            title: null,
            participant_ids: ["u2"],
          },
        ],
        error: null,
      })),
    } as never);

    const html = await renderServerMarkup(await SocialDmsPage());
    const selfSlice = html.slice(html.indexOf('href="/social/dms/c-self"'), html.indexOf('href="/social/dms/c-bob"'));
    expect(selfSlice).toContain("Ada Lovelace");
    expect(selfSlice).toContain(encodeURIComponent("https://cdn.example/ada.jpg"));
    expect(selfSlice).not.toContain(SOCIAL.dms.thread);
    expect(selfSlice).not.toContain(">?<");
    const bobSlice = html.slice(html.indexOf('href="/social/dms/c-bob"'));
    expect(bobSlice).toContain("Bob One");
  });

  it("names the inbox bound when the probe row comes back", async () => {
    const rpc = vi.fn(async () => ({
      data: Array.from({ length: 51 }, (_, i) => ({
        conversation_id: `c${i}`,
        last_message_at: "2026-09-14T14:00:00.000Z",
        unread_count: 0,
        muted: false,
        peer_id: "u2",
        kind: "direct",
        title: null,
        participant_ids: ["u2"],
      })),
      error: null,
    }));
    vi.mocked(createClient).mockResolvedValue({
      from: inboxFrom([{ id: "u2", handle: "bob", display_name: "Bob One", status: "active" }]),
      rpc,
    } as never);

    const html = await renderServerMarkup(await SocialDmsPage());
    expect(html).toContain("data-social-dms-truncated");
    expect(html).toContain(SOCIAL.dms.truncatedInbox);
    expect(html).toContain("c49");
    expect(html).not.toContain('href="/social/dms/c50"');
  });

  it("opens a group thread and shows add-people, not a missing room", async () => {
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return chain([
          { id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" },
          { id: "u2", handle: "bob", display_name: "Bob One", status: "active" },
          { id: "u3", handle: "carol", display_name: "Carol One", status: "active" },
        ]);
      }
      if (table === "conversations") {
        return chain({ id: "c-group", kind: "group", title: null });
      }
      if (table === "messages") {
        return chain([
          {
            id: "m1",
            body: "prior hello",
            sender_id: "u1",
            created_at: "2026-09-12T14:00:00.000Z",
            status: "active",
          },
        ]);
      }
      if (table === "conversation_participants") {
        return chain([
          { user_id: "u1", left_at: null },
          { user_id: "u2", left_at: null },
          { user_id: "u3", left_at: null },
        ]);
      }
      throw new Error(`unexpected from(${table})`);
    });
    vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);

    const html = renderToStaticMarkup(await SocialDmThreadPage({ params: Promise.resolve({ id: "c-group" }) }));
    expect(html).toContain("data-social-dm-thread");
    expect(html).toContain('data-social-dm-kind="group"');
    expect(html).toContain("data-social-dm-header");
    expect(html).toContain("h-12");
    expect(html).toContain("Bob One, Carol One");
    const peerHeader = html.slice(html.indexOf("data-social-dm-header"), html.indexOf("data-social-group-title"));
    expect(peerHeader).not.toContain("@");
    expect(peerHeader).not.toContain("t-title");
    expect(peerHeader).toContain("truncate");
    expect(peerHeader).toContain("size-8");
    expect(html).toContain("prior hello");
    expect(html).toContain('data-social-dm-align="mine"');
    expect(html).toContain("data-social-dm-day");
    expect(html).toContain("data-social-dm-time");
    const priorAt = new Date("2026-09-12T14:00:00.000Z");
    expect(html).toContain(dmThreadDayLabel(priorAt, new Date()));
    expect(html).toContain(dmThreadTimeLabel(priorAt));
    expect(html).toContain(SOCIAL.dms.threadPlaceholder);
    expect(html).toContain('data-social-dm-composer=""');
    expect(html).toContain("shrink-0");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("h-dvh");
    expect(html).toContain("max-w-[680px]");
    expect(html).not.toContain("h-[calc(100dvh-var(--header-height)-2rem)]");
    expect(html).not.toContain("bottom-[calc(6.5rem+env(safe-area-inset-bottom))]");
    expect(html).toContain("rounded-[20px]");
    expect(html).not.toContain(">Send<");
    const column = html.slice(html.indexOf("data-social-dm-column"), html.indexOf("data-social-dm-form"));
    expect(column).not.toContain("justify-center");
    expect(column).toContain("justify-end");
    expect(html).not.toContain("data-social-add-people");
    expect(html).not.toContain(SOCIAL.dms.addPeople);
    expect(html).toContain("data-social-group-title");
    expect(html).not.toContain(">AL<");
    expect(html).not.toContain("data-social-dm-missing");
    expect(html).not.toContain("min_level");
    expect(html).not.toContain("data-social-dm-thread-truncated");
    expect(html).toContain("data-social-dm-form");
    expect(html).not.toContain("data-social-dm-older-page");
  });

  it("names the thread bound and offers older messages", async () => {
    const { SOCIAL_DM_THREAD_LIMIT, encodeDmThreadCursor } = await import("@/lib/social-dm-bounds");
    const messages = Array.from({ length: SOCIAL_DM_THREAD_LIMIT + 1 }, (_, i) => ({
      id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
      body: `m${i}`,
      sender_id: "u1",
      created_at: `2026-09-14T14:00:${String(i).padStart(2, "0")}.000Z`,
      status: "active",
    }));
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return chain([{ id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" }]);
      }
      if (table === "conversations") {
        return chain({ id: "c-group", kind: "group", title: null });
      }
      if (table === "messages") return chain(messages);
      if (table === "conversation_participants") {
        return chain([{ user_id: "u1", left_at: null }]);
      }
      throw new Error(`unexpected from(${table})`);
    });
    vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);

    const html = renderToStaticMarkup(await SocialDmThreadPage({ params: Promise.resolve({ id: "c-group" }) }));
    expect(html).toContain("data-social-dm-thread-truncated");
    expect(html).toContain(SOCIAL.dms.truncatedThread);
    expect(html).toContain("data-social-dm-older");
    expect(html).toContain(SOCIAL.dms.olderMessages);
    expect(html).toContain("before=");
    expect(html).toContain(encodeURIComponent(encodeDmThreadCursor(messages[SOCIAL_DM_THREAD_LIMIT - 1]!)));
    expect(html).toContain("m0");
    expect(html).not.toContain(">m50<");
    expect(html).toContain("data-social-dm-form");
  });

  it("names an older page that is not truncated and does not mount compose", async () => {
    const { encodeDmThreadCursor } = await import("@/lib/social-dm-bounds");
    const older = {
      id: "11111111-1111-4111-8111-000000000001",
      created_at: "2026-09-01T12:00:00.000Z",
    };
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return chain([{ id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" }]);
      }
      if (table === "conversations") {
        return chain({ id: "c-group", kind: "group", title: null });
      }
      if (table === "messages") {
        return chain([
          {
            id: older.id,
            body: "ancient hello",
            sender_id: "u1",
            created_at: older.created_at,
            status: "active",
          },
        ]);
      }
      if (table === "conversation_participants") {
        return chain([{ user_id: "u1", left_at: null }]);
      }
      throw new Error(`unexpected from(${table})`);
    });
    vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);

    const html = renderToStaticMarkup(
      await SocialDmThreadPage({
        params: Promise.resolve({ id: "c-group" }),
        searchParams: Promise.resolve({ before: encodeDmThreadCursor(older) }),
      }),
    );
    expect(html).toContain("data-social-dm-older-page");
    expect(html).toContain(SOCIAL.dms.olderPage);
    expect(html).toContain("data-social-dm-latest");
    expect(html).toContain(SOCIAL.dms.latestMessages);
    expect(html).toContain("ancient hello");
    expect(html).not.toContain("data-social-dm-form");
    expect(html).not.toContain("data-social-dm-thread-truncated");
  });

  it("does not put a story URL in the inbox excerpt or the thread", async () => {
    const inboxFromStory = vi.fn((table: string) => {
      if (table === "profiles") {
        return chain([{ id: "u2", handle: "bob", display_name: "Bob One", status: "active" }]);
      }
      if (table === "messages") {
        return chain([
          {
            conversation_id: "c1",
            body: "/social/stories/s1",
            sender_id: "u2",
            media: [],
            created_at: "2026-09-24T12:00:00.000Z",
          },
        ]);
      }
      if (table === "follows" || table === "courses") return chain([]);
      throw new Error(`unexpected from(${table})`);
    });
    vi.mocked(createClient).mockResolvedValue({
      from: inboxFromStory,
      rpc: vi.fn(async () => ({
        data: [
          {
            conversation_id: "c1",
            last_message_at: "2026-09-24T12:00:00.000Z",
            unread_count: 0,
            muted: false,
            peer_id: "u2",
            kind: "direct",
            title: null,
            participant_ids: ["u2"],
          },
        ],
        error: null,
      })),
    } as never);
    const inbox = await renderServerMarkup(await SocialDmsPage());
    expect(inbox).toContain("data-social-dm-excerpt");
    expect(inbox).toContain(SOCIAL.dms.sentYouStory);
    expect(inbox).not.toContain("/social/stories");

    const threadFrom = vi.fn((table: string) => {
      if (table === "profiles") {
        return chain([{ id: "u2", handle: "bob", display_name: "Bob One", status: "active" }]);
      }
      if (table === "conversations") {
        return chain({ id: "c1", kind: "direct", title: null });
      }
      if (table === "messages") {
        return chain([
          {
            id: "m-story",
            body: "Sent a story",
            sender_id: "u2",
            created_at: "2026-09-24T12:00:00.000Z",
            status: "active",
            media: [
              {
                kind: "story-share",
                storyId: "s1",
                authorId: "u2",
                expiresAt: "2000-01-01T00:00:00.000Z",
              },
            ],
          },
        ]);
      }
      if (table === "conversation_participants") {
        return chain([
          { user_id: "u1", left_at: null },
          { user_id: "u2", left_at: null },
        ]);
      }
      throw new Error(`unexpected from(${table})`);
    });
    vi.mocked(createClient).mockResolvedValue({ from: threadFrom, rpc: vi.fn() } as never);
    const thread = renderToStaticMarkup(await SocialDmThreadPage({ params: Promise.resolve({ id: "c1" }) }));
    const peerHeader = thread.slice(thread.indexOf("data-social-dm-header"), thread.indexOf("data-social-dm-column"));
    expect(peerHeader).toContain("Bob One");
    expect(peerHeader).toContain('href="/social/u/bob"');
    expect(peerHeader).toContain("size-8");
    expect(peerHeader).toContain("size-10");
    expect(peerHeader).not.toContain("@");
    expect(peerHeader).not.toContain("t-title");
    expect(thread).toContain("data-social-dm-story-share");
    expect(thread).toContain("w-[168px]");
    expect(thread).toContain("aspect-[9/16]");
    expect(thread).toContain(SOCIAL.dms.storyUnavailable);
    expect(thread).toContain('data-social-dm-align="theirs"');
    expect(thread).toContain("Bob One sent @bob");
    const storyAt = new Date("2026-09-24T12:00:00.000Z");
    expect(thread).toContain(dmThreadTimeLabel(storyAt));
    expect(thread).toContain(dmThreadDayLabel(storyAt, new Date()));
    expect(thread).not.toContain("/social/stories");
    expect(thread).not.toMatch(/>Sent a story</);
    const line = thread.match(/data-social-dm-story-line=""[^>]*/);
    expect(line?.[0]).toBeTruthy();
    expect(line?.[0]).not.toContain("text-center");
    expect(line?.[0]).toContain("text-left");
    expect(line?.[0]).toContain("max-w-[168px]");
  });

  it("shows the viewer in a direct thread with no other participant", async () => {
    const selfFrom = vi.fn((table: string) => {
      if (table === "profiles") {
        return chain([{ id: "u1", handle: "ada", display_name: "Ada Lovelace", status: "active" }]);
      }
      if (table === "conversations") {
        return chain({ id: "c-self", kind: "direct", title: null });
      }
      if (table === "messages") {
        return chain([
          {
            id: "m-self",
            body: "Check this out!",
            sender_id: "u1",
            created_at: "2026-09-24T12:00:00.000Z",
            status: "active",
          },
        ]);
      }
      if (table === "conversation_participants") {
        return chain([{ user_id: "u1", left_at: null }]);
      }
      throw new Error(`unexpected from(${table})`);
    });
    vi.mocked(signedAvatarUrls).mockResolvedValue(new Map([["u1", "https://cdn.example/ada.jpg"]]));
    vi.mocked(createClient).mockResolvedValue({ from: selfFrom, rpc: vi.fn() } as never);
    const selfThread = renderToStaticMarkup(
      await SocialDmThreadPage({ params: Promise.resolve({ id: "c-self" }) }),
    );
    const selfHeader = selfThread.slice(
      selfThread.indexOf("data-social-dm-header"),
      selfThread.indexOf("data-social-dm-column"),
    );
    expect(selfHeader).toContain("Ada Lovelace");
    expect(selfHeader).toContain(encodeURIComponent("https://cdn.example/ada.jpg"));
    expect(selfHeader).not.toContain(SOCIAL.dms.thread);
    expect(selfHeader).not.toContain(">?<");
  });

  it("does not touch gated community group create fields", () => {
    const inbox = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
    const thread = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    const groups = readFileSync("src/app/(app)/social/groups/new/page.tsx", "utf8");
    expect(inbox).not.toContain("min_level");
    expect(inbox).not.toContain("PageHeader");
    expect(inbox).not.toContain("TextAction");
    expect(inbox).not.toContain("border-b");
    expect(thread).not.toContain("min_level");
    expect(thread).not.toContain("kind !== \"direct\"");
    expect(groups).toContain("has_capability");
    expect(groups).toContain("create_group");
  });
});
