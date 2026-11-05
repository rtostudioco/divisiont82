//! Etapa C — Desktop Mode.
//!
//! Turns the shell into a full-screen desktop-environment layer: the main
//! window goes borderless fullscreen and (on Windows) the native taskbar is
//! hidden while the mode is ON. Everything is restored when the mode turns
//! OFF or when the window closes. It is a reversible overlay — a shell, not
//! an OS: we never touch registry keys, shell replacements or sessions.

use tauri::Window;

/// Hides/shows the native Windows taskbars (primary + secondary monitors).
/// Best-effort: if the lookup fails the mode still works because the
/// fullscreen window covers the whole screen.
#[cfg(windows)]
pub fn set_taskbar_visible(visible: bool) {
    use winapi::um::winuser::{FindWindowW, ShowWindow, SW_HIDE, SW_SHOW};
    unsafe {
        for class in ["Shell_TrayWnd", "Shell_SecondaryTrayWnd"] {
            let mut wide: Vec<u16> = class.encode_utf16().collect();
            wide.push(0);
            let hwnd = FindWindowW(wide.as_ptr(), std::ptr::null());
            if !hwnd.is_null() {
                ShowWindow(hwnd, if visible { SW_SHOW } else { SW_HIDE });
            }
        }
    }
}

/// No-op on non-Windows platforms (the desktop environment owns its panels).
#[cfg(not(windows))]
pub fn set_taskbar_visible(_visible: bool) {}

/// Restores the desktop chrome — called when the shell window is destroyed.
pub fn restore() {
    set_taskbar_visible(true);
}

/// Toggles Desktop Mode: borderless fullscreen shell with the native taskbar
/// hidden (Windows). Returns the resulting state.
#[tauri::command]
pub fn desktop_mode(window: Window, on: bool) -> Result<bool, String> {
    // Taskbar first, so the fullscreen transition never flashes it.
    set_taskbar_visible(!on);
    window
        .set_fullscreen(on)
        .map_err(|e| format!("fullscreen failed: {e}"))?;
    Ok(on)
}
