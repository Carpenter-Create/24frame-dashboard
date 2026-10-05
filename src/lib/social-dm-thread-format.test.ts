import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import {
  clusterDmThreadMessages,
  DM_THREAD_BUBBLE_MINE_CLASS,
  DM_THREAD_BUBBLE_THEIRS_CLASS,
  DM_THREAD_BURST_GAP_MS,
  DM_THREAD_COLUMN_CLASS,
  DM_THREAD_COMPOSER_CAMERA_CLASS,
  DM_THREAD_COMPOSER_CAMERA_GLYPH,
  DM_THREAD_COMPOSER_CLASS,
  DM_THREAD_ROOT_CLASS,
  DM_THREAD_COMPOSER_FIELD_CLASS,
  DM_THREAD_COMPOSER_SEND_CLASS,
  DM_THREAD_HEADER_AVATAR_CLASS,
  DM_THREAD_HEADER_BACK_CLASS,
  DM_THREAD_HEADER_CLASS,
  DM_THREAD_HEADER_HOST_CLASS,
  DM_THREAD_HEADER_LABEL_CLASS,
  DM_THREAD_DAY_CLASS,
  DM_THREAD_LIST_CLASS,
  DM_THREAD_OTHER_AUTHOR_GAP_CLASS,
  DM_THREAD_SAME_AUTHOR_GAP_CLASS,
  DM_THREAD_SYSTEM_LINE_CLASS,
  DM_THREAD_TIME_CLASS,
  dmThreadAlign,
  dmThreadBlockGapClass,
  dmThreadBubbleClass,
  dmThreadDayLabel,
  dmThreadHeaderModel,
  dmThreadHeaderPeers,
  dmThreadShowsAvatar,
  dmThreadSideClass,
  dmThreadStackClass,
  dmThreadPostSystemLine,
  dmThreadStorySystemLine,
  dmThreadSystemLineAlignClass,
  dmThreadTimeLabel,
  previousChicagoDayKey,
  chicagoDayKey,
  type DmThreadClusterMessage,
} from "@/lib/social-dm-thread-format";

const NOW = new Date("2026-09-24T18:00:00.000Z");

function msg(
  id: string,
  senderId: string,
  createdAt: string,
  mine = senderId === "me",
): DmThreadClusterMessage {
  return { id, senderId, createdAt, mine };
}

function labels(blocks: ReturnType<typeof clusterDmThreadMessages>) {
  return blocks.map((block) => {
    if (block.kind === "group") {
      return `${block.mine ? "mine" : "theirs"}:${block.messages.map((item) => item.id).join("+")}`;
    }
    return `${block.kind}:${block.label}`;
  });
}

describe("DM thread message format", () => {
  it("labels Today, Yesterday, and a Chicago calendar day", () => {
    expect(dmThreadDayLabel(new Date("2026-09-24T15:09:00.000Z"), NOW)).toBe("Today");
    expect(dmThreadDayLabel(new Date("2026-09-23T15:09:00.000Z"), NOW)).toBe("Yesterday");
    expect(dmThreadDayLabel(new Date("2026-09-12T14:00:00.000Z"), NOW)).toBe("Sep 12, 2026");
    expect(dmThreadTimeLabel(new Date("2026-09-24T15:09:00.000Z"))).toBe("10:09 AM");
    expect(dmThreadTimeLabel(new Date("2026-09-12T14:00:00.000Z"))).toBe("9:00 AM");
  });

  it("treats the extra hour of a Chicago fallback day as the same day", () => {
    const late = new Date("2026-11-02T05:30:00.000Z");
    expect(chicagoDayKey(late)).toBe("2026-11-01");
    expect(previousChicagoDayKey(late)).toBe("2026-10-31");
    expect(dmThreadDayLabel(new Date("2026-10-31T20:00:00.000Z"), late)).toBe("Yesterday");
    expect(dmThreadDayLabel(new Date("2026-11-01T05:30:00.000Z"), late)).toBe("Today");
  });

  it("clusters day and time headers and keeps a sender burst together", () => {
    const t0 = Date.parse("2026-09-24T15:00:00.000Z");
    const blocks = clusterDmThreadMessages(
      [
        msg("a", "me", new Date(t0).toISOString()),
        msg("b", "me", new Date(t0 + 4 * 60 * 1000).toISOString()),
        msg("c", "me", new Date(t0 + 4 * 60 * 1000 + DM_THREAD_BURST_GAP_MS).toISOString()),
        msg("d", "them", new Date(t0 + 4 * 60 * 1000 + DM_THREAD_BURST_GAP_MS + 60_000).toISOString(), false),
        msg("e", "me", "2026-09-25T05:09:00.000Z"),
      ],
      NOW,
    );

    expect(labels(blocks)).toEqual([
      "day:Today",
      "time:10:00 AM",
      "mine:a+b",
      "time:10:09 AM",
      "mine:c",
      "theirs:d",
      "day:Sep 25, 2026",
      "time:12:09 AM",
      "mine:e",
    ]);
    expect(blocks.filter((block) => block.kind === "group" && block.showAvatar)).toHaveLength(1);
    expect(blocks.find((block) => block.kind === "group" && block.key === "group:a")).toMatchObject({
      showAvatar: false,
      mine: true,
    });
  });

  it("keeps a burst together until the gap reaches five minutes", () => {
    const t0 = Date.parse("2026-09-24T15:00:00.000Z");
    const under = clusterDmThreadMessages(
      [
        msg("a", "me", new Date(t0).toISOString()),
        msg("b", "me", new Date(t0 + DM_THREAD_BURST_GAP_MS - 1).toISOString()),
      ],
      NOW,
    );
    expect(labels(under)).toEqual(["day:Today", "time:10:00 AM", "mine:a+b"]);
  });

  it("starts a new group when the sender changes inside five minutes without a new time", () => {
    const blocks = clusterDmThreadMessages(
      [
        msg("a", "me", "2026-09-24T15:00:00.000Z"),
        msg("b", "them", "2026-09-24T15:02:00.000Z", false),
      ],
      NOW,
    );
    expect(labels(blocks)).toEqual(["day:Today", "time:10:00 AM", "mine:a", "theirs:b"]);
  });

  it("does not invent a clock when created_at is missing", () => {
    const blocks = clusterDmThreadMessages([msg("a", "me", "not-a-date")], NOW);
    expect(blocks.map((block) => block.kind)).toEqual(["group"]);
  });

  it("aligns mine to the trailing edge and theirs to the leading edge", () => {
    expect(dmThreadAlign(true)).toBe("mine");
    expect(dmThreadAlign(false)).toBe("theirs");
    expect(dmThreadShowsAvatar(true)).toBe(false);
    expect(dmThreadShowsAvatar(false)).toBe(true);
    expect(dmThreadSideClass(true)).toContain("justify-end");
    expect(dmThreadSideClass(true)).not.toContain("justify-center");
    expect(dmThreadSideClass(false)).toContain("justify-start");
    expect(dmThreadBubbleClass(true)).toBe(DM_THREAD_BUBBLE_MINE_CLASS);
    expect(dmThreadBubbleClass(false)).toBe(DM_THREAD_BUBBLE_THEIRS_CLASS);
    expect(DM_THREAD_BUBBLE_MINE_CLASS).toContain("bg-surface-muted");
    expect(DM_THREAD_BUBBLE_MINE_CLASS).toContain("rounded-[18px]");
    expect(DM_THREAD_BUBBLE_MINE_CLASS).toContain("max-w-[75%]");
    expect(DM_THREAD_BUBBLE_MINE_CLASS).toContain("t-body-sm");
    expect(DM_THREAD_BUBBLE_MINE_CLASS).not.toContain("bg-accent");
    expect(DM_THREAD_BUBBLE_THEIRS_CLASS).toContain("bg-surface");
    expect(DM_THREAD_BUBBLE_THEIRS_CLASS).toContain("border-hairline");
    expect(DM_THREAD_SYSTEM_LINE_CLASS).toContain("max-w-[168px]");
    expect(DM_THREAD_SYSTEM_LINE_CLASS).not.toContain("text-center");
    expect(dmThreadSystemLineAlignClass(true)).toContain("text-right");
    expect(dmThreadSystemLineAlignClass(false)).toContain("text-left");
    expect(DM_THREAD_DAY_CLASS).toContain("text-center");
    expect(DM_THREAD_TIME_CLASS).toContain("text-center");
    expect(DM_THREAD_COLUMN_CLASS).toContain("px-4");
    expect(DM_THREAD_COLUMN_CLASS).toContain("bg-[#FAFAFB]");
    expect(DM_THREAD_LIST_CLASS).not.toContain("gap-2");
    expect(DM_THREAD_SAME_AUTHOR_GAP_CLASS).toBe("mt-2");
    expect(DM_THREAD_OTHER_AUTHOR_GAP_CLASS).toBe("mt-4");
    expect(dmThreadBlockGapClass({ kind: "group", senderId: "a", previous: null })).toBe("");
    expect(
      dmThreadBlockGapClass({
        kind: "group",
        senderId: "a",
        previous: { kind: "group", senderId: "a" },
      }),
    ).toBe("mt-2");
    expect(
      dmThreadBlockGapClass({
        kind: "group",
        senderId: "b",
        previous: { kind: "group", senderId: "a" },
      }),
    ).toBe("mt-4");
    expect(
      dmThreadBlockGapClass({
        kind: "day",
        senderId: null,
        previous: { kind: "group", senderId: "a" },
      }),
    ).toBe("mt-4");
    expect(dmThreadStackClass(true)).toContain("gap-2");
    expect(DM_THREAD_COMPOSER_FIELD_CLASS).toContain("h-10");
    expect(DM_THREAD_COMPOSER_FIELD_CLASS).toContain("rounded-[20px]");
    expect(DM_THREAD_COMPOSER_FIELD_CLASS).toBe(
      "flex h-10 min-w-0 flex-1 items-center rounded-[20px] border border-hairline bg-surface-muted px-3",
    );
    expect(DM_THREAD_COMPOSER_SEND_CLASS).not.toContain("w-full");
    expect(DM_THREAD_COMPOSER_SEND_CLASS).toBe(
      "flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast",
    );
  });

  it("keeps the send-craft line for mine and names theirs", () => {
    expect(
      dmThreadStorySystemLine({ mine: true, authorHandle: "ada", senderName: "Ada Lovelace" }),
    ).toBe(SOCIAL.dms.youSentStory("ada"));
    expect(
      dmThreadStorySystemLine({ mine: false, authorHandle: "ada", senderName: "Bob One" }),
    ).toBe(SOCIAL.dms.theySentAuthorStory("Bob One", "ada"));
    expect(dmThreadStorySystemLine({ mine: false, authorHandle: null, senderName: "Bob One" })).toBe(
      SOCIAL.dms.sentYouStory,
    );
    expect(dmThreadStorySystemLine({ mine: true, authorHandle: null, senderName: "Ada" })).toBeNull();
    expect(
      dmThreadPostSystemLine({ mine: true, authorHandle: "ada", senderName: "Ada Lovelace" }),
    ).toBe(SOCIAL.dms.youSentPost("ada"));
    expect(
      dmThreadPostSystemLine({ mine: false, authorHandle: "ada", senderName: "Bob One" }),
    ).toBe(SOCIAL.dms.theySentAuthorPost("Bob One", "ada"));
    expect(dmThreadPostSystemLine({ mine: false, authorHandle: null, senderName: "Bob One" })).toBe(
      SOCIAL.dms.sentYouPost,
    );
  });

  it("pins the composer to the bottom of the thread chrome", () => {
    expect(DM_THREAD_ROOT_CLASS).toContain("h-dvh");
    expect(DM_THREAD_ROOT_CLASS).toContain("max-h-dvh");
    expect(DM_THREAD_ROOT_CLASS).toContain("max-w-[680px]");
    expect(DM_THREAD_ROOT_CLASS).not.toContain("header-height");
    expect(DM_THREAD_ROOT_CLASS).not.toContain("6.5rem");
    expect(DM_THREAD_ROOT_CLASS).not.toContain("min-h-[calc(100dvh");
    expect(DM_THREAD_ROOT_CLASS).toContain("overflow-hidden");
    expect(DM_THREAD_COLUMN_CLASS).toContain("min-h-0");
    expect(DM_THREAD_COLUMN_CLASS).toContain("flex-1");
    expect(DM_THREAD_COLUMN_CLASS).toContain("overflow-y-auto");
    expect(DM_THREAD_COMPOSER_CLASS).toContain("shrink-0");
    expect(DM_THREAD_COMPOSER_CLASS).toContain("bg-surface");
    expect(DM_THREAD_COMPOSER_CLASS).toContain("border-hairline");
    expect(DM_THREAD_COMPOSER_CLASS).toContain("pt-2");
    expect(DM_THREAD_COMPOSER_CLASS).toContain("env(safe-area-inset-bottom)");
    expect(DM_THREAD_COMPOSER_CLASS).not.toContain("sticky");
    expect(DM_THREAD_COMPOSER_CLASS).not.toContain("bottom-[calc(6.5rem");
    expect(DM_THREAD_COMPOSER_CLASS).toBe(
      "shrink-0 border-t border-hairline bg-surface px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
    );
    expect(DM_THREAD_COMPOSER_CAMERA_GLYPH).toBe(24);
    expect(DM_THREAD_COMPOSER_CAMERA_CLASS).toContain("size-10");
    expect(DM_THREAD_COMPOSER_CAMERA_CLASS).toContain("text-ink");
    expect(DM_THREAD_COMPOSER_CAMERA_CLASS).toContain("shrink-0");
    expect(DM_THREAD_COMPOSER_CAMERA_CLASS).not.toContain("shadow");
    expect(DM_THREAD_COMPOSER_CAMERA_CLASS).not.toContain("w-full");

    const forms = readFileSync("src/components/social/social-dm-compose.tsx", "utf8");
    const compose = forms.slice(
      forms.indexOf("export function SocialDmCompose"),
      forms.indexOf("export function SocialGroupTitleForm"),
    );
    const fieldAt = compose.indexOf('id="social-dm-body"');
    const cameraAt = compose.indexOf('data-social-dm-camera=""');
    const sendAt = compose.indexOf('aria-label={SOCIAL.dms.submit}');
    expect(fieldAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(fieldAt);
    expect(cameraAt).toBeGreaterThan(sendAt);
    expect(compose).toContain('name="camera"');
    expect(compose).toContain("size={DM_THREAD_COMPOSER_CAMERA_GLYPH}");
    expect(compose).toContain("accept={SOCIAL_MEDIA_ACCEPT}");
    expect(compose).toContain('type="button"');
    expect(compose).not.toContain("uploadSocialMedia");
    expect(compose).not.toContain("HouseVoiceMic");
    expect(compose).not.toContain("capture=");

    const stick = readFileSync("src/components/social/social-dm-thread-stick.tsx", "utf8");
    expect(stick).toContain("[data-social-dm-column]");
    expect(stick).toContain("scrollTop");
    expect(stick).not.toContain("[data-house-lead-scroll]");
    const page = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    expect(page.indexOf("<SocialDmThread\n")).toBeLessThan(page.indexOf("<SocialDmCompose"));
    expect(page.indexOf("<SocialDmThreadHeader")).toBeLessThan(page.indexOf("<SocialDmThread\n"));
    expect(page).not.toContain("<SocialAddPeopleForm");
  });

  it("keeps the peer header to one truncated name", () => {
    expect(DM_THREAD_HEADER_HOST_CLASS).toContain("sticky");
    expect(DM_THREAD_HEADER_HOST_CLASS).toContain("top-0");
    expect(DM_THREAD_HEADER_HOST_CLASS).toContain("bg-surface");
    expect(DM_THREAD_HEADER_HOST_CLASS).toContain("border-hairline");
    expect(DM_THREAD_HEADER_HOST_CLASS).toContain("pt-[env(safe-area-inset-top)]");
    expect(DM_THREAD_HEADER_HOST_CLASS).toContain("shadow-none");
    expect(DM_THREAD_HEADER_CLASS).toContain("h-12");
    expect(DM_THREAD_HEADER_CLASS).toContain("px-4");
    expect(DM_THREAD_HEADER_CLASS).not.toContain("max-md:");
    expect(DM_THREAD_HEADER_CLASS).not.toContain("md:");
    expect(DM_THREAD_HEADER_BACK_CLASS).toContain("size-10");
    expect(DM_THREAD_HEADER_AVATAR_CLASS).toContain("size-8");
    expect(DM_THREAD_HEADER_LABEL_CLASS).toContain("truncate");
    expect(DM_THREAD_HEADER_LABEL_CLASS).toContain("t-body-sm");
    expect(DM_THREAD_HEADER_LABEL_CLASS).toContain("font-medium");

    const self = dmThreadHeaderModel({
      peers: dmThreadHeaderPeers({
        kind: "direct",
        peers: [],
        self: { handle: "ada", displayName: "Ada Lovelace", photoUrl: "ada.jpg" },
      }),
    });
    expect(self.label).toBe("Ada Lovelace");
    expect(self.photoUrl).toBe("ada.jpg");
    expect(self.avatarName).toBe("Ada Lovelace");
    expect(self.label).not.toBe(SOCIAL.dms.thread);

    const named = dmThreadHeaderModel({
      peers: dmThreadHeaderPeers({
        kind: "direct",
        peers: [{ handle: "theofficialJKC", displayName: "Joshua K. Carpenter" }],
        self: { handle: "ada", displayName: "Ada Lovelace" },
      }),
    });
    expect(named.label).toBe("Joshua K. Carpenter");
    expect(named.href).toBe("/social/u/theofficialJKC");
    expect(named.label).not.toContain("@");
    expect(named.label).not.toContain("theofficialJKC");

    const bare = dmThreadHeaderModel({
      peers: [{ handle: "@theofficialJKC", displayName: "Member" }],
    });
    expect(bare.label).toBe("theofficialJKC");
    expect(bare.href).toBe("/social/u/theofficialJKC");
    expect(bare.label).not.toContain("@");

    const room = dmThreadHeaderModel({
      peers: [
        { handle: "bob", displayName: "Bob One", photoUrl: "bob.jpg" },
        { handle: "carol", displayName: "Carol One" },
      ],
    });
    expect(room.label).toBe("Bob One, Carol One");
    expect(room.href).toBeNull();
    expect(room.photoUrl).toBe("bob.jpg");
    expect(room.avatarName).toBe("Bob One");
    expect(room.label).not.toContain("@");
    expect(
      dmThreadHeaderPeers({
        kind: "group",
        peers: [
          { handle: "bob", displayName: "Bob One" },
          { handle: "carol", displayName: "Carol One" },
        ],
        self: { handle: "ada", displayName: "Ada Lovelace" },
      }).map((peer) => peer.handle),
    ).toEqual(["bob", "carol"]);

    const titled = dmThreadHeaderModel({
      title: "Friday table",
      peers: [
        { handle: "bob", displayName: "Bob One" },
        { handle: "carol", displayName: null },
      ],
    });
    expect(titled.label).toBe("Friday table");
    expect(titled.href).toBeNull();

    const header = readFileSync("src/components/social/social-dm-thread-header.tsx", "utf8");
    expect(header).toContain('name="caret-left"');
    expect(header).toContain("size={20}");
    expect(header).not.toContain("PageHeader");
    const page = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    expect(page).toContain("<SocialDmThreadHeader");
    expect(page).not.toContain("displayHandle");
  });

  it("does not center the story share in the thread view", () => {
    const thread = readFileSync("src/components/social/social-dm-thread.tsx", "utf8");
    const page = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    expect(thread).not.toContain("justify-center");
    expect(thread).not.toContain("text-center");
    expect(page).not.toContain("justify-center");
    expect(page).not.toContain("text-center");
    const card = readFileSync("src/components/social/social-dm-story-share.tsx", "utf8");
    expect(card).toContain("w-[168px]");
    expect(card).toContain("aspect-[9/16]");
  });
});
