//! DivisionT82 — Tauri v2 shell.
//!
//! The shell owns:
//! 1. **Theme Engine commands** — list/load/switch `.d82theme` packs.
//! 2. **Widget Engine commands** — system metrics snapshots for the widgets.
//! 3. **Holo Interface commands** — creation and management of the floating
//!    transparent panel windows, plus layout persistence.
//!
//! It deliberately does NOT manage keybinds, monitors or the taskbar: the
//! operating system / compositor stays in charge (Serpantinum's lesson:
//! "a shell, not an OS").

mod commands;
mod state;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data).ok();
            app.manage(state::AppState::new(app_data));
            log::info!("DivisionT82 shell started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::theme::list_themes,
            commands::theme::load_theme,
            commands::theme::active_theme,
            commands::sys::metrics_snapshot,
            commands::panels::open_panel,
            commands::panels::close_panel,
            commands::panels::set_click_through,
            commands::panels::set_always_on_top,
            commands::layout::save_layout,
            commands::layout::load_layout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DivisionT82");
}
