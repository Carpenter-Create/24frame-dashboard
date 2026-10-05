import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// --accent read from tokens.css, so this guard follows the pending GC accent checkpoint.
const ACCENT = readFileSync("src/app/tokens.css", "utf8").match(/--accent:\s*(#[0-9a-fA-F]{6});/)?.[1];

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
  }: {
    src: string;
    className?: string;
  }) => createElement("img", { src, className, alt: "" }),
}));

import { SETTINGS_DIALOG_LABEL_CLASS, SETTINGS_DRILL_ROW_CLASS } from "@/lib/settings";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_PROFILE_EDIT_LABEL_CLASS } from "@/lib/social-chrome";
import { socialProfileImdbRowSummary } from "@/lib/social-imdb";
import { socialProfileLinksRowSummary } from "@/lib/social-profile-links";
import { socialProfileRolesRowSummary } from "@/lib/social-profile-roles";
import { socialProfileTopicsRowSummary } from "@/lib/social-profile-topics";
import { SocialProfileEditForm } from "./social-profile-edit";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/(app)/account/actions", () => ({
  uploadAccountPhoto: vi.fn(),
  removeAccountPhoto: vi.fn(),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  createSocialProfile: vi.fn(),
  presignSocialMediaUpload: vi.fn(),
  saveSocialWelcomeVideo: vi.fn(),
  clearSocialWelcomeVideo: vi.fn(),
}));

describe("SocialProfileEditForm", () => {
  it("renders a drill-only index — Name, Username, Professions, Topics, IMDb, Links, Bio", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="ada"
        displayName="Ada Lovelace"
        bio={"Writes engines.\nSecond line."}
        photoUrl={null}
      />,
    );
    expect(html).toContain("data-social-profile-edit");
    expect(html).toContain(SOCIAL.profile.edit);
    expect(html).toContain(SOCIAL.profile.done);
    expect(html).toContain("data-social-profile-edit-name-open");
    expect(html).toContain(SOCIAL.profile.name);
    expect(html).toContain("Ada Lovelace");
    expect(html).not.toContain("data-social-profile-edit-names");
    expect(html).not.toContain(SOCIAL.profile.firstName);
    expect(html).not.toContain(SOCIAL.profile.middleName);
    expect(html).not.toContain(SOCIAL.profile.lastName);
    expect(html).not.toContain('id="social-edit-first-name"');
    expect(html).not.toContain('id="social-edit-middle-name"');
    expect(html).not.toContain('id="social-edit-last-name"');
    expect(html).not.toContain('id="social-edit-name"');
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).toContain(SETTINGS_DIALOG_LABEL_CLASS);
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).toContain("whitespace-nowrap");
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).toContain("w-32");
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).not.toContain("t-label");
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).not.toContain("uppercase");
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).not.toContain("w-[88px]");
    expect(SOCIAL_PROFILE_EDIT_LABEL_CLASS).not.toContain("truncate");
    expect(html).not.toContain("type=\"checkbox\"");
    expect(html).toContain("flex-col");
    expect(html).toContain(SOCIAL.profile.username);
    expect(html).toContain("data-social-profile-edit-handle-open");
    expect(html).toContain("@ada");
    expect(html).not.toContain("data-social-handle-field");
    expect(html).not.toContain("data-social-handle-prefix");
    expect(html).not.toContain('id="social-edit-handle"');
    expect(html).not.toContain("data-social-handle-url");
    expect(html).not.toContain("https://24frame.co/@ada");
    expect(html).not.toContain("https://24frame.co/@");
    expect(html).toContain("Writes engines.");
    expect(html).toContain("Second line.");
    expect(html).toContain("data-social-profile-edit-bio-open");
    expect(html).not.toContain('href="/social/profile/edit/bio"');
    expect(html).toContain(SOCIAL.profile.links);
    expect(html).toContain("data-social-profile-edit-links-open");
    expect(html).toContain(socialProfileLinksRowSummary([]));
    expect(html).not.toContain(SOCIAL.profile.addLink);
    expect(html).not.toContain('id="social-edit-link-0"');
    expect(html).toContain(SOCIAL.profile.editPicture);
    expect(html).toContain("data-social-profile-edit-avatar-drop");
    expect(html).not.toContain("data-social-profile-avatar-sheet");
    expect(html).not.toContain("Photo Library");
    expect(html).not.toContain("Choose File");
    expect(html).toContain("data-social-profile-edit-welcome");
    expect(html).toContain(SOCIAL.profile.welcomeAdd);
    expect(html).not.toContain(SOCIAL.profile.welcomeRemove);
    expect(html).toContain("data-social-profile-edit-roles-open");
    expect(html).toContain("data-social-profile-edit-topics-open");
    expect(html).toContain("data-social-profile-edit-imdb-open");
    expect(html).toContain(SOCIAL.profile.roles);
    expect(html).toContain(SOCIAL.profile.topics);
    expect(html).toContain(SOCIAL.profile.rolesAdd);
    expect(html).toContain(socialProfileRolesRowSummary([]));
    expect(html).toContain(socialProfileTopicsRowSummary([]));
    expect(html).toContain(SETTINGS_DRILL_ROW_CLASS);
    expect(html).not.toContain(SOCIAL.profile.topicsSearch);
    expect(html).not.toContain(SOCIAL.profile.rolesSearch);
    expect(html).not.toContain('id="social-edit-roles-search"');
    expect(html).not.toContain('id="social-edit-topics-search"');
    expect(html).not.toContain("data-social-profile-edit-roles-selected");
    expect(html).not.toContain("data-social-profile-edit-roles-count");
    expect(html).not.toContain("data-social-profile-edit-topics-selected");
    expect(html).not.toContain("data-social-profile-chip-face");
    expect(html).not.toContain(SOCIAL.profile.rolesHint);
    expect(html).not.toContain(SOCIAL.profile.rolesLimit);
    expect(html).not.toContain('id="social-edit-imdb"');
    expect(html).toContain(SOCIAL.profile.imdb);
    expect(html).toContain(socialProfileImdbRowSummary(""));
    expect(html).toContain("flex-col");
    expect(html).toContain("data-social-avatar");
    expect(html).toContain("AL");
    expect(html).not.toContain("<img");
    expect(html).toContain('data-social-icon="caret-left"');
    expect(html).not.toContain("Education");
    expect(html).not.toContain("Reels");
    expect(ACCENT).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(html.toLowerCase()).not.toContain(String(ACCENT).toLowerCase());
    expect(html).not.toContain("/social/@");

    const cased = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="AdamC"
        displayName="Ada Lovelace"
        bio=""
        photoUrl={null}
      />,
    );
    expect(cased).toContain("@AdamC");
    expect(cased).not.toContain("data-social-handle-field");
    expect(cased).not.toContain("https://24frame.co/@AdamC");
    expect(cased).not.toContain("/social/@");
  });

  it("shows the composed name on the index and keeps First / Middle / Last off it", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="adam"
        displayName="Adam James Carpenter"
        bio=""
        photoUrl="https://s3.example/adam-face"
      />,
    );
    expect(html).toContain("Adam James Carpenter");
    expect(html).toContain("data-social-profile-edit-name-open");
    expect(html).not.toContain('id="social-edit-first-name"');
    expect(html).not.toContain('id="social-edit-middle-name"');
    expect(html).not.toContain('id="social-edit-last-name"');
    expect(html).not.toContain('value="Adam"');
    expect(html).not.toContain('value="James"');
    expect(html).not.toContain('value="Carpenter"');
    expect(html).toContain('src="https://s3.example/adam-face"');
    expect(html).not.toContain("AC");
  });

  it("shows replace and remove when a welcome video is present, and does not play it", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="ada"
        displayName="Ada Lovelace"
        bio=""
        photoUrl={null}
        welcomeVideoUrl="present"
      />,
    );
    expect(html).toContain("data-social-profile-edit-welcome");
    expect(html).toContain(SOCIAL.profile.welcomeReplace);
    expect(html).toContain(SOCIAL.profile.welcomeRemove);
    expect(html).toContain("data-social-video-closed");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("data-social-welcome-video");
    const stale = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="ada"
        displayName="Ada Lovelace"
        bio=""
        photoUrl={null}
        welcomeVideoUrl="https://s3.example/welcome.mp4"
      />,
    );
    expect(stale).toContain("data-social-video-closed");
    expect(stale).not.toContain("<video");
    expect(stale).not.toContain("welcome.mp4");
  });

  it("shows one Professions drill-in row from persisted crafts and never a Category label", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="ada"
        displayName="Ada Lovelace"
        bio=""
        photoUrl={null}
        crafts={["actor", "producer", "screenwriter"]}
      />,
    );
    expect(html).toContain("data-social-profile-edit-roles-open");
    expect(html).toContain(socialProfileRolesRowSummary(["actor", "producer", "screenwriter"]));
    expect(html).toContain("Actor +2");
    expect(html).toContain(SETTINGS_DRILL_ROW_CLASS);
    expect(html).not.toContain("data-social-profile-edit-roles-count");
    expect(html).not.toContain("3 / 5");
    expect(html).not.toContain("data-social-profile-edit-roles-selected");
    expect(html).not.toContain('data-social-profile-role-chip="actor"');
    expect(html).not.toContain('id="social-edit-roles-search"');
    expect(html).not.toContain(SOCIAL.profile.rolesSearch);
    expect(html).not.toContain(SOCIAL.profile.rolesHint);
    expect(html).not.toContain("Category");
    expect(html).not.toContain("Actress");
    expect(html).not.toContain("Writer: Screenplay");
  });

  it("shows Topics, IMDb, and Links as drill rows, not inline fields", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="ada"
        displayName="Ada Lovelace"
        bio=""
        photoUrl={null}
        topics={["Acting", "Financing"]}
        imdbUrl="nm0000158"
        websiteUrl={JSON.stringify(["https://instagram.com/ada", "https://youtube.com/@ada"])}
      />,
    );
    expect(html).toContain("data-social-profile-edit-topics-open");
    expect(html).toContain(socialProfileTopicsRowSummary(["Acting", "Financing"]));
    expect(html).toContain("Acting +1");
    expect(html).not.toContain("data-social-profile-edit-topics-selected");
    expect(html).not.toContain('id="social-edit-topics-search"');
    expect(html).toContain("data-social-profile-edit-imdb-open");
    expect(html).toContain(socialProfileImdbRowSummary("nm0000158"));
    expect(html).toContain("nm0000158");
    expect(html).not.toContain('id="social-edit-imdb"');
    expect(html).not.toContain(SOCIAL.profile.imdbHint);
    expect(html).toContain("data-social-profile-edit-links-open");
    expect(html).toContain(socialProfileLinksRowSummary([
      "https://instagram.com/ada",
      "https://youtube.com/@ada",
    ]));
    expect(html).toContain("instagram.com/ada +1");
    expect(html).not.toContain('value="https://instagram.com/ada"');
    expect(html).not.toContain("data-social-profile-edit-link-remove");
  });

  it("opens the existing Topics drill when Edit is linked with face=topics", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm
        handle="ada"
        displayName="Ada Lovelace"
        bio=""
        photoUrl={null}
        topics={["Acting"]}
        initialFace="topics"
      />,
    );
    expect(html).toContain("data-social-profile-topics");
    expect(html).toContain("data-social-profile-topics-back");
    expect(html).toContain('id="social-edit-topics-search"');
    expect(html).toContain(SOCIAL.profile.topics);
    expect(html).not.toContain("data-social-profile-edit-topics-open");
  });

  it("keeps Username as a drill row and omits a derived Profile URL on the index", () => {
    const html = renderToStaticMarkup(
      <SocialProfileEditForm handle="" displayName="" bio="" photoUrl={null} />,
    );
    expect(html).toContain(SOCIAL.profile.username);
    expect(html).toContain("data-social-profile-edit-handle-open");
    expect(html).toContain(SOCIAL.profile.usernameAdd);
    expect(html).not.toContain(`placeholder="${SOCIAL.profile.usernamePlaceholder}"`);
    expect(html).not.toContain("data-social-handle-prefix");
    expect(html).not.toContain("https://24frame.co/@");
    expect(html).not.toContain("data-social-handle-url");
  });
});
