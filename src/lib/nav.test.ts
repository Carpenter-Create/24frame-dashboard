import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BookOpen,
  FilmSlate,
  PaperPlaneTilt,
  Pulse,
  SquaresFour,
  ChartBar,
  Storefront,
  Tray,
  CheckCircle,
  Users,
  Wallet,
} from "@phosphor-icons/react";

import {
  GC_NAV,
  NAV,
  SOCIAL_DESKTOP_NAV,
  SOCIAL_NAV,
  STAFF_RAIL_EYEBROW,
  clientNavCurrent,
  isClientNavActive,
  isHouseAiNavItem,
  isPhosphorNavItem,
  isSocialCreateDest,
  isSocialTabActive,
  EDUCATION_MANAGE_NAV,
  EDUCATION_NAV,
  mobileNavDestinations,
  railDestinations,
} from "./nav";

const navSrc = readFileSync("src/lib/nav.ts", "utf8");

describe("client NAV", () => {
  it("keeps Dashboard at /dashboard and never exposes operator routes", () => {
    const hrefs = NAV.map((item) => item.href);
    expect(hrefs).toEqual([
      "/aggregation/dashboard",
      "/aggregation/titles",
      "/aggregation/attention",
      "/aggregation/reports",
    ]);
    expect(hrefs).not.toContain("/activity");
    expect(hrefs).not.toContain("/aggregation/activity");
    expect(hrefs).not.toContain("?ai=1");
    expect(hrefs).not.toContain("/deliveries");
    expect(hrefs).not.toContain("/catalog-health");
    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/finance");
    expect(hrefs).not.toContain("/gc/deliveries");
    expect(hrefs).not.toContain("/queue");
    expect(hrefs).not.toContain("/avails");
    expect(hrefs).not.toContain("/vendors");
    expect(hrefs).not.toContain("/channels");
    expect(hrefs).not.toContain("/gc/clients");
    expect(hrefs).not.toContain("/gc/finance");
    expect(hrefs).not.toContain("/news");
    expect(hrefs).not.toContain("/home/news");
    expect(hrefs).not.toContain("/home");
  });

  it("marks Dashboard current on `/` and canonical Aggregation paths only", () => {
    expect(clientNavCurrent("/").label).toBe("Dashboard");
    expect(clientNavCurrent("/aggregation/dashboard").label).toBe("Dashboard");
    expect(isClientNavActive("/", NAV[0])).toBe(true);
    expect(isClientNavActive("/dashboard", NAV[0])).toBe(false);
    expect(isClientNavActive("/aggregation/dashboard", NAV[0])).toBe(true);
    expect(isClientNavActive("/titles", NAV[0])).toBe(false);
    expect(clientNavCurrent("/aggregation/titles").label).toBe("Titles");
    expect(clientNavCurrent("/aggregation/titles/abc").label).toBe("Titles");
    expect(clientNavCurrent("/aggregation/attention").label).toBe("Recent activity");
    expect(clientNavCurrent("/activity").label).toBe("Dashboard");
    expect(clientNavCurrent("/aggregation/activity").label).toBe("Dashboard");
    expect(NAV.map((item) => item.label)).not.toContain("Activity");
    expect(clientNavCurrent("/aggregation/reports").label).toBe("Reports");
    expect(clientNavCurrent("/aggregation/reports/abc").label).toBe("Reports");
    expect(clientNavCurrent("/titles").label).toBe("Dashboard");
    expect(clientNavCurrent("/reports").label).toBe("Dashboard");
    expect(NAV.every((item) => !isHouseAiNavItem(item))).toBe(true);
    expect(clientNavCurrent("/queue").label).toBe("Dashboard");
  });

  it("keeps Ask 24Frame AI off the Aggregation rail — overlay trigger, not a dest", () => {
    expect(NAV.some(isHouseAiNavItem)).toBe(false);
    expect(NAV.map((item) => item.label)).not.toContain("Ask 24Frame AI");
    expect(NAV.map((item) => item.href)).not.toContain("?ai=1");
    expect(NAV.filter(isHouseAiNavItem)).toHaveLength(0);
    expect(NAV.map((item) => item.label)).not.toContain("Messages");
    expect(NAV.map((item) => item.label)).not.toContain("Groups");
    expect(NAV.map((item) => item.label)).not.toContain("Casting");
    expect(NAV.map((item) => item.label)).not.toContain("Social");
    expect(navSrc).toContain('family: "house-ai"');
    expect(navSrc).toContain("never an Aggregation");
    expect(navSrc).not.toContain("icon: Sparkle");
    expect(navSrc).not.toContain("icon: Sparkles");
    expect(navSrc).not.toContain("Sparkle");
    expect(navSrc).not.toContain("markSrc");
    expect(navSrc).not.toContain("ASK_GLOBEE_NAV_MARK");
    expect(navSrc).not.toContain("isNavImageItem");
    expect(navSrc).not.toContain("MessageSquare");
    expect(navSrc).not.toContain("NavImageItem");
  });

  it("locks Aggregation rail glyphs to Phosphor 75:5 / 61:2 except the house AI mark — SOCIAL_NAV is Phosphor", () => {
    expect(NAV.filter(isPhosphorNavItem).map((item) => item.icon)).toEqual([
      SquaresFour,
      FilmSlate,
      Pulse,
      ChartBar,
    ]);
    expect(GC_NAV.map((item) => item.icon)).toEqual([
      Tray,
      CheckCircle,
      PaperPlaneTilt,
      Storefront,
      Wallet,
      Users,
    ]);
    expect(NAV.every((item) => item.family === "phosphor")).toBe(true);
    expect(NAV.filter(isHouseAiNavItem)).toHaveLength(0);
    expect(GC_NAV.every((item) => item.family === "phosphor")).toBe(true);
    expect(SOCIAL_NAV.every((item) => item.family === "phosphor")).toBe(true);
    expect(navSrc).not.toContain("LayoutDashboard");
    expect(navSrc).not.toContain("Clapperboard");
    expect(navSrc).toContain("family: \"phosphor\"");
    expect(navSrc).not.toContain("family: \"lucide\"");
    expect(navSrc).toContain("family: \"house-ai\"");
  });
});

describe("Ask Globee nav mark", () => {
  it("drops the bee PNGs and the image mark path", () => {
    expect(() => readFileSync("public/ask-globee/ask-globee-16.png")).toThrow();
    expect(() => readFileSync("public/ask-globee/ask-globee-64.png")).toThrow();
    expect(() => readFileSync("src/components/chrome/nav-mark.tsx")).toThrow();
    expect(navSrc).not.toContain("ask-globee-16.png");
    expect(navSrc).not.toContain("ask-globee-64.png");
  });
});

describe("GC_NAV", () => {
  it("adds staff-only Licensing Status between Queue and Channels, with Clients last", () => {
    expect(GC_NAV.map((item) => ({ label: item.label, href: item.href }))).toEqual([
      { label: "Queue", href: "/staff/queue" },
      { label: "Avails", href: "/staff/avails" },
      { label: "Licensing Status", href: "/staff/gc/deliveries" },
      { label: "Channels", href: "/staff/channels" },
      { label: "Finance", href: "/staff/gc/finance" },
      { label: "Clients", href: "/staff/gc/clients" },
    ]);
    expect(GC_NAV.map((item) => item.href).every((href) => href.startsWith("/staff/"))).toBe(true);
    expect(GC_NAV.map((item) => item.href)).not.toContain("/aggregation/queue");
    expect(GC_NAV.map((item) => item.href)).not.toContain("/aggregation/avails");
    expect(GC_NAV.map((item) => item.href)).not.toContain("/aggregation/gc/deliveries");
    expect(GC_NAV.map((item) => item.href)).not.toContain("/aggregation/channels");
    expect(GC_NAV.map((item) => item.href)).not.toContain("/aggregation/gc/finance");
    expect(GC_NAV.map((item) => item.href)).not.toContain("/aggregation/gc/clients");
  });

  it("keeps operator dests on GC_NAV and never concatenates them under Aggregation", () => {
    expect(GC_NAV.map((item) => item.label)).toEqual([
      "Queue",
      "Avails",
      "Licensing Status",
      "Channels",
      "Finance",
      "Clients",
    ]);
    expect(GC_NAV.map((item) => item.label)).not.toContain("Ask 24Frame AI");
    expect(GC_NAV.map((item) => item.label)).not.toContain("Earn");
    expect(STAFF_RAIL_EYEBROW).toBe("Team");
    expect(STAFF_RAIL_EYEBROW).not.toBe("Staff");
    expect(STAFF_RAIL_EYEBROW).not.toBe("24Frame");
    expect(STAFF_RAIL_EYEBROW).not.toBe("24FRAME");
    expect(navSrc).not.toContain("[...NAV, ...GC_NAV]");
  });

  it("does not include the client deliveries path", () => {
    expect(GC_NAV.map((item) => item.href)).not.toContain("/deliveries");
  });
});

describe("mobileNavDestinations", () => {
  it("keeps the client sheet on the Aggregation NAV destinations", () => {
    expect(mobileNavDestinations(false).map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(mobileNavDestinations(false).map((item) => item.label)).not.toContain("Activity");
    expect(mobileNavDestinations(false).map((item) => item.label)).not.toContain("Ask 24Frame AI");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/queue");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/avails");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/vendors");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/channels");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/gc/clients");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/news");
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain("/home/news");
  });

  it("keeps Aggregation on client dests even for GC staff — Staff mode is GC_NAV only", () => {
    expect(mobileNavDestinations(true).map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(mobileNavDestinations(true, "aggregation").map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(mobileNavDestinations(true, "staff").map((item) => item.label)).toEqual([
      "Queue",
      "Avails",
      "Licensing Status",
      "Channels",
      "Finance",
      "Clients",
    ]);
    expect(mobileNavDestinations(false, "staff").map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(mobileNavDestinations(true, "aggregation").map((item) => item.label)).not.toContain(
      "Queue",
    );
    expect(mobileNavDestinations(true, "staff").map((item) => item.label)).not.toContain(
      "Dashboard",
    );
    expect(mobileNavDestinations(true).map((item) => item.label)).not.toContain("Activity");
    expect(mobileNavDestinations(true).map((item) => item.label)).not.toContain("Ask 24Frame AI");
    expect(railDestinations(true, "aggregation").staffItems).toEqual([]);
    expect(railDestinations(true, "aggregation").items.map((item) => item.href)).toEqual([
      "/aggregation/dashboard",
      "/aggregation/titles",
      "/aggregation/attention",
      "/aggregation/reports",
    ]);
    expect(railDestinations(true, "staff").items.map((item) => item.href)).toEqual([
      "/staff/queue",
      "/staff/avails",
      "/staff/gc/deliveries",
      "/staff/channels",
      "/staff/gc/finance",
      "/staff/gc/clients",
    ]);
    expect(railDestinations(true, "staff").staffItems).toEqual([]);
    expect(railDestinations(false, "staff").items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
  });

  it("shows Social destinations only in Social mode — DMs are not /messages", () => {
    expect(mobileNavDestinations(false, "social").map((item) => item.href)).toEqual([
      "/social",
      "/social/explore",
      "/social/create",
      "/social/dms",
      "/social/profile",
    ]);
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).toEqual([
      "/social",
      "/social/explore",
      "/social/create",
      "/social/dms",
      "/social/profile",
    ]);
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain("/messages");
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain("/queue");
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain("/social/groups");
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain(
      "/social/courses",
    );
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain(
      "/social/leaderboard",
    );
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain("/news");
    expect(mobileNavDestinations(true, "social").map((item) => item.href)).not.toContain("/home/news");
    expect(mobileNavDestinations(false, "education").map((item) => item.href)).not.toContain("/news");
    expect(mobileNavDestinations(false, "education").map((item) => item.href)).not.toContain("/home/news");
    expect(EDUCATION_NAV.map((item) => ({ label: item.label, href: item.href }))).toEqual([
      { label: "Education", href: "/education" },
    ]);
    expect(mobileNavDestinations(false, "education").map((item) => item.href)).toEqual([
      "/education",
    ]);
    expect(mobileNavDestinations(false, "education").map((item) => item.href)).not.toContain(
      "/social/courses",
    );
    expect(mobileNavDestinations(true, "education").map((item) => item.href)).toEqual([
      "/education",
      "/education/manage",
    ]);
    expect(mobileNavDestinations(true, "education").map((item) => item.label)).toEqual([
      "Education",
      "Manage courses",
    ]);
    expect(mobileNavDestinations(true, "education").map((item) => item.href)).not.toContain("/");
    expect(mobileNavDestinations(true, "education").map((item) => item.href)).not.toContain(
      "/titles",
    );
    expect(mobileNavDestinations(true, "education").map((item) => item.href)).not.toContain(
      "/queue",
    );
    expect(mobileNavDestinations(true, "education").map((item) => item.href)).not.toContain(
      "/gc/education",
    );
    expect(mobileNavDestinations(true, "education").map((item) => item.href)).not.toEqual(
      mobileNavDestinations(false, "aggregation").map((item) => item.href),
    );
    expect(railDestinations(false, "education").items.map((item) => item.href)).toEqual([
      "/education",
    ]);
    expect(railDestinations(false, "education").staffItems).toEqual([]);
    expect(railDestinations(true, "education").items.map((item) => item.label)).toEqual([
      "Education",
    ]);
    expect(railDestinations(true, "education").staffItems.map((item) => item.href)).toEqual([
      "/education/manage",
    ]);
    expect(railDestinations(true, "education").staffItems.map((item) => item.label)).toEqual([
      "Manage courses",
    ]);
    expect(EDUCATION_MANAGE_NAV.map((item) => item.href)).toEqual(["/education/manage"]);
    expect(railDestinations(true, "education").items.map((item) => item.href)).not.toEqual(
      railDestinations(false, "aggregation").items.map((item) => item.href),
    );
    expect(navSrc).toContain("EDUCATION_NAV");
    expect(navSrc).toContain('workspace === "education"');
    expect(EDUCATION_NAV.every((item) => item.family === "phosphor")).toBe(true);
    expect(EDUCATION_NAV.map((item) => item.icon)).toEqual([BookOpen]);
    expect(EDUCATION_MANAGE_NAV.map((item) => item.icon)).toEqual([BookOpen]);
    expect(EDUCATION_NAV.map((item) => item.href)).not.toContain("/social/courses");
    expect(SOCIAL_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_NAV[2]?.label).toBe("Create");
    expect(isSocialCreateDest(SOCIAL_NAV[2]!)).toBe(true);
    expect(SOCIAL_NAV.filter(isSocialCreateDest)).toHaveLength(1);
    expect(SOCIAL_DESKTOP_NAV).toBe(SOCIAL_NAV);
    expect(SOCIAL_DESKTOP_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(railDestinations(false, "social").items).toBe(SOCIAL_NAV);
    expect(railDestinations(false, "social").items.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(navSrc).not.toContain("SOCIAL_MOBILE_PILL");
    expect(isSocialTabActive("/social", SOCIAL_NAV[0])).toBe(true);
    expect(isSocialTabActive("/social/stories", SOCIAL_NAV[0])).toBe(false);
    expect(isSocialTabActive("/social/stories/new", SOCIAL_NAV[0])).toBe(false);
    expect(isSocialTabActive("/social/stories/story-1", SOCIAL_NAV[0])).toBe(false);
    expect(isSocialTabActive("/social/create", SOCIAL_NAV[2])).toBe(true);
    expect(isSocialTabActive("/social/live", SOCIAL_NAV[2])).toBe(true);
    expect(isSocialTabActive("/social/live/", SOCIAL_NAV[2])).toBe(true);
    expect(isSocialTabActive("/social/live", SOCIAL_NAV[0])).toBe(false);
    expect(isSocialTabActive("/social/u/maya", SOCIAL_NAV[4])).toBe(true);
    expect(isSocialTabActive("/social/profile/edit", SOCIAL_NAV[4])).toBe(true);
    expect(isSocialTabActive("/social/profile/edit/bio", SOCIAL_NAV[4])).toBe(true);
    expect(isSocialTabActive("/social/explore", SOCIAL_NAV[0])).toBe(false);
    expect(railDestinations(true, "social").staffItems).toEqual([]);
    expect(railDestinations(true, "aggregation").staffItems).toEqual([]);
    expect(railDestinations(true, "staff").items.map((item) => item.href)).toContain(
      "/staff/queue",
    );
  });
});
