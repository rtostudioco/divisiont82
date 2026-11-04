//! Shared application state: paths and the active theme id.

use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    app_data_dir: PathBuf,
    active_theme: Mutex<String>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            active_theme: Mutex::new(String::from("obsidian")),
        }
    }

    pub fn app_data_dir(&self) -> &PathBuf {
        &self.app_data_dir
    }

    pub fn user_themes_dir(&self) -> PathBuf {
        self.app_data_dir.join("themes")
    }

    pub fn layout_file(&self) -> PathBuf {
        self.app_data_dir.join("layout.json")
    }

    pub fn active_theme(&self) -> String {
        self.active_theme
            .lock()
            .map(|t| t.clone())
            .unwrap_or_else(|_| String::from("obsidian"))
    }

    pub fn set_active_theme(&self, id: String) {
        if let Ok(mut guard) = self.active_theme.lock() {
            *guard = id;
        }
    }
}
