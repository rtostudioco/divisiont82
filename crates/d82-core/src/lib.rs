//! # d82-core
//!
//! Core library for **DivisionT82** — a holographic desktop shell for Windows
//! and Linux, built on top of Tauri.
//!
//! This crate is intentionally *framework-free*: it contains the pure domain
//! logic of the shell so it can be tested with plain `cargo test` and reused
//! by any host (Tauri, CLI, sidecar).
//!
//! Modules:
//! - [`theme`]   — Level 1: the `.d82theme` pack format, validation, palette math.
//! - [`widgets`] — Level 2: widget kinds, panel instances and layout documents.
//! - [`sys`]     — Level 2: system metrics collection (feature `metrics`).

pub mod theme;
pub mod widgets;

#[cfg(feature = "metrics")]
pub mod sys;

pub use theme::{Palette, ThemeError, ThemePack};
pub use widgets::{Layout, Panel, WidgetInstance, WidgetKind};

/// Crate version, exposed so hosts can report it (e.g. via MCP or the UI).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
