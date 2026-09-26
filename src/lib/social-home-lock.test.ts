import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL_DESKTOP_NAV, SOCIAL_NAV } from "./nav";
import { SOCIAL_PHONE_DESTS } from "./house-phone-shell";
import { SOCIAL_CATEGORY_LABELS } from "./social-categories";
import {
  SOCIAL_CENTER_WIDTH_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
  SOCIAL_CONTENT_PAIR_WIDTH,
  SOCIAL_DESKTOP_FRAME_PAD_CLASS,
  SOCIAL_DESKTOP_MEASURE,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_ROW_CLASS,
  SOCIAL_FEED_TAIL_RULE_CLASS,
  SOCIAL_HOME_TOPICS_CLASS,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_STORIES_FEED_RULE_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_FIGMA_PROFILE_BIO,
  SOCIAL_FIGMA_PROFILE_EDIT,
  SOCIAL_FIGMA_PROFILE_OWN,
  SOCIAL_FOR_YOU_RAIL_CLASS,
  SOCIAL_HOME_CENTER_CLASS,
  SOCIAL_HOME_LAYOUT_CLASS,
  SOCIAL_PROFILE_CENTER_CLASS,
  SOCIAL_PROFILE_HANDLE_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_NAME_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
} from "./social-chrome";
import { SOCIAL_HOME_STACK_LOCK, SOCIAL_HOME_STACK_ORDER } from "./social-home";
import { SOCIAL, SOCIAL_PROFILE_TABS, SOCIAL_ROUTES } from "./social";

const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const forYouSlot = readFileSync("src/components/social/social-for-you-slot.tsx", "utf8");
const homeSkeleton = readFileSync("src/components/social/social-skeletons.tsx", "utf8");
const explore = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
const create = readFileSync("src/app/(app)/social/create/page.tsx", "utf8");
const stories = readFileSync("src/app/(app)/social/stories/page.tsx", "utf8");
const messages = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
const card = readFileSync("src/components/social/social-ui.tsx", "utf8");
const rail = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
const empty = readFileSync("src/components/social/social-empty.tsx", "utf8");
const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const icons = readFileSync("src/lib/social-icons.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

describe("Social Home miss list v1 P0 lock", () => {
  it("keeps the five Social jobs and parks Groups / Courses / Leaderboard", () => {
    expect(SOCIAL_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_NAV.map((item) => item.href)).toEqual([
      SOCIAL_ROUTES.home,
      SOCIAL_ROUTES.explore,
      SOCIAL_ROUTES.create,
      SOCIAL_ROUTES.dms,
      SOCIAL_ROUTES.profile,
    ]);
    expect(SOCIAL_DESKTOP_NAV).toBe(SOCIAL_NAV);
    expect(SOCIAL_DESKTOP_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain(SOCIAL_ROUTES.groups);
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain("/social/courses");
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain("/education");
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain(SOCIAL_ROUTES.leaderboard);
  });

  it("keeps Home on the following wall with stories, composer, and Following | For you tabs", () => {
    expect(home).toContain("loadCachedFollowingPosts");
    expect(home).toContain("SocialStoriesRail");
    expect(home).toContain("SocialHomeComposer");
    expect(home).toContain("SocialHomeTopics");
    expect(home).toContain("data-social-home-stack={SOCIAL_HOME_STACK_LOCK}");
    expect(homeSkeleton).toContain("data-social-home-stack={SOCIAL_HOME_STACK_LOCK}");
    expect(SOCIAL_HOME_STACK_LOCK).toBe("lock_topics_composer_stories_wall");
    expect(SOCIAL_HOME_STACK_ORDER).toEqual(["topics", "composer", "stories", "wall"]);
    expect(home.indexOf("<SocialHomeTopics")).toBeLessThan(home.indexOf("<SocialHomeComposer"));
    expect(home.indexOf("<SocialHomeComposer")).toBeLessThan(home.indexOf("<SocialStoriesRail"));
    expect(home).not.toContain("data-social-home-topics-composer-divider");
    expect(home).not.toContain("SOCIAL_HOME_TOPICS_COMPOSER_DIVIDER_CLASS");
    expect(homeSkeleton).not.toContain("data-social-home-topics-composer-divider");
    expect(chrome).not.toContain("SOCIAL_HOME_TOPICS_COMPOSER_DIVIDER_CLASS");
    expect(home.indexOf("<SocialStoriesRail")).toBeLessThan(home.indexOf("<SocialHomeTabs"));
    expect(homeSkeleton.indexOf("data-social-home-topics-skeleton")).toBeLessThan(
      homeSkeleton.indexOf("data-social-home-composer-skeleton"),
    );
    expect(homeSkeleton.indexOf("data-social-home-composer-skeleton")).toBeLessThan(
      homeSkeleton.indexOf("SocialStoriesRailSkeleton"),
    );
    expect(homeSkeleton.indexOf("SocialStoriesRailSkeleton")).toBeLessThan(
      homeSkeleton.indexOf("data-social-feed-skeleton"),
    );
    expect(home).toContain("SocialHomeTabs");
    expect(home).not.toContain("SocialProfileTabs");
    expect(home).not.toContain("creditsEmpty");
    expect(home).not.toContain("SocialWelcomeVideo");
    expect(home).toContain("SocialForYouRail");
    expect(home).toContain("SocialDesktopForYouSlot");
    expect(home).toContain("signedEducationCoverUrls");
    expect(forYouSlot).toContain("SocialForYouRail");
    expect(forYouSlot).toContain("loadDiscoverableCourses");
    expect(forYouSlot).toContain("latestDiscoverableCourse");
    expect(forYouSlot).toContain("loadSuggestedPeople");
    expect(home).not.toContain("SocialRecentChats");
    expect(home).not.toContain("SocialHomeRecentChatsSlot");
    expect(home).not.toContain("loadDmInbox");
    expect(home).toContain("ensureOwnSocialProfile");
    expect(home).toContain("data-social-following-empty");
    expect(home).not.toContain("SocialLensRow");
    expect(home).not.toContain("SocialNeedProfile");
    expect(home).not.toContain("SocialPostCompose");
    expect(home).not.toContain("SocialCreateCompose");
    expect(home).not.toContain("loadVisiblePosts");
    expect(home).not.toContain("SOCIAL.courses");
    expect(home).not.toContain('"/education"');
    expect(SOCIAL.home.followingTab).toBe("Following");
    expect(SOCIAL.home.forYouTab).toBe("For you");
    expect(SOCIAL.home.composerPrompt).toBe("Share something");
    expect(SOCIAL.home.composerPromptNamed).toBe("Share something");
    expect(SOCIAL.home.composerPromptNamed).toBe(SOCIAL.home.composerPrompt);
    expect(SOCIAL.home.composerPhoto).toBe("Photo");
    expect(SOCIAL.home.composerCamera).toBe("Camera");
    expect(SOCIAL.forYou).not.toHaveProperty("topics");
    expect(SOCIAL.forYou.latestCourse).toBe("Latest course");
    expect(SOCIAL.checklist.photo).toBe("Add a profile photo");
    expect(SOCIAL.checklist.bio).toBe("Write a short bio");
    expect(SOCIAL.checklist.introduce).toBe("Introduce yourself");
    expect(SOCIAL.checklist.firstPost).toBe("Share your first post");
    expect(SOCIAL.checklist.firstStory).toBe("Create your first story");
  });

  it("hides Home lenses on Explore, Messages, Profile, and Create", () => {
    expect(explore).not.toContain("SocialLensRow");
    expect(explore).not.toContain("data-social-lenses");
    expect(explore).toContain("data-social-explore-search");
    expect(explore).toContain("data-social-explore-for-you");
    expect(explore).not.toContain("loadFollowingPosts");
    expect(explore).not.toContain("loadVisiblePosts");
    expect(messages).not.toContain("SocialLensRow");
    expect(profile).not.toContain("SocialLensRow");
    expect(create).not.toContain("SocialLensRow");
    expect(create).toContain("SocialCreateCompose");
    expect(stories).toContain("permanentRedirect");
    expect(stories).toContain("SOCIAL_ROUTES.home");
    expect(stories).not.toContain("SocialStoriesEmpty");
    expect(stories).not.toContain("SocialLensRow");
  });

  it("locks the Home category register", () => {
    expect(SOCIAL_CATEGORY_LABELS).toEqual([
      "All",
      "Acting",
      "AI filmmaking",
      "Animation",
      "Casting",
      "Cinematography",
      "Content creator",
      "Directors",
      "Distribution",
      "Film Festivals",
      "Financing",
      "Music",
      "Post-production",
      "Producers",
      "Screenwriting",
      "Vertical micro dramas",
    ]);
  });

  it("keeps story rings off the feed row and Create story first", () => {
    expect(rail).toContain("data-social-story-create");
    expect(rail.indexOf("data-social-story-create")).toBeLessThan(
      rail.indexOf("cards.map"),
    );
    expect(card).toContain("ring?:");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    expect(postCard).not.toContain("ring=");
    expect(postCard).not.toContain("hidden md:flex");
    expect(postCard).not.toContain("md:hidden");
    expect(postCard).not.toContain("data-social-post-mobile");
    expect(postCard).not.toContain("text-[10px]");
    expect(postCard).toContain("data-social-post-time");
    expect(postCard).toContain("SocialLikeCount");
    expect(postCard).toContain("SocialCommentTrigger");
    expect(pkg).toContain('"next": "16.3.5"');
    expect(existsSync("src/components/social/social-mobile-dock.tsx")).toBe(false);
    expect(home).not.toContain("Reels");
    expect(explore).not.toContain("Reels");
  });

  it("locks Home chrome against Figma 176:1085 Circle-primary + compact composer", () => {
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    const composer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
    const forYou = readFileSync("src/components/social/social-for-you.tsx", "utf8");
    const topics = readFileSync("src/components/social/social-home-topics.tsx", "utf8");
    expect(existsSync("src/components/social/social-rail-extras.tsx")).toBe(false);
    expect(rail).toContain("SOCIAL_ICON_SIZE_STORY_PLUS");
    expect(rail).toContain("SOCIAL_HOME_STORY_CARD_CLASS");
    expect(rail).toContain("SocialAvatar");
    expect(rail).toContain("createPhotoUrl");
    expect(rail).toContain("data-social-stories-tall");
    expect(rail).toContain("data-social-story-media");
    expect(rail).toContain("bg-accent");
    expect(rail).toContain("bg-hairline");
    expect(rail).toContain("w-[112px]");
    expect(rail).not.toContain("size-10");
    expect(card).toContain("SOCIAL_FEED_ROW_CLASS");
    expect(card).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(card).toContain("socialMediaFrameClass");
    expect(card.slice(card.indexOf("export function SocialPostCard")).indexOf("SocialAvatar")).toBeLessThan(
      card.slice(card.indexOf("export function SocialPostCard")).indexOf("SocialPostMedia"),
    );
    expect(home).toContain('icon="users"');
    expect(home).toContain("SocialHomeTabs");
    expect(composer).toContain("data-social-home-composer");
    expect(composer).toContain('socialCreateHref("text")');
    expect(composer).toContain("data-social-composer-write");
    expect(composer).toContain("aria-label={SOCIAL.create.title}");
    expect(composer).not.toContain("SocialCreateSheet");
    expect(composer).not.toContain("data-social-create-sheet");
    const writeDirect = readFileSync(
      "docs/design-locks/share-something-text-write-direct-lock-v1.md",
      "utf8",
    );
    expect(writeDirect).toContain("/social/create?kind=text");
    expect(writeDirect).toContain("aria-label={SOCIAL.create.title}");
    expect(writeDirect).toContain("Add photo or video");
    expect(composer).toContain("socialComposerPrompt(authorName)");
    expect(composer).toContain("SocialAvatar");
    expect(composer).toContain("authorPhotoUrl");
    expect(composer).not.toContain("socialInitials");
    expect(composer).not.toContain("md:hidden");
    expect(composer).not.toContain("What's on your mind");
    expect(composer).toContain("text-ink-2");
    expect(composer).not.toContain("text-accent");
    expect(composer).not.toContain("data-social-composer-media");
    expect(composer).not.toContain("SOCIAL_MEDIA_ACCEPT");
    expect(composer).not.toContain("data-social-composer-action");
    expect(composer).not.toContain("ACTIONS");
    expect(composer).toContain("SocialIcon");
    expect(composer).toContain('icon="image"');
    expect(composer).toContain('icon="camera"');
    expect(composer).not.toContain('name="plus"');
    expect(composer).not.toContain('icon="broadcast"');
    expect(composer).not.toContain("t-label");
    expect(composer).toContain("aria-label={label}");
    expect(composer).toContain("SOCIAL.home.composerPhoto");
    expect(composer).toContain("SOCIAL.home.composerCamera");
    expect(composer).toContain("useSocialCreateMediaPick");
    expect(composer).toContain("SOCIAL_CREATE_CAMERA_ACCEPT");
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
    expect(SOCIAL_COMPOSER_CLASS).toContain("px-[var(--space-4)]");
    expect(SOCIAL_COMPOSER_CLASS).toContain("py-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("bg-transparent");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("py-0");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("bg-hairline");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("h-px");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_COMPOSER_CLASS).not.toMatch(/(?:^|\s)border(?:\s|$)/);
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("p-[var(--space-4)]");
    expect(SOCIAL_COMPOSER_CLASS).not.toContain("gap-[var(--space-2)]");
    expect(composer).toContain('className="size-10"');
    expect(composer).not.toContain("size-8");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_COMPOSER_ROW_CLASS).not.toContain("gap-[var(--space-3)]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("h-10");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("rounded-[20px]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("border-0");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("bg-transparent");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("outline-none");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("h-8");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("rounded-[16px]");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("border-hairline");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).not.toContain("shadow-");
    expect(chrome).toContain("SOCIAL_COMPOSER_ROW_CLASS");
    expect(chrome).toContain("gap-[var(--space-3)]");
    expect(chrome).toContain("SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS");
    expect(chrome).toContain("ml-[var(--space-2)]");
    expect(chrome).not.toContain("pl-[calc(2.5rem+var(--space-3))]");
    expect(shell).not.toContain("SocialRailAccountChip");
    expect(shell).not.toContain("data-social-rail-account");
    expect(forYou).not.toContain("SocialOnboardingChecklist");
    expect(forYou).toContain("SocialPersonRow");
    expect(forYou).not.toContain("SocialAvatar");
    expect(forYou).toContain("CourseCard");
    expect(forYou).toContain("data-social-latest-course");
    expect(forYou).toContain("SOCIAL.forYou.latestCourse");
    expect(forYou).toContain('density="discover"');
    expect(forYou).not.toContain("data-social-for-you-topics");
    expect(forYou).not.toContain("SOCIAL.forYou.topics");
    expect(forYou).not.toContain("SocialHomeTopics");
    expect(topics).toContain("data-social-home-topics");
    expect(topics).toContain("data-social-home-topics-rail");
    expect(topics).toContain("HouseChipRail");
    expect(topics).not.toContain("SOCIAL.forYou.topics");
    expect(topics).not.toMatch(/>Topics</);
    expect(topics).toContain("socialTopicRailChipClass");
    expect(topics).toContain("SOCIAL_CATEGORY_LABELS");
    expect(topics).not.toContain("SOCIAL_FOR_YOU_CARD_CLASS");
    expect(topics).not.toContain("socialInterestTopics");
    expect(topics).not.toContain("if (labels.length === 0) return null");
    expect(home).toContain("<SocialHomeTopics");
    expect(home).toContain("<SocialHomeTopics active={topic}");
    expect(home).not.toContain("SocialHomeTopics topics=");
    expect(topics).not.toContain("flex-wrap");
    expect(topics).not.toContain("truncate");
    expect(topics).toContain("SOCIAL_TOPIC_RAIL_ROWS");
    expect(chrome).toContain("SOCIAL_TOPIC_RAIL_ROWS");
    expect(chrome).toContain("SOCIAL_TOPIC_RAIL_CLASS");
    expect(chrome).toContain("HOUSE_CHIP_RAIL_CLASS");
    expect(chrome).toContain("HOUSE_CHIP_RAIL_STACK_CLASS");
    expect(chrome).toContain("HOUSE_CHIP_RAIL_ROW_CLASS");
    expect(chrome).toContain("HOUSE_CHIP_RAIL_CHIP_CLASS");
    expect(chrome).toContain("SOCIAL_TOPIC_RAIL_CHIP_SELECTED_CLASS");
    expect(chrome).toContain("HOUSE_PILL_SELECTED_CLASS");
    expect(chrome).toContain("socialTopicRailChipClass");
    expect(chrome).not.toContain("rounded-[14px]");
    expect(chrome).toContain("SOCIAL_COMPOSER_CLASS");
    expect(chrome).toContain("SOCIAL_EMPTY_PANEL_CLASS");
    expect(chrome).toContain("SOCIAL_FEED_ROW_CLASS");
    expect(chrome).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col divide-y divide-hairline");
    expect(SOCIAL_FEED_GUTTER_CLASS).toContain("divide-y divide-hairline");
    expect(SOCIAL_FEED_TAIL_RULE_CLASS).toBe(
      "max-md:border-b max-md:border-solid max-md:border-hairline",
    );
    expect(SOCIAL_FEED_TAIL_RULE_CLASS.startsWith("max-md:")).toBe(true);
    expect(SOCIAL_FEED_TAIL_RULE_CLASS).not.toMatch(/(?:^|\s)border-b(?:\s|$)/);
    expect(SOCIAL_FEED_ROW_CLASS).toContain(SOCIAL_FEED_TAIL_RULE_CLASS);
    expect(SOCIAL_POST_ACTIONS_CLASS).toBe("flex flex-row items-center gap-2");
    expect(SOCIAL_POST_ACTION_HIT_CLASS).toBe(
      "inline-flex size-10 shrink-0 items-center justify-center text-ink-2 active:opacity-70",
    );
    expect(SOCIAL_POST_ACTION_HIT_CLASS).not.toContain("scale");
    expect(SOCIAL_POST_ACTION_HEART_NUDGE_CLASS).toBe("translate-y-px");
    expect(SOCIAL_STORIES_FEED_RULE_CLASS).toBe(
      "max-md:border-b max-md:border-solid max-md:border-hairline",
    );
    expect(SOCIAL_STORIES_FEED_RULE_CLASS.startsWith("max-md:")).toBe(true);
    expect(card.slice(card.indexOf("export function SocialPostCard"))).toContain(
      'className="flex items-center gap-3.5"',
    );
    expect(icons).toContain("export const SOCIAL_ICON_SIZE_POST_ACTION = 24");
    const like = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const likeFn = like.slice(like.indexOf("export function SocialLikeButton"));
    const comments = readFileSync("src/components/social/social-comment-thread.tsx", "utf8");
    const alignLock = readFileSync("docs/design-locks/social-home-post-actions-align-lock-v1.md", "utf8");
    expect(likeFn).toContain("SOCIAL_POST_ACTION_HIT_CLASS");
    expect(likeFn).toContain("SOCIAL_POST_ACTION_HEART_NUDGE_CLASS");
    expect(likeFn).toContain("text-accent");
    expect(likeFn).not.toContain("size-10");
    expect(likeFn).not.toContain("flex-col");
    expect(likeFn.indexOf("</button>")).toBeLessThan(likeFn.indexOf("<FormError"));
    expect(likeFn).toContain("absolute top-full left-0");
    expect(alignLock).toContain("text-ink-2");
    expect(alignLock).toContain("#3D4450");
    expect(alignLock).toContain("#1769FF");
    expect(alignLock).not.toMatch(/Idle `#5E646E`/);
    expect(comments).toContain("SOCIAL_POST_ACTION_HIT_CLASS");
    expect(comments).not.toContain("HEART_NUDGE");
    const homeStories = rail.slice(rail.indexOf("function HomeTallStoriesRail"), rail.indexOf("export function SocialStoriesRail"));
    expect(homeStories).toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
    expect(rail.slice(rail.indexOf("export function SocialStoriesRail"))).not.toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("bg-surface-muted");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("py-");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("gap-");
    expect(SOCIAL_FEED_ROW_CLASS).toMatch(/(?:^|\s)bg-surface(?:\s|$)/);
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("bg-surface-muted");
    expect(SOCIAL_FEED_ROW_CLASS.replace(SOCIAL_FEED_TAIL_RULE_CLASS, "")).not.toContain("border");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("rounded");
    expect(SOCIAL_FEED_ROW_CLASS).not.toMatch(/(?:^|\s)(?:m[ytb]|my)-/);
    expect(SOCIAL_FEED_ROW_CLASS).toContain("py-[var(--space-4)]");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("p-[var(--space-4)]");
    expect(SOCIAL_MOBILE_BLEED_CLASS.startsWith("max-md:")).toBe(true);
    expect(SOCIAL_MOBILE_BLEED_CLASS).toContain("-mx-[var(--chrome-gutter)]");
    expect(SOCIAL_MOBILE_BLEED_CLASS).not.toMatch(/(?:^|\s)-mx-/);
    expect(SOCIAL_FEED_ROW_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_POST_MEDIA_CLASS).toContain("px-0");
    expect(SOCIAL_POST_MEDIA_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_COMPOSER_CLASS).not.toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_HOME_TOPICS_CLASS).not.toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("max-md:px-[var(--chrome-gutter)]");
    expect(chrome).toContain('export const SOCIAL_FEED_CHROME_CLASS = "px-[var(--space-4)]"');
    expect(chrome).toContain('export const SOCIAL_HOME_SPINE_CLASS = "gap-[var(--space-2)]"');
    expect(home).toContain("SOCIAL_HOME_SPINE_CLASS");
    expect(rail).toContain("SOCIAL_HOME_STORIES_TRACK_CLASS");
    expect(chrome).toContain('export const SOCIAL_HOME_STORIES_TRACK_CLASS = "flex w-max gap-2 px-0 pt-0 pb-2"');
    expect(rail).not.toContain("pr-4 pb-2");
    expect(card).toContain("SOCIAL_FEED_CHROME_CLASS");
    expect(card).toContain("w-full");
    expect(card).toContain("SOCIAL_POST_MEDIA_CLASS");
    expect(card).not.toContain("md:rounded-[8px]");
    expect(chrome).toContain("SOCIAL_HOME_STORY_CARD_CLASS");
    expect(chrome).toContain("SOCIAL_FOR_YOU_CARD_CLASS");
    expect(forYou).not.toContain("SOCIAL.forYou.native");
    expect(forYou).not.toContain("Social-native");
    expect(forYou).not.toContain("education");
    expect(forYou).not.toContain("Education");
    expect(empty).toContain("SOCIAL_EMPTY_ACTION_CLASS");
    expect(chrome).toContain("SOCIAL_FEED_ROW_CLASS");
    expect(chrome).toContain("p-[3px]");
    expect(icons).toContain("SOCIAL_ICON_SIZE_STORY_CREATE = 28");
    expect(icons).toContain('"users"');
    expect(icons).toContain('"share-network"');
    expect(icons).toContain('"link"');
    expect(icons).toContain('"download-simple"');
    expect(icons).toContain('"text-t"');
    expect(home).not.toContain("WorkspaceSwitcher");
    expect(home).not.toContain("SocialPostCompose");
    expect(home).not.toContain("SocialCreateCompose");
    expect(shell).toContain("data-social-workspace");
    expect(shell).not.toContain("Aggregation|Social");
    expect(chrome).toContain('SOCIAL_FIGMA_HOME = "176:1085"');
    expect(chrome).toContain('SOCIAL_FIGMA_HOME_EMPTY = "176:1346"');
    expect(chrome).toContain('SOCIAL_FIGMA_HOME_MOBILE = "169:1519"');
    expect(chrome).toContain('SOCIAL_FIGMA_HOME_MOBILE_SCROLL = "160:1129"');
    expect(chrome).toContain("169:964");
    expect(chrome).toContain("169:1281");
    expect(chrome).toContain("164:1136");
    expect(chrome).toContain("164:1360");
    expect(chrome).not.toContain("dest:");
    expect(chrome).not.toContain("chats: 200");
    expect(chrome).toContain("gutter: 32");
    expect(chrome).toContain("center: 720");
    expect(chrome).not.toContain("center: 600");
    expect(chrome).not.toContain("center: 892");
    expect(chrome).not.toContain("892");
    expect(chrome).toContain("right: 300");
    expect(chrome).toContain("padR: 16");
    expect(chrome).not.toContain("w-[calc(200px-var(--chrome-gutter))]");
    expect(chrome).not.toContain("md:ml-[200px]");
    expect(chrome).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
    expect(chrome).not.toContain("SOCIAL_RAIL_MAIN_OFFSET_CLASS");
    expect(chrome).toContain(`lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`);
    expect(chrome).not.toContain("lg:max-w-[${");
    expect(shell).toContain("RAIL_WIDTH_CLASS");
    expect(shell).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
    expect(shell).not.toContain("SOCIAL_RAIL_MAIN_OFFSET_CLASS");
    expect(chrome).not.toContain("lg:max-w-[892px]");
    expect(chrome).not.toContain("lg:max-w-[676px]");
    expect(chrome).toContain("SOCIAL_RAIL_PANEL_CLASS");
    expect(chrome).toContain("rounded-[16px]");
    expect(home).not.toContain("SocialRecentChats");
    expect(home).not.toContain("SocialHomeRecentChatsSlot");
    expect(existsSync("src/components/social/social-recent-chats.tsx")).toBe(false);
    expect(chrome).not.toContain("SOCIAL_CHATS_COLUMN_CLASS");
    expect(chrome).not.toContain("SOCIAL_CHATS_PANEL_CLASS");
    expect(home).not.toContain('"/messages"');
    expect(chrome).toContain("size-8");
    expect(chrome).toContain("h-16");
    expect(shell).toContain("SOCIAL_RAIL_PANEL_CLASS");
    expect(shell).toContain("HOUSE_RAIL_FLOAT_CLASS");
    expect(chrome).not.toContain("Inter");
    expect(chrome).not.toContain("#d1e0fa");
    expect(chrome).not.toContain("shadow-");
    expect(chrome).toContain("px-[var(--chrome-gutter)]");
    expect(chrome).toContain("gap-[32px]");
    expect(chrome).not.toContain("gap-[16px]");
    expect(chrome).not.toContain("lg:max-w-[916px]");
    expect(chrome).not.toContain("lg:max-w-[932px]");
    expect(chrome).not.toContain("lg:max-w-[600px]");
    expect(chrome).toContain("SOCIAL_COMPOSER_MEDIA_CLASS");
    expect(chrome).not.toContain("SOCIAL_COMPOSER_ACTION_CLASS");
    expect(home).not.toContain("SocialFirstWin");
    expect(home).not.toContain("checklist={");
    expect(home).not.toContain("data-social-home-setup");
    expect(home).not.toContain("SocialOnboardingChecklist");
    expect(home).not.toContain("socialChecklistItems");
    expect(home.indexOf("<SocialStoriesRail")).toBeLessThan(home.indexOf("<SocialHomeTabs"));
    expect(home).toContain("SocialHomeActivityEmpty");
    expect(home).not.toContain("SOCIAL.home.emptyQuiet");
    expect(home).not.toContain("md:hidden");
    expect(home).toContain("data-social-empty-lenses");
    expect(shell).not.toContain("Destinations");
    expect(shell).not.toContain("SocialRailCreateCta");
    expect(shell).not.toContain("SOCIAL_RAIL.workspace");
    expect(SOCIAL_DESKTOP_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(rail).toContain("data-social-stories-mobile");
    expect(rail.slice(rail.indexOf('data-social-stories-mobile=""'))).toContain("data-social-story-media");
    expect(chrome).toContain("129:215");
    expect(chrome).toContain("129:415");
    expect(chrome).toContain("129:615");
    expect(chrome).toContain("155:194");
    expect(chrome).toContain("155:372");
    expect(chrome).toContain("135:585");
    expect(chrome).toContain("135:1037");
    expect(chrome).toContain("135:1214");
    expect(create).toContain("SocialForYouRail");
    expect(create).toContain("SocialCreateCompose");
    expect(create).not.toContain("Riley Okonkwo");
    expect(create).not.toContain("MicroDramaPilot");
    expect(create).not.toContain("education");
    expect(chrome).toContain("138:163");
    expect(chrome).toContain("138:889");
    expect(chrome).toContain("138:943");
    expect(stories).toContain("permanentRedirect(SOCIAL_ROUTES.home)");
    expect(stories).not.toContain("SocialStoriesEmpty");
    expect(stories).not.toContain("education");
    const storyViewer = readFileSync("src/app/(app)/social/stories/[id]/page.tsx", "utf8");
    expect(storyViewer).toContain("SocialStoryViewer");
    expect(storyViewer).toContain("prevAuthor");
    expect(storyViewer).not.toContain('surface="stories"');
    expect(storyViewer).not.toContain("SocialForYouRail");
    expect(SOCIAL.stories.emptyHint).toBe(
      "When people you follow share stories, they show up here. Start with your own.",
    );
    expect(SOCIAL.stories.createCta).toBe("Create a story");
    expect(SOCIAL.stories.photoCard).toBe("Create a photo story");
    expect(SOCIAL.stories.videoCard).toBe("Create a video story");
    expect(SOCIAL.stories.recordHint).toBe("Open in-app studio");
    expect(SOCIAL.stories.studioTitle).toBe("Story studio");
    expect(chrome).toContain("146:230");
    expect(chrome).toContain("146:1125");
    expect(chrome).toContain("144:1218");
    expect(empty).toContain("SocialStoriesEmpty");
    expect(empty).toContain('name="image"');
    expect(empty).toContain("SOCIAL_STORIES_EMPTY_ACTION_CLASS");
    expect(rail).toContain('surface = "home"');
    expect(rail).toContain("w-[112px]");
    expect(rail).toContain("SOCIAL_STORIES_CARD_CLASS");
    expect(rail).toContain("SOCIAL_STORIES_PLUS_WELL_CLASS");
    expect(rail).not.toContain("SOCIAL_HOME_STORY_NAME_CLASS");
    expect(rail).toContain("aria-label={name}");
    expect(chrome).not.toContain("SOCIAL_HOME_STORY_NAME_CLASS");
    expect(chrome).not.toContain("from-band/72");
    expect(rail).toContain("SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS");
    expect(chrome).toMatch(
      /export const SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS =\s*"t-body-sm font-medium text-ink"/,
    );
    expect(chrome).toMatch(
      /export const SOCIAL_HOME_STORY_CREATE_LABEL_CLASS =\s*`[^`]*\$\{SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS\}[^`]*`/,
    );
    expect(chrome).not.toContain("SOCIAL_HOME_STORY_CREATE_INITIAL_CLASS");
    expect(rail).toContain("function StoryCreatePlus");
    expect(rail).toMatch(/function StoryCreatePlus\(\) \{[\s\S]*?name="plus"[\s\S]*?\}/);
    expect(rail).not.toMatch(/function StoryCreatePlus\(\) \{[\s\S]*?\bactive\b/);
    expect(chrome).toMatch(
      /export const SOCIAL_HOME_STORY_PLUS_CLASS =\s*"[^"]*\bbg-accent\b[^"]*\btext-accent-contrast\b/,
    );
    expect(chrome).toMatch(
      /export const SOCIAL_STORIES_PLUS_WELL_CLASS =\s*"[^"]*\bbg-accent\b[^"]*\btext-accent-contrast\b/,
    );
    expect(chrome).toContain("h-[168px]");
    expect(chrome).toContain("h-[240px]");
    expect(chrome).toContain("h-[256px]");
    expect(chrome).toContain("w-[136px]");
    expect(chrome).toContain("w-[144px]");
    expect(chrome).toContain("h-[224px]");
    expect(chrome).toContain("w-[128px]");
    expect(chrome).toContain("w-[112px]");
    expect(chrome).not.toContain("h-[208px]");
    expect(chrome).not.toContain("w-[120px]");
    expect(chrome).not.toContain("h-[192px]");
    expect(chrome).not.toContain("w-[108px]");
    expect(icons).toContain("SOCIAL_ICON_SIZE_STORY_PLUS = 20");
    expect(icons).toContain("SOCIAL_ICON_SIZE_TAB = 22");
    expect(icons).toContain("SOCIAL_ICON_SIZE_COMPOSER = 22");
    expect(icons).not.toContain("SOCIAL_ICON_SIZE_DOCK");
  });

  it("drops the Social floating tab bar and keeps the Mercury floating dock gone", () => {
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    const dests = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
    const storyViewer = readFileSync("src/app/(app)/social/stories/[id]/page.tsx", "utf8");
    expect(existsSync("src/components/social/social-mobile-dock.tsx")).toBe(false);
    expect(existsSync("src/components/social/social-mobile-tab-bar.tsx")).toBe(false);
    expect(existsSync("src/components/social/social-phone-dests.tsx")).toBe(false);
    expect(shell).not.toContain("SocialMobileDock");
    expect(shell).not.toContain("SocialMobileTabBar");
    expect(shell).not.toContain("SocialPhoneDests");
    expect(shell).toContain("HousePhoneBottomNav");
    expect(shell).toContain("HousePhoneAppShell");
    expect(shell).not.toContain("data-social-mobile-pill");
    expect(shell).not.toContain("data-social-create-fab");
    expect(home).not.toContain("SocialMobileDock");
    expect(create).not.toContain("SocialMobileDock");
    expect(profile).not.toContain("SocialMobileDock");
    expect(stories).not.toContain("SocialMobileDock");
    expect(storyViewer).not.toContain("SocialMobileDock");
    expect(shell).not.toContain("data-social-header-tray");
    const leadSearch = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");
    expect(leadSearch).toContain("data-social-header-search");
    expect(leadSearch).toContain("socialSearchHref");
    expect(leadSearch).not.toContain("SocialSearchSheet");
    expect(leadSearch).not.toContain("prefetch");
    expect(readFileSync("src/lib/nav.ts", "utf8")).not.toContain("SOCIAL_MOBILE_PILL");
    expect(dests).toContain("data-house-phone-bottom-nav");
    expect(dests).toContain("housePhoneDockDestinations");
    expect(dests).toContain("prefetch");
    expect(dests).not.toContain("data-social-tab-bar");
    expect(dests).not.toContain("data-social-create-fab");
    expect(dests).not.toContain("data-social-mobile-pill");
    expect(SOCIAL_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_PHONE_DESTS).toEqual(SOCIAL_NAV);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.href)).toEqual([
      SOCIAL_ROUTES.home,
      SOCIAL_ROUTES.explore,
      SOCIAL_ROUTES.create,
      SOCIAL_ROUTES.dms,
      SOCIAL_ROUTES.profile,
    ]);
    const homeItem = SOCIAL_PHONE_DESTS.find((item) => item.label === "Home");
    expect(homeItem?.href).toBe(SOCIAL_ROUTES.home);
    expect(homeItem?.exact).toBe(true);
  });

  it("keeps Social nav prefetch on and destination pages parallel", () => {
    const sideNav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
    const dests = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
    expect(existsSync("src/app/(app)/social/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/profile/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/profile/edit/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/profile/edit/bio/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/create/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/explore/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/dms/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/stories/loading.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/social/layout.tsx")).toBe(true);
    expect(readFileSync("src/app/(app)/social/loading.tsx", "utf8")).toContain("SocialHomeSkeleton");
    expect(readFileSync("src/app/(app)/social/loading.tsx", "utf8")).not.toContain("DashboardSkeleton");
    expect(sideNav).toContain("prefetch={social}");
    expect(sideNav).toContain("useSocialNavPending");
    expect(dests).toContain("prefetch");
    expect(dests).toContain("prefetchHrefList");
    expect(dests).toContain("useHouseNavPending");
    expect(dests).toContain("housePhoneDestActive");
    expect(chrome).not.toContain("SOCIAL_TAB_BAR_CLASS");
    expect(chrome).not.toContain("SOCIAL_TAB_PILL");
    expect(chrome).not.toContain("SOCIAL_TAB_ITEM_CLASS");
    expect(readFileSync("src/components/social/use-social-nav-pending.ts", "utf8")).toContain(
      "useHouseNavPending as useSocialNavPending",
    );
    expect(readFileSync("src/lib/social-nav-pending.ts", "utf8")).toContain(
      "export const socialNavActivePath = houseNavActivePath",
    );
    expect(home).not.toContain("loadOwnPostFacts");
    expect(home).toContain("requireSocialSession");
    expect(home).toContain("Suspense");
    expect(home).toContain("Promise.all");
    expect(readFileSync("src/app/(app)/social/layout.tsx", "utf8")).toContain(
      "export default function SocialLayout",
    );
    expect(readFileSync("src/app/(app)/social/layout.tsx", "utf8")).not.toContain(
      "export default async function SocialLayout",
    );
    expect(readFileSync("src/app/(app)/social/layout.tsx", "utf8")).toContain("loadSocialSession()");
    expect(profile).toContain("Promise.all");
    expect(create).toContain("Promise.all");
    expect(stories).toContain("permanentRedirect");
    expect(readFileSync("src/app/(app)/social/stories/[id]/page.tsx", "utf8")).toContain("Promise.all");
    expect(explore).toContain("Promise.all");
    expect(messages).toContain("Promise.all");
    const layout = readFileSync("src/app/(app)/layout.tsx", "utf8");
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    expect(layout).toContain("export default function AppLayout");
    expect(layout).not.toContain("export default async function AppLayout");
    expect(layout).toContain("loadAppShellChrome()");
    expect(layout).not.toMatch(/await hasAvatarObject/);
    expect(layout).not.toMatch(/await getActiveOrgTier/);
    expect(shell).toContain("HouseLeadChrome");
    expect(shell).not.toContain("SocialTopBarFromChrome");
    expect(shell).toContain("Do not use() this at the AppShell top");
  });

  it("omits Finish setting up from Home and keeps Suggested people + Latest course on the rail", () => {
    const forYou = readFileSync("src/components/social/social-for-you.tsx", "utf8");
    expect(chrome).toContain('SOCIAL_FIGMA_HOME_EMPTY = "176:1346"');
    expect(chrome).toContain('SOCIAL_FIGMA_HOME_MOBILE = "169:1519"');
    expect(chrome).toContain("SOCIAL_SURFACE_RADIUS_CLASS");
    expect(chrome).toContain("rounded-[var(--radius-lg)]");
    expect(home).not.toContain("SocialFirstWin");
    expect(home).not.toContain("firstWinHint");
    expect(home).not.toContain("data-social-home-setup");
    expect(home).not.toContain("SocialOnboardingChecklist");
    expect(forYou).not.toContain("SocialOnboardingChecklist");
    expect(forYou).toContain("SocialPersonRow");
    expect(forYou).toContain("SocialSuggestedPeople");
    expect(forYou).toContain("layout === \"rail\"");
    expect(create).not.toContain("data-social-for-you-topics");
    expect(profile).not.toContain("data-social-for-you-topics");
    expect(stories).not.toContain("data-social-for-you-topics");
    expect(explore).not.toContain("SocialSuggestedPeople");
    expect(readFileSync("src/app/(app)/social/search/page.tsx", "utf8")).toContain("SocialSuggestedPeople");
    expect(messages).toContain("SOCIAL.dms.startCta");
    expect(SOCIAL_DESKTOP_MEASURE).toEqual({
      gutter: 32,
      center: 720,
      right: 300,
      padR: 16,
    });
    expect(SOCIAL_DESKTOP_MEASURE).not.toHaveProperty("chats");
    expect(SOCIAL_DESKTOP_MEASURE).not.toHaveProperty("dest");
    expect(SOCIAL_CONTENT_PAIR_WIDTH).toBe(
      SOCIAL_DESKTOP_MEASURE.center +
        SOCIAL_DESKTOP_MEASURE.gutter +
        SOCIAL_DESKTOP_MEASURE.right,
    );
    expect(SOCIAL_CONTENT_PAIR_WIDTH).toBe(1052);
    expect(SOCIAL_CONTENT_PAIR_WIDTH).not.toBe(932);
    expect(SOCIAL.home.empty).toBe("No activity yet");
    expect(SOCIAL.home).not.toHaveProperty("emptyQuiet");
    expect(SOCIAL.checklist).not.toHaveProperty("firstWinHint");
    expect(SOCIAL.forYou).not.toHaveProperty("native");
    expect(chrome).not.toContain("119:112");
    expect(chrome).not.toContain("120:174");
  });

  it("keeps Social Figma and Settings Mercury on separate registers", () => {
    const settingsProfile = readFileSync("src/components/settings/profile-settings.tsx", "utf8");
    const settingsAggregation = readFileSync("src/components/settings/organization-settings.tsx", "utf8");
    const accountSheet = readFileSync("src/components/chrome/account-sheet.tsx", "utf8");
    const userMenu = readFileSync("src/components/chrome/user-menu.tsx", "utf8");
    const settingsRail = readFileSync("src/components/chrome/settings-rail.tsx", "utf8");
    const settingsLead = readFileSync("src/components/settings/settings-page-lead.tsx", "utf8");
    const sideNav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
    const publicProfile = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const socialStories = readFileSync("src/app/(app)/social/stories/page.tsx", "utf8");
    // Settings/Profile interiors and the user-menu register stay Mercury —
    // no Social primitives. Account/settings-rail glyphs swapped to Phosphor
    // in Aggregation chrome; structure stays.
    for (const src of [settingsProfile, userMenu]) {
      expect(src).not.toContain("SocialIcon");
      expect(src).not.toContain("@phosphor-icons");
      expect(src).not.toContain("social-chrome");
    }
    for (const src of [accountSheet, settingsRail]) {
      expect(src).not.toContain("SocialIcon");
      expect(src).not.toContain("social-chrome");
    }
    expect(settingsProfile).toContain("AccountProfileForm");
    expect(settingsAggregation).toContain("CompanyProfileForm");
    expect(settingsLead).toContain("PageHeaderBackLink");
    expect(settingsLead).not.toContain("CaretLeft");
    expect(sideNav).toContain("SocialIcon");
    expect(sideNav).toContain("<NavGlyph item={item} active={active} />");
    expect(home).not.toContain("PageHeader");
    expect(create).not.toContain("PageHeader");
    expect(profile).not.toContain("PageHeader");
    expect(profile).not.toContain("AccountProfileForm");
    expect(profile).toContain("SocialOwnProfileFace");
    expect(profile).toContain("SOCIAL.profile.edit");
    expect(profile).toContain("SOCIAL_ROUTES.profileEdit");
    const ownProfile = readFileSync("src/components/social/social-own-profile.tsx", "utf8");
    expect(profile).not.toContain("actions={(view)");
    expect(profile).not.toContain("actions={() =>");
    expect(ownProfile).toContain("actions?: ReactNode");
    expect(ownProfile).not.toContain("(view: SocialProfileIdentityView) => ReactNode");
    expect(ownProfile).not.toContain("() => actions(merged)");
    expect(card).toContain("actions?: ReactNode");
    expect(card).not.toContain("actions?: () => ReactNode");
    expect(card).not.toContain("{actions()}");
    expect(publicProfile).not.toContain("? () => <SocialShareButton");
    expect(publicProfile).not.toContain("? () => (");
    expect(profile).not.toContain('href="#social-profile-edit"');
    expect(profile).not.toContain("<details");
    expect(profile).not.toContain("<summary");
    expect(profile).not.toContain("SocialProfilePhotoForm");
    expect(profile).not.toContain("SocialBioForm");
    expect(card).not.toContain("socialProfilePublicHost");
    expect(card).not.toContain("data-social-profile-url");
    expect(card).not.toContain("socialShareHint");
    expect(card).not.toContain("data-social-share-hint");
    expect(home).not.toContain("SocialShareButton");
    const panels = readFileSync("src/components/social/social-profile-tab-panels.tsx", "utf8");
    expect(profile).toContain("SocialProfileTabPanels");
    expect(publicProfile).toContain("SocialProfileTabPanels");
    expect(panels).toContain("SocialProfileTabs");
    expect(panels).toContain("film-slate");
    expect(panels).toContain("creditsEmpty");
    expect(profile).toContain("SocialOwnProfileFace");
    expect(readFileSync("src/components/social/social-own-profile.tsx", "utf8")).toContain(
      "SocialWelcomeVideo",
    );
    expect(SOCIAL_PROFILE_TABS).toEqual(["activity", "highlights", "credits", "interests"]);
    expect(SOCIAL.profile.creditsTab).toBe("Credits");
    expect(SOCIAL.profile.activityTab).toBe("Activity");
    expect(panels).toContain("SocialActivityHistory");
    expect(SOCIAL.profile.creditsEmpty).toBe("No credits yet");
    expect(icons).toContain('"film-slate"');
    expect(home).not.toContain("creditsEmpty");
    expect(home).not.toContain("SocialWelcomeVideo");
    expect(publicProfile).not.toContain("PageHeader");
    expect(publicProfile).toContain("SocialWelcomeVideo");
    expect(panels).toContain("SocialProfileTabs");
    expect(panels).toContain("film-slate");
    expect(panels).toContain("creditsEmpty");
    expect(existsSync("src/app/(app)/social/u/[handle]/follows/page.tsx")).toBe(true);
    expect(readFileSync("src/app/(app)/social/u/[handle]/follows/page.tsx", "utf8")).toContain(
      "loadProfileFollowList",
    );
    expect(card).toContain("SocialProfileStats");
    expect(card).toContain("data-social-profile-head");
    expect(card).not.toContain("data-social-profile-meta");
    expect(card).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(card).toContain("SOCIAL_PROFILE_INSET_CLASS");
    expect(card).toContain("data-social-profile-actions");
    expect(card).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    expect(card).toContain("socialProfileRolesRailItems");
    expect(card).toContain("HouseChipRail");
    expect(card).toContain("SocialProfilePostsEmpty");
    expect(card).not.toContain("emptySecondary");
    expect(card).not.toContain("emptyHint");
    expect(card).toContain("data-social-profile-handle");
    expect(card).toContain("SOCIAL_PROFILE_NAME_STACK_CLASS");
    expect(card).toContain("SOCIAL_PROFILE_HANDLE_CLASS");
    expect(card.indexOf("data-social-profile-name")).toBeLessThan(
      card.indexOf("data-social-profile-handle"),
    );
    expect(chrome).toContain("SOCIAL_PROFILE_HEAD_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_INSET_CLASS");
    expect(chrome).not.toContain("IG geometry");
    expect(chrome).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_ROLES_ROW_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_ROLES_RAIL_ROWS");
    expect(chrome).toContain("HOUSE_CHIP_RAIL_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_ROLE_PILL_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_POSTS_EMPTY_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_PLAY_CLASS");
    expect(chrome).toContain("aspect-square w-full");
    expect(chrome).toContain("grid-cols-3 gap-px");
    const authorHistory = card.slice(
      card.indexOf("export function SocialAuthorHistory"),
      card.indexOf("export function socialAuthorPostCard"),
    );
    expect(authorHistory).toContain("SocialPostCard");
    expect(authorHistory).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(authorHistory).not.toContain("SOCIAL_PROFILE_GRID_CLASS");
    expect(authorHistory).not.toContain("data-social-profile-grid");
    expect(authorHistory).not.toContain("SOCIAL_PROFILE_TILE_CLASS");
    expect(profile).not.toContain("SocialAuthorHistory");
    expect(publicProfile).not.toContain("SocialAuthorHistory");
    expect(panels).toContain("SocialActivityHistory");
    expect(chrome).not.toContain("h-[140px]");
    expect(chrome).toContain("HOUSE_PILL_ITEM_CLASS");
    expect(chrome).toContain("HOUSE_FILTER_OFF_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_STATS_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_STATS_GRID_CLASS");
    expect(chrome).toContain("gap-x-[var(--space-8)]");
    expect(chrome).toContain("flex-wrap items-start");
    expect(chrome).not.toContain("inline-flex items-start gap-x-[var(--space-4)]");
    expect(chrome).not.toContain("max-w-xs");
    expect(chrome).not.toContain("grid w-full grid-cols-3");
    expect(SOCIAL_PROFILE_HEAD_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_HEAD_CLASS).not.toContain("items-end");
    expect(empty).toContain("SocialProfilePostsEmpty");
    expect(empty).toContain("SOCIAL_PROFILE_POSTS_EMPTY_CLASS");
    expect(profile).not.toContain("SOCIAL.profile.sharePost");
    expect(profile).not.toContain("SOCIAL.profile.completeIdentity");
    expect(profile).not.toContain("emptySecondary");
    expect(profile).not.toContain("postsEmptyOwnHint");
    expect(publicProfile).not.toContain("emptyHint");
    expect(publicProfile).not.toContain("emptySecondary");
    expect(publicProfile).not.toContain("SOCIAL.profile.completeIdentity");
    expect(SOCIAL_PROFILE_CENTER_CLASS).toBe(SOCIAL_HOME_CENTER_CLASS);
    expect(SOCIAL_PROFILE_CENTER_CLASS).toContain(`lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`);
    expect(SOCIAL_CENTER_WIDTH_CLASS).toContain(`lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`);
    expect(SOCIAL_PROFILE_CENTER_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("md:max-w");
    expect(profile).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(publicProfile).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(profile).toContain("SocialDesktopForYouSlot");
    expect(profile).toContain("SocialForYouSkeleton");
    expect(profile).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(profile).toContain("signSocialForYouCourseCovers");
    expect(profile).not.toContain("Education");
    expect(profile).not.toContain("loadSuggestedPeople");
    expect(publicProfile).toContain("SocialDesktopForYouSlot");
    expect(publicProfile).toContain("SocialForYouSkeleton");
    expect(publicProfile).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(publicProfile).not.toContain("loadSuggestedPeople");
    expect(publicProfile).not.toContain("signedEducationCoverUrls");
    expect(forYouSlot).toContain("loadSuggestedPeople");
    expect(home).toContain("SocialForYouRail");
    expect(card).toContain("socialProfileRolesRailItems");
    expect(card).not.toContain("socialProfileRolesLine");
    expect(homeSkeleton).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    const profileCenterSkeleton = homeSkeleton.slice(
      homeSkeleton.indexOf("export function SocialProfileCenterSkeleton"),
      homeSkeleton.indexOf("export function SocialProfileSkeleton"),
    );
    expect(profileCenterSkeleton).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(profileCenterSkeleton).toContain("SOCIAL_PROFILE_NAME_STACK_CLASS");
    expect(profileCenterSkeleton).not.toContain("SOCIAL_PROFILE_NAME_STACK_ON_COVER_CLASS");
    expect(profileCenterSkeleton).not.toContain("SOCIAL_PROFILE_HEAD_ON_COVER_CLASS");
    expect(profileCenterSkeleton).not.toContain("gap-[var(--space-1)]");
    const skeletonOverlap = profileCenterSkeleton.indexOf("SOCIAL_PROFILE_HEAD_OVERLAP_CLASS");
    const skeletonHead = profileCenterSkeleton.indexOf("SOCIAL_PROFILE_HEAD_CLASS");
    const skeletonNameBar = profileCenterSkeleton.indexOf("h-7 w-40");
    const skeletonAvatar = profileCenterSkeleton.indexOf("SOCIAL_AVATAR_PROFILE_CLASS");
    expect(skeletonOverlap).toBeGreaterThan(-1);
    expect(skeletonOverlap).toBeLessThan(skeletonAvatar);
    expect(skeletonHead).toBeGreaterThan(skeletonOverlap);
    expect(skeletonAvatar).toBeLessThan(skeletonNameBar);
    expect(profileCenterSkeleton.slice(skeletonNameBar)).not.toContain(
      "SOCIAL_PROFILE_HEAD_OVERLAP_CLASS",
    );
    expect(profileCenterSkeleton).not.toContain("${SOCIAL_PROFILE_HEAD_CLASS}");
    expect(skeletonNameBar).toBeLessThan(
      profileCenterSkeleton.indexOf("SOCIAL_PROFILE_STATS_CLASS"),
    );
    expect(skeletonHead).toBeLessThan(
      profileCenterSkeleton.indexOf("SOCIAL_PROFILE_ACTIONS_CLASS"),
    );
    expect(
      homeSkeleton.slice(
        homeSkeleton.indexOf("export function SocialProfileSkeleton"),
        homeSkeleton.indexOf("export function SocialFollowsSkeleton"),
      ),
    ).toContain("SocialForYouSkeleton");
    expect(readFileSync("src/components/social/social-profile-stats.tsx", "utf8")).toContain(
      "socialProfileFollowsHref",
    );
    expect(socialStories).not.toContain("PageHeader");
    expect(SOCIAL_FIGMA_PROFILE_EDIT).toEqual(["180:206", "180:1946", "181:2184"]);
    expect(SOCIAL_FIGMA_PROFILE_BIO).toEqual(["180:2004", "180:2026"]);
    expect(SOCIAL_FIGMA_PROFILE_OWN).toEqual(["181:230", "181:2000"]);
    expect(chrome).toContain("180:206");
    expect(chrome).toContain("180:2004");
    expect(chrome).toContain("181:2184");
    expect(profile).not.toContain("Education");
  });

  it("locks Home and Profile to one X-narrow center and puts the handle under the name", () => {
    const publicProfile = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const ownFace = readFileSync("src/components/social/social-own-profile.tsx", "utf8");
    expect(SOCIAL_DESKTOP_MEASURE.center).toBe(720);
    expect(SOCIAL_DESKTOP_MEASURE.right).toBe(300);
    expect(SOCIAL_HOME_CENTER_CLASS).toBe(SOCIAL_PROFILE_CENTER_CLASS);
    // Lock v2: left rail stays the house slot. The row is the
    // 720 + 32 + 300 pair. At lg it end-aligns so For You's trailing
    // edge is the shell gutter (avatar ink). No justify-between
    // stretch. No unprefixed cap (phone stays full-bleed).
    expect(SOCIAL_HOME_LAYOUT_CLASS).toBe(
      "flex w-full items-start gap-[32px] lg:ml-auto lg:max-w-[1052px]",
    );
    expect(SOCIAL_HOME_LAYOUT_CLASS).toBe(
      `flex w-full items-start gap-[${SOCIAL_DESKTOP_MEASURE.gutter}px] lg:ml-auto lg:max-w-[${SOCIAL_CONTENT_PAIR_WIDTH}px]`,
    );
    expect(SOCIAL_HOME_LAYOUT_CLASS).not.toContain("justify-between");
    expect(SOCIAL_HOME_LAYOUT_CLASS).not.toMatch(/(^|\s)mx-auto(\s|$)/);
    expect(SOCIAL_HOME_LAYOUT_CLASS).not.toMatch(/(^|\s)max-w-/);
    expect(SOCIAL_HOME_LAYOUT_CLASS).toContain("lg:ml-auto");
    expect(SOCIAL_HOME_LAYOUT_CLASS).not.toContain("lg:mx-auto");
    expect(SOCIAL_HOME_LAYOUT_CLASS).toContain(`lg:max-w-[${SOCIAL_CONTENT_PAIR_WIDTH}px]`);
    const railSlot = Number(
      readFileSync("src/app/tokens.css", "utf8").match(/--sidebar-width:\s*(\d+)px;/)?.[1],
    );
    const shellEnd = Number(
      readFileSync("src/app/tokens.css", "utf8").match(/--shell-gutter-inline-end:\s*(\d+)px;/)?.[1],
    );
    expect(railSlot).toBe(256);
    expect(shellEnd).toBe(32);
    const leadPad = SOCIAL_DESKTOP_MEASURE.padR;
    const canvas = 1440 - railSlot - leadPad - shellEnd;
    expect(canvas).toBeGreaterThanOrEqual(SOCIAL_CONTENT_PAIR_WIDTH);
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("md:pr-[var(--shell-gutter-inline-end)]");
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("max-md:px-[var(--chrome-gutter)]");
    expect(SOCIAL_HOME_CENTER_CLASS).toBe(
      `flex min-w-0 w-full flex-1 flex-col gap-2 lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`,
    );
    expect(SOCIAL_CENTER_WIDTH_CLASS).toBe(
      `w-full min-w-0 lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`,
    );
    expect(SOCIAL_PROFILE_CENTER_CLASS).toContain("flex-1");
    expect(SOCIAL_PROFILE_CENTER_CLASS).toContain("lg:max-w-[720px]");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("lg:max-w-[600px]");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("md:max-w");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("mx-auto");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("935");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("892");
    expect(chrome).toContain("Profile desktop row matches Home");
    expect(chrome).toContain("SocialForYouRail");
    expect(chrome).not.toContain("No For You rail");
    expect(chrome).not.toContain("Instagram: one centered profile stack");
    expect(chrome).not.toContain("Facebook: side air / gutters");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("mt-[var(--space-3)]");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toContain("flex-1");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toContain("--space-1");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toBe("flex flex-col");
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("t-heading");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("t-title");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toMatch(/md:|max-md:|text-\[/);
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("font-bold");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("font-semibold");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain("text-ink-2");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain("t-body-sm");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).not.toContain("truncate");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).not.toMatch(/\bhidden\b|max-lg:|md:hidden|sm:hidden/);
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toMatch(/\bhidden\b|max-lg:|md:hidden|sm:hidden/);
    expect(SOCIAL_FOR_YOU_RAIL_CLASS).toContain("hidden");
    expect(SOCIAL_FOR_YOU_RAIL_CLASS).toContain("lg:flex");
    expect(SOCIAL_FOR_YOU_RAIL_CLASS).not.toContain("md:flex");
    expect(SOCIAL_HOME_CENTER_CLASS).toContain("w-full");
    expect(SOCIAL_HOME_CENTER_CLASS).toContain("lg:max-w-[720px]");
    expect(SOCIAL_HOME_CENTER_CLASS).not.toContain("lg:max-w-[600px]");
    expect(SOCIAL_HOME_CENTER_CLASS).not.toMatch(/(^|\s)max-w-\[720px\]/);
    expect(chrome).toContain("Phone and desktop share this stack");
    expect(profile).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(profile).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(profile).toContain("SocialDesktopForYouSlot");
    expect(profile).not.toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(publicProfile).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(publicProfile).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(publicProfile).toContain("SocialDesktopForYouSlot");
    expect(publicProfile).not.toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(ownFace).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(home).toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(home).toContain("SocialDesktopForYouSlot");
    expect(home).not.toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(explore).toContain("SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS");
    expect(explore).not.toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(explore).not.toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(explore).not.toContain("SocialDesktopForYouSlot");
    expect(explore).not.toContain("SocialForYouSkeleton");
    expect(explore).not.toContain("SocialForYouRail");
    expect(explore).not.toContain("loadSuggestedPeople");
    expect(explore).not.toContain("signSocialForYouCourseCovers");
    expect(explore).not.toContain("signedEducationCoverUrls");
    expect(messages).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(messages).toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(messages).toContain("SocialDesktopForYouSlot");
    expect(messages).toContain("SocialForYouSkeleton");
    expect(messages).toContain("signSocialForYouCourseCovers");
    expect(messages).not.toContain("SocialForYouRail");
    expect(messages).not.toContain("Education");
    const thread = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    expect(thread).not.toContain("SocialDesktopForYouSlot");
    expect(thread).not.toContain("SocialForYouRail");
    const exploreSkeleton = homeSkeleton.slice(
      homeSkeleton.indexOf("export function SocialExploreSkeleton"),
      homeSkeleton.indexOf("export function SocialDmsRowsSkeleton"),
    );
    expect(exploreSkeleton).toContain("SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS");
    expect(exploreSkeleton).toContain("SocialExploreForYouSkeleton");
    expect(exploreSkeleton).not.toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(exploreSkeleton).not.toContain("SocialForYouSkeleton");
    const dmsSkeleton = homeSkeleton.slice(homeSkeleton.indexOf("export function SocialDmsSkeleton"));
    expect(dmsSkeleton).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(dmsSkeleton).toContain("SocialForYouSkeleton");
  });
});
