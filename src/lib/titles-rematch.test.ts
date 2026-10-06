import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TITLE_DETAIL } from "@/lib/titles";

const ROOT = process.cwd();

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const titlesPage = src("src/app/(app)/aggregation/titles/page.tsx");
const titlesCatalog = src("src/components/titles/titles-catalog.tsx");
const titleDetail = src("src/app/(app)/aggregation/titles/[id]/page.tsx");
const titleHero = src("src/components/layout/title-hero.tsx");
const metadataPage = src("src/app/(app)/aggregation/titles/[id]/metadata/page.tsx");

describe("titles rematch miss list v1 — P0 gates", () => {
  it("G1: Titles H1 has no catalog-count subtitle", () => {
    expect(titlesPage).not.toContain("catalogCountLabel");
    expect(titlesPage).not.toContain("in catalog");
    expect(titlesCatalog).not.toContain("data-titles-catalog-count");
    expect(titlesCatalog).not.toMatch(/count\s*\?/);
  });

  it("G2: H1 → toolbar → rows sit on tight 8 air", () => {
    expect(titlesCatalog).toContain("gap-[var(--space-2)]");
    expect(titlesCatalog).not.toContain("md:gap-[var(--space-8)]");
    expect(titlesPage).toContain("TitlesCatalogToolbar");
    expect(titlesPage).toContain("TitlesCatalogList");
  });

  it("G3: detail hero is leading art + side meta, not a full-bleed band", () => {
    expect(titleHero).toContain("data-title-hero-band");
    expect(titleHero).toContain("md:flex-row");
    expect(titleHero).toContain("data-title-hero-meta");
    expect(titleHero).toContain("rounded-[var(--radius-lg)]");
    expect(titleHero).toContain("aspect-[16/9]");
    expect(titleHero).toContain("aspect-square");
    expect(titleHero).not.toContain("bg-band");
    expect(titleHero).not.toContain("from-black");
    expect(titleDetail).toContain("TrailerPlayButton");
    expect(titleDetail).toMatch(/trailer\s*\?\s*<TrailerPlayButton/);
    expect(TITLE_DETAIL.playTrailer).toBe("Play trailer");
  });

  it("G4: body uses product-true section headers and omits empty blocks", () => {
    expect(titleDetail).toContain("TITLE_DETAIL.sectionSynopsis");
    expect(titleDetail).toContain("TITLE_DETAIL.sectionMetadata");
    expect(titleDetail).toContain("TITLE_DETAIL.sectionAssets");
    expect(titleDetail).toContain("TITLE_DETAIL.sectionCredits");
    expect(titleDetail).toContain("data-title-detail-section");
    expect(titleDetail).toContain("border-t border-hairline");
    expect(titleDetail).toContain("synopsis ?");
    expect(titleDetail).toContain("showCredits");
    expect(titleDetail).toContain("showAssets");
    expect(TITLE_DETAIL.sectionSynopsis).toBe("Synopsis");
    expect(TITLE_DETAIL.sectionMetadata).toBe("Metadata");
    expect(TITLE_DETAIL.sectionAssets).toBe("Assets");
    expect(TITLE_DETAIL.sectionCredits).toBe("Credits");
  });

  it("G5: client URL + chrome use 24F- and normalize other slugs", () => {
    expect(titlesPage).toContain("titleClientPath");
    expect(titlesPage).toContain("publicCatalogId");
    expect(titlesPage).not.toContain("`/titles/${r.id}`");
    expect(titleDetail).toContain("firstTitleMatch");
    expect(titleDetail).toContain("isCanonicalTitleSlug");
    expect(titleDetail).toContain("titleClientPath(title.catalog_id)");
    expect(titleDetail).not.toContain(".eq(\"id\", id)");
    expect(titleDetail).not.toContain(".eq(\"id\", slug)");
    expect(metadataPage).toContain("firstTitleMatch");
    expect(metadataPage).toContain('titleClientPath(title.catalog_id, "/metadata")');
    expect(src("src/lib/title-public-id.ts")).toContain('CLIENT_CATALOG_PREFIX = "24F"');
    expect(titlesPage).toContain("publicId");
  });

  it("G6: house light chrome stays — no dark clone, no invented Play", () => {
    for (const contents of [titleHero, titleDetail, titlesCatalog, titlesPage]) {
      expect(contents).not.toContain("bg-band");
      expect(contents).not.toContain("from-black");
      expect(contents).not.toContain("bg-gradient");
      expect(contents).not.toMatch(/Filmhub/i);
      expect(contents).not.toMatch(/Apple Music/i);
    }
    expect(titleDetail).not.toContain("Shuffle");
    expect(titleDetail).toContain("trailer ? <TrailerPlayButton");
  });
});
