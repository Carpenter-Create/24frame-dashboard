import { NextResponse } from "next/server";
import { z } from "zod";

import { AVATAR_SIGNED_URL_TTL_SECONDS } from "@/lib/account-avatar";
import { signedAvatarUrl } from "@/lib/s3-avatars";
import { privateMaxAgeCacheControl } from "@/lib/signing-window";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const userIdSchema = z.string().uuid();

// Node signer for Edge Social reads. Session required. Edge HTML holds
// the same-origin href, never a 5-minute S3 URL. A successful 302 is
// private max-age aligned to the signing window so the browser can reuse
// the Location. Auth misses and empty faces stay no-store.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return new NextResponse(null, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const { userId } = await params;
  if (!userIdSchema.safeParse(userId).success) {
    return new NextResponse(null, {
      status: 400,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("avatar_key").eq("id", userId).maybeSingle();
  const url = await signedAvatarUrl(userId, data?.avatar_key);
  if (!url) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", privateMaxAgeCacheControl(AVATAR_SIGNED_URL_TTL_SECONDS));
  return response;
}
