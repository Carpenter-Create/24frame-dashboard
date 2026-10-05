import type { NavItem } from "@/lib/nav";
import {
  HOUSE_DEST_RAIL_GLYPH_CLASS,
  houseDestRailGlyphWeight,
} from "@/lib/house-shell";
import { HouseAiMark } from "./house-ai-mark";

// One icon package. Side-menu dests (every workspace): Phosphor,
// 18px, Regular idle / Bold current — the screening-room board's
// stroke 1.7 / 2 (docs/design-locks/shell-screening-chrome-lock-v1.md).
// House-ai family is overlay/header chrome, not a rail row. Social
// interiors stay SocialIcon (same Phosphor package, V1 sizes).
export function NavGlyph({
  item,
  active,
  className = HOUSE_DEST_RAIL_GLYPH_CLASS,
}: {
  item: NavItem;
  active: boolean;
  className?: string;
}) {
  if (item.family === "house-ai") {
    return <HouseAiMark />;
  }
  const Glyph = item.icon;
  return <Glyph className={className} weight={houseDestRailGlyphWeight(active)} />;
}
