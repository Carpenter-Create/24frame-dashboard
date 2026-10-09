import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOUSE_MODULE_CLASS, HOUSE_SECTION_AIR_CLASS } from "@/lib/house-shell";
import { SOCIAL_NAV } from "./nav";
import { SOCIAL_PHONE_DESTS } from "./house-phone-shell";
import {
  SOCIAL_CENTER_WIDTH_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
  SOCIAL_CONTENT_PAIR_WIDTH,
  SOCIAL_DESKTOP_FRAME_PAD_CLASS,
  SOCIAL_DESKTOP_HEADER_INSET_CLASS,
  SOCIAL_DESKTOP_MEASURE,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_LAYOUT_CLASS,
  SOCIAL_FEED_MEASURE,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_POST_ACTION_HEART_NUDGE_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTIONS_GAP_CLASS,
  SOCIAL_POST_ACTIONS_ROW_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_CARD_SURFACE_CLASS,
  SOCIAL_HOME_STORIES_CARD_CLASS,
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
  SOCIAL_POST_ACTION_GLYPH,
  SOCIAL_PROFILE_LINKS_CLASS,
  SOCIAL_STORY_STILL_PROGRESS_MS,
  SOCIAL_STORY_STAGE_IN_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_STORY_STUDIO_REVIEW_CLASS,
  SOCIAL_HANDLE_FIELD_LABEL_CLASS,
} from "./social-chrome";
import { SETTINGS_DIALOG_LABEL_CLASS } from "./settings";
import { SOCIAL, SOCIAL_ROUTES } from "./social";

const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const forYouSlot = readFileSync("src/components/social/social-for-you-slot.tsx", "utf8");
const homeSkeleton = readFileSync("src/components/social/social-skeletons.tsx", "utf8");
const explore = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
const create = readFileSync("src/app/(app)/social/create/page.tsx", "utf8");
const stories = readFileSync("src/app/(app)/social/stories/page.tsx", "utf8");
const messages = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
const postMedia = readFileSync("src/components/social/social-post-media.tsx", "utf8");
const identitySrc = readFileSync("src/components/social/social-profile-identity.tsx", "utf8");
const rail = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
const empty = readFileSync("src/components/social/social-empty.tsx", "utf8");
const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const icons = readFileSync("src/lib/social-icons.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

describe("Social Home miss list v1 P0 lock", () => {
  it("keeps the five Social jobs and parks Groups / Courses / Leaderboard", () => {
    expect(SOCIAL_NAV.map((item) => item.href)).toEqual([
      SOCIAL_ROUTES.home,
      SOCIAL_ROUTES.explore,
      SOCIAL_ROUTES.create,
      SOCIAL_ROUTES.dms,
      SOCIAL_ROUTES.profile,
    ]);
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain(SOCIAL_ROUTES.groups);
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain("/social/courses");
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain("/education");
    expect(SOCIAL_NAV.map((item) => item.href)).not.toContain(SOCIAL_ROUTES.leaderboard);
  });

  it("keeps Home on the following wall with stories, composer, and topics, and no Following | For you slider", () => {
    expect(home).toContain("loadCachedFollowingPosts");
    expect(home).toContain("SocialStoriesRail");
    expect(home).toContain("SocialHomeComposer");
    expect(home).toContain("SocialHomeTopics");
    expect(home).toContain("data-social-home-stack={SOCIAL_HOME_STACK_LOCK}");
    expect(homeSkeleton).toContain("data-social-home-stack={SOCIAL_HOME_STACK_LOCK}");
    // Founder 2026-10-08 ("only the slider"; replaces H's slider → stories
    // → composer → topics → wall): stories → composer → topics → wall, with
    // no Following / For you slider over the Feed (the topics sit over the
    // wall they filter).
    // docs/design-locks/social-feed-register-lock-v1.md
    expect(home).not.toContain("SocialHomeLaneTabs");
    expect(home).not.toContain("data-social-home-lanes");
    expect(existsSync("src/components/social/social-home-lane-tabs.tsx")).toBe(false);
    expect(home.indexOf("<SocialStoriesRail")).toBeLessThan(home.indexOf("<SocialHomeComposer"));
    expect(home.indexOf("<SocialHomeComposer")).toBeLessThan(home.indexOf("<SocialHomeTopics"));
    expect(home.indexOf("<SocialHomeTopics")).toBeLessThan(home.indexOf('data-social-home-wall=""'));
    expect(home).not.toContain("data-social-home-topics-composer-divider");
    expect(home).not.toContain("SOCIAL_HOME_TOPICS_COMPOSER_DIVIDER_CLASS");
    expect(homeSkeleton).not.toContain("data-social-home-topics-composer-divider");
    expect(chrome).not.toContain("SOCIAL_HOME_TOPICS_COMPOSER_DIVIDER_CLASS");
    expect(home.indexOf("<SocialStoriesRail")).toBeLessThan(home.indexOf("<SocialFollowingWallBound"));
    expect(home).not.toContain("SocialHomeTabs");
    expect(home).not.toContain("data-social-home-tabs");
    expect(homeSkeleton).not.toContain("data-social-home-lanes-skeleton");
    expect(homeSkeleton.indexOf("SocialStoriesRailSkeleton")).toBeLessThan(
      homeSkeleton.indexOf("data-social-home-composer-skeleton"),
    );
    expect(homeSkeleton.indexOf("data-social-home-composer-skeleton")).toBeLessThan(
      homeSkeleton.indexOf("data-social-home-topics-skeleton"),
    );
    // The wall skeleton (H · Posts) follows the topics in the Feed skeleton.
    const centerSkeleton = homeSkeleton.slice(homeSkeleton.indexOf("export function SocialHomeCenterSkeleton"));
    expect(centerSkeleton.indexOf("data-social-home-topics-skeleton")).toBeLessThan(
      centerSkeleton.indexOf("<SocialPostWallSkeleton />"),
    );
    expect(home).toContain("<SocialHomeTopics active={topic} lane={lane}");
    expect(home).not.toContain("SocialHomeTabs");
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
    expect(SOCIAL.home).not.toHaveProperty("followingTab");
    expect(SOCIAL.home).not.toHaveProperty("forYouTab");
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

  it("keeps story rings off the feed row and Create story first", () => {
    expect(rail).toContain("data-social-story-create");
    expect(rail.indexOf("data-social-story-create")).toBeLessThan(
      rail.indexOf("cards.map"),
    );
    expect(identitySrc).toContain("ring?:");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    expect(postCard).not.toContain("ring=");
    expect(postCard).not.toContain("hidden md:flex");
    expect(postCard).not.toContain("md:hidden");
    expect(postCard).not.toContain("data-social-post-mobile");
    expect(postCard).not.toContain("text-[10px]");
    expect(postCard).toContain("data-social-post-time");
    expect(postCard).toContain("SocialLikeCount");
    expect(postCard).toContain("SocialCommentTrigger");
    expect(pkg).toContain('"next": "16.3.8"');
    expect(existsSync("src/components/social/social-mobile-dock.tsx")).toBe(false);
    // Feed Reels rail (Adam 2026-10-04) rides the post wall on Home; Explore
    // itself stays a video For You with no Reels section.
    // docs/design-locks/social-feed-reel-rail-lock-v1.md
    expect(home).toContain("socialFeedReelTiles");
    expect(home).toContain("reels={reels}");
    expect(explore).not.toContain("Reels");
  });

  it("locks Home chrome against Figma 176:1085 Circle-primary + compact composer", () => {
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    const composer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
    const forYou = readFileSync("src/components/social/social-for-you.tsx", "utf8");
    const topics = readFileSync("src/components/social/social-home-topics.tsx", "utf8");
    expect(existsSync("src/components/social/social-rail-extras.tsx")).toBe(false);
    expect(rail).toContain("SOCIAL_ICON_SIZE_STORY_PLUS");
    // H · Feed (founder 2026-10-05): the story cards and the accent plus
    // (replaces G's tile and ink badge).
    expect(rail).toContain("SOCIAL_HOME_STORY_CARD_CLASS");
    expect(rail).toContain("SOCIAL_HOME_STORY_PLUS_CLASS");
    expect(rail).toContain("SocialAvatar");
    expect(rail).toContain("createPhotoUrl");
    expect(rail).not.toContain("data-social-stories-tall");
    expect(rail).toContain("aria-label={SOCIAL.home.storiesLabel}");
    expect(rail).toContain("data-social-story-media");
    expect(rail).toContain("bg-accent");
    expect(rail).toContain("bg-hairline");
    expect(rail).toContain("w-[112px]");
    expect(rail).not.toContain("size-10");
    // Cards lock (founder 2026-10-06): every post is one card, the header
    // on top (supersedes H · Posts' media first, then the credit row).
    expect(card).toContain("className={SOCIAL_FEED_CARD_CLASS}");
    expect(card).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(postMedia).toContain("socialPostPhotoAspect");
    const article = card.slice(card.indexOf("<article"), card.indexOf("</article>"));
    expect(article.indexOf("<SocialPostMedia")).toBeGreaterThan(-1);
    expect(article.indexOf("data-social-post-head")).toBeLessThan(article.indexOf("<SocialPostMedia"));
    expect(home).toContain('icon="users"');
    expect(home).toContain("<SocialHomeTopics active={topic} lane={lane}");
    expect(home).not.toContain("SocialHomeTabs");
    expect(composer).toContain("data-social-home-composer");
    expect(composer).toContain("useSocialCompose()");
    expect(composer).not.toContain("<SocialWriteComposeSheet");
    expect(composer).not.toContain('socialCreateHref("text")');
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
    expect(composer).toContain("SOCIAL_COMPOSER_AFFORDANCE_GLYPH_CLASS");
    expect(composer).not.toContain("text-accent");
    expect(composer).not.toContain("data-social-composer-media");
    expect(composer).not.toContain("SOCIAL_MEDIA_ACCEPT");
    expect(composer).not.toContain("data-social-composer-action");
    expect(composer).not.toContain("ACTIONS");
    expect(composer).toContain("SocialIcon");
    // The rounds are the + fan's Media and Live tiles (Adam 2026-10-08,
    // "Match the fan"): glyph and name from the tile list; no camera-app
    // capture input.
    expect(composer).toContain('socialCreateTile("media")');
    expect(composer).toContain('socialCreateTile("live")');
    expect(composer).toContain("name={MEDIA_TILE.icon}");
    expect(composer).toContain("name={LIVE_TILE.icon}");
    expect(composer).toContain("aria-label={MEDIA_TILE.label}");
    expect(composer).toContain("aria-label={LIVE_TILE.label}");
    expect(composer).not.toContain('name="plus"');
    expect(composer).not.toContain("t-label");
    expect(composer).toContain("useSocialCreateMediaPick");
    expect(composer).not.toContain("SOCIAL_CREATE_CAMERA_ACCEPT");
    expect(composer).not.toContain("capture");
    // H · Feed composer (founder 2026-10-05; replaces G's muted 52 bar):
    // one 44 row — the 44 avatar, 12, the pill — in its own card since
    // the cards lock (its classes are pinned in the cards lock test).
    expect(SOCIAL_COMPOSER_CLASS).toContain(SOCIAL_FEED_CARD_SURFACE_CLASS);
    expect(composer).toContain("SOCIAL_COMPOSER_AVATAR_CLASS");
    expect(composer).not.toContain('className="size-10"');
    expect(SOCIAL_COMPOSER_ROW_CLASS).toContain("gap-3");
    expect(SOCIAL_COMPOSER_ROW_CLASS).toBe(
      "group flex min-w-0 flex-1 items-center gap-3 text-left",
    );
    expect(composer).toContain("SOCIAL_COMPOSER_FIELD_CLASS");
    expect(chrome).toContain("SOCIAL_COMPOSER_ROW_CLASS");
    expect(chrome).toContain("SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS");
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
    // G · Feed: D topic words (no chip rail, no accent fill).
    expect(topics).toContain("data-social-home-topics");
    expect(topics).toContain("data-social-home-topics-rail");
    expect(topics).not.toContain("HouseChipRail");
    expect(topics).not.toContain("SOCIAL.forYou.topics");
    expect(topics).not.toMatch(/>Topics</);
    expect(topics).toContain("socialHomeTopicClass");
    expect(topics).toContain("SOCIAL_CATEGORY_LABELS");
    expect(topics).not.toContain("SOCIAL_FOR_YOU_CARD_CLASS");
    expect(topics).not.toContain("socialInterestTopics");
    expect(topics).not.toContain("if (labels.length === 0) return null");
    expect(home).toContain("<SocialHomeTopics");
    expect(home).toContain("<SocialHomeTopics active={topic}");
    expect(home).not.toContain("SocialHomeTopics topics=");
    expect(topics).not.toContain("flex-wrap");
    expect(topics).not.toContain("truncate");
    expect(chrome).not.toContain("SOCIAL_TOPIC_RAIL_ROWS");
    expect(chrome).not.toContain("HOUSE_CHIP_RAIL_CLASS");
    expect(chrome).not.toContain("socialTopicRailChipClass");
    expect(chrome).toContain("HOUSE_PILL_SELECTED_CLASS");
    expect(chrome).not.toContain("rounded-[14px]");
    expect(chrome).toContain("SOCIAL_COMPOSER_CLASS");
    expect(chrome).toContain("SOCIAL_EMPTY_PANEL_CLASS");
    expect(chrome).toContain("SOCIAL_FEED_CARD_CLASS");
    expect(chrome).toContain("SOCIAL_FEED_GUTTER_CLASS");
    // Cards lock: every post kind is the one card (not the house module);
    // the gutter between cards and the card are pinned in the cards lock test.
    expect(SOCIAL_FEED_CARD_CLASS).not.toContain(HOUSE_MODULE_CLASS);
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain(HOUSE_SECTION_AIR_CLASS);
    // The immersive's action row keeps the house 8 gap.
    expect(SOCIAL_POST_ACTIONS_GAP_CLASS).toBe("gap-2");
    expect(SOCIAL_POST_ACTIONS_ROW_CLASS).toBe("flex items-center gap-2");
    expect(SOCIAL_POST_ACTIONS_ROW_CLASS).toContain(SOCIAL_POST_ACTIONS_GAP_CLASS);
    expect(SOCIAL_POST_ACTIONS_ROW_CLASS).not.toContain("gap-3.5");
    expect(SOCIAL_POST_ACTIONS_ROW_CLASS).not.toContain("gap-4");
    expect(SOCIAL_POST_ACTION_HIT_CLASS).toBe(
      "inline-flex size-10 shrink-0 items-center justify-center text-ink-2 active:opacity-70",
    );
    expect(SOCIAL_POST_ACTION_HIT_CLASS).not.toContain("scale");
    expect(SOCIAL_POST_ACTION_GLYPH).toBe(24);
    expect(SOCIAL_POST_ACTION_HEART_NUDGE_CLASS).toBe("translate-y-px");
    // The phone Stories→feed hairline is superseded by the G story tiles.
    expect(chrome).not.toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    expect(postCard).toContain("className={SOCIAL_POST_ACTIONS_CLASS}");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_OPTICAL_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_ROW_CLASS");
    expect(postCard).not.toContain("gap-3.5");
    expect(postCard).not.toContain("gap-4");
    const immersive = readFileSync("src/components/social/social-feed-immersive.tsx", "utf8");
    expect(immersive).toContain("SOCIAL_POST_ACTIONS_ROW_CLASS");
    expect(icons).toContain("export const SOCIAL_ICON_SIZE_POST_ACTION = 24");
    const like = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const likeFn = like.slice(like.indexOf("export function SocialLikeButton"));
    const comments = readFileSync("src/components/social/social-comment-trigger.tsx", "utf8");
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
    const homeStories = rail.slice(rail.indexOf("function HomeStoryCards"), rail.indexOf("export function SocialStoriesRail"));
    expect(homeStories.length).toBeGreaterThan(0);
    expect(homeStories).not.toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
    expect(rail).not.toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
    expect(SOCIAL_MOBILE_BLEED_CLASS.startsWith("max-md:")).toBe(true);
    expect(SOCIAL_MOBILE_BLEED_CLASS).toContain("-mx-[var(--chrome-gutter)]");
    expect(SOCIAL_MOBILE_BLEED_CLASS).not.toMatch(/(?:^|\s)-mx-/);
    // Cards lock: on phone every card meets the viewport (the post, the
    // composer, the stories); its text rows keep their own 16.
    expect(SOCIAL_FEED_CARD_SURFACE_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_COMPOSER_CLASS).toContain(SOCIAL_FEED_CARD_SURFACE_CLASS);
    expect(SOCIAL_HOME_STORIES_CARD_CLASS).toContain(SOCIAL_FEED_CARD_CLASS);
    // The topic row still meets the phone viewport and scrolls.
    expect(SOCIAL_HOME_TOPIC_ROW_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("max-md:px-[var(--chrome-gutter)]");
    // The Option A card's in-card 16 inset is gone: the text rows sit on the frame's 16.
    expect(chrome).not.toContain("export const SOCIAL_FEED_CHROME_CLASS");
    // G · Feed spacing is per block (D), not one spine gap.
    expect(chrome).not.toContain("SOCIAL_HOME_SPINE_CLASS");
    expect(home).not.toContain("SOCIAL_HOME_SPINE_CLASS");
    expect(rail).toContain("SOCIAL_HOME_STORIES_RAIL_CLASS");
    expect(chrome).not.toContain("SOCIAL_HOME_STORIES_TRACK_CLASS");
    expect(rail).not.toContain("pr-4 pb-2");
    expect(card).not.toContain("SOCIAL_FEED_CHROME_CLASS");
    // The words: one style for a caption and a text body (cards lock); no
    // pulls between rows.
    expect(postCard).not.toContain("SOCIAL_FEED_ACTIONS_OPTICAL_PULL_CLASS");
    expect(postCard).not.toContain("-mb-[var(--space-1)]");
    expect(postCard).not.toContain("-mt-[var(--space-1)]");
    expect(card).toContain("className={SOCIAL_POST_HEAD_CLASS}");
    expect(card).toContain("className={SOCIAL_POST_WORDS_CLASS}");
    // Cards lock: the words come before the actions (the actions close the card).
    expect(postCard.indexOf("<SocialPostCaptionPlace")).toBeLessThan(
      postCard.indexOf("data-social-post-actions"),
    );
    expect(immersive).not.toContain("SOCIAL_FEED_ACTIONS_META_CLASS");
    expect(immersive).not.toContain("SOCIAL_FEED_ACTIONS_OPTICAL_PULL_CLASS");
    expect(immersive).not.toContain("-mb-[var(--space-1)]");
    expect(immersive).not.toContain("SOCIAL_FEED_META_ROW_GAP_CLASS");
    expect(immersive).toContain("SOCIAL_FEED_IMMERSIVE_DOCK_CLASS");
    expect(postMedia).toContain("SOCIAL_POST_PHOTO_FRAME_CLASS");
    expect(postMedia).toContain("SOCIAL_POST_MEDIA_CLASS");
    expect(card).not.toContain("md:rounded-[8px]");
    expect(chrome).toContain("SOCIAL_HOME_STORY_CARD_CLASS");
    expect(chrome).toContain("SOCIAL_FOR_YOU_CARD_CLASS");
    expect(forYou).not.toContain("SOCIAL.forYou.native");
    expect(forYou).not.toContain("Social-native");
    expect(forYou).not.toContain("education");
    expect(forYou).not.toContain("Education");
    expect(empty).toContain("SOCIAL_EMPTY_ACTION_CLASS");
    expect(chrome).toContain("SOCIAL_POST_HEAD_CLASS");
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
    // The shared Social row stays 720; the only other centre is the Feed's
    // own measure (Feed placement, founder 2026-10-07: the cards lock §8
    // pins it).
    expect(SOCIAL_DESKTOP_MEASURE.center).toBe(720);
    expect([...chrome.matchAll(/center: (\d+)/g)].map((m) => Number(m[1]))).toEqual([720, SOCIAL_FEED_MEASURE.center]);
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
    expect(shell).toContain("HOUSE_RAIL_COLUMN_CLASS");
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
    expect(home.indexOf("<SocialStoriesRail")).toBeLessThan(home.indexOf("<SocialFollowingWallBound"));
    expect(home).not.toContain("SocialHomeTabs");
    expect(home).not.toContain("data-social-home-tabs");
    expect(home).toContain("SocialHomeActivityEmpty");
    expect(home).not.toContain("SOCIAL.home.emptyQuiet");
    expect(home).not.toContain("md:hidden");
    // G · Feed: the topic row marks the current topic; the empty wall
    // repeats no filled "All" pill.
    expect(home).not.toContain("data-social-empty-lenses");
    expect(home).not.toContain("SOCIAL_PILL_ACTIVE_CLASS");
    expect(shell).not.toContain("Destinations");
    expect(shell).not.toContain("SocialRailCreateCta");
    expect(shell).not.toContain("SOCIAL_RAIL.workspace");
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
    // H · Feed (founder 2026-10-05; replaces G's "the first name sits under
    // the tile, never on it"): the name is on the picture over the band
    // scrim ("Elena R."); the link's name is "{full name} story".
    expect(rail).toContain("SOCIAL_HOME_STORY_NAME_CLASS");
    expect(rail).toContain("socialStoryCardName(name)");
    expect(rail).toContain("aria-label={SOCIAL.stories.cardLabel(name)}");
    expect(chrome).toContain("SOCIAL_HOME_STORY_NAME_CLASS");
    expect(chrome).toContain("from-band/72");
    expect(rail).toContain("SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS");
    expect(chrome).toMatch(
      /export const SOCIAL_STORY_CREATE_LABEL_TYPE_CLASS =\s*"t-body-sm font-medium text-ink"/,
    );
    // "Create story" on the muted plate (15 / 500 ink, 12 from the bottom).
    expect(chrome).toContain("SOCIAL_HOME_STORY_CREATE_LABEL_CLASS");
    expect(chrome).not.toContain("SOCIAL_HOME_STORY_CREATE_INITIAL_CLASS");
    expect(rail).toContain("function StoryCreatePlus");
    expect(rail).toMatch(/function StoryCreatePlus\(\{ className \}[^)]*\) \{[\s\S]*?name="plus"[\s\S]*?\}/);
    expect(rail).not.toMatch(/function StoryCreatePlus\([^)]*\) \{[\s\S]*?\bactive\b[\s\S]*?\n\}/);
    // The Feed create plus is the accent circle again (replaces G's ink
    // badge); its classes are pinned in the cards lock test.
    expect(rail).toContain("SOCIAL_HOME_STORY_PLUS_CLASS");
    expect(chrome).toMatch(
      /export const SOCIAL_STORIES_PLUS_WELL_CLASS =\s*"[^"]*\bbg-accent\b[^"]*\btext-accent-contrast\b/,
    );
    expect(chrome).toContain("h-[168px]");
    // H · Feed: the stories card lock's 112×200 / 108×192 again (replaces
    // G's 56×100 tiles and v1.1's "never 108×192"); pinned in the cards lock test.
    expect(rail).toContain("SOCIAL_HOME_STORY_CARD_CLASS");
    expect(SOCIAL_STORY_STILL_PROGRESS_MS).toBe(5000);
    expect(SOCIAL_STORY_STAGE_IN_CLASS).toBe("social-story-stage-in");
    expect(chrome).not.toContain("h-[100px] w-14");
    expect(chrome).not.toContain("h-[240px]");
    expect(chrome).not.toContain("w-[136px]");
    expect(chrome).toContain("w-[128px]");
    expect(chrome).toContain("w-[112px]");
    expect(chrome).not.toContain("h-[208px]");
    expect(chrome).not.toContain("w-[120px]");
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
    expect(SOCIAL_PHONE_DESTS).toEqual(SOCIAL_NAV);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.href)).toEqual([
      SOCIAL_ROUTES.home,
      SOCIAL_ROUTES.explore,
      SOCIAL_ROUTES.create,
      SOCIAL_ROUTES.dms,
      SOCIAL_ROUTES.profile,
    ]);
    const homeItem = SOCIAL_PHONE_DESTS.find((item) => item.label === "Feed");
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
    expect(messages).toContain("SOCIAL.dms.newMessage");
    expect(messages).not.toContain("SOCIAL.dms.startCta");
    expect(messages).not.toContain("SOCIAL.dms.title");
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
    expect(sideNav).not.toContain("SocialIcon");
    // H register: Create's row swaps in the PlusSquare glyph; every row
    // still renders through NavGlyph.
    expect(sideNav).toContain("<NavGlyph item={glyphItem} active={active} />");
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
    expect(identitySrc).toContain("actions?: ReactNode");
    expect(identitySrc).not.toContain("actions?: () => ReactNode");
    expect(identitySrc).not.toContain("{actions()}");
    expect(publicProfile).not.toContain("? () => <SocialShareButton");
    expect(publicProfile).not.toContain("? () => (");
    expect(profile).not.toContain('href="#social-profile-edit"');
    expect(profile).not.toContain("<details");
    expect(profile).not.toContain("<summary");
    expect(profile).not.toContain("SocialProfilePhotoForm");
    expect(profile).not.toContain("SocialBioForm");
    expect(identitySrc).not.toContain("socialProfilePublicHost");
    expect(identitySrc).not.toContain("data-social-profile-url");
    expect(identitySrc).not.toContain("socialShareHint");
    expect(identitySrc).not.toContain("data-social-share-hint");
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
    expect(panels).toContain("SocialActivityHistory");
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
    expect(identitySrc).toContain("SocialProfileStats");
    expect(identitySrc).toContain("data-social-profile-head");
    expect(identitySrc).not.toContain("data-social-profile-meta");
    expect(identitySrc).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_FACE_CLASS");
    expect(identitySrc).toContain("data-social-profile-actions");
    expect(identitySrc).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    expect(identitySrc).toContain("socialProfileRolesRailItems");
    // Stage lock: roles wrap as chips; no sideways chip rail on the face.
    expect(identitySrc).not.toContain("HouseChipRail");
    expect(identitySrc).toContain("SOCIAL_PROFILE_ROLES_CLASS");
    expect(card).toContain("SocialProfilePostsEmpty");
    expect(card).not.toContain("emptySecondary");
    expect(identitySrc).not.toContain("emptySecondary");
    expect(card).not.toContain("emptyHint");
    expect(identitySrc).not.toContain("emptyHint");
    expect(identitySrc).toContain("data-social-profile-handle");
    expect(identitySrc).toContain("SOCIAL_PROFILE_NAME_STACK_CLASS");
    expect(identitySrc).toContain("SOCIAL_PROFILE_HANDLE_CLASS");
    expect(identitySrc.indexOf("data-social-profile-name")).toBeLessThan(
      identitySrc.indexOf("data-social-profile-handle"),
    );
    expect(chrome).toContain("SOCIAL_PROFILE_HEAD_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_META_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_FACE_CLASS");
    expect(chrome).not.toContain("IG geometry");
    expect(chrome).toContain("SOCIAL_PROFILE_ACTIONS_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_ROLES_CLASS");
    expect(chrome).not.toContain("SOCIAL_PROFILE_ROLES_RAIL_ROWS");
    expect(chrome).not.toContain("HOUSE_CHIP_RAIL_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_ROLE_PILL_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_POSTS_EMPTY_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_PLAY_CLASS");
    expect(chrome).toContain("aspect-square w-full");
    expect(chrome).toContain("grid-cols-3 gap-px");
    const authorHistory = card.slice(
      card.indexOf("export function SocialAuthorHistory"),
      card.indexOf("export function SocialPostCard"),
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
    expect(chrome).toContain("SOCIAL_CHIP_HIT_CLASS");
    expect(chrome).not.toContain("HOUSE_PILL_ITEM_CLASS");
    expect(chrome).toContain("HOUSE_FILTER_OFF_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_STATS_CLASS");
    expect(chrome).toContain("SOCIAL_PROFILE_STATS_GRID_CLASS");
    // Stage lock: desktop counts are one inline row that wraps; the three-cell
    // grid is the phone strip only.
    expect(chrome).toContain("md:flex md:flex-wrap md:items-baseline md:gap-x-5");
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
    expect(identitySrc).toContain("socialProfileRolesRailItems");
    expect(identitySrc).not.toContain("socialProfileRolesLine");
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
    // Stage lock: the skeleton reuses the stage, hero, head and face classes,
    // in the real order: hero (avatar, name bars), then actions before stats.
    const skeletonStage = profileCenterSkeleton.indexOf("SOCIAL_PROFILE_STAGE_CLASS");
    const skeletonHero = profileCenterSkeleton.indexOf("SOCIAL_PROFILE_HERO_CLASS");
    const skeletonHead = profileCenterSkeleton.indexOf("SOCIAL_PROFILE_HEAD_CLASS");
    const skeletonAvatar = profileCenterSkeleton.indexOf("SOCIAL_AVATAR_PROFILE_CLASS");
    const skeletonNameBar = profileCenterSkeleton.indexOf("h-7 w-40");
    expect(skeletonStage).toBeGreaterThan(-1);
    expect(skeletonHero).toBeGreaterThan(skeletonStage);
    expect(skeletonHead).toBeGreaterThan(skeletonHero);
    expect(skeletonAvatar).toBeGreaterThan(skeletonHead);
    expect(skeletonNameBar).toBeGreaterThan(skeletonAvatar);
    expect(profileCenterSkeleton).not.toContain("SOCIAL_PROFILE_HEAD_OVERLAP_CLASS");
    expect(profileCenterSkeleton).not.toContain("${SOCIAL_PROFILE_HEAD_CLASS}");
    expect(skeletonNameBar).toBeLessThan(profileCenterSkeleton.indexOf("SOCIAL_PROFILE_FACE_CLASS"));
    expect(profileCenterSkeleton.indexOf("SOCIAL_PROFILE_ACTIONS_CLASS")).toBeLessThan(
      profileCenterSkeleton.indexOf("SOCIAL_PROFILE_STATS_CLASS"),
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
    expect(SOCIAL_DESKTOP_MEASURE.right).toBe(300);
    expect(SOCIAL_HOME_CENTER_CLASS).toBe(SOCIAL_PROFILE_CENTER_CLASS);
    // Lock v2: left rail stays the house slot. The row is the
    // 720 + 32 + 300 pair. At lg it end-aligns so For You's trailing
    // edge is the shell gutter (avatar ink). No justify-between
    // stretch. No unprefixed cap (phone stays full-bleed).
    expect(SOCIAL_HOME_LAYOUT_CLASS).toBe(
      "flex w-full items-start gap-[32px] lg:ml-auto lg:max-w-[1052px]",
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
    // H register: the side menu slot is 240; the Feed pair still fits at 1440.
    const leadPad = SOCIAL_DESKTOP_MEASURE.padR;
    const canvas = 1440 - railSlot - leadPad - shellEnd;
    expect(canvas).toBeGreaterThanOrEqual(SOCIAL_CONTENT_PAIR_WIDTH);
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("md:pr-[var(--shell-gutter-inline-end)]");
    expect(SOCIAL_DESKTOP_HEADER_INSET_CLASS).toBe("md:pt-[var(--space-2)]");
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain(SOCIAL_DESKTOP_HEADER_INSET_CLASS);
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("pt-4");
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain("pb-4");
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).not.toMatch(/(?:^|\s)py-4(?:\s|$)/);
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toBe(
      "w-full pt-4 pb-4 md:pt-[var(--space-2)] max-md:px-[var(--chrome-gutter)] md:pl-[var(--chrome-gutter)] md:pr-[var(--shell-gutter-inline-end)]",
    );
    // The stories card leads the column with no pull (no slider over the
    // Feed, founder 2026-10-08) — 16 under the phone bar (the frame's 16)
    // and, since the Feed placement (founder 2026-10-07), 16 under the
    // desktop header (the shared 8 inset plus the Feed row's 8; the cards
    // lock §8 pins it).
    expect(SOCIAL_FEED_LAYOUT_CLASS).not.toMatch(/(?:^|\s)pt-|max-md:/);
    for (const page of [
      "src/app/(app)/social/page.tsx",
      "src/app/(app)/social/dms/page.tsx",
      "src/app/(app)/social/profile/page.tsx",
    ]) {
      const src = readFileSync(page, "utf8");
      expect(src).not.toContain("md:pt-");
      expect(src).not.toContain("md:mt-");
    }
    expect(SOCIAL_HOME_CENTER_CLASS).toBe(
      `flex min-w-0 w-full flex-1 flex-col gap-2 lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`,
    );
    expect(SOCIAL_CENTER_WIDTH_CLASS).toBe(
      `w-full min-w-0 lg:max-w-[${SOCIAL_DESKTOP_MEASURE.center}px]`,
    );
    expect(SOCIAL_PROFILE_CENTER_CLASS).toContain("flex-1");
    expect(SOCIAL_PROFILE_CENTER_CLASS).toContain("lg:max-w-[720px]");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("lg:max-w-[600px]");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("mx-auto");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("935");
    expect(SOCIAL_PROFILE_CENTER_CLASS).not.toContain("892");
    expect(SOCIAL_PROFILE_CENTER_CLASS).toBe(
      "flex min-w-0 w-full flex-1 flex-col gap-2 lg:max-w-[720px]",
    );
    expect(chrome).toContain("Profile desktop row matches Home");
    expect(chrome).toContain("SocialForYouRail");
    expect(chrome).not.toContain("No For You rail");
    expect(chrome).not.toContain("Instagram: one centered profile stack");
    expect(chrome).not.toContain("Facebook: side air / gutters");
    // Stage lock: the handle sits under the name on the hero scrim.
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).toContain("w-full");
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toContain("flex-1");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("@container/profile");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toContain("flex-col");
    expect(SOCIAL_PROFILE_IDENTITY_CLASS).toBe("@container/profile flex min-w-0 w-full flex-col");
    // House title on phone, house hero size from the hero step; title weight.
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("t-title");
    expect(SOCIAL_PROFILE_NAME_CLASS).toContain("@min-[40rem]/hero:text-[length:var(--text-hero)]");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("t-heading");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("font-bold");
    expect(SOCIAL_PROFILE_NAME_CLASS).not.toContain("font-semibold");
    expect(SOCIAL_PROFILE_NAME_CLASS).toBe(
      "min-w-0 max-w-full whitespace-normal break-words t-title text-band-ink @min-[40rem]/hero:text-[length:var(--text-hero)] @min-[40rem]/hero:leading-none @min-[40rem]/hero:tracking-display",
    );
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toContain("text-band-ink/84");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).not.toContain("truncate");
    expect(SOCIAL_PROFILE_HANDLE_CLASS).not.toMatch(/\bhidden\b|max-lg:|md:hidden|sm:hidden/);
    expect(SOCIAL_PROFILE_LINKS_CLASS).toBe(
      "-ml-1.5 mt-1 flex min-w-0 flex-wrap items-center gap-0.5 md:mt-2 md:@min-[35rem]/profile:col-start-1 md:@min-[35rem]/profile:row-start-4",
    );
    expect(SOCIAL_PROFILE_HANDLE_CLASS).toBe(
      "min-w-0 max-w-full whitespace-normal break-words text-[length:var(--text-xs)] leading-snug text-band-ink/84 @min-[40rem]/hero:text-[length:var(--text-sm)]",
    );
    expect(SOCIAL_PROFILE_NAME_STACK_CLASS).not.toMatch(/\bhidden\b|max-lg:|md:hidden|sm:hidden/);
    expect(SOCIAL_FOR_YOU_RAIL_CLASS).toContain("hidden");
    expect(SOCIAL_FOR_YOU_RAIL_CLASS).toContain("lg:flex");
    expect(SOCIAL_FOR_YOU_RAIL_CLASS).not.toContain("md:flex");
    expect(SOCIAL_HOME_CENTER_CLASS).toContain("w-full");
    expect(SOCIAL_HOME_CENTER_CLASS).toContain("lg:max-w-[720px]");
    expect(SOCIAL_HOME_CENTER_CLASS).not.toContain("lg:max-w-[600px]");
    expect(SOCIAL_HOME_CENTER_CLASS).not.toMatch(/(^|\s)max-w-\[720px\]/);
    expect(chrome).toContain("social-profile-stage-lock-v1");
    expect(profile).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(profile).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(profile).toContain("SocialDesktopForYouSlot");
    expect(profile).not.toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(publicProfile).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    expect(publicProfile).toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(publicProfile).toContain("SocialDesktopForYouSlot");
    expect(publicProfile).not.toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(ownFace).toContain("SOCIAL_PROFILE_CENTER_CLASS");
    // Feed grid (H, founder 2026-10-05; then the Feed placement, founder
    // 2026-10-07): /social is its own row — the 680 column centred on the
    // viewport, 48, the 296 For you rail when the container fits the pair.
    // The cards lock §8 pins its classes and lays it out at every width.
    // The other Social rows keep the 720/32/300 pair above.
    expect(home).toContain("SOCIAL_FEED_CENTER_CLASS");
    expect(home).toContain("SOCIAL_FEED_LAYOUT_CLASS");
    expect(home).not.toContain("SOCIAL_HOME_CENTER_CLASS");
    expect(home).not.toContain("SOCIAL_HOME_LAYOUT_CLASS");
    expect(SOCIAL_FEED_LAYOUT_CLASS).not.toContain("justify-between");
    expect(SOCIAL_FEED_LAYOUT_CLASS).not.toMatch(/(^|\s)max-w-/);
    expect(home).toContain('layout="aside"');
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

  it("owns one value pin per social-chrome class no lock decides; other tests reference the constant", () => {
    // Profile Stage: the hero card (its 61/55 → 16/7 frame is the cover's), the
    // identity head over the cover, and the action pills.
    expect(SOCIAL_PROFILE_HERO_CLASS).toBe(
      "relative isolate flex min-w-0 w-full flex-col justify-end overflow-clip rounded-[var(--radius-xl)] bg-band aspect-[61/55] min-[30rem]:aspect-[16/7] group-has-[[data-social-cover-drag]]/hero:aspect-[16/7]",
    );
    expect(SOCIAL_PROFILE_HEAD_CLASS).toBe(
      "relative z-10 flex min-w-0 w-full flex-col text-band-ink group-has-[[data-social-cover-drag]]/hero:hidden",
    );
    expect(SOCIAL_PROFILE_ACTIONS_CLASS).toBe(
      "mt-3.5 flex w-full min-w-0 items-start gap-2 max-md:*:flex-1 md:@min-[35rem]/profile:col-start-2 md:@min-[35rem]/profile:row-span-4 md:@min-[35rem]/profile:row-start-1 md:@min-[35rem]/profile:mt-0 md:@min-[35rem]/profile:w-auto md:@min-[35rem]/profile:shrink-0",
    );
    expect(SOCIAL_STORY_STUDIO_REVIEW_CLASS).toBe("absolute inset-0 size-full object-cover");
    // Alias: the Settings dialog label, pinned once in settings.test.ts.
    expect(SOCIAL_HANDLE_FIELD_LABEL_CLASS).toBe(SETTINGS_DIALOG_LABEL_CLASS);
  });
});
