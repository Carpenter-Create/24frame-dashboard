import {
  SOCIAL,
  SOCIAL_ROUTES,
  socialCreateHref,
} from "@/lib/social";
import type { SocialPhosphorIconName } from "@/lib/social-icons";

// Social Create: the phone dock's + fans these three (social-create-fan).
// Desktop has no chooser: the side menu's Create opens the composer
// window, with Media and Go live in its tool row
// (social-desktop-create-composer-lock-v1).
// Register: Coinbase institutional — modern trust, calm precision,
// one Sporty Blue primary, sharp selected states, quiet helpers —
// still social/creator/fun enough for Media · Write · Go live.
// Light 24Frame + Social media spine. Not traditional institutional
// (no bank / enterprise / gov chrome, no stiff corporate density).
// Not Mercury-stiff. Not LinkedIn-grey. Not a cold fintech vault.
// Not loud IG/FB. Not a Pinterest skin. Not an X FAB flyout.
// Not iMessage frost. Not iMessage’s vertical + attachment list.
// One SoT for the tile list. The phone dock reads it through the fan.
// Never in the house header.
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
