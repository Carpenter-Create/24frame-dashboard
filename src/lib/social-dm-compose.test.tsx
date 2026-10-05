import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));

vi.mock("@/app/(app)/social/actions", () => ({
  searchSocialDmPeers: vi.fn(async () => ({ people: [] })),
  startSocialDm: vi.fn(),
}));

import { SocialDmComposeLoading, SocialDmComposePicker } from "@/components/social/social-dm-compose-picker";
import {
  DM_COMPOSE_LIST_CLASS,
  DM_COMPOSE_ROOT_CLASS,
  DM_COMPOSE_SKELETON_ROWS,
  dmDirectSelected,
  dmGroupSelected,
} from "@/lib/social-dm-compose";
import { SOCIAL } from "@/lib/social";

const people = [
  { id: "u2", handle: "ada", name: "Ada Lovelace", photoUrl: null },
  { id: "u3", handle: "grace", name: "Grace Hopper", photoUrl: null },
];

describe("DM compose immersive IA", () => {
  it("keeps Screen A to one chip and stops Screen B at the cap", () => {
    const ada = people[0];
    const grace = people[1];
    expect(dmDirectSelected([], ada)).toEqual([ada]);
    expect(dmDirectSelected([ada], grace)).toEqual([grace]);
    expect(dmDirectSelected([ada], ada)).toEqual([ada]);
    const fifteen = Array.from({ length: 15 }, (_, index) => ({ id: `p${index}` }));
    expect(dmGroupSelected(fifteen, { id: "extra" })).toEqual(fifteen);
    expect(dmGroupSelected(fifteen, fifteen[0])).toHaveLength(14);
    expect(dmGroupSelected([ada], grace)).toEqual([ada, grace]);
  });

  it("fills New message with one Group chat entry and Suggested people", () => {
    expect(DM_COMPOSE_SKELETON_ROWS).toBeGreaterThanOrEqual(6);
    expect(DM_COMPOSE_ROOT_CLASS).toContain("max-w-[680px]");
    expect(DM_COMPOSE_ROOT_CLASS).toContain("bg-[#FAFAFB]");
    expect(DM_COMPOSE_ROOT_CLASS).toContain("shadow-none");
    expect(DM_COMPOSE_LIST_CLASS).toContain("flex-1");
    const html = renderToStaticMarkup(
      createElement(SocialDmComposePicker, { mode: "direct", people }),
    );
    expect(html).toContain(SOCIAL.dms.newMessage);
    expect(html).toContain("To:");
    expect(html).toContain(SOCIAL.dms.groupChat);
    expect(html).toContain(SOCIAL.dms.groupChatHint);
    expect(html).toContain('href="/social/dms/new/group"');
    expect(html).toContain("Suggested");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("@ada");
    expect(html).toContain(">Chat<");
    expect(html).toContain("disabled");
    expect(html).not.toContain("1/16");
    expect(html).not.toContain("Group name (optional)");
    expect(html).not.toContain("Channel");
    expect(html).not.toContain("AI chats");
    expect(html).not.toContain("Create group");
    expect(html).not.toContain("data-social-dm-compose-skeleton");
  });

  it("opens New group chat with a cap helper and multi-select marks", () => {
    const html = renderToStaticMarkup(
      createElement(SocialDmComposePicker, { mode: "group", people }),
    );
    expect(html).toContain(SOCIAL.dms.newGroupChat);
    expect(html).toContain(SOCIAL.dms.groupName);
    expect(html).toContain("1/16 selected");
    expect(html).toContain('data-social-dm-check="off"');
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain(">Chat<");
    expect(html).toContain("disabled");
    expect(html).not.toContain("data-social-dm-group-chat");
    expect(html).not.toContain("Message up to 16 people");
    expect(html).not.toContain('href="/social/dms/new/group"');
    expect(html).not.toContain("Create group");
    expect(html).not.toContain("Channel");
  });

  it("shows at least six Suggested skeletons while compose is loading", () => {
    const html = renderToStaticMarkup(createElement(SocialDmComposeLoading, { mode: "direct" }));
    expect(html).toContain("Suggested");
    expect(html.match(/data-social-dm-compose-skeleton=/g)?.length).toBe(DM_COMPOSE_SKELETON_ROWS);
    expect(html).toContain(SOCIAL.dms.newMessage);
    const group = renderToStaticMarkup(createElement(SocialDmComposeLoading, { mode: "group" }));
    expect(group.match(/data-social-dm-compose-skeleton=/g)?.length).toBeGreaterThanOrEqual(6);
    expect(group).toContain(SOCIAL.dms.newGroupChat);
  });
});
