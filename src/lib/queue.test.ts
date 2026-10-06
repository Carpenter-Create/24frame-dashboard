import { describe, expect, it } from "vitest";

import { CATALOG_LIFECYCLE_STATES } from "@/lib/titles-catalog";
import { GC_NAV } from "@/lib/nav";
import {
  QUEUE_ACTIVE_STATUSES,
  QUEUE_PAGE,
  QUEUE_SUBMIT_TRANSITION_STATUSES,
  auditAfterStatus,
  collectFirstSubmitAts,
  isQueueActiveStatus,
  queueActiveStatuses,
  queueOrgName,
  queueSubmittedAt,
  queueSubmittedDateLabel,
  queueSubmitterLabel,
} from "@/lib/queue";

describe("staff queue helpers", () => {
  it("keeps Queue on the live in_review | in_delivery work set", () => {
    expect([...QUEUE_ACTIVE_STATUSES]).toEqual(["in_review", "in_delivery"]);
    expect(queueActiveStatuses()).toEqual(["in_review", "in_delivery"]);
    expect(isQueueActiveStatus("in_review")).toBe(true);
    expect(isQueueActiveStatus("in_delivery")).toBe(true);
    expect(isQueueActiveStatus("draft")).toBe(false);
    expect(isQueueActiveStatus("live")).toBe(false);
    expect(isQueueActiveStatus("submitted")).toBe(false);
    for (const status of QUEUE_ACTIVE_STATUSES) {
      expect(CATALOG_LIFECYCLE_STATES).toContain(status);
    }
  });

  it("uses profile display_name and falls back to an em dash", () => {
    expect(queueSubmitterLabel("Maya Chen")).toBe("Maya Chen");
    expect(queueSubmitterLabel("  Ada  ")).toBe("Ada");
    expect(queueSubmitterLabel("")).toBe("—");
    expect(queueSubmitterLabel("   ")).toBe("—");
    expect(queueSubmitterLabel(null)).toBe("—");
    expect(queueSubmitterLabel(undefined)).toBe("—");
  });

  it("prefers the submit transition clock and documents created_at fallback", () => {
    expect(queueSubmittedAt("2026-01-01T00:00:00Z", "2026-03-02T12:00:00Z")).toBe(
      "2026-03-02T12:00:00Z",
    );
    expect(queueSubmittedAt("2026-01-01T00:00:00Z", null)).toBe("2026-01-01T00:00:00Z");
    expect(queueSubmittedAt("2026-01-01T00:00:00Z", undefined)).toBe("2026-01-01T00:00:00Z");
    expect(queueSubmittedDateLabel("2026-08-15T00:00:00Z")).toBe("Aug 15, 2026");
    expect(queueSubmittedDateLabel("not-a-date")).toBe("—");
  });

  it("takes the first submit / in_review audit transition per title", () => {
    expect(auditAfterStatus({ status: "in_review" })).toBe("in_review");
    expect(auditAfterStatus({ status: 1 })).toBeNull();
    expect(auditAfterStatus(null)).toBeNull();
    expect([...QUEUE_SUBMIT_TRANSITION_STATUSES]).toEqual(["submitted", "in_review"]);

    const first = collectFirstSubmitAts([
      { entity_id: "t1", at: "2026-02-01T00:00:00Z", after: { status: "draft" } },
      { entity_id: "t1", at: "2026-03-01T00:00:00Z", after: { status: "in_review" } },
      { entity_id: "t1", at: "2026-04-01T00:00:00Z", after: { status: "in_review" } },
      { entity_id: "t2", at: "2026-03-15T00:00:00Z", after: { status: "submitted" } },
      { entity_id: "t3", at: "2026-03-20T00:00:00Z", after: { title: "only" } },
    ]);
    expect(first.get("t1")).toBe("2026-03-01T00:00:00Z");
    expect(first.get("t2")).toBe("2026-03-15T00:00:00Z");
    expect(first.has("t3")).toBe(false);
  });

  it("keeps Queue nav without a floating Licensing Status CTA", () => {
    expect(QUEUE_PAGE.title).toBe("Queue");
    expect(QUEUE_PAGE.empty).toBe("Nothing waiting.");
    expect(QUEUE_PAGE).not.toHaveProperty("licensingStatus");
    expect(QUEUE_PAGE).not.toHaveProperty("licensingStatusHref");
    expect(GC_NAV.find((item) => item.href === "/staff/gc/deliveries")?.label).toBe("Licensing Status");
    expect(queueOrgName("Meridian")).toBe("Meridian");
    expect(queueOrgName("")).toBe("—");
  });
});
