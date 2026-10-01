"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  appendAskGlobeeTurn,
  completeAskGlobeeTurn,
  startAskGlobeeConversation,
} from "@/app/(app)/aggregation/messages/ask-globee-actions";
import { SocialDmThread, type DmThreadViewMessage } from "@/components/social/social-dm-thread";
import { SocialDmThreadHeader } from "@/components/social/social-dm-thread-header";
import { SocialDmThreadStick } from "@/components/social/social-dm-thread-stick";
import { SocialFrameAiFace } from "@/components/social/social-frame-ai-face";
import { SocialIcon } from "@/components/social/social-icon";
import { FormError } from "@/components/social/social-form-error";
import { Input } from "@/components/ui/input";
import {
  ASK_GLOBEE,
  ASK_GLOBEE_FETCHING_HOLD_MS,
  askGlobeeComposerSubmit,
  askGlobeeThinkingPhase,
  askGlobeeThinkingVerb,
} from "@/lib/ask-globee";
import {
  askGlobeeAnswerText,
  askGlobeeOpenUserTurn,
  type AskGlobeeStoredMessage,
} from "@/lib/ask-globee-conversations";
import { ASSISTANT_NAME } from "@/lib/product";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_MEDIA_ACCEPT } from "@/lib/social-media";
import {
  SOCIAL_FRAME_AI_ID,
  SOCIAL_FRAME_AI_OPENER,
  socialFrameAiOpenerVisible,
  type SocialFrameAiShare,
} from "@/lib/social-frame-ai";
import {
  DM_THREAD_COMPOSER_CAMERA_CLASS,
  DM_THREAD_COMPOSER_CAMERA_GLYPH,
  DM_THREAD_COMPOSER_CLASS,
  DM_THREAD_COMPOSER_FIELD_CLASS,
  DM_THREAD_COMPOSER_ROW_CLASS,
  DM_THREAD_COMPOSER_SEND_CLASS,
  DM_THREAD_HEADER_AVATAR_CLASS,
  DM_THREAD_ROOT_CLASS,
} from "@/lib/social-dm-thread-format";

// DM chrome around the Ask 24Frame AI stack. The opener is display-only.
// docs/design-locks/social-frame-ai-pin-lock-v1.md

export function SocialFrameAiThread({
  ready,
  conversationId: initialConversationId,
  messages,
  share,
}: {
  ready: boolean;
  conversationId: string | null;
  messages: AskGlobeeStoredMessage[];
  share: SocialFrameAiShare | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const completingIdRef = useRef<string | null>(null);
  const [startedId, setStartedId] = useState<string | null>(null);
  const conversationId = startedId ?? initialConversationId;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [thinkingElapsedMs, setThinkingElapsedMs] = useState(0);
  const shownPending =
    pendingText !== null &&
    !messages.some((message) => message.role === "user" && message.body === pendingText)
      ? pendingText
      : null;
  const openUserId =
    ready && conversationId && askGlobeeOpenUserTurn(messages) ? (messages.at(-1)?.id ?? null) : null;
  const [finishedUserId, setFinishedUserId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState("");
  const finishing = openUserId !== null && finishedUserId !== openUserId && completeError === "";
  const busy = pending || finishing;

  useEffect(() => {
    if (!busy) return;
    const id = window.setTimeout(() => {
      setThinkingElapsedMs(ASK_GLOBEE_FETCHING_HOLD_MS);
    }, ASK_GLOBEE_FETCHING_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [busy]);

  useEffect(() => {
    if (!ready || !conversationId || !openUserId) return;
    if (completingIdRef.current === openUserId) return;
    completingIdRef.current = openUserId;
    let cancelled = false;
    void completeAskGlobeeTurn(conversationId).then((result) => {
      if (cancelled) return;
      if ("error" in result && result.error) {
        setCompleteError(result.error);
        return;
      }
      setFinishedUserId(openUserId);
      router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, openUserId, ready, router]);

  const rows = viewMessages({
    ready,
    messages,
    share,
    pending: busy,
    pendingText: shownPending,
    thinkingText: askGlobeeThinkingVerb(askGlobeeThinkingPhase(thinkingElapsedMs)),
  });

  return (
    <div data-social-frame-ai-thread="" data-social-dm-thread="" className={DM_THREAD_ROOT_CLASS}>
      <SocialDmThreadHeader
        label={ASSISTANT_NAME}
        href={null}
        photoUrl={null}
        avatarName=""
        face={<SocialFrameAiFace className={DM_THREAD_HEADER_AVATAR_CLASS} />}
      />
      <SocialDmThread messages={rows} />
      {ready ? null : (
        <div data-social-frame-ai-gate="" className="flex flex-col items-center gap-[var(--space-2)] px-4 py-6">
          <p className="t-body text-center text-ink">{ASK_GLOBEE.analyze}</p>
          <p className="t-body-sm text-center text-ink-3">{ASK_GLOBEE.included}</p>
          <Link
            href={ASK_GLOBEE.upgradeHref}
            data-ask-globee-upgrade=""
            className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-3.5 t-body-sm font-medium text-accent-contrast transition hover:opacity-90"
          >
            {ASK_GLOBEE.upgrade}
          </Link>
        </div>
      )}
      <form
        data-social-frame-ai-composer=""
        data-social-dm-form=""
        data-social-dm-composer=""
        className={DM_THREAD_COMPOSER_CLASS}
        onSubmit={(event) => {
          event.preventDefault();
          const next = askGlobeeComposerSubmit(draft);
          if (!next || busy) return;
          setError("");
          setPending(true);
          setThinkingElapsedMs(0);
          setPendingText(next);
          setDraft("");
          void sendTurn(next);
        }}
      >
        <div className={DM_THREAD_COMPOSER_ROW_CLASS}>
          <label className="sr-only" htmlFor="social-frame-ai-body">
            {SOCIAL.dms.compose}
          </label>
          <div className={DM_THREAD_COMPOSER_FIELD_CLASS}>
            <Input
              id="social-frame-ai-body"
              name="body"
              variant="bare"
              required
              autoComplete="off"
              enterKeyHint="send"
              placeholder={SOCIAL.dms.threadPlaceholder}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="w-full"
            />
          </div>
          <button type="submit" aria-label={SOCIAL.dms.submit} className={DM_THREAD_COMPOSER_SEND_CLASS}>
            <SocialIcon name="paper-plane-tilt" size={18} />
          </button>
          <button
            type="button"
            data-social-dm-camera=""
            aria-label={SOCIAL.home.attach}
            className={DM_THREAD_COMPOSER_CAMERA_CLASS}
            onClick={() => fileRef.current?.click()}
          >
            <SocialIcon name="camera" size={DM_THREAD_COMPOSER_CAMERA_GLYPH} className="text-ink" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={SOCIAL_MEDIA_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            data-social-dm-attach-input=""
            aria-label={SOCIAL.home.attach}
            onChange={(event) => {
              event.currentTarget.value = "";
            }}
          />
        </div>
        <FormError error={error || (openUserId !== null && finishedUserId !== openUserId ? completeError : "")} />
      </form>
      <SocialDmThreadStick nonce={rows.at(-1)?.id ?? "empty"} />
    </div>
  );

  async function sendTurn(next: string) {
    if (!ready) {
      const started = await startAskGlobeeConversation(next);
      setPending(false);
      setPendingText(null);
      setDraft(next);
      setError(started.error ?? ASK_GLOBEE.unavailable);
      return;
    }
    if (conversationId) {
      const result = await appendAskGlobeeTurn(conversationId, next);
      setPending(false);
      if ("error" in result && result.error) {
        setPendingText(null);
        setDraft(next);
        setError(result.error);
        return;
      }
      router.refresh();
      return;
    }
    const started = await startAskGlobeeConversation(next);
    if (!started.conversationId) {
      setPending(false);
      setPendingText(null);
      setDraft(next);
      setError(started.error ?? ASK_GLOBEE.unavailable);
      return;
    }
    setStartedId(started.conversationId);
    const done = await completeAskGlobeeTurn(started.conversationId);
    setPending(false);
    if ("error" in done && done.error) {
      setError(done.error);
    }
    router.refresh();
  }
}

function viewMessages(input: {
  ready: boolean;
  messages: readonly AskGlobeeStoredMessage[];
  share: SocialFrameAiShare | null;
  pending: boolean;
  pendingText: string | null;
  thinkingText: string;
}): DmThreadViewMessage[] {
  const now = new Date().toISOString();
  const rows: DmThreadViewMessage[] = [];
  if (
    socialFrameAiOpenerVisible({
      ready: input.ready,
      storedCount: input.messages.length,
      pending: input.pendingText !== null || input.pending,
    })
  ) {
    rows.push(textMessage("opener", false, SOCIAL_FRAME_AI_OPENER, now, "opener"));
  }
  for (const message of input.messages) {
    const mine = message.role === "user";
    const text = mine ? message.body : askGlobeeAnswerText(message.lead ?? message.body, message.follow);
    if (!text.trim()) continue;
    rows.push(textMessage(message.id, mine, text, message.created_at));
  }
  if (input.pendingText) {
    rows.push(textMessage("pending-user", true, input.pendingText, now));
  }
  if (input.pending) {
    rows.push(textMessage("pending-think", false, input.thinkingText, now, "thinking"));
  }
  if (input.share) rows.push(shareMessage(input.share, now));
  return rows;
}

function textMessage(
  id: string,
  mine: boolean,
  text: string,
  createdAt: string,
  marker?: "opener" | "thinking",
): DmThreadViewMessage {
  return {
    id,
    senderId: mine ? "self" : SOCIAL_FRAME_AI_ID,
    createdAt,
    mine,
    senderName: mine ? "" : ASSISTANT_NAME,
    senderPhotoUrl: null,
    text,
    story: null,
    post: null,
    ...(marker ? { marker } : {}),
  };
}

function shareMessage(share: SocialFrameAiShare, createdAt: string): DmThreadViewMessage {
  const base = {
    id: `share-${share.kind}`,
    senderId: "self",
    createdAt,
    mine: true,
    senderName: "",
    senderPhotoUrl: null,
    text: null as string | null,
  };
  if (share.kind === "story") {
    return {
      ...base,
      post: null,
      story: {
        comment: null,
        line: share.line,
        authorName: share.authorName,
        authorPhotoUrl: share.authorPhotoUrl,
        unavailable: share.unavailable,
        kind: share.mediaKind,
        url: share.url,
        playbackId: share.playbackId,
        playbackPolicy: share.playbackPolicy,
        href: share.href,
      },
    };
  }
  return {
    ...base,
    story: null,
    post: {
      comment: null,
      line: share.line,
      authorName: share.authorName,
      authorPhotoUrl: share.authorPhotoUrl,
      caption: share.caption,
      kind: share.mediaKind,
      url: share.url,
      playbackId: share.playbackId,
      playbackPolicy: share.playbackPolicy,
      href: share.href ?? "",
    },
  };
}
