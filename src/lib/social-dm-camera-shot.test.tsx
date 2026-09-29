import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/social/actions", () => ({
  sendSocialDm: vi.fn(),
  openSocialDm: vi.fn(),
  setSocialDmTitle: vi.fn(),
  createSocialGroup: vi.fn(),
  createSocialProfile: vi.fn(),
  joinSocialGroup: vi.fn(),
  updateSocialBio: vi.fn(),
}));
vi.mock("@/app/(app)/account/actions", () => ({
  uploadAccountPhoto: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

import { SocialDmCompose } from "@/components/social/social-dm-compose";

describe("DM thread composer camera", () => {
  it("places a 24px camera far-right, after send", () => {
    const html = renderToStaticMarkup(<SocialDmCompose conversationId="thread-preview" />);
    const fieldAt = html.indexOf('id="social-dm-body"');
    const cameraAt = html.indexOf('data-social-dm-camera=""');
    const sendAt = html.indexOf('type="submit"');
    expect(fieldAt).toBeGreaterThan(-1);
    expect(sendAt).toBeGreaterThan(fieldAt);
    expect(cameraAt).toBeGreaterThan(sendAt);
    expect(html).toContain('width="24"');
    expect(html).toContain('height="24"');
    expect(html).toContain('data-social-icon="camera"');
    expect(html).toContain("size-10");
    expect(html).toContain("text-ink");
    expect(html).toContain('aria-label="Add photo or video"');
    expect(html).toContain('type="file"');
    expect(html).not.toContain("capture=");
  });
});
