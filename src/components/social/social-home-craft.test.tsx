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
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
  SOCIAL_FOR_YOU_CARD_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_HOME_STORIES_TRACK_CLASS,
  SOCIAL_EMPTY_ACTION_CLASS,
  SOCIAL_EMPTY_PANEL_CLASS,
  SOCIAL_HOME_STORY_CREATE_LABEL_CLASS,
  SOCIAL_HOME_STORY_PLUS_CLASS,
  SOCIAL_STORIES_EMPTY_ACTION_CLASS,
  SOCIAL_STORIES_PLUS_WELL_CLASS,
  SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS,
  SOCIAL_TOPIC_CHIP_ROW_CLASS,
  SOCIAL_TOPIC_RAIL_CHIP_CLASS,
  SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS,
  SOCIAL_TOPIC_RAIL_CLASS,
  SOCIAL_TOPIC_RAIL_ROWS,
} from "@/lib/social-chrome";
import { HOUSE_PILL_SELECTED_CLASS, HOUSE_SCROLL_ROW_CLASS } from "@/lib/house-shell";
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
    expect(html).toContain(`width="16"`);
    expect(html).not.toContain(`width="20"`);
    expect(html).not.toContain("t-label");
    expect(html).toContain(`aria-label="${SOCIAL.home.composerPhoto}"`);
    expect(html).toContain(`aria-label="${SOCIAL.home.composerCamera}"`);
    expect(html).not.toContain(`>${SOCIAL.home.composerPhoto}<`);
    expect(html).not.toContain(`>${SOCIAL.home.composerCamera}<`);
    expect(html).toContain(`accept="${SOCIAL_CREATE_MEDIA_ACCEPT}"`);
    expect(html).toContain(`accept="${SOCIAL_CREATE_CAMERA_ACCEPT}"`);
    expect(html).toContain('capture="environment"');
    expect(html).toContain('data-social-create-media-capture="environment"');
    const photoAt = html.indexOf('data-social-composer-affordance="photo"');
    const cameraAt = html.indexOf('data-social-composer-affordance="camera"');
    expect(photoAt).toBeGreaterThan(html.indexOf("data-social-composer-prompt"));
    expect(cameraAt).toBeGreaterThan(photoAt);
    expect(SOCIAL_COMPOSER_CLASS).toMatch(/^flex /);
    expect(SOCIAL_COMPOSER_CLASS).toContain("items-center");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("flex-col");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("hidden");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("h-20");
    expect(SOCIAL_COMPOSER_CLASS).toContain("border-y");
    expect(SOCIAL_COMPOSER_CLASS).toContain("border-x-0");
    expect(SOCIAL_COMPOSER_CLASS).toContain("border-hairline");
    expect(SOCIAL_COMPOSER_CLASS).toContain("rounded-none");
    expect(SOCIAL_COMPOSER_CLASS).toContain("bg-surface");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("bg-transparent");
    expect(SOCIAL_COMPOSER_CLASS).toContain("px-[var(--space-4)]");
    expect(SOCIAL_COMPOSER_CLASS).toContain("py-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("py-0");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_COMPOSER_CLASS).not.toMatch(/(?:^|\s)border(?:\s|$)/);
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("p-[var(--space-4)]");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("gap-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("flex-1");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("items-center");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_ROW_CLASS).not.toContain("gap-[var(--space-3)]");
    expect(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS).toContain("ml-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS).toContain("gap-0");
    expect(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS).not.toContain("gap-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS).not.toContain("pl-[calc(2.5rem+var(--space-3))]");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain("size-8");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).not.toContain("size-10");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain("text-ink-2");
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).not.toContain("bg-accent");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("bg-transparent");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("border-0");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("outline-none");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("shadow-");
    expect(html).toContain("shadow-none");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("bg-surface");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("bg-surface-muted");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("border-hairline");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("h-10");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("rounded-[20px]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("h-8");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("rounded-[16px]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("px-[var(--space-4)]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("t-body");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("text-ink-2");
    expect(html).toContain("size-10");
    expect(html).toContain("size-8");
    expect(html).not.toContain("size-11");
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

  it("renders Topics as a one-row house chip rail, not a wrapping card", () => {
    const html = renderToStaticMarkup(<SocialHomeTopics />);
    expect(html).toContain("data-social-home-topics");
    expect(html).toContain("data-social-home-topics-rail");
    expect(html).toContain("data-house-chip-rail");
    expect(html).toContain('data-house-chip-rail-row="0"');
    expect(html).not.toContain('data-house-chip-rail-row="1"');
    expect(html).not.toMatch(/>Topics</);
    expect(html).toContain(SOCIAL_TOPIC_RAIL_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_CHIP_ROW_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_RAIL_CHIP_CLASS);
    expect(html).toContain(SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS);
    expect(html).toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(SOCIAL_TOPIC_RAIL_CHIP_CLASS).toContain("h-8");
    expect(SOCIAL_TOPIC_RAIL_CHIP_CLASS).toContain("t-body-sm");
    expect(SOCIAL_TOPIC_RAIL_CHIP_CLASS).not.toContain("py-[var(--space-2)]");
    expect(SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS).toContain("h-8");
    expect(SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS).toContain("t-body-sm");
    expect(SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS).toContain(HOUSE_PILL_SELECTED_CLASS);
    expect(html).toContain("h-8");
    expect(html).toContain("py-0");
    expect(html).toContain("-mt-[var(--space-2)]");
    expect(SOCIAL_TOPIC_RAIL_CHIP_CLASS).toContain("h-8");
    expect(html).not.toContain("text-[11px]");
    expect(html).not.toContain("py-[5px]");
    expect(SOCIAL_TOPIC_RAIL_CLASS).toBe(HOUSE_SCROLL_ROW_CLASS);
    expect(SOCIAL_TOPIC_RAIL_CLASS).toContain("overflow-x-auto");
    expect(html.match(/overflow-x-auto/g)?.length).toBe(1);
    expect(SOCIAL_TOPIC_RAIL_CLASS).not.toContain("flex-wrap");
    expect(SOCIAL_TOPIC_CHIP_ROW_CLASS).not.toContain("flex-wrap");
    expect(html).not.toContain(SOCIAL_FOR_YOU_CARD_CLASS);
    expect(html).not.toContain("flex-wrap");
    expect(html).toContain("Cinematography");
    expect(html).toContain("Vertical micro dramas");
    expect(html).not.toContain("Topics for you");
    expect(html).not.toContain("Trending topics");
    expect(html).not.toContain("Topics.");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("data-social-for-you-topics");
    expect(SOCIAL.forYou).not.toHaveProperty("topics");
    expect(SOCIAL_TOPIC_RAIL_ROWS).toBe(1);
    expect(SOCIAL_CATEGORY_TOPICS).toHaveLength(15);
    const row = html.slice(html.indexOf('data-house-chip-rail-row="0"'));
    const chips = [...row.matchAll(/data-social-home-topic="([^"]+)"/g)].map((match) => match[1]);
    expect(chips[0]).toBe(SOCIAL_CATEGORY_ALL);
    expect(chips).toEqual([...SOCIAL_CATEGORY_LABELS]);
    expect(chips.slice(1)).toEqual([...SOCIAL_CATEGORY_TOPICS]);
    expect(chips.slice(1)).toEqual(sortTopicsAlpha(chips.slice(1)));
    expect(row).toContain("Acting");
    expect(row).toContain("AI filmmaking");
  });

  it("renders tall FB-style story tiles with a plus well and unseen face rings", () => {
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
    expect(html).toContain("data-social-story-create");
    expect(html).toContain(`width="${SOCIAL_ICON_SIZE_STORY_PLUS}"`);
    expect(html).toContain(`height="${SOCIAL_ICON_SIZE_STORY_PLUS}"`);
    expect(html).toContain(SOCIAL.stories.create);
    expect(html).not.toContain(SOCIAL.stories.yourStory);
    expect(html).toContain("data-social-stories-tall");
    expect(html).toContain("data-social-story-unseen");
    expect(html).toContain("data-social-story-media");
    expect(html).toContain('src="https://s3.example/signed-avatar"');
    expect(html).toContain("data-social-avatar");
    expect(html).toContain('aria-label="Maya Chen"');
    expect(html).not.toContain("Maya C.");
    expect(html).not.toContain("from-band/72");
    expect(html).not.toContain("bg-gradient-to-t");
    expect(html).toContain("w-[136px]");
    expect(html).toContain("h-[240px]");
    expect(html).toContain("md:w-[144px]");
    expect(html).toContain("md:h-[256px]");
    expect(html).not.toContain("w-[120px]");
    expect(html).not.toContain("h-[208px]");
    expect(html).toContain(SOCIAL_HOME_STORIES_TRACK_CLASS);
    expect(html).toContain("gap-2");
    expect(html).toContain("px-0");
    expect(html).toContain("pt-0");
    expect(html).toContain("pb-2");
    expect(html).not.toContain("pr-4");
    expect(html).not.toContain("w-[108px]");
    expect(html).not.toContain("h-[192px]");
    expect(html).toContain("rounded-[var(--radius-lg)]");
    expect(html).toContain("bg-accent");
    expect(html).not.toContain("bg-band/55");
    expect(html).toContain("h-[168px]");
    expect(html).toContain("md:h-[176px]");
    expect(html).toContain("h-[72px]");
    expect(html).toContain("md:h-20");
    expect(html).toContain("top-[150px]");
    expect(html).toContain("md:top-[156px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("h-[240px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("w-[136px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("md:h-[256px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("md:w-[144px]");
    expect(html).toContain("md:size-10");
    expect(html).toContain("font-medium");
    expect(html).toContain(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS);
    expect(html).toContain(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS);
    const userCard = html.slice(html.indexOf("data-social-story-card"));
    expect(userCard.indexOf("data-social-avatar")).toBeGreaterThan(userCard.indexOf("data-social-story-media"));
    expect(userCard).not.toContain(SOCIAL.stories.create);
    expect(html.indexOf(SOCIAL.stories.create)).toBeLessThan(html.indexOf("data-social-story-card"));
  });

  it("sets Create Story in house t-body-sm, not t-label stacked caps", () => {
    expect(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS).toBe("t-body-sm font-medium text-ink");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS);
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain("t-body-sm");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).not.toContain("t-label");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).not.toContain("uppercase");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).not.toContain("tracking-");
    expect(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS).not.toContain("t-label");
    expect(SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS).not.toContain("uppercase");
  });

  it("paints Create Story plus as a white glyph on the accent well, not a fill knockout", () => {
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
    expect(home).toContain("text-accent-contrast");
    expect(home).not.toContain("data-social-icon-active");
    expect(stories).toContain(SOCIAL_STORIES_PLUS_WELL_CLASS);
    expect(stories).toContain('data-social-icon="plus"');
    expect(stories).not.toContain("data-social-icon-active");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("bg-accent");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("text-accent-contrast");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).not.toContain("bg-surface ");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).not.toContain("bg-surface-muted");
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
    const media = image.slice(image.indexOf("data-social-story-media"), image.indexOf("data-social-avatar"));
    expect(media).toContain('data-social-story-rail-cover="held"');
    expect(media).not.toContain("/api/social/media?key=");
    expect(media).not.toContain(encodeURIComponent(imageKey));
    expect(media).not.toContain('loading="lazy"');
    expect(media).not.toContain("signed-avatar");
    expect(image).toContain('aria-label="Maya Chen"');
    expect(image).not.toContain("Maya C.");
    expect(image).not.toContain("from-band/72");
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
    expect(video).toContain("border-hairline");
    expect(video).not.toContain("border-accent");
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

  it("keeps Home rail tall FB-style and Create story when surface is home", () => {
    const html = renderToStaticMarkup(
      <SocialStoriesRail canCreate createName="Adam Carpenter" authors={authors} faces={faces} cards={[]} />,
    );
    expect(html).toContain('data-social-stories-surface="home"');
    expect(html).toContain("data-social-stories-tall");
    expect(html).toContain("w-[136px]");
    expect(html).toContain("h-[240px]");
    expect(html).not.toContain("w-[120px]");
    expect(html).not.toContain("h-[208px]");
    expect(html).toContain("gap-2");
    expect(html).not.toContain("gap-4");
    expect(html).toContain(`width="${SOCIAL_ICON_SIZE_STORY_PLUS}"`);
    expect(html).toContain(SOCIAL.stories.create);
    expect(html).toContain("data-social-avatar");
    expect(html).toContain("AC");
    expect(html).not.toContain("<img");
    expect(html).not.toContain(SOCIAL.stories.yourStory);
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
