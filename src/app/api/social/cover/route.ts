import { NextResponse } from "next/server";

import { readSocialMediaObject } from "@/lib/s3-social-media";
import { isOwnedSocialMediaKey } from "@/lib/social-media";
import { SOCIAL_COVER_SOURCE_PARAM } from "@/lib/social-edge";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

function closed(status: number) {
  return new NextResponse(null, { status, headers: NO_STORE });
}

// Owner cover bytes. Same-origin body — not a 302 to the CDN, which the
// browser cannot read (no CORS on the signed URL).
// ?source=1 streams the kept original (cover_source_key) so Reposition can
// reopen it; it is never signed for visitors. Both read only the caller's
// own profile row; a client-sent key is refused.

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.has("key")) return closed(400);
  const source = params.get(SOCIAL_COVER_SOURCE_PARAM) === "1";

  const user = await getAuthUser();
  if (!user) return closed(401);

  const supabase = await createClient();
  let key = "";
  if (source) {
    const { data, error } = await supabase
      .from("profiles")
      .select("cover_source_key")
      .eq("id", user.id)
      .maybeSingle();
    key = !error && typeof data?.cover_source_key === "string" ? data.cover_source_key.trim() : "";
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("cover_key")
      .eq("id", user.id)
      .maybeSingle();
    key = !error && typeof data?.cover_key === "string" ? data.cover_key.trim() : "";
  }
  if (!key) return closed(404);
  if (!isOwnedSocialMediaKey(key, user.id, "posts") || !/\.(jpe?g|png|webp|gif)$/i.test(key)) {
    return closed(400);
  }

  const object = await readSocialMediaObject(key);
  if (!object) return closed(404);

  const copy = new ArrayBuffer(object.bytes.byteLength);
  new Uint8Array(copy).set(object.bytes);
  return new NextResponse(new Blob([copy], { type: object.contentType }), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, no-store",
      "Content-Length": String(object.bytes.byteLength),
    },
  });
}
