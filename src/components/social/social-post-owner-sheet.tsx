"use client";

import { useId, type RefObject } from "react";
import { createPortal } from "react-dom";

import { SheetGroup, SheetGroupItem } from "@/components/chrome/house";
import { AppSheetCard, AppSheetFrame, HouseDialogFrame, HouseScrim } from "@/components/chrome/house-overlay";
import { HouseWindowAsk } from "@/components/chrome/house-window-ask";
import { InlineNotice } from "@/components/ui/inline-notice";
import { APP_SHEET_RISE_CLASS, HOUSE_DANGER_INK_CLASS } from "@/lib/house-sheet";
import { SOCIAL } from "@/lib/social";

// A post's ⋯ on a phone, and the Remove confirm on both widths
// (docs/design-locks/social-post-owner-menu-lock-v1.md §2, §3). The phone
// card is Family A (mobile-menu-family-tree-v1): one inset SheetGroup of
// text rows, no ✕, no handle, no visible title. Remove turns the same card
// into the house ask, so it never rises twice and the scrim never blinks.
// On desktop the ask sits in HouseDialog's 400 confirm.

type RemoveAskProps = {
  pending: boolean;
  /** The route's fixed line after a failure; "" when there is none. */
  error: string;
  panelRef: RefObject<HTMLDivElement | null>;
  onKeep: () => void;
  onRemove: () => void;
};

/** Remove this post? · the line · Keep (focused) · Remove (danger). */
export function SocialPostRemoveAsk({
  layout,
  pending,
  error,
  panelRef,
  onKeep,
  onRemove,
}: RemoveAskProps & { layout: "row" | "stack" }) {
  const titleId = useId();
  return (
    <HouseWindowAsk
      attr="social-post-remove"
      variant="panel"
      layout={layout}
      titleId={titleId}
      title={SOCIAL.post.deleteTitle}
      lines={[SOCIAL.post.deleteBody]}
      keepLabel={SOCIAL.post.deleteKeep}
      discardLabel={SOCIAL.post.deleteConfirm}
      discardTone="danger"
      busy={pending}
      notice={error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      panelRef={panelRef}
      onKeep={onKeep}
      onDiscard={onRemove}
    />
  );
}

/** The phone card: its menu face (Edit caption · Remove), then its confirm face. */
export function SocialPostOwnerSheet({
  face,
  canEdit,
  surfaceRef,
  onEdit,
  onRemoveRow,
  onClose,
  onScrimKeep,
  ...ask
}: RemoveAskProps & {
  face: "menu" | "confirm";
  /** The caption host exists (never a dead row). */
  canEdit: boolean;
  surfaceRef: RefObject<HTMLDivElement | null>;
  onEdit: () => void;
  onRemoveRow: () => void;
  /** The menu face's scrim and Esc. */
  onClose: () => void;
  /** The confirm face's scrim: Keep, after the press guard. */
  onScrimKeep: () => void;
}) {
  const confirm = face === "confirm";
  const node = (
    <AppSheetFrame span="card" label={SOCIAL.post.overflow}>
      <HouseScrim
        label={confirm ? SOCIAL.post.deleteKeep : SOCIAL.create.close}
        onClose={confirm ? onScrimKeep : onClose}
      />
      <AppSheetCard className={`${APP_SHEET_RISE_CLASS} gap-[var(--space-3)]`}>
        <div ref={surfaceRef} data-social-post-owner-sheet="" data-menu-family="A">
          {confirm ? (
            <SocialPostRemoveAsk layout="stack" {...ask} />
          ) : (
            <SheetGroup inset>
              {canEdit ? (
                <SheetGroupItem key="edit-caption" inset item="edit-caption" onClick={onEdit}>
                  {SOCIAL.post.editTitle}
                </SheetGroupItem>
              ) : null}
              <SheetGroupItem key="remove" inset item="remove" className={HOUSE_DANGER_INK_CLASS} onClick={onRemoveRow}>
                {SOCIAL.post.deleteConfirm}
              </SheetGroupItem>
            </SheetGroup>
          )}
        </div>
      </AppSheetCard>
    </AppSheetFrame>
  );
  return typeof document === "undefined" ? node : createPortal(node, document.body);
}

/** Desktop: the ask in HouseDialog's 400 confirm, its scrim Keep. */
export function SocialPostRemoveDialog({
  onScrimKeep,
  ...ask
}: RemoveAskProps & {
  onScrimKeep: () => void;
}) {
  const node = (
    <HouseDialogFrame size="confirm" label={SOCIAL.post.overflow} onClose={onScrimKeep} closeLabel={SOCIAL.post.deleteKeep}>
      <SocialPostRemoveAsk layout="row" {...ask} />
    </HouseDialogFrame>
  );
  return typeof document === "undefined" ? node : createPortal(node, document.body);
}
