//! Level 2 — Widget Engine: system metrics command + native open helper.

use d82_core::sys::{collect, MetricsSnapshot};
use tauri_plugin_opener::OpenerExt;

/// Returns a fresh snapshot of CPU/RAM metrics for the widgets.
/// The UI polls this on a timer (1–2 s) and renders sparklines/rings.
#[tauri::command]
pub fn metrics_snapshot() -> MetricsSnapshot {
    collect()
}

/// Opens an http(s) target (launchpad tiles) in the user's default browser.
/// Deliberately restricted to http(s): the shell never executes arbitrary
/// commands ("shell, not OS").
#[tauri::command]
pub fn open_target(app: tauri::AppHandle, target: String) -> Result<(), String> {
    if !(target.starts_with("http://") || target.starts_with("https://")) {
        return Err("only http(s) targets are allowed".into());
    }
    app.opener()
        .open_url(target, None::<String>)
        .map_err(|e| e.to_string())
}
