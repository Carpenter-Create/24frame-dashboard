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

import { SocialCreateFan } from "./social-create-fan";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_CREATE_MEDIA_ACCEPT } from "@/lib/social-create-media";
import { HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT } from "@/lib/house-phone-shell";

describe("SocialCreateFan", () => {
  it("fans Media · Write · Go live from the dock plus and does not open a sheet", () => {
    const html = renderToStaticMarkup(
      createElement(SocialCreateFan, {
        defaultOpen: true,
        trigger: createElement(
          "button",
          { type: "button", "aria-label": "Create", "data-social-create-fan-trigger": "" },
          "plus",
        ),
      }),
    );
    expect(html).toContain('data-social-create-fan-trigger=""');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-social-create-fan-plus=""');
    expect(html).toContain("data-open");
    expect(html).toContain('role="menu"');
    expect(html).toContain(SOCIAL.create.title);
    expect(html).toContain('data-social-create-fan-item="media"');
    expect(html).toContain('data-social-create-fan-item="write"');
    expect(html).toContain('data-social-create-fan-item="live"');
    expect(html).toContain(SOCIAL.create.media);
    expect(html).toContain(SOCIAL.create.write);
    expect(html).toContain(SOCIAL.create.goLive);
    expect(html).toContain('href="/social/create?kind=media"');
    expect(html).toContain('href="/social/create?kind=text"');
    expect(html).toContain('href="/social/create/live"');
    expect(html).toContain("data-social-create-media-input");
    expect(html).toContain(`accept="${SOCIAL_CREATE_MEDIA_ACCEPT}"`);
    expect(html).toContain('data-social-create-fan-scrim=""');
    expect(html).toContain('data-social-create-fan-label=""');
    expect(html).toMatch(
      /data-social-create-fan-label="" class="[^"]*rounded-full[^"]*bg-surface[^"]*text-ink/,
    );
    expect(html).toContain("bg-ink/25");
    expect(html).toContain("backdrop-blur-sm");
    expect(html).toMatch(/data-social-create-fan-scrim="" data-open=""/);
    expect(html).toContain("aria-label=\"Close\"");
    expect(html).not.toContain("bg-transparent");
    expect(html).not.toContain("bg-ink/40");
    expect(html).toMatch(/--social-create-fan-x:\s*-71px/);
    expect(html).toMatch(/--social-create-fan-y:\s*-100px/);
    expect(html).toMatch(/--social-create-fan-x:\s*71px/);
    expect(html).toMatch(/bottom-\[calc\(100%\+var\(--space-1\)\)\]/);
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT).toBe("regular");
    expect(html).not.toContain("data-social-create-sheet");
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("bg-accent");
    expect(html).not.toContain("WORKSPACES");
    expect(html).not.toContain("rounded-t-[16px]");
  });

  it("keeps the fan unmounted until the plus opens", () => {
    const html = renderToStaticMarkup(
      createElement(SocialCreateFan, {
        trigger: createElement("button", { type: "button", "aria-label": "Create" }, "plus"),
      }),
    );
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("data-social-create-fan-item");
    expect(html).not.toContain("data-social-create-fan-scrim");
    expect(html).not.toContain(SOCIAL.create.goLive);
    expect(html).toContain("data-social-create-media-input");
  });
});
