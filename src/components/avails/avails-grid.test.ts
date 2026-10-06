import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AVAILS_PAGE } from "@/lib/avails";
import { TITLES_LANDSCAPE_ART_CLASS, TITLES_ROW_NAME_CLASS } from "@/lib/titles-catalog";

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
  }: {
    src: string;
    className?: string;
  }) => createElement("img", { src, className, alt: "" }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

import { AvailsGrid, AvailsTile } from "./avails-grid";

function openingTagWith(html: string, marker: string): string {
  const at = html.indexOf(marker);
  const start = html.lastIndexOf("<", at);
  const end = html.indexOf(">", at);
  return html.slice(start, end + 1);
}

describe("AvailsGrid avails-grid-3", () => {
  it("is a 3-wide landscape tile grid that reuses Titles art + quiet title", () => {
    const html = renderToStaticMarkup(
      createElement(AvailsGrid, {
        tiles: [
          {
            id: "t1",
            href: "/gc/titles/t1",
            title: "Craft film",
            stillUrl: "https://cdn/wide.jpg",
          },
        ],
      }),
    );
    const grid = openingTagWith(html, 'data-avails-grid=""');
    const tile = openingTagWith(html, 'data-avails-tile=""');
    const art = openingTagWith(html, 'data-titles-landscape-art=""');
    const name = openingTagWith(html, 'data-avails-tile-title=""');

    expect(grid).toContain("grid-cols-1");
    expect(grid).toContain("md:grid-cols-3");
    expect(grid).toContain("gap-[var(--space-4)]");
    expect(grid).not.toContain("grid-cols-2");
    expect(tile).toContain('href="/gc/titles/t1"');
    expect(art).toContain("aspect-[16/9]");
    expect(art).toContain("rounded-[var(--radius-lg)]");
    expect(art).not.toContain("md:w-[160px]");
    expect(html).toContain("data-titles-catalog-crop");
    expect(html).toContain("https://cdn/wide.jpg");
    expect(html).toContain("Craft film");
    expect(name).toContain(TITLES_ROW_NAME_CLASS.split(" ")[0]);
    expect(html).not.toContain("data-status-progress");
    expect(html).not.toContain("data-titles-catalog-list");
    expect(html).not.toContain("aspect-[2/3]");
    expect(html).not.toContain("territory");
    expect(html).not.toContain("BannerCard");
  });

  it("keeps a null still as the shared Titles camera wash", () => {
    const html = renderToStaticMarkup(
      createElement(AvailsTile, {
        id: "t2",
        href: "/gc/titles/t2",
        title: "Empty film",
        stillUrl: null,
      }),
    );

    expect(html).toContain("data-titles-catalog-empty-art");
    expect(html).toContain("data-titles-landscape-art");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("t-data select-none text-3xl");
    expect(html).not.toContain("data-status-progress");
  });

  it("renders a quiet structured empty with no CTA or track", () => {
    const html = renderToStaticMarkup(createElement(AvailsGrid, { tiles: [] }));
    const empty = openingTagWith(html, 'data-avails-empty=""');

    expect(html).toContain(AVAILS_PAGE.empty);
    expect(empty).toContain("border-hairline");
    expect(html).not.toContain("data-avails-grid");
    expect(html).not.toContain("data-avails-tile");
    expect(html).not.toContain("Nothing waiting.");
    expect(html).not.toContain("Add Title");
    expect(html).not.toContain("data-status-progress");
    expect(html).not.toContain("<a");
  });

  it("imports TitlesLandscapeArt instead of forking a card", () => {
    const src = readFileSync("src/components/avails/avails-grid.tsx", "utf8");
    expect(src).toContain("TitlesLandscapeArt");
    expect(src).toContain("@/components/titles/titles-catalog");
    expect(src).toContain("AVAILS_TILE_ART_CLASS");
    expect(src).not.toContain("BannerCard");
    expect(src).not.toContain("PosterCard");
    expect(src).not.toContain("StatusProgressTrack");
    expect(src).not.toContain("TitlesCatalogListRow");
    expect(TITLES_LANDSCAPE_ART_CLASS).toContain("aspect-[16/9]");
  });
});
