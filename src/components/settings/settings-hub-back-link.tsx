"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, type MouseEvent } from "react";

import { PageHeaderBackLink } from "@/components/ui/page-header";
import {
  SETTINGS,
  readSettingsHubExitHref,
  settingsHeaderBack,
  settingsHubHasInAppReferrer,
  subscribeSettingsReturn,
} from "@/lib/settings";

function settingsHubExitServerHref(): string {
  return settingsHeaderBack(SETTINGS.href).href;
}

// Account-chrome Back. Callers that pass href (Activity, Get Help)
// keep in-app history, and use that href only when the referrer is
// missing or off-origin. Settings omits href. Its exit is the entry
// route, else the workspace cookie home. history.back() is not that
// exit — shell pushState makes it a same-page no-op — and the
// Aggregation dashboard is not the destination.
export function SettingsHubBackLink({
  className,
  href,
  label,
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  const router = useRouter();
  const historyBack = href !== undefined;
  const fallback = href ?? settingsHeaderBack(SETTINGS.href).href;
  const entryHref = useSyncExternalStore(
    subscribeSettingsReturn,
    readSettingsHubExitHref,
    settingsHubExitServerHref,
  );

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    if (historyBack) {
      if (settingsHubHasInAppReferrer(document.referrer, window.location.origin)) {
        event.preventDefault();
        router.back();
      }
      return;
    }
    const dest = readSettingsHubExitHref();
    const here = `${window.location.pathname}${window.location.search}`;
    if (dest === here || dest === window.location.pathname) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    router.push(dest);
  }

  return (
    <PageHeaderBackLink
      href={historyBack ? fallback : entryHref}
      label={label ?? settingsHeaderBack(SETTINGS.href).label}
      className={className}
      onClick={onClick}
    />
  );
}
