import {
  HOUSE_DIALOG_FORM_CLASS,
  HOUSE_DIALOG_HOST_CLASS,
  HOUSE_DIALOG_PANEL_CLASS,
  HOUSE_OVERLAY_SCRIM_CLASS,
} from "@/lib/house-overlay";
import {
  APP_SHEET_HEAD_CLASS,
  APP_SHEET_HOST_CLASS,
  APP_SHEET_SURFACE_CLASS,
} from "@/lib/house-sheet";
import {
  SOCIAL,
  SOCIAL_ROUTES,
  socialCreateHref,
} from "@/lib/social";
import type { SocialPhosphorIconName } from "@/lib/social-icons";

// Desktop rail Create dialog. Phone dock + does not mount this —
// it fans Media · Write · Go live (social-create-fan).
// Narrow host is still AppSheet. Desktop is HouseDialog
// (short form, 480) — not an AppSheet promoted into a modal.
// HouseOverlay dual-host lock v1. Same tiles both hosts.
// Register: Coinbase institutional — modern trust, calm precision,
// one Sporty Blue primary, sharp selected states, quiet helpers —
// still social/creator/fun enough for Media · Write · Go live.
// Light 24Frame + Social media spine. Not traditional institutional
// (no bank / enterprise / gov chrome, no stiff corporate density).
// Not Mercury-stiff. Not LinkedIn-grey. Not a cold fintech vault.
// Not loud IG/FB. Not a Pinterest skin. Not an X FAB flyout.
// Not iMessage frost. Not iMessage’s vertical + attachment list.
// One SoT for the desktop dialog + the shared tile list.
// Phone dock reads the same tiles through the fan. Never in the house header.
// Tiles: Media · Write · Go live. Media opens a mixed roll immediately.

export const SOCIAL_CREATE_TILES = [
  {
    id: "media",
    label: SOCIAL.create.media,
    href: socialCreateHref("media"),
    icon: "image",
  },
  {
    id: "write",
    label: SOCIAL.create.write,
    href: socialCreateHref("text"),
    icon: "pencil-simple",
  },
  {
    id: "live",
    label: SOCIAL.create.goLive,
    href: SOCIAL_ROUTES.createLive,
    icon: "broadcast",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  href: string;
  icon: SocialPhosphorIconName;
}[];

export type SocialCreateTileId = (typeof SOCIAL_CREATE_TILES)[number]["id"];

export function socialCreateTile(
  id: string,
): (typeof SOCIAL_CREATE_TILES)[number] | null {
  return SOCIAL_CREATE_TILES.find((tile) => tile.id === id) ?? null;
}

export const SOCIAL_CREATE_SHEET_PRESENTATION = "responsive";

export const SOCIAL_CREATE_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;

export const SOCIAL_CREATE_SHEET_SURFACE_CLASS =
  `${APP_SHEET_SURFACE_CLASS} relative z-10 w-full`;

export const SOCIAL_CREATE_SHEET_DESKTOP_HOST_CLASS = HOUSE_DIALOG_HOST_CLASS;

export const SOCIAL_CREATE_SHEET_DESKTOP_SURFACE_CLASS =
  `${HOUSE_DIALOG_PANEL_CLASS} ${HOUSE_DIALOG_FORM_CLASS} relative z-10`;

export const SOCIAL_CREATE_SHEET_HEAD_CLASS =
  `${APP_SHEET_HEAD_CLASS} relative justify-between`;

export const SOCIAL_CREATE_SHEET_TITLE_CLASS =
  "pointer-events-none absolute inset-0 flex items-center justify-center t-body font-medium text-ink";

// Dim the feed behind. Opaque wash — not frost, not backdrop-blur.
export const SOCIAL_CREATE_SHEET_SCRIM_CLASS =
  `${HOUSE_OVERLAY_SCRIM_CLASS} app-sheet-scrim-fade`;

// One equal row. More vertical air than original. Never truncate — labels wrap/stack.
export const SOCIAL_CREATE_TILES_CLASS =
  "grid w-full grid-cols-3 gap-[var(--space-6)]";

// Tile chrome stays quiet. Selected lives on the well — not a
// full-tile enterprise hover card, not a Mercury dest chip.
export const SOCIAL_CREATE_TILE_CLASS =
  "group flex min-w-0 flex-col items-center justify-center gap-[var(--space-3)] px-[var(--space-2)] py-[var(--space-6)] text-ink";

// Circular well (~64px), muted rest fill. Hover/active: Sporty Blue wash +
// accent-ink icon (the ink for anything on the wash, founder pick
// 2026-10-04). Coinbase-calm creator tile. Not a colored orb.
export const SOCIAL_CREATE_TILE_WELL_CLASS =
  "flex size-16 items-center justify-center rounded-full bg-surface-muted transition-colors group-hover:bg-accent-wash group-active:bg-accent-wash";

export const SOCIAL_CREATE_TILE_ICON_CLASS =
  "text-ink transition-colors group-hover:text-accent-ink group-active:text-accent-ink";

export const SOCIAL_CREATE_TILE_LABEL_CLASS =
  "whitespace-normal text-center t-body-sm font-medium text-ink";
