import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { socialHomeChatPreview, socialHomeChats } from "@/lib/social-home-chats";

describe("Social Home recent chats", () => {
  it("uses unread or last-active time — never invented snippet copy", () => {
    expect(socialHomeChatPreview({ last_message_at: null, unread_count: 2 })).toBe("2 unread");
    expect(
      socialHomeChatPreview({
        last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        unread_count: 0,
      }),
    ).toBe("2h");
    expect(socialHomeChatPreview({ last_message_at: null, unread_count: 0 })).toBe("");
    expect(socialHomeChatPreview({ last_message_at: null, unread_count: 0 })).not.toContain("Loved");
  });

  it("labels rooms from title or peer names", () => {
    const chats = socialHomeChats(
      [
        {
          conversation_id: "c1",
          kind: "direct",
          last_message_at: null,
          muted: false,
          participant_ids: ["u2"],
          peer_id: "u2",
          title: null,
          unread_count: 0,
        },
      ],
      new Map([["u2", "Maya Chen"]]),
      "u1",
    );
    expect(chats).toEqual([
      {
        conversationId: "c1",
        label: "Maya Chen",
        preview: "",
        peerIds: ["u2"],
      },
    ]);
  });

  it("labels a direct room with no other peer as the viewer", () => {
    const chats = socialHomeChats(
      [
        {
          conversation_id: "c-self",
          kind: "direct",
          last_message_at: null,
          muted: false,
          participant_ids: [],
          peer_id: null,
          title: null,
          unread_count: 0,
        },
        {
          conversation_id: "c-group",
          kind: "group",
          last_message_at: null,
          muted: false,
          participant_ids: ["u2", "u3"],
          peer_id: null,
          title: null,
          unread_count: 0,
        },
      ],
      new Map([
        ["u1", "Ada Lovelace"],
        ["u2", "Bob One"],
        ["u3", "Carol One"],
      ]),
      "u1",
    );
    expect(chats[0]).toMatchObject({ label: "Ada Lovelace", peerIds: ["u1"] });
    expect(chats[0].label).not.toBe(SOCIAL.dms.thread);
    expect(chats[1]).toMatchObject({ label: "Bob One, Carol One", peerIds: ["u2", "u3"] });
  });
});
