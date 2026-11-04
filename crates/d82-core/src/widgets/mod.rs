//! Level 2 — Widget Engine specifications.
//!
//! Widgets live inside **panels** (floating holo windows). A [`Layout`] is the
//! persisted document that describes which panels exist, where they are and
//! what they contain. The host (Tauri) stores one layout file per profile in
//! the app data directory; this module owns the schema.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Widget kinds
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WidgetKind {
    Cpu,
    Ram,
    Network,
    Clock,
    Calendar,
    Weather,
    Shortcuts,
    Mcp,
}

impl WidgetKind {
    /// Stable machine id, also used as the default widget instance prefix.
    pub fn as_str(&self) -> &'static str {
        match self {
            WidgetKind::Cpu => "cpu",
            WidgetKind::Ram => "ram",
            WidgetKind::Network => "network",
            WidgetKind::Clock => "clock",
            WidgetKind::Calendar => "calendar",
            WidgetKind::Weather => "weather",
            WidgetKind::Shortcuts => "shortcuts",
            WidgetKind::Mcp => "mcp",
        }
    }

    /// Human readable label shown in panel headers.
    pub fn label(&self) -> &'static str {
        match self {
            WidgetKind::Cpu => "Processor",
            WidgetKind::Ram => "Memory",
            WidgetKind::Network => "Network",
            WidgetKind::Clock => "Clock",
            WidgetKind::Calendar => "Calendar",
            WidgetKind::Weather => "Weather",
            WidgetKind::Shortcuts => "Launchpad",
            WidgetKind::Mcp => "AI Core (MCP)",
        }
    }

    pub fn all() -> &'static [WidgetKind] {
        &[
            WidgetKind::Cpu,
            WidgetKind::Ram,
            WidgetKind::Network,
            WidgetKind::Clock,
            WidgetKind::Calendar,
            WidgetKind::Weather,
            WidgetKind::Shortcuts,
            WidgetKind::Mcp,
        ]
    }
}

impl std::fmt::Display for WidgetKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

// ---------------------------------------------------------------------------
// Instances, panels and layouts
// ---------------------------------------------------------------------------

/// A widget placed in a panel. `x`/`y`/`width`/`height` are relative slots
/// inside the panel's CSS grid; free-floating window geometry lives on the
/// panel itself.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WidgetInstance {
    pub id: String,
    pub kind: WidgetKind,
    #[serde(default)]
    pub x: u32,
    #[serde(default)]
    pub y: u32,
    #[serde(default = "default_w")]
    pub width: u32,
    #[serde(default = "default_h")]
    pub height: u32,
    #[serde(default)]
    pub settings: serde_json::Value,
}

fn default_w() -> u32 {
    1
}

fn default_h() -> u32 {
    1
}

/// A floating holo panel.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Panel {
    pub id: String,
    pub title: String,
    /// Absolute screen position (virtual desktop coordinates).
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    #[serde(default)]
    pub collapsed: bool,
    pub widgets: Vec<WidgetInstance>,
}

/// A complete desktop arrangement: theme + panels.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Layout {
    pub name: String,
    pub theme_id: String,
    pub panels: Vec<Panel>,
}

impl Layout {
    /// The default "first boot" arrangement used when no layout file exists.
    pub fn default_layout() -> Layout {
        Layout {
            name: "default".into(),
            theme_id: "obsidian".into(),
            panels: vec![
                Panel {
                    id: "panel-system".into(),
                    title: "SYSTEM".into(),
                    x: 48,
                    y: 64,
                    width: 340,
                    height: 260,
                    collapsed: false,
                    widgets: vec![
                        WidgetInstance {
                            id: "sys-cpu".into(),
                            kind: WidgetKind::Cpu,
                            x: 0,
                            y: 0,
                            width: 1,
                            height: 1,
                            settings: serde_json::json!({ "history": 60 }),
                        },
                        WidgetInstance {
                            id: "sys-ram".into(),
                            kind: WidgetKind::Ram,
                            x: 1,
                            y: 0,
                            width: 1,
                            height: 1,
                            settings: serde_json::json!({}),
                        },
                    ],
                },
                Panel {
                    id: "panel-time".into(),
                    title: "CHRONO".into(),
                    x: 420,
                    y: 64,
                    width: 300,
                    height: 260,
                    collapsed: false,
                    widgets: vec![
                        WidgetInstance {
                            id: "time-clock".into(),
                            kind: WidgetKind::Clock,
                            x: 0,
                            y: 0,
                            width: 1,
                            height: 1,
                            settings: serde_json::json!({ "seconds": true, "format": "24h" }),
                        },
                        WidgetInstance {
                            id: "time-calendar".into(),
                            kind: WidgetKind::Calendar,
                            x: 0,
                            y: 1,
                            width: 1,
                            height: 1,
                            settings: serde_json::json!({}),
                        },
                    ],
                },
                Panel {
                    id: "panel-env".into(),
                    title: "ENVIRONMENT".into(),
                    x: 760,
                    y: 64,
                    width: 300,
                    height: 260,
                    collapsed: false,
                    widgets: vec![
                        WidgetInstance {
                            id: "env-weather".into(),
                            kind: WidgetKind::Weather,
                            x: 0,
                            y: 0,
                            width: 1,
                            height: 1,
                            settings: serde_json::json!({ "lat": 4.71, "lon": -74.07, "city": "Bogotá" }),
                        },
                        WidgetInstance {
                            id: "env-net".into(),
                            kind: WidgetKind::Network,
                            x: 0,
                            y: 1,
                            width: 1,
                            height: 1,
                            settings: serde_json::json!({}),
                        },
                    ],
                },
                Panel {
                    id: "panel-launch".into(),
                    title: "LAUNCHPAD".into(),
                    x: 48,
                    y: 380,
                    width: 340,
                    height: 200,
                    collapsed: false,
                    widgets: vec![WidgetInstance {
                        id: "launch-shortcuts".into(),
                        kind: WidgetKind::Shortcuts,
                        x: 0,
                        y: 0,
                        width: 1,
                        height: 1,
                        settings: serde_json::json!({}),
                    }],
                },
                Panel {
                    id: "panel-mcp".into(),
                    title: "AI CORE".into(),
                    x: 420,
                    y: 380,
                    width: 340,
                    height: 240,
                    collapsed: false,
                    widgets: vec![WidgetInstance {
                        id: "ai-mcp".into(),
                        kind: WidgetKind::Mcp,
                        x: 0,
                        y: 0,
                        width: 1,
                        height: 1,
                        settings: serde_json::json!({}),
                    }],
                },
            ],
        }
    }

    /// Finds a panel by id.
    pub fn panel(&self, id: &str) -> Option<&Panel> {
        self.panels.iter().find(|p| p.id == id)
    }
}
