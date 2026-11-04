/**
 * DivisionT82 — Theme pack validator.
 *
 * Validates every themes/*.d82theme.json against themes/schema/theme.schema.json.
 * Zero-dependency, focused implementation of the schema rules we actually use
 * (so it runs anywhere bun runs, no ajv needed).
 *
 * Exit codes: 0 = all packs valid, 1 = validation failure.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = join(import.meta.dir, "..");
const THEMES_DIR = join(ROOT, "themes");

interface ValidationResult {
  file: string;
  ok: boolean;
  errors: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const PALETTE_KEYS = [
  "bg", "bgElevated", "bgPanel", "stroke", "strokeHolo",
  "text", "textDim", "accent", "accent2", "accent3",
  "danger", "warn", "ok",
] as const;

function fail(errors: string[], path: string, msg: string): void {
  errors.push(`${path}: ${msg}`);
}

function checkNumber(
  errors: string[],
  obj: Record<string, unknown>,
  key: string,
  path: string,
  min: number,
  max: number,
): void {
  const v = obj[key];
  if (typeof v !== "number" || Number.isNaN(v)) {
    fail(errors, path, `${key} must be a number`);
  } else if (v < min || v > max) {
    fail(errors, path, `${key}=${v} out of range [${min}, ${max}]`);
  }
}

function checkBool(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "boolean";
}

function checkHexPalette(errors: string[], palette: Record<string, unknown>): void {
  for (const key of PALETTE_KEYS) {
    const v = palette[key];
    if (typeof v !== "string" || !HEX.test(v)) {
      fail(errors, "palette", `${key} must be a 6-digit hex color, got ${JSON.stringify(v)}`);
    }
  }
}

function validatePack(file: string, raw: string): ValidationResult {
  const errors: string[] = [];
  let pack: Record<string, unknown>;
  try {
    pack = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    return { file, ok: false, errors: [`invalid JSON: ${(e as Error).message}`] };
  }

  // Required top-level strings
  const id = pack.id;
  if (typeof id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 32) {
    fail(errors, "", "id must be kebab-case (max 32 chars)");
  }
  if (typeof pack.name !== "string" || pack.name.length < 3 || pack.name.length > 64) {
    fail(errors, "", "name must be a string of 3..64 chars");
  }
  if (typeof pack.version !== "string" || !/^\d+\.\d+\.\d+$/.test(pack.version)) {
    fail(errors, "", "version must be semver (x.y.z)");
  }
  if (typeof pack.author !== "string" || pack.author.length < 2) {
    fail(errors, "", "author must be a string of at least 2 chars");
  }
  if (typeof pack.description !== "string" || pack.description.length < 8 || pack.description.length > 280) {
    fail(errors, "", "description must be a string of 8..280 chars");
  }
  if (!Array.isArray(pack.tags) || pack.tags.length === 0 || pack.tags.length > 8) {
    fail(errors, "", "tags must be a non-empty array (max 8)");
  }

  // File name must match pack id
  const expected = `${id}.d82theme.json`;
  if (typeof id === "string" && basename(file) !== expected) {
    fail(errors, "", `file name must be ${expected}`);
  }

  // appearance
  const appearance = pack.appearance as Record<string, unknown> | undefined;
  if (!appearance || typeof appearance !== "object") {
    fail(errors, "", "appearance object required");
  } else {
    if (appearance.mode !== "dark" && appearance.mode !== "light") {
      fail(errors, "appearance", "mode must be 'dark' or 'light'");
    }
    const wp = appearance.wallpaper as Record<string, unknown> | undefined;
    if (!wp || typeof wp !== "object") {
      fail(errors, "appearance", "wallpaper object required");
    } else {
      if (!["system", "gradient", "asset"].includes(wp.mode as string)) {
        fail(errors, "appearance.wallpaper", "mode must be system|gradient|asset");
      }
      if (wp.mode === "asset" && (typeof wp.asset !== "string" || (wp.asset as string).length === 0)) {
        fail(errors, "appearance.wallpaper", "asset must be a non-empty string when mode=asset");
      }
    }
  }

  // palette
  const palette = pack.palette as Record<string, unknown> | undefined;
  if (!palette || typeof palette !== "object") {
    fail(errors, "", "palette object required");
  } else {
    checkHexPalette(errors, palette);
  }

  // glass
  const glass = pack.glass as Record<string, unknown> | undefined;
  if (!glass || typeof glass !== "object") {
    fail(errors, "", "glass object required");
  } else {
    checkNumber(errors, glass, "opacity", "glass", 0.05, 1);
    checkNumber(errors, glass, "blurRadius", "glass", 0, 64);
    checkNumber(errors, glass, "saturation", "glass", 0, 2);
    checkNumber(errors, glass, "borderRadius", "glass", 0, 32);
    if (!checkBool(glass, "noise")) fail(errors, "glass", "noise must be boolean");
    if (!checkBool(glass, "scanlines")) fail(errors, "glass", "scanlines must be boolean");
  }

  // typography
  const typo = pack.typography as Record<string, unknown> | undefined;
  if (!typo || typeof typo !== "object") {
    fail(errors, "", "typography object required");
  } else {
    for (const key of ["display", "body", "mono"] as const) {
      const v = typo[key];
      if (typeof v !== "string" || v.length < 2 || v.length > 96) {
        fail(errors, "typography", `${key} must be a font stack string of 2..96 chars`);
      }
    }
    checkNumber(errors, typo, "scale", "typography", 0.5, 2);
  }

  // motion
  const motion = pack.motion as Record<string, unknown> | undefined;
  if (!motion || typeof motion !== "object") {
    fail(errors, "", "motion object required");
  } else {
    if (!checkBool(motion, "enabled")) fail(errors, "motion", "enabled must be boolean");
    checkNumber(errors, motion, "intensity", "motion", 0, 1);
    checkNumber(errors, motion, "panelGlow", "motion", 0, 1);
  }

  // holo
  const holo = pack.holo as Record<string, unknown> | undefined;
  if (!holo || typeof holo !== "object") {
    fail(errors, "", "holo object required");
  } else {
    if (!checkBool(holo, "grid")) fail(errors, "holo", "grid must be boolean");
    checkNumber(errors, holo, "gridOpacity", "holo", 0, 1);
    if (!["none", "dust", "matrix", "orbit"].includes(holo.particles as string)) {
      fail(errors, "holo", "particles must be none|dust|matrix|orbit");
    }
    if (!checkBool(holo, "waveform")) fail(errors, "holo", "waveform must be boolean");
    if (!checkBool(holo, "vignette")) fail(errors, "holo", "vignette must be boolean");
  }

  // sounds
  const sounds = pack.sounds as Record<string, unknown> | undefined;
  if (!sounds || typeof sounds !== "object") {
    fail(errors, "", "sounds object required");
  } else {
    if (!checkBool(sounds, "enabled")) fail(errors, "sounds", "enabled must be boolean");
    const p = sounds.pack;
    if (p !== null && typeof p !== "string") fail(errors, "sounds", "pack must be string or null");
  }

  // Unknown top-level keys → error (strict schema)
  const allowed = new Set([
    "id", "name", "version", "author", "description", "tags",
    "appearance", "palette", "glass", "typography", "motion", "holo", "sounds",
  ]);
  for (const key of Object.keys(pack)) {
    if (!allowed.has(key)) fail(errors, "", `unknown top-level key '${key}'`);
  }

  return { file, ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
const files = readdirSync(THEMES_DIR)
  .filter((f) => f.endsWith(".d82theme.json"))
  .sort();

if (files.length === 0) {
  console.error("✗ no .d82theme.json packs found in themes/");
  process.exit(1);
}

let allOk = true;
for (const f of files) {
  const raw = readFileSync(join(THEMES_DIR, f), "utf8");
  const result = validatePack(f, raw);
  if (result.ok) {
    console.log(`✓ ${f}`);
  } else {
    allOk = false;
    console.error(`✗ ${f}`);
    for (const err of result.errors) console.error(`    ${err}`);
  }
}

if (!allOk) {
  console.error("\nTheme validation FAILED");
  process.exit(1);
}
console.log(`\nAll ${files.length} theme packs are valid.`);
