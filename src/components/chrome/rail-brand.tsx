import { HouseLink } from "./house-link";
import { BrandEmblem, BrandLogo } from "./brand-logo";
import { PRODUCT_NAME } from "@/lib/product";
import {
  HOUSE_RAIL_BRAND_BAND_CLASS,
  HOUSE_RAIL_BRAND_BAND_COLLAPSED_CLASS,
  HOUSE_RAIL_BRAND_LINK_CLASS,
} from "@/lib/house-shell";

// The side menu's top band (H register, Adam 2026-10-05,
// decision 2: "the brand mark moves from the header to the top band of
// the side menu"). The real BrandLogo, unchanged, its ink at 32 in the
// header-height band; collapsed (80 wide) the emblem, centred, because the 93-wide
// wordmark does not fit. It links to the workspace home, as the header
// wordmark did. Desktop only: the column is hidden below md, where the
// phone bar keeps its emblem.
export function RailBrand({
  href,
  collapsed = false,
  prefetch,
}: {
  href: string;
  collapsed?: boolean;
  prefetch?: boolean;
}) {
  return (
    <div
      data-rail-brand=""
      data-rail-brand-collapsed={collapsed ? "" : undefined}
      className={collapsed ? HOUSE_RAIL_BRAND_BAND_COLLAPSED_CLASS : HOUSE_RAIL_BRAND_BAND_CLASS}
    >
      <HouseLink
        href={href}
        prefetch={prefetch}
        aria-label={PRODUCT_NAME}
        data-rail-brand-link=""
        className={HOUSE_RAIL_BRAND_LINK_CLASS}
      >
        {collapsed ? <BrandEmblem /> : <BrandLogo />}
      </HouseLink>
    </div>
  );
}
