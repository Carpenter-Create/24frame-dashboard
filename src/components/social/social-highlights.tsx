import Link from "next/link";

import { SOCIAL_HIGHLIGHT_RING_CLASS } from "@/lib/social-chrome";

import { SocialAvatar } from "./social-avatar";

export function SocialHighlights({
  cards,
}: {
  cards: readonly { id: string; href: string; label: string; photoUrl?: string | null }[];
}) {
  if (cards.length === 0) return null;
  return (
    <div data-social-highlights="" className="flex flex-col gap-2">
      <div className="flex gap-3 overflow-x-auto">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            data-social-highlight={card.id}
            className="flex w-14 shrink-0 flex-col items-center gap-1"
          >
            <span className={SOCIAL_HIGHLIGHT_RING_CLASS}>
              {card.photoUrl ? (
                <SocialAvatar name={card.label} photoUrl={card.photoUrl} />
              ) : (
                <span className="block size-12 rounded-full bg-surface-muted" />
              )}
            </span>
            <span className="w-full truncate text-center t-label text-ink">{card.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
