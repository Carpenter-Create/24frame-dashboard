import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ASK_GLOBEE } from "@/lib/ask-globee";
import { PRODUCT_NAME, SOCIAL_WORKSPACE } from "@/lib/product";
import {
  conversationRoomLabel,
  displayHandle,
  dmInboxDisplayPeerIds,
  handleDisplay,
  handleFieldValue,
  handleKey,
  inboxPeerIds,
  isEligibleBirthDate,
  likeInsertRow,
  messageInsertRow,
  normalizeConversationTitle,
  normalizeHandle,
  parseProfileHandleParam,
  parseSocialCreateKind,
  parseSocialHomeLane,
  parseSocialProfileTab,
  resolveSocialProfileTab,
  postInsertRow,
  profileInsertRow,
  quietDmAddError,
  SOCIAL,
  isSocialStoryCreatePath,
  isSocialDmComposePath,
  isSocialDmImmersivePath,
  isSocialDmThreadPath,
  isSocialExplorePath,
  isSocialWriteComposePath,
  leaveSocialWriteCompose,
  isSocialStoryOpenPath,
  SOCIAL_BANNED_PRODUCT_NAMES,
  SOCIAL_PROFILE_ORIGIN,
  SOCIAL_ROUTES,
  socialGroupPostHref,
  socialPostHref,
  socialRelativeTime,
  socialSearchHref,
  socialComposerPrompt,
  socialCreateHref,
  socialCreateWellCopy,
  socialHandleDisplayError,
  socialHandleInputError,
  socialHandleRequiredError,
  socialNameRequiredError,
  socialHomeLaneHref,
  socialInitials,
  composeSocialDisplayName,
  socialPersonIdentity,
  socialPublicDisplayName,
  splitSocialDisplayName,
  socialMediaRuleMessage,
  formatSocialCount,
  socialProfileCanonicalUrl,
  socialProfileCasingRedirect,
  socialProfileFollowsCasingRedirect,
  socialProfileFollowsHref,
  socialFollowsTabLabel,
  parseSocialFollowsQuery,
  parseSocialFollowsTab,
  socialProfileHref,
  socialProfileLegacyPublicRedirect,
  socialProfilePublicHost,
  socialProfilePublicPath,
  socialProfilePublicUrl,
  socialProfileRewriteTarget,
  isLegacySocialProfilePostsTab,
  socialProfileLegacyPostsTabHref,
  socialProfileEditTopicsHref,
  socialProfileTabHref,
  socialProfileTabLabel,
  socialProfileVisibleTabs,
  SOCIAL_PROFILE_DEFAULT_TAB,
  SOCIAL_PROFILE_TABS,
  socialVanityInternalPath,
  stripHandleDecorators,
  suggestedHandleSeed,
  BIO_MAX,
  normalizeBio,
  socialBioCount,
  socialBioCounterLabel,
  socialBioEnterSubmits,
  socialBioFieldValue,
} from "./social";

describe("social copy lock", () => {
  it("uses 24Frame workspace language and never names Globee as the product", () => {
    const blob = JSON.stringify({ SOCIAL, SOCIAL_ROUTES, SOCIAL_WORKSPACE });
    expect(blob).toContain(PRODUCT_NAME);
    expect(blob).toContain(SOCIAL_WORKSPACE);
    expect(SOCIAL.home.subtitle).toBe("Activity from people you follow.");
    expect(SOCIAL.home.empty).toBe("No activity yet");
    expect(SOCIAL.home.emptyHint).toBe(
      "Posts, stories, and updates from people you follow show up here.",
    );
    expect(SOCIAL.home.composerPrompt).toBe("Share something");
    expect(SOCIAL.home.composerPromptNamed).toBe("Share something");
    expect(SOCIAL.home.composerPhoto).toBe("Photo");
    expect(SOCIAL.home.composerCamera).toBe("Camera");
    expect(SOCIAL.forYou).not.toHaveProperty("topics");
    expect(SOCIAL.forYou.latestCourse).toBe("Latest course");
    expect(SOCIAL.profile.firstName).toBe("First name");
    expect(SOCIAL.profile.middleName).toBe("Middle name");
    expect(SOCIAL.profile.lastName).toBe("Last name");
    expect(SOCIAL.profile.roles).toBe("Professions");
    expect(SOCIAL.profile.rolesSearch).toBe("Search professions");
    expect(SOCIAL.profile.rolesHint).toBe("Choose up to 5.");
    expect(SOCIAL.profile.rolesCount).toBe("{n} / {max}");
    expect(SOCIAL.profile.rolesAdd).toBe("Add");
    expect(SOCIAL.profile.rolesSelected).toBe("{n} selected");
    expect(SOCIAL.profile.rolesMore).toBe("{first} +{n}");
    expect(SOCIAL.profile.topics).toBe("Topics");
    expect(SOCIAL.profile.topicsSearch).toBe("Search topics");
    expect(SOCIAL.profile.topicsHint).toBe("Choose up to 8.");
    expect(SOCIAL.profile.topicsLimit).toBe("You can select up to 8 topics");
    expect(SOCIAL.profile.topicsAdd).toBe("Add");
    expect(SOCIAL.profile.topicsMore).toBe("{first} +{n}");
    expect(SOCIAL.profile.rolesLimit).toBe("You can select up to 5 professions");
    expect(SOCIAL.profile.imdb).toBe("IMDb");
    expect(SOCIAL.profile.imdbAdd).toBe("Add");
    expect(SOCIAL.profile.linksAdd).toBe("Add");
    expect(SOCIAL.profile.linksMore).toBe("{first} +{n}");
    expect(SOCIAL.profile.bioAdd).toBe("Add");
    expect(SOCIAL.profile.imdbInvalid).toBe("Enter an IMDb name URL or nm id.");
    expect(SOCIAL.dms.startCta).toBe("Start a conversation");
    expect(splitSocialDisplayName("Ada Lovelace")).toEqual({
      firstName: "Ada",
      middleName: "",
      lastName: "Lovelace",
    });
    expect(splitSocialDisplayName("Ada")).toEqual({ firstName: "Ada", middleName: "", lastName: "" });
    expect(splitSocialDisplayName("Adam James Carpenter")).toEqual({
      firstName: "Adam",
      middleName: "James",
      lastName: "Carpenter",
    });
    expect(composeSocialDisplayName("Ada", "Lovelace")).toBe("Ada Lovelace");
    expect(composeSocialDisplayName("Adam", "Carpenter", "James")).toBe("Adam James Carpenter");
    expect(composeSocialDisplayName("Ada", "")).toBe("Ada");
    expect(socialNameRequiredError("", "Carpenter")).toBe(SOCIAL.profile.firstNameRequired);
    expect(socialNameRequiredError("Adam", "")).toBe(SOCIAL.profile.lastNameRequired);
    expect(socialNameRequiredError("Adam", "Carpenter")).toBeNull();
    expect(blob).not.toContain("What's on your mind");
    expect(blob).not.toContain("Topics for you");
    expect(SOCIAL.home.recentChats).toBe("Recent chats");
    expect(SOCIAL.home.chatsEmpty).toBe("No messages yet");
    expect(blob).not.toContain("Social-native");
    expect(blob).not.toContain("One clear next step");
    expect(SOCIAL.explore.subtitle).toContain(PRODUCT_NAME);
    expect(SOCIAL.explore.recent).toBe("Recent");
    expect(SOCIAL.explore.recentEmpty).toBe("No recent searches.");
    expect(SOCIAL.explore.searchBack).toBe("Back");
    expect(JSON.stringify(SOCIAL.explore)).not.toContain("Meta AI");
    expect(JSON.stringify(SOCIAL.explore)).not.toContain("Search with Meta AI");
    expect(SOCIAL_ROUTES.explore).toBe("/social/explore");
    expect(SOCIAL_ROUTES.search).toBe("/social/search");
    expect(socialSearchHref({ intent: "people" })).toBe("/social/search?intent=people");
    expect(SOCIAL.search.searchPlaceholder).toBe("Search people");
    expect(SOCIAL.explore.searchPlaceholder).toBe("People, keywords, hashtags");
    expect(SOCIAL.home.findPeople).toBe("Find people");
    expect(SOCIAL.home.emptyHint).not.toMatch(/Explore/i);
    expect(SOCIAL_ROUTES.create).toBe("/social/create");
      expect(SOCIAL_ROUTES.stories).toBe("/social/stories");
      expect(SOCIAL_ROUTES.storiesNew).toBe("/social/stories/new");
    expect(isSocialStoryCreatePath(SOCIAL_ROUTES.storiesNew)).toBe(true);
    expect(isSocialStoryCreatePath(`${SOCIAL_ROUTES.storiesNew}/`)).toBe(true);
    expect(isSocialStoryCreatePath(SOCIAL_ROUTES.home)).toBe(false);
    expect(isSocialStoryCreatePath(SOCIAL_ROUTES.stories)).toBe(false);
    expect(isSocialExplorePath(SOCIAL_ROUTES.explore)).toBe(true);
    expect(isSocialExplorePath(`${SOCIAL_ROUTES.explore}/`)).toBe(true);
    expect(isSocialExplorePath(SOCIAL_ROUTES.home)).toBe(false);
    expect(isSocialExplorePath(SOCIAL_ROUTES.search)).toBe(false);
    expect(isSocialStoryOpenPath("/social/stories/story-1")).toBe(true);
    expect(isSocialStoryOpenPath("/social/stories/story-1/")).toBe(true);
    expect(isSocialStoryOpenPath(SOCIAL_ROUTES.stories)).toBe(false);
    expect(isSocialStoryOpenPath(SOCIAL_ROUTES.storiesNew)).toBe(false);
    expect(isSocialStoryOpenPath(SOCIAL_ROUTES.home)).toBe(false);
    expect(isSocialDmThreadPath("/social/dms/thread-1")).toBe(true);
    expect(isSocialDmThreadPath("/social/dms/thread-1/")).toBe(true);
    expect(isSocialDmThreadPath(SOCIAL_ROUTES.dms)).toBe(false);
    expect(isSocialDmThreadPath(`${SOCIAL_ROUTES.dms}/new`)).toBe(false);
    expect(isSocialDmThreadPath(`${SOCIAL_ROUTES.dms}/new/group`)).toBe(false);
    expect(isSocialDmThreadPath(SOCIAL_ROUTES.home)).toBe(false);
    expect(isSocialDmComposePath(`${SOCIAL_ROUTES.dms}/new`)).toBe(true);
    expect(isSocialDmComposePath(`${SOCIAL_ROUTES.dms}/new/`)).toBe(true);
    expect(isSocialDmComposePath(`${SOCIAL_ROUTES.dms}/new/group`)).toBe(true);
    expect(isSocialDmComposePath(`${SOCIAL_ROUTES.dms}/new/group/`)).toBe(true);
    expect(isSocialDmComposePath(SOCIAL_ROUTES.dms)).toBe(false);
    expect(isSocialDmComposePath("/social/dms/thread-1")).toBe(false);
    expect(isSocialDmImmersivePath("/social/dms/thread-1")).toBe(true);
    expect(isSocialDmImmersivePath(`${SOCIAL_ROUTES.dms}/new`)).toBe(true);
    expect(isSocialDmImmersivePath(`${SOCIAL_ROUTES.dms}/new/group`)).toBe(true);
    expect(isSocialDmImmersivePath(SOCIAL_ROUTES.dms)).toBe(false);
    expect(isSocialWriteComposePath(SOCIAL_ROUTES.create)).toBe(true);
    expect(isSocialWriteComposePath(`${SOCIAL_ROUTES.create}/`)).toBe(true);
    expect(isSocialWriteComposePath(SOCIAL_ROUTES.createLive)).toBe(false);
    expect(isSocialWriteComposePath(SOCIAL_ROUTES.home)).toBe(false);
    let pushes = 0;
    leaveSocialWriteCompose(
      () => true,
      () => {
        pushes += 1;
      },
    );
    expect(pushes).toBe(0);
    leaveSocialWriteCompose(
      () => false,
      () => {
        pushes += 1;
      },
    );
    expect(pushes).toBe(1);
    expect(SOCIAL.stories.replyTo("Ada")).toBe("Reply to Ada…");
    expect(SOCIAL.stories.emptyHint).toContain("share stories");
    expect(SOCIAL.stories.createCta).toBe("Create a story");
    expect(SOCIAL.stories.reply).toBe("Reply quietly…");
    expect(SOCIAL.stories.sendMessage).toBe("Send message");
    expect(SOCIAL.stories.saySomething).toBe("Say something…");
    expect(SOCIAL.stories.saySomethingExpanded).toBe("Add a comment or @mention friends…");
    expect(SOCIAL.stories.activity).toBe("Activity");
    expect(SOCIAL.stories.subtitle).toBe("Add a video. It stays visible for 24 hours.");
    expect(SOCIAL.stories.empty).toBe("Add a video.");
    expect(SOCIAL.stories.attach).toBe("Add video");
    expect(SOCIAL.stories.mediaType).toBe("Use a video (MP4, QuickTime, WebM).");
    expect(SOCIAL.stories.mediaMissing).toBe("Choose a video first.");
    expect(SOCIAL.stories.photoCard).toBe("Create a photo story");
    expect(SOCIAL.stories.videoCard).toBe("Create a video story");
    expect(SOCIAL.stories.photoLibrary).toBe("Upload a photo");
    expect(SOCIAL.stories.photoCapture).toBe("Take a photo");
    expect(SOCIAL.stories.photoUnavailable).toBe(
      "The camera is not available in this browser. Upload a photo instead.",
    );
    expect(SOCIAL.stories.photoPermission).toBe("Camera access is needed to take a photo.");
    expect(SOCIAL.stories.photoUnavailable).not.toMatch(/record|video/i);
    expect(SOCIAL.stories.photoPermission).not.toMatch(/record|video/i);
    expect(SOCIAL.stories.unavailable).toBe(
      "Recording is not available in this browser. Upload a video instead.",
    );
    expect(SOCIAL.stories.permission).toBe("Camera access is needed to record.");
    expect(SOCIAL.stories.record).toBe("Record a video");
    expect(SOCIAL.stories.recordHint).toBe("Open in-app studio");
    expect(SOCIAL.stories.upload).toBe("Upload a video");
    expect(JSON.stringify(SOCIAL.stories)).not.toContain("Video only");
    expect(JSON.stringify(SOCIAL.stories)).not.toContain("No photo story");
    expect(JSON.stringify(SOCIAL.stories)).not.toContain("No text story");
    expect(SOCIAL.stories.studioTitle).toBe("Story studio");
    expect(SOCIAL.stories.holdOrTap).toBe("Hold or tap to record");
    expect(SOCIAL.stories.flash).toBe("Flash");
    expect(SOCIAL.stories.cameraMode).toBe("STORY");
    expect(SOCIAL.stories.post).toBe("Post");
    expect(SOCIAL.stories.posted).toBe("Story posted");
    expect(JSON.stringify(SOCIAL.stories)).not.toMatch(/photo or video/i);
    expect(JSON.stringify(SOCIAL.stories)).not.toMatch(/15 second/i);
    expect(socialMediaRuleMessage("type", "stories")).toBe(SOCIAL.stories.mediaType);
    expect(socialMediaRuleMessage("type", "stories", "image")).toBe(SOCIAL.stories.photoMediaType);
    expect(socialMediaRuleMessage("missing", "stories", "image")).toBe(SOCIAL.stories.photoMissing);
    expect(socialMediaRuleMessage("missing", "stories", "video")).toBe(SOCIAL.stories.mediaMissing);
    expect(socialMediaRuleMessage("type")).toBe(SOCIAL.home.mediaType);
    const storyCompose = readFileSync("src/components/social/social-story-studio.tsx", "utf8");
    expect(storyCompose).toContain("SOCIAL_VIDEO_CONTENT_TYPES.join(\",\")");
    expect(storyCompose).toContain("getUserMedia");
    expect(storyCompose).toContain("MediaRecorder");
    expect(storyCompose).toContain("probeStoryRecorderMimeType");
    expect(storyCompose).toContain("data-social-story-photo");
    expect(storyCompose).toContain("data-social-story-video");
    expect(storyCompose).toContain("data-social-story-record");
    expect(storyCompose).toContain("data-social-story-upload");
    expect(storyCompose).toContain("data-social-story-studio");
    expect(storyCompose).toContain('href={SOCIAL_ROUTES.home}');
    expect(storyCompose).not.toContain("pickerHint");
    expect(storyCompose).not.toContain("footnote");
    expect(storyCompose).not.toContain("HouseDialog");
    expect(storyCompose).toContain("storyStudioMirrorsPreview");
    expect(storyCompose).toContain("storyRecorderVideoConstraints");
    expect(storyCompose).toContain("HouseLink");
    expect(storyCompose).toContain("captureStoryStillFrame");
    expect(storyCompose).toContain("readStoryInputPick");
    expect(storyCompose).toContain("openPhotoCamera");
    expect(storyCompose).not.toMatch(/\scapture\s*=/);
    expect(storyCompose).not.toContain('from "next/link"');
    expect(storyCompose).not.toContain("SOCIAL_MEDIA_ACCEPT");
    expect(SOCIAL.dms.subtitle).toContain(PRODUCT_NAME);
    expect(SOCIAL.dms.addPeople).toBe("Add people");
    expect(SOCIAL_ROUTES.dms).toBe("/social/dms");
    expect(SOCIAL_ROUTES.post).toBe("/social/p");
    expect(socialPostHref("p1")).toBe("/social/p/p1");
    expect(socialGroupPostHref("crew", "p1")).toBe("/social/groups/crew/posts/p1");
    expect(SOCIAL_ROUTES.leaderboard).toBe("/social/leaderboard");
    expect(SOCIAL_ROUTES).not.toHaveProperty("courses");
    expect(SOCIAL_ROUTES.home).toBe("/social");
    expect(SOCIAL_ROUTES.profileByHandle).toBe("/social/u");
    expect(SOCIAL.profile.handlePlaceholder).toBe("Set your handle");
    expect(SOCIAL.profile.handleRequired).toBe("Handle is required");
    expect(SOCIAL_ROUTES.profileEdit).toBe("/social/profile/edit");
    expect(SOCIAL_ROUTES.profileBio).toBe("/social/profile/edit/bio");
    expect(SOCIAL.profile.username).toBe("Username");
    expect(SOCIAL.profile.usernameAdd).toBe("Add");
    expect(SOCIAL.profile.name).toBe("Name");
    expect(SOCIAL.profile.nameAdd).toBe("Add");
    expect(SOCIAL.profile.bioPrivacy).toBe("Your bio shows on your public profile.");
    expect(SOCIAL.profile.addLink).toBe("Add link");
    expect(SOCIAL.profile.editPicture).toBe("Edit picture");
    expect(SOCIAL.profile.chooseFromLibrary).toBe("Choose from library");
    expect(SOCIAL.profile.takePhoto).toBe("Take photo");
    expect(SOCIAL.profile.removePicture).toBe("Remove current picture");
    expect(SOCIAL.profile.postsEmpty).toBe("No posts yet.");
    expect(SOCIAL.profile.postsTruncated).toContain("200");
    expect(SOCIAL.home.truncatedWall).toContain("50");
    expect(SOCIAL.home.truncatedFollowees).toContain("500");
    expect(SOCIAL.home.truncatedStories).toContain("80");
    expect(SOCIAL.explore.truncated).toContain("20");
    expect(SOCIAL.dms.truncatedInbox).toContain("50");
    expect(SOCIAL.dms.truncatedThread).toContain("50");
    expect(SOCIAL.dms.roomFull).toContain("16");
    expect(SOCIAL.dms.addBatch).toContain("16");
    expect(SOCIAL.dms.chat).toBe("Chat");
    expect(SOCIAL.dms.to).toBe("To:");
    expect(SOCIAL.dms.search).toBe("Search");
    expect(SOCIAL.dms.groupChat).toBe("Group chat");
    expect(SOCIAL.dms.groupChatHint).toBe("Message up to 16 people");
    expect(SOCIAL.dms.newGroupChat).toBe("New group chat");
    expect(SOCIAL.dms.groupName).toBe("Group name (optional)");
    expect(SOCIAL.dms.suggested).toBe("Suggested");
    expect(JSON.stringify(SOCIAL.dms)).not.toContain("Create group");
    expect(JSON.stringify(SOCIAL.dms)).not.toContain("Channel");
    expect(JSON.stringify(SOCIAL.dms)).not.toContain("AI chats");
    expect(SOCIAL.dms.olderPage).toContain("older");
    expect(SOCIAL.dms.latestMessages).toBe("Latest messages");
    expect(SOCIAL.profile.uploadPhoto).toBe("Upload photo");
    expect(SOCIAL.profile.share).toBe("Share");
    expect(SOCIAL.profile.shareProfile).toBe("Share profile");
    expect(SOCIAL.profile.shareCopyLink).toBe("Copy link");
    expect(SOCIAL.profile.shareDownload).toBe("Download");
    expect(SOCIAL.courses.title).toBe("Education");
    expect(SOCIAL.courses.subtitle).toBe(`Education in ${PRODUCT_NAME}.`);
    expect(SOCIAL.courses.subtitle).not.toContain("Social+Education");
    expect(SOCIAL.courses.empty).toBe("Nothing here yet.");
    expect(SOCIAL.courses.playlist).toBe("Playlist");
    expect(SOCIAL.courses.lessonOne).toBe("1 lesson");
    expect(SOCIAL.courses.error).toBe("Education could not be loaded.");
    expect(SOCIAL.leaderboard.private).toBe("The leaderboard is private.");
    expect(SOCIAL.leaderboard.subtitle).toContain(PRODUCT_NAME);
    for (const banned of SOCIAL_BANNED_PRODUCT_NAMES) {
      expect(blob).not.toContain(banned);
    }
    expect(blob).not.toContain("Globee");
    expect(ASK_GLOBEE.headline).toBe("Ask 24Frame AI");
  });
});

describe("profile opt-in", () => {
  it("builds a self insert with required donor columns only", () => {
    const row = profileInsertRow({
      userId: "u1",
      handle: "ada",
      displayName: "Ada",
      birthDate: "1990-01-02",
    });
    expect(row.id).toBe("u1");
    expect(row.handle).toBe("ada");
    expect(row.display_name).toBe("Ada");
    expect(row.birth_date).toBe("1990-01-02");
    expect(row.app_role).toBe("member");
    expect(row.points_total).toBe(0);
    expect(row.level).toBe(1);
    expect(row.status).toBe("active");
    expect(row.trust_state).toBe("new");
    expect(row.discoverable).toBe(true);
    expect(row).not.toHaveProperty("avatar_key");
    expect(row).not.toHaveProperty("org_id");
  });

  it("omits birth_date when ensure creates the row", () => {
    const row = profileInsertRow({
      userId: "u1",
      handle: "ada",
      displayName: "Ada",
    });
    expect(row).not.toHaveProperty("birth_date");
    expect(row.handle).toBe("ada");
  });

  it("rejects short handles and under-13 birth dates", () => {
    expect(normalizeHandle("ab")).toBeNull();
    expect(normalizeHandle("Ada_Lovelace")).toBe("Ada_Lovelace");
    expect(normalizeHandle("AdamC")).toBe("AdamC");
    expect(normalizeHandle("Ada.Lovelace")).toBe("Ada.Lovelace");
    expect(normalizeHandle(".Ada")).toBeNull();
    expect(normalizeHandle("Ada.")).toBeNull();
    expect(normalizeHandle("Ada..C")).toBeNull();
    expect(normalizeHandle("Ada-C")).toBeNull();
    expect(normalizeHandle("A".repeat(30))).toBe("A".repeat(30));
    expect(normalizeHandle("A".repeat(31))).toBeNull();
    expect(handleKey("AdamC")).toBe("adamc");
    expect(handleKey("AdamC")).toBe(handleKey("adamc"));
    expect(handleDisplay("@AdamC")).toBe("AdamC");
    expect(isEligibleBirthDate("2014-01-01", new Date("2026-09-12T00:00:00.000Z"))).toBe(false);
    expect(isEligibleBirthDate("2013-09-12", new Date("2026-09-12T00:00:00.000Z"))).toBe(true);
    expect(socialInitials("Ada Lovelace")).toBe("AL");
    expect(socialInitials("Adam James Carpenter")).toBe("AC");
    expect(socialInitials("Ada")).toBe("A");
  });

  it("treats Member as an empty person name and keeps handle primary", () => {
    expect(SOCIAL.member.title).toBe("Member");
    expect(SOCIAL.profile.defaultDisplayName).toBe("Member");
    expect(socialPublicDisplayName("Ada Lovelace")).toBe("Ada Lovelace");
    expect(socialPublicDisplayName("Member")).toBeNull();
    expect(socialPublicDisplayName("  Member  ")).toBeNull();
    expect(socialPublicDisplayName("")).toBeNull();
    const named = socialPersonIdentity({ handle: "joshua", displayName: "Joshua A" });
    expect(named.handleLabel).toBe("@joshua");
    expect(named.name).toBe("Joshua A");
    expect(named.label).toBe("Joshua A");
    const sentinel = socialPersonIdentity({ handle: "joshua", displayName: "Member" });
    expect(sentinel.handleLabel).toBe("@joshua");
    expect(sentinel.name).toBeNull();
    expect(sentinel.label).toBe("joshua");
    expect(sentinel.avatarName).toBe("joshua");
    expect(JSON.stringify(sentinel)).not.toContain("Member");
    const sameAsHandle = socialPersonIdentity({ handle: "joshua", displayName: "joshua" });
    expect(sameAsHandle.name).toBeNull();
    expect(sameAsHandle.label).toBe("joshua");
    const casedName = socialPersonIdentity({ handle: "other", displayName: "Other" });
    expect(casedName.name).toBe("Other");
    expect(casedName.label).toBe("Other");
  });

  it("strips @ from handle input and keeps the house profile URL stable", () => {
    expect(stripHandleDecorators("@@acarpcreate")).toBe("acarpcreate");
    expect(normalizeHandle("@Ada_Lovelace")).toBe("Ada_Lovelace");
    expect(normalizeHandle("@@acarpcreate")).toBe("acarpcreate");
    expect(displayHandle("Ada")).toBe("@Ada");
    expect(handleFieldValue("AdamC")).toBe("AdamC");
    expect(handleFieldValue("@AdamC")).toBe("AdamC");
    expect(handleFieldValue("")).toBe("");
    expect(handleFieldValue("@")).toBe("");
    expect(socialHandleRequiredError("")).toBe(SOCIAL.profile.handleRequired);
    expect(socialHandleRequiredError("@")).toBe(SOCIAL.profile.handleRequired);
    expect(socialHandleRequiredError("@@@")).toBe(SOCIAL.profile.handleRequired);
    expect(socialHandleRequiredError("@ada")).toBeNull();
    expect(socialHandleInputError("@")).toBe(SOCIAL.profile.handleRequired);
    expect(socialHandleInputError("@")).not.toBe(SOCIAL.profile.handleTaken);
    expect(socialHandleDisplayError("@", SOCIAL.profile.handleTaken)).toBe(
      SOCIAL.profile.handleRequired,
    );
    expect(socialHandleDisplayError("@ad", SOCIAL.profile.handleTaken)).toBe(
      SOCIAL.profile.handleInvalid,
    );
    expect(SOCIAL.profile.handleInvalid).toBe(
      "Enter a handle of 3–30 letters, numbers, periods, or underscores.",
    );
    expect(socialProfileHref("Ada")).toBe("/social/u/Ada");
    expect(socialProfileHref("@acarpcreate")).toBe("/social/u/acarpcreate");
    expect(socialProfileHref("Ada")).not.toMatch(/\/social\/u\/@/);
    expect(socialProfileHref("@acarpcreate")).not.toMatch(/\/social\/u\/@/);
    const hrefSrc = readFileSync("src/lib/social.ts", "utf8");
    expect(hrefSrc).toContain("${SOCIAL_ROUTES.profileByHandle}/${display}");
    expect(hrefSrc).not.toContain("${SOCIAL_ROUTES.profileByHandle}/@${display}");
    expect(socialProfilePublicUrl("acarpcreate")).toBe("https://24frame.co/@acarpcreate");
    expect(socialProfilePublicHost("acarpcreate")).toBe("24frame.co/@acarpcreate");
    expect(formatSocialCount(24)).toBe("24");
    expect(formatSocialCount(1200)).toBe("1.2k");
    expect(formatSocialCount(318)).toBe("318");
    expect(socialProfilePublicUrl("")).toBe("https://24frame.co/@");
    expect(socialProfilePublicUrl("@Ada")).toBe("https://24frame.co/@Ada");
    expect(socialProfilePublicUrl("AdamC")).toBe("https://24frame.co/@AdamC");
    expect(socialProfilePublicPath("AdamC")).toBe("/@AdamC");
    expect(socialProfileCanonicalUrl("AdamC")).toBe("https://24frame.co/@AdamC");
    expect(socialProfileCasingRedirect("adamc", "AdamC")).toBe("/@AdamC");
    expect(socialProfileCasingRedirect("ADAMC", "AdamC")).toBe("/@AdamC");
    expect(socialProfileCasingRedirect("AdamC", "AdamC")).toBeNull();
    expect(socialProfileCasingRedirect("ada", "AdamC")).toBeNull();
    expect(SOCIAL.profile.handleTaken).toBe("That handle is already taken.");
    expect(SOCIAL.profile.followedBy).toBe("Followed by");
    expect(SOCIAL.profile.followedByMore).toBe("+{n} more");
    expect(SOCIAL_PROFILE_ORIGIN).toBe("https://24frame.co");
    expect(socialProfilePublicUrl("acarpcreate")).not.toContain("app.24frame.co");
    expect(socialProfilePublicUrl("acarpcreate")).not.toContain("/social/u/");
    expect(socialProfilePublicUrl("AdamC")).not.toContain("/social/@");
    expect(socialProfilePublicPath("AdamC")).not.toContain("/social/");
    expect(parseSocialCreateKind("photo")).toBe("media");
    expect(parseSocialCreateKind("video")).toBe("media");
    expect(parseSocialCreateKind("media")).toBe("media");
    expect(parseSocialCreateKind("clip")).toBeNull();
    expect(socialCreateHref("media")).toBe("/social/create?kind=media");
    expect(socialCreateHref("text")).toBe("/social/create?kind=text");
    expect(SOCIAL_ROUTES.createLive).toBe("/social/create/live");
    expect(SOCIAL.create.write).toBe("Write");
    expect(SOCIAL.create.goLive).toBe("Go live");
    expect(SOCIAL.create.close).toBe("Close");
    expect(SOCIAL.create.title).toBe("Create");
    expect(socialCreateWellCopy("media", false)).toBeNull();
    expect(socialCreateWellCopy("media", true)).toBeNull();
    expect(socialCreateWellCopy("text", false)).toBeNull();
    expect(SOCIAL.create.media).toBe("Media");
    expect(SOCIAL.create.next).toBe("Next");
    expect(SOCIAL.create.photo).toBe("Photo");
    expect(SOCIAL.create.caption).toBe("Caption");
    expect(SOCIAL.create.originalQuality).toBe("Upload in original quality (up to 4K)");
    expect(SOCIAL.home.videoPreparing).toBe("That video is still preparing.");
    expect(parseSocialHomeLane("for-you")).toBe("for-you");
    expect(socialHomeLaneHref("following")).toBe("/social");
    expect(SOCIAL_PROFILE_TABS).toEqual(["activity", "highlights", "credits", "interests"]);
    expect(SOCIAL_PROFILE_DEFAULT_TAB).toBe("activity");
    expect(parseSocialProfileTab("highlights")).toBe("highlights");
    expect(parseSocialProfileTab("credits")).toBe("credits");
    expect(parseSocialProfileTab("interests")).toBe("interests");
    expect(parseSocialProfileTab("activity")).toBe("activity");
    expect(parseSocialProfileTab("posts")).toBe("activity");
    expect(parseSocialProfileTab("reels")).toBe("activity");
    expect(parseSocialProfileTab(undefined)).toBe("activity");
    expect(socialProfileVisibleTabs({ owner: true, topicCount: 0 }).map((tab) => tab)).toEqual([
      ...SOCIAL_PROFILE_TABS,
    ]);
    expect(socialProfileVisibleTabs({ owner: false, topicCount: 2 }).map((tab) => tab)).toEqual([
      ...SOCIAL_PROFILE_TABS,
    ]);
    const visitorEmpty = socialProfileVisibleTabs({ owner: false, topicCount: 0 });
    expect(visitorEmpty).not.toContain("interests");
    expect(resolveSocialProfileTab("interests", visitorEmpty)).toBe("activity");
    expect(resolveSocialProfileTab("interests")).toBe("interests");
    expect(resolveSocialProfileTab("nope", visitorEmpty)).toBe("activity");
    expect(socialProfileEditTopicsHref()).toBe("/social/profile/edit?face=topics");
    expect(isLegacySocialProfilePostsTab("posts")).toBe(true);
    expect(isLegacySocialProfilePostsTab("activity")).toBe(false);
    expect(socialProfileLegacyPostsTabHref("/social/profile")).toBe("/social/profile");
    expect(socialProfileLegacyPostsTabHref("/social/u/ada")).toBe("/social/u/ada");
    expect(socialProfileTabHref("/social/u/ada", "highlights")).toBe("/social/u/ada?tab=highlights");
    expect(socialProfileTabHref("/social/u/ada", "credits")).toBe("/social/u/ada?tab=credits");
    expect(socialProfileTabHref("/social/u/ada", "activity")).toBe("/social/u/ada");
    expect(socialProfileTabHref("/social/profile", "activity")).toBe("/social/profile");
    expect(socialProfileTabLabel("credits")).toBe("Credits");
    expect(socialProfileTabLabel("activity")).toBe("Activity");
    expect(socialProfileTabLabel("interests")).toBe("Interests");
    expect(SOCIAL.profile.interestsTab).toBe("Interests");
    expect(SOCIAL.profile.interestsEmpty).toBe("No interests yet.");
    expect(SOCIAL.profile.interestsEmptyOwnHint).toBe("Choose topics on Edit profile.");
    expect(socialProfileTabHref("/social/u/ada", "interests")).toBe("/social/u/ada?tab=interests");
    expect(parseSocialFollowsTab("following")).toBe("following");
    expect(parseSocialFollowsTab("reels")).toBe("followers");
    expect(parseSocialFollowsQuery("  Ada  ")).toBe("Ada");
    expect(socialProfileFollowsHref("Ada")).toBe("/social/u/Ada/follows");
    expect(socialProfileFollowsHref("Ada", "following")).toBe("/social/u/Ada/follows?tab=following");
    expect(socialProfileFollowsHref("Ada", "followers", "sun")).toBe("/social/u/Ada/follows?q=sun");
    expect(socialProfileFollowsHref("Ada", "following", "sun")).toBe(
      "/social/u/Ada/follows?tab=following&q=sun",
    );
    expect(socialProfileFollowsHref("Ada")).not.toMatch(/\/social\/u\/@/);
    expect(socialProfileFollowsCasingRedirect("adamc", "AdamC", "following", "sun")).toBe(
      "/social/u/AdamC/follows?tab=following&q=sun",
    );
    expect(socialProfileFollowsCasingRedirect("AdamC", "AdamC", "followers")).toBeNull();
    expect(socialProfileFollowsCasingRedirect("ada", "AdamC", "followers")).toBeNull();
    expect(socialFollowsTabLabel("followers", 4)).toBe("4 followers");
    expect(socialFollowsTabLabel("following", 7)).toBe("7 following");
    expect(socialFollowsTabLabel("followers")).toBe(SOCIAL.profile.followersTab);
    expect(SOCIAL.profile.followsSearch).toBe("Search username or display name");
    expect(SOCIAL.follow.followBack).toBe("Follow back");
    expect(socialComposerPrompt("Ada Lovelace")).toBe("Share something");
    expect(socialComposerPrompt("Ada Lovelace")).not.toContain("Ada");
    expect(socialComposerPrompt(null)).toBe("Share something");
    expect(socialComposerPrompt("")).toBe("Share something");
    expect(SOCIAL.home.composerPromptNamed).toBe(SOCIAL.home.composerPrompt);
    expect(SOCIAL.home.composerPrompt).toBe("Share something");
    expect(SOCIAL.home.composerPromptNamed).toBe("Share something");
    expect(SOCIAL.forYou).not.toHaveProperty("topics");
    expect(SOCIAL.forYou.latestCourse).toBe("Latest course");
    expect(SOCIAL.profile.activityTab).toBe("Activity");
    expect(SOCIAL.profile.activityPosts).toBe("Posts");
    expect(SOCIAL.profile.highlightsTab).toBe("Highlights");
    expect(SOCIAL.profile.highlightsEmpty).toBe("No highlights yet.");
    expect(SOCIAL.profile.highlightsEmptyHint).toBe("Pin lasting collections from your Stories.");
    expect(SOCIAL.profile.highlightsEmptyHint).not.toMatch(/24 hours/i);
    expect(SOCIAL.profile.highlightsEmptyHint).not.toMatch(/live stories/i);
    expect(SOCIAL.profile).not.toHaveProperty("highlightsEmptyOwnHint");
    expect(SOCIAL.profile.creditsTab).toBe("Credits");
    expect(SOCIAL.profile.creditsEmpty).toBe("No credits yet");
    expect(SOCIAL.profile.creditsEmptyHint).toBe("Credits are the titles and roles attached to your name.");
    expect(SOCIAL.profile.creditsEmptyOwnHint).toBe(
      "Add the titles and roles you want attached to your name.",
    );
    expect(SOCIAL.profile.completeIdentity).toBe("Edit profile");
    expect(parseProfileHandleParam("%40ada")).toBe("ada");
    expect(parseProfileHandleParam("%40AdamC")).toBe("AdamC");
    expect(parseProfileHandleParam("AdamC")).toBe("AdamC");
    expect(parseProfileHandleParam("@ada")).toBe("ada");
    expect(parseProfileHandleParam("ada")).toBe("ada");
    expect(parseProfileHandleParam("%40AdamC")).toBe("AdamC");
    expect(parseProfileHandleParam("AdamC")).toBe("AdamC");
    expect(suggestedHandleSeed("Ada.Carp@example.com", "u1")).toBe("adacarp");
    expect(BIO_MAX).toBe(150);
    expect(socialBioEnterSubmits()).toBe(false);
    expect(socialBioFieldValue("line1\r\nline2")).toBe("line1\nline2");
    expect(normalizeBio("Founder\nInvestor")).toBe("Founder\nInvestor");
    expect(socialBioCount("Founder\nInvestor")).toBe(16);
    expect(socialBioCounterLabel("Founder\nInvestor")).toBe("16 / 150");
    expect(normalizeBio(`${"a".repeat(150)}\n`)).toBe("a".repeat(150));
    expect(normalizeBio(`a\n${"b".repeat(149)}`)).toBeNull();
    expect(normalizeBio("   \n  ")).toBe("");
    expect(normalizeBio("hello\n")).toBe("hello");
  });

  it("rewrites only /@handle to the in-app /social/u/{display} profile", () => {
    expect(socialVanityInternalPath("/@ada")).toBe("/social/u/ada");
    expect(socialVanityInternalPath("/@Ada_Lovelace")).toBe("/social/u/Ada_Lovelace");
    expect(socialVanityInternalPath("/@AdamC")).toBe("/social/u/AdamC");
    expect(socialVanityInternalPath("/@ada")).not.toMatch(/\/social\/u\/@/);
    expect(socialVanityInternalPath("/@ada/extra")).toBeNull();
    expect(socialVanityInternalPath("/legal")).toBeNull();
    expect(socialVanityInternalPath("/login")).toBeNull();
    expect(socialVanityInternalPath("/admin")).toBeNull();
    expect(socialVanityInternalPath("/api")).toBeNull();
    expect(socialVanityInternalPath("/www")).toBeNull();
    expect(socialVanityInternalPath("/@login")).toBeNull();
    expect(socialVanityInternalPath("/@legal")).toBeNull();
    expect(socialVanityInternalPath("/@admin")).toBeNull();
    expect(socialVanityInternalPath("/@api")).toBeNull();
    expect(socialVanityInternalPath("/@www")).toBeNull();
  });

  it("rewrites leftover /social/u/@handle bookmarks and 301s /social/@handle to /@handle", () => {
    expect(socialProfileRewriteTarget("/@ada")).toBe("/social/u/ada");
    expect(socialProfileRewriteTarget("/@AdamC")).toBe("/social/u/AdamC");
    expect(socialProfileRewriteTarget("/social/u/@ada")).toBe("/social/u/ada");
    expect(socialProfileRewriteTarget("/social/u/%40ada")).toBe("/social/u/ada");
    expect(socialProfileRewriteTarget("/social/u/@acarpcreate")).toBe("/social/u/acarpcreate");
    expect(socialProfileRewriteTarget("/social/u/ada")).toBeNull();
    expect(socialProfileRewriteTarget("/social/u/@ada/extra")).toBeNull();
    expect(socialProfileRewriteTarget("/social/u/@login")).toBe("/social/u/login");
    expect(socialProfileRewriteTarget("/@login")).toBeNull();
    expect(socialProfileRewriteTarget("/social/@ada")).toBeNull();
    expect(socialProfileRewriteTarget("/social/u/@ada")).not.toMatch(/\/social\/u\/@/);
    expect(socialProfileLegacyPublicRedirect("/social/@ada")).toBe("/@ada");
    expect(socialProfileLegacyPublicRedirect("/social/@AdamC")).toBe("/@AdamC");
    expect(socialProfileLegacyPublicRedirect("/social/%40AdamC")).toBe("/@AdamC");
    expect(socialProfileLegacyPublicRedirect("/@ada")).toBeNull();
    expect(socialProfileLegacyPublicRedirect("/social/@login")).toBeNull();
    expect(socialProfileLegacyPublicRedirect("/social/@ada/extra")).toBeNull();
  });
});

describe("social writes stay on the live spine", () => {
  it("posts text and optional media keys and likes target posts", () => {
    expect(postInsertRow({ authorId: "u1", body: "hello" })).toEqual({
      author_id: "u1",
      body: "hello",
      group_id: null,
      media: [],
      category: null,
      status: "active",
      like_count: 0,
      comment_count: 0,
      pinned: false,
    });
    expect(
      postInsertRow({
        authorId: "u1",
        body: null,
        media: [{ kind: "image", key: "posts/u1/a.jpg", contentType: "image/jpeg" }],
      }),
    ).toMatchObject({
      body: null,
      media: [{ kind: "image", key: "posts/u1/a.jpg", contentType: "image/jpeg" }],
    });
    expect(likeInsertRow("u1", "p1")).toEqual({
      user_id: "u1",
      target_type: "post",
      target_id: "p1",
    });
    expect(messageInsertRow({ senderId: "u1", conversationId: "c1", body: "hi" })).toEqual({
      sender_id: "u1",
      conversation_id: "c1",
      body: "hi",
      status: "active",
    });
  });

  it("does not invent a cousin catalog feed table or cascade-delete memberships", () => {
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    const light = readFileSync("src/app/(app)/social/light-actions.ts", "utf8");
    const pages = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    const board = readFileSync("src/app/(app)/social/leaderboard/page.tsx", "utf8");
    expect(actions).toContain('from("profiles")');
    expect(actions).toContain('from("posts")');
    expect(actions).toContain("presignSocialMediaPut");
    expect(light).toContain('from("likes")');
    expect(light).toContain("export async function toggleSocialFollow");
    expect(light).toContain("export async function toggleSocialLike");
    expect(light).toContain("export async function createSocialComment");
    expect(light).toContain("export async function deleteSocialComment");
    expect(light).toContain("export async function updateSocialPostCaption");
    expect(light).toContain("export async function deleteSocialPost");
    expect(actions).not.toContain("toggleSocialFollow");
    expect(actions).not.toContain("from \"@/lib/s3\"");
    expect(actions).not.toContain("from \"@/lib/cloudfront\"");
    expect(actions).not.toContain("from \"@/lib/mediaconvert\"");
    expect(actions).toContain("open_or_get_direct_conversation");
    expect(actions).toContain("create_group_conversation");
    expect(actions).not.toContain("add_conversation_participants");
    expect(actions).toContain("set_group_conversation_title");
    expect(actions).toContain("mark_direct_conversation_read");
    expect(actions).not.toContain("min_level");
    expect(actions).toContain("createClient");
    expect(actions).not.toContain("createAdminClient");
    expect(actions).not.toContain("service_role");
    expect(actions).not.toContain('from("titles")');
    expect(actions).not.toContain("ai_conversations");
    expect(actions).not.toContain("memberships");
    expect(actions).not.toContain(".from(\"profiles\").delete");
    expect(actions).not.toContain("from(\"organizations\")");
    expect(pages).toContain("loadCachedFollowingPosts");
    expect(pages).not.toContain("SocialPostCompose");
    expect(pages).toContain("SocialHomeTabs");
    expect(pages).toContain("SocialHomeComposer");
    expect(pages).not.toContain("SocialLensRow");
    expect(pages).toContain("SocialStoriesRail");
    expect(pages).not.toContain("from(\"titles\")");
    expect(board).toContain("loadLeaderboardBoard");
    expect(board).toContain("requireSocialSession");
    expect(board).not.toContain("createAdminClient");
    expect(board).not.toContain("rebuild_leaderboards");
    expect(actions).not.toContain("from(\"courses\")");
    expect(actions).not.toContain("createSocialCourse");
  });

  it("labels rooms from participants first and quiets add-people errors", () => {
    expect(conversationRoomLabel(null, ["Ada Lovelace", "Bob One"])).toBe("Ada Lovelace, Bob One");
    expect(conversationRoomLabel("Desk room", ["Ada Lovelace"])).toBe("Desk room");
    expect(conversationRoomLabel("  ", [])).toBe(SOCIAL.dms.thread);
    expect(inboxPeerIds({ peer_id: "u2", participant_ids: ["u2", "u3"] })).toEqual(["u2", "u3"]);
    expect(inboxPeerIds({ peer_id: "u2", participant_ids: [] })).toEqual(["u2"]);
    const self = dmInboxDisplayPeerIds(
      { kind: "direct", peer_id: null, participant_ids: [] },
      "u1",
    );
    expect(self).toEqual(["u1"]);
    expect(conversationRoomLabel(null, self.map(() => "Ada Lovelace"))).toBe("Ada Lovelace");
    expect(conversationRoomLabel(null, self.map(() => "Ada Lovelace"))).not.toBe(SOCIAL.dms.thread);
    expect(
      dmInboxDisplayPeerIds({ kind: "direct", peer_id: "u2", participant_ids: ["u2"] }, "u1"),
    ).toEqual(["u2"]);
    expect(
      dmInboxDisplayPeerIds(
        { kind: "group", peer_id: null, participant_ids: ["u2", "u3"] },
        "u1",
      ),
    ).toEqual(["u2", "u3"]);
    expect(
      dmInboxDisplayPeerIds({ kind: "group", peer_id: null, participant_ids: [] }, "u1"),
    ).toEqual([]);
    expect(normalizeConversationTitle("")).toEqual({ title: null });
    expect(normalizeConversationTitle("Desk room")).toEqual({ title: "Desk room" });
    expect(normalizeConversationTitle("x".repeat(81))).toBeNull();
    expect(quietDmAddError("blocked")).toBe(SOCIAL.dms.addBlocked);
    expect(quietDmAddError("cannot add yourself")).toBe(SOCIAL.dms.addSelf);
    expect(quietDmAddError("peer not found")).toBe(SOCIAL.dms.addMissing);
    expect(quietDmAddError("room is full")).toBe(SOCIAL.dms.roomFull);
    expect(quietDmAddError("too many participants in one add")).toBe(SOCIAL.dms.addBatch);
  });

  it("reuses signed account faces and does not add a second upload or title bucket", () => {
    const nodeSurfaces = [
      "src/app/(app)/social/page.tsx",
      "src/app/(app)/social/profile/page.tsx",
      "src/app/(app)/social/dms/page.tsx",
      "src/app/(app)/social/dms/[id]/page.tsx",
      "src/app/(app)/social/leaderboard/page.tsx",
      "src/app/(app)/social/groups/[slug]/page.tsx",
      "src/app/(app)/social/p/[postId]/page.tsx",
      "src/app/(app)/social/stories/[id]/page.tsx",
    ];
    for (const file of nodeSurfaces) {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/signedAvatarUrls?|socialAvatarHref/);
      expect(src).not.toContain("putAvatarObject");
      expect(src).not.toContain("uploadAccountPhoto");
      expect(src).not.toContain("S3_BUCKET");
      expect(src).not.toContain("S3_AVATARS_BUCKET");
      expect(src).not.toContain("24frame-media");
      expect(src).not.toContain("@/lib/s3\"");
      expect(src).not.toContain("@/lib/cloudfront");
      expect(src).not.toContain("@/lib/mediaconvert");
    }
    const publicProfile = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    expect(publicProfile).toContain("socialAvatarHref");
    expect(publicProfile).toContain("socialMediaProxiesByPostId");
    expect(publicProfile).not.toContain("putAvatarObject");
    expect(publicProfile).not.toContain("uploadAccountPhoto");
    expect(publicProfile).not.toContain("S3_BUCKET");
    expect(publicProfile).not.toContain("S3_AVATARS_BUCKET");
    expect(publicProfile).not.toContain("@/lib/s3\"");
    expect(publicProfile).not.toContain("@/lib/cloudfront");
    expect(publicProfile).not.toContain("@/lib/mediaconvert");
    const feed = [
      "src/app/(app)/social/page.tsx",
      "src/app/(app)/social/profile/page.tsx",
      "src/app/(app)/social/groups/[slug]/page.tsx",
      "src/app/(app)/social/p/[postId]/page.tsx",
      "src/app/(app)/social/stories/[id]/page.tsx",
    ];
    for (const file of feed) {
      expect(readFileSync(file, "utf8")).toMatch(
        /signedSocialMedia|socialMediaProxies/,
      );
    }
    const groupPost = readFileSync("src/app/(app)/social/groups/[slug]/posts/[postId]/page.tsx", "utf8");
    expect(groupPost).toContain("redirect(socialPostHref(post.id))");
    expect(groupPost).not.toContain("signedSocialMedia");
    const own = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    const pub = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const panels = readFileSync("src/components/social/social-profile-tab-panels.tsx", "utf8");
    expect(own).toContain("loadAuthorActivityPosts");
    expect(own).toContain("SocialProfileTabPanels");
    expect(panels).toContain("SocialActivityHistory");
    expect(own).not.toContain("SocialAuthorHistory");
    expect(own).toContain("isLegacySocialProfilePostsTab");
    expect(pub).toContain("loadAuthorActivityPosts");
    expect(pub).toContain("SocialProfileTabPanels");
    expect(panels).toContain("SocialActivityHistory");
    expect(pub).not.toContain("SocialAuthorHistory");
    expect(pub).toContain("isLegacySocialProfilePostsTab");
    const forms = readFileSync("src/components/social/social-forms.tsx", "utf8");
    expect(forms).toContain("uploadSocialPostMedia");
    expect(forms).toContain("originalQuality");
    expect(forms).toContain("uploadAccountPhoto");
    expect(forms).toContain("type=\"file\"");
    expect(forms).not.toContain("putAvatarObject");
    expect(forms).not.toContain("S3_BUCKET");
    expect(forms).not.toContain("S3_AVATARS_BUCKET");
    expect(forms).not.toContain("from \"@/lib/s3\"");
    expect(forms).not.toContain("from \"@/lib/cloudfront\"");
  });
});

describe("feed post craft lock 2026-09-21", () => {
  it("keeps compact lowercase relative time and a unique post URL", () => {
    const now = Date.parse("2026-09-21T12:00:00.000Z");
    expect(socialRelativeTime("2026-09-21T11:59:30.000Z", now)).toBe("Just now");
    expect(socialRelativeTime("2026-09-21T11:50:00.000Z", now)).toBe("10m");
    expect(socialRelativeTime("2026-09-21T02:00:00.000Z", now)).toBe("10h");
    expect(socialRelativeTime("2026-09-20T12:00:00.000Z", now)).toBe("Yesterday");
    expect(socialRelativeTime("2026-09-18T12:00:00.000Z", now)).toBe("3d");
    expect(socialPostHref("abc")).toBe("/social/p/abc");
    expect(SOCIAL.post.likesTitle).toBe("Likes");
    expect(SOCIAL.post.likesEmpty).toBe("No likes yet.");
    expect(SOCIAL_ROUTES.post).toBe("/social/p");
  });
});
