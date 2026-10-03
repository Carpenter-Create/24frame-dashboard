import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVITY_PAGE } from "@/lib/activity";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/supabase/context";
import ActivityPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), push: vi.fn() }),
  usePathname: () => "/activity",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

function ctx({
  isGcStaff = false,
  hasOrg = true,
}: {
  isGcStaff?: boolean;
  hasOrg?: boolean;
} = {}) {
  const org = hasOrg ? { id: "org-1", name: "Meridian Pictures", status: "active" } : null;
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: org ? [{ role: "account_owner", organizations: org }] : [],
    orgs: org ? [{ id: org.id, name: org.name }] : [],
    activeOrg: org,
    activeRole: org ? "account_owner" : null,
    canOperate: !!org,
    isGcStaff,
    unread: Promise.resolve(0),
  };
}

const OPEN = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  org_id: "org-1",
  kind: "title_rejected" as const,
  title: "North Wind was returned",
  body: "Chain of title is missing.",
  source_refs: {},
  created_at: "2026-09-12T12:00:00.000Z",
  unread: true,
};
const DONE = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  org_id: "org-1",
  kind: "delivery_update" as const,
  title: "Harbor Cut delivery update",
  body: "Delivered to the channel.",
  source_refs: {},
  created_at: "2026-08-02T12:00:00.000Z",
  unread: false,
};

function stubClient(notifications: unknown[] = [OPEN, DONE]) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "my_notifications") return { data: notifications, error: null };
    throw new Error(`unexpected rpc ${name}`);
  });
  vi.mocked(createClient).mockResolvedValue({ rpc } as never);
  return { rpc };
}

async function renderPage(search: Record<string, string | string[] | undefined> = {}) {
  const element = await ActivityPage({ searchParams: Promise.resolve(search) });
  return renderToStaticMarkup(element);
}

describe("ActivityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to the live uncleared feed and hides cleared rows", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage();
    expect(html).toContain("data-activity-inbox");
    expect(html).toContain(ACTIVITY_PAGE.title);
    expect(html).toContain(ACTIVITY_PAGE.subtitle);
    expect(html).toContain('data-activity-family-chip="all"');
    expect(html).toContain('data-activity-family-chip="social"');
    expect(html).toContain("data-activity-prefs");
    expect(html).toContain('href="/settings/preferences/notifications"');
    expect(html).toContain("North Wind was returned");
    expect(html).not.toContain("Harbor Cut delivery update");
    expect(html).not.toContain("data-activity-status-chip");
    expect(html).not.toContain("data-activity-period-chip");
    expect(html).not.toContain(">Open<");
    expect(html).not.toContain(">Done<");
    expect(html).not.toContain("Cleared");
    expect(html).not.toContain("Mark as read");
    expect(html).not.toContain("data-ask-frame-ai-landing");
    expect(html).not.toContain("data-messages-inbox");
  });

  it("ignores a leftover status=done query and stays on the live feed", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage({ status: "done" });
    expect(html).toContain("North Wind was returned");
    expect(html).not.toContain("Harbor Cut delivery update");
    expect(html).not.toContain("data-activity-status-chip");
  });

  it("filters the live feed by a prefs family chip", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage({ family: "social" });
    expect(html).toContain("You&#x27;re all caught up.");
    expect(html).toContain("data-activity-empty");
    expect(html).not.toContain("North Wind was returned");
    expect(html).toContain('data-activity-family-chip="social"');
  });

  it("does not offer period chrome on the live hub", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage({ period: "2026-08" });
    expect(html).toContain("North Wind was returned");
    expect(html).not.toContain("data-activity-period-chip");
  });

  it("keeps staff without a client org on Activity", async () => {
    const { rpc } = stubClient([]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ isGcStaff: true, hasOrg: false }) as never);

    const html = await renderPage();
    expect(html).toContain("data-activity-inbox");
    expect(html).toContain("You&#x27;re all caught up.");
    expect(html).toContain("data-activity-empty");
    expect(rpc).toHaveBeenCalledWith("my_notifications", { p_limit: UNPAGINATED_MAX + 1 });
  });

  it("does not offer a complete list claim when the probe overflowed", async () => {
    stubClient(
      Array.from({ length: UNPAGINATED_MAX + 1 }, (_, i) => ({
        ...OPEN,
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
      })),
    );
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderPage();
    expect(html).toContain('data-my-list-truncated="notifications"');
    expect(html).toContain(ACTIVITY_PAGE.truncated);
  });

  it("sends an unauthenticated visitor to login", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(ActivityPage()).rejects.toThrow("REDIRECT:/login");
  });
});
