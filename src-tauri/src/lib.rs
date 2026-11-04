//! DivisionT82 — Tauri v2 shell.
//!
//! The shell owns:
//! 1. **Theme Engine commands** — list/load/switch `.d82theme` packs.
//! 2. **Widget Engine commands** — system metrics snapshots for the widgets.
//! 3. **Holo Interface commands** — creation and management of the floating
//!    transparent panel windows, plus layout persistence.
//! 4. **Universal MCP client** — live JSON-RPC stdio session with the bridge
//!    process, plus global shortcuts (`ctrl+alt+d/t/v/m`).
//!
//! It deliberately does NOT manage keybinds, monitors or the taskbar: the
//! operating system / compositor stays in charge (Serpantinum's lesson:
//! "a shell, not an OS").

mod commands;
mod state;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data).ok();
            app.manage(state::AppState::new(app_data));
            app.manage(commands::mcp::McpHandle::default());

            #[cfg(desktop)]
            {
                use tauri::Emitter;
                use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

                let shortcuts: &[(&str, &str)] = &[
                    ("ctrl+alt+d", "toggle-panels"),
                    ("ctrl+alt+t", "cycle-theme"),
                    ("ctrl+alt+v", "toggle-holo"),
                    ("ctrl+alt+m", "toggle-mcp"),
                ];
                for (combo, action) in shortcuts {
                    let action = (*action).to_string();
                    if let Err(e) = app
                        .global_shortcut()
                        .on_shortcut(*combo, move |app, _shortcut, event| {
                            if event.state() == ShortcutState::Pressed {
                                let _ = app.emit("d82://shortcut", action.clone());
                            }
                        })
                    {
                        log::warn!("global shortcut '{combo}' unavailable: {e}");
                    }
                }
                log::info!("global shortcuts registered (ctrl+alt+d/t/v/m)");
            }

            log::info!("DivisionT82 shell started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::theme::list_themes,
            commands::theme::load_theme,
            commands::theme::active_theme,
            commands::sys::metrics_snapshot,
            commands::sys::open_target,
            commands::panels::open_panel,
            commands::panels::close_panel,
            commands::panels::set_click_through,
            commands::panels::set_always_on_top,
            commands::panels::toggle_all_panels,
            commands::layout::save_layout,
            commands::layout::load_layout,
            commands::mcp::mcp_start,
            commands::mcp::mcp_stop,
            commands::mcp::mcp_status,
            commands::mcp::mcp_call,
        ])
        .run(tauri::generate_context!())
        .expect("error while running DivisionT82");
}
