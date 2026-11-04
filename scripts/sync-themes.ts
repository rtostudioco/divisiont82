/**
 * DivisionT82 — Sync theme packs into the UI public folder.
 *
 * The root themes/ directory is the single source of truth. This script copies
 * the packs (and the schema) into ui/public/themes/ so the webview can fetch
 * them at runtime without duplicating files.
 */
import { mkdirSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const THEMES_DIR = join(ROOT, "themes");
const OUT_DIR = join(ROOT, "ui", "public", "themes");

mkdirSync(OUT_DIR, { recursive: true });

const packs = readdirSync(THEMES_DIR).filter((f) => f.endsWith(".d82theme.json"));
for (const pack of packs) {
  copyFileSync(join(THEMES_DIR, pack), join(OUT_DIR, pack));
}
copyFileSync(join(THEMES_DIR, "schema", "theme.schema.json"), join(OUT_DIR, "theme.schema.json"));

// Index consumed by the UI in browser (mock) mode.
writeFileSync(join(OUT_DIR, "index.json"), `${JSON.stringify({ packs }, null, 2)}\n`);

console.log(`synced ${packs.length} theme packs + schema + index → ui/public/themes/`);
