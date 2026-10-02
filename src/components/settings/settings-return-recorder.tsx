"use client";

import { useEffect, useRef } from "react";

import { useHouseClient, useHousePathname } from "@/components/chrome/house-client-shell";
import {
  rememberSettingsReturnPath,
  settingsReturnToRemember,
} from "@/lib/settings";

// Records the route Settings was opened from. document.referrer stays
// on the first document, and shell pushState is not a Next history
// step. Drilling inside Settings must not replace the entry.
export function SettingsReturnRecorder() {
  const house = useHouseClient();
  const pathname = useHousePathname();
  const href = house?.href ?? pathname;
  const hrefRef = useRef(href);

  useEffect(() => {
    const from = hrefRef.current;
    hrefRef.current = href;
    const entry = settingsReturnToRemember(from, href);
    if (entry) rememberSettingsReturnPath(entry);
  }, [href]);

  return null;
}
