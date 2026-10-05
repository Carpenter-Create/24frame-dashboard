import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DASHBOARD_LICENSING } from "@/lib/dashboard-licensing";
import { STATUS_PROGRESS_LABEL_CLASS, STATUS_PROGRESS_TRACK_CLASS } from "@/lib/status-progress";
import { DashboardLicensingStatus } from "./dashboard-licensing-status";

describe("DashboardLicensingStatus", () => {
  it("nests landscape art + title with endpoint StatusProgressTrack rows", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardLicensingStatus, {
        snapshot: {
          groups: [
            {
              id: "t1",
              title: "Winter Light",
              href: "/titles/24F-0001234",
              stillUrl: null,
              endpoints: [
                {
                  deliveryId: "d1",
                  endpoint: "Endpoint A",
                  territory: "US",
                  status: "pending",
                  updatedAt: "2026-09-12T00:00:00.000Z",
                },
                {
                  deliveryId: "d2",
                  endpoint: "Endpoint B",
                  territory: "CA",
                  status: "rejected",
                  updatedAt: "2026-09-11T00:00:00.000Z",
                },
              ],
            },
          ],
        },
      }),
    );
    expect(html).toContain('data-dashboard-module="licensing-status"');
    expect(html).toContain(DASHBOARD_LICENSING.title);
    expect(html).toContain('href="/aggregation/titles"');
    expect(html).not.toContain('href="/catalog-health"');
    expect(html).not.toContain('href="/licensing"');
    expect(html).toContain("Winter Light");
    expect(html).toContain('href="/titles/24F-0001234"');
    expect(html).toContain("data-dashboard-licensing-thumb");
    expect(html).toContain("data-dashboard-licensing-empty-art");
    expect(html).toContain("data-dashboard-licensing-endpoints");
    expect(html).toContain("Endpoint A");
    expect(html).toContain("Endpoint B");
    expect(html).toContain("data-dashboard-licensing-endpoint-meta");
    expect(html).toContain('data-status-progress-variant="pipeline"');
    expect(html).toContain('data-status-progress-variant="off"');
    expect(html).toContain("Pending");
    expect(html).toContain("Rejected");
    expect(html).toContain(STATUS_PROGRESS_LABEL_CLASS);
    expect(html).toContain(STATUS_PROGRESS_TRACK_CLASS);
    expect(html).not.toContain("data-dashboard-licensing-summary");
    expect(html).not.toContain("Ready");
    expect(html).not.toContain("Licensed");
    expect(html).not.toContain("bg-black");
    const meta = html.indexOf("data-dashboard-licensing-endpoint-meta");
    expect(html.slice(meta, meta + 180)).toContain("t-body-sm");
    expect(html.slice(meta, meta + 180)).not.toContain("t-label");
    expect(html.slice(meta, meta + 180)).not.toContain("t-display");
  });

  it("keeps an empty grade quiet", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardLicensingStatus, {
        snapshot: { groups: [] },
      }),
    );
    expect(html).toContain(DASHBOARD_LICENSING.empty);
    expect(html).toContain("data-dashboard-licensing-empty");
    expect(html).not.toContain("Sample");
    expect(html).not.toContain("data-dashboard-licensing-summary");
  });

  it("keeps #364 track craft — label above, dash gaps, trailing inset", () => {
    const component = readFileSync("src/components/dashboard/dashboard-licensing-status.tsx", "utf8");
    expect(component).toContain('pipeline="delivery"');
    expect(component).toContain("StatusProgressTrack");
  });
});
