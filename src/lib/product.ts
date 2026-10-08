// Product chrome. Shell, login, document title, onboarding, portal,
// and download brand hang off these. Identifiers stay (ask-frame-ai,
// /messages, is_gc_staff). Parent entity is Holdings LLC only.
//
// One 24Frame account. Three workspace destinations: Aggregation
// (catalog), Social (creator profile, groups, posts, DMs), and
// Education consume is /education. Staff CMS is /education/manage
// under (operator). Ask 24Frame AI is the shell overlay, not /messages.
// Team invite lives on Settings / Organization. House grant is staff-only.

export const PRODUCT_NAME = "24Frame";
export const ASSISTANT_NAME = "24Frame AI";
export const ASK_ASSISTANT = `Ask ${ASSISTANT_NAME}`;
export const PARENT_ENTITY = "Global Content Holdings LLC";
export const AGGREGATION_WORKSPACE = "aggregation workspace";
export const COMPANY_AGGREGATION_WORKSPACE = "company aggregation workspace";
export const SOCIAL_WORKSPACE = "Social workspace";
export const WORKSPACE_AGGREGATION_LABEL = "Aggregation";
export const WORKSPACE_SOCIAL_LABEL = "Social";
/** Adam 2026-09-20 — Staff label. Not Team. Not Ops. Since 2026-10-08
 *  an account-menu row for GC staff, not a switcher lane
 *  (docs/design-locks/staff-account-menu-lock-v1.md). */
export const WORKSPACE_STAFF_LABEL = "Staff";
