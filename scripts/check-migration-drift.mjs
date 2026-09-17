#!/usr/bin/env node
/**
 * check-migration-drift.mjs — fail if schema.prisma drifted from migrations.
 *
 * Compares two SQLite files (order-insensitive):
 *   1. built by `prisma migrate deploy`  (what fresh self-hosted deploys get)
 *   2. built by `prisma db push`          (the exact current schema)
 * and reports missing/extra tables, columns (name+type+nullability+default)
 * and indexes. Column ORDER is deliberately ignored: SQLite rebuilds from
 * field reordering are cosmetically different but functionally identical,
 * while a missing column bricks the app at runtime (P2022).
 *
 * Uses only node:sqlite (no dependencies).
 *
 * Usage:
 *   node scripts/check-migration-drift.mjs <migrated.db> <pushed.db>
 */
import { DatabaseSync } from "node:sqlite";

const [, , migratedPath, pushedPath] = process.argv;
if (!migratedPath || !pushedPath) {
  console.error("Usage: node scripts/check-migration-drift.mjs <migrated.db> <pushed.db>");
  process.exit(2);
}

const migrated = new DatabaseSync(migratedPath, { readOnly: true });
const pushed = new DatabaseSync(pushedPath, { readOnly: true });

const SKIP_TABLE = /^(sqlite_|_prisma_migrations$)/;
const tablesOf = (db) =>
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name",
    )
    .all()
    .map((r) => r.name);

const columnsOf = (db, table) =>
  db.prepare(`PRAGMA table_info("${table}")`).all();

const indexesOf = (db, table) =>
  db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name = ? AND sql IS NOT NULL ORDER BY name",
    )
    .all(table)
    .map((r) => r.name);

const colKey = (c) =>
  `${c.name}|${String(c.type).toUpperCase()}|${c.notnull}|${c.dflt_value ?? "NULL"}|${c.pk}`;

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`DRIFT: ${msg}`);
};

const migratedTables = tablesOf(migrated);
const pushedTables = tablesOf(pushed);

for (const t of pushedTables.filter((t) => !migratedTables.includes(t))) {
  fail(`table "${t}" exists in schema but no migration creates it`);
}
for (const t of migratedTables.filter((t) => !pushedTables.includes(t))) {
  fail(`table "${t}" created by migrations but absent from schema`);
}

for (const t of pushedTables.filter((t) => migratedTables.includes(t))) {
  if (SKIP_TABLE.test(t)) continue;
  const mCols = new Map(columnsOf(migrated, t).map((c) => [c.name, colKey(c)]));
  const pCols = new Map(columnsOf(pushed, t).map((c) => [c.name, colKey(c)]));
  for (const [name, key] of pCols) {
    if (!mCols.has(name)) fail(`table "${t}" missing column "${name}" (${key})`);
    else if (mCols.get(name) !== key)
      fail(`table "${t}" column "${name}" differs: migrate=[${mCols.get(name)}] schema=[${key}]`);
  }
  for (const name of mCols.keys()) {
    if (!pCols.has(name)) fail(`table "${t}" has extra column "${name}" not in schema`);
  }
  const mIdx = indexesOf(migrated, t);
  const pIdx = indexesOf(pushed, t);
  for (const i of pIdx.filter((i) => !mIdx.includes(i)))
    fail(`table "${t}" missing index "${i}"`);
  for (const i of mIdx.filter((i) => !pIdx.includes(i)))
    fail(`table "${t}" has extra index "${i}" not in schema`);
}

migrated.close();
pushed.close();

if (failures > 0) {
  console.log(`\n${failures} drift problem(s) found.`);
  process.exit(1);
}
console.log("No migration drift: migrate deploy matches schema.");
