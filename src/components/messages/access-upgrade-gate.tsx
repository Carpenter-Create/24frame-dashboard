import Link from "next/link";

import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";

export function AccessUpgradeGate() {
  return (
    <div data-ask-frame-ai-gate="" className="flex min-h-[min(36rem,calc(100dvh-var(--header-height)-var(--content-inset)*2))] flex-col">
      <h1 className="t-section text-ink">{ASK_FRAME_AI.pageTitle}</h1>

      <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-6)] py-[var(--space-10)]">
        <p data-ask-frame-ai-headline="" className="t-display text-center text-ink">
          {ASK_FRAME_AI.headline}
        </p>
        <div
          data-ask-frame-ai-card=""
          className="flex w-full max-w-[640px] flex-col items-center gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-hairline bg-surface p-[var(--space-6)]"
        >
          <p className="t-body text-center text-ink">{ASK_FRAME_AI.analyze}</p>
          <p className="t-body-sm text-center text-ink-3">{ASK_FRAME_AI.included}</p>
          <Link
            href={ASK_FRAME_AI.upgradeHref}
            data-ask-frame-ai-upgrade=""
            className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-3.5 t-body-sm font-medium text-accent-contrast transition hover:opacity-90"
          >
            {ASK_FRAME_AI.upgrade}
          </Link>
        </div>
      </div>
    </div>
  );
}
