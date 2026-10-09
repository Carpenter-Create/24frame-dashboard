import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { SOCIAL } from "@/lib/social";
import { ensureOwnSocialProfileResult } from "@/lib/social-profile";
import SocialProfileEditPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/s3-avatars", () => ({
  signedAvatarUrl: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/social-profile", () => ({
  ensureOwnSocialProfileResult: vi.fn(),
}));
vi.mock("@/app/(app)/social/actions", () => ({
  createSocialProfile: vi.fn(),
  presignSocialMediaUpload: vi.fn(),
  saveSocialWelcomeVideo: vi.fn(),
  clearSocialWelcomeVideo: vi.fn(),
}));
vi.mock("@/app/(app)/account/actions", () => ({
  uploadAccountPhoto: vi.fn(),
  removeAccountPhoto: vi.fn(),
}));

function ctx() {
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: [],
    orgs: [],
    activeOrg: null,
    activeRole: null,
    canOperate: false,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

const ensured = {
  id: "u1",
  handle: "ada",
  display_name: "Ada Lovelace",
  status: "active",
  bio: "Writes engines.",
};

describe("Social profile edit page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signedAvatarUrl).mockResolvedValue(null);
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: ensured,
      error: null,
    });
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: { avatar_key: null }, error: null })),
    };
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as never);
  });

  it("renders the locked Edit profile sheet", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = renderToStaticMarkup(await SocialProfileEditPage());
    expect(html).toContain("data-social-profile-edit");
    expect(html).toContain(SOCIAL.profile.edit);
    expect(html).toContain(SOCIAL.profile.username);
    expect(html).not.toContain("https://24frame.co/@ada");
    expect(html).toContain(SOCIAL.profile.roles);
    expect(html).toContain(SOCIAL.profile.rolesAdd);
    expect(html).toContain("data-social-profile-edit-roles-open");
    expect(html).toContain("data-social-profile-edit-topics-open");
    expect(html).toContain("data-social-profile-edit-imdb-open");
    expect(html).toContain("data-social-profile-edit-links-open");
    expect(html).toContain(SOCIAL.profile.linksAdd);
    expect(html).not.toContain(SOCIAL.profile.addLink);
    expect(html).not.toContain("Education");
  });

  it("loads saved website_url values into the Links fields", async () => {
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: {
        ...ensured,
        website_url: JSON.stringify(["https://instagram.com/ada", "https://youtube.com/@ada"]),
      },
      error: null,
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = renderToStaticMarkup(await SocialProfileEditPage());
    expect(html).toContain("data-social-profile-edit-links-open");
    expect(html).toContain("instagram.com/ada +1");
    expect(html).not.toContain('value="https://instagram.com/ada"');
    expect(html).not.toContain("data-social-profile-edit-link-remove");
  });

  it("redirects home when ensure has no profile", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(ensureOwnSocialProfileResult).mockResolvedValue({
      profile: null,
      error: "null value",
    });
    await expect(SocialProfileEditPage()).rejects.toThrow("REDIRECT:/social/profile");
  });
});
