import { describe, expect, it } from "vitest";

import { ASSISTANT_NAME } from "@/lib/product";
import { socialDmInboxMatchesQuery } from "@/lib/social-dm-inbox-list";
import { storySendPeopleQuery } from "@/lib/social-story-actions";
import {
  SOCIAL_FRAME_AI_ID,
  SOCIAL_FRAME_AI_KIND,
  isSocialFrameAiTarget,
  pinSocialFrameAiInbox,
  pinSocialFrameAiPeople,
  socialFrameAiInboxHref,
  socialFrameAiOpenHref,
} from "@/lib/social-frame-ai";

const bob = {
  id: "c-bob",
  href: "/social/dms/c-bob",
  kind: "direct",
  label: "Bob One",
  excerpt: "Sent you a story",
  time: "2h",
  unreadCount: 3,
  people: [{ name: "Bob One" }],
};

const ada = {
  id: "u2",
  name: "Ada Lovelace",
  handle: "ada",
  photoUrl: null,
};

describe("social frame AI pin", () => {
  it("pins 24Frame AI ahead of a newer human thread", () => {
    const rows = pinSocialFrameAiInbox([bob]);
    expect(rows.map((row) => row.id)).toEqual([SOCIAL_FRAME_AI_ID, "c-bob"]);
    expect(rows[0]).toMatchObject({
      kind: SOCIAL_FRAME_AI_KIND,
      label: ASSISTANT_NAME,
      href: "/social/dms?ai=1",
      excerpt: null,
      time: "",
      unreadCount: 0,
    });
    expect(socialFrameAiInboxHref()).toBe("/social/dms?ai=1");
    expect(rows[1]).toEqual(bob);
    expect(pinSocialFrameAiInbox(rows)).toHaveLength(2);
  });

  it("stays first in a people grid and drops out of a search that misses the name", () => {
    const people = pinSocialFrameAiPeople([ada]);
    expect(people.map((person) => person.id)).toEqual([SOCIAL_FRAME_AI_ID, "u2"]);
    expect(people[0].name).toBe(ASSISTANT_NAME);
    expect(socialFrameAiOpenHref()).toBe("?ai=1");
    expect(storySendPeopleQuery(people, "").map((person) => person.id)).toEqual([
      SOCIAL_FRAME_AI_ID,
      "u2",
    ]);
    expect(storySendPeopleQuery(people, "a").map((person) => person.id)).toEqual([
      SOCIAL_FRAME_AI_ID,
      "u2",
    ]);
    expect(storySendPeopleQuery(people, "ada").map((person) => person.id)).toEqual(["u2"]);
    expect(storySendPeopleQuery(people, "frame").map((person) => person.id)).toEqual([
      SOCIAL_FRAME_AI_ID,
    ]);
    expect(pinSocialFrameAiPeople(people)).toHaveLength(2);
  });

  it("matches the inbox search on the assistant name only", () => {
    const [ai, human] = pinSocialFrameAiInbox([bob]);
    expect(socialDmInboxMatchesQuery("", ai)).toBe(true);
    expect(socialDmInboxMatchesQuery("frame", ai)).toBe(true);
    expect(socialDmInboxMatchesQuery("bob", ai)).toBe(false);
    expect(socialDmInboxMatchesQuery("bob", human)).toBe(true);
    expect(isSocialFrameAiTarget(SOCIAL_FRAME_AI_ID)).toBe(true);
    expect(isSocialFrameAiTarget("u2")).toBe(false);
  });
});
