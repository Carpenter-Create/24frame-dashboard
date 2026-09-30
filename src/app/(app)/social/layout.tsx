import { SocialProfileSaveHop } from "@/components/social/social-own-profile";
import { SocialStoryOpenHold } from "@/components/social/social-story-open-hold";
import { loadSocialSession } from "@/lib/social-session";

// Sync Social segment layout. Stays mounted across /social/* so the
// destination page swaps without tearing down this boundary. Warms the
// request-cached session so Home ↔ Explore ↔ Messages ↔ Profile ↔ Edit
// reuse one auth+client promise instead of starting it in the page.
// Save hop paints the new own face here — already mounted — so Done
// never waits on loading.tsx or the profile RSC.
export default function SocialLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  void loadSocialSession();
  return (
    <SocialProfileSaveHop>
      <SocialStoryOpenHold />
      {children}
      {modal}
    </SocialProfileSaveHop>
  );
}
