import {
  BRAND_CORNER_FILL_LIGHT,
  BRAND_DESKTOP_WORDMARK_CLASS,
  BRAND_EMBLEM_CORNER_BR_POINTS,
  BRAND_EMBLEM_CORNER_TL_POINTS,
  BRAND_EMBLEM_FOUR_DOT_PATH,
  BRAND_EMBLEM_FOUR_POINTS,
  BRAND_EMBLEM_SRC,
  BRAND_EMBLEM_TWO_PATH,
  BRAND_EMBLEM_VIEWBOX,
  BRAND_LOGO_DARK_SRC,
  BRAND_LOGO_HEIGHT_PX,
  BRAND_LOGO_LIGHT_SRC,
  BRAND_MARK_FILL,
  BRAND_PHONE_EMBLEM_CLASS,
  BRAND_RAIL_EMBLEM_CLASS,
} from "@/lib/brand";

// Phone (max-md): Asset 8 emblem. md+: Asset 4/1 wordmark. Light +
// dark swap on the house `.dark` class (same contract as the theme
// toggle). One SoT for every workspace — HouseLeadChrome is the
// only mount. No workspace forks.

const WORDMARK_LIGHT_CLASS = `${BRAND_DESKTOP_WORDMARK_CLASS} md:block dark:hidden`;
const WORDMARK_DARK_CLASS = `${BRAND_DESKTOP_WORDMARK_CLASS} dark:md:block`;
const EMBLEM_DARK_CLASS = `${BRAND_PHONE_EMBLEM_CLASS} hidden dark:max-md:block`;

function PhoneEmblemLight({
  className = `${BRAND_PHONE_EMBLEM_CLASS} dark:hidden`,
}: {
  className?: string;
}) {
  // Archived Asset 8 has white corners (dark file). Light inlines
  // the same geometry with ink corners so the mark holds on surface.
  return (
    <svg
      viewBox={BRAND_EMBLEM_VIEWBOX}
      height={BRAND_LOGO_HEIGHT_PX}
      aria-hidden
      data-brand-logo-mark="emblem-light"
      className={className}
    >
      <path fill={BRAND_MARK_FILL} d={BRAND_EMBLEM_TWO_PATH} />
      <polygon fill={BRAND_MARK_FILL} points={BRAND_EMBLEM_FOUR_POINTS} />
      <path fill={BRAND_MARK_FILL} d={BRAND_EMBLEM_FOUR_DOT_PATH} />
      <polygon fill={BRAND_CORNER_FILL_LIGHT} points={BRAND_EMBLEM_CORNER_BR_POINTS} />
      <polygon fill={BRAND_CORNER_FILL_LIGHT} points={BRAND_EMBLEM_CORNER_TL_POINTS} />
    </svg>
  );
}

export function BrandLogo() {
  return (
    <span data-brand-logo="" className="inline-flex shrink-0 items-center">
      <PhoneEmblemLight />
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin Asset 8; dark phone only */}
      <img
        src={BRAND_EMBLEM_SRC}
        alt=""
        height={BRAND_LOGO_HEIGHT_PX}
        data-brand-logo-mark="emblem"
        className={EMBLEM_DARK_CLASS}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin brand SVGs; pair swaps on .dark */}
      <img
        src={BRAND_LOGO_LIGHT_SRC}
        alt=""
        height={BRAND_LOGO_HEIGHT_PX}
        data-brand-logo-mark="light"
        className={WORDMARK_LIGHT_CLASS}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin brand SVGs; pair swaps on .dark */}
      <img
        src={BRAND_LOGO_DARK_SRC}
        alt=""
        height={BRAND_LOGO_HEIGHT_PX}
        data-brand-logo-mark="dark"
        className={WORDMARK_DARK_CLASS}
      />
    </span>
  );
}

// The emblem alone at every width (the same Asset 8 geometry as the
// phone lead): the collapsed side menu's 80 top band, where the
// wordmark does not fit. BrandLogo itself is unchanged.
export function BrandEmblem() {
  return (
    <span data-brand-logo="" data-brand-emblem-only="" className="inline-flex shrink-0 items-center">
      <PhoneEmblemLight className={`${BRAND_RAIL_EMBLEM_CLASS} dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin Asset 8; dark only */}
      <img
        src={BRAND_EMBLEM_SRC}
        alt=""
        height={BRAND_LOGO_HEIGHT_PX}
        data-brand-logo-mark="emblem"
        className={`${BRAND_RAIL_EMBLEM_CLASS} hidden dark:block`}
      />
    </span>
  );
}
