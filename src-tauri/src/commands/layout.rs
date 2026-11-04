//! Level 2/3 — Layout persistence.
//!
//! The layout document (`d82_core::widgets::Layout`) is stored as JSON in the
//! app data directory. Simple, inspectable, versionable — no database needed.

use crate::state::AppState;
use d82_core::widgets::Layout;
use tauri::State;

#[tauri::command]
pub fn save_layout(state: State<'_, AppState>, layout: Layout) -> Result<(), String> {
    let path = state.layout_file();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_layout(state: State<'_, AppState>) -> Layout {
    let path = state.layout_file();
    std::fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_else(Layout::default_layout)
}

/// Resets the layout back to the factory default and returns it.
#[tauri::command]
pub fn reset_layout(state: State<'_, AppState>) -> Result<Layout, String> {
    let layout = Layout::default_layout();
    let path = state.layout_file();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&layout).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(layout)
}
