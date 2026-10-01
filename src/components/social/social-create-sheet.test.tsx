import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

import { SocialCreateSheet, SocialCreateTiles } from "./social-create-sheet";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_CREATE_MEDIA_ACCEPT } from "@/lib/social-create-media";
import { SOCIAL_CREATE_TILES } from "@/lib/social-create-sheet";
import { SOCIAL_ICON_SIZE_CREATE_TILE } from "@/lib/social-icons";

describe("SocialCreateSheet", () => {
  it("opens a light Create sheet with Media · Write · Go live and no descriptions", () => {
    const html = renderToStaticMarkup(
      createElement(SocialCreateSheet, {
        defaultOpen: true,
        trigger: createElement(
          "button",
          { "data-social-create-sheet": "", type: "button" },
          "Create",
        ),
      }),
    );
    expect(html).toContain("data-social-create-sheet");
    expect(html).toContain('data-social-create-sheet-presentation="responsive"');
    expect(html).toContain("data-social-create-tiles");
    expect(html).toContain('role="dialog"');
    expect(html).toContain(SOCIAL.create.title);
    expect(html).toContain(SOCIAL.create.close);
    expect(html).toContain('data-social-create-tile="media"');
    expect(html).toContain("data-social-create-media-tile");
    expect(html).toContain("data-social-create-media-input");
    expect(html).toContain(`accept="${SOCIAL_CREATE_MEDIA_ACCEPT}"`);
    expect(html).toContain('data-social-create-tile="write"');
    expect(html).toContain('data-social-create-tile="live"');
    expect(html).not.toContain('data-social-create-tile="photo"');
    expect(html).not.toContain('data-social-create-tile="video"');
    expect(html).toContain(SOCIAL.create.media);
    expect(html).toContain(SOCIAL.create.write);
    expect(html).toContain(SOCIAL.create.goLive);
    expect(html).toContain("/social/create?kind=media");
    expect(html).not.toContain("/social/create?kind=photo");
    expect(html).not.toContain("/social/create?kind=video");
    expect(html).toContain("/social/create?kind=text");
    expect(html).toContain("/social/live");
    expect(html).toContain('data-social-icon="image"');
    expect(html).toContain('data-social-icon="pencil-simple"');
    expect(html).toContain('data-social-icon="broadcast"');
    expect(html).toContain("data-social-create-tile-well");
    expect(html).toContain(`width="${SOCIAL_ICON_SIZE_CREATE_TILE}"`);
    expect(html).not.toContain("Drop a still");
    expect(html).not.toContain("in-app recorder");
    expect(html).not.toContain("data-social-create-fab");
    expect(html).not.toContain("MenuSurface");
    expect(html).not.toContain("backdrop-blur");
    expect(html).not.toContain("Photos");
    expect(html).not.toContain("Camera");
    expect(html).not.toContain("Attachment");
  });

  it("renders the tile primitive without a lookalike fork", () => {
    const html = renderToStaticMarkup(createElement(SocialCreateTiles));
    expect(html).toContain("data-social-create-tiles");
    expect(SOCIAL_CREATE_TILES).toHaveLength(3);
    for (const tile of SOCIAL_CREATE_TILES) {
      expect(html).toContain(`data-social-create-tile="${tile.id}"`);
      expect(html).toContain(tile.label);
    }
  });
});
