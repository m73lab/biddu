// Generates prisma/schema.cloud.prisma (PostgreSQL) from prisma/schema.prisma.
// Run after every schema.prisma change:
//   node scripts/sync-cloud-schema.mjs
// The cloud Docker build generates its client from the cloud schema, while
// local dev and self-hosted builds keep using schema.prisma (SQLite).
// Cloud deploys apply it with: prisma db push --schema=prisma/schema.cloud.prisma
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = join(root, "prisma", "schema.prisma");
const outPath = join(root, "prisma", "schema.cloud.prisma");

const src = readFileSync(srcPath, "utf8");
const needle = 'provider = "sqlite"';
if (!src.includes(needle)) {
  throw new Error("sqlite provider line not found in schema.prisma");
}

const header = `// AUTO-GENERATED from schema.prisma — DO NOT EDIT BY HAND.\n// Run: node scripts/sync-cloud-schema.mjs\n`;
writeFileSync(outPath, header + src.replace(needle, 'provider = "postgresql"'));
console.log("wrote prisma/schema.cloud.prisma");
