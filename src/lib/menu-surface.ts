// Shared menu surface chrome. Desktop profile/user-menu and the thread ···
// both instance this register. Do not fork a THREAD_POPOVER_* lookalike.
// Optional Identity half-bar (544:561 / 586:768) is OFF unless the instance
// opts in. Thread ··· and Appearance stay off. No dashboard-card bars.
//
// Density: ≤2 items hug content (sparse overflow). 3+ keep the 17.5rem
// account/thread panel. Do not bake 17.5rem into every instance.

// HouseOverlay dual-host lock v1 G6 — anchor hug, radius 12, hairline, no shadow.
export const MENU_SURFACE_CONTENT_CLASS =
  "rounded-[12px] border border-hairline bg-surface p-[var(--space-2)] shadow-none";

export const MENU_SURFACE_CONTENT_SPARSE_CLASS = "w-max min-w-max";

export const MENU_SURFACE_CONTENT_PANEL_CLASS = "min-w-[17.5rem]";

export const MENU_SURFACE_SPARSE_ITEM_MAX = 2;

export const MENU_SURFACE_ITEM_CLASS =
  "min-h-[44px] rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] t-body-sm text-ink-2";

export const MENU_SURFACE_SEPARATOR_CLASS = "my-[var(--space-2)]";

// Thin danger tint on the same item — not a second surface or a heavier mark.
export const MENU_SURFACE_ITEM_DANGER_CLASS =
  "text-danger data-[highlighted]:text-danger";

// Identity-only chrome. Left-origin, 50% width, 4px, Sporty Blue. No track.
// Flush top of the surface. Token — never a raw hex here.
export const MENU_SURFACE_ACCENT_CLASS =
  "pointer-events-none absolute left-0 top-0 h-[4px] w-1/2 bg-accent";

export const MENU_SURFACE_ACCENT_CLIP_CLASS =
  "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]";

export type MenuSurfaceDensity = "sparse" | "panel";

export function menuSurfaceDensityForCount(itemCount: number): MenuSurfaceDensity {
  return itemCount <= MENU_SURFACE_SPARSE_ITEM_MAX ? "sparse" : "panel";
}

export function menuSurfaceContentClass(density: MenuSurfaceDensity): string {
  return [
    MENU_SURFACE_CONTENT_CLASS,
    density === "sparse"
      ? MENU_SURFACE_CONTENT_SPARSE_CLASS
      : MENU_SURFACE_CONTENT_PANEL_CLASS,
  ].join(" ");
}

export function isMenuSurfaceSeparatorProps(props: {
  [key: string]: unknown;
} | null): boolean {
  if (!props) return false;
  return (
    props["data-menu-surface-separator"] != null ||
    props["data-thread-popover-hairline"] != null
  );
}

export function countMenuSurfaceItems(children: readonly unknown[]): number {
  return children.filter((child) => {
    if (child == null || typeof child !== "object") return false;
    const props =
      "props" in child
        ? ((child as { props?: { [key: string]: unknown } | null }).props ?? null)
        : null;
    return !isMenuSurfaceSeparatorProps(props);
  }).length;
}
