import { Suspense } from "react";

import { AppShell } from "@/components/chrome/app-shell";
import { HousePathProvider } from "@/components/chrome/house-client-shell";
import {
  appShellActivityItems,
  appShellDmUnread,
  appShellUnread,
  enforceAppAccess,
  loadAppShellChrome,
} from "@/lib/app-shell-chrome";

// Sync layout. Next 16: awaiting cookies() / uncached fetches in this file
// blocks child loading.tsx — the leftover ≥1s on Social tab clicks after #284.
// Chrome data starts here as a promise. Access gates run in a sibling Suspense.
// The page slot is not behind S3 Head or getActiveOrgTier.
// No (app)/loading.tsx — that Suspense fallback painted the Aggregation
// dashboard skeleton over every Social / Education / Aggregation child hop.
// Destination loading.tsx files own body skeletons; chrome stays mounted.

async function AppAccessGate() {
  await enforceAppAccess();
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const chrome = loadAppShellChrome();
  return (
    <>
      <Suspense fallback={null}>
        <AppAccessGate />
      </Suspense>
      <HousePathProvider>
        <AppShell
          chrome={chrome}
          messagesUnread={appShellUnread(chrome)}
          dmUnread={appShellDmUnread(chrome)}
          activityItems={appShellActivityItems(chrome)}
        >
          {children}
        </AppShell>
      </HousePathProvider>
    </>
  );
}
