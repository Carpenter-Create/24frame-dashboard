import { socialImdbNameId } from "@/lib/social-imdb";
import { SOCIAL } from "@/lib/social";

// External profile links. Persist the ordered list on profiles.website_url
// (identity-spine text): one URL stays a URL; two or more is a JSON array.
// Face chrome is a quiet icon rail (Adam 2026-09-22): known hosts map to
// a Phosphor glyph; unknown hosts use a globe (Stage lock 2026-10-04: the
// globe sits beside the website's host as quiet text). Accessible name is the
// platform label, or the host when the platform is website. Every public
// link icon is on the face, up to SOCIAL_PROFILE_LINKS_MAX. No +N collapse.
// The Links sheet and the Edit Profile drill keep readable host labels.
// Omit when empty.
// IMDb Phase 1 claim merges into this list so the name page is not shown twice.
// Phosphor has no IMDb or Vimeo mark — film-slate and play stand in.
// Do not add platforms that this module does not already classify.
// Do not clear or rewrite imdb_url from this module.

export const SOCIAL_PROFILE_LINKS_MAX = 8;

export const SOCIAL_LINK_PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "x",
  "linkedin",
  "tiktok",
  "vimeo",
  "imdb",
  "threads",
  "website",
] as const;

export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];

export type SocialProfileLink = {
  url: string;
  platform: SocialLinkPlatform;
  label: string;
};

const PLATFORM_HOSTS: Record<Exclude<SocialLinkPlatform, "website">, readonly string[]> = {
  instagram: ["instagram.com", "instagr.am"],
  youtube: ["youtube.com", "youtu.be", "m.youtube.com"],
  facebook: ["facebook.com", "fb.com", "fb.me", "m.facebook.com"],
  x: ["x.com", "twitter.com"],
  linkedin: ["linkedin.com"],
  tiktok: ["tiktok.com"],
  vimeo: ["vimeo.com"],
  imdb: ["imdb.com"],
  threads: ["threads.net", "threads.com"],
};

export const SOCIAL_LINK_PLATFORM_LABEL: Record<SocialLinkPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  imdb: SOCIAL.profile.imdb,
  threads: "Threads",
  website: "Website",
};

// Quiet glyphs only. Names match the face renderer. Not brand color.
export const SOCIAL_PROFILE_LINK_GLYPHS = {
  instagram: "instagram-logo",
  youtube: "youtube-logo",
  facebook: "facebook-logo",
  x: "x-logo",
  linkedin: "linkedin-logo",
  tiktok: "tiktok-logo",
  vimeo: "play",
  imdb: "film-slate",
  threads: "threads-logo",
  website: "globe",
} as const satisfies Record<SocialLinkPlatform, string>;

export type SocialProfileLinkGlyphName =
  (typeof SOCIAL_PROFILE_LINK_GLYPHS)[SocialLinkPlatform];

export function socialProfileLinkGlyph(platform: SocialLinkPlatform): SocialProfileLinkGlyphName {
  return SOCIAL_PROFILE_LINK_GLYPHS[platform];
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function parseSocialExternalUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;
  return parsed.href;
}

export function socialLinkPlatform(url: string): SocialLinkPlatform {
  const host = hostnameOf(url);
  for (const platform of SOCIAL_LINK_PLATFORMS) {
    if (platform === "website") continue;
    if (PLATFORM_HOSTS[platform].some((known) => host === known || host.endsWith(`.${known}`))) {
      return platform;
    }
  }
  return "website";
}

export function parseSocialWebsiteUrlField(raw: string | null | undefined): string[] {
  const text = (raw ?? "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) return [];
      return uniqueUrls(parsed.map((item) => parseSocialExternalUrl(String(item ?? ""))));
    } catch {
      return [];
    }
  }
  const single = parseSocialExternalUrl(text);
  return single ? [single] : [];
}

export function composeSocialWebsiteUrlField(urls: readonly string[]): string | null {
  const unique = uniqueUrls(urls.map((url) => parseSocialExternalUrl(url)));
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0] ?? null;
  return JSON.stringify(unique);
}

export function parseSocialProfileLinksWrite(raw: unknown): {
  urls: string[];
  error: string | null;
} {
  const values = linkWriteValues(raw);
  if (values === null) return { urls: [], error: "invalid" };
  const urls: string[] = [];
  for (const item of values) {
    const text = String(item ?? "").trim();
    if (!text) continue;
    const url = parseSocialExternalUrl(text);
    if (!url) return { urls: [], error: "invalid" };
    if (!urls.includes(url)) urls.push(url);
    if (urls.length > SOCIAL_PROFILE_LINKS_MAX) return { urls: [], error: "limit" };
  }
  return { urls, error: null };
}

export function socialProfilePublicLinks(input: {
  urls?: readonly string[] | null;
  websiteUrl?: string | null;
  imdbUrl?: string | null;
}): SocialProfileLink[] {
  const urls = [
    ...(input.urls ?? parseSocialWebsiteUrlField(input.websiteUrl)),
  ];
  const out: SocialProfileLink[] = [];
  const seen = new Set<string>();
  for (const raw of [...urls, input.imdbUrl ?? ""]) {
    const url = parseSocialExternalUrl(raw ?? "");
    if (!url) continue;
    const platform = socialLinkPlatform(url);
    const key = linkDedupeKey(url, platform);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url, platform, label: socialProfileLinkReadableLabel(url, platform) });
  }
  return out;
}

// Sheet and Edit Profile Links row. Not the face glyph.
export function socialProfileLinkReadableLabel(
  url: string,
  platform: SocialLinkPlatform = socialLinkPlatform(url),
): string {
  if (platform === "website") return "website";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "").replace(/^\//, "");
    return path ? `${host}/${path}` : host;
  } catch {
    return "website";
  }
}

// Stage lock face text (docs/design-locks/social-profile-stage-lock-v1.md):
// links are found, never the focus. A website shows its host as quiet text
// beside a globe; every known platform stays icon-only (null).
export function socialProfileLinkFaceText(link: Pick<SocialProfileLink, "url" | "platform">): string | null {
  if (link.platform !== "website") return null;
  return hostnameOf(link.url) || null;
}

// Face icon accessible name. Known hosts use the platform label.
// Unknown hosts use the hostname so two websites stay distinct.
export function socialProfileLinkAccessibleName(
  url: string,
  platform: SocialLinkPlatform = socialLinkPlatform(url),
): string {
  if (platform !== "website") return SOCIAL_LINK_PLATFORM_LABEL[platform];
  return hostnameOf(url) || SOCIAL_LINK_PLATFORM_LABEL.website;
}

function uniqueUrls(urls: readonly (string | null)[]): string[] {
  const out: string[] = [];
  for (const url of urls) {
    if (!url || out.includes(url)) continue;
    out.push(url);
  }
  return out;
}

function linkWriteValues(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return text.split(/\n+/);
}

function linkDedupeKey(url: string, platform: SocialLinkPlatform): string {
  if (platform === "imdb") {
    return `imdb:${socialImdbNameId(url) ?? url}`;
  }
  return `${platform}:${url}`;
}

export function socialProfileLinkError(code: string | null): string | null {
  if (code === "invalid") return SOCIAL.profile.linkInvalid;
  if (code === "limit") return SOCIAL.profile.linkLimit;
  return null;
}

export function socialProfileLinksRowSummary(raw: readonly string[]): string {
  const urls = uniqueUrls(raw.map((url) => parseSocialExternalUrl(url)));
  if (urls.length === 0) {
    const draft = raw.map((item) => item.trim()).find(Boolean);
    return draft || SOCIAL.profile.linksAdd;
  }
  const first = socialProfileLinkReadableLabel(urls[0] ?? "");
  if (urls.length === 1) return first;
  return SOCIAL.profile.linksMore
    .replace("{first}", first)
    .replace("{n}", String(urls.length - 1));
}
