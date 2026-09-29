import type { ReactNode } from "react";

export function SocialProfileActions({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="flex flex-wrap items-center gap-[var(--space-2)]">{children}</div>;
}
