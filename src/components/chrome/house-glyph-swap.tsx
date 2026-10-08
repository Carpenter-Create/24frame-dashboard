import type { IconWeight } from "@phosphor-icons/react";

import { cn } from "@/lib/cn";
import {
  HOUSE_PHONE_NAV_GLYPH_FADE_CLASS,
  HOUSE_PHONE_NAV_GLYPH_FILL_CLASS,
  HOUSE_PHONE_NAV_GLYPH_HOST_CLASS,
  housePhoneNavGlyphOpacity,
} from "@/lib/house-phone-nav-motion";
import type { PhosphorIcon } from "@/lib/phosphor-icon";

// One glyph, two weights stacked: the idle weight and the current one.
// They crossfade as the nav pill lands (shell-phone-nav-motion-lock-v1),
// so the glyph fills without a jump. Decorative: the item's own label
// or accessible name carries the meaning.
export function HouseGlyphSwap({
  glyph: Glyph,
  on,
  className,
  hostClassName,
  idleWeight,
  onWeight,
}: {
  glyph: PhosphorIcon;
  on: boolean;
  className: string;
  hostClassName?: string;
  idleWeight: IconWeight;
  onWeight: IconWeight;
}) {
  const opacity = housePhoneNavGlyphOpacity(on);
  return (
    <span
      aria-hidden="true"
      data-house-glyph-swap={on ? "on" : "off"}
      className={cn(HOUSE_PHONE_NAV_GLYPH_HOST_CLASS, hostClassName)}
    >
      <Glyph className={cn(className, HOUSE_PHONE_NAV_GLYPH_FADE_CLASS, opacity.idle)} weight={idleWeight} />
      <Glyph
        className={cn(className, HOUSE_PHONE_NAV_GLYPH_FADE_CLASS, HOUSE_PHONE_NAV_GLYPH_FILL_CLASS, opacity.fill)}
        weight={onWeight}
      />
    </span>
  );
}
