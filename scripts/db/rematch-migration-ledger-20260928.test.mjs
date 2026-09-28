import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const sqlPath = "scripts/db/rematch-migration-ledger-20260928.sql";
const sql = readFileSync(sqlPath, "utf8");

const pairRe =
  /\('(\d{14})', '(\d{14})', '([a-z0-9_]+)', '([0-9a-f]{32})'\)/g;
const pairs = [...sql.matchAll(pairRe)].map((m) => ({
  fromVersion: m[1],
  toVersion: m[2],
  name: m[3],
  md5: m[4],
}));

const files = readdirSync("supabase/migrations").filter((name) =>
  name.endsWith(".sql"),
);

function fileForPrefix(prefix) {
  return files.filter((name) => name.startsWith(`${prefix}_`));
}

// These files have no ledger row that is safe to rename onto them.
const notRematched = [
  "20260919130000",
  "20260919140000",
  "20260919150000",
  "20260919160000",
  "20260921010000",
  "20260921140000",
  "20260924210000",
];

// Split applies. The repair must leave the rows in place.
const accountSlices = [
  "20260920001249",
  "20260920001311",
  "20260920001335",
  "20260920001405",
  "20260920001415",
  "20260920040244",
];

test("rematch map is 38 unique filename aliases", () => {
  assert.equal(pairs.length, 38);
  assert.equal(new Set(pairs.map((p) => p.fromVersion)).size, 38);
  assert.equal(new Set(pairs.map((p) => p.toVersion)).size, 38);
  assert.equal(new Set(pairs.map((p) => p.name)).size, 38);
});

test("each target is one repo file whose stem is the ledger name", () => {
  for (const pair of pairs) {
    const matches = fileForPrefix(pair.toVersion);
    assert.equal(
      matches.length,
      1,
      `${pair.toVersion} expected one file, got ${matches.join(", ")}`,
    );
    assert.equal(matches[0], `${pair.toVersion}_${pair.name}.sql`);
    assert.equal(fileForPrefix(pair.fromVersion).length, 0);
  }
});

test("the map does not claim the seven unresolved files or the six splits", () => {
  const targets = new Set(pairs.map((p) => p.toVersion));
  const sources = new Set(pairs.map((p) => p.fromVersion));
  for (const version of notRematched) {
    assert.equal(targets.has(version), false, version);
    assert.equal(sources.has(version), false, version);
    assert.equal(fileForPrefix(version).length, 1);
  }
  for (const version of accountSlices) {
    assert.equal(targets.has(version), false, version);
    assert.equal(sources.has(version), false, version);
    assert.equal(fileForPrefix(version).length, 0);
  }
});

test("the only deletes are the two proven alias versions", () => {
  const deletes = [
    ...sql.matchAll(
      /delete from supabase_migrations\.schema_migrations where version = '(\d{14})'/g,
    ),
  ].map((m) => m[1]);
  assert.deepEqual(deletes.sort(), ["20260924124157", "20260924124241"]);
});

test("notifications publication file uses the applied ledger version", () => {
  const name = "20260920174401_notifications_realtime_publication.sql";
  assert.equal(files.includes(name), true);
  const body = readFileSync(`supabase/migrations/${name}`, "utf8");
  assert.match(body, /alter publication supabase_realtime add table public\.notifications;/);
  assert.match(body, /to_regclass\('public\.notifications'\)/);
  assert.equal(
    pairs.some((p) => p.fromVersion === "20260920174401" || p.toVersion === "20260920174401"),
    false,
  );
});
