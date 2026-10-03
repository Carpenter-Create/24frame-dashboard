"use client";

import { Suspense, useState } from "react";
import { useHousePathname } from "./house-client-shell";
import { HouseLink } from "./house-link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CaretDown,
  CaretLeft,
  CaretUp,
  DotsThree,
  DownloadSimple,
  PencilSimple,
  PushPin,
  Trash,
} from "@phosphor-icons/react";

import { HousePageSearch } from "@/components/chrome/house-page-search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ThreadPopoverContent,
  ThreadPopoverItem,
  ThreadPopoverSeparator,
} from "./menu-surface";
import { HOUSE_LEAD_SEARCH_WIDTH_PX } from "@/lib/house-lead-chrome";
import {
  THREAD_POPOVER_DELETE_ICON_CLASS,
  THREAD_POPOVER_ICON_CLASS,
} from "@/lib/house-sheet";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";
import { askAiOverlayHref, currentAskAiSearch } from "@/lib/ask-ai-overlay";
import { houseNavIgnorePendingClick } from "@/lib/house-nav-pending";
import { Input } from "@/components/ui/input";
import {
  ASK_FRAME_AI,
  askFrameAiLandingHref,
  messagesShowsThreadHeader,
  readAskFrameAiThreadId,
  showMessagesHeaderSearch,
  type MessagesSurface,
} from "@/lib/ask-frame-ai";
import { AskFrameAiHistoryPopover } from "@/components/messages/ask-frame-ai-history";
import { useAskFrameAiChrome } from "@/components/messages/ask-frame-ai-chrome";
import { saveAskFrameAiDownload } from "@/lib/ask-frame-ai-download";
import {
  deleteAskFrameAiConversation,
  pinAskFrameAiConversation,
  renameAskFrameAiConversation,
} from "@/app/(app)/aggregation/messages/ask-frame-ai-actions";

// Desktop 247:295 keeps PDF + ··· in the right cluster, 16 from the avatar.
// Mobile 531:542 hides the PDF tray; Download PDF lives in the existing ···
// (532:548). No second menu.
function MessagesThreadHeader({ title }: { title: string }) {
  const router = useRouter();
  const { chrome, setChrome, conversations } = useAskFrameAiChrome();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { historyOpen, setHistoryOpen } = useAskFrameAiChrome();
  const [renameValue, setRenameValue] = useState(title);
  const pinned = !!chrome?.pinned_at;
  const threadTitle = chrome?.title ?? title;
  const pathname = useHousePathname();

  // The AI landing on this screen. Keep the screen's own query (a bare ?ai=1
  // dropped it), and go through Next: the overlay reads Next's search params.
  function openLanding() {
    router.push(askAiOverlayHref(pathname, currentAskAiSearch()));
  }

  function downloadThread() {
    if (!chrome) return;
    saveAskFrameAiDownload({
      title: chrome.title,
      initials: chrome.initials ?? "",
      messages: chrome.messages ?? [],
    });
  }

  // Title+chevron stay left. Download/··· dock 16 from the avatar via
  // app-shell header gap-4 — same relationship as mobile #182. flex-1 on
  // this row and the title cluster; without it the row shrinks to the
  // words and actions read as title chrome. Do not put actions flush to
  // the title. Desktop PDF tray stays in this right cluster, before ···.
  return (
    <div data-header-thread="" className="flex min-w-0 flex-1 items-center gap-[var(--space-4)]">
      <div
        data-ask-frame-ai-title-cluster=""
        className="flex min-w-0 flex-1 items-center gap-[var(--space-2)]"
      >
        <HouseLink
          href={askFrameAiLandingHref()}
          aria-label={ASK_FRAME_AI.backLabel}
          onClick={(event) => {
            if (houseNavIgnorePendingClick(event)) return;
            event.preventDefault();
            openLanding();
          }}
          className="flex size-4 shrink-0 items-center justify-center text-ink max-md:text-ink-3"
        >
          <CaretLeft className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
        </HouseLink>
        <AskFrameAiHistoryPopover
          conversations={conversations}
          currentId={chrome?.id ?? null}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        >
          <button
            type="button"
            data-ask-frame-ai-history-title=""
            aria-expanded={historyOpen}
            aria-haspopup="dialog"
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex min-w-0 items-center gap-[var(--space-1)] text-left"
          >
            <span className="min-w-0 truncate t-heading text-ink max-md:hidden">{threadTitle}</span>
            <span className="min-w-0 truncate t-body text-ink md:hidden">{threadTitle}</span>
            {historyOpen ? (
              <CaretUp className="size-4 shrink-0 text-ink-3" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
            ) : (
              <CaretDown className="size-4 shrink-0 text-ink-3" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
            )}
          </button>
        </AskFrameAiHistoryPopover>
      </div>
      <div
        data-ask-frame-ai-header-chrome=""
        className="flex shrink-0 items-center gap-[var(--space-4)]"
      >
        <button
          type="button"
          data-ask-frame-ai-download=""
          aria-label={ASK_FRAME_AI.downloadLabel}
          onClick={downloadThread}
          className="hidden size-4 shrink-0 items-center justify-center text-ink-3 md:flex"
        >
          <DownloadSimple className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={ASK_FRAME_AI.moreLabel}
              className="flex size-4 shrink-0 items-center justify-center text-ink-3"
            >
              <DotsThree className="size-4" weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
            </button>
          </DropdownMenuTrigger>
          <ThreadPopoverContent align="end">
            <ThreadPopoverItem onSelect={downloadThread}>
              <DownloadSimple className={THREAD_POPOVER_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              {ASK_FRAME_AI.downloadPdfLabel}
            </ThreadPopoverItem>
            <ThreadPopoverItem
              onSelect={() => {
                setRenameValue(chrome?.title ?? title);
                setRenameOpen(true);
              }}
            >
              <PencilSimple className={THREAD_POPOVER_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              {ASK_FRAME_AI.renameLabel}
            </ThreadPopoverItem>
            <ThreadPopoverItem
              onSelect={() => {
                if (!chrome) return;
                void pinAskFrameAiConversation(chrome.id, !pinned).then((result) => {
                  if ("pinnedAt" in result) {
                    setChrome({ ...chrome, pinned_at: result.pinnedAt });
                    router.refresh();
                  }
                });
              }}
            >
              <PushPin className={THREAD_POPOVER_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              {pinned ? ASK_FRAME_AI.unpinLabel : ASK_FRAME_AI.pinLabel}
            </ThreadPopoverItem>
            <ThreadPopoverSeparator />
            <ThreadPopoverItem danger onSelect={() => setDeleteOpen(true)}>
              <Trash className={THREAD_POPOVER_DELETE_ICON_CLASS} weight={PHOSPHOR_CHROME_IDLE_WEIGHT} />
              {ASK_FRAME_AI.deleteLabel}
            </ThreadPopoverItem>
          </ThreadPopoverContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={ASK_FRAME_AI.renameTitle}
      >
        <form
          className="flex flex-col gap-[var(--space-3)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!chrome) return;
            void renameAskFrameAiConversation(chrome.id, renameValue).then((result) => {
              if ("title" in result) {
                setChrome({ ...chrome, title: result.title });
                setRenameOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={ASK_FRAME_AI.renameTitle}
          />
          <div className="flex justify-end gap-[var(--space-2)]">
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
              {ASK_FRAME_AI.cancelLabel}
            </Button>
            <Button type="submit">{ASK_FRAME_AI.renameSave}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={ASK_FRAME_AI.deleteTitle}
        size="sm"
      >
        <p className="t-body-sm text-ink-2">{ASK_FRAME_AI.deleteBody}</p>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            data-ask-frame-ai-delete-cancel=""
            onClick={() => setDeleteOpen(false)}
          >
            {ASK_FRAME_AI.cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            data-ask-frame-ai-delete-confirm=""
            onClick={() => {
              if (!chrome) return;
              void deleteAskFrameAiConversation(chrome.id).then((result) => {
                if (!("error" in result)) {
                  setDeleteOpen(false);
                  setChrome(null);
                  openLanding();
                }
              });
            }}
          >
            {ASK_FRAME_AI.deleteConfirm}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function MessagesAppHeaderInner({ surface }: { surface: MessagesSurface }) {
  const threadId = readAskFrameAiThreadId(useSearchParams());

  // Search mounts only for access-gate. 24Frame AI landing/thread never restore it.
  if (surface === "access-gate" || showMessagesHeaderSearch(surface)) {
    return (
      <div
        data-header-search=""
        className="flex min-w-0 w-full items-center"
        style={{ maxWidth: HOUSE_LEAD_SEARCH_WIDTH_PX }}
      >
        <HousePageSearch
          placeholder={ASK_FRAME_AI.headerSearchPlaceholder}
          hint={ASK_FRAME_AI.headerSearchHint}
        />
      </div>
    );
  }

  if (messagesShowsThreadHeader(surface, threadId)) {
    return <MessagesThreadHeader title="" />;
  }

  return null;
}

export function MessagesAppHeader({ surface }: { surface: MessagesSurface }) {
  return (
    <Suspense fallback={null}>
      <MessagesAppHeaderInner surface={surface} />
    </Suspense>
  );
}
