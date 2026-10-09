"use client";

import { useRouter } from "next/navigation";

import { HousePageSelect } from "@/components/chrome/house-page-select";
import {
  CLIENTS_PAGE,
  CLIENT_DIRECTORY_FILTERS,
  GC_CLIENTS_HREF,
  clientDirectoryFilterLabel,
  parseClientDirectoryFilter,
  type ClientDirectoryFilter,
} from "@/lib/clients-filter";
import { filterHref } from "@/lib/staff-directory";

// Status lens — house-page-select consumer (Dashboard All time / Titles SoT).
// Trailing on TitlesCatalogHeader at every breakpoint. No StatusFilter chips.

export function ClientsStatusFilter({
  status,
  defaultOpen = false,
}: {
  status: ClientDirectoryFilter;
  defaultOpen?: boolean;
}) {
  const router = useRouter();

  return (
    <div data-gc-clients-status-compact="" className="w-auto shrink-0">
      <HousePageSelect
        value={status}
        label={clientDirectoryFilterLabel(status)}
        options={[...CLIENT_DIRECTORY_FILTERS]}
        ariaLabel={CLIENTS_PAGE.statusFilterLabel}
        sheetTitle={CLIENTS_PAGE.statusFilterLabel}
        closeLabel="Close"
        defaultOpen={defaultOpen}
        menuAlign="end"
        onPick={(key) => {
          router.replace(filterHref(GC_CLIENTS_HREF, parseClientDirectoryFilter(key)), {
            scroll: false,
          });
        }}
        attrs={{
          current: { "data-gc-clients-status-current": "" },
          trigger: { "data-gc-clients-status-trigger": "" },
          menu: { "data-gc-clients-status-menu": "" },
          sheet: { "data-gc-clients-status-sheet": "" },
          option: (key) => ({ "data-gc-clients-status-option": key }),
        }}
      />
    </div>
  );
}
