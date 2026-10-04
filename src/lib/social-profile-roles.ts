// Social profile Professions bank — one SoT (internal: roles_* / crafts).
// Official IMDbPro profession labels plus Writer credit-style
// compounds (Category: Attribute). House department groups, not an
// IMDb help-page category clone. Persist ordered slugs on
// profiles.crafts. primary_role stays the first selected slug.
// UI label is Professions — not Topics, not Category, not crafts.
// Public profile face: gray chips, every selected Role as its own
// chip, A→Z by label (sortByLabelAlpha, same helper as Topics).
// Persist and primary_role stay selection order. The chips wrap on
// phone and desktop (Stage lock 2026-10-04, supersedes the one-row
// scroll rail). No +N / more chip. Omit when empty.
// Edit max 5. Select and write stay sync. Not on SocialPersonRow.
// Investor is a Business add. Bio middots stay the author's copy.
// Edit face is one Settings drill-in row. Selecting stays on the
// existing professions chip-bank page.

import { sortByLabelAlpha } from "@/lib/social-categories";
import { SOCIAL } from "@/lib/social";

export const SOCIAL_PROFILE_ROLES_MAX = 5;
export const SOCIAL_PROFILE_ROLES_COUNT = "{n} / {max}";

export const SOCIAL_PROFILE_ROLE_GROUPS = [
  {
    id: "actor",
    label: "Actor",
    roles: [
      { slug: "actor", label: "Actor" },
      { slug: "actress", label: "Actress" },
      { slug: "voice_actor", label: "Voice Actor" },
      { slug: "stunt_performer", label: "Stunt Performer" },
      { slug: "choreographer", label: "Choreographer" },
    ],
  },
  {
    id: "writer",
    label: "Writer",
    roles: [
      { slug: "writer", label: "Writer" },
      { slug: "screenwriter", label: "Screenwriter" },
      { slug: "head_writer", label: "Head Writer" },
      { slug: "story_editor", label: "Story Editor" },
      { slug: "executive_story_editor", label: "Executive Story Editor" },
      { slug: "staff_writer", label: "Staff Writer" },
      { slug: "script_writer", label: "Script Writer" },
      { slug: "supervising_writer", label: "Supervising Writer" },
      { slug: "creator", label: "Creator" },
      { slug: "dramaturge", label: "Dramaturge" },
      { slug: "script_editor", label: "Script Editor" },
      { slug: "story_coordinator", label: "Story Coordinator" },
      { slug: "writer_written_by", label: "Writer: Written by" },
      { slug: "writer_screenplay", label: "Writer: Screenplay" },
      { slug: "writer_story", label: "Writer: Story" },
      { slug: "writer_teleplay", label: "Writer: Teleplay" },
      { slug: "writer_screen_story", label: "Writer: Screen Story" },
    ],
  },
  {
    id: "director",
    label: "Director",
    roles: [
      { slug: "director", label: "Director" },
      { slug: "supervising_director", label: "Supervising Director" },
      { slug: "executive_director", label: "Executive Director" },
      { slug: "second_unit_director", label: "Second Unit Director" },
      { slug: "assistant_director", label: "Assistant Director" },
      { slug: "script_supervisor", label: "Script Supervisor" },
    ],
  },
  {
    id: "producer",
    label: "Producer",
    roles: [
      { slug: "producer", label: "Producer" },
      { slug: "executive_producer", label: "Executive Producer" },
      { slug: "coordinating_producer", label: "Coordinating Producer" },
      { slug: "line_producer", label: "Line Producer" },
      { slug: "supervising_producer", label: "Supervising Producer" },
      { slug: "associate_producer", label: "Associate Producer" },
      { slug: "field_producer", label: "Field Producer" },
      { slug: "story_producer", label: "Story Producer" },
      { slug: "development_producer", label: "Development Producer" },
      { slug: "post_production_producer", label: "Post Production Producer" },
      { slug: "showrunner", label: "Showrunner" },
    ],
  },
  {
    id: "camera",
    label: "Camera",
    roles: [
      { slug: "cinematographer", label: "Cinematographer" },
      { slug: "director_of_photography", label: "Director of Photography" },
      { slug: "camera_operator", label: "Camera Operator" },
      { slug: "steadicam_operator", label: "Steadicam Operator" },
      { slug: "gaffer", label: "Gaffer" },
      { slug: "grip", label: "Grip" },
      { slug: "first_assistant_camera", label: "First Assistant Camera" },
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    roles: [
      { slug: "editor", label: "Editor" },
      { slug: "supervising_editor", label: "Supervising Editor" },
      { slug: "assistant_editor", label: "Assistant Editor" },
      { slug: "post_producer", label: "Post Producer" },
      { slug: "post_production_supervisor", label: "Post-Production Supervisor" },
      { slug: "colorist", label: "Colorist" },
      { slug: "digital_colorist", label: "Digital Colorist" },
    ],
  },
  {
    id: "art",
    label: "Art",
    roles: [
      { slug: "production_designer", label: "Production Designer" },
      { slug: "art_director", label: "Art Director" },
      { slug: "creative_director", label: "Creative Director" },
      { slug: "storyboard_artist", label: "Storyboard Artist" },
      { slug: "set_designer", label: "Set Designer" },
      { slug: "set_decorator", label: "Set Decorator" },
      { slug: "property_master", label: "Property Master" },
      { slug: "costume_designer", label: "Costume Designer" },
      { slug: "costume_supervisor", label: "Costume Supervisor" },
      { slug: "makeup_artist", label: "Makeup Artist" },
      { slug: "hairdresser", label: "Hairdresser" },
      { slug: "hair_and_makeup_artist", label: "Hair and Makeup Artist" },
    ],
  },
  {
    id: "sound",
    label: "Sound & music",
    roles: [
      { slug: "sound_mixer", label: "Sound Mixer" },
      { slug: "boom_operator", label: "Boom Operator" },
      { slug: "re_recording_mixer", label: "Re-Recording Mixer" },
      { slug: "sound_editor", label: "Sound Editor" },
      { slug: "sound_supervisor", label: "Sound Supervisor" },
      { slug: "composer", label: "Composer" },
      { slug: "music_director", label: "Music Director" },
      { slug: "musician", label: "Musician" },
      { slug: "music_supervisor", label: "Music Supervisor" },
      { slug: "soundtrack", label: "Soundtrack" },
      { slug: "music_artist", label: "Music Artist" },
    ],
  },
  {
    id: "visual_effects",
    label: "Visual effects",
    roles: [
      { slug: "visual_effects_supervisor", label: "Visual Effects Supervisor" },
      { slug: "visual_effects_artist", label: "Visual Effects Artist" },
      { slug: "visual_effects_editor", label: "Visual Effects Editor" },
      { slug: "motion_graphics_artist", label: "Motion Graphics Artist" },
      { slug: "animator", label: "Animator" },
      { slug: "animation_director", label: "Animation Director" },
      { slug: "special_effects_technician", label: "Special Effects Technician" },
      { slug: "special_effects_supervisor", label: "Special Effects Supervisor" },
    ],
  },
  {
    id: "production",
    label: "Production",
    roles: [
      { slug: "production_coordinator", label: "Production Coordinator" },
      { slug: "production_assistant", label: "Production Assistant" },
      { slug: "production_manager", label: "Production Manager" },
      { slug: "location_manager", label: "Location Manager" },
      { slug: "intimacy_coordinator", label: "Intimacy Coordinator" },
      { slug: "script_consultant", label: "Script Consultant" },
      { slug: "talent_coordinator", label: "Talent Coordinator" },
    ],
  },
  {
    id: "casting",
    label: "Casting",
    roles: [
      { slug: "casting_director", label: "Casting Director" },
      { slug: "casting_associate", label: "Casting Associate" },
    ],
  },
  {
    id: "digital",
    label: "Digital",
    roles: [
      { slug: "digital_creator", label: "Digital Creator" },
      { slug: "influencer", label: "Influencer" },
      { slug: "podcaster", label: "Podcaster" },
    ],
  },
  {
    id: "business",
    label: "Business",
    roles: [
      { slug: "executive", label: "Executive" },
      { slug: "lawyer", label: "Lawyer" },
      { slug: "attorney", label: "Attorney" },
      { slug: "publicist", label: "Publicist" },
      { slug: "talent_agent", label: "Talent Agent" },
      { slug: "manager", label: "Manager" },
      { slug: "accountant", label: "Accountant" },
      { slug: "production_accountant", label: "Production Accountant" },
      { slug: "investor", label: "Investor" },
    ],
  },
] as const;

export type SocialProfileRoleSlug =
  (typeof SOCIAL_PROFILE_ROLE_GROUPS)[number]["roles"][number]["slug"];

// Old crafts slugs → official bank slugs. Unmapped leftovers stay
// on the profile and render via socialProfileRoleLabel.
export const SOCIAL_PROFILE_ROLE_SLUG_ALIASES = {
  steadicam: "steadicam_operator",
  soundtrack_artist: "soundtrack",
  vfx_supervisor: "visual_effects_supervisor",
  vfx_editor: "visual_effects_editor",
  agent: "talent_agent",
  studio_executive: "executive",
  production_sound: "sound_mixer",
  prop_master: "property_master",
  hair_stylist: "hairdresser",
  special_effects: "special_effects_technician",
  motion_designer: "motion_graphics_artist",
  tv_writer: "writer",
  segment_producer: "field_producer",
  sfx_makeup: "makeup_artist",
  wardrobe: "costume_supervisor",
  previs: "storyboard_artist",
  cast_coordinator: "talent_coordinator",
  key_grip: "grip",
} as const satisfies Record<string, SocialProfileRoleSlug>;

export const SOCIAL_PROFILE_ROLES = SOCIAL_PROFILE_ROLE_GROUPS.flatMap((group) =>
  group.roles.map((role) => ({ ...role, groupId: group.id })),
);

const ROLE_BY_SLUG = new Map<string, (typeof SOCIAL_PROFILE_ROLES)[number]>(
  SOCIAL_PROFILE_ROLES.map((role) => [role.slug, role]),
);

const ROLE_ALIAS_BY_SLUG = new Map<string, SocialProfileRoleSlug>(
  Object.entries(SOCIAL_PROFILE_ROLE_SLUG_ALIASES),
);

export function isSocialProfileRoleSlug(value: string): value is SocialProfileRoleSlug {
  return ROLE_BY_SLUG.has(value);
}

export function canonicalSocialProfileRoleSlug(value: string): string {
  return ROLE_ALIAS_BY_SLUG.get(value) ?? value;
}

function titleCaseRolePart(part: string): string {
  if (part.toLowerCase() === "dit") return "DIT";
  if (!part) return part;
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export function socialProfileRoleLabel(slug: string): string {
  const canonical = canonicalSocialProfileRoleSlug(slug);
  const known = ROLE_BY_SLUG.get(canonical) ?? ROLE_BY_SLUG.get(slug);
  if (known) return known.label;
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map(titleCaseRolePart)
    .join(" ");
}

function roleValues(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  const text = raw.trim();
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [text];
  } catch {
    return text.split(",").map((part) => part.trim());
  }
}

export function parseSocialProfileRoles(raw: unknown): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const value of roleValues(raw)) {
    if (typeof value !== "string") continue;
    const slug = canonicalSocialProfileRoleSlug(value.trim());
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
    if (slugs.length === SOCIAL_PROFILE_ROLES_MAX) break;
  }
  return slugs;
}

export function socialProfileRolesWrite(raw: unknown): {
  crafts: string[];
  primary_role: string | null;
} {
  const crafts = parseSocialProfileRoles(raw);
  return { crafts, primary_role: crafts[0] ?? null };
}

export function toggleSocialProfileRole(selected: readonly string[], slug: string): string[] {
  const current = parseSocialProfileRoles(selected);
  const canonical = canonicalSocialProfileRoleSlug(slug);
  if (current.includes(canonical)) return current.filter((item) => item !== canonical);
  if (current.length >= SOCIAL_PROFILE_ROLES_MAX) return current;
  if (!isSocialProfileRoleSlug(canonical)) return current;
  return [...current, canonical];
}

export function moveSocialProfileRole(
  selected: readonly string[],
  fromId: string,
  toId: string,
): string[] {
  const current = parseSocialProfileRoles(selected);
  const fromSlug = canonicalSocialProfileRoleSlug(fromId);
  const toSlug = canonicalSocialProfileRoleSlug(toId);
  const fromIndex = current.indexOf(fromSlug);
  const toIndex = current.indexOf(toSlug);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
  const next = [...current];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return current;
  next.splice(toIndex, 0, item);
  return next;
}

export function socialProfileRolesCountLabel(count: number): string {
  return SOCIAL_PROFILE_ROLES_COUNT.replace("{n}", String(count)).replace(
    "{max}",
    String(SOCIAL_PROFILE_ROLES_MAX),
  );
}

export function socialProfileRolesSelectedLabel(count: number): string {
  return SOCIAL.profile.rolesSelected.replace("{n}", String(count));
}

export function socialProfileRolesRowSummary(raw: unknown): string {
  const slugs = parseSocialProfileRoles(raw);
  if (slugs.length === 0) return SOCIAL.profile.rolesAdd;
  const first = socialProfileRoleLabel(slugs[0] ?? "");
  if (slugs.length === 1) return first;
  return SOCIAL.profile.rolesMore
    .replace("{first}", first)
    .replace("{n}", String(slugs.length - 1));
}

export function socialProfileRoleChips(raw: unknown): {
  slug: string;
  label: string;
}[] {
  return sortByLabelAlpha(
    parseSocialProfileRoles(raw).map((slug) => ({
      slug,
      label: socialProfileRoleLabel(slug),
    })),
    (role) => role.label,
  );
}

export type SocialProfileRolesRailItem = { kind: "role"; slug: string; label: string };

export function socialProfileRolesRailItems(raw: unknown): SocialProfileRolesRailItem[] {
  return socialProfileRoleChips(raw).map((role) => ({
    kind: "role",
    slug: role.slug,
    label: role.label,
  }));
}

export function filterSocialProfileRoleGroups(query: string) {
  const needle = query.trim().toLowerCase();
  return SOCIAL_PROFILE_ROLE_GROUPS.map((group) => {
    const groupHit =
      group.id.includes(needle) || group.label.toLowerCase().includes(needle);
    return {
      id: group.id,
      label: group.label,
      roles: needle
        ? groupHit
          ? group.roles
          : group.roles.filter(
              (role) =>
                role.label.toLowerCase().includes(needle) || role.slug.includes(needle),
            )
        : group.roles,
    };
  }).filter((group) => group.roles.length > 0);
}
