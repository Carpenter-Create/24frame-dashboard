import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_LABEL_CLASS,
  HOUSE_DEST_RAIL_NAV_CLASS,
  HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_ROW_CLASS,
  HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_UNREAD_DOT_CLASS,
  HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS,
  HOUSE_RAIL_ITEM_CLASS,
  HOUSE_SHELL_QUIET_INK_CLASS,
  houseDestRailGlyphWeight,
} from "@/lib/house-shell";
import { PlusSquare } from "@phosphor-icons/react";
import { SOCIAL_NAV, SOCIAL_RAIL_CREATE_ICON, isSocialMessagesDest } from "@/lib/nav";
import { socialMessagesNavLabel } from "@/lib/social";

const navSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "side-nav.tsx"), "utf8");

describe("SideNav Access rail", () => {
  it("keeps the locked client destinations", () => {
    expect(navSrc).not.toContain("AskAiOpenButton");
    expect(navSrc).not.toContain("data-side-nav-ask-ai");
    expect(navSrc).not.toContain("isHouseAiNavItem");
  });

  // Coinbase register (Adam 2026-10-05, "I like the designs. Let's use
  // them."): 56 pill rows, a 24 glyph in a 24 slot, 16 to a 17 / 500
  // label, 8 apart, pad 16; collapsed 56 circles. No tiles.
  it("uses 56 pill rows with a 24 Phosphor glyph, 8 apart — no icon tiles", () => {
    expect(navSrc).toContain("HOUSE_DEST_RAIL_ROW_CLASS");
    expect(navSrc).toContain("HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS");
    // The row (56, 15 / 500 since the cards lock, founder 2026-10-06) is
    // pinned in src/lib/social-feed-cards-lock.test.ts.
    expect(HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS).toBe(
      "relative flex size-14 shrink-0 items-center justify-center rounded-full transition-colors",
    );
    expect(HOUSE_DEST_RAIL_NAV_CLASS).toBe(
      "flex flex-col gap-[var(--space-2)] px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-2)]",
    );
    expect(HOUSE_DEST_RAIL_NAV_COLLAPSED_CLASS).toBe(
      "flex flex-col items-center gap-[var(--space-2)] pb-[var(--space-4)] pt-[var(--space-2)]",
    );
    expect(HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS).toBe("flex w-6 shrink-0 justify-center");
    expect(houseDestRailGlyphWeight(false)).toBe("regular");
    expect(houseDestRailGlyphWeight(true)).toBe("fill");
    // Labels wrap (the row grows) rather than clip.
    expect(HOUSE_DEST_RAIL_LABEL_CLASS).toBe("min-w-0 flex-1 text-left");
    expect(HOUSE_DEST_RAIL_LABEL_CLASS).not.toMatch(/truncate|whitespace-nowrap|line-clamp/);
    expect(navSrc).not.toContain("text-[0.875rem]");
    expect(navSrc).toContain("<NavGlyph item={glyphItem} active={active} />");
    expect(navSrc).toContain("No tiles");
    expect(navSrc).not.toContain("HOUSE_DEST_RAIL_TILE_");
    expect(navSrc).not.toContain("HOUSE_DEST_RAIL_CREATE_TILE");
    expect(navSrc).not.toContain("16px Lucide at 1.33");
    expect(navSrc).not.toContain("NavMark");
    expect(navSrc).not.toContain("markSrc");
    expect(navSrc).not.toContain("ask-globee-16.png");
    expect(navSrc).not.toContain("size-6");
    expect(navSrc).toContain("STAFF_RAIL_EYEBROW");
    expect(navSrc).toContain("aria-label={name ?? item.ariaLabel ?? (collapsed ? item.label : undefined)}");
    expect(navSrc).not.toContain("PRODUCT_NAME");
    expect(navSrc).not.toContain("strokeWidth={1.5}");
    expect(navSrc).not.toContain("strokeWidth={1.33}");
  });

  it("turns Social viewport prefetch on and keeps Aggregation hover-only", () => {
    expect(navSrc).toContain("prefetch={social}");
    expect(navSrc).toContain("Aggregation: VIEWPORT prefetch off, HOVER prefetch on");
    expect(navSrc).toContain("Social: VIEWPORT prefetch on");
    expect(navSrc).toContain("same five");
    expect(navSrc).toContain("onClick={compose?.onOpen}");
    expect(navSrc).toContain("isSocialCreateDest");
    expect(navSrc).toContain('data-social-create-compose="dest"');
    expect(navSrc).toContain("useSocialNavPending");
    expect(navSrc).toContain("SocialNavPendingProbe");
    expect(navSrc).toContain("data-social-rail-pending");
    expect(navSrc).not.toContain("prefetch={false}");
    expect(navSrc).not.toContain("four destinations");
  });

  // Founder 2026-10-05 boards: Create looks like the other rows — the
  // plus-in-a-rounded-square glyph, no tile, no accent.
  it("makes Social Create an ordinary row with the PlusSquare glyph — no tile, no accent", () => {
    expect(SOCIAL_RAIL_CREATE_ICON).toBe(PlusSquare);
    expect(navSrc).toContain("create ? { ...item, icon: SOCIAL_RAIL_CREATE_ICON } : item");
    expect(navSrc).not.toContain("data-side-nav-create-tile");
    expect(navSrc).not.toContain('from "@phosphor-icons/react"');
    expect(navSrc).not.toContain("SocialIcon");
    expect(navSrc).toContain("HOUSE_DEST_RAIL_LABEL_CLASS");
    expect(navSrc).toContain("data-side-nav-icon");
    expect(navSrc).toContain("className={rowClass}");
    expect(navSrc).toContain('data-social-create-compose="dest"');
    // No accent fill on any row; the current row is the wash.
    expect(HOUSE_DEST_RAIL_ROW_CLASS).not.toMatch(/(?:^|[\s"])bg-accent(?:[\s"]|$)/);
    expect(HOUSE_DEST_RAIL_IDLE_CLASS).not.toContain("accent");
    expect(HOUSE_RAIL_ITEM_CLASS).not.toMatch(/(?:^|[\s"])bg-accent(?:[\s"]|$)/);
  });

  // The current row is the accent wash with the label in accent-ink;
  // the weight stays 500 (the boards: "same weight").
  it("marks the current row with the accent wash and accent-ink, weight unchanged", () => {
    expect(navSrc).toContain("HOUSE_DEST_RAIL_ACTIVE_CLASS");
    expect(navSrc).toContain("HOUSE_DEST_RAIL_IDLE_CLASS");
    expect(navSrc).toContain("houseRailActiveIndex");
    expect(navSrc).not.toContain("HOUSE_RAIL_ACTIVE_CLASS");
    expect(HOUSE_DEST_RAIL_ACTIVE_CLASS).not.toMatch(/font-/);
    expect(HOUSE_DEST_RAIL_ACTIVE_CLASS).not.toContain("bg-surface-muted");
    expect(HOUSE_DEST_RAIL_IDLE_CLASS).toBe("text-ink hover:bg-surface-muted");
    expect(navSrc).not.toContain("font-normal text-ink-2");
    expect(navSrc).not.toContain('active ? "bg-surface text-ink"');
    expect(navSrc).not.toContain("BrandWordmark");
  });

  it("shows a Messages unread dot — an 8 accent dot, the count in the accessible name", () => {
    const messages = SOCIAL_NAV.find(isSocialMessagesDest);
    expect(messages?.label).toBe("Messages");
    expect(socialMessagesNavLabel("Messages", 0)).toBe("Messages");
    expect(socialMessagesNavLabel("Messages", 2)).toBe("Messages, 2 unread");
    expect(HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS).toContain("size-2 rounded-full bg-accent");
    expect(`${HOUSE_DEST_RAIL_UNREAD_DOT_CLASS} ${HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS}`).not.toMatch(/red|danger|#/);
    expect(navSrc).toContain("data-side-nav-unread");
    expect(navSrc).toContain("socialMessagesNavLabel(item.label, messagesUnread)");
  });

  // No workspace eyebrow and no collapse control in the rows: the brand
  // mark is the column's top band and the collapse control its foot
  // (AppShell). The workspace name stays the nav's accessible name.
  it("drops the workspace eyebrow and the top-row collapse — the nav is the rows", () => {
    expect(navSrc).not.toContain("HOUSE_DEST_RAIL_TOP_ROW_CLASS");
    expect(navSrc).not.toContain("data-side-nav-eyebrow");
    expect(navSrc).not.toContain("data-side-nav-top");
    expect(navSrc).not.toContain("collapseControl");
    expect(navSrc).not.toContain("data-side-nav-rule");
    expect(navSrc).toContain("aria-label={eyebrow}");
    expect(navSrc).toContain("houseRailModel");
    expect(navSrc).not.toContain("Destinations");
    expect(navSrc).not.toContain("SOCIAL_RAIL.workspace");
    expect(HOUSE_DEST_RAIL_EYEBROW_CLASS).toBe(
      `text-[length:var(--text-xs)] font-medium uppercase leading-none tracking-[0.06em] ${HOUSE_SHELL_QUIET_INK_CLASS}`,
    );
    // Staff rows: a full hairline and the eyebrow face at the rows' text
    // inset; a 24 rule when collapsed.
    expect(HOUSE_DEST_RAIL_DIVIDER_CLASS).toBe("my-2 h-px w-full shrink-0 bg-hairline");
    expect(HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS).toBe("my-2 h-px w-6 shrink-0 bg-hairline");
    expect(HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS).toBe(`px-[var(--space-4)] pb-1.5 pt-1 ${HOUSE_DEST_RAIL_EYEBROW_CLASS}`);
    // Settings keeps the house rail title.
    expect(navSrc).not.toContain("HOUSE_RAIL_TITLE_CLASS");
  });
});
