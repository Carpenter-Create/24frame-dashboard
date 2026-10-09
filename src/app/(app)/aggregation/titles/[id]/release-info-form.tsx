import { HOUSE_PHONE_WRAP_CLASS } from "@/lib/house-phone-stack";
import { RELEASE_TYPE_LABEL, formatReleaseDate, type ReleaseType } from "@/lib/releases";
import { TITLE_DETAILS } from "@/lib/title-details";
import { TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS } from "@/lib/titles";
import { TitleDetailsLink } from "./title-details-window";

// Client-owned release info on the title detail: release type + (re-release only)
// the historical original date. The forward-looking release date is GC-owned and
// shown read-only here. Operators edit it in the title's Metadata window
// (Release face); others see it read-only.
export function ReleaseInfoForm({
  releaseType,
  originalReleaseDate,
  releaseDate,
  canOperate,
}: {
  releaseType: ReleaseType;
  originalReleaseDate: string | null;
  releaseDate: string | null;
  canOperate: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="t-label text-ink-3">{TITLE_DETAILS.faces.release}</span>
        {canOperate ? (
          <TitleDetailsLink face="release" className="t-body-sm text-accent">
            {TITLE_DETAILS.edit}
          </TitleDetailsLink>
        ) : null}
      </div>
      <div className={TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS}>
        <span className="text-ink-3">{TITLE_DETAILS.releaseType}</span>
        <span className={`${HOUSE_PHONE_WRAP_CLASS} text-ink-2`}>{RELEASE_TYPE_LABEL[releaseType]}</span>
      </div>
      {releaseType === "re_release" ? (
        <div className={TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS}>
          <span className="text-ink-3">{TITLE_DETAILS.originalRelease}</span>
          <span className={`${HOUSE_PHONE_WRAP_CLASS} text-ink-2`}>{formatReleaseDate(originalReleaseDate)}</span>
        </div>
      ) : null}
      <div className={TITLE_DETAIL_INLINE_LEDGER_ROW_CLASS}>
        <span className="text-ink-3">{TITLE_DETAILS.releaseDate}</span>
        <span className={`${HOUSE_PHONE_WRAP_CLASS} text-ink-2`}>
          {releaseDate ? formatReleaseDate(releaseDate) : TITLE_DETAILS.releaseDateSetBy}
        </span>
      </div>
    </div>
  );
}
