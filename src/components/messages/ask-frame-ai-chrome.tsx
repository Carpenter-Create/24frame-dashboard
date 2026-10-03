"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { AskFrameAiHistoryRow, AskFrameAiStoredMessage } from "@/lib/ask-frame-ai-conversations";

export type AskFrameAiChromeState = Pick<AskFrameAiHistoryRow, "id" | "title" | "pinned_at"> & {
  initials?: string;
  messages?: AskFrameAiStoredMessage[];
};

type AskFrameAiChromeContextValue = {
  chrome: AskFrameAiChromeState | null;
  setChrome: (next: AskFrameAiChromeState | null) => void;
  conversations: AskFrameAiHistoryRow[];
  setConversations: (next: AskFrameAiHistoryRow[]) => void;
  historyOpen: boolean;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
};

const AskFrameAiChromeContext = createContext<AskFrameAiChromeContextValue>({
  chrome: null,
  setChrome: () => {},
  conversations: [],
  setConversations: () => {},
  historyOpen: false,
  setHistoryOpen: () => {},
});

export function AskAssistantChromeProvider({
  children,
  initialChrome = null,
  initialConversations = [],
}: {
  children: React.ReactNode;
  initialChrome?: AskFrameAiChromeState | null;
  initialConversations?: AskFrameAiHistoryRow[];
}) {
  const [chrome, setChrome] = useState<AskFrameAiChromeState | null>(initialChrome);
  const [conversations, setConversations] = useState<AskFrameAiHistoryRow[]>(initialConversations);
  const [historyOpen, setHistoryOpen] = useState(false);
  const value = useMemo(
    () => ({ chrome, setChrome, conversations, setConversations, historyOpen, setHistoryOpen }),
    [chrome, conversations, historyOpen],
  );
  return <AskFrameAiChromeContext.Provider value={value}>{children}</AskFrameAiChromeContext.Provider>;
}

export function useAskFrameAiChrome() {
  return useContext(AskFrameAiChromeContext);
}
