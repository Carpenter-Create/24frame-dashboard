import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () =>
    function CaptionWindowStub() {
      return createElement("div", { "data-caption-window-stub": "" });
    },
}));

import { SocialPostCaptionHost } from "./social-post-caption-host";

// The one Edit caption host on the Social layout
// (docs/design-locks/social-post-caption-window-lock-v1.md).

const hostSrc = readFileSync("src/components/social/social-post-caption-host.tsx", "utf8");
const layoutSrc = readFileSync("src/app/(app)/social/layout.tsx", "utf8");

function section(from: string, to: string): string {
  const start = hostSrc.indexOf(from);
  expect(start, from).toBeGreaterThan(-1);
  const end = hostSrc.indexOf(to, start + from.length);
  expect(end, to).toBeGreaterThan(start);
  return hostSrc.slice(start, end);
}

describe("Edit caption host (social-post-caption-window-lock-v1)", () => {
  it("renders the page with no window until an owner asks for one", () => {
    const html = renderToStaticMarkup(
      <SocialPostCaptionHost>
        <p data-page="">feed</p>
      </SocialPostCaptionHost>,
    );
    expect(html).toBe('<p data-page="">feed</p>');
    expect(html).not.toContain("data-caption-window-stub");
    expect(html).not.toContain("data-social-caption-edit");
  });

  it("sits once on the Social layout, around the page", () => {
    expect(layoutSrc).toContain('from "@/components/social/social-post-caption-host"');
    expect(layoutSrc).toContain("<SocialPostCaptionHost>{children}</SocialPostCaptionHost>");
  });

  it("owns the one ?caption entry, which opens nothing on arrival", () => {
    expect(hostSrc.match(/useHouseWindowEntry</g)?.length).toBe(1);
    expect(hostSrc).toContain("flag: SOCIAL_POST_CAPTION_ENTRY_FLAG,");
    expect(hostSrc).toContain("opensOnArrival: () => false,");
    expect(hostSrc).not.toContain("opensOnArrival: () => true");
  });

  it("opens one window at a time and waits for a moving address or a landing close", () => {
    expect(hostSrc).toContain("houseAddressSettled(house.href, `${house.nextPathname}${house.nextSearch}`)");
    const open = section("function open(request", "function close(key");
    expect(open).toContain("if (targetRef.current) return;");
    expect(open).toContain("if (!latest.current.settled || closingRef.current) {");
    expect(open).toContain("queuedRef.current = request;");
    // The baseline is taken once, as the caption shows on this device.
    expect(open).toContain("socialPostLiveBody(request.postId, request.serverBody)");
    // A queued open runs only while its card is still on the page.
    const drain = section("function drain()", "function fail(");
    expect(drain).toContain("if (queued?.trigger?.isConnected) open(queued);");
  });

  it("routes a failed save: skip a removed post, reopen in place, or wait for the open window", () => {
    const fail = section("function fail(", "function save(");
    expect(fail).toContain("if (!mountedRef.current) return;");
    expect(fail).toContain("if (readSocialPostHidden(request.postId)) return;");
    expect(fail).toContain("if (current?.postId === request.postId) {");
    expect(fail).toContain('entry.reopenAfterFailure("caption");');
    expect(fail).toContain("failedRef.current.push(next);");
    // The queue drains once the close's Back has landed (never racing it).
    const close = section("function close(key", "function landed()");
    expect(close).toContain("entry.close(key, landed);");
    const landed = section("function landed()", "function drain()");
    expect(landed).toContain("closingRef.current = false;");
    expect(landed).toContain("latest.current.drain();");
    const drain = section("function drain()", "function fail(");
    expect(drain).toContain("failedRef.current.shift()");
    expect(drain).toContain("if (readSocialPostHidden(failed.postId)) continue;");
  });

  it("saves through the Latest runner, then closes; no page refresh", () => {
    const save = section("function save(", "// Latest handlers");
    expect(save).toContain("saveSocialPostCaption({");
    expect(save).toContain('queryKey: ["social", "following-wall"]');
    expect(save).toContain("onFailed: (error) => fail(saving, draft, error),");
    expect(save.indexOf("saveSocialPostCaption(")).toBeLessThan(save.indexOf("close(key);"));
    expect(hostSrc).not.toContain("router.refresh");
    expect(hostSrc).not.toContain("useRouter");
  });

  it("loads the window on first use, never with the layout", () => {
    expect(hostSrc).toContain('dynamic(() =>\n  import("./social-post-caption-window")');
    expect(hostSrc).toContain('void import("./social-post-caption-window");');
    expect(hostSrc).not.toMatch(/from ["'][^"']*social-post-caption-window["']/);
  });
});
