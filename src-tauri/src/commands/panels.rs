//! Level 3 — Holo Interface: floating transparent panel windows.
//!
//! Panels are separate Tauri windows (`panel-*` labels) that are:
//! - frameless (`decorations: false`) and transparent,
//! - always-on-top, hidden from the taskbar,
//! - optionally click-through (`set_ignore_cursor_events`) so they float over
//!   the desktop without stealing input — the same trick Rainmeter uses, but
//!   cross-platform through Tauri.
//!
//! This is what makes DivisionT82 work on **Windows** (no compositor API
//! needed) and on **Linux** (works on X11 out of the box; a layer-shell
//! adapter for Hyprland/Sway/KDE is planned as an optional module).

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

fn panel_label(id: &str) -> String {
    format!("panel-{id}")
}

/// Hides every `panel-*` window, or shows them all again if none is visible.
/// Returns the resulting visibility state. Bound to `ctrl+alt+d`.
#[tauri::command]
pub fn toggle_all_panels(app: AppHandle) -> Result<bool, String> {
    let panels: Vec<_> = app
        .webview_windows()
        .into_iter()
        .filter(|(label, _)| label.starts_with("panel-"))
        .collect();
    if panels.is_empty() {
        return Ok(false);
    }
    let any_visible = panels
        .iter()
        .any(|(_, window)| window.is_visible().unwrap_or(false));
    for (_, window) in &panels {
        let _ = if any_visible {
            window.hide()
        } else {
            window.show()
        };
    }
    Ok(!any_visible)
}

#[tauri::command]
pub fn open_panel(
    app: AppHandle,
    id: String,
    title: String,
    x: i32,
    y: i32,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let label = panel_label(&id);
    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("index.html".into()))
        .title(title)
        .position(x as f64, y as f64)
        .inner_size(width, height)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(true)
        .focused(false)
        .shadow(false)
        .build()
        .map_err(|e| format!("failed to open panel '{id}': {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn close_panel(app: AppHandle, id: String) -> Result<(), String> {
    let label = panel_label(&id);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Toggles mouse transparency. When enabled, clicks pass through the panel —
/// ideal for ambient holo layers that must not block the desktop.
#[tauri::command]
pub fn set_click_through(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let label = panel_label(&id);
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("panel '{id}' not found"))?;
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_always_on_top(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    let label = panel_label(&id);
    let window = app
        .get_webview_window(&label)
        .ok_or_else(|| format!("panel '{id}' not found"))?;
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}
