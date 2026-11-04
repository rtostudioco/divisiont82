# Changelog

All notable changes to DivisionT82 are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org).

## [0.2.0] — Etapa B · native surface

### Added
- **Global shortcuts** (registered in Rust, desktop-only): `ctrl+alt+d` toggle all panels · `ctrl+alt+t` cycle theme pack · `ctrl+alt+v` pause/restore the holo layer · `ctrl+alt+m` start/stop the MCP bridge. Actions reach the UI through a single `d82://shortcut` event.
- **AI Core panel (MCP live client)**: the shell now spawns `modules/mcp-bridge` as a child process and speaks newline-delimited JSON-RPC 2.0 over stdio (`initialize` handshake + `tools/list` + `tools/call`). New commands: `mcp_start`, `mcp_stop`, `mcp_status`, `mcp_call`. In the web demo the widget runs against a simulated session.
- **Widget `mcp`** (d82-core `WidgetKind::Mcp`): status dot (online/offline/fault), start/stop control and one-click calls to `list_themes`, `get_metrics`, `shell_status` with live JSON output.
- **Editable Launchpad**: tiles persisted in `localStorage`, add/remove/reset UI; in the packaged shell links open in the default browser via `tauri-plugin-opener` (new `open_target` command, http(s)-only by design).
- **Click-through per panel**: ghost button in every panel header → `set_ignore_cursor_events` on the real window (Tauri), persisted per panel; visual 55%-opacity cue.
- **`toggle_all_panels` command** for real `panel-*` windows (hide-all/show-all).
- Default layout now ships 5 panels: SYSTEM · CHRONO · ENVIRONMENT · LAUNCHPAD · AI CORE.

### Changed
- Version bumped across workspace, Tauri bundle, UI and MCP bridge to 0.2.0.
- Repository URLs now point to `github.com/rtostudioco/divisiont82`.

## [0.1.0] — Etapa A · monorepo

### Added
- Monorepo: `crates/d82-core` (Rust core) · `src-tauri` (Tauri v2 shell) · `ui` (React webview) · `themes` · `modules` · `docs` · CI + release pipelines.
- Theme Engine: dual-validated `.d82theme` packs (JSON Schema + Rust), 4 flagship packs (OBSIDIAN, QUANTUM, NEURAL, MINIMAL), hot-switch from the dock.
- Widget Engine: sysinfo-backed CPU/RAM collector, 7 widgets (cpu, ram, network, clock, calendar, weather, launchpad), persistent layout document.
- Holo Interface: floating glass panels with drag & magnetic edge-snap, animated backdrop (grid / dust / matrix / orbit), scanlines, vignette, noise.
- Universal MCP bridge: zero-dependency stdio MCP server (`list_themes`, `describe_theme`, `get_metrics`, `shell_status`) + conformance test script.
