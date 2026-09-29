import {
  parseSocialCategoryParam,
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_PARAM,
  socialCategorySlug,
  type SocialCategoryLabel,
} from "@/lib/social-categories";
import {
  parseSocialHomeLane,
  SOCIAL_HOME_LANE_PARAM,
  SOCIAL_ROUTES,
  type SocialHomeLane,
} from "@/lib/social";

export function readSocialHomeLocation(search: string): {
  lane: SocialHomeLane;
  topic: SocialCategoryLabel;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return {
    lane: parseSocialHomeLane(params.get(SOCIAL_HOME_LANE_PARAM)),
    topic: parseSocialCategoryParam(params.get(SOCIAL_CATEGORY_PARAM)),
  };
}

/**
 * Owned house search wins so a lane/topic click paints the chip
 * before SocialHomeCenter resolves. Before the shell owns the
 * address, an empty Next search is the Suspense fallback — keep
 * the RSC seed so a deep link paints the right chip.
 */
export function resolveSocialHomeLocation(input: {
  owned: boolean;
  search: string;
  nextSearch: string;
  seedLane: SocialHomeLane;
  seedTopic: SocialCategoryLabel;
}): { lane: SocialHomeLane; topic: SocialCategoryLabel } {
  const source = input.owned ? input.search : input.nextSearch.length > 0 ? input.nextSearch : null;
  if (source === null) return { lane: input.seedLane, topic: input.seedTopic };
  return readSocialHomeLocation(source);
}

/**
 * Lane and topic are independent. Following omits `lane` (parse default).
 * For you keeps `?lane=for-you`. A topic keeps `?topic=`. No `/social/home`.
 * docs/design-locks/social-home-density-craft-sequel-lock-v1.md
 */
export function socialHomeAxisHref(lane: SocialHomeLane, topic: SocialCategoryLabel): string {
  const params = new URLSearchParams();
  if (topic !== SOCIAL_CATEGORY_ALL) {
    params.set(SOCIAL_CATEGORY_PARAM, socialCategorySlug(topic));
  }
  if (lane === "for-you") {
    params.set(SOCIAL_HOME_LANE_PARAM, lane);
  }
  const query = params.toString();
  return query.length > 0 ? `${SOCIAL_ROUTES.home}?${query}` : SOCIAL_ROUTES.home;
}
