// Desktop dest rail model — one pattern for every workspace, Home
// included (Adam 2026-10-04, docs/design-locks/shell-unified-chrome-lock-v1.md).
// Eyebrow is the workspace name. Rows are that workspace's existing
// dests only: Home reuses HOME_PHONE_DESTS (Home · Industry news) —
// never invent a destination. Active uses the phone dock's test
// (isSocialTabActive on Social, isClientNavActive elsewhere) and only
// the first match lights, so one path never lights two rows.

import {
  HOME_PHONE_DESTS,
  housePhoneDestActiveIndex,
} from "@/lib/house-phone-shell";
import { railDestinations, type NavItem } from "@/lib/nav";
import { OVERVIEW_PAGE } from "@/lib/overview";
import type { WorkspaceMode } from "@/lib/workspace";
import { workspaceModeLabel } from "@/lib/workspace-menu";

export type HouseRailModel = {
  eyebrow: string;
  items: NavItem[];
  staffItems: NavItem[];
};

export function houseRailModel({
  isGcStaff,
  workspace,
  homeOwned = false,
}: {
  isGcStaff: boolean;
  workspace: WorkspaceMode;
  homeOwned?: boolean;
}): HouseRailModel {
  if (homeOwned) {
    return { eyebrow: OVERVIEW_PAGE.title, items: [...HOME_PHONE_DESTS], staffItems: [] };
  }
  const { items, staffItems } = railDestinations(isGcStaff, workspace);
  return { eyebrow: workspaceModeLabel(workspace), items, staffItems };
}

/** Index into `[...items, ...staffItems]` of the one lit row, or -1. */
export function houseRailActiveIndex(
  pathname: string,
  model: Pick<HouseRailModel, "items" | "staffItems">,
  workspace: WorkspaceMode,
): number {
  return housePhoneDestActiveIndex(pathname, [...model.items, ...model.staffItems], workspace);
}
