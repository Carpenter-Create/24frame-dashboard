import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_PROFILE_LINK_CLASS,
  SOCIAL_PROFILE_LINK_TEXT_CLASS,
  SOCIAL_PROFILE_LINKS_CLASS,
  SOCIAL_PROFILE_LINKS_SHEET_CLASS,
  SOCIAL_PROFILE_LINKS_SHEET_LINK_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_ICON_SIZE_PROFILE_LINK, SOCIAL_ICON_SIZE_PROFILE_WEBSITE } from "@/lib/social-icons";
import { socialProfileLinkFaceText, socialProfilePublicLinks } from "@/lib/social-profile-links";
import { SocialProfileLinkRow, SocialProfileLinksSheet } from "./social-profile-links";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "social-profile-links.tsx"), "utf8");

describe("SocialProfileLinkRow", () => {
  it("omits the block when empty and renders a quiet icon rail for two or fewer", () => {
    expect(renderToStaticMarkup(<SocialProfileLinkRow links={[]} />)).toBe("");

    const html = renderToStaticMarkup(
      <SocialProfileLinkRow
        links={socialProfilePublicLinks({
          websiteUrl: "https://instagram.com/ada",
          imdbUrl: "https://www.imdb.com/name/nm0000158/",
        })}
      />,
    );
    expect(html).toContain("data-social-profile-links");
    expect(html).toContain(SOCIAL_PROFILE_LINKS_CLASS);
    expect(html).toContain(SOCIAL_PROFILE_LINK_CLASS);
    expect(SOCIAL_PROFILE_LINKS_CLASS).toContain("flex-wrap");
    expect(SOCIAL_PROFILE_LINKS_CLASS).not.toContain("truncate");
    expect(SOCIAL_PROFILE_LINKS_CLASS).not.toContain("flex-nowrap");
    expect(html).toContain('data-social-profile-link="instagram"');
    expect(html).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(html).toContain('aria-label="Instagram"');
    expect(html).toContain('data-social-profile-link="imdb"');
    expect(html).toContain('data-social-profile-link-glyph="film-slate"');
    expect(html).toContain(`aria-label="${SOCIAL.profile.imdb}"`);
    expect(html).toContain(`width="${SOCIAL_ICON_SIZE_PROFILE_LINK}"`);
    expect(html).toContain(`height="${SOCIAL_ICON_SIZE_PROFILE_LINK}"`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain(">instagram.com/ada<");
    expect(html).not.toContain(">imdb.com/name/nm0000158<");
    expect(html).not.toContain(">website<");
    expect(html).not.toContain("data-social-profile-links-more");
  });

  it("keeps links quiet: website as host text beside a globe, socials icon-only in ink-3 (Stage lock)", () => {
    expect(SOCIAL_ICON_SIZE_PROFILE_LINK).toBe(15);
    expect(SOCIAL_ICON_SIZE_PROFILE_WEBSITE).toBe(14);
    const link = SOCIAL_PROFILE_LINK_CLASS.split(/\s+/);
    // 32 hits on desktop, the 44 touch floor on phone; ink-3, no fill, no border.
    expect(link).toEqual(expect.arrayContaining(["size-11", "md:size-8", "text-ink-3"]));
    const text = SOCIAL_PROFILE_LINK_TEXT_CLASS.split(/\s+/);
    expect(text).toEqual(expect.arrayContaining(["min-h-11", "md:min-h-8", "text-[length:var(--text-xs)]", "text-ink-2"]));
    for (const value of [SOCIAL_PROFILE_LINK_CLASS, SOCIAL_PROFILE_LINK_TEXT_CLASS, SOCIAL_PROFILE_LINKS_CLASS]) {
      expect(value).not.toMatch(/(?:^|\s)(?:bg-|border(?:-|\s|$)|shadow-|t-heading|font-semibold)/);
    }
    expect(socialProfileLinkFaceText({ url: "https://www.ada.example/press", platform: "website" })).toBe("ada.example");
    expect(socialProfileLinkFaceText({ url: "https://instagram.com/ada", platform: "instagram" })).toBeNull();
    expect(socialProfileLinkFaceText({ url: "https://www.imdb.com/name/nm1/", platform: "imdb" })).toBeNull();

    const html = renderToStaticMarkup(
      <SocialProfileLinkRow
        links={socialProfilePublicLinks({ urls: ["https://ada.example/press", "https://instagram.com/ada"] })}
      />,
    );
    const anchor = (platform: string) => {
      const at = html.indexOf(`data-social-profile-link="${platform}"`);
      return html.slice(html.lastIndexOf("<a", at), html.indexOf("</a>", at));
    };
    const website = anchor("website");
    expect(website).toContain(`class="${SOCIAL_PROFILE_LINK_TEXT_CLASS}"`);
    expect(website).toContain('data-social-profile-link-glyph="globe"');
    expect(website).toContain(`width="${SOCIAL_ICON_SIZE_PROFILE_WEBSITE}"`);
    expect(website).toContain(">ada.example</span>");
    // The visible host is the accessible name: no aria-label over it.
    expect(website).not.toContain("aria-label");
    const instagram = anchor("instagram");
    expect(instagram).toContain('aria-label="Instagram"');
    expect(instagram).toContain(`width="${SOCIAL_ICON_SIZE_PROFILE_LINK}"`);
    expect(instagram).not.toContain("<span");
  });

  it("shows every public link on the face and does not collapse the rest behind +N", () => {
    const html = renderToStaticMarkup(
      <SocialProfileLinkRow
        links={socialProfilePublicLinks({
          urls: [
            "https://ada.example",
            "https://instagram.com/ada",
            "https://youtube.com/@ada",
            "https://www.imdb.com/name/nm0000158/",
          ],
        })}
      />,
    );
    expect(html).toContain('data-social-profile-link-glyph="globe"');
    expect(html).toContain(">ada.example</span>");
    expect(html).toContain('data-social-profile-link-glyph="instagram-logo"');
    expect(html).toContain('aria-label="Instagram"');
    expect(html).toContain('data-social-profile-link-glyph="youtube-logo"');
    expect(html).toContain('aria-label="YouTube"');
    expect(html).toContain('data-social-profile-link-glyph="film-slate"');
    expect(html).toContain(`aria-label="${SOCIAL.profile.imdb}"`);
    expect(html).not.toContain(">instagram.com/ada<");
    expect(html).not.toContain(">youtube.com/@ada<");
    expect(html).not.toContain(">imdb.com/name/nm0000158<");
    expect(html).not.toContain("data-social-profile-links-more");
    expect(html).not.toContain(">+2<");
    expect(html).not.toContain("data-social-profile-links-sheet");
    expect(src).not.toContain("socialProfileLinksFace");
    expect(src).not.toContain("data-social-profile-links-more");
    expect(SOCIAL_PROFILE_LINKS_CLASS).toContain("flex-wrap");
  });

  it("uses a globe and the host name as text for an unknown link", () => {
    const html = renderToStaticMarkup(
      <SocialProfileLinkRow
        links={socialProfilePublicLinks({
          websiteUrl: "https://ada.example/press",
        })}
      />,
    );
    expect(html).toContain('data-social-profile-link="website"');
    expect(html).toContain('data-social-profile-link-glyph="globe"');
    expect(html).toContain(">ada.example</span>");
    expect(html).not.toContain(">website<");
    expect(html).not.toContain(">https://ada.example/press<");
  });

  it("lists every link as readable host text in the Links sheet", () => {
    const links = socialProfilePublicLinks({
      urls: [
        "https://instagram.com/ada",
        "https://youtube.com/@ada",
        "https://x.com/ada",
      ],
    });
    const html = renderToStaticMarkup(
      <SocialProfileLinksSheet
        links={links}
        open
        onClose={() => undefined}
        titleId="links-sheet"
      />,
    );
    expect(html).toContain("data-social-profile-links-sheet");
    expect(html).toContain(APP_SHEET_HOST_CLASS);
    expect(html).toContain(SOCIAL_PROFILE_LINKS_SHEET_CLASS);
    expect(html).toContain(SOCIAL_PROFILE_LINKS_SHEET_LINK_CLASS);
    expect(html).toContain(SOCIAL.profile.links);
    expect(html).toContain(SOCIAL.profile.shareClose);
    expect(html).toContain(">instagram.com/ada<");
    expect(html).toContain(">youtube.com/@ada<");
    expect(html).toContain(">x.com/ada<");
    expect(html).toContain("data-social-profile-links-sheet-link");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("data-social-profile-link-glyph");
    expect(
      renderToStaticMarkup(
        <SocialProfileLinksSheet
          links={links}
          open={false}
          onClose={() => undefined}
          titleId="links-sheet"
        />,
      ),
    ).toBe("");

    expect(src).toContain("createPortal");
    expect(src).toContain("Escape");
    expect(src).toContain("SOCIAL_PROFILE_LINKS_CLASS");
    expect(src).toContain("socialProfileLinkGlyph");
    expect(src).toContain("InstagramLogo");
    expect(src).toContain("GlobeSimple");
    expect(src).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(src).not.toContain("inline-flex size-6");
  });
});
