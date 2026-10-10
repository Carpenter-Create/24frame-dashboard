import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// Geometry from tokens (radius, type scale, accent) — never hardcoded px/hex.
// Keyboard focus is the global accent :focus-visible ring (globals.css).
// Danger is thin ink on the same pill — not a filled scare surface.
// The ink is the --danger token, as MENU_SURFACE_ITEM_DANGER_CLASS.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:opacity-90",
  secondary: "border border-hairline bg-surface text-ink-2 hover:bg-surface-muted",
  ghost: "text-ink-2 hover:bg-surface-muted",
  danger: "text-danger hover:bg-surface-muted",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        // Brand button: pill-shaped and flat. Geometry from tokens; color from
        // the variant. Disabled reads as intentionally inert (neutral muted grey)
        // rather than a faded accent — a washed-out blue looked cheap.
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 t-body-sm font-medium transition disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-ink-3",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
