/**
 * One-shot migration: copy all rows from the SQLite file to PostgreSQL.
 *
 * Usage:
 *   SQLITE_PATH=/path/to/biddu.db DATABASE_URL=postgresql://... npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 * - Reads column types from prisma/schema.prisma (Boolean/DateTime need conversion).
 * - Disables FK checks during load (single connection, restored afterwards).
 * - Verifies row counts per table at the end.
 */
import Database from "better-sqlite3";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const SQLITE_PATH = process.env.SQLITE_PATH;
const DATABASE_URL = process.env.DATABASE_URL;
if (!SQLITE_PATH) throw new Error("SQLITE_PATH env required");
if (!DATABASE_URL) throw new Error("DATABASE_URL env required (postgresql://...)");

interface Col {
  field: string;
  column: string;
  scalar: string;
}
interface Model {
  model: string;
  table: string;
  cols: Col[];
}

// Prisma scalar types (all start uppercase, like relation types)
const SCALARS = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "DateTime",
  "Json",
  "Bytes",
  "Decimal",
]);

function parseSchema(): { models: Model[]; enums: Set<string> } {
  const src = readFileSync("prisma/schema.prisma", "utf8");
  const enums = new Set<string>();
  for (const m of src.matchAll(/^enum (\w+)/gm)) enums.add(m[1]);

  const models: Model[] = [];
  for (const m of src.matchAll(/^model (\w+) \{([\s\S]*?)\n\}/gm)) {
    const [, name, body] = m;
    let table = name;
    const cols: Col[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) {
        const mm = line.match(/^@@map\("([^"]+)"\)/);
        if (mm) table = mm[1];
        continue;
      }
      const fm = line.match(/^(\w+)\s+([\w\[\]]+\??)\s*(.*)$/);
      if (!fm) continue;
      const [, field, typeRaw, rest] = fm;
      const optional = typeRaw.endsWith("?");
      const type = optional ? typeRaw.slice(0, -1) : typeRaw;
      // Skip relation object fields (Capitalized custom type or lists).
      // Scalars and enums also start uppercase, so exclude those explicitly.
      if (type.endsWith("[]")) continue;
      if (/^[A-Z]/.test(type) && !SCALARS.has(type) && !enums.has(type))
        continue;
      const cm = rest.match(/@map\("([^"]+)"\)/);
      cols.push({ field, column: cm ? cm[1] : field, scalar: type });
    }
    models.push({ model: name, table, cols });
  }
  return { models, enums };
}

function convert(scalar: string, enums: Set<string>, v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (enums.has(scalar)) return String(v);
  switch (scalar) {
    case "Boolean":
      return Number(v) === 1;
    case "DateTime":
      return v instanceof Date ? v : new Date(String(v));
    case "BigInt":
      return typeof v === "number" && Number.isInteger(v) ? BigInt(v) : v;
    case "Json":
      return typeof v === "string" ? JSON.parse(v) : v;
    case "Bytes":
      return Buffer.isBuffer(v) ? v : Buffer.from(String(v));
    default:
      return v;
  }
}

async function main() {
  const { models, enums } = parseSchema();
  const lite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  const pg = await pool.connect();
  try {
    await pg.query("SET session_replication_role TO 'replica'");
    let total = 0;
    const mismatches: string[] = [];
    for (const m of models) {
      const exists = lite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        )
        .get(m.table) as { name: string } | undefined;
      if (!exists) {
        console.log(`skip ${m.table} (not in sqlite)`);
        continue;
      }
      const rows = lite.prepare(`SELECT * FROM "${m.table}"`).all() as Record<
        string,
        unknown
      >[];
      const pgCount = Number(
        (await pg.query(`SELECT COUNT(*)::int AS c FROM "${m.table}"`)).rows[0]
          .c,
      );
      if (pgCount > 0) {
        console.log(`skip ${m.table} (pg not empty: ${pgCount})`);
        continue;
      }
      const colNames = m.cols.map((c) => `"${c.column}"`).join(", ");
      const CHUNK = 500;
      if (m.cols.length === 0 && rows.length > 0) {
        console.error(`NO COLUMNS parsed for ${m.table}, skipping`);
        mismatches.push(`${m.table}: parser yielded 0 columns`);
        continue;
      }
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const values: unknown[] = [];
        const placeholders = chunk.map((r, ri) => {
          const ph = m.cols.map((c, ci) => {
            values.push(convert(c.scalar, enums, r[c.column]));
            return `$${ri * m.cols.length + ci + 1}`;
          });
          return `(${ph.join(", ")})`;
        });
        if (m.cols.length > 0 && chunk.length > 0) {
          await pg.query(
            `INSERT INTO "${m.table}" (${colNames}) VALUES ${placeholders.join(", ")}`,
            values,
          );
        }
      }
      const after = Number(
        (await pg.query(`SELECT COUNT(*)::int AS c FROM "${m.table}"`)).rows[0]
          .c,
      );
      total += after;
      if (after !== rows.length) mismatches.push(`${m.table}: sqlite=${rows.length} pg=${after}`);
      console.log(`${m.table}: ${rows.length} -> ${after}`);
    }
    await pg.query("SET session_replication_role TO DEFAULT");
    console.log(`TOTAL rows: ${total}`);
    if (mismatches.length > 0) {
      console.error("MISMATCHES:", mismatches);
      process.exitCode = 1;
    } else {
      console.log("ALL COUNTS MATCH");
    }
  } finally {
    pg.release();
    await pool.end();
    lite.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
