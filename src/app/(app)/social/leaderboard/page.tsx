import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { SocialAvatar } from "@/components/social/social-avatar";
import {
  formatLeaderboardComputedAt,
  formatLeaderboardPct,
  leaderboardHref,
  LEADERBOARD_WINDOW_LABELS,
  LEADERBOARD_WINDOWS,
  loadLeaderboardBoard,
} from "@/lib/leaderboard";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import { SOCIAL, socialPersonLabel } from "@/lib/social";
import { requireSocialSession } from "@/lib/social-session";

export default async function SocialLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([requireSocialSession(), searchParams]);
  const { ctx, supabase } = session;
  const board = await loadLeaderboardBoard(supabase, sp.window, ctx.user.id);
  const computed = formatLeaderboardComputedAt(board.computedAt);
  const faces = await signedAvatarUrls([
    ...board.top.map((row) => row.user_id),
    ...(board.you ? [board.you.user_id] : []),
  ]);

  return (
    <div data-social-leaderboard="">
      <PageHeader title={SOCIAL.leaderboard.title} subtitle={SOCIAL.leaderboard.subtitle} />
      <nav data-leaderboard-windows="" className="mb-[var(--space-6)] flex flex-wrap gap-[var(--space-4)]">
        {LEADERBOARD_WINDOWS.map((window) => {
          const active = window === board.window;
          return (
            <Link
              key={window}
              href={leaderboardHref(window)}
              data-leaderboard-window={window}
              data-active={active ? "" : undefined}
              className={
                active
                  ? "t-body-sm font-medium text-ink"
                  : "t-body-sm text-ink-3 hover:text-ink"
              }
            >
              {LEADERBOARD_WINDOW_LABELS[window]}
            </Link>
          );
        })}
      </nav>
      {!board.visible ? (
        <p data-leaderboard-private="" className="t-body text-ink-2">
          {SOCIAL.leaderboard.private}
        </p>
      ) : (
        <div data-leaderboard-board="" className="flex flex-col gap-[var(--space-8)]">
          {computed ? (
            <p data-leaderboard-computed="" className="t-body-sm text-ink-3">
              {SOCIAL.leaderboard.computed}: {computed}.
            </p>
          ) : null}
          <section data-leaderboard-you="">
            <h2 className="t-label text-ink-3">{SOCIAL.leaderboard.yourRank}</h2>
            {board.you ? (
              <LeaderboardRow
                rank={board.you.rank}
                points={board.you.points}
                name={socialPersonLabel({
                  handle: board.profiles.get(board.you.user_id)?.handle ?? "",
                  displayName: board.profiles.get(board.you.user_id)?.display_name,
                })}
                photoUrl={faces.get(board.you.user_id) ?? null}
                you
              />
            ) : (
              <p className="mt-[var(--space-3)] t-body text-ink-2">{SOCIAL.leaderboard.yourRankEmpty}</p>
            )}
          </section>
          <section data-leaderboard-top="">
            <h2 className="t-label text-ink-3">{SOCIAL.leaderboard.top}</h2>
            {board.top.length === 0 ? (
              <p className="mt-[var(--space-3)] t-body text-ink-2">{SOCIAL.leaderboard.empty}</p>
            ) : (
              <ol className="mt-[var(--space-3)] flex flex-col">
                {board.top.map((row) => (
                  <li key={`${row.window}-${row.user_id}`}>
                    <LeaderboardRow
                      rank={row.rank}
                      points={row.points}
                      name={socialPersonLabel({
                        handle: board.profiles.get(row.user_id)?.handle ?? "",
                        displayName: board.profiles.get(row.user_id)?.display_name,
                      })}
                      photoUrl={faces.get(row.user_id) ?? null}
                      you={row.user_id === ctx.user.id}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section data-leaderboard-levels="">
            <h2 className="t-label text-ink-3">{SOCIAL.leaderboard.levels}</h2>
            <ul className="mt-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
              {board.levels.map((row) => (
                <li key={row.level} className="flex items-baseline justify-between gap-[var(--space-4)]">
                  <span className="t-body text-ink">{row.title ?? `Level ${row.level}`}</span>
                  <span className="t-body-sm text-ink-3">
                    {row.member_count} {SOCIAL.leaderboard.members}. {formatLeaderboardPct(row.pct)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  rank,
  points,
  name,
  photoUrl,
  you,
}: {
  rank: number;
  points: number;
  name: string;
  photoUrl: string | null;
  you?: boolean;
}) {
  return (
    <div
      data-leaderboard-row={rank}
      className="flex items-center gap-[var(--space-3)] py-[var(--space-3)] border-b border-hairline"
    >
      <span className="t-body tabular-nums text-ink-3 w-8">{rank}</span>
      <SocialAvatar name={name} photoUrl={photoUrl} />
      <div className="min-w-0 flex-1">
        <p className="t-body font-medium text-ink">
          {name}
          {you ? <span className="t-body-sm text-ink-3"> (you)</span> : null}
        </p>
      </div>
      <span className="t-body-sm text-ink-3">
        {points} {SOCIAL.leaderboard.points}
      </span>
    </div>
  );
}
