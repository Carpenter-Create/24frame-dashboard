import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  APP_SHEET_MOTION_DURATION_MS,
  APP_SHEET_MOTION_EASING,
  APP_SHEET_RISE_CLASS,
  APP_SHEET_SURFACE_CLASS,
  CLOSE_44_CLASS,
  HOUSE_EMPTY_CLASS,
  SHEET_GROUP_INSET_CLASS,
  SHEET_GROUP_INSET_ITEM_CLASS,
  TEXT_ACTION_CLASS,
} from "@/lib/house-sheet";
import { ACCOUNT_PHOTO_HREF } from "@/lib/account-avatar";
import {
  AppSheetSurface,
  Close44,
  HouseEmpty,
  IdentityAvatar,
  IdentityBlock,
  SheetGroup,
  SheetGroupItem,
  TextAction,
} from "./house";

const here = dirname(fileURLToPath(import.meta.url));
const houseSrc = readFileSync(join(here, "house.tsx"), "utf8");
const accountSrc = readFileSync(join(here, "account-sheet.tsx"), "utf8");
const destsSrc = readFileSync(join(here, "house-phone-bottom-nav.tsx"), "utf8");
const headerSrc = readFileSync(join(here, "messages-app-header.tsx"), "utf8");

describe("house primitives", () => {
  it("exports Close/44, Text action, Identity, Group, and app-sheet chrome", () => {
    const close = renderToStaticMarkup(
      <Close44 label="Close account" onClick={() => undefined} />,
    );
    const action = renderToStaticMarkup(<TextAction href="/settings">Manage account</TextAction>);
    const identity = renderToStaticMarkup(
      <IdentityBlock avatarInitial="A" name="" email="ada@example.com" />,
    );
    const avatar = renderToStaticMarkup(<IdentityAvatar avatarInitial="AL" />);
    const group = renderToStaticMarkup(
      <SheetGroup label="ACCOUNT">
        <SheetGroupItem item="agreements" href="/settings/agreements">
          Agreements
        </SheetGroupItem>
      </SheetGroup>,
    );
    const empty = renderToStaticMarkup(<HouseEmpty>Help is empty.</HouseEmpty>);
    const sheet = renderToStaticMarkup(<AppSheetSurface>body</AppSheetSurface>);

    expect(close).toContain(CLOSE_44_CLASS);
    expect(empty).toContain(HOUSE_EMPTY_CLASS);
    expect(empty).toContain("Help is empty.");
    expect(close).toContain('fill="currentColor"');
    expect(close).toContain('viewBox="0 0 256 256"');
    expect(close).not.toContain("stroke-width");
    expect(close).not.toContain("lucide-");
    expect(houseSrc).toContain('<X className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />');
    expect(action).toContain(TEXT_ACTION_CLASS);
    expect(action).toContain('href="/settings"');
    expect(identity).toContain("data-identity-avatar");
    expect(avatar).toContain("data-identity-avatar");
    expect(avatar).toContain(">AL<");
    expect(identity).toContain("data-identity-name");
    expect(identity).toContain("ada@example.com");
    expect(identity).toContain(">A<");
    expect(identity).not.toContain("<img");
    expect(identity).not.toContain("data-identity-photo");
    expect(identity).not.toContain("—");
    expect(group).toContain("ACCOUNT");
    expect(group).toContain("Agreements");
    expect(sheet).toContain(APP_SHEET_SURFACE_CLASS);
    expect(sheet).toContain(APP_SHEET_RISE_CLASS);
    expect(houseSrc).toContain("543:562");
    expect(houseSrc).toContain("543:563");
    expect(houseSrc).toContain("543:565");
    expect(houseSrc).toContain("543:570");
    expect(houseSrc).toContain("543:576");
    expect(houseSrc).not.toContain("544:592");
  });

  it("is consumed by the account sheet — dest chips are not an app-sheet", () => {
    expect(accountSrc).toContain("from \"./house\"");
    expect(accountSrc).toContain("<Close44");
    expect(accountSrc).toContain("<IdentityBlock");
    expect(accountSrc).not.toContain("<TextAction");
    expect(accountSrc).toContain("<SheetGroup");
    expect(destsSrc).not.toContain("from \"./house\"");
    expect(destsSrc).not.toContain("<Close44");
    expect(destsSrc).not.toContain("<AppSheetSurface");
    expect(destsSrc).not.toContain("rounded-t-[24px]");
    expect(headerSrc).not.toContain("from \"./house\"");
    expect(headerSrc).toContain("from \"./menu-surface\"");
    expect(headerSrc).toContain("<ThreadPopoverContent");
    expect(headerSrc).toContain("<ThreadPopoverItem");
    expect(headerSrc).toContain("THREAD_POPOVER_ICON_CLASS");
    expect(houseSrc).not.toContain("DropdownMenuPrimitive");
    expect(houseSrc).not.toContain("ThreadPopoverContent");
    expect(houseSrc).not.toContain("THREAD_POPOVER_CONTENT_CLASS");
    expect(houseSrc).not.toContain("min-w-[17.5rem]");
    expect(accountSrc).not.toMatch(/duration-\d|ease-out|ease-in|animate-|translateY|@keyframes|bounce/i);
    expect(destsSrc).not.toMatch(/duration-\d|ease-out|ease-in|animate-|translateY|@keyframes|bounce/i);
    expect(accountSrc).not.toContain(`${APP_SHEET_MOTION_DURATION_MS}`);
    expect(destsSrc).not.toContain(`${APP_SHEET_MOTION_DURATION_MS}`);
    expect(accountSrc).not.toContain(APP_SHEET_MOTION_EASING);
    expect(destsSrc).not.toContain(APP_SHEET_MOTION_EASING);
  });

  it("shows the signed face when one exists and keeps the initial when empty", () => {
    const withFace = renderToStaticMarkup(
      <IdentityBlock
        avatarInitial="A"
        photoUrl="https://s3.example/signed-avatar"
        name="Ada Lovelace"
        email="ada@example.com"
      />,
    );
    const empty = renderToStaticMarkup(
      <IdentityBlock avatarInitial="A" photoUrl={null} name="" email="ada@example.com" />,
    );
    const blank = renderToStaticMarkup(
      <IdentityBlock avatarInitial="A" photoUrl="   " name="" email="ada@example.com" />,
    );

    expect(withFace).toContain('src="https://s3.example/signed-avatar"');
    expect(withFace).toContain("data-identity-photo");
    expect(withFace).toContain("overflow-hidden");
    expect(withFace).toContain("object-cover");
    expect(withFace).not.toContain(">A<");
    expect(empty).toContain(">A<");
    expect(empty).not.toContain("<img");
    expect(empty).not.toContain("data-identity-photo");
    expect(blank).toContain(">A<");
    expect(blank).not.toContain("<img");
    expect(houseSrc).toContain("accountPhotoSrc");
    expect(houseSrc).toContain("IdentityPhoto");
    expect(houseSrc).toContain("IdentityAvatar");
    expect(houseSrc).toContain("<IdentityAvatar");
    expect(houseSrc).toContain("onError");
    expect(houseSrc).not.toContain("signedAvatarUrl");
    expect(houseSrc).not.toContain("uploadAccountPhoto");

    const sameOrigin = renderToStaticMarkup(
      <IdentityBlock
        avatarInitial="A"
        photoUrl={ACCOUNT_PHOTO_HREF}
        name="Ada Lovelace"
        email="ada@example.com"
      />,
    );
    expect(sameOrigin).toContain(`src="${ACCOUNT_PHOTO_HREF}"`);
    expect(sameOrigin).not.toContain(">A<");
    expect(sameOrigin).not.toContain("?");
    expect(sameOrigin).toContain('fetchPriority="high"');
  });

  it("puts a hairline between inset rows and leaves a one-row card bare", () => {
    const paired = renderToStaticMarkup(
      <SheetGroup inset groupId="preferences">
        <SheetGroupItem inset item="settings" href="/settings">
          Settings
        </SheetGroupItem>
        <SheetGroupItem inset item="theme" href="/settings/preferences/theme">
          Theme
        </SheetGroupItem>
      </SheetGroup>,
    );
    const alone = renderToStaticMarkup(
      <SheetGroup inset groupId="help">
        <SheetGroupItem inset item="help" href="/help">
          Get Help
        </SheetGroupItem>
      </SheetGroup>,
    );

    expect(paired).toContain("data-sheet-group-inset");
    expect(paired).toContain('data-sheet-group-id="preferences"');
    expect(paired).toContain(SHEET_GROUP_INSET_CLASS);
    expect(paired).toContain(SHEET_GROUP_INSET_ITEM_CLASS);
    expect(paired.indexOf('data-sheet-group-item="settings"')).toBeLessThan(
      paired.indexOf("data-sheet-group-rule"),
    );
    expect(paired.indexOf("data-sheet-group-rule")).toBeLessThan(
      paired.indexOf('data-sheet-group-item="theme"'),
    );
    expect(paired.match(/data-sheet-group-rule/g)).toHaveLength(1);
    expect(alone).not.toContain("data-sheet-group-rule");
    expect(alone).toContain('data-sheet-group-id="help"');
  });
});
