import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/app-shell-chrome", () => ({
  loadAppShellChrome: () => new Promise(() => {}),
  appShellUnread: () => new Promise(() => {}),
  appShellActivityItems: () => new Promise(() => {}),
  appShellDmUnread: () => new Promise(() => {}),
  enforceAppAccess: vi.fn(),
}));
vi.mock("@/components/chrome/app-shell", () => ({ AppShell: () => null }));

import AppLayout from "./layout";

const layoutSrc = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("AppLayout streaming shell", () => {
  it("returns the shell immediately without awaiting chrome", () => {
    const tree = AppLayout({ children: "page" });
    expect(tree).toBeTruthy();
    expect(layoutSrc).toContain("export default function AppLayout");
    expect(layoutSrc).not.toContain("export default async function AppLayout");
    expect(layoutSrc).toContain("loadAppShellChrome()");
    expect(layoutSrc).toContain("appShellActivityItems(chrome)");
    // The Messages dot's DM unread total streams the same way (H register).
    expect(layoutSrc).toContain("dmUnread={appShellDmUnread(chrome)}");
    expect(layoutSrc).toContain("<AppShell");
    expect(layoutSrc).toContain("{children}");
  });
});
