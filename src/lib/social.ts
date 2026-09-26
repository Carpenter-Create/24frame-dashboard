import { LIST_PAGE } from "@/lib/list-bounds";
import { PRODUCT_NAME, SOCIAL_WORKSPACE } from "@/lib/product";
import {
  SOCIAL_DM_ADD_BATCH_LIMIT,
  SOCIAL_DM_INBOX_LIMIT,
  SOCIAL_DM_ROOM_LIMIT,
  SOCIAL_DM_THREAD_LIMIT,
} from "@/lib/social-dm-bounds";
import {
  SOCIAL_EXPLORE_PEOPLE_LIMIT,
  SOCIAL_EXPLORE_POSTS_LIMIT,
  SOCIAL_FOLLOWEES_LIMIT,
  SOCIAL_FOLLOWS_LIST_LIMIT,
  SOCIAL_FOLLOWING_WALL_LIMIT,
  SOCIAL_STORIES_RAIL_LIMIT,
} from "@/lib/social-home-bounds";
import type {
  SocialMediaItem,
  SocialMediaKind,
  SocialMediaLane,
  SocialMediaRuleError,
} from "@/lib/social-media";

// Social workspace copy and input rules. Lives in lib/, not JSX.
// Handle: 3–30, A–Z a–z 0–9 . _; no leading/trailing `.`, no `..`.
// Store the typed casing. Uniqueness key is lower(handle) (citext).
// Public share URL is https://24frame.co/@{storedCasing}.
// In-app route is /social/u/{storedCasing} because an @ segment is a
// Next.js App Router parallel-route slot. Middleware rewrites
// /@{handle} onto that route. Lookup is case-insensitive;
// a casing miss redirects to the stored public URL.
// Leftover /social/@{handle} bookmarks 301 to /@{handle}.
// Account faces reuse signedAvatarUrl. Post media uses 24frame-media
// keys on posts.media. Title S3 / S3_BUCKET stay film-only.
// Group DMs reuse Pack 4 conversations.kind=group. Gated community
// groups.min_level spaces stay a different surface.
// Ask 24Frame AI is the shell overlay (`?ai=1`), not /messages.
// DMs are /social/dms only.
// Courses are company/admin publish only. Members browse placeholders.

export const SOCIAL_ROUTES = {
  home: "/social",
  explore: "/social/explore",
  search: "/social/search",
  create: "/social/create",
  createLive: "/social/create/live",
  stories: "/social/stories",
  storiesNew: "/social/stories/new",
  profile: "/social/profile",
  profileEdit: "/social/profile/edit",
  profileBio: "/social/profile/edit/bio",
  members: "/social/members",
  profileByHandle: "/social/u",
  groups: "/social/groups",
  groupsNew: "/social/groups/new",
  leaderboard: "/social/leaderboard",
  dms: "/social/dms",
  post: "/social/p",
} as const;

export function isSocialStoryCreatePath(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return path === SOCIAL_ROUTES.storiesNew;
}

/** Write compose. Not Go live. */
export function isSocialWriteComposePath(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return path === SOCIAL_ROUTES.create;
}

/** First tap leaves write compose for Social home. A warm house hop wins; otherwise push. */
export function leaveSocialWriteCompose(ownHome: () => boolean, pushHome: () => void): void {
  if (ownHome()) return;
  pushHome();
}

/** Open DM thread. Not the inbox, not New message. */
export function isSocialDmThreadPath(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  const prefix = `${SOCIAL_ROUTES.dms}/`;
  if (!path.startsWith(prefix)) return false;
  const id = path.slice(prefix.length);
  return id.length > 0 && !id.includes("/") && id !== "new";
}

/** New message and New group chat. Not the inbox, not an open thread. */
export function isSocialDmComposePath(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return path === `${SOCIAL_ROUTES.dms}/new` || path === `${SOCIAL_ROUTES.dms}/new/group`;
}

/** Thread or compose. The inbox keeps the Social shell and phone dock. */
export function isSocialDmImmersivePath(pathname: string): boolean {
  return isSocialDmThreadPath(pathname) || isSocialDmComposePath(pathname);
}

/** Explore For You. The stage fills the content area. Not search, not a post. */
export function isSocialExplorePath(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return path === SOCIAL_ROUTES.explore;
}

/** Open story viewer. Not the index, not the create stage. */
export function isSocialStoryOpenPath(pathname: string): boolean {
  const path = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  if (path === SOCIAL_ROUTES.stories || path === SOCIAL_ROUTES.storiesNew) return false;
  if (!path.startsWith(`${SOCIAL_ROUTES.stories}/`)) return false;
  const id = path.slice(SOCIAL_ROUTES.stories.length + 1);
  return id.length > 0 && !id.includes("/");
}

/** Header Search people discovery. Not a dock tab. Not Explore. */
export const SOCIAL_SEARCH_INTENT_PARAM = "intent";
export const SOCIAL_SEARCH_PEOPLE_INTENT = "people";
export type SocialSearchIntent = typeof SOCIAL_SEARCH_PEOPLE_INTENT;

export function parseSocialSearchIntent(
  raw: string | string[] | undefined,
): SocialSearchIntent {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === SOCIAL_SEARCH_PEOPLE_INTENT
    ? SOCIAL_SEARCH_PEOPLE_INTENT
    : SOCIAL_SEARCH_PEOPLE_INTENT;
}

export function socialSearchHref(opts?: {
  q?: string;
  intent?: SocialSearchIntent;
}): string {
  const params = new URLSearchParams();
  params.set(SOCIAL_SEARCH_INTENT_PARAM, opts?.intent ?? SOCIAL_SEARCH_PEOPLE_INTENT);
  const q = opts?.q?.trim();
  if (q) params.set("q", q);
  return `${SOCIAL_ROUTES.search}?${params.toString()}`;
}

/** Apex origin for the public profile URL preview and share string. */
export const SOCIAL_PROFILE_ORIGIN = "https://24frame.co";

/** Author history page. Independent of Home following-wall / followee / story caps. */
export const SOCIAL_PROFILE_POSTS_PAGE = LIST_PAGE;

/** Who-liked sheet. Independent of the following wall. */
export const SOCIAL_LIKERS_PAGE = LIST_PAGE;

// Public profile URL (locked): https://24frame.co/@{display}
// Example: https://24frame.co/@AdamC — stored casing, not folded.
// Uniqueness key is handleKey = lower(handle). citext unique already.
// Share copies that canonical https URL.
// In-app route is /social/u/{display} because an @ segment is a
// Next.js parallel-route slot. Middleware rewrites /@{display}
// (and leftover /social/u/@handle bookmarks) to the in-app route.
// Leftover /social/@{display} bookmarks 301 to /@{display}.
// Persist the typed handle in profiles.handle (no @). Display as @handle.
// /social/members/{handle} redirects to the in-app route.

export function stripHandleDecorators(raw: string): string {
  return raw.replace(/@/g, "");
}

/** Typed handle with @ stripped. Preserves display casing. */
export function handleDisplay(raw: string): string {
  return stripHandleDecorators(raw).trim();
}

/** Case-insensitive uniqueness key. */
export function handleKey(raw: string): string {
  return handleDisplay(raw).toLowerCase();
}

export function bareHandle(raw: string): string {
  return handleDisplay(raw);
}

export function displayHandle(handle: string): string {
  const display = handleDisplay(handle);
  return display ? `@${display}` : "";
}

/** Typed field value — bare handle. `@` is chrome, never part of the value. */
export function handleFieldValue(handle: string): string {
  return handleDisplay(handle);
}

export function socialProfileHref(handle: string): string {
  const display = handleDisplay(handle);
  return display ? `${SOCIAL_ROUTES.profileByHandle}/${display}` : SOCIAL_ROUTES.profileByHandle;
}

// Apex /@handle → in-app /social/u/{display}. Bare /legal and friends are
// not rewritten. Reserved names skip the vanity rewrite so they cannot collide
// with marketing/infra paths if the apex host hits this project.
export const SOCIAL_VANITY_RESERVED_HANDLES = [
  "admin",
  "api",
  "www",
  "login",
  "legal",
  "auth",
  "app",
  "portal",
  "social",
] as const;

export function isReservedSocialHandle(raw: string): boolean {
  return (SOCIAL_VANITY_RESERVED_HANDLES as readonly string[]).includes(handleKey(raw));
}

export function matchSocialVanityPath(pathname: string): string | null {
  if (!pathname.startsWith("/@")) return null;
  if (pathname.includes("/", 2)) return null;
  const handle = normalizeHandle(pathname.slice(2));
  if (!handle || isReservedSocialHandle(handle)) return null;
  return handle;
}

export function socialVanityInternalPath(pathname: string): string | null {
  const handle = matchSocialVanityPath(pathname);
  if (!handle) return null;
  return socialProfileHref(handle);
}

// Leftover /social/u/@handle bookmarks. Next.js treats an @ segment as a
// parallel-route slot, so those URLs never reach u/[handle]/page.tsx.
export function matchDecoratedInAppProfilePath(pathname: string): string | null {
  const prefix = `${SOCIAL_ROUTES.profileByHandle}/`;
  if (!pathname.startsWith(prefix)) return null;
  let segment = pathname.slice(prefix.length);
  try {
    segment = decodeURIComponent(segment);
  } catch {
    // keep the raw segment
  }
  if (!segment.startsWith("@") || segment.includes("/")) return null;
  return normalizeHandle(segment);
}

export function socialProfileRewriteTarget(pathname: string): string | null {
  const handle = matchSocialVanityPath(pathname) ?? matchDecoratedInAppProfilePath(pathname);
  return handle ? socialProfileHref(handle) : null;
}

export function socialProfilePublicPath(handle: string): string {
  const display = handleDisplay(handle);
  return `/@${display}`;
}

// Retired public path from the /social/@handle lock. One-way 301 only.
export function matchSocialPublicAtPath(pathname: string): string | null {
  const prefix = `${SOCIAL_ROUTES.home}/`;
  if (!pathname.startsWith(prefix)) return null;
  let segment = pathname.slice(prefix.length);
  try {
    segment = decodeURIComponent(segment);
  } catch {
    // keep the raw segment
  }
  if (!segment.startsWith("@") || segment.includes("/")) return null;
  return normalizeHandle(segment);
}

export function socialProfileLegacyPublicRedirect(pathname: string): string | null {
  const handle = matchSocialPublicAtPath(pathname);
  if (!handle || isReservedSocialHandle(handle)) return null;
  return socialProfilePublicPath(handle);
}

export function socialProfilePublicUrl(handle: string): string {
  return `${SOCIAL_PROFILE_ORIGIN}${socialProfilePublicPath(handle)}`;
}

export function socialProfileCanonicalUrl(handle: string): string {
  return socialProfilePublicUrl(handle);
}

export function parseProfileHandleParam(raw: string): string | null {
  try {
    return normalizeHandle(decodeURIComponent(raw));
  } catch {
    return normalizeHandle(raw);
  }
}

export function socialMemberHref(handle: string): string {
  return socialProfileHref(handle);
}

export const SOCIAL_FOLLOWS_TABS = ["followers", "following"] as const;
export type SocialFollowsTab = (typeof SOCIAL_FOLLOWS_TABS)[number];
export const SOCIAL_FOLLOWS_SEARCH_PARAM = "q";

export function parseSocialFollowsTab(raw: string | string[] | undefined | null): SocialFollowsTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "following" ? "following" : "followers";
}

export function parseSocialFollowsQuery(raw: string | string[] | undefined | null): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? "";
}

export function socialProfileFollowsHref(
  handle: string,
  tab: SocialFollowsTab = "followers",
  query?: string | null,
): string {
  const base = `${socialProfileHref(handle)}/follows`;
  const params = new URLSearchParams();
  if (tab === "following") params.set(SOCIAL_PROFILE_TAB_PARAM, tab);
  const q = query?.trim();
  if (q) params.set(SOCIAL_FOLLOWS_SEARCH_PARAM, q);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function socialProfileFollowsCasingRedirect(
  requested: string | null,
  storedHandle: string,
  tab: SocialFollowsTab,
  query?: string | null,
): string | null {
  if (!storedHandle) return null;
  if (requested && requested === storedHandle) return null;
  if (requested && handleKey(requested) !== handleKey(storedHandle)) return null;
  return socialProfileFollowsHref(storedHandle, tab, query);
}

export function socialFollowsTabLabel(tab: SocialFollowsTab, count?: number): string {
  if (count == null) {
    return tab === "following" ? SOCIAL.profile.followingTab : SOCIAL.profile.followersTab;
  }
  const word = tab === "following" ? SOCIAL.profile.followingStat : SOCIAL.profile.followersStat;
  return `${formatSocialCount(count)} ${word}`;
}

export function socialGroupHref(slug: string): string {
  return `${SOCIAL_ROUTES.groups}/${encodeURIComponent(slug)}`;
}

export function socialPostHref(postId: string): string {
  return `${SOCIAL_ROUTES.post}/${encodeURIComponent(postId)}`;
}

export function socialGroupPostHref(slug: string, postId: string): string {
  return `${socialGroupHref(slug)}/posts/${encodeURIComponent(postId)}`;
}

export function socialDmHref(id: string): string {
  return `${SOCIAL_ROUTES.dms}/${encodeURIComponent(id)}`;
}


export function socialStoryHref(id: string): string {
  return `${SOCIAL_ROUTES.stories}/${encodeURIComponent(id)}`;
}

export function socialProfilePublicHost(handle: string): string {
  const display = handleDisplay(handle);
  return display ? `24frame.co/@${display}` : "24frame.co/@";
}

export function socialProfileCasingRedirect(
  requested: string | null,
  storedHandle: string,
): string | null {
  if (!storedHandle) return null;
  if (requested && requested === storedHandle) return null;
  if (requested && handleKey(requested) !== handleKey(storedHandle)) return null;
  return socialProfilePublicPath(storedHandle);
}

export const SOCIAL_CREATE_KIND_PARAM = "kind";
export const SOCIAL_CREATE_KINDS = ["media", "text"] as const;
export type SocialCreateKind = (typeof SOCIAL_CREATE_KINDS)[number];

export function parseSocialCreateKind(raw: string | string[] | undefined | null): SocialCreateKind | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  if (value === "photo" || value === "video" || value === "media") return "media";
  return value === "text" ? "text" : null;
}

export function socialCreateHref(kind?: SocialCreateKind | null): string {
  return kind ? `${SOCIAL_ROUTES.create}?${SOCIAL_CREATE_KIND_PARAM}=${kind}` : SOCIAL_ROUTES.create;
}

export const SOCIAL_HOME_LANE_PARAM = "lane";
export const SOCIAL_HOME_LANES = ["following", "for-you"] as const;
export type SocialHomeLane = (typeof SOCIAL_HOME_LANES)[number];

export function parseSocialHomeLane(raw: string | string[] | undefined | null): SocialHomeLane {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "for-you" ? "for-you" : "following";
}

export function socialHomeLaneHref(lane: SocialHomeLane): string {
  return lane === "for-you" ? `${SOCIAL_ROUTES.home}?${SOCIAL_HOME_LANE_PARAM}=for-you` : SOCIAL_ROUTES.home;
}

export const SOCIAL_PROFILE_TAB_PARAM = "tab";
export const SOCIAL_PROFILE_TABS = ["activity", "highlights", "credits", "interests"] as const;
export type SocialProfileTab = (typeof SOCIAL_PROFILE_TABS)[number];
export const SOCIAL_PROFILE_DEFAULT_TAB: SocialProfileTab = "activity";
/** Retired top-level Posts tab. Bookmarks hard-redirect to Activity + Posts pill. */
export const SOCIAL_PROFILE_LEGACY_POSTS_TAB = "posts";
/** Opens the existing Edit profile Topics drill. Not a second editor. */
export const SOCIAL_PROFILE_EDIT_FACE_PARAM = "face";

export function socialProfileEditTopicsHref(): string {
  return `${SOCIAL_ROUTES.profileEdit}?${SOCIAL_PROFILE_EDIT_FACE_PARAM}=topics`;
}

export function isLegacySocialProfilePostsTab(
  raw: string | string[] | undefined | null,
): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === SOCIAL_PROFILE_LEGACY_POSTS_TAB;
}

export function parseSocialProfileTab(raw: string | string[] | undefined | null): SocialProfileTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && (SOCIAL_PROFILE_TABS as readonly string[]).includes(value)) {
    return value as SocialProfileTab;
  }
  return SOCIAL_PROFILE_DEFAULT_TAB;
}

/**
 * Interests stays on the shared tab list. Visitors with no Topics omit it.
 * Own profile always keeps the tab so the empty state can point at Edit Topics.
 */
export function socialProfileVisibleTabs(input: {
  owner: boolean;
  topicCount: number;
}): readonly SocialProfileTab[] {
  if (input.owner || input.topicCount > 0) return SOCIAL_PROFILE_TABS;
  return SOCIAL_PROFILE_TABS.filter((tab) => tab !== "interests");
}

/** Unknown tabs and a hidden Interests deep link land on Activity. */
export function resolveSocialProfileTab(
  raw: string | string[] | undefined | null,
  tabs: readonly SocialProfileTab[] = SOCIAL_PROFILE_TABS,
): SocialProfileTab {
  const requested = parseSocialProfileTab(raw);
  if (tabs.includes(requested)) return requested;
  if (tabs.includes(SOCIAL_PROFILE_DEFAULT_TAB)) return SOCIAL_PROFILE_DEFAULT_TAB;
  return tabs[0] ?? SOCIAL_PROFILE_DEFAULT_TAB;
}

export function socialProfileTabHref(base: string, tab: SocialProfileTab): string {
  return tab === SOCIAL_PROFILE_DEFAULT_TAB ? base : `${base}?${SOCIAL_PROFILE_TAB_PARAM}=${tab}`;
}

/** Retired `?tab=posts` lands on Activity with the Posts pill selected. */
export function socialProfileLegacyPostsTabHref(base: string): string {
  return base;
}

export function socialProfileTabLabel(tab: SocialProfileTab): string {
  switch (tab) {
    case "highlights":
      return SOCIAL.profile.highlightsTab;
    case "credits":
      return SOCIAL.profile.creditsTab;
    case "interests":
      return SOCIAL.profile.interestsTab;
    default:
      return SOCIAL.profile.activityTab;
  }
}

export function socialFirstName(displayName: string | null | undefined): string {
  return displayName?.trim().split(/\s+/)[0] ?? "";
}

export function socialComposerPrompt(displayName: string | null | undefined): string {
  const first = socialFirstName(displayName);
  return first ? SOCIAL.home.composerPromptNamed : SOCIAL.home.composerPrompt;
}

export function formatSocialCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) {
    const tenths = Math.round(n / 100) / 10;
    return `${tenths % 1 === 0 ? tenths.toFixed(0) : tenths.toFixed(1)}k`;
  }
  return `${Math.round(n / 1000)}k`;
}

export function socialRelativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const delta = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "Just now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  if (delta < 2 * day) return "Yesterday";
  if (delta < 7 * day) return `${Math.floor(delta / day)}d`;
  return new Date(then).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const SOCIAL = {
  workspace: SOCIAL_WORKSPACE,
  home: {
    title: "Home",
    subtitle: "Activity from people you follow.",
    empty: "No activity yet",
    emptyHint: "Posts, stories, and updates from people you follow show up here.",
    findPeopleHint: "Search for people to follow and start your following wall.",
    recentChats: "Recent chats",
    chatsEmpty: "No messages yet",
    findPeople: "Find people",
    composerPrompt: "Share something",
    composerPromptNamed: "Share something",
    composerPhoto: "Photo",
    composerCamera: "Camera",
    followingTab: "Following",
    forYouTab: "For you",
    compose: "Write a post",
    submit: "Post",
    captionPlaceholder: "Write a caption…",
    dropPhoto: "Drop a still · or choose from library",
    dropVideo: "Drop a clip · or choose from library",
    dropText: "Nothing drafted yet.",
    audience: "Audience",
    audienceFollowing: "Following",
    you: "You",
    attach: "Add photo or video",
    attaching: "Adding",
    removeAttach: "Remove",
    photoKind: "Photo",
    videoKind: "Video",
    emptyPost: "Write a post or attach a photo or video.",
    mediaType: "Use a photo (JPEG, PNG, WebP, GIF) or a video (MP4, QuickTime, WebM).",
    mediaTooLarge: "That file is too large.",
    mediaMissing: "Choose a photo or video first.",
    mediaInvalid: "Those attachments could not be stored.",
    mediaForbidden: "That file cannot be attached.",
    mediaLimit: "Attach up to four photos or videos.",
    uploadFailed: "The file could not be stored.",
    videoPreparing: "That video is still preparing.",
    topic: "Topic",
    truncatedWall: `Showing the latest ${SOCIAL_FOLLOWING_WALL_LIMIT} posts. More exist — this list is not complete.`,
    olderPosts: "Older posts",
    truncatedFollowees: `Showing posts from the first ${SOCIAL_FOLLOWEES_LIMIT} people you follow. More exist — this list is not complete.`,
    truncatedStories: `Showing the latest ${SOCIAL_STORIES_RAIL_LIMIT} stories. More exist — this list is not complete.`,
  },
  explore: {
    title: "Explore",
    subtitle: `Find what is moving in ${PRODUCT_NAME}.`,
    search: "Search",
    searchSocial: "Search Social",
    searchPlaceholder: "People, keywords, hashtags",
    searchBack: "Back",
    recent: "Recent",
    recentEmpty: "No recent searches.",
    clearRecent: "Clear",
    clear: "Clear",
    empty: "No videos to explore yet.",
    noResults: "No matching videos.",
    truncated: `Showing the first ${SOCIAL_EXPLORE_POSTS_LIMIT} videos. More exist — this list is not complete.`,
    people: "People",
    keywords: "Keywords",
    hashtags: "Hashtags",
    play: "Play",
    pause: "Pause",
    forYou: "For you",
  },
  search: {
    title: "Search",
    subtitle: `Find people in ${PRODUCT_NAME}.`,
    people: "People",
    searchPlaceholder: "Search people",
    empty: "No people to suggest yet.",
    noResults: "No matching people.",
    truncated: `Showing the first ${SOCIAL_EXPLORE_PEOPLE_LIMIT} matching people. More exist — this list is not complete.`,
  },
  create: {
    title: "Create",
    subtitle: "Write a post, or add a photo or video.",
    text: "Text",
    write: "Write",
    media: "Media",
    photo: "Photo",
    video: "Video",
    goLive: "Go live",
    next: "Next",
    close: "Close",
    liveTitle: "Go live",
    liveHint: "Record up to 10 minutes, then post as a video.",
    liveStart: "Start",
    liveStop: "Stop",
    livePost: "Post video",
    liveRetake: "Record again",
    liveUseVideo: "Use Video",
    caption: "Caption",
    dropEmpty: "Add a photo or video",
    dropEmptyHint: "Nothing attached yet",
    dropPhoto: "Drop photo here",
    dropPhotoHint: "or choose from library · stills up to 20MB",
    dropVideo: "Drop video here",
    dropVideoHint: "or choose from library",
    originalQuality: "Upload in original quality (up to 4K)",
  },
  stories: {
    create: "Create story",
    title: "Story",
    subtitle: "Add a video. It stays visible for 24 hours.",
    empty: "Add a video.",
    attach: "Add video",
    mediaType: "Use a video (MP4, QuickTime, WebM).",
    mediaMissing: "Choose a video first.",
    // Design 144:1218/144:1444 also showed “up to 15 seconds”. Not an Adam lock.
    // Do not treat that note as a duration cap.
    // Create-story lock v1.5: Upload and Take for photo and video.
    // Camera face is a rectangular full-bleed viewfinder. No face ring.
    // Chrome is close, flash, shutter, gallery, flip, and one STORY label.
    photoCard: "Create a photo story",
    videoCard: "Create a video story",
    photoLibrary: "Upload a photo",
    photoLibraryHint: "Stills from your camera roll",
    photoCapture: "Take a photo",
    photoCaptureHint: "Open the camera",
    photoUnavailable: "The camera is not available in this browser. Upload a photo instead.",
    photoPermission: "Camera access is needed to take a photo.",
    photoMediaType: "Use a photo (JPEG, PNG, WebP, GIF).",
    photoMissing: "Choose a photo first.",
    back: "Back",
    record: "Record a video",
    recordHint: "Open in-app studio",
    upload: "Upload a video",
    uploadHint: "Choose from camera roll",
    studioTitle: "Story studio",
    holdOrTap: "Hold or tap to record",
    uploadFromRoll: "Or upload from camera roll",
    recording: "Recording…",
    rec: "REC",
    review: "Review",
    trimLater: "Trim · later",
    retake: "Retake",
    post: "Post",
    posting: "Posting…",
    posted: "Story posted",
    postedHint: "Back to Stories",
    viewStories: "View Stories",
    flipCamera: "Flip camera",
    flash: "Flash",
    cameraMode: "STORY",
    close: "Close",
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    previous: "Previous story",
    next: "Next story",
    replyTo: (name: string) => `Reply to ${name}…`,
    sendMessage: "Send message",
    saySomething: "Say something…",
    saySomethingExpanded: "Add a comment or @mention friends…",
    activity: "Activity",
    activityEmpty: "No views yet.",
    activityFailed: "Could not load activity.",
    like: "Like",
    unlike: "Unlike",
    send: "Send story",
    search: "Search",
    writeMessage: "Write a message…",
    sendCta: "Send",
    cancel: "Cancel",
    newGroup: "New group",
    sendEmpty: "No people yet.",
    sendFailed: "Could not send this story.",
    sent: "Sent",
    unavailable: "Recording is not available in this browser. Upload a video instead.",
    permission: "Camera access is needed to record.",
    emptyRail: "No stories yet",
    emptyHint: "When people you follow share stories, they show up here. Start with your own.",
    missing: "That story is not visible.",
    expired: "That story is no longer available.",
    submit: "Share",
    you: "You",
    yourStory: "Your story",
    createCta: "Create a story",
    reply: "Reply quietly…",
  },
  checklist: {
    title: "Finish setting up",
    progress: "complete",
    dismiss: "Dismiss",
    photo: "Add a profile photo",
    photoCta: "Add photo",
    bio: "Write a short bio",
    bioCta: "Add bio",
    introduce: "Introduce yourself",
    introduceCta: "Introduce",
    firstPost: "Share your first post",
    firstPostCta: "Create post",
    firstStory: "Create your first story",
    firstStoryCta: "Create story",
    setupAvailable: "setup steps available",
    showSetup: "Show",
  },
  follow: {
    follow: "Follow",
    following: "Following",
    followBack: "Follow back",
    newFollowerTitle: "New follower",
    failed: "Could not update follow.",
  },
  forYou: {
    title: "For you",
    people: "Suggested people",
    // Adam 2026-09-22: Home chip rail has no section label.
    latestCourse: "Latest course",
  },
  profile: {
    title: "Profile",
    subtitle: "Your creator profile in this workspace.",
    emptyTitle: "Create a creator profile",
    emptyBody:
      "A profile is created for this signed-in account. Company aggregation and org invite do not create one for anyone else.",
    handle: "Handle",
    handlePlaceholder: "Set your handle",
    handleRequired: "Handle is required",
    handleInvalid: "Enter a handle of 3–30 letters, numbers, periods, or underscores.",
    username: "Username",
    usernamePlaceholder: "username",
    usernameAdd: "Add",
    displayName: "Display name",
    name: "Name",
    nameAdd: "Add",
    firstName: "First name",
    middleName: "Middle name",
    lastName: "Last name",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    // Sentinel for existing rows only. Never seed on create. Never render as a person name.
    defaultDisplayName: "Member",
    bio: "Bio",
    bioAdd: "Add",
    bioLabel: "BIO",
    bioSubmit: "Save bio",
    bioPrivacy: "Your bio shows on your public profile.",
    bioLimit: "150 characters.",
    done: "Done",
    back: "Back",
    editPicture: "Edit picture",
    chooseFromLibrary: "Choose from library",
    takePhoto: "Take photo",
    removePicture: "Remove current picture",
    editCover: "Edit cover photo",
    addCover: "Add cover photo",
    coverUpload: "Upload photo",
    coverReposition: "Reposition",
    coverRemove: "Remove",
    coverChoose: "Choose cover photo",
    coverDragHint: "Drag or use arrow keys to reposition image",
    coverPublicNote: "Your cover photo is public.",
    coverSaveChanges: "Save changes",
    coverCancel: "Cancel",
    coverCropFailed: "Could not crop cover photo.",
    links: "Links",
    linksAdd: "Add",
    linksMore: "{first} +{n}",
    addLink: "Add link",
    removeLink: "Remove",
    linkPlaceholder: "https://",
    linkInvalid: "Enter a valid http or https URL.",
    linkLimit: "You can add up to 8 links.",
    birthDate: "Date of birth",
    birthDateHint: "Required. You must be 13 or older.",
    submit: "Save handle",
    handleTaken: "That handle is already taken.",
    created: "Profile created.",
    postsEmpty: "No posts yet.",
    postsEmptyHint: "When they share stills, clips, or notes, they will land here.",
    postsEmptyOwnHint: "Add a photo, your name, and a short bio — or share a first still, clip, or note.",
    completeIdentity: "Edit profile",
    sharePost: "Share a post",
    postsTruncated: `Showing the latest ${LIST_PAGE} posts.`,
    uploadPhoto: "Upload photo",
    uploadingPhoto: "Uploading…",
    edit: "Edit profile",
    share: "Share",
    shareProfile: "Share profile",
    shareCopyLink: "Copy link",
    shareDownload: "Download",
    shareClose: "Close",
    shareCopied: "Copied",
    activityTab: "Activity",
    activityPosts: "Posts",
    activityComments: "Comments",
    activityImages: "Images",
    activityVideos: "Videos",
    activityPostsEmpty: "No posts yet.",
    activityPostsEmptyHint: "Posts from this profile appear here as a feed.",
    activityCommentsEmpty: "No comments yet.",
    activityCommentsEmptyHint: "Comments they leave on posts will appear here.",
    activityImagesEmpty: "No images yet.",
    activityImagesEmptyHint: "Image posts from this profile appear here.",
    activityVideosEmpty: "No videos yet.",
    activityVideosEmptyHint: "Video posts from this profile appear here.",
    activityCommented: "Commented",
    highlightsTab: "Highlights",
    highlightsEmpty: "No highlights yet.",
    highlightsEmptyHint: "Pin lasting collections from your Stories.",
    creditsTab: "Credits",
    creditsEmpty: "No credits yet",
    creditsEmptyHint: "Credits are the titles and roles attached to your name.",
    creditsEmptyOwnHint: "Add the titles and roles you want attached to your name.",
    interestsTab: "Interests",
    interestsEmpty: "No interests yet.",
    interestsEmptyOwnHint: "Choose topics on Edit profile.",
    postsStat: "posts",
    followersStat: "followers",
    followingStat: "following",
    followersTab: "Followers",
    followingTab: "Following",
    followsSearch: "Search username or display name",
    followersEmpty: "No followers yet.",
    followersEmptyHint: "When people follow this profile, they will appear here.",
    followingEmpty: "Not following anyone yet.",
    followingEmptyHint: "Accounts they follow will appear here.",
    followsSearchEmpty: "No people match.",
    followsSearchEmptyHint: "Try another username or display name.",
    followsTruncated: `Showing the first ${SOCIAL_FOLLOWS_LIST_LIMIT} people. More exist — this list is not complete.`,
    ownFace: "Your public face. Edit anytime.",
    welcomeVideo: "Welcome video",
    welcomeAdd: "Add welcome video",
    welcomeReplace: "Replace welcome video",
    welcomeRemove: "Remove welcome video",
    roles: "Professions",
    rolesSearch: "Search professions",
    rolesHint: "Choose up to 5.",
    rolesLimit: "You can select up to 5 professions",
    rolesCount: "{n} / {max}",
    rolesAdd: "Add",
    rolesSelected: "{n} selected",
    rolesMore: "{first} +{n}",
    topics: "Topics",
    topicsSearch: "Search topics",
    topicsHint: "Choose up to 8.",
    topicsLimit: "You can select up to 8 topics",
    topicsAdd: "Add",
    topicsMore: "{first} +{n}",
    imdb: "IMDb",
    imdbAdd: "Add",
    imdbPlaceholder: "imdb.com/name/nm… or nm########",
    imdbInvalid: "Enter an IMDb name URL or nm id.",
    imdbHint: "A public link to your IMDb name page.",
    followedBy: "Followed by",
    followedByMore: "+{n} more",
  },
  member: {
    title: "Member",
    missing: "No public profile for that handle.",
    notFound: "Profile not found",
    notFoundCode: "404",
    notFoundHint: "This handle is not on 24Frame Social — or the profile is private.",
    goHome: "Go to Home",
    goExplore: "Go to Explore",
    message: "Message",
    noProfileCta: "Create a creator profile to send a message.",
  },
  groups: {
    title: "Groups",
    subtitle: "Groups you belong to, and public groups you can see.",
    empty: "No groups yet.",
    mine: "Your groups",
    public: "Public groups",
    create: "Create a group",
    members: "members",
    join: "Join",
    joined: "Joined",
    forbidden: "Creating a group needs the create_group capability.",
  },
  groupNew: {
    title: "New group",
    name: "Name",
    slug: "Slug",
    description: "Description",
    submit: "Create group",
  },
  group: {
    wall: "Group",
    empty: "No posts in this group.",
    compose: "Write a post",
    submit: "Post",
    notFound: "That group is not visible.",
    membersOnly: "Join this group to post.",
  },
  post: {
    title: "Post",
    missing: "That post is not visible.",
    like: "Like",
    unlike: "Unlike",
    likes: "likes",
    likesTitle: "Likes",
    likesEmpty: "No likes yet.",
    likesTruncated: `Showing the latest ${LIST_PAGE} likes.`,
    carousel: "Post media",
    carouselCount: (current: number, total: number) => `${current} of ${total}`,
    carouselShow: (current: number, total: number) => `Show media ${current} of ${total}`,
    comments: "comments",
    comment: "Comment",
    commentsTitle: "Comments",
    viewPhoto: "View photo",
    viewVideo: "View video",
    closeMedia: "Close",
    captionMore: "more",
    commentPlaceholder: "Write a comment…",
    commentEmpty: "No comments yet.",
    commentSubmit: "Post",
    commentMissing: "Write a comment.",
    commentTooLong: "That comment is too long.",
    commentFailed: "Could not post that comment.",
    commentDelete: "Remove",
    commentDeleteFailed: "Could not remove that comment.",
    overflow: "Post options",
    edit: "Edit",
    editTitle: "Edit caption",
    editSave: "Save",
    editCancel: "Cancel",
    editFailed: "Could not save that caption.",
    editTooLong: "That caption is too long.",
    delete: "Delete",
    deleteTitle: "Delete this post",
    deleteBody: "It leaves the feed and your profile. Comments and likes leave with it.",
    deleteConfirm: "Delete",
    deleteFailed: "Could not delete that post.",
    notAuthor: "Only the author can change this post.",
    share: "Share",
    shareSearch: "Search",
    writeMessage: "Write a message…",
    send: "Send",
    sent: "Sent",
    shareCopyLink: "Copy link",
    shareCopied: "Copied",
    shareTo: "Share to…",
    shareClose: "Close",
    shareCancel: "Cancel",
    shareEmpty: "No people yet.",
    shareFailed: "Could not send this post.",
    shareFailedPeers: (names: string) => `Could not send to ${names}.`,
    shareUnavailable: "Sharing is not available in this browser.",
  },
  dms: {
    title: "Messages",
    subtitle: `One-to-one and multi-party messages in ${PRODUCT_NAME}.`,
    empty: "No conversations yet.",
    startCta: "Start a conversation",
    newMessage: "New message",
    to: "To:",
    search: "Search",
    groupChat: "Group chat",
    groupChatHint: "Message up to 16 people",
    newGroupChat: "New group chat",
    groupName: "Group name (optional)",
    suggested: "Suggested",
    chat: "Chat",
    searchPeople: "Search people",
    membershipSealed: "People are chosen when the conversation starts.",
    membershipEmpty: "Choose someone to message.",
    thread: "Conversation",
    compose: "Write a message",
    submit: "Send",
    missing: "That conversation is not visible.",
    noProfileCta: "Create a creator profile to use messages.",
    addPeople: "Add people",
    addHandle: "Handle",
    addSubmit: "Add",
    addSelf: "You are already in this conversation.",
    addMissing: "No profile for that handle.",
    addBlocked: "That person cannot be added.",
    addBatch: `Add up to ${SOCIAL_DM_ADD_BATCH_LIMIT} people at a time.`,
    roomFull: `This conversation already has ${SOCIAL_DM_ROOM_LIMIT} people.`,
    truncatedInbox: `Showing the latest ${SOCIAL_DM_INBOX_LIMIT} conversations. More exist — this list is not complete.`,
    truncatedThread: `Showing the latest ${SOCIAL_DM_THREAD_LIMIT} messages. More exist — this list is not complete.`,
    olderPage: "These are older messages. New replies appear on the latest page.",
    olderMessages: "Older messages",
    latestMessages: "Latest messages",
    titleLabel: "Title",
    titleHint: "Optional. Names stay first.",
    titleSave: "Save title",
    titleInvalid: "Enter a shorter title.",
    sentStory: "Sent a story",
    sentYouStory: "Sent you a story",
    youSentStory: (handle: string) => `You sent @${handle}'s story`,
    theySentAuthorStory: (name: string, handle: string) => `${name} sent @${handle}'s story`,
    sentPost: "Sent a post",
    sentYouPost: "Sent you a post",
    youSentPost: (handle: string) => `You sent @${handle}'s post`,
    theySentAuthorPost: (name: string, handle: string) => `${name} sent @${handle}'s post`,
    postUnavailable: "Post unavailable",
    postMeta: "Post",
    threadPlaceholder: "Message…",
    storyUnavailable: "Story unavailable",
    storyMeta: "Story",
  },
  leaderboard: {
    title: "Leaderboard",
    subtitle: `How members rank in ${PRODUCT_NAME}.`,
    private: "The leaderboard is private.",
    top: "Top 10",
    yourRank: "Your rank",
    yourRankEmpty: "Your rank appears after you create a creator profile.",
    computed: "Last computed",
    levels: "Level distribution",
    points: "points",
    members: "members",
    empty: "No ranks yet.",
  },
  courses: {
    title: "Education",
    subtitle: `Education in ${PRODUCT_NAME}.`,
    empty: "Nothing here yet.",
    missing: "That course is not visible.",
    denied: "This course is not available.",
    preview: "Preview",
    playlist: "Playlist",
    modules: "Modules",
    lessonOne: "1 lesson",
    lessons: "lessons",
    progressComplete: "complete",
    error: "Education could not be loaded.",
    detailError: "This course could not be loaded.",
    retry: "Retry",
    playerEmpty: "No lesson is ready to play.",
  },
  cta: {
    needProfile: "Create a creator profile to post, like, comment, or message.",
    profileHrefLabel: "Create a creator profile",
  },
} as const;

export function socialCreateWellCopy(
  kind: SocialCreateKind,
  _attached: boolean,
): { title: string; hint: string } | null {
  // Media never uses the empty attach well — pick happens before this screen.
  void _attached;
  if (kind === "text" || kind === "media") return null;
  return null;
}

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const DISPLAY_NAME_MAX = 80;
export const POST_BODY_MAX = 2000;
export const BIO_MAX = 150;
export const MESSAGE_BODY_MAX = 2000;
export const GROUP_NAME_MAX = 80;
export const GROUP_SLUG_MAX = 40;
export const GROUP_DESCRIPTION_MAX = 400;
export const CONVERSATION_TITLE_MAX = 80;
export const SOCIAL_MIN_AGE_YEARS = 13;

const HANDLE_RE = /^[A-Za-z0-9._]+$/;
const SLUG_RE = /^[a-z0-9-]+$/;

export function normalizeHandle(raw: string): string | null {
  const handle = handleDisplay(raw);
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) return null;
  if (!HANDLE_RE.test(handle)) return null;
  if (handle.startsWith(".") || handle.endsWith(".") || handle.includes("..")) return null;
  return handle;
}

export function socialHandleRequiredError(raw: string): string | null {
  return handleDisplay(raw) ? null : SOCIAL.profile.handleRequired;
}

/** Required / invalid only — never collision (taken). Runs before any async uniqueness check. */
export function socialHandleInputError(raw: string): string | null {
  const required = socialHandleRequiredError(raw);
  if (required) return required;
  if (!normalizeHandle(raw)) return SOCIAL.profile.handleInvalid;
  return null;
}

/** Sync validation wins over a stale taken error when the draft is empty or invalid. */
export function socialHandleDisplayError(raw: string, error: string): string {
  const sync = socialHandleInputError(raw);
  if (sync) return sync;
  return error;
}

/** Bare unique-ish seed from the sign-in email local-part. Not a display name. */
export function suggestedHandleSeed(email: string, userId: string): string {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  const cleaned = local.replace(/[^a-z0-9_]/g, "").slice(0, HANDLE_MAX);
  if (cleaned.length >= HANDLE_MIN && normalizeHandle(cleaned)) return cleaned;
  const fallback = `u${userId.replace(/-/g, "").slice(0, 12)}`;
  return fallback.slice(0, HANDLE_MAX);
}

export function suggestedHandleCollisionSuffix(userId: string, attempt: number): string {
  const compact = userId.replace(/-/g, "");
  const tag = compact.slice(attempt * 2, attempt * 2 + 4) || String(attempt + 2);
  return `_${tag}`;
}

export function normalizeDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > DISPLAY_NAME_MAX) return null;
  return name;
}

// Social edit shows First / Middle / Last. Persist the composed
// display_name so Settings/account and public person rows stay on one
// name SoT. No parallel first/middle/last columns.
export function splitSocialDisplayName(raw: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const name = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { firstName: "", middleName: "", lastName: "" };
  const parts = name.split(" ");
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function composeSocialDisplayName(
  firstName: string,
  lastName: string,
  middleName = "",
): string {
  return [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function socialNameRequiredError(firstName: string, lastName: string): string | null {
  if (!firstName.trim()) return SOCIAL.profile.firstNameRequired;
  if (!lastName.trim()) return SOCIAL.profile.lastNameRequired;
  return null;
}

/** Legacy DB sentinel. Not a human name. SOCIAL.member.title may reuse this word as route chrome. */
export function isSocialPlaceholderDisplayName(raw: string | null | undefined): boolean {
  return (raw ?? "").trim() === SOCIAL.profile.defaultDisplayName;
}

/** Human display name, or null when empty / the Member sentinel. */
export function socialPublicDisplayName(raw: string | null | undefined): string | null {
  const name = normalizeDisplayName(raw ?? "");
  if (!name || isSocialPlaceholderDisplayName(name)) return null;
  return name;
}

export type SocialPersonIdentity = {
  handle: string;
  handleLabel: string;
  name: string | null;
  avatarName: string;
  label: string;
};

// Compact person identity. Handle is primary. Display name is optional and never invented.
// Empty string on create. Existing "Member" rows read as no name.
export function socialPersonIdentity(input: {
  handle: string;
  displayName?: string | null;
}): SocialPersonIdentity {
  const handle = bareHandle(input.handle);
  const handleLabel = displayHandle(handle);
  const publicName = socialPublicDisplayName(input.displayName);
  // Omit the name line only when it is the bare handle (no invented second line).
  const name = publicName && publicName !== handle ? publicName : null;
  return {
    handle,
    handleLabel,
    name,
    avatarName: publicName ?? handle,
    label: publicName ?? handle,
  };
}

export function socialPersonLabel(input: {
  handle: string;
  displayName?: string | null;
}): string {
  return socialPersonIdentity(input).label;
}

export function normalizePostBody(raw: string): string | null {
  const body = raw.trim();
  if (body.length === 0 || body.length > POST_BODY_MAX) return null;
  return body;
}

/** Soft newlines stay in the stored bio and count toward BIO_MAX. */
export function socialBioFieldValue(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function socialBioCount(raw: string): number {
  return socialBioFieldValue(raw).length;
}

export function socialBioCounterLabel(raw: string): string {
  return `${socialBioCount(raw)} / ${BIO_MAX}`;
}

/** Enter/Return inserts a newline. Done is the Sporty Blue check only. */
export function socialBioEnterSubmits(): false {
  return false;
}

export function normalizeBio(raw: string): string | null {
  const bio = socialBioFieldValue(raw).trim();
  if (bio.length === 0) return "";
  if (bio.length > BIO_MAX) return null;
  return bio;
}

export function normalizeMessageBody(raw: string): string | null {
  const body = raw.trim();
  if (body.length === 0 || body.length > MESSAGE_BODY_MAX) return null;
  return body;
}

export function normalizeGroupName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > GROUP_NAME_MAX) return null;
  return name;
}

export function normalizeGroupSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase();
  if (slug.length < HANDLE_MIN || slug.length > GROUP_SLUG_MAX) return null;
  if (!SLUG_RE.test(slug)) return null;
  return slug;
}

export function normalizeGroupDescription(raw: string): string | null {
  const description = raw.trim();
  if (description.length === 0) return null;
  if (description.length > GROUP_DESCRIPTION_MAX) return null;
  return description;
}

export function normalizeConversationTitle(raw: string): { title: string | null } | null {
  const title = raw.trim().replace(/\s+/g, " ");
  if (title.length === 0) return { title: null };
  if (title.length > CONVERSATION_TITLE_MAX) return null;
  return { title };
}

export function conversationRoomLabel(
  title: string | null | undefined,
  participantNames: readonly string[],
): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  const names = participantNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return SOCIAL.dms.thread;
  return names.join(", ");
}

export function inboxPeerIds(row: {
  peer_id: string | null;
  participant_ids?: string[] | null;
}): string[] {
  if (row.participant_ids && row.participant_ids.length > 0) {
    return [...new Set(row.participant_ids.filter(Boolean))];
  }
  return row.peer_id ? [row.peer_id] : [];
}

// get_dm_inbox still excludes the caller (peer.user_id <> me), so a
// note-to-self comes back with peer_id null and participant_ids [].
// The client uses the viewer until a later inbox RPC includes them.
export function dmInboxDisplayPeerIds(
  row: {
    kind: string;
    peer_id: string | null;
    participant_ids?: string[] | null;
  },
  viewerId: string,
): string[] {
  const peers = inboxPeerIds(row);
  if (row.kind === "direct" && peers.length === 0 && viewerId) return [viewerId];
  return peers;
}

export function quietDmAddError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("yourself")) return SOCIAL.dms.addSelf;
  if (text.includes("room is full")) return SOCIAL.dms.roomFull;
  if (text.includes("too many participants")) return SOCIAL.dms.addBatch;
  if (text.includes("blocked")) return SOCIAL.dms.addBlocked;
  if (text.includes("not found") || text.includes("inactive")) return SOCIAL.dms.addMissing;
  if (text.includes("not a participant")) return SOCIAL.dms.missing;
  return SOCIAL.dms.addBlocked;
}

export function isEligibleBirthDate(iso: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const birth = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date(
    Date.UTC(today.getUTCFullYear() - SOCIAL_MIN_AGE_YEARS, today.getUTCMonth(), today.getUTCDate()),
  );
  return birth.getTime() <= cutoff.getTime();
}

export function socialInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].slice(0, 1);
  const last = parts.length > 1 ? parts[parts.length - 1].slice(0, 1) : "";
  return `${first}${last}`.toUpperCase();
}

export function socialCopyHasProductName(text: string): boolean {
  return text.includes(PRODUCT_NAME);
}

export function profileInsertRow(input: {
  userId: string;
  handle: string;
  displayName: string;
  birthDate?: string;
}): {
  id: string;
  handle: string;
  display_name: string;
  birth_date?: string;
  app_role: "member";
  points_total: number;
  level: number;
  status: "active";
  trust_state: "new";
  discoverable: true;
} {
  return {
    id: input.userId,
    handle: input.handle,
    display_name: input.displayName,
    app_role: "member",
    points_total: 0,
    level: 1,
    status: "active",
    trust_state: "new",
    discoverable: true,
    ...(input.birthDate ? { birth_date: input.birthDate } : {}),
  };
}

export function socialMediaRuleMessage(
  error: SocialMediaRuleError,
  lane: SocialMediaLane = "posts",
  kind?: SocialMediaKind,
): string {
  const photo = lane === "stories" && kind === "image";
  if (error === "type") {
    if (photo) return SOCIAL.stories.photoMediaType;
    return lane === "stories" ? SOCIAL.stories.mediaType : SOCIAL.home.mediaType;
  }
  if (error === "tooLarge") return SOCIAL.home.mediaTooLarge;
  if (error === "missing") {
    if (photo) return SOCIAL.stories.photoMissing;
    return lane === "stories" ? SOCIAL.stories.mediaMissing : SOCIAL.home.mediaMissing;
  }
  if (error === "limit") return SOCIAL.home.mediaLimit;
  if (error === "forbidden") return SOCIAL.home.mediaForbidden;
  return SOCIAL.home.mediaInvalid;
}

export function postInsertRow(input: {
  authorId: string;
  body: string | null;
  groupId?: string | null;
  media?: SocialMediaItem[];
  category?: string | null;
}) {
  return {
    author_id: input.authorId,
    body: input.body,
    group_id: input.groupId ?? null,
    media: input.media ?? [],
    category: input.category ?? null,
    status: "active" as const,
    like_count: 0,
    comment_count: 0,
    pinned: false,
  };
}

export function followInsertRow(followerId: string, followeeId: string) {
  return {
    follower_id: followerId,
    followee_id: followeeId,
  };
}

export function likeInsertRow(userId: string, postId: string) {
  return {
    user_id: userId,
    target_type: "post" as const,
    target_id: postId,
  };
}

export function storyLikeInsertRow(userId: string, storyId: string) {
  return {
    user_id: userId,
    target_type: "story_item" as const,
    target_id: storyId,
  };
}

export function messageInsertRow(input: {
  senderId: string;
  conversationId: string;
  body: string;
}) {
  return {
    sender_id: input.senderId,
    conversation_id: input.conversationId,
    body: input.body,
    status: "active" as const,
  };
}

export function groupInsertRow(input: {
  name: string;
  slug: string;
  description: string | null;
  createdBy: string;
}) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    visibility: "public" as const,
    created_by: input.createdBy,
    member_count: 0,
  };
}

export const SOCIAL_BANNED_PRODUCT_NAMES = ["Globee", "24frame", "24-Frame", "24FRAME"] as const;

