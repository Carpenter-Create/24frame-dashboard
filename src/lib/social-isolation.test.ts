import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("social isolation lock", () => {
  it("keeps one Query provider and server-only Redis", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const provider = readFileSync("src/components/query-provider.tsx", "utf8");
    const keys = readFileSync("src/lib/social-cache-keys.ts", "utf8");
    const redis = readFileSync("src/lib/social-hot-cache.ts", "utf8");
    const forms = [
      "src/components/social/social-create-compose.tsx",
      "src/components/social/social-dm-compose.tsx",
      "src/components/social/social-bio-form.tsx",
      "src/components/social/social-group-forms.tsx",
      "src/components/social/social-profile-create-form.tsx",
      "src/components/social/social-profile-photo-form.tsx",
      "src/components/social/social-story-reply.tsx",
      "src/components/social/social-message-button.tsx",
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const env = readFileSync(".env.example", "utf8");
    expect(layout).toContain("QueryProvider");
    expect(provider).toContain("createAppQueryClient");
    expect(provider).toContain("useState(createAppQueryClient)");
    expect(keys).toContain("social:profile:");
    expect(keys).toContain("social:counts:");
    expect(keys).toContain("social:follow:");
    expect(redis).toContain('import "server-only"');
    expect(redis).toContain("KV_REST_API_URL");
    expect(redis).toContain("KV_REST_API_TOKEN");
    expect(redis).toContain("UPSTASH_REDIS_REST_URL");
    expect(redis).toContain("UPSTASH_REDIS_REST_TOKEN");
    expect(redis).toContain("firstPresent(process.env.KV_REST_API_URL, process.env.UPSTASH_REDIS_REST_URL)");
    expect(redis).not.toContain("NEXT_PUBLIC_UPSTASH");
    expect(redis).not.toContain("NEXT_PUBLIC_KV");
    expect(forms).not.toContain("@upstash/redis");
    expect(forms).not.toContain("UPSTASH_REDIS_REST_TOKEN");
    expect(forms).not.toContain("KV_REST_API_TOKEN");
    expect(env).toContain("KV_REST_API_URL=");
    expect(env).toContain("KV_REST_API_TOKEN=");
    expect(env).toContain("UPSTASH_REDIS_REST_URL=");
    expect(env).toContain("UPSTASH_REDIS_REST_TOKEN=");
    expect(env).not.toContain("NEXT_PUBLIC_UPSTASH");
    expect(env).not.toContain("NEXT_PUBLIC_KV");
    expect(env).toContain("MUX_TOKEN_ID=");
    expect(env).toContain("MUX_TOKEN_SECRET=");
    expect(env).toContain("MUX_SIGNING_KEY=");
    expect(env).toContain("MUX_PRIVATE_KEY=");
    expect(env).not.toContain("NEXT_PUBLIC_MUX");
  });

  it("does not add person-scoped tables to the B3 catalog harness", () => {
    const b3 = readFileSync("scripts/security/b3-cross-org-isolation.mjs", "utf8");
    expect(b3).toContain("Cross-org isolation");
    expect(b3).not.toContain("from(\"profiles\")");
    expect(b3).not.toContain("from(\"groups\")");
    expect(b3).not.toContain("from(\"posts\")");
    expect(b3).not.toContain("from(\"likes\")");
    expect(b3).not.toContain("from(\"leaderboard_entries\")");
    expect(b3).not.toContain("from(\"level_distribution\")");
    expect(b3).not.toContain("rebuild_leaderboards");
    expect(b3).not.toContain("get_dm_inbox");
    expect(b3).not.toContain("open_or_get_direct_conversation");
    expect(b3).not.toContain("add_conversation_participants");
    expect(b3).not.toContain("set_group_conversation_title");
    expect(b3).not.toContain("from(\"courses\")");
    expect(b3).not.toContain("from(\"modules\")");
    expect(b3).not.toContain("from(\"lessons\")");
    expect(b3).not.toContain("has_course_access");
    expect(b3).not.toContain("from(\"follows\")");
    expect(b3).not.toContain("from(\"stories\")");
    expect(b3).not.toContain("from(\"story_views\")");
    expect(b3).not.toContain("from(\"comments\")");
  });

  it("keeps Social writes on the user-scoped client", () => {
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    expect(actions).toContain('from "@/lib/supabase/server"');
    expect(actions).not.toContain("@/lib/supabase/admin");
    expect(actions).not.toContain("SERVICE_ROLE");
    expect(actions).not.toContain("ai_conversations");
    const session = readFileSync("src/lib/social-session.ts", "utf8");
    expect(session).toContain('from "@/lib/supabase/server"');
    expect(session).not.toContain("@/lib/supabase/admin");
    expect(session).not.toContain("SERVICE_ROLE");
    const board = readFileSync("src/app/(app)/social/leaderboard/page.tsx", "utf8");
    expect(board).toContain('from "@/lib/social-session"');
    expect(board).not.toContain("@/lib/supabase/admin");
    expect(board).not.toContain("rebuild_leaderboards");
    const list = readFileSync("src/app/(app)/education/page.tsx", "utf8");
    const detail = readFileSync("src/app/(app)/education/[slug]/page.tsx", "utf8");
    expect(list).toContain('from "@/lib/social-session"');
    expect(detail).toContain('from "@/lib/social-session"');
    expect(list).not.toContain("@/lib/supabase/admin");
    expect(detail).not.toContain("@/lib/supabase/admin");
    expect(actions).not.toContain("from(\"courses\")");
    expect(list).not.toContain("/education");
    expect(detail).not.toContain("/lessons/");
    const light = readFileSync("src/app/(app)/social/light-actions.ts", "utf8");
    expect(light).toContain("export async function toggleSocialFollow");
    expect(light).toContain("export async function toggleSocialLike");
    expect(light).toContain("export async function createSocialComment");
    expect(light).toContain("export async function deleteSocialComment");
    expect(actions).not.toContain("toggleSocialFollow");
    expect(light).toContain('from("follows")');
    expect(light).toContain("notify_new_follower");
    expect(light).toContain("bustSocialFollowHotCache");
    expect(light).not.toContain("@/lib/s3-social-media");
    expect(light).not.toContain("presignSocialMedia");
    expect(actions).toContain("bustSocialProfileHotCache");
    expect(actions).toContain('from("stories")');
    expect(actions).not.toContain("from(\"reels\")");
    expect(actions).toContain("ensureOwnSocialProfile");
    expect(actions).toContain("export async function writeSocialPost");
    expect(actions).toContain("createSocialPost");
    expect(actions).toContain("createSocialMuxUpload");
    expect(actions).toContain("finalizeSocialMuxUpload");
    expect(actions).toContain("@/lib/social-mux-server");
    expect(actions).not.toContain("NEXT_PUBLIC_MUX");
    const muxServer = readFileSync("src/lib/social-mux-server.ts", "utf8");
    expect(muxServer).toContain('import "server-only"');
    expect(muxServer).not.toContain("NEXT_PUBLIC_");
    expect(light).not.toContain("social-mux-server");
    const likeApi = readFileSync("src/app/api/social/like/route.ts", "utf8");
    const postApi = readFileSync("src/app/api/social/post/route.ts", "utf8");
    const commentApi = readFileSync("src/app/api/social/comment/route.ts", "utf8");
    expect(likeApi).toContain("toggleSocialLike");
    expect(likeApi).toContain('from "@/app/(app)/social/light-actions"');
    expect(postApi).toContain("writeSocialPost");
    expect(postApi).not.toContain("updateSocialPostCaption");
    expect(postApi).not.toContain("deleteSocialPost");
    const postOwnApi = readFileSync("src/app/api/social/post-own/route.ts", "utf8");
    expect(postOwnApi).toContain("updateSocialPostCaption");
    expect(postOwnApi).toContain("deleteSocialPost");
    expect(postOwnApi).not.toContain("writeSocialPost");
    expect(postOwnApi).not.toContain("SERVICE_ROLE");
    expect(light).toContain("export async function updateSocialPostCaption");
    expect(light).toContain("export async function deleteSocialPost");
    expect(commentApi).toContain("createSocialComment");
    expect(commentApi).toContain("deleteSocialComment");
    expect(commentApi).toContain('from "@/app/(app)/social/light-actions"');
    expect(commentApi).not.toContain("@/lib/supabase/admin");
    expect(commentApi).not.toContain("SERVICE_ROLE");
    expect(likeApi).not.toContain("@/lib/supabase/admin");
    expect(postApi).not.toContain("@/lib/supabase/admin");
    expect(likeApi).not.toContain("SERVICE_ROLE");
    expect(postApi).not.toContain("SERVICE_ROLE");
    const editPage = readFileSync("src/app/(app)/social/profile/edit/page.tsx", "utf8");
    const bioPage = readFileSync("src/app/(app)/social/profile/edit/bio/page.tsx", "utf8");
    expect(editPage).toContain('from "@/lib/social-session"');
    expect(bioPage).toContain('from "@/lib/social-session"');
    expect(editPage).not.toContain("@/lib/supabase/admin");
    expect(bioPage).not.toContain("@/lib/supabase/admin");
    expect(editPage).not.toContain("SERVICE_ROLE");
    expect(bioPage).not.toContain("from(\"reels\")");
  });

  it("does not create another person's Social profile from org invite or membership", () => {
    const orgCreate = readFileSync("src/app/actions.ts", "utf8");
    const identity = readFileSync("supabase/migrations/20260912033234_identity_spine.sql", "utf8");
    const profile = readFileSync("src/lib/social-profile.ts", "utf8");
    expect(orgCreate).toContain("create_org_and_membership");
    expect(orgCreate).not.toContain("from(\"profiles\")");
    expect(orgCreate).not.toContain("ensureOwnSocialProfile");
    expect(identity).toContain("do not auto-create    profiles on org invite or membership insert");
    expect(identity).toContain("Mapping C: no trigger on auth.users, memberships, or organizations that");
    expect(profile).toContain("never an invitee");
    expect(profile).toContain("user.id");
  });

  it("locks posts.group_id off ON DELETE CASCADE", () => {
    const migration = readFileSync(
      "supabase/migrations/20260914190000_social_group_delete_no_cascade_posts.sql",
      "utf8",
    );
    const fkSql = migration.match(
      /add constraint posts_group_id_fkey[\s\S]*?;/,
    )?.[0];
    expect(fkSql).toBeTruthy();
    expect(fkSql).toMatch(/on delete restrict/i);
    expect(fkSql).not.toMatch(/on delete cascade/i);
    expect(migration).toContain("LIFECYCLE CLASS");
    expect(migration).toContain("ACCESS PATH");
    expect(migration).toContain("NO ORG_ID ON SOCIAL");
    expect(migration).toContain("drop policy if exists groups_delete_staff");
    expect(migration).not.toMatch(/create policy groups_delete_staff/i);
    expect(migration).toContain("revoke delete on public.groups from authenticated");
    expect(migration).toContain("no org_id");
  });

  it("binds posts/stories media keys to the author in the database", () => {
    const migration = readFileSync(
      "supabase/migrations/20260914200000_social_media_author_bound.sql",
      "utf8",
    );
    expect(migration).toContain("INTENT: Remediation class 3");
    expect(migration).toContain("ACCESS PATH");
    expect(migration).toContain("NO ORG_ID ON SOCIAL");
    expect(migration).toContain("create or replace function public.social_media_keys_owned");
    expect(migration).toContain("add constraint posts_media_author_bound");
    expect(migration).toContain("add constraint stories_media_author_bound");
    expect(migration).toContain("social_media_keys_owned(media, author_id, 'posts')");
    expect(migration).toContain("social_media_keys_owned(media, author_id, 'stories')");
    expect(migration).not.toMatch(/org_id uuid/i);
    expect(migration).toContain("Do not add org_id or is_gc_staff");
    expect(migration).not.toMatch(/is_gc_staff\s*\(/);
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    expect(actions).toContain("mediaItemsForPublish(formData.get(\"media\"), user.id)");
    expect(actions).toContain("mediaItemsForPublish(formData.get(\"media\"), user.id, \"stories\")");
    // Every save that stores a file uses only the server's published copy.
    for (const action of ["writeSocialPost", "createSocialStory", "saveSocialProfileCover"]) {
      const start = actions.indexOf(`export async function ${action}(`);
      const body = actions.slice(start, actions.indexOf("\nexport ", start + 1));
      expect(start, action).toBeGreaterThan(-1);
      expect(body, action).toContain("await publishSocialMediaItems(");
      expect(body, action).toContain("published.items");
    }
    const welcomeStart = actions.indexOf("export async function saveSocialWelcomeVideo(");
    const welcomeBody = actions.slice(welcomeStart, actions.indexOf("\nexport ", welcomeStart + 1));
    expect(welcomeStart).toBeGreaterThan(-1);
    expect(welcomeBody).toContain("welcomeVideoItemFromMedia");
    expect(welcomeBody).toContain("rejectUnboundSocialMux");
    expect(welcomeBody).toContain("welcome_mux_asset_id");
    expect(welcomeBody).toContain("SOCIAL.stories.mediaType");
    expect(welcomeBody).not.toContain("await publishSocialMediaItems(");
    expect(welcomeBody).toContain("welcome_video_key: null");
    const sign = readFileSync("src/lib/s3-social-media.ts", "utf8");
    expect(sign).toContain("socialMediaProxies(media, authorId, lane)");
    expect(sign).toContain("socialMediaProxiesByPostId(posts)");
  });

  it("caps DM fan-out and names inbox/thread honesty bounds", () => {
    const migration = readFileSync(
      "supabase/migrations/20260914420000_dm_fanout_caps.sql",
      "utf8",
    );
    const bounds = readFileSync("src/lib/social-dm-bounds.ts", "utf8");
    const loaders = readFileSync("src/lib/social-dms.ts", "utf8");
    const inbox = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
    const thread = readFileSync("src/app/(app)/social/dms/[id]/page.tsx", "utf8");
    expect(migration).toContain("INTENT: Remediation class 6");
    expect(migration).toContain("ACCESS PATH");
    expect(migration).toContain("limit 32");
    expect(migration).toContain(", 51)");
    expect(migration).toContain("room is full");
    expect(migration).not.toMatch(/org_id uuid/i);
    expect(migration).not.toMatch(/is_gc_staff\s*\(/);
    expect(bounds).toContain("SOCIAL_DM_FANOUT_BATCH");
    expect(bounds).toContain("created_at+id keyset");
    expect(loaders).toContain("get_dm_inbox");
    expect(loaders).toContain("splitProbe");
    expect(loaders).toContain("ascending: false");
    expect(inbox).toContain("loadDmInbox");
    expect(inbox).toContain("data-social-dms-truncated");
    expect(thread).toContain("loadDmThreadMessages");
    expect(thread).toContain("data-social-dm-thread-truncated");
    expect(thread).toContain("data-social-dm-older-page");
    expect(thread).toContain("!historical");
    expect(thread).not.toContain("ascending: true");
    expect(thread).not.toContain("DETAIL_LIST");
    expect(thread).not.toContain("rangeFor");
  });

  it("lets authenticated members select active public handles", () => {
    const migration = readFileSync(
      "supabase/migrations/20260914210000_profiles_select_active_public.sql",
      "utf8",
    );
    const page = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const hotReads = readFileSync("src/lib/social-hot-reads.ts", "utf8");
    const insert = readFileSync("src/lib/social.ts", "utf8");
    expect(migration).toContain("or status = 'active'");
    expect(migration).toContain("or discoverable = true");
    expect(migration).toMatch(/create policy profiles_select[\s\S]*status = 'active'/);
    expect(migration).not.toMatch(/create policy profiles_select[\s\S]*status <> 'active'/);
    expect(migration).not.toContain("createAdminClient");
    expect(hotReads).toContain('.eq("handle", handle)');
    expect(page).toContain("loadCachedSocialProfileByHandle");
    expect(page).not.toContain("createAdminClient");
    expect(insert).toContain("discoverable: true");
  });

  it("does not act-as a client on Social — view-as stays Aggregation-only", () => {
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    const layout = readFileSync("src/app/(app)/social/layout.tsx", "utf8");
    const session = readFileSync("src/lib/social-session.ts", "utf8");
    const dms = readFileSync("src/app/(app)/social/dms/page.tsx", "utf8");
    const profile = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    for (const src of [actions, layout, session, dms, profile]) {
      expect(src).not.toContain("startAggregationViewAs");
      expect(src).not.toContain("stopAggregationViewAs");
      expect(src).not.toContain("24frame_aggregation_view_as");
      expect(src).not.toContain("AggregationViewAsBanner");
    }
    const cookie = readFileSync("src/lib/aggregation-impersonation.ts", "utf8");
    expect(cookie).toContain('AGGREGATION_VIEW_AS_COOKIE_PATH = AGGREGATION_ROOT');
    expect(cookie).toContain("isSocialPath(pathname)");
  });

  it("rewrites apex /@handle to /social/u/{display} and 301s leftover /social/@handle", () => {
    const social = readFileSync("src/lib/social.ts", "utf8");
    const middleware = readFileSync("src/lib/supabase/middleware.ts", "utf8");
    const nextConfig = readFileSync("next.config.ts", "utf8");
    expect(social).toContain("socialVanityInternalPath");
    expect(social).toContain("matchSocialPublicAtPath");
    expect(social).toContain("socialProfileRewriteTarget");
    expect(social).toContain("socialProfileLegacyPublicRedirect");
    expect(social).toContain("matchSocialPublicAtPath");
    expect(social).toContain("socialProfileHref");
    expect(social).toContain("SOCIAL_VANITY_RESERVED_HANDLES");
    expect(social).toContain("https://24frame.co/@");
    expect(social).toContain("socialProfileCanonicalUrl");
    expect(nextConfig).not.toContain('source: "/@:handle"');
    expect(nextConfig).not.toContain("/social/u/@:handle");
    expect(middleware).toContain("socialProfileRewriteTarget");
    expect(middleware).toContain("socialProfileLegacyPublicRedirect");
    expect(middleware).toContain("NextResponse.rewrite");
    expect(middleware).toContain("NextResponse.redirect");
    expect(middleware).toContain("301");
    expect(middleware).not.toContain('path.startsWith("/@")');
    expect(middleware).not.toContain("status: 301");
  });
});
