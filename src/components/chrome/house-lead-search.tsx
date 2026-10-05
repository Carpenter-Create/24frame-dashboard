"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HouseLink } from "./house-link";
import { usePathname, useSearchParams } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { HouseVoiceMic } from "@/components/chrome/house-voice-mic";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  EDUCATION_SEARCH,
  educationSearchAction,
  parseEducationSearchQuery,
} from "@/lib/course-search";
import { HOUSE_VOICE_FOCUS_HOST_CLASS } from "@/lib/form-control";
import {
  HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS,
  HOUSE_LEAD_SEARCH_HEADER_GLYPH_CLASS,
  HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS,
  HOUSE_LEAD_SEARCH_ICON_CLASS,
  HOUSE_LEAD_SEARCH_PILL_CLASS,
  HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS,
  HOUSE_LEAD_SEARCH_TOGGLE_PANEL_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_HEADER_TRAILING_DESKTOP_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_CLASS,
  HOUSE_PHONE_CHROME_ICON_WEIGHT,
} from "@/lib/house-phone-shell";
import { HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import {
  SOCIAL,
  SOCIAL_ROUTES,
  SOCIAL_SEARCH_INTENT_PARAM,
  SOCIAL_SEARCH_PEOPLE_INTENT,
  socialSearchHref,
} from "@/lib/social";
import { ingestSpeechLearning } from "@/lib/speech-learning";

// One mid-lead search SoT for Social live people search and Education
// quiet courses/videos. Slot into HouseLeadChrome search / underNav /
// trailingSearch. Geometry is HOUSE_LEAD_SEARCH_PILL_CLASS +
// HOUSE_SEARCH_PILL_CLASS — same tokens the Titles catalog search
// reuses. Do not fork the pill. Do not import the catalog search
// control. Aggregation keeps no top search. Phone Social 🔍 opens
// Search with people intent (suggested people + search). Live Social
// field submits there too. Do not Link the icon to Explore.
// Icon form (shell-unified-chrome-lock-v1): below xl the desktop
// header shows the search as a 44 icon so the workspace row never
// clips. Social's icon is the same Search link as phone. Education
// has no search page, so its desktop icon (md to xl) opens the same
// quiet field in a small panel under the icon. Phone Education
// keeps the under-nav row.
// Header field (screening chrome, Adam 2026-10-04): from xl the desktop
// header shows the same form as a 232×34 muted box (13px, 16 glyph,
// radius 10). Same input, action, and voice mic — only the face.

export type HouseLeadSearchTone = "live" | "quiet";
export type HouseLeadSearchPresentation = "field" | "icon" | "header";

export function HouseLeadSearch({
  tone,
  presentation = "field",
  action,
  placeholder,
  label,
  inputId,
  autoFocus = false,
  className,
}: {
  tone: HouseLeadSearchTone;
  presentation?: HouseLeadSearchPresentation;
  action?: string;
  placeholder?: string;
  label?: string;
  inputId?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const live = tone === "live";
  const resolvedPlaceholder =
    placeholder ?? (live ? SOCIAL.search.searchPlaceholder : EDUCATION_SEARCH.placeholder);
  const resolvedLabel = label ?? (live ? SOCIAL.explore.searchSocial : EDUCATION_SEARCH.label);
  const resolvedAction = action ?? (live ? SOCIAL_ROUTES.search : undefined);
  const resolvedInputId = inputId ?? (live ? "social-header-q" : "education-header-q");

  if (presentation === "icon" && !live) {
    return (
      <QuietHouseLeadSearchToggle
        action={resolvedAction}
        placeholder={resolvedPlaceholder}
        label={resolvedLabel}
        inputId={inputId ?? "education-header-q-compact"}
      />
    );
  }

  if (presentation === "icon") {
    return (
      <HouseLink
        href={socialSearchHref({ intent: "people" })}
        aria-label={resolvedLabel}
        data-house-lead-search-icon=""
        data-social-header-search-icon=""
        className={HOUSE_LEAD_SEARCH_ICON_CLASS}
      >
        <MagnifyingGlass
          className={HOUSE_HEADER_TRAILING_PHONE_CLASS}
          weight={HOUSE_PHONE_CHROME_ICON_WEIGHT}
          aria-hidden
        />
        <MagnifyingGlass
          className={HOUSE_HEADER_TRAILING_DESKTOP_CLASS}
          weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
          aria-hidden
        />
      </HouseLink>
    );
  }

  const header = presentation === "header";

  if (!live) {
    return (
      <QuietHouseLeadSearchField
        action={resolvedAction}
        placeholder={resolvedPlaceholder}
        label={resolvedLabel}
        inputId={resolvedInputId}
        autoFocus={autoFocus}
        className={className}
        header={header}
      />
    );
  }

  return (
    <HouseLeadSearchField
      tone="live"
      action={resolvedAction ?? SOCIAL_ROUTES.search}
      placeholder={resolvedPlaceholder}
      label={resolvedLabel}
      inputId={resolvedInputId}
      autoFocus={autoFocus}
      className={className}
      header={header}
    />
  );
}

// Education desktop icon form, md to xl. Escape or an outside press
// closes the panel. Submitting navigates, which unmounts it. Escape
// hands focus back to the icon — the focused input unmounts with the
// panel, and focus must not fall to <body> (WCAG 2.4.3). An outside
// press leaves focus where the press put it.
function QuietHouseLeadSearchToggle({
  action,
  placeholder,
  label,
  inputId,
}: {
  action?: string;
  placeholder: string;
  label: string;
  inputId: string;
}) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      if (hostRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={hostRef}
      data-house-lead-search-toggle=""
      className={HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-house-lead-search-icon=""
        data-education-header-search-icon=""
        className={HOUSE_LEAD_SEARCH_ICON_CLASS}
        onClick={() => setOpen((next) => !next)}
      >
        <MagnifyingGlass
          className={HOUSE_HEADER_TRAILING_DESKTOP_CLASS}
          weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={panelId}
          data-house-lead-search-panel=""
          className={HOUSE_LEAD_SEARCH_TOGGLE_PANEL_CLASS}
        >
          <QuietHouseLeadSearchField
            action={action}
            placeholder={placeholder}
            label={label}
            inputId={inputId}
            autoFocus
          />
        </div>
      ) : null}
    </div>
  );
}

function QuietHouseLeadSearchField({
  action,
  placeholder,
  label,
  inputId,
  autoFocus,
  className,
  header = false,
}: {
  action?: string;
  placeholder: string;
  label: string;
  inputId: string;
  autoFocus?: boolean;
  className?: string;
  header?: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = parseEducationSearchQuery(params.get("q"));

  return (
    <HouseLeadSearchField
      tone="quiet"
      action={action ?? educationSearchAction(pathname)}
      placeholder={placeholder}
      label={label}
      inputId={inputId}
      defaultValue={q}
      autoFocus={autoFocus}
      className={className}
      header={header}
    />
  );
}

function HouseLeadSearchField({
  tone,
  action,
  placeholder,
  label,
  inputId,
  defaultValue,
  autoFocus,
  className,
  header = false,
}: {
  tone: HouseLeadSearchTone;
  action: string;
  placeholder: string;
  label: string;
  inputId: string;
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
  /** Desktop header face (xl+): 232×34 muted box. */
  header?: boolean;
}) {
  const workspace = tone === "live" ? "social" : "education";
  const [value, setValue] = useState(defaultValue ?? "");
  const lastVoiceRef = useRef("");

  return (
    <form
      data-house-lead-search-field=""
      data-house-lead-search-tone={tone}
      data-house-voice-host=""
      data-social-header-search={tone === "live" ? "" : undefined}
      data-education-header-search={tone === "quiet" ? "" : undefined}
      data-house-lead-search-face={header ? "header" : undefined}
      action={action}
      method="get"
      className={cn(
        header
          ? HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS
          : cn(HOUSE_LEAD_SEARCH_PILL_CLASS, HOUSE_SEARCH_PILL_CLASS),
        HOUSE_VOICE_FOCUS_HOST_CLASS,
        className,
      )}
      onSubmit={() => {
        if (value.trim() === lastVoiceRef.current.trim()) return;
        ingestSpeechLearning({
          text: value,
          source: "typed",
          workspace,
        });
      }}
    >
      <MagnifyingGlass
        className={header ? HOUSE_LEAD_SEARCH_HEADER_GLYPH_CLASS : "size-4 shrink-0 text-ink-3"}
        weight={header ? HOUSE_PHONE_CHROME_ICON_WEIGHT : PHOSPHOR_CHROME_IDLE_WEIGHT}
        aria-hidden
      />
      {tone === "live" ? (
        <input type="hidden" name={SOCIAL_SEARCH_INTENT_PARAM} value={SOCIAL_SEARCH_PEOPLE_INTENT} />
      ) : null}
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <Input
        variant="bare"
        id={inputId}
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={header ? HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS : "h-full min-w-0 flex-1 placeholder:text-ink-3"}
      />
      <HouseVoiceMic
        surface="search"
        workspace={workspace}
        getValue={() => value}
        onValue={(next) => {
          lastVoiceRef.current = next;
          setValue(next);
        }}
      />
    </form>
  );
}
