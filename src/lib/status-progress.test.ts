import { describe, expect, it } from "vitest";

import { TITLE_STATUS_LABELS, type DeliveryStatus, type TitleStatus } from "@/lib/titles";
import {
  DELIVERY_STATUS_OFF_TRACK,
  DELIVERY_STATUS_TRACK_STEPS,
  STATUS_PROGRESS_HOST_CLASS,
  STATUS_PROGRESS_LABEL_CLASS,
  STATUS_PROGRESS_OFF_CLASS,
  STATUS_PROGRESS_SEG_OFF_CLASS,
  STATUS_PROGRESS_SEG_ON_CLASS,
  STATUS_PROGRESS_TRACK_CLASS,
  TITLE_STATUS_OFF_TRACK,
  TITLE_STATUS_TRACK_STEPS,
  deliveryStatusProgress,
  statusProgressAriaLabel,
  statusProgressFilledCount,
  titleStatusProgress,
} from "./status-progress";

describe("titleStatusProgress", () => {
  it("maps on-track titles through current inclusive", () => {
    const draft = titleStatusProgress("draft");
    expect(draft.variant).toBe("pipeline");
    expect(draft.label).toBe("Draft");
    expect(draft.currentIndex).toBe(0);
    expect(statusProgressFilledCount(draft)).toBe(1);
    expect(draft.steps).toEqual([...TITLE_STATUS_TRACK_STEPS]);
    expect(statusProgressAriaLabel(draft)).toBe("Draft, step 1 of 5");

    const submitted = titleStatusProgress("submitted");
    expect(submitted.label).toBe("Submitted");
    expect(submitted.currentIndex).toBe(1);
    expect(statusProgressFilledCount(submitted)).toBe(2);

    const inReview = titleStatusProgress("in_review");
    expect(inReview.label).toBe("In review");
    expect(inReview.currentIndex).toBe(2);
    expect(statusProgressFilledCount(inReview)).toBe(3);

    const inDelivery = titleStatusProgress("in_delivery");
    expect(inDelivery.label).toBe("In delivery");
    expect(inDelivery.label).not.toBe(TITLE_STATUS_LABELS.in_delivery);
    expect(TITLE_STATUS_LABELS.in_delivery).toBe("Submitted");
    expect(inDelivery.currentIndex).toBe(3);
    expect(statusProgressFilledCount(inDelivery)).toBe(4);

    const live = titleStatusProgress("live");
    expect(live.label).toBe("Approved");
    expect(live.currentIndex).toBe(4);
    expect(statusProgressFilledCount(live)).toBe(5);
    expect(statusProgressAriaLabel(live)).toBe("Approved, step 5 of 5");
  });

  it("treats derived live (≥1 delivery live) as Approved 5/5", () => {
    for (const status of ["draft", "submitted", "in_review", "in_delivery"] as const) {
      const model = titleStatusProgress(status, 1);
      expect(model.variant).toBe("pipeline");
      expect(model.label).toBe("Approved");
      expect(model.currentIndex).toBe(4);
      expect(statusProgressFilledCount(model)).toBe(5);
    }
    expect(titleStatusProgress("live", 2).label).toBe("Approved");
  });

  it("keeps official off-pipeline takedown statuses as muted badges", () => {
    expect([...TITLE_STATUS_OFF_TRACK]).toEqual(["takedown_requested", "taken_down"]);
    expect(TITLE_STATUS_OFF_TRACK).not.toContain("archived");
    for (const status of TITLE_STATUS_OFF_TRACK) {
      const model = titleStatusProgress(status, 3);
      expect(model.variant).toBe("off");
      expect(model.currentIndex).toBe(-1);
      expect(statusProgressFilledCount(model)).toBe(0);
      expect(model.label).toBe(TITLE_STATUS_LABELS[status]);
      expect(statusProgressAriaLabel(model)).toBe(TITLE_STATUS_LABELS[status]);
    }
  });

  it("does not invent stages or reuse filter Submitted for in_delivery", () => {
    expect([...TITLE_STATUS_TRACK_STEPS]).toEqual([
      "Draft",
      "Submitted",
      "In review",
      "In delivery",
      "Approved",
    ]);
    expect(titleStatusProgress("in_delivery").steps).not.toContain("Delivered");
    expect(titleStatusProgress("upcoming" as TitleStatus).variant).toBe("off");
  });
});

describe("deliveryStatusProgress", () => {
  it("maps pending / delivered / live as 1/3 · 2/3 · 3/3", () => {
    const pending = deliveryStatusProgress("pending");
    expect(pending.variant).toBe("pipeline");
    expect(pending.label).toBe("Pending");
    expect(pending.currentIndex).toBe(0);
    expect(statusProgressFilledCount(pending)).toBe(1);
    expect(pending.steps).toEqual([...DELIVERY_STATUS_TRACK_STEPS]);

    const delivered = deliveryStatusProgress("delivered");
    expect(delivered.label).toBe("Delivered");
    expect(delivered.currentIndex).toBe(1);
    expect(statusProgressFilledCount(delivered)).toBe(2);

    const live = deliveryStatusProgress("live");
    expect(live.label).toBe("Approved");
    expect(live.currentIndex).toBe(2);
    expect(statusProgressFilledCount(live)).toBe(3);
    expect(statusProgressAriaLabel(live)).toBe("Approved, step 3 of 3");
  });

  it("keeps rejected and taken_down as muted badges", () => {
    for (const status of DELIVERY_STATUS_OFF_TRACK) {
      const model = deliveryStatusProgress(status);
      expect(model.variant).toBe("off");
      expect(model.currentIndex).toBe(-1);
      expect(statusProgressFilledCount(model)).toBe(0);
    }
    expect(deliveryStatusProgress("rejected").label).toBe("Rejected");
    expect(deliveryStatusProgress("taken_down").label).toBe("Taken down");
    expect(deliveryStatusProgress("unknown" as DeliveryStatus).variant).toBe("off");
  });
});

describe("status progress tokens", () => {
  it("fills with Sporty Blue and leaves empty segments on the muted surface", () => {
    expect(STATUS_PROGRESS_SEG_ON_CLASS).toContain("bg-accent");
    expect(STATUS_PROGRESS_SEG_ON_CLASS).not.toMatch(/green|emerald|rose|red|yellow/);
    expect(STATUS_PROGRESS_SEG_OFF_CLASS).toContain("bg-surface-muted");
    expect(STATUS_PROGRESS_SEG_OFF_CLASS).not.toContain("bg-accent");
  });

  it("keeps the track thin (2–3px), not a chunky bar", () => {
    expect(STATUS_PROGRESS_TRACK_CLASS).toBe("flex h-[3px] w-full gap-1.5 overflow-hidden rounded-full");
    expect(STATUS_PROGRESS_TRACK_CLASS).toContain("h-[3px]");
    expect(STATUS_PROGRESS_TRACK_CLASS).not.toMatch(/\bh-3\b|\bh-3\.5\b|\bh-4\b/);
    expect(STATUS_PROGRESS_TRACK_CLASS).toContain("gap-1.5");
    expect(STATUS_PROGRESS_TRACK_CLASS).not.toMatch(/\bgap-px\b|\bgap-0\b/);
    expect(STATUS_PROGRESS_LABEL_CLASS).toBe("t-body-sm text-ink-3");
    expect(STATUS_PROGRESS_LABEL_CLASS).not.toContain("t-label");
    expect(STATUS_PROGRESS_HOST_CLASS).toContain("mr-[var(--space-4)]");
    expect(STATUS_PROGRESS_OFF_CLASS).toContain("mr-[var(--space-4)]");
  });
});
