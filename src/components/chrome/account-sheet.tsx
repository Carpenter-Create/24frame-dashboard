"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CaretRight, Gear, Moon, Question, SignOut, Sun } from "@phosphor-icons/react";

import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";

import { signOut } from "@/app/actions";
import { accountPhotoSrc } from "@/lib/account-avatar";
import { appearancePreferenceLabel } from "@/lib/appearance";
import { useThemePreference } from "@/components/theme-toggle";
import type { ThemePreference } from "@/lib/theme";
import {
  AppSheetHairline,
  Close44,
  IdentityAvatar,
  IdentityBlock,
  IdentityPhoto,
  SheetGroup,
  SheetGroupItem,
} from "./house";
import { useHousePathname } from "./house-client-shell";
import { HouseLink } from "./house-link";
import {
  ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS,
  ACCOUNT_MENU_DROPDOWN_ALIGN,
  ACCOUNT_MENU_DROPDOWN_AVATAR_CLASS,
  ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS,
  ACCOUNT_MENU_DROPDOWN_EMAIL_CLASS,
  ACCOUNT_MENU_DROPDOWN_FOOTER_CLASS,
  ACCOUNT_MENU_DROPDOWN_HEAD_CLASS,
  ACCOUNT_MENU_DROPDOWN_HOST_CLASS,
  ACCOUNT_MENU_DROPDOWN_ICON_CLASS,
  ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS,
  ACCOUNT_MENU_DROPDOWN_MANAGE_CLASS,
  ACCOUNT_MENU_DROPDOWN_NAME_CLASS,
  ACCOUNT_MENU_DROPDOWN_ROW_CLASS,
  ACCOUNT_MENU_DROPDOWN_ROWS_CLASS,
  ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS,
  ACCOUNT_MENU_THEME_CHEVRON_CLASS,
  ACCOUNT_MENU_THEME_LABEL_CLASS,
  ACCOUNT_MENU_THEME_TRAILING_CLASS,
  ACCOUNT_MENU_THEME_VALUE_CLASS,
  ACCOUNT_MENU_DROPDOWN_VERSION_CLASS,
  ACCOUNT_MENU_DROPDOWN_WHO_CLASS,
  accountMenuDropdownAlignEnd,
  type AccountMenuDropdownAlign,
  ACCOUNT_SHEET,
  ACCOUNT_SHEET_FOOTER_CLASS,
  ACCOUNT_SHEET_GROUP_CLASS,
  ACCOUNT_SHEET_HEAD_CLASS,
  accountSheetGroupedRows,
  ACCOUNT_SHEET_HOST_CLASS,
  ACCOUNT_SHEET_ITEMS,
  ACCOUNT_SHEET_PHONE_ITEMS,
  ACCOUNT_SHEET_LEFTOVER_CLASS,
  ACCOUNT_SHEET_LOGOUT_CLASS,
  ACCOUNT_SHEET_LOGOUT_STACK_CLASS,
  ACCOUNT_SHEET_PIN_CLASS,
  ACCOUNT_SHEET_SCROLL_CLASS,
  ACCOUNT_SHEET_STAGE_CLASS,
  ACCOUNT_SHEET_SURFACE_CLASS,
  ACCOUNT_SHEET_VERSION_CLASS,
  ACCOUNT_MENU_ROOT_ATTR,
  accountMenuDestinationClick,
  accountSheetIdentity,
  destinationClickClosesSheet,
} from "@/lib/account-sheet";
import { houseNavIgnorePendingClick } from "@/lib/house-nav-pending";
import {
  HOUSE_HEADER_DESKTOP_AVATAR_CLASS,
  HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS,
  HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS,
} from "@/lib/house-lead-chrome";
import { menuHostClass } from "@/lib/menu-host";
import { APP_SHEET_SCRIM_CLASS, SHEET_GROUP_CHEVRON_CLASS } from "@/lib/house-sheet";
import { settingsLandHref } from "@/lib/settings";
import {
  USER_MENU,
  type UserMenuAction,
  userMenuAvatarInitial,
  userMenuVersion,
} from "@/lib/user-menu";
import { MenuSurfaceAccent } from "./menu-surface";

// Glyph-only. Live sheet/dropdown layout, IA, and chrome stay.
// 84:46 is icon SSOT — not a restyle, not a Mercury escalation.
function AccountRowChevron() {
  return <CaretRight className={SHEET_GROUP_CHEVRON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />;
}

function AccountMenuTrigger({
  email,
  photoUrl,
  open,
  onOpen,
  className,
  faceClassName,
  triggerAttr,
  controlsId,
  host,
  triggerRef,
}: {
  email: string;
  photoUrl?: string | null;
  open: boolean;
  onOpen: () => void;
  className: string;
  /** Set when the hit is larger than the face (phone: 44 hit, 30 face). */
  faceClassName?: string;
  triggerAttr: "data-account-sheet-trigger" | "data-user-menu-trigger";
  controlsId: string;
  host: "phone" | "desktop";
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const initial = userMenuAvatarInitial(email);
  const face = accountPhotoSrc(photoUrl);
  const attrs = { [triggerAttr]: "" } as Record<string, string>;
  const photo = <IdentityPhoto avatarInitial={initial} photoUrl={photoUrl} />;

  return (
    <button
      type="button"
      {...attrs}
      ref={triggerRef}
      data-menu-host={host}
      data-menu-family={host === "phone" ? "A" : "desktop"}
      aria-label={ACCOUNT_SHEET.sheet}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onOpen}
      className={face && !faceClassName ? `${className} overflow-hidden` : className}
    >
      {faceClassName ? (
        <span data-account-trigger-face="" className={faceClassName}>
          {photo}
        </span>
      ) : (
        photo
      )}
    </button>
  );
}

export function useAccountMenuOpen() {
  // Owned hops pushState with __NA and leave Next's pathname where it
  // was. Keying this menu to that pathname left the full-screen host
  // mounted over the Theme picker after the first visit.
  const pathname = useHousePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  // Leaving the page closes the menu for good. Keeping openedOn reopened
  // it on a later hop back to that page.
  if (openedOn !== null && openedOn !== pathname) setOpenedOn(null);
  const open = openedOn !== null && openedOn === pathname;
  return {
    pathname,
    open,
    openMenu: () => setOpenedOn(pathname),
    closeMenu: () => setOpenedOn(null),
  };
}

function useAccountMenuDismiss(onClose: () => void, lockOverflow: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    // Capture on document, not the menu node. The house shell listener
    // calls stopPropagation on an owned Theme click before the event
    // reaches the link, so the row onClick never runs. Other document
    // capture listeners still run. Close only after that listener has
    // preventDefault — the shell already owns the hop. A microtask sees
    // the flag even when this listener was registered first. Closing
    // inside the click would unmount the link before a real Next hop.
    const onClick = (event: MouseEvent) => {
      if (houseNavIgnorePendingClick(event)) return;
      if (!accountMenuDestinationClick(event.target)) return;
      const closeIfOwned = () => {
        if (event.defaultPrevented) onClose();
      };
      if (event.defaultPrevented) closeIfOwned();
      else queueMicrotask(closeIfOwned);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    const previous = document.body.style.overflow;
    if (lockOverflow) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
      if (lockOverflow) document.body.style.overflow = previous;
    };
  }, [onClose, lockOverflow]);
}

function useDesktopAccountMenuAlignEnd(
  open: boolean,
  triggerRef: RefObject<HTMLButtonElement | null>,
) {
  const [alignEnd, setAlignEnd] = useState<AccountMenuDropdownAlign | undefined>();

  useLayoutEffect(() => {
    if (!open) return undefined;
    const sync = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setAlignEnd(
        accountMenuDropdownAlignEnd(
          trigger.getBoundingClientRect(),
          document.documentElement.clientWidth,
        ),
      );
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [open, triggerRef]);

  return alignEnd;
}

function AccountMenuFooter() {
  return (
    <div data-account-sheet-footer="" className={ACCOUNT_SHEET_FOOTER_CLASS}>
      <p data-account-sheet-version="" className={ACCOUNT_SHEET_VERSION_CLASS}>
        {userMenuVersion()}
      </p>
    </div>
  );
}

function AccountMenuLogOut({ onClose }: { onClose: () => void }) {
  return (
    <div data-account-sheet-logout-stack="" className={ACCOUNT_SHEET_LOGOUT_STACK_CLASS}>
      <SheetGroup inset groupId="logOut">
        <button
          type="button"
          data-sheet-group-item="logOut"
          data-user-menu-item="logOut"
          className={ACCOUNT_SHEET_LOGOUT_CLASS}
          onClick={() => {
            onClose();
            void signOut();
          }}
        >
          <SignOut className="size-4 shrink-0" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
          {USER_MENU.logOut}
        </button>
      </SheetGroup>
    </div>
  );
}

function AccountMenuPin({
  onClose,
  className,
}: {
  onClose: () => void;
  className: string;
}) {
  return (
    <div data-account-sheet-pin="" className={className}>
      <AccountMenuLogOut onClose={onClose} />
      <AppSheetHairline data-account-sheet-footer-rule="" />
      <AccountMenuFooter />
    </div>
  );
}

function accountMenuItemHref(item: UserMenuAction, pathname: string): string {
  if (item.kind === "settings") return settingsLandHref(pathname);
  return item.href;
}

function DesktopAccountMenuIcon({
  icon: Glyph,
}: {
  icon: typeof Gear;
}) {
  return (
    <Glyph
      className={ACCOUNT_MENU_DROPDOWN_ICON_CLASS}
      weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
      aria-hidden
    />
  );
}

function DesktopAccountMenuLink({
  item,
  label,
  href,
  pathname,
  onClose,
  icon,
}: {
  item: UserMenuAction["kind"];
  label: string;
  href: string;
  pathname: string;
  onClose: () => void;
  icon: typeof Gear;
}) {
  return (
    <HouseLink
      href={href}
      data-account-menu-row={item}
      data-user-menu-item={item}
      className={ACCOUNT_MENU_DROPDOWN_ROW_CLASS}
      onClick={destinationClickClosesSheet(pathname, href) ? onClose : undefined}
    >
      <DesktopAccountMenuIcon icon={icon} />
      {label}
    </HouseLink>
  );
}

function menuThemeIcon(preference: ThemePreference) {
  return preference === "light" ? Sun : Moon;
}

function AccountThemeStoredValue({
  attr,
}: {
  attr: "data-account-menu-theme-value" | "data-account-sheet-theme-value";
}) {
  const preference = useThemePreference();
  return (
    <span {...{ [attr]: "" }} className={ACCOUNT_MENU_THEME_VALUE_CLASS}>
      {appearancePreferenceLabel(preference)}
    </span>
  );
}

function AccountThemeChevron() {
  return (
    <CaretRight
      className={ACCOUNT_MENU_THEME_CHEVRON_CLASS}
      weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
      aria-hidden
    />
  );
}

function DesktopAccountMenuThemeRow({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  const preference = useThemePreference();
  const href = USER_MENU.themeHref;
  return (
    <HouseLink
      href={href}
      data-account-menu-row="theme"
      data-user-menu-item="theme"
      className={ACCOUNT_MENU_DROPDOWN_ROW_CLASS}
      onClick={destinationClickClosesSheet(pathname, href) ? onClose : undefined}
    >
      <DesktopAccountMenuIcon icon={menuThemeIcon(preference)} />
      <span className={ACCOUNT_MENU_THEME_LABEL_CLASS}>{USER_MENU.theme}</span>
      <span className={ACCOUNT_MENU_THEME_TRAILING_CLASS}>
        <AccountThemeStoredValue attr="data-account-menu-theme-value" />
        <AccountThemeChevron />
      </span>
    </HouseLink>
  );
}

function DesktopLogOutRow({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      data-account-menu-row="logOut"
      data-user-menu-item="logOut"
      className={ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS}
      onClick={() => {
        onClose();
        void signOut();
      }}
    >
      <DesktopAccountMenuIcon icon={SignOut} />
      {USER_MENU.logOut}
    </button>
  );
}

function DesktopAccountMenuFace({
  email,
  name,
  photoUrl,
  pathname,
  onClose,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
  pathname: string;
  onClose: () => void;
}) {
  const identity = accountSheetIdentity(email, name, photoUrl);
  const settingsHref = settingsLandHref(pathname);
  return (
    <>
      <div data-account-menu-accent="" className={ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS} />
      <div data-account-menu-head="" className={ACCOUNT_MENU_DROPDOWN_HEAD_CLASS}>
        <IdentityAvatar
          avatarInitial={identity.avatarInitial}
          photoUrl={identity.photoUrl}
          className={ACCOUNT_MENU_DROPDOWN_AVATAR_CLASS}
        />
        <div className={ACCOUNT_MENU_DROPDOWN_WHO_CLASS}>
          <p data-identity-name="" className={ACCOUNT_MENU_DROPDOWN_NAME_CLASS}>
            {identity.name}
          </p>
          <p data-identity-email="" className={ACCOUNT_MENU_DROPDOWN_EMAIL_CLASS}>
            {identity.email}
          </p>
          <HouseLink
            href={USER_MENU.profileHref}
            data-account-menu-manage=""
            className={ACCOUNT_MENU_DROPDOWN_MANAGE_CLASS}
            onClick={
              destinationClickClosesSheet(pathname, USER_MENU.profileHref) ? onClose : undefined
            }
          >
            {USER_MENU.manageAccount}
          </HouseLink>
        </div>
      </div>
      <AppSheetHairline data-account-menu-head-rule="" />
      <div data-account-menu-rows="" className={ACCOUNT_MENU_DROPDOWN_ROWS_CLASS}>
        {ACCOUNT_SHEET_ITEMS.map((item) =>
          item.kind === "theme" ? (
            <DesktopAccountMenuThemeRow key={item.kind} pathname={pathname} onClose={onClose} />
          ) : (
            <DesktopAccountMenuLink
              key={item.kind}
              item={item.kind}
              label={item.label}
              href={item.kind === "settings" ? settingsHref : item.href}
              pathname={pathname}
              onClose={onClose}
              icon={item.kind === "settings" ? Gear : Question}
            />
          ),
        )}
        <DesktopLogOutRow onClose={onClose} />
      </div>
      <div data-account-menu-footer="" className={ACCOUNT_MENU_DROPDOWN_FOOTER_CLASS}>
        <p data-account-menu-version="" className={ACCOUNT_MENU_DROPDOWN_VERSION_CLASS}>
          {userMenuVersion()}
        </p>
      </div>
    </>
  );
}

function AccountMenuGroups({
  pathname,
  onClose,
  items,
}: {
  pathname: string;
  onClose: () => void;
  items: readonly UserMenuAction[];
}) {
  return (
    <div data-account-sheet-groups="" className={ACCOUNT_SHEET_GROUP_CLASS}>
      {accountSheetGroupedRows(items).map((group) =>
        group.items.length === 0 ? null : (
          <SheetGroup key={group.id} inset groupId={group.id}>
            {group.items.map((item) => {
              const href = accountMenuItemHref(item, pathname);
              const theme = item.kind === "theme";
              return (
                <SheetGroupItem
                  key={item.kind}
                  inset
                  item={item.kind}
                  href={href}
                  className={theme ? "min-h-11" : undefined}
                  onClick={destinationClickClosesSheet(pathname, href) ? onClose : undefined}
                >
                  {item.label}
                  {theme ? (
                    <span className={ACCOUNT_MENU_THEME_TRAILING_CLASS}>
                      <AccountThemeStoredValue attr="data-account-sheet-theme-value" />
                      <AccountThemeChevron />
                    </span>
                  ) : (
                    <AccountRowChevron />
                  )}
                </SheetGroupItem>
              );
            })}
          </SheetGroup>
        ),
      )}
    </div>
  );
}

function AccountMenuBody({
  email,
  name,
  photoUrl,
  pathname,
  onClose,
  variant,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
  pathname: string;
  onClose: () => void;
  variant: "sheet" | "dropdown";
}) {
  const identity = accountSheetIdentity(email, name, photoUrl);
  if (variant === "dropdown") {
    return (
      <DesktopAccountMenuFace
        email={email}
        name={name}
        photoUrl={photoUrl}
        pathname={pathname}
        onClose={onClose}
      />
    );
  }
  const items = (
    <AccountMenuGroups
      pathname={pathname}
      onClose={onClose}
      items={ACCOUNT_SHEET_PHONE_ITEMS}
    />
  );

  return (
    <>
      <MenuSurfaceAccent />
      <div data-account-sheet-stage="" className={ACCOUNT_SHEET_STAGE_CLASS}>
        <div data-account-sheet-head="" className={ACCOUNT_SHEET_HEAD_CLASS}>
          <IdentityBlock
            avatarInitial={identity.avatarInitial}
            photoUrl={identity.photoUrl}
            name={identity.name}
            email={identity.email}
          />
          <Close44
            label={ACCOUNT_SHEET.close}
            data-account-sheet-close=""
            onClick={onClose}
          />
        </div>
        <AppSheetHairline data-account-sheet-rule="" />
        <div data-account-sheet-scroll="" className={ACCOUNT_SHEET_SCROLL_CLASS}>
          {items}
        </div>
      </div>
      <div data-account-sheet-leftover="" className={ACCOUNT_SHEET_LEFTOVER_CLASS} />
      <AccountMenuPin onClose={onClose} className={ACCOUNT_SHEET_PIN_CLASS} />
    </>
  );
}

// Mobile 544:561 / 537:557 — Apple door. Avatar opens this
// full-bleed sheet, not the 264 desktop popover. Hamburger stays
// the nav sheet. Quiet scrim; page stays under. Content hug
// (h-auto), slides up. Same sheet craft — not a new mini language.
// Do not restyle to the desktop leftover dropdown chrome
// (264 / rounded-12). One top row: Identity 48 + Close/44.
// Inset cards — Settings + Theme, then Get Help. Log out is its
// own inset row. Settings — Theme — Get Help.
// Theme drills to /settings/preferences/theme — the same picker as Preferences.
// Stored Light | Dark | Auto sits beside the chevron. No toggle.
// 618:785 overlay is void. Closed
// sheet stays 544:561 / 537:557.
// Leftover under the last item is 24 house row air (--space-6),
// shrink-0 — not leftover grow (open white). Log out,
// hairline, footer are pin siblings. Hairline only under Log out.
// Do not add a hairline above Log out. Item-list overflow lives on
// the scroll pane — house nav destinations — so Refer cannot paint over Log out.
// Surface clips. 571:911 stays off.
// Log out → hairline 16. Hairline → footer 16. Footer → bottom 32
// (sheet pad B). Not 48/48/48.
export function MobileAccountMenu({
  email,
  name,
  photoUrl,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}) {
  const { pathname, open, openMenu, closeMenu } = useAccountMenuOpen();

  const sheet = open ? (
    <AccountSheet
      email={email}
      name={name}
      photoUrl={photoUrl}
      pathname={pathname}
      onClose={closeMenu}
    />
  ) : null;

  return (
    <>
      <AccountMenuTrigger
        email={email}
        photoUrl={photoUrl}
        open={open}
        onOpen={openMenu}
        triggerAttr="data-account-sheet-trigger"
        controlsId="account-sheet"
        host="phone"
        className={`${HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS} ${menuHostClass("phone")}`}
        faceClassName={HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS}
      />
      {sheet && typeof document !== "undefined" ? createPortal(sheet, document.body) : sheet}
    </>
  );
}

// Desktop account MenuSurface. Coinbase grammar in
// docs/design-locks/desktop-avatar-menu-coinbase-lock-v1.md.
// 280. Radius 12. Full-width Sporty Blue bar, 4px. Horizontal
// identity. Flat rows. Danger Log out. The sheet above stays
// Family A. Close killed. Align-end. 8px under the
// trigger. Content hug. Not a 90% sheet.
export function DesktopAccountMenu({
  email,
  name,
  photoUrl,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}) {
  const { pathname, open, openMenu, closeMenu } = useAccountMenuOpen();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const alignEnd = useDesktopAccountMenuAlignEnd(open, triggerRef);

  const dropdown = open ? (
    <AccountMenuDropdown
      email={email}
      name={name}
      photoUrl={photoUrl}
      pathname={pathname}
      onClose={closeMenu}
      alignEnd={alignEnd}
    />
  ) : null;

  return (
    <div
      className={menuHostClass("desktop")}
      data-user-menu-desktop=""
      data-menu-host="desktop"
      data-menu-family="desktop"
    >
      <AccountMenuTrigger
        email={email}
        photoUrl={photoUrl}
        open={open}
        onOpen={open ? closeMenu : openMenu}
        triggerRef={triggerRef}
        triggerAttr="data-user-menu-trigger"
        controlsId="account-menu-dropdown"
        host="desktop"
        className={`${HOUSE_HEADER_DESKTOP_AVATAR_CLASS} transition-colors hover:text-ink`}
      />
      {dropdown && typeof document !== "undefined"
        ? createPortal(dropdown, document.body)
        : dropdown}
    </div>
  );
}

export function AccountSheet({
  email,
  name,
  photoUrl,
  pathname,
  onClose,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
  pathname: string;
  onClose: () => void;
}) {
  useAccountMenuDismiss(onClose, true);

  return (
    <div
      id="account-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={ACCOUNT_SHEET.sheet}
      data-account-sheet=""
      {...{ [ACCOUNT_MENU_ROOT_ATTR]: "" }}
      data-account-menu-face="main"
      data-house-overlay-host="app-sheet"
      data-menu-family="A"
      className={ACCOUNT_SHEET_HOST_CLASS}
    >
      <button
        type="button"
        data-account-sheet-scrim=""
        aria-label={ACCOUNT_SHEET.close}
        onClick={onClose}
        className={APP_SHEET_SCRIM_CLASS}
      />
      <div data-account-sheet-surface="" className={ACCOUNT_SHEET_SURFACE_CLASS}>
        <AccountMenuBody
          email={email}
          name={name}
          photoUrl={photoUrl}
          pathname={pathname}
          onClose={onClose}
          variant="sheet"
        />
      </div>
    </div>
  );
}

export function AccountMenuDropdown({
  email,
  name,
  photoUrl,
  pathname,
  onClose,
  alignEnd,
}: {
  email: string;
  name?: string | null;
  photoUrl?: string | null;
  pathname: string;
  onClose: () => void;
  alignEnd?: AccountMenuDropdownAlign;
}) {
  useAccountMenuDismiss(onClose, false);

  return (
    <div
      id="account-menu-dropdown"
      role="dialog"
      aria-modal="true"
      aria-label={ACCOUNT_SHEET.sheet}
      data-user-menu-desktop-panel=""
      {...{ [ACCOUNT_MENU_ROOT_ATTR]: "" }}
      data-house-overlay-host="menu-surface"
      data-menu-family="desktop"
      className={ACCOUNT_MENU_DROPDOWN_HOST_CLASS}
    >
      <button
        type="button"
        data-user-menu-desktop-dismiss=""
        aria-label={ACCOUNT_SHEET.close}
        onClick={onClose}
        className={ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS}
      />
      <div
        data-user-menu-desktop-surface=""
        data-account-menu-align={ACCOUNT_MENU_DROPDOWN_ALIGN}
        className={ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS}
        style={alignEnd}
      >
        <AccountMenuBody
          email={email}
          name={name}
          photoUrl={photoUrl}
          pathname={pathname}
          onClose={onClose}
          variant="dropdown"
        />
      </div>
    </div>
  );
}
