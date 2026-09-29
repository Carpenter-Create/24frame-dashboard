"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { HouseEmpty } from "@/components/chrome/house";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { HOUSE_LEAD_SEARCH_PILL_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_DM_INBOX_COMPOSE_CLASS,
  SOCIAL_DM_INBOX_HEADER_CLASS,
  SOCIAL_DM_INBOX_ROW_CLASS,
  SOCIAL_DM_INBOX_TITLE_CLASS,
  SOCIAL_DM_INBOX_UNREAD_DOT_CLASS,
} from "@/lib/social-chrome";
import {
  socialDmInboxMatchesQuery,
  type SocialDmInboxListRow,
} from "@/lib/social-dm-inbox-list";

import { SocialConversationFaces } from "./social-conversation-faces";
import { SocialIcon } from "./social-icon";

export function SocialDmInboxList({
  title,
  composeHref,
  composeLabel,
  rows,
  emptyLabel,
  notice,
}: {
  title: string;
  composeHref: string | null;
  composeLabel: string;
  rows: readonly SocialDmInboxListRow[];
  emptyLabel: string | null;
  notice?: ReactNode;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => rows.filter((row) => socialDmInboxMatchesQuery(query, row)),
    [query, rows],
  );
  const showEmpty = emptyLabel != null && rows.length === 0 && query.trim() === "";
  const heading = title.trim();

  return (
    <div data-social-dms-list="" className="flex flex-col">
      {heading || composeHref ? (
        <div data-social-dms-header="" className={SOCIAL_DM_INBOX_HEADER_CLASS}>
          {heading ? (
            <h1 data-social-dms-title="" className={SOCIAL_DM_INBOX_TITLE_CLASS}>
              {heading}
            </h1>
          ) : null}
          {composeHref ? (
            <Link
              href={composeHref}
              data-social-dms-start=""
              aria-label={composeLabel}
              className={SOCIAL_DM_INBOX_COMPOSE_CLASS}
            >
              <span aria-hidden="true">
                <SocialIcon name="pencil-simple" size={24} />
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
      <form
        data-social-dms-search=""
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className={cn(HOUSE_LEAD_SEARCH_PILL_CLASS, HOUSE_SEARCH_PILL_CLASS, "mb-[var(--space-2)]")}
      >
        <span aria-hidden="true" className="shrink-0 text-ink-3">
          <SocialIcon name="magnifying-glass" size={16} />
        </span>
        <label className="sr-only" htmlFor={searchId}>
          {SOCIAL.dms.search}
        </label>
        <Input
          variant="bare"
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={SOCIAL.dms.search}
          className="h-full min-w-0 flex-1 placeholder:text-ink-3"
        />
      </form>
      {notice}
      {showEmpty ? (
        <div data-social-dms-empty="" className="flex flex-col gap-3 py-[var(--space-3)]">
          <HouseEmpty>{emptyLabel}</HouseEmpty>
        </div>
      ) : null}
      <ul className="flex flex-col">
        {visible.map((row) => (
          <li key={row.id} className={SOCIAL_DM_INBOX_ROW_CLASS}>
            <Link
              href={row.href}
              className="flex items-center gap-[var(--space-3)]"
              data-social-dm-kind={row.kind}
            >
              <SocialConversationFaces people={row.people} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "break-words t-body text-ink",
                    row.unreadCount > 0 ? "font-semibold" : "font-medium",
                  )}
                >
                  {row.label}
                </p>
                {row.excerpt || row.time ? (
                  <p
                    className="break-words t-body-sm text-ink-3"
                    data-social-dm-excerpt={row.excerpt ? "" : undefined}
                  >
                    {row.excerpt ? <span>{row.excerpt}</span> : null}
                    {row.excerpt && row.time ? " · " : null}
                    {row.time ? <span data-social-dm-time="">{row.time}</span> : null}
                  </p>
                ) : null}
              </div>
              {row.unreadCount > 0 ? (
                <span
                  data-social-dm-unread=""
                  role="status"
                  aria-label={`${row.unreadCount} unread`}
                  className={SOCIAL_DM_INBOX_UNREAD_DOT_CLASS}
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
