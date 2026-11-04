//! Integration tests for d82-core.
//!
//! These run against the *real* flagship packs in `themes/`, so any change to
//! the pack format that breaks compatibility fails here first.

use d82_core::theme::{
    contrast_ratio, embedded, load_dir, parse_hex, relative_luminance, ThemePack, ThemeError,
};
use d82_core::widgets::{Layout, WidgetKind};

const THEME_FILES: &[(&str, &str)] = &[
    ("obsidian", include_str!("../../../themes/obsidian.d82theme.json")),
    ("quantum", include_str!("../../../themes/quantum.d82theme.json")),
    ("neural", include_str!("../../../themes/neural.d82theme.json")),
    ("minimal", include_str!("../../../themes/minimal.d82theme.json")),
];

// ---------------------------------------------------------------------------
// Theme engine
// ---------------------------------------------------------------------------

#[test]
fn all_flagship_packs_parse_and_validate() {
    for (name, raw) in THEME_FILES {
        let pack = ThemePack::from_str(raw)
            .unwrap_or_else(|e| panic!("flagship pack {name} failed to parse/validate: {e}"));
        assert_eq!(pack.id, *name);
        assert_eq!(pack.version, "1.0.0");
    }
}

#[test]
fn embedded_packs_match_files() {
    let packs = embedded().expect("embedded packs must validate");
    assert_eq!(packs.len(), 4);
    // Declaration order (obsidian is the default theme, first by design)
    let ids: Vec<&str> = packs.iter().map(|p| p.id.as_str()).collect();
    assert_eq!(ids, vec!["obsidian", "quantum", "neural", "minimal"]);
}

#[test]
fn load_dir_reads_themes_directory() {
    // CWD during `cargo test -p d82-core` is the crate dir.
    let themes_dir = std::path::Path::new("../../../themes");
    if themes_dir.exists() {
        let packs = load_dir(themes_dir).expect("themes dir must load");
        assert_eq!(packs.len(), 4, "expected the 4 flagship packs");
    }
}

#[test]
fn text_is_readable_on_every_flagship_pack() {
    for (name, raw) in THEME_FILES {
        let pack = ThemePack::from_str(raw).unwrap();
        let ratio = pack.palette.text_contrast().unwrap();
        assert!(
            ratio >= 4.5,
            "{name}: text/bg contrast {ratio:.2} is below WCAG AA (4.5)"
        );
    }
}

#[test]
fn rejects_bad_hex_color() {
    let mut pack = ThemePack::from_str(THEME_FILES[0].1).unwrap();
    pack.palette.accent = "not-a-color".into();
    assert!(matches!(pack.validate(), Err(ThemeError::Invalid(msg)) if msg.contains("accent")));
}

#[test]
fn rejects_out_of_range_glass_opacity() {
    let mut pack = ThemePack::from_str(THEME_FILES[0].1).unwrap();
    pack.glass.opacity = 1.5;
    assert!(matches!(pack.validate(), Err(ThemeError::Invalid(msg)) if msg.contains("opacity")));
}

#[test]
fn rejects_bad_id() {
    let mut pack = ThemePack::from_str(THEME_FILES[0].1).unwrap();
    pack.id = "Not Kebab!".into();
    assert!(matches!(pack.validate(), Err(ThemeError::Invalid(msg)) if msg.contains("kebab")));
}

#[test]
fn rejects_bad_semver() {
    let mut pack = ThemePack::from_str(THEME_FILES[0].1).unwrap();
    pack.version = "1.0".into();
    assert!(matches!(pack.validate(), Err(ThemeError::Invalid(msg)) if msg.contains("semver")));
}

#[test]
fn serde_rejects_unknown_fields() {
    let raw = r#"{ "id": "x", "bogus": true }"#;
    assert!(ThemePack::from_str(raw).is_err());
}

// ---------------------------------------------------------------------------
// Color math
// ---------------------------------------------------------------------------

#[test]
fn color_math_known_values() {
    // Pure white vs pure black = 21:1
    let ratio = contrast_ratio("#ffffff", "#000000").unwrap();
    assert!((ratio - 21.0).abs() < 0.01);

    // Same color = 1:1
    let ratio = contrast_ratio("#101010", "#101010").unwrap();
    assert!((ratio - 1.0).abs() < 0.01);

    // parse_hex roundtrip
    assert_eq!(parse_hex("#22d3ee").unwrap(), [0x22, 0xd3, 0xee]);
    assert!(parse_hex("#22d3e").is_err());
    assert!(parse_hex("22d3ee").is_err());

    // Luminance bounds
    assert!(relative_luminance(&[0, 0, 0]).abs() < 1e-9);
    assert!((relative_luminance(&[255, 255, 255]) - 1.0).abs() < 1e-9);
}

#[test]
fn palette_css_vars_are_wellformed() {
    let pack = ThemePack::from_str(THEME_FILES[0].1).unwrap();
    let vars = pack.palette.css_vars();
    assert_eq!(vars.len(), 13);
    assert!(vars.iter().all(|(k, v)| k.starts_with("--d82-") && v.starts_with('#')));
}

// ---------------------------------------------------------------------------
// Widget engine
// ---------------------------------------------------------------------------

#[test]
fn default_layout_roundtrips_through_json() {
    let layout = Layout::default_layout();
    let json = serde_json::to_string_pretty(&layout).unwrap();
    let back: Layout = serde_json::from_str(&json).unwrap();
    assert_eq!(layout, back);
}

#[test]
fn default_layout_is_sane() {
    let layout = Layout::default_layout();
    assert_eq!(layout.theme_id, "obsidian");
    assert_eq!(layout.panels.len(), 3);
    for panel in &layout.panels {
        assert!(!panel.widgets.is_empty(), "panel {} has no widgets", panel.id);
        assert!(panel.width >= 200 && panel.height >= 100);
    }
    assert!(layout.panel("panel-system").is_some());
    assert!(layout.panel("nope").is_none());
}

#[test]
fn widget_kinds_are_stable() {
    assert_eq!(WidgetKind::Cpu.as_str(), "cpu");
    assert_eq!(WidgetKind::all().len(), 7);
    // serde uses kebab-case
    let kind: WidgetKind = serde_json::from_str("\"shortcuts\"").unwrap();
    assert_eq!(kind, WidgetKind::Shortcuts);
    let json = serde_json::to_string(&WidgetKind::Calendar).unwrap();
    assert_eq!(json, "\"calendar\"");
}

// ---------------------------------------------------------------------------
// Metrics (feature: metrics)
// ---------------------------------------------------------------------------

#[cfg(feature = "metrics")]
#[test]
fn metrics_snapshot_is_real() {
    let snap = d82_core::sys::collect();
    assert!(!snap.cpu_cores.is_empty(), "must detect at least one core");
    assert!(snap.cpu_avg_percent >= 0.0 && snap.cpu_avg_percent <= 100.0 * 1.05);
    assert!(snap.mem_total_bytes > 0, "total memory must be > 0");
    assert!(snap.mem_used_bytes <= snap.mem_total_bytes);
    assert!(snap.mem_percent >= 0.0 && snap.mem_percent <= 100.0);
    assert!(snap.collected_at_ms > 0);
}

#[cfg(feature = "metrics")]
#[test]
fn metrics_snapshot_serializes() {
    let snap = d82_core::sys::collect();
    let json = serde_json::to_string(&snap).unwrap();
    assert!(json.contains("\"cpuAvgPercent\""));
    assert!(json.contains("\"memTotalBytes\""));
}

#[test]
fn version_is_exposed() {
    assert!(!d82_core::VERSION.is_empty());
}
