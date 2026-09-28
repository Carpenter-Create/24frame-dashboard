# Migration ledger rematch — 2026-09-28

Prod and `main` disagree on migration **version strings**. Most of that disagreement is the same SQL recorded twice, once under the repo filename and once under the timestamp Supabase MCP assigned when it applied the file. The drift check compares those 14-digit prefixes and nothing else.

This note is the map, the repair Adam runs, and the residue that must stay red until it is actually applied. It does not weaken `.github/workflows/migration-drift.yml`.

Evidence is the failed run [36489466487](https://github.com/Carpenter-Create/24frame-dashboard/actions/runs/36489466487) on `0418b144`, plus a read of `supabase_migrations.schema_migrations` (`version`, `name`, `statements`) on 24Frame project `uevsculwzwlhxeamagwg`.

## Why the check said 45 behind and 47 ahead

From `20260912032826` onward, applies went through MCP `apply_migration`. That writes `version` as the UTC time of the apply and `name` as the snake_case migration name. The committed files kept hand-named prefixes (`20260912120000_groups_posts.sql` and the like). Earlier files on `main` still match the ledger, because those were applied with the filename as the version.

Count on that run: **102 ledger rows, 100 files.**

| Bucket | Count | What it is |
| --- | ---: | --- |
| Same migration, two version strings | 38 | `name` equals the filename stem. Comment-stripped SQL matches the file. |
| Second apply of a file already in those 38 | 2 | `like_target_story_item` applied twice; `story_item_likes` applied twice (trailing newline only). |
| Split applies, not a filename alias | 6 | `account_invites_ddl`, `_invite_core`, `_entity_scope_invite`, `_accept`, `_revoke_lists`, `_peek`. |
| Applied SQL with no file | 1 | `notifications_realtime_publication` (`20260920174401`). |
| Repo file with no ledger row | 7 | Listed below. Not stamped applied. |

38 + 7 = **45 behind**. 38 + 2 + 6 + 1 = **47 ahead**.

`docs/auth-cutover-pack-a.md` already recorded the first five of these as "MCP apply assigns its own version."

## Repair Adam runs

File: [`scripts/db/rematch-migration-ledger-20260928.sql`](../../scripts/db/rematch-migration-ledger-20260928.sql).

1. Open the **24Frame** project (`uevsculwzwlhxeamagwg`), SQL editor, role **postgres**. `drift_reader` is select-only and the script refuses that role.
2. Paste the file and run it once. It is one transaction. A guard failure rolls it back.
3. It updates 38 `version` values to the filename prefix. It does not rewrite `statements`. It deletes the two alias rows above, and only after checking they are aliases.
4. It does **not** insert rows for the seven files below, and it does **not** delete the six `account_invites_*` rows.
5. A second run is a no-op.

Rollback, if the 38 updates need to be undone and nothing newer has been applied under the new versions: run the same pairs in reverse (`to_version` back to `from_version`) with the same name guard. Do not re-insert the two deleted duplicates; the kept row still holds that statement. There is no foreign key on `schema_migrations`.

The publication file [`20260920174401_notifications_realtime_publication.sql`](../../supabase/migrations/20260920174401_notifications_realtime_publication.sql) is the applied `do` block, under the version already in the ledger. Merging it clears that one ahead row. `db push` skips it because the version is already recorded.

## What stays red, on purpose

After the SQL and after that file is on `main`, the check should report **7 behind, 6 ahead**. That is the honest remainder. Do not stamp these applied to make the check green.

### Behind — no ledger row

| File | Why it is not a rematch |
| --- | --- |
| `20260919130000_account_invites.sql` | The live functions came from the six split rows, then a later entity-scope replace. This file's `accept_account_invite` does **not** write `entity_scope`. Running it would replace the live function with the older body. |
| `20260919140000_security_events.sql` | `public.security_events` is absent. |
| `20260919150000_org_custom_roles.sql` | `public.org_custom_roles` is absent. `account_invites.custom_role_id` is absent. |
| `20260919160000_legal_entities.sql` | Partial. `legal_entities`, `ensure_default_legal_entity`, `create_legal_entity`, `org_legal_entities`, and `titles.legal_entity_id` exist. `member_can_entity` and `scoped_title_ids` do not. The create SQL is not in any ledger `statements` value. The file is a superset of what is live. |
| `20260921010000_social_comments.sql` | `public.comments` is absent. |
| `20260921140000_likes_select_visible_post.sql` | Policy `likes_select_visible_post` is absent. |
| `20260924210000_story_views_author_select.sql` | Policy `story_views_select_author` is absent. `story_views` itself exists. |

### Ahead — leave these rows

| Version | Name |
| --- | --- |
| `20260920001249` | `account_invites_ddl` |
| `20260920001311` | `account_invites_invite_core` |
| `20260920001335` | `account_invites_entity_scope_invite` |
| `20260920001405` | `account_invites_accept` |
| `20260920001415` | `account_invites_revoke_lists` |
| `20260920040244` | `account_invites_peek` |

`account_invites_entity_scope_invite` and `account_invites_accept` are the entity-scope bodies. Those bodies also appear, not byte-for-byte, inside `20260919160000_legal_entities.sql`. Deleting the ledger rows would drop the only exact record of what ran, and a later apply of the legal-entities file is a real schema change (`member_can_entity`, `scoped_title_ids`, and an `accept_account_invite` that declares `v_mid`).

## Do not batch-`db push` the residue

`scripts/db/prod-migrate.sh` applies every pending filename in order. After this rematch, a linked push would still see the seven files above. `20260919130000_account_invites.sql` would `create or replace` the live invite functions with the pre-entity-scope bodies. `20260919160000_legal_entities.sql` would then drop and recreate several of those functions and add objects that are not live today. That is a founder apply of real schema, reviewed on its own, not a ledger repair.

The five files whose objects are simply absent (`security_events`, `org_custom_roles`, `social_comments`, `likes_select_visible_post`, `story_views_author_select`) are ordinary pending migrations. They still should not ride along in a push that also replays `account_invites.sql`.

## How to verify

1. Run the SQL as postgres on 24Frame prod.
2. On `main`, after this branch is merged, Actions → migration-drift → **Run workflow** (`workflow_dispatch`).
3. Expect the job to **fail**, with:
   - behind: `20260919130000`, `20260919140000`, `20260919150000`, `20260919160000`, `20260921010000`, `20260921140000`, `20260924210000`
   - ahead: `20260920001249`, `20260920001311`, `20260920001335`, `20260920001405`, `20260920001415`, `20260920040244`
   - no other versions
4. Green means those thirteen are gone because the underlying schema question was resolved, not because the check was skipped. This repair does not make that run green.

The 38 rematches were checked on 2026-09-28 by comparing each ledger `name` to the filename stem and each statement to the file after removing `--` comments and whitespace. Indented comments inside `gc_title_status_override`, `update_legal_entity`, and `dm_membership_sealed` are the only difference in those three; the executable SQL matches.
