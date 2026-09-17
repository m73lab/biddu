#!/usr/bin/env node
// Inventario i18n: cruza namespaces usados en codigo vs claves en messages/*.
// Uso: node scripts/i18n-audit.mjs  (exit 1 si hay faltantes)
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const MSG = join(ROOT, "messages");

const locales = readdirSync(MSG, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// 1. Claves reales por locale (merge como request.ts/getMessages.ts)
function leafPaths(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v))
      out.push(...leafPaths(v, p));
    else out.push(p);
  }
  return out;
}
const real = {};
for (const loc of locales) {
  const merged = {};
  for (const f of readdirSync(join(MSG, loc)).filter((f) =>
    f.endsWith(".json"),
  )) {
    Object.assign(merged, JSON.parse(readFileSync(join(MSG, loc, f), "utf8")));
  }
  real[loc] = new Set(leafPaths(merged));
}

// 2. Usos en codigo: useTranslations("NS") -> var, luego var("literal")
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name))
      out.push(p);
  }
  return out;
}
const used = new Map(); // fullPath -> Set(files)
const dynamic = new Map(); // file -> count
const useRe =
  /(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\(\s*["']([^"']+)["']\s*\)/g;
const callRe = /(\w+)\(\s*["']([^"'`]+)["']\s*[,)]/g;

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const nsByVar = new Map();
  let m;
  useRe.lastIndex = 0;
  while ((m = useRe.exec(src))) nsByVar.set(m[1], m[2]);
  if (nsByVar.size === 0) continue;
  callRe.lastIndex = 0;
  while ((m = callRe.exec(src))) {
    const ns = nsByVar.get(m[1]);
    if (!ns) continue;
    const full = `${ns}.${m[2]}`;
    if (!used.has(full)) used.set(full, new Set());
    used.get(full).add(file);
  }
  // llamadas dinamicas con esos mismos hooks
  const dynRe = new RegExp(
    `\\b(${[...nsByVar.keys()].join("|")})\\(\\s*[^\`"'\\s]`,
    "g",
  );
  const dyn = src.match(dynRe);
  if (dyn) dynamic.set(file, dyn.length);
}

// 3. Reporte
let failures = 0;
for (const loc of locales) {
  const missing = [...used.keys()].filter((k) => !real[loc].has(k));
  if (missing.length) {
    console.log(`\n== ${loc}: ${missing.length} claves faltantes ==`);
    for (const k of missing.sort()) {
      const files = [...used.get(k)].map(
        (f) => f.replace(/\\/g, "/").split("/src/")[1],
      );
      console.log(`  ${k}\n    <- ${files.join(", ")}`);
      failures += 1;
    }
  } else {
    console.log(`\n== ${loc}: sin faltantes ==`);
  }
}
if (dynamic.size) {
  console.log(
    `\n-- ${dynamic.size} archivos con llamadas dinamicas (no verificables):`,
  );
  for (const [f, n] of [...dynamic.entries()].slice(0, 20))
    console.log(`  ${f.replace(/\\/g, "/").split("/src/")[1]} (${n})`);
}
console.log(`\nTOTAL faltantes: ${failures}`);
process.exit(failures ? 1 : 0);
