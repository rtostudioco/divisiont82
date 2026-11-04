//! Level 1 — Theme Engine.
//!
//! A **theme pack** (`*.d82theme.json`) is a self-contained, declarative
//! document that drives every visual aspect of the shell: palette, glass
//! (transparency/blur), typography, motion and the holographic layer.
//!
//! The format mirrors `themes/schema/theme.schema.json` exactly. Serde's
//! `deny_unknown_fields` keeps packs strict, matching the JSON Schema used by
//! the TypeScript validator (`scripts/validate-themes.ts`).

use serde::{Deserialize, Serialize};
use std::fmt;
use std::path::Path;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Debug, thiserror::Error)]
pub enum ThemeError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("invalid theme pack: {0}")]
    Invalid(String),
}

// ---------------------------------------------------------------------------
// Domain types (mirror of themes/schema/theme.schema.json)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ThemePack {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub tags: Vec<String>,
    pub appearance: Appearance,
    pub palette: Palette,
    pub glass: Glass,
    pub typography: Typography,
    pub motion: Motion,
    pub holo: Holo,
    pub sounds: Sounds,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Appearance {
    pub mode: AppearanceMode,
    pub wallpaper: Wallpaper,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AppearanceMode {
    Dark,
    Light,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Wallpaper {
    pub mode: WallpaperMode,
    pub asset: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WallpaperMode {
    System,
    Gradient,
    Asset,
}

/// The 13-color palette of a pack. All values are `#rrggbb` strings.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Palette {
    pub bg: String,
    pub bg_elevated: String,
    pub bg_panel: String,
    pub stroke: String,
    pub stroke_holo: String,
    pub text: String,
    pub text_dim: String,
    pub accent: String,
    pub accent2: String,
    pub accent3: String,
    pub danger: String,
    pub warn: String,
    pub ok: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Glass {
    pub opacity: f64,
    pub blur_radius: f64,
    pub saturation: f64,
    pub border_radius: f64,
    pub noise: bool,
    pub scanlines: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Typography {
    pub display: String,
    pub body: String,
    pub mono: String,
    pub scale: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Motion {
    pub enabled: bool,
    pub intensity: f64,
    pub panel_glow: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Holo {
    pub grid: bool,
    pub grid_opacity: f64,
    pub particles: Particles,
    pub waveform: bool,
    pub vignette: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Particles {
    None,
    Dust,
    Matrix,
    Orbit,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Sounds {
    pub enabled: bool,
    pub pack: Option<String>,
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

fn is_kebab(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 32
        && s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !s.starts_with('-')
        && !s.ends_with('-')
        && !s.contains("--")
}

fn is_semver(s: &str) -> bool {
    let parts: Vec<&str> = s.split('.').collect();
    parts.len() == 3
        && parts
            .iter()
            .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()))
}

/// Parses `#rrggbb` into `(r, g, b)`.
pub fn parse_hex(color: &str) -> Result<[u8; 3], ThemeError> {
    let bytes = color.as_bytes();
    if bytes.len() != 7 || bytes[0] != b'#' {
        return Err(ThemeError::Invalid(format!("not a #rrggbb color: {color:?}")));
    }
    let hex2 = |h: &str| -> Result<u8, ThemeError> {
        u8::from_str_radix(h, 16)
            .map_err(|_| ThemeError::Invalid(format!("bad hex byte in {color:?}")))
    };
    Ok([
        hex2(&color[1..3])?,
        hex2(&color[3..5])?,
        hex2(&color[5..7])?,
    ])
}

fn check_range(value: f64, min: f64, max: f64, what: &str) -> Result<(), ThemeError> {
    if !value.is_finite() || value < min || value > max {
        Err(ThemeError::Invalid(format!("{what} = {value} out of range [{min}, {max}]")))
    } else {
        Ok(())
    }
}

fn check_hex(color: &str, what: &str) -> Result<(), ThemeError> {
    parse_hex(color).map_err(|e| ThemeError::Invalid(format!("{what}: {e}"))).map(|_| ())
}

impl ThemePack {
    /// Validates every rule that serde alone cannot express.
    pub fn validate(&self) -> Result<(), ThemeError> {
        if !is_kebab(&self.id) {
            return Err(ThemeError::Invalid(format!("id {:?} must be kebab-case", self.id)));
        }
        if !(3..=64).contains(&self.name.len()) {
            return Err(ThemeError::Invalid("name must be 3..64 chars".into()));
        }
        if !is_semver(&self.version) {
            return Err(ThemeError::Invalid(format!("version {:?} must be semver", self.version)));
        }
        if self.author.len() < 2 {
            return Err(ThemeError::Invalid("author must be at least 2 chars".into()));
        }
        if !(8..=280).contains(&self.description.len()) {
            return Err(ThemeError::Invalid("description must be 8..280 chars".into()));
        }
        if self.tags.is_empty() || self.tags.len() > 8 {
            return Err(ThemeError::Invalid("tags must contain 1..8 items".into()));
        }

        // Palette
        for (what, color) in [
            ("palette.bg", &self.palette.bg),
            ("palette.bgElevated", &self.palette.bg_elevated),
            ("palette.bgPanel", &self.palette.bg_panel),
            ("palette.stroke", &self.palette.stroke),
            ("palette.strokeHolo", &self.palette.stroke_holo),
            ("palette.text", &self.palette.text),
            ("palette.textDim", &self.palette.text_dim),
            ("palette.accent", &self.palette.accent),
            ("palette.accent2", &self.palette.accent2),
            ("palette.accent3", &self.palette.accent3),
            ("palette.danger", &self.palette.danger),
            ("palette.warn", &self.palette.warn),
            ("palette.ok", &self.palette.ok),
        ] {
            check_hex(color, what)?;
        }

        // Glass
        check_range(self.glass.opacity, 0.05, 1.0, "glass.opacity")?;
        check_range(self.glass.blur_radius, 0.0, 64.0, "glass.blurRadius")?;
        check_range(self.glass.saturation, 0.0, 2.0, "glass.saturation")?;
        check_range(self.glass.border_radius, 0.0, 32.0, "glass.borderRadius")?;

        // Typography
        if self.typography.display.len() < 2
            || self.typography.body.len() < 2
            || self.typography.mono.len() < 2
        {
            return Err(ThemeError::Invalid("typography font stacks must be >= 2 chars".into()));
        }
        check_range(self.typography.scale, 0.5, 2.0, "typography.scale")?;

        // Motion
        check_range(self.motion.intensity, 0.0, 1.0, "motion.intensity")?;
        check_range(self.motion.panel_glow, 0.0, 1.0, "motion.panelGlow")?;

        // Holo
        check_range(self.holo.grid_opacity, 0.0, 1.0, "holo.gridOpacity")?;

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Color math (pure, unit-tested)
// ---------------------------------------------------------------------------

/// Relative luminance per WCAG 2.1.
pub fn relative_luminance(rgb: &[u8; 3]) -> f64 {
    fn channel(c: u8) -> f64 {
        let c = c as f64 / 255.0;
        if c <= 0.04045 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    }
    0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

/// WCAG contrast ratio between two `#rrggbb` colors (1.0 ..= 21.0).
pub fn contrast_ratio(a: &str, b: &str) -> Result<f64, ThemeError> {
    let a = parse_hex(a)?;
    let b = parse_hex(b)?;
    let la = relative_luminance(&a);
    let lb = relative_luminance(&b);
    let (light, dark) = if la >= lb { (la, lb) } else { (lb, la) };
    Ok((light + 0.05) / (dark + 0.05))
}

impl Palette {
    /// Contrast ratio between `text` and `bg`. Readability guard for packs.
    pub fn text_contrast(&self) -> Result<f64, ThemeError> {
        contrast_ratio(&self.text, &self.bg)
    }

    /// Flat CSS variable list (`--d82-*`) consumed by the UI webview.
    pub fn css_vars(&self) -> Vec<(String, String)> {
        vec![
            ("--d82-bg".into(), self.bg.clone()),
            ("--d82-bg-elevated".into(), self.bg_elevated.clone()),
            ("--d82-bg-panel".into(), self.bg_panel.clone()),
            ("--d82-stroke".into(), self.stroke.clone()),
            ("--d82-stroke-holo".into(), self.stroke_holo.clone()),
            ("--d82-text".into(), self.text.clone()),
            ("--d82-text-dim".into(), self.text_dim.clone()),
            ("--d82-accent".into(), self.accent.clone()),
            ("--d82-accent-2".into(), self.accent2.clone()),
            ("--d82-accent-3".into(), self.accent3.clone()),
            ("--d82-danger".into(), self.danger.clone()),
            ("--d82-warn".into(), self.warn.clone()),
            ("--d82-ok".into(), self.ok.clone()),
        ]
    }
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

impl ThemePack {
    /// Parses and validates a pack from its JSON text.
    pub fn from_str(raw: &str) -> Result<ThemePack, ThemeError> {
        let pack: ThemePack = serde_json::from_str(raw)?;
        pack.validate()?;
        Ok(pack)
    }

    /// Parses and validates a pack from a file.
    pub fn from_file(path: &Path) -> Result<ThemePack, ThemeError> {
        let raw = std::fs::read_to_string(path)?;
        ThemePack::from_str(&raw)
    }
}

/// Loads and validates every `*.d82theme.json` in a directory, sorted by id.
pub fn load_dir(dir: &Path) -> Result<Vec<ThemePack>, ThemeError> {
    let mut packs = Vec::new();
    let entries = std::fs::read_dir(dir).map_err(ThemeError::Io)?;
    for entry in entries {
        let entry = entry.map_err(ThemeError::Io)?;
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json")
            && path
                .file_name()
                .is_some_and(|name| name.to_string_lossy().ends_with(".d82theme.json"))
        {
            packs.push(ThemePack::from_file(&path)?);
        }
    }
    packs.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(packs)
}

/// The four flagship packs bundled with the shell, embedded at compile time
/// (single source of truth: the root `themes/` directory).
pub const EMBEDDED_PACKS: &[&str] = &[
    include_str!("../../../../themes/obsidian.d82theme.json"),
    include_str!("../../../../themes/quantum.d82theme.json"),
    include_str!("../../../../themes/neural.d82theme.json"),
    include_str!("../../../../themes/minimal.d82theme.json"),
];

/// Parses every embedded flagship pack.
pub fn embedded() -> Result<Vec<ThemePack>, ThemeError> {
    EMBEDDED_PACKS.iter().map(|raw| ThemePack::from_str(raw)).collect()
}

impl fmt::Display for ThemePack {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} v{} ({})", self.name, self.version, self.id)
    }
}
