import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Same digest the repair pins: drop full-line `--` comments (including
// indented ones) and all whitespace, then md5. The SQL guard strips the
// applied statement the same way (`^\s*--`). A change to executable SQL
// changes this digest.
function statementMd5(sqlText) {
  const stripped = sqlText
    .replaceAll("\r\n", "\n")
    .replace(/^\s*--.*$/gm, "")
    .replace(/\s+/g, "");
  return createHash("md5").update(stripped).digest("hex");
}

const sqlPath = "scripts/db/rematch-migration-ledger-20260928.sql";
const sql = readFileSync(sqlPath, "utf8");

const pairRe =
  /\('(\d{14})', '(\d{14})', '([a-z0-9_]+)', 'md5:([0-9a-f]{32})'\)/g;
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

test("map digests are stored as md5: plus the file hex", () => {
  assert.equal(pairs.length, 38);
  assert.match(sql, /r\.expected_md5 !~ '\^md5:\[0-9a-f\]\{32\}\$'/);
  assert.match(sql, /regexp_replace\(r\.expected_md5, '\^md5:', ''\)/);
  assert.doesNotMatch(sql, /'[0-9a-f]{32}'/);
});

test("each expected_md5 is the comment-stripped file body", () => {
  for (const pair of pairs) {
    const body = readFileSync(
      `supabase/migrations/${pair.toVersion}_${pair.name}.sql`,
      "utf8",
    );
    assert.equal(
      statementMd5(body),
      pair.md5,
      `${pair.name} file digest does not match the map`,
    );
  }
});

test("same-session re-paste drops the temp table before creating it", () => {
  const dropAt = sql.toLowerCase().indexOf("drop table if exists rematch;");
  const createAt = sql.toLowerCase().indexOf("create temp table rematch");
  assert.ok(dropAt !== -1, "missing DROP TABLE IF EXISTS rematch");
  assert.ok(createAt !== -1, "missing CREATE TEMP TABLE rematch");
  assert.ok(dropAt < createAt);
});

test("the only deletes are the two proven alias versions", () => {
  const deletes = [
    ...sql.matchAll(
      /delete from supabase_migrations\.schema_migrations where version = '(\d{14})'/g,
    ),
  ].map((m) => m[1]);
  assert.deepEqual(deletes.sort(), ["20260924124157", "20260924124241"]);
});

test("cross-day rematches are name and body matches in the note", () => {
  const doc = readFileSync("docs/scheduled/migration-ledger-rematch.md", "utf8");
  const cross = pairs.filter(
    (pair) => pair.fromVersion.slice(0, 8) !== pair.toVersion.slice(0, 8),
  );
  assert.deepEqual(
    cross.map((pair) => pair.name).sort(),
    ["title_delete_s3_purge", "user_notification_preferences"],
  );
  assert.match(doc, /name and body match/);
  assert.match(doc, /not applied on the filename's day/);
  for (const pair of cross) {
    assert.ok(doc.includes(pair.fromVersion), pair.fromVersion);
    assert.ok(doc.includes(pair.toVersion), pair.toVersion);
    assert.ok(doc.includes(pair.name), pair.name);
  }
});

test("keeper, extra, and name lookups are single-row", () => {
  const selects = [
    ...sql.matchAll(
      /select[\s\S]*?into (?:extra|keeper|got_name(?:, got_md5)?)[\s\S]*?;/gi,
    ),
  ];
  assert.equal(selects.length, 5);
  for (const match of selects) {
    assert.match(match[0], /\blimit\s+1\s*;\s*$/i, match[0].slice(-80));
  }
  const keeper = selects.find((match) => /into keeper/i.test(match[0]));
  assert.ok(keeper);
  assert.match(keeper[0], /order by version/i);
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
