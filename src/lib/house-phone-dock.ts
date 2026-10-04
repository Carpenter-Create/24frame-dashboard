/** Phone dock float clearance. Leaf token — no Phosphor, no React.
 *  The length lives on --house-phone-dock-clearance in tokens.css:
 *  3rem pill + max(16px, safe-area) float + var(--space-4) gap.
 *  These utility strings are complete literals. Tailwind does not emit
 *  a class that is assembled by interpolating the length into calc(). */
export const HOUSE_PHONE_DOCK_CLEARANCE = "var(--house-phone-dock-clearance)";

export const HOUSE_PHONE_DOCK_CHROME_PB_CLASS =
  "max-md:pb-[var(--house-phone-dock-clearance)]";

export const HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS =
  "max-md:bottom-[var(--house-phone-dock-clearance)]";
