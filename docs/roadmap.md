# Roadmap

## v0.1 — Núcleo *(esta etapa / Etapa A)*

- [x] Monorepo: `crates/d82-core` + `src-tauri` + `ui` + `themes` + `modules`
- [x] Theme Engine: esquema, validador doble (JSON Schema + Rust), 4 packs insignia
- [x] Widget Engine: métricas Rust (sysinfo), 7 widgets, layout persistente
- [x] Holo Interface: paneles flotantes (multi-ventana), drag & snap, backdrop animado
- [x] MCP bridge: servidor stdio JSON-RPC sin dependencias + test de conformancia
- [x] CI (rust-core / ui / mcp) y release pipeline (msi/exe/deb/AppImage/rpm)

## v0.2 — Superficie nativa *(Etapa B — completada)*

- [x] Shortcuts globales reales (`ctrl+alt+d` paneles · `ctrl+alt+t` tema · `ctrl+alt+v` holo · `ctrl+alt+m` MCP) vía `tauri-plugin-global-shortcut`
- [x] MCP host client en vivo: el shell habla JSON-RPC stdio con `modules/mcp-bridge` (`mcp_start/stop/status/call`)
- [x] AI Core widget (`mcp`): control del puente y llamadas a herramientas desde el escritorio
- [x] Launchpad editable + apertura http(s) nativa (`tauri-plugin-opener`, comando `open_target`)
- [x] Click-through por panel (botón ghost) + `toggle_all_panels` para ventanas `panel-*` reales
- [x] CHANGELOG.md y versionado SemVer (0.2.0) en todo el workspace
- [ ] `window-vibrancy`: Acrylic (Windows) y blur real por plataforma
- [ ] Click-through ambiental: capa holo tras los iconos (WorkerW en Windows, `xwinwrap`/layer-shell en Linux)
- [ ] Adaptador Wayland `layer-shell` (Hyprland/Sway/KDE) como módulo opcional
- [ ] Métricas de red reales en `d82-core` (reemplazar SIM en el widget Network)
- [ ] Paquetes de sonido (`.d82sound`)

## v0.3 — Ecosistema

- [ ] Shell controlado por agentes: `set_theme`, `open_panel`, `set_click_through` como herramientas MCP operativas
- [ ] SDK de módulos Python (sidecar opcional, descargable aparte)
- [ ] Galería de packs de la comunidad ( GitHub Pages )
- [ ] Marketplace de layouts (`Layout` ya es un documento portátil)
- [ ] Auto-update (tauri-plugin-updater)

## Regla permanente

> Nunca intentar reemplazar la taskbar ni gestionar ventanas del sistema.
> **Shell, no OS.**
