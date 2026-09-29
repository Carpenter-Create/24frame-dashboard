"use client";

import { InlineNotice } from "@/components/ui/inline-notice";

export function FormError({ error }: { error: string }) {
  if (!error) return null;
  return <InlineNotice tone="error">{error}</InlineNotice>;
}
