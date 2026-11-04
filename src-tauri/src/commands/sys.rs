//! Level 2 — Widget Engine: system metrics command.

use d82_core::sys::{collect, MetricsSnapshot};

/// Returns a fresh snapshot of CPU/RAM metrics for the widgets.
/// The UI polls this on a timer (1–2 s) and renders sparklines/rings.
#[tauri::command]
pub fn metrics_snapshot() -> MetricsSnapshot {
    collect()
}
