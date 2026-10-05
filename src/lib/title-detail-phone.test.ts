import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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

import { TitleHero } from "@/components/layout/title-hero";
import {
  HOUSE_PHONE_CONTAIN_CLASS,
  HOUSE_PHONE_STACK_CLASS,
  HOUSE_PHONE_WRAP_CLASS,
  housePhoneForbidsTruncate,
} from "@/lib/house-phone-stack";
import {
  TITLE_DETAIL_ASSET_FILE_CLASS,
  TITLE_DETAIL_FORM_ROW_CLASS,
  TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS,
  TITLE_DETAIL_LEDGER_META_CLASS,
  TITLE_DETAIL_LEDGER_ROW_CLASS,
  TITLE_DETAIL_SURFACE_CLASS,
} from "@/lib/titles";

function src(rel: string): string {
  return readFileSync(rel, "utf8");
}

const titleDetail = src("src/app/(app)/aggregation/titles/[id]/page.tsx");
const titleHero = src("src/components/layout/title-hero.tsx");
const fieldList = src("src/components/layout/field-list.tsx");
const fieldListLib = src("src/lib/field-list.ts");
const titlesLib = src("src/lib/titles.ts");
const releaseInfo = src("src/app/(app)/aggregation/titles/[id]/release-info-form.tsx");
const buyerShare = src("src/app/(app)/aggregation/titles/[id]/buyer-share-control.tsx");

const TITLE_DETAIL_PATH = [
  titleDetail,
  titleHero,
  fieldList,
  fieldListLib,
  titlesLib,
  releaseInfo,
  buyerShare,
].join("\n");

describe("title detail phone containment", () => {
  it("locks the page surface to house overflow-x-clip containment", () => {
    expect(TITLE_DETAIL_SURFACE_CLASS).toBe(HOUSE_PHONE_CONTAIN_CLASS);
    expect(TITLE_DETAIL_SURFACE_CLASS).toContain("overflow-x-clip");
    expect(TITLE_DETAIL_SURFACE_CLASS).toContain("min-w-0");
    expect(TITLE_DETAIL_SURFACE_CLASS).toContain("max-w-full");
    expect(titlesLib).toContain("HOUSE_PHONE_CONTAIN_CLASS");
    expect(titleDetail).toContain("TITLE_DETAIL_SURFACE_CLASS");
    expect(titleDetail).toContain('data-title-detail=""');
  });

  it("phone-stacks FieldList and title-detail ledgers from one SoT", () => {
    expect(titleDetail).toContain("TITLE_DETAIL_LEDGER_ROW_CLASS");
    expect(titleDetail).toContain("TITLE_DETAIL_ASSET_FILE_CLASS");
    expect(fieldList).toContain("FIELD_LIST_ROW_CLASS");
    expect(fieldListLib).toContain("HOUSE_PHONE_STACK_CLASS");
    expect(TITLE_DETAIL_LEDGER_ROW_CLASS).toContain(HOUSE_PHONE_STACK_CLASS);
    expect(TITLE_DETAIL_LEDGER_ROW_CLASS).toContain("md:flex-row");
    expect(TITLE_DETAIL_LEDGER_META_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(TITLE_DETAIL_ASSET_FILE_CLASS).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS).toContain(HOUSE_PHONE_STACK_CLASS);
    expect(TITLE_DETAIL_FORM_ROW_CLASS).toContain(HOUSE_PHONE_STACK_CLASS);
    expect(releaseInfo).toContain("TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS");
    expect(buyerShare).toContain("TITLE_DETAIL_FORM_ROW_CLASS");
  });

  it("forbids known overflow offenders on the title-detail path", () => {
    expect(housePhoneForbidsTruncate(TITLE_DETAIL_SURFACE_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(TITLE_DETAIL_LEDGER_ROW_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(TITLE_DETAIL_ASSET_FILE_CLASS)).toBe(true);
    expect(titleDetail).not.toMatch(/className="[^"]*\btruncate\b/);
    expect(titleHero).not.toMatch(/className="[^"]*\btruncate\b/);
    expect(fieldList).not.toContain("truncate");
    expect(buyerShare).not.toContain("truncate");
    expect(TITLE_DETAIL_PATH).not.toContain("overflow-x-auto");
    expect(TITLE_DETAIL_PATH).not.toContain("w-screen");
    expect(TITLE_DETAIL_PATH).not.toMatch(/className=\{?["'`][^"'`]*\b100vw\b/);
    expect(titleDetail).not.toContain("overflow-x-auto");
    expect(titleHero).not.toContain("overflow-x-auto");
  });

  it("renders TitleHero with contain + wrap, not a sideways band", () => {
    const html = renderToStaticMarkup(
      createElement(TitleHero, {
        title: "A very-long-unbroken-title-string-that-must-wrap-on-phone",
        backHref: "/aggregation/titles",
        status: "live",
        bannerUrl: "https://cdn/wide.jpg",
        meta: ["2019", "Drama", "24F-0001234"],
        action: createElement("button", null, "Play trailer"),
      }),
    );
    const heroAt = html.indexOf('data-title-hero=""');
    const heroTag = html.slice(html.lastIndexOf("<", heroAt), html.indexOf(">", heroAt) + 1);
    const bandAt = html.indexOf('data-title-hero-band=""');
    const bandTag = html.slice(html.lastIndexOf("<", bandAt), html.indexOf(">", bandAt) + 1);
    expect(heroTag).toContain(HOUSE_PHONE_CONTAIN_CLASS);
    expect(bandTag).toContain(HOUSE_PHONE_CONTAIN_CLASS);
    expect(html).toContain(HOUSE_PHONE_WRAP_CLASS);
    expect(html).toContain("min-w-0");
    expect(html).toContain("A very-long-unbroken-title-string-that-must-wrap-on-phone");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("overflow-x-auto");
  });
});
