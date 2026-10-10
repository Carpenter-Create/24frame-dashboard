import { cn } from "@/lib/cn";

type Tone = "info" | "error";

// Form-level messages. GC's system has NO status colors by default (greyscale + one
// accent), so error vs info differ by ink weight, not red — a restrained hairline
// notice. --danger is for destructive actions only; whether errors may use red stays a
// FOUNDER design decision (see known-divergences D3).
export function InlineNotice({
  tone = "info",
  className,
  ...props
}: React.ComponentProps<"p"> & { tone?: Tone }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-[var(--radius-sm)] border border-hairline bg-surface-muted px-3 py-2 t-body-sm",
        tone === "error" ? "text-ink" : "text-ink-2",
        className,
      )}
      {...props}
    />
  );
}
