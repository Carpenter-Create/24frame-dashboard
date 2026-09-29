"use client";

import { createContext, useContext, type ReactNode } from "react";

// Home Following wall only. Other Mux hosts stay outside this provider.
// docs/design-locks/social-home-following-mux-active-gate-lock-v1.md

const SocialMuxActiveGateContext = createContext(false);

export function SocialMuxActiveGate({ children }: { children: ReactNode }) {
  return <SocialMuxActiveGateContext.Provider value={true}>{children}</SocialMuxActiveGateContext.Provider>;
}

export function useSocialMuxActiveGate(): boolean {
  return useContext(SocialMuxActiveGateContext);
}
