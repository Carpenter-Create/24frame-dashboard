import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
    loading,
  }: {
    src: string;
    className?: string;
    loading?: string;
  }) => createElement("img", { src, className, alt: "", loading }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

import {
  SOCIAL_CHECKLIST_CLASS,
  SOCIAL_CHECKLIST_TRACK_CLASS,
  SOCIAL_CHECKLIST_TRACK_NESTED_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS,
  SOCIAL_COMPOSER_AVATAR_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
  SOCIAL_FOR_YOU_CARD_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_EMPTY_ACTION_CLASS,
  SOCIAL_EMPTY_PANEL_CLASS,
  SOCIAL_HOME_STORIES_RAIL_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_HOME_STORY_CREATE_FACE_CLASS,
  SOCIAL_HOME_STORY_CREATE_LABEL_CLASS,
  SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS,
  SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS,
  SOCIAL_HOME_STORY_NAME_CLASS,
  SOCIAL_HOME_STORY_PLUS_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_MORE_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
  SOCIAL_STORIES_EMPTY_ACTION_CLASS,
  SOCIAL_STORIES_PLUS_WELL_CLASS,
  SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS,
} from "@/lib/social-chrome";
import { HOUSE_FILTER_ON_CLASS, HOUSE_PILL_SELECTED_CLASS } from "@/lib/house-shell";
import { SOCIAL_CATEGORY_ALL, SOCIAL_CATEGORY_LABELS, SOCIAL_CATEGORY_TOPICS, sortTopicsAlpha } from "@/lib/social-categories";
import { SOCIAL_ICON_SIZE_STORY_PLUS } from "@/lib/social-icons";
import { SOCIAL_CREATE_CAMERA_ACCEPT, SOCIAL_CREATE_MEDIA_ACCEPT } from "@/lib/social-create-media";
import { SOCIAL, SOCIAL_ROUTES, socialSearchHref } from "@/lib/social";
import { SocialEmpty, SocialStoriesEmpty } from "./social-empty";
import { SocialHomeComposer } from "./social-home-composer";
import { SocialHomeTopics } from "./social-home-topics";
import { SocialOnboardingChecklist } from "./social-checklist";
import { SocialStoriesRail } from "./social-stories-rail";

const authors = new Map([["u2", { display_name: "Maya Chen", handle: "maya" }]]);
const faces = new Map([["u2", "https://s3.example/signed-avatar"]]);

describe("Social Home craft (Figma 160:482 / 160:964)", () => {
  it("renders the one-row share stage: prompt opens write compose, icon-only Photo and Camera reuse the media pick", () => {
    const html = renderToStaticMarkup(
      <SocialHomeComposer authorName="Adam Carpenter" />,
    );
    expect(html).toContain("data-social-home-composer");
    expect(html).toContain("data-social-composer-prompt");
    expect(html).toContain("data-social-composer-prompt-row");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('href="/social/create?kind=text"');
    expect(html).not.toContain("data-social-write-compose-sheet");
    expect(html).toContain("data-social-composer-write");
    expect(html).not.toContain("data-social-create-sheet");
    expect(html).toContain(SOCIAL_COMPOSER_CLASS);
    expect(html).toContain(SOCIAL_COMPOSER_ROW_CLASS);
    expect(html).toContain(SOCIAL_COMPOSER_FIELD_CLASS);
    expect(html).toContain(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS);
    expect(html).toContain(SOCIAL_COMPOSER_AFFORDANCE_CLASS);
    expect(html).toContain("Share something");
    expect(html).not.toContain("Write something");
    expect(html).not.toContain("What&#x27;s on your mind");
    expect(html).not.toContain("Share something,");
    expect(html.split("Share something").length - 1).toBe(1);
    expect(html).toContain(`aria-label="${SOCIAL.create.title}"`);
    expect(html).not.toContain('data-social-icon="plus"');
    expect(html).not.toContain('data-social-icon="broadcast"');
    expect(html).toContain("text-ink-2");
    expect(html).not.toContain("data-social-composer-media");
    expect(html).not.toContain("data-social-composer-action");
    expect(html).not.toContain("Feeling");
    expect(html).not.toContain("Go live");
    expect(html).not.toContain(SOCIAL.home.attach);
    expect(html).not.toContain(`>${SOCIAL.create.text}<`);
    expect(html).toContain("data-social-avatar");
    expect(html).toContain("AC");
    expect(html).not.toContain("<img");
    expect(html).toContain('data-social-composer-affordance="photo"');
    expect(html).toContain('data-social-composer-affordance="camera"');
    expect(html).toContain('data-social-icon="image"');
    expect(html).toContain('data-social-icon="camera"');
    expect(html).not.toContain("t-label");
    expect(html).toContain(`aria-label="${SOCIAL.home.composerPhoto}"`);
    expect(html).toContain(`aria-label="${SOCIAL.home.composerCamera}"`);
    expect(html).not.toContain(`>${SOCIAL.home.composerPhoto}<`);
    expect(html).not.toContain(`>${SOCIAL.home.composerCamera}<`);
    expect(html).toContain(`accept="${SOCIAL_CREATE_MEDIA_ACCEPT}"`);
    expect(html).toContain(`accept="${SOCIAL_CREATE_CAMERA_ACCEPT}"`);
    expect(html).toContain('capture="environment"');
    expect(html).toContain('data-social-create-media-capture="environment"');
    // The visible Photo / Camera buttons open the pickers. The file inputs
    // are no tab stop (no 1px focus ring) and hidden from assistive tech
    // (no second "Photo" / "Camera").
    const pickers = html.match(/<input[^>]*data-social-create-media-input[^>]*>/g) ?? [];
    expect(pickers).toHaveLength(2);
    for (const picker of pickers) {
      expect(picker).toContain('tabindex="-1"');
      expect(picker).toContain('aria-hidden="true"');
    }
    const photoAt = html.indexOf('data-social-composer-affordance="photo"');
    const cameraAt = html.indexOf('data-social-composer-affordance="camera"');
    expect(photoAt).toBeGreaterThan(html.indexOf("data-social-composer-prompt"));
    expect(cameraAt).toBeGreaterThan(photoAt);
    // H · Feed composer (founder 2026-10-05; replaces the G composer bar
    // pins: one muted 52 bar, radius 16): one 44 row, no bar — the 44
    // avatar, 12, the grey "Share something" pill, then round grey 44
    // Photo and Camera (8 apart on desktop, 4 on phone), 20 ink glyphs.
    expect(SOCIAL_COMPOSER_CLASS).toContain("flex ");
    expect(SOCIAL_COMPOSER_CLASS).toContain("items-center");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("flex-col");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("hidden");
    expect(SOCIAL_COMPOSER_CLASS).toContain("mt-6");
    expect(SOCIAL_COMPOSER_CLASS).toContain("gap-1");
    expect(SOCIAL_COMPOSER_CLASS).toContain("md:gap-2");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("h-[52px]");
    expect(SOCIAL_COMPOSER_CLASS).not.toMatch(/bg-|rounded|border|shadow|accent/);
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("flex-1");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("items-center");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("gap-3");
    expect(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS).toContain("gap-1");
    expect(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS).toContain("md:gap-2");
    // Photo and Camera: round grey 44 on phone and desktop; 20 ink glyphs.
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain("size-11");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).not.toContain("md:size-9");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain("rounded-full");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain("bg-surface-muted");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain("text-ink");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).not.toContain("bg-accent");
    expect(html).toContain(`width="20"`);
    expect(html).not.toContain("md:size-[18px]");
    // The prompt is the grey pill: 44, radius full, 17 / 420 ink-2, pad 16.
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("h-11");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("rounded-full");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("bg-surface-muted");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("px-4");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("text-[length:var(--text-base)]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("text-ink-2");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("border-0");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("outline-none");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("shadow-");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("border-hairline");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("md:h-10");
    expect(html).toContain("shadow-none");
    expect(SOCIAL_COMPOSER_AVATAR_CLASS).toBe("size-11");
    expect(html).toContain(SOCIAL_COMPOSER_AVATAR_CLASS);
  });

  it("shows the composer author photo when a signed URL exists", () => {
    const html = renderToStaticMarkup(
      <SocialHomeComposer
        authorName="Adam Carpenter"
        authorPhotoUrl="https://s3.example/adam-face"
      />,
    );
    expect(html).toContain("data-social-avatar");
    expect(html).toContain('src="https://s3.example/adam-face"');
    expect(html).not.toContain("AC");
  });

  // H · Feed (founder 2026-10-05; replaces "renders Topics as D plain
  // words"): secondary chips — the current one the accent wash with
  // accent-ink type; idle chips plain ink; All first, then the 15 topics A
  // to Z; one row that scrolls and never truncates.
  it("renders Topics as secondary chips on one scrolling row", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics />);
    expect(html).toContain("data-social-home-topics");
    expect(html).toContain('role="group" aria-label="Topics" data-social-home-topics-rail=""');
    expect(html).not.toMatch(/>Topics</);
    expect(html).not.toContain("data-house-chip-rail");
    expect(html).toContain(SOCIAL_HOME_TOPIC_TRACK_CLASS);
    expect(html).toContain(SOCIAL_HOME_TOPIC_CLASS);
    expect(html).toContain(SOCIAL_HOME_TOPIC_CURRENT_CLASS);
    expect(html).toContain(SOCIAL_HOME_TOPIC_CHIP_CLASS);
    expect(html).toContain(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS);
    expect(html).not.toContain("border-b-2");
    for (const cls of [SOCIAL_HOME_TOPIC_CLASS, SOCIAL_HOME_TOPIC_CURRENT_CLASS]) {
      expect(cls).toContain("h-11");
      expect(cls).toContain("md:h-10");
      expect(cls).toContain("whitespace-nowrap");
      expect(cls).toContain("rounded-full");
    }
    expect(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS).toContain("bg-accent-wash");
    expect(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS).toContain("font-semibold");
    expect(SOCIAL_HOME_TOPIC_CURRENT_CLASS).toContain("text-accent-ink");
    expect(SOCIAL_HOME_TOPIC_CLASS).toContain("text-ink");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("font-medium");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("text-[length:var(--text-sm)]");
    // One wash chip: the current one. No accent fill anywhere on the row.
    expect(html.match(/bg-accent-wash/g)?.length).toBe(1);
    expect(html).not.toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(html).not.toContain(HOUSE_FILTER_ON_CLASS);
    expect(html).not.toMatch(/bg-accent(?!-wash)/);
    expect(html.match(/overflow-x-auto/g)?.length).toBe(1);
    expect(html).not.toContain("flex-wrap");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("line-clamp");
    expect(html).not.toContain(SOCIAL_FOR_YOU_CARD_CLASS);
    // The fade over the trailing edge carries the round grey "More topics".
    expect(html).toContain(SOCIAL_HOME_TOPIC_FADE_CLASS);
    expect(html).toContain(`aria-label="${SOCIAL.home.moreTopics}"`);
    expect(html).toContain(SOCIAL_HOME_TOPIC_MORE_CLASS);
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toContain("rounded-full bg-surface-muted");
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toContain("size-11");
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toContain("md:size-10");
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).not.toMatch(/border/);
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS).toContain("var(--bg)");
    expect(SOCIAL_HOME_TOPIC_FADE_CLASS).toContain("pointer-events-none");
    // No lane chips in this row: the slider owns the lane.
    expect(html).not.toContain("data-social-home-lane");
    expect(html).toContain("Cinematography");
    expect(html).toContain("Vertical micro dramas");
    expect(html).not.toContain("Topics for you");
    expect(html).not.toContain("Trending topics");
    expect(html).not.toContain("data-social-for-you-topics");
    expect(SOCIAL.forYou).not.toHaveProperty("topics");
    expect(SOCIAL_CATEGORY_TOPICS).toHaveLength(15);
    const chips = [...html.matchAll(/data-social-home-topic="([^"]+)"/g)].map((match) => match[1]);
    expect(chips[0]).toBe(SOCIAL_CATEGORY_ALL);
    expect(chips).toEqual([...SOCIAL_CATEGORY_LABELS]);
    expect(chips.slice(1)).toEqual([...SOCIAL_CATEGORY_TOPICS]);
    expect(chips.slice(1)).toEqual(sortTopicsAlpha(chips.slice(1)));
    expect(html).toMatch(/data-social-home-topic="All"[^>]*aria-current="true"/);
  });

  // H · Feed (founder 2026-10-05; replaces "renders D story tiles: 56×100,
  // names under, ink unseen ring, no accent"): the locked story cards —
  // 112×200 / 108×192, radius 16, gap 8, the name on the picture, the
  // accent ring when unseen, Create story with the accent plus on the seam.
  it("renders the H story cards: 112×200, the name on the picture, accent unseen ring", () => {
    const html = renderToStaticMarkup(
      <SocialStoriesRail
        canCreate
        authors={authors}
        faces={faces}
        cards={[
          {
            authorId: "u2",
            storyIds: ["s1"],
            unseen: true,
            latest: {
              id: "s1",
              author_id: "u2",
              body: null,
              media: [],
              expires_at: "2099-01-01T00:00:00.000Z",
              created_at: "2026-09-14T12:00:00.000Z",
            },
          },
        ]}
      />,
    );
    expect(html).toContain('role="group" aria-label="Stories"');
    expect(html).toContain(SOCIAL_HOME_STORIES_RAIL_CLASS);
    expect(html).toContain(SOCIAL_HOME_STORY_CARD_CLASS);
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("h-[192px] w-[108px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("md:h-[200px] md:w-[112px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).not.toMatch(/border|shadow/);
    expect(SOCIAL_HOME_STORIES_RAIL_CLASS).toContain("gap-2");
    expect(SOCIAL_HOME_STORIES_RAIL_CLASS).toContain("max-md:px-4");
    expect(html).not.toContain("h-[100px] w-14");
    expect(html).not.toContain("w-[70px]");
    expect(html).not.toContain("data-social-stories-tall");
    // Create story: the photo in the upper 120, the label on the muted
    // plate, the accent plus ringed in muted on the seam.
    expect(html).toContain("data-social-story-create");
    expect(html).toContain(`aria-label="${SOCIAL.stories.yourStoryCreate}"`);
    expect(html).toContain(`>${SOCIAL.stories.create}<`);
    expect(html).toContain(SOCIAL_HOME_STORY_CREATE_FACE_CLASS);
    expect(SOCIAL_HOME_STORY_CREATE_FACE_CLASS).toContain("h-[120px]");
    expect(html).toContain(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS);
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain("text-[length:var(--text-sm)]");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain("font-medium");
    expect(html).toContain(SOCIAL_HOME_STORY_PLUS_CLASS);
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("bg-accent");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("border-[3px] border-surface-muted");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("size-[42px]");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("md:size-[46px]");
    // Unseen: the accent ring around the top-left avatar. Seen: hairline.
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("border-2");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("border-accent");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("size-8");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("md:size-9");
    expect(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS).toContain("border-hairline");
    const userCard = html.slice(html.indexOf("data-social-story-card"));
    expect(userCard).toContain(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS);
    expect(userCard).toContain("data-social-story-unseen");
    expect(userCard).toContain("data-social-story-media");
    expect(userCard).toContain('src="https://s3.example/signed-avatar"');
    // The name on the picture: "Maya C." over the band scrim; the link's
    // name is "Maya Chen story".
    expect(userCard).toContain(`aria-label="${SOCIAL.stories.cardLabel("Maya Chen")}"`);
    expect(SOCIAL.stories.cardLabel("Maya Chen")).toBe("Maya Chen story");
    expect(userCard).toContain(`<span data-social-story-name="" class="${SOCIAL_HOME_STORY_NAME_CLASS}">Maya C.</span>`);
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("from-band/72");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("text-band-ink");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("min-h-12");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).not.toMatch(/truncate|line-clamp/);
    expect(userCard).not.toContain(SOCIAL.stories.yourStory);
    expect(html).not.toContain("truncate");
    expect(html.indexOf(SOCIAL.stories.create)).toBeLessThan(html.indexOf("data-social-story-card"));
  });

  it("sets Create Story in house t-body-sm, not t-label stacked caps", () => {
    expect(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS).toBe("t-body-sm font-medium text-ink");
    expect(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS).not.toContain("t-label");
    expect(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS).not.toContain("uppercase");
  });

  // Replaces "paints the Home create badge in ink": H returns the accent
  // well with the white plus on the Feed (the stories card lock).
  it("paints the Home create plus on the accent well, as the Stories page does", () => {
    const home = renderToStaticMarkup(
      <SocialStoriesRail canCreate authors={authors} faces={faces} cards={[]} />,
    );
    const stories = renderToStaticMarkup(
      <SocialStoriesRail
        canCreate
        surface="stories"
        authors={authors}
        faces={faces}
        cards={[]}
      />,
    );
    expect(home).toContain(SOCIAL_HOME_STORY_PLUS_CLASS);
    expect(home).toContain('data-social-icon="plus"');
    expect(home).toContain(`width="${SOCIAL_ICON_SIZE_STORY_PLUS}"`);
    expect(home).toContain("max-md:size-[18px]");
    expect(home).toContain("text-accent-contrast");
    expect(home).not.toContain("data-social-icon-active");
    expect(home).not.toContain("bg-ink");
    expect(stories).toContain(SOCIAL_STORIES_PLUS_WELL_CLASS);
    expect(stories).toContain('data-social-icon="plus"');
    expect(stories).not.toContain("data-social-icon-active");
    expect(SOCIAL_STORIES_PLUS_WELL_CLASS).toContain("bg-accent");
    expect(SOCIAL_STORIES_PLUS_WELL_CLASS).toContain("text-accent-contrast");
    expect(SOCIAL_STORIES_PLUS_WELL_CLASS).not.toContain("bg-surface");
  });

  it("uses Phosphor users, 8px empty panel, and Sporty Blue empty CTA", () => {
    const html = renderToStaticMarkup(
      <SocialEmpty
        icon="users"
        title={SOCIAL.home.empty}
        hint={SOCIAL.home.emptyHint}
        action={{ href: socialSearchHref({ intent: "people" }), label: SOCIAL.home.findPeople }}
      />,
    );
    expect(html).toContain('data-social-icon="users"');
    expect(html).toContain('width="40"');
    expect(html).toContain('height="40"');
    expect(html).toContain(SOCIAL.home.empty);
    expect(html).toContain(SOCIAL.home.findPeople);
    expect(html).toContain("/social/search?intent=people");
    expect(html).toContain(SOCIAL_EMPTY_PANEL_CLASS);
    expect(html).toContain(SOCIAL_EMPTY_ACTION_CLASS);
    expect(SOCIAL_EMPTY_PANEL_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_EMPTY_ACTION_CLASS).toContain("bg-accent");
  });

  it("keeps finish-setup on the 8/16 density", () => {
    const html = renderToStaticMarkup(
      <SocialOnboardingChecklist
        items={[
          {
            id: "photo",
            label: SOCIAL.checklist.photo,
            href: SOCIAL_ROUTES.profile,
            cta: SOCIAL.checklist.photoCta,
            done: false,
          },
        ]}
      />,
    );
    expect(html).toContain("data-social-checklist");
    expect(html).toContain(SOCIAL_CHECKLIST_CLASS);
    expect(SOCIAL_CHECKLIST_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_CHECKLIST_CLASS).toContain("p-[var(--space-4)]");
    expect(html).toContain(SOCIAL.checklist.title);
    expect(html).toContain(SOCIAL.checklist.photoCta);
    expect(html).toContain(SOCIAL_CHECKLIST_TRACK_CLASS);
  });

  it("keeps the nested For you setup track on surface so the unfilled bar reads", () => {
    const html = renderToStaticMarkup(
      <SocialOnboardingChecklist
        tone="nested"
        items={[
          {
            id: "photo",
            label: SOCIAL.checklist.photo,
            href: SOCIAL_ROUTES.profile,
            cta: SOCIAL.checklist.photoCta,
            done: false,
          },
        ]}
      />,
    );
    expect(html).toContain('data-social-checklist-tone="nested"');
    expect(html).toContain(SOCIAL_FOR_YOU_CARD_CLASS);
    expect(html).toContain(SOCIAL_CHECKLIST_TRACK_NESTED_CLASS);
    expect(html).not.toContain(SOCIAL_CHECKLIST_TRACK_CLASS);
    expect(SOCIAL_FOR_YOU_CARD_CLASS).toContain("bg-surface-muted");
    expect(SOCIAL_CHECKLIST_TRACK_NESTED_CLASS).toContain("bg-surface");
    expect(SOCIAL_CHECKLIST_TRACK_NESTED_CLASS).not.toContain("bg-surface-muted");
  });
});

describe("Social Stories craft (Figma 138:163 / 138:889 / 138:943)", () => {
  it("sizes the Stories rail at 112×168 with a 36px plus well", () => {
    const html = renderToStaticMarkup(
      <SocialStoriesRail
        canCreate
        surface="stories"
        authors={authors}
        faces={faces}
        cards={[
          {
            authorId: "u2",
            storyIds: ["s1"],
            unseen: true,
            latest: {
              id: "s1",
              author_id: "u2",
              body: null,
              media: [],
              expires_at: "2099-01-01T00:00:00.000Z",
              created_at: "2026-09-14T12:00:00.000Z",
            },
          },
        ]}
      />,
    );
    expect(html).toContain('data-social-stories-surface="stories"');
    expect(html).toContain("w-[112px]");
    expect(html).toContain("h-[168px]");
    expect(html).toContain("size-9");
    expect(html).toContain(`width="${SOCIAL_ICON_SIZE_STORY_PLUS}"`);
    expect(html).toContain(SOCIAL.stories.create);
    expect(html).toContain(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS);
    expect(html).toContain(SOCIAL.stories.you);
    expect(html).not.toContain(SOCIAL.stories.yourStory);
    expect(html).toContain("bg-hairline");
    expect(html).toContain("bg-accent");
    expect(html).toContain("p-[3px]");
    const mobile = html.slice(html.indexOf('data-social-stories-mobile=""'));
    expect(mobile).toContain("data-social-story-media");
    expect(html.slice(0, html.indexOf('data-social-stories-mobile=""'))).toContain("data-social-story-media");
  });

  it("holds a story still off the media signer until it is visible, and does not use the profile photo", () => {
    const authorId = "11111111-1111-4111-8111-111111111111";
    const objectId = "22222222-2222-4222-8222-222222222222";
    const imageKey = `stories/${authorId}/${objectId}.jpg`;
    const videoKey = `stories/${authorId}/${objectId}.mp4`;
    const image = renderToStaticMarkup(
      <SocialStoriesRail
        authors={new Map([[authorId, { display_name: "Maya Chen", handle: "maya" }]])}
        faces={faces}
        canCreate={false}
        cards={[
          {
            authorId,
            storyIds: ["s1"],
            unseen: true,
            latest: {
              id: "s1",
              author_id: authorId,
              body: null,
              media: [{ kind: "image", key: imageKey, contentType: "image/jpeg" }],
              expires_at: "2099-01-01T00:00:00.000Z",
              created_at: "2026-09-14T12:00:00.000Z",
            },
          },
        ]}
      />,
    );
    const media = image.slice(image.indexOf("data-social-story-media"));
    expect(media).toContain('data-social-story-rail-cover="held"');
    expect(media).not.toContain("/api/social/media?key=");
    expect(media).not.toContain(encodeURIComponent(imageKey));
    expect(media).not.toContain('loading="lazy"');
    expect(media).not.toContain("signed-avatar");
    // H · Feed: the name is on the picture over the band scrim (the
    // identity lock's "no name" is superseded on the Feed).
    expect(image).toContain('aria-label="Maya Chen story"');
    expect(image).toContain(">Maya C.<");
    expect(image).toContain("from-band/72");
    const video = renderToStaticMarkup(
      <SocialStoriesRail
        authors={new Map([[authorId, { display_name: "Maya Chen", handle: "maya" }]])}
        faces={new Map()}
        canCreate={false}
        cards={[
          {
            authorId,
            storyIds: ["s1"],
            unseen: false,
            latest: {
              id: "s1",
              author_id: authorId,
              body: null,
              media: [{ kind: "video", key: videoKey, contentType: "video/mp4" }],
              expires_at: "2099-01-01T00:00:00.000Z",
              created_at: "2026-09-14T12:00:00.000Z",
            },
          },
        ]}
      />,
    );
    expect(video).toContain("data-social-video-closed");
    expect(video).not.toContain("<video");
    expect(video).not.toContain(encodeURIComponent(videoKey));
    expect(video).not.toContain("autoplay");
    expect(video).toContain(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS);
    expect(video).not.toContain(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS);
    expect(video).not.toContain("accent");
  });

  it("does not paint an unsigned Mux poster on a signed story card", () => {
    const authorId = "11111111-1111-4111-8111-111111111111";
    const objectId = "22222222-2222-4222-8222-222222222222";
    const playbackId = "uNbxnGLKJ00yfbijDO8COxT";
    const html = renderToStaticMarkup(
      <SocialStoriesRail
        authors={new Map([[authorId, { display_name: "Maya Chen", handle: "maya" }]])}
        faces={new Map()}
        canCreate={false}
        cards={[
          {
            authorId,
            storyIds: ["s1"],
            unseen: true,
            latest: {
              id: "s1",
              author_id: authorId,
              body: null,
              media: [
                {
                  kind: "video",
                  key: `stories/${authorId}/${objectId}.mp4`,
                  contentType: "video/mp4",
                  provider: "mux",
                  playbackId,
                  playbackPolicy: "signed",
                },
              ],
              expires_at: "2099-01-01T00:00:00.000Z",
              created_at: "2026-09-14T12:00:00.000Z",
            },
          },
        ]}
      />,
    );
    expect(html).toContain('data-social-story-mux-thumb="pending"');
    expect(html).not.toContain("image.mux.com");
    expect(html).not.toContain("<img");
  });

  // Replaces "keeps the Home surface on D tiles with Your story first".
  it("keeps the Home surface on the H story cards with Create story first", () => {
    const html = renderToStaticMarkup(
      <SocialStoriesRail canCreate createName="Adam Carpenter" authors={authors} faces={faces} cards={[]} />,
    );
    expect(html).toContain('data-social-stories-surface="home"');
    expect(html).not.toContain("data-social-stories-tall");
    expect(html).toContain("md:h-[200px] md:w-[112px]");
    expect(html).not.toContain("h-[100px] w-14");
    expect(html).not.toContain("w-[136px]");
    expect(html).not.toContain("h-[240px]");
    expect(html).toContain(`aria-label="${SOCIAL.stories.yourStoryCreate}"`);
    expect(html).toContain("data-social-avatar");
    expect(html).toContain("AC");
    expect(html).not.toContain("<img");
    expect(html).toContain(`>${SOCIAL.stories.create}<`);
    expect(html).not.toContain(`>${SOCIAL.stories.yourStory}<`);
    expect(html).not.toContain("w-[68px]");
  });

  it("shows the story create face photo when a signed URL exists", () => {
    const html = renderToStaticMarkup(
      <SocialStoriesRail
        canCreate
        createName="Adam Carpenter"
        createPhotoUrl="https://s3.example/adam-face"
        authors={authors}
        faces={faces}
        cards={[]}
      />,
    );
    expect(html).toContain("data-social-story-create");
    expect(html).toContain("data-social-avatar");
    expect(html).toContain('src="https://s3.example/adam-face"');
    expect(html).not.toContain("AC");
  });

  it("renders the Stories empty panel with image 40 and a rounded-full Create a story CTA", () => {
    const html = renderToStaticMarkup(<SocialStoriesEmpty />);
    expect(html).toContain("data-social-stories-empty");
    expect(html).toContain('data-social-icon="image"');
    expect(html).toContain('width="40"');
    expect(html).toContain(SOCIAL.stories.emptyRail);
    expect(html).toContain(SOCIAL.stories.emptyHint);
    expect(html).toContain(SOCIAL.stories.createCta);
    expect(html).toContain(SOCIAL_STORIES_EMPTY_ACTION_CLASS);
    expect(SOCIAL_STORIES_EMPTY_ACTION_CLASS).toContain("rounded-full");
    expect(html).toContain('data-social-icon="plus"');
  });
});
