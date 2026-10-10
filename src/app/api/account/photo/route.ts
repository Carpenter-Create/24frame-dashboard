import { NextResponse } from "next/server";

import { avatarKeyFromProfileRead } from "@/lib/account-avatar";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Chrome face GET. Mapping C: sign avatars/{user-id}/avatar for the session
// user only. Re-sign on every request so the client shell never holds a
// 5-minute S3 URL. 404 when empty — chrome falls back to the initial.
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new NextResponse(null, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const supabase = await createClient();
  const read = await supabase.from("profiles").select("avatar_key").eq("id", user.id).maybeSingle();
  const pointer = avatarKeyFromProfileRead(read.error, read.data);
  if (!pointer.sign) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const url = await signedAvatarUrl(user.id, pointer.key);
  if (!url) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
