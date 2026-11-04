//! Level 1 — Theme Engine commands.
//!
//! Flagship packs are embedded in the binary at compile time (single source of
//! truth: root `themes/`). Custom packs are discovered from
//! `<app_data_dir>/themes/*.d82theme.json`, so users can drop packs without
//! recompiling.

use crate::state::AppState;
use d82_core::theme::{self, ThemePack};
use tauri::State;

fn all_packs(state: &AppState) -> Vec<ThemePack> {
    let mut packs = theme::embedded().unwrap_or_default();
    packs.extend(theme::load_dir(&state.user_themes_dir()).unwrap_or_default());
    packs
}

#[tauri::command]
pub fn list_themes(state: State<'_, AppState>) -> Result<Vec<ThemePack>, String> {
    Ok(all_packs(&state))
}

#[tauri::command]
pub fn load_theme(state: State<'_, AppState>, id: String) -> Result<ThemePack, String> {
    all_packs(&state)
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("theme '{id}' not found"))
}

#[tauri::command]
pub fn active_theme(state: State<'_, AppState>) -> String {
    state.active_theme()
}

/// Switches the active theme. The UI listens for the `theme://changed` event
/// and re-applies its CSS variables; the host may also apply native accents.
#[tauri::command]
pub fn switch_theme(state: State<'_, AppState>, id: String) -> Result<ThemePack, String> {
    let pack = all_packs(&state)
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("theme '{id}' not found"))?;
    state.set_active_theme(id);
    Ok(pack)
}
