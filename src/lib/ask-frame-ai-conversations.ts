import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";

export { askFrameAiDownloadFilename } from "@/lib/ask-frame-ai-download";

export type AskFrameAiThumb = "up" | "down";

export type AskFrameAiHistoryRow = {
  id: string;
  title: string;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AskFrameAiStoredMessage = {
  id: string;
  // "globee" is the stored conversation_role value for 24Frame AI turns.
  // The name is retired in code and copy; the database value stays.
  role: "user" | "globee";
  body: string;
  lead: string | null;
  follow: string | null;
  thumbs: AskFrameAiThumb | null;
  created_at: string;
};

export function askFrameAiOpenUserTurn(
  messages: ReadonlyArray<{ role: "user" | "globee"; body: string }>,
): string | null {
  const last = messages.at(-1);
  if (!last || last.role !== "user") return null;
  const next = last.body.trim();
  return next.length > 0 ? next : null;
}

export function sortAskFrameAiHistory<T extends { pinned_at: string | null; updated_at: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (a.pinned_at && !b.pinned_at) return -1;
    if (!a.pinned_at && b.pinned_at) return 1;
    if (a.pinned_at && b.pinned_at && a.pinned_at !== b.pinned_at) {
      return a.pinned_at < b.pinned_at ? 1 : -1;
    }
    if (a.updated_at === b.updated_at) return 0;
    return a.updated_at < b.updated_at ? 1 : -1;
  });
}

export function askFrameAiAnswerText(lead: string, follow: string | null): string {
  const nextFollow = follow?.trim();
  return nextFollow ? `${lead}\n${nextFollow}` : lead;
}

export function nextAskFrameAiThumb(
  current: AskFrameAiThumb | null,
  clicked: AskFrameAiThumb,
): AskFrameAiThumb | null {
  return current === clicked ? null : clicked;
}

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function formatAskFrameAiClock(value: Date): string {
  const raw = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
  return raw.replace(/\u202f/g, " ");
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export function isAskFrameAiHistoryThisWeek(iso: string, now = new Date()): boolean {
  return startOfLocalDay(new Date(iso)) > startOfLocalDay(now) - WEEK_MS;
}

export function filterAskFrameAiHistory<T extends { title: string }>(rows: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.title.toLowerCase().includes(needle));
}

export function groupAskFrameAiHistory<T extends { updated_at: string }>(
  rows: T[],
  now = new Date(),
): { thisWeek: T[]; allThreads: T[] } {
  const thisWeek: T[] = [];
  const allThreads: T[] = [];
  for (const row of rows) {
    if (isAskFrameAiHistoryThisWeek(row.updated_at, now)) thisWeek.push(row);
    else allThreads.push(row);
  }
  return { thisWeek, allThreads };
}

export function formatAskFrameAiHistoryTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const thenDay = startOfLocalDay(then);
  const nowDay = startOfLocalDay(now);
  if (thenDay === nowDay) return formatAskFrameAiClock(then);
  if (thenDay === nowDay - DAY_MS) return "Yesterday";
  if (thenDay > nowDay - WEEK_MS && thenDay < nowDay) {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(then);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(then);
}

// Help-desk leftover. Do not render on the 247:295 thread answer (247:378).
export function formatAskFrameAiAttribution(iso: string): string {
  return `${ASK_FRAME_AI.attributionName} · ${formatAskFrameAiClock(new Date(iso))}`;
}
