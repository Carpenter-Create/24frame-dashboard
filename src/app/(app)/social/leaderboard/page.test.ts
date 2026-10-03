import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";
import { signedAvatarUrls } from "@/lib/s3-avatars";
import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { SOCIAL } from "@/lib/social";
import SocialLeaderboardPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/s3-avatars", () => ({
  signedAvatarUrl: vi.fn().mockResolvedValue(null),
  signedAvatarUrls: vi.fn().mockResolvedValue(new Map()),
}));

function ctx({ hasOrg = false }: { hasOrg?: boolean } = {}) {
  const org = hasOrg ? { id: "org-1", name: "Acme", status: "active" } : null;
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: org ? [{ role: "account_owner", organizations: org }] : [],
    orgs: org ? [{ id: org.id, name: org.name }] : [],
    activeOrg: org,
    activeRole: org ? "account_owner" : null,
    canOperate: !!org,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  const self = () => c;
  c.select = vi.fn(self);
  c.eq = vi.fn(self);
  c.in = vi.fn(self);
  c.order = vi.fn(self);
  c.limit = vi.fn(self);
  c.range = vi.fn(async () => ({ data: result, error: null }));
  c.maybeSingle = vi.fn(async () => ({
    data: Array.isArray(result) ? (result[0] ?? null) : result,
    error: null,
  }));
  c.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: result, error: null }).then(resolve);
  return c;
}

function stubClient({
  settings = { leaderboard_public: true, gamification_enabled: true },
  top = [] as {
    window: string;
    user_id: string;
    rank: number;
    points: number;
    computed_at: string;
  }[],
  you = null as {
    window: string;
    user_id: string;
    rank: number;
    points: number;
    computed_at: string;
  } | null,
  profiles = [] as { id: string; handle: string; display_name: string; status: string }[],
  dist = [] as { level: number; member_count: number; pct: number; computed_at: string }[],
  levels = [] as { level: number; title: string }[],
} = {}) {
  const from = vi.fn((table: string) => {
    if (table === "app_settings") return chain(settings);
    if (table === "leaderboard_entries") {
      const rows = you ? [...top.filter((row) => row.user_id !== you.user_id), you] : top;
      const c = chain(rows);
      const eq = vi.fn((col: string, value: unknown) => {
        if (col === "user_id") {
          const found = rows.find((row) => row.user_id === value) ?? null;
          return {
            ...c,
            maybeSingle: vi.fn(async () => ({ data: found, error: null })),
          };
        }
        return c;
      });
      c.eq = eq;
      return c;
    }
    if (table === "profiles") return chain(profiles);
    if (table === "level_distribution") return chain(dist);
    if (table === "levels") return chain(levels);
    throw new Error(`unexpected from(${table})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from, rpc: vi.fn() } as never);
  return { from };
}

async function renderPage(search?: Record<string, string | string[] | undefined>) {
  return renderToStaticMarkup(
    await SocialLeaderboardPage({ searchParams: Promise.resolve(search ?? {}) }),
  );
}

describe("Social leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signedAvatarUrls).mockResolvedValue(new Map());
  });

  it("renders for a signed-in user without an org or profile when the board is public", async () => {
    const { from } = stubClient({
      top: [
        {
          window: "7d",
          user_id: "u2",
          rank: 1,
          points: 12,
          computed_at: "2026-09-12T14:00:00.000Z",
        },
      ],
      profiles: [{ id: "u2", handle: "other", display_name: "Other", status: "active" }],
      dist: [{ level: 1, member_count: 1, pct: 100, computed_at: "2026-09-12T14:00:00.000Z" }],
      levels: [{ level: 1, title: "Member" }],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ hasOrg: false }) as never);

    const html = await renderPage();
    expect(from).toHaveBeenCalledWith("leaderboard_entries");
    expect(from).not.toHaveBeenCalledWith("titles");
    expect(html).toContain("data-social-leaderboard");
    expect(html).toContain(SOCIAL.leaderboard.title);
    expect(html).toContain("24Frame");
    expect(html).toContain("data-leaderboard-top");
    expect(html).toContain("Other");
    expect(html).toContain(SOCIAL.leaderboard.yourRankEmpty);
    expect(html).toContain("Last computed: 2026-09-12.");
    expect(html).toContain("Member");
    expect(html).not.toContain("data-leaderboard-private");
    expect(html).not.toContain("Globee");
    expect(html).not.toContain(ASK_FRAME_AI.headline);
    expect(html).not.toContain("—");
  });

  it("shows quiet private copy when either kill switch is off", async () => {
    stubClient({ settings: { leaderboard_public: false, gamification_enabled: true } });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage({ window: "all" });
    expect(html).toContain("data-leaderboard-private");
    expect(html).toContain(SOCIAL.leaderboard.private);
    expect(html).not.toContain("data-leaderboard-top");
    expect(html).not.toContain("HouseEmpty");
    expect(html).not.toContain("error");
  });

  it("pins your rank from the PK lookup even when you are outside the top 10", async () => {
    stubClient({
      top: [
        {
          window: "30d",
          user_id: "u2",
          rank: 1,
          points: 40,
          computed_at: "2026-09-12T14:00:00.000Z",
        },
      ],
      you: {
        window: "30d",
        user_id: "u1",
        rank: 17,
        points: 2,
        computed_at: "2026-09-12T14:00:00.000Z",
      },
      profiles: [
        { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
        { id: "u2", handle: "other", display_name: "Other", status: "active" },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage({ window: "30d" });
    expect(html).toContain("data-active");
    expect(html).toContain("All time");
    expect(html).toContain("Ada");
    expect(html).toContain("(you)");
    expect(html).toContain("17");
    expect(html).toContain("2 points");
  });

  it("shows a signed face on a leaderboard row and keeps initials when missing", async () => {
    stubClient({
      top: [
        {
          window: "7d",
          user_id: "u2",
          rank: 1,
          points: 12,
          computed_at: "2026-09-12T14:00:00.000Z",
        },
      ],
      you: {
        window: "7d",
        user_id: "u1",
        rank: 2,
        points: 3,
        computed_at: "2026-09-12T14:00:00.000Z",
      },
      profiles: [
        { id: "u1", handle: "ada", display_name: "Ada", status: "active" },
        { id: "u2", handle: "other", display_name: "Other", status: "active" },
      ],
    });
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(signedAvatarUrls).mockResolvedValue(
      new Map([
        ["u2", "https://s3.example/other-face"],
        ["u1", null],
      ]),
    );

    const html = await renderPage();
    expect(html).toContain("https%3A%2F%2Fs3.example%2Fother-face");
    expect(html).toContain("Other");
    expect(html).toContain("Ada");
    expect(html).toContain(">A<");
  });

  it("sends an unauthenticated visitor to login", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(renderPage()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("messages clash lock", () => {
  it("does not steal /messages for the leaderboard", () => {
    const page = readFileSync("src/app/(app)/social/leaderboard/page.tsx", "utf8");
    expect(page).not.toContain('"/messages"');
    expect(page).not.toContain("rebuild_leaderboards");
    expect(existsSync("src/app/(app)/aggregation/messages/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/aggregation/messages/ask-ai-legacy-intercept.tsx")).toBe(
      false,
    );
  });
});
