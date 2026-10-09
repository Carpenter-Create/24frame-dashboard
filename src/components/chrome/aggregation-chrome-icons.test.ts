import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { socialCreateTile } from "@/lib/social-create-sheet";

const rail = readFileSync("src/lib/nav.ts", "utf8");
const settingsRail = readFileSync("src/components/chrome/settings-rail.tsx", "utf8");
const settingsLead = readFileSync("src/components/settings/settings-page-lead.tsx", "utf8");
const pageHeader = readFileSync("src/components/ui/page-header.tsx", "utf8");
const collapse = readFileSync("src/components/chrome/rail-collapse.tsx", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const account = readFileSync("src/components/chrome/account-sheet.tsx", "utf8");
const house = readFileSync("src/components/chrome/house.tsx", "utf8");
const dests = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
const messages = readFileSync("src/components/chrome/messages-app-header.tsx", "utf8");
const socialComposer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
const leadSearch = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");
const themeToggle = readFileSync("src/components/theme-toggle.tsx", "utf8");

describe("Aggregation chrome Phosphor lock + Design miss list", () => {
  it("ships measured Phosphor glyphs only; no Lucide leftovers", () => {
    expect(rail).toContain('family: "phosphor"');
    expect(rail).toContain("SquaresFour");
    expect(rail).toContain("FilmSlate");
    expect(rail).toContain("PaperPlaneTilt");
    expect(pageHeader).toContain("ArrowLeft");
    expect(pageHeader).not.toContain("CaretLeft");
    expect(settingsLead).toContain("PageHeaderBackLink");
    expect(settingsLead).not.toContain("CaretLeft");
    expect(settingsRail).not.toContain("lucide-react");
    expect(settingsLead).not.toContain("lucide-react");
    expect(shell).not.toContain("SettingsHeaderBack");

    expect(collapse).toContain('from "@phosphor-icons/react"');
    expect(collapse).toContain("CaretDoubleLeft");
    expect(collapse).toContain("CaretDoubleRight");
    expect(collapse).toContain("RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT");
    expect(collapse).not.toContain("lucide-react");
    expect(collapse).not.toContain("ChevronsLeft");
    expect(collapse).not.toContain("ChevronsRight");
    expect(shell).toContain("<RailCollapse collapsed={collapsed} onToggle={toggle} />");
    expect(shell).not.toContain("lucide-react");
    expect(shell).not.toContain("ChevronsLeft");
    expect(shell).not.toContain("ChevronsRight");

    expect(account).not.toContain("CaretLeft");
    expect(account).toContain("CaretRight");
    expect(account).toContain("SignOut");
    expect(account).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(account).not.toContain("lucide-react");
    expect(account).not.toContain("ChevronLeft");
    expect(account).not.toContain("ChevronRight");
    expect(account).not.toContain("<LogOut");

    expect(house).toContain('from "@phosphor-icons/react"');
    expect(house).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(house).toContain('<X className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(house).not.toContain("lucide-react");
    expect(house).not.toContain("strokeWidth={1.33}");

    expect(dests).toContain("housePhoneDestGlyph");
    expect(dests).not.toContain("lucide-react");
    expect(dests).not.toContain("import { Menu }");
    expect(dests).not.toContain("import { List }");

    expect(messages).not.toContain('from "lucide-react"');
    expect(messages).toContain('from "@phosphor-icons/react"');

    expect(account).toContain("Sun");
    expect(account).toContain("Moon");
    expect(account).toContain("CaretRight");
    expect(account).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(account).not.toContain("lucide-react");
    expect(themeToggle).not.toContain("export function ThemeToggle");
    expect(themeToggle).not.toContain("Sun");
    expect(themeToggle).not.toContain("Moon");
    expect(themeToggle).not.toContain("lucide-react");
    expect(themeToggle).not.toContain("strokeWidth");
    expect(themeToggle).not.toContain("stroke-width");
  });

  it("leaves Social interiors on Social V1 SocialIcon; SOCIAL_NAV dests are house Phosphor", () => {
    expect(socialComposer).toContain("useSocialCompose()");
    expect(socialComposer).not.toContain("<SocialWriteComposeSheet");
    expect(socialComposer).not.toContain('socialCreateHref("text")');
    expect(socialComposer).not.toContain("SocialCreateSheet");
    // Density lock v1.1: the composer's rounds use Social V1 glyphs. Since
    // "Match the fan" (Adam 2026-10-08) they are the fan's Media and Live
    // tiles, glyphs from the tile list (image, broadcast).
    expect(socialComposer).toContain("SocialIcon");
    expect(socialComposer).toContain("name={MEDIA_TILE.icon}");
    expect(socialComposer).toContain("name={LIVE_TILE.icon}");
    expect(socialCreateTile("media")?.icon).toBe("image");
    expect(socialCreateTile("live")?.icon).toBe("broadcast");
    expect(socialComposer).not.toContain('from "lucide-react"');
    expect(readFileSync("src/components/social/social-create-compose.tsx", "utf8")).toContain("SocialIcon");
    expect(leadSearch).toContain("MagnifyingGlass");
    expect(leadSearch).not.toContain('from "lucide-react"');
    expect(leadSearch).not.toContain("SocialIcon");
    expect(rail).not.toContain('family: "lucide"');
    expect(rail).toContain("SOCIAL_NAV");
    expect(rail).toContain("ChatCircle");
  });
});
