# Roadmap

## v0.1 — Núcleo *(esta etapa / Etapa A)*

- [x] Monorepo: `crates/d82-core` + `src-tauri` + `ui` + `themes` + `modules`
- [x] Theme Engine: esquema, validador doble (JSON Schema + Rust), 4 packs insignia
- [x] Widget Engine: métricas Rust (sysinfo), 7 widgets, layout persistente
- [x] Holo Interface: paneles flotantes (multi-ventana), drag & snap, backdrop animado
- [x] MCP bridge: servidor stdio JSON-RPC sin dependencias + test de conformancia
- [x] CI (rust-core / ui / mcp) y release pipeline (msi/exe/deb/AppImage/rpm)

## v0.2 — Superficie nativa

- [ ] `window-vibrancy`: Acrylic (Windows) y blur real por plataforma
- [ ] Click-through ambiental: capa holo tras los iconos (WorkerW en Windows, `xwinwrap`/layer-shell en Linux)
- [ ] Adaptador Wayland `layer-shell` (Hyprland/Sway/KDE) como módulo opcional
- [ ] Métricas de red reales en `d82-core` (reemplazar SIM en el widget Network)
- [ ] MCP host bridge completo: `switch_theme`, `open_panel`, `set_click_through` operativos desde agentes
- [ ] Paquetes de sonido (`.d82sound`)

## v0.3 — Ecosistema

- [ ] SDK de módulos Python (sidecar opcional, descargable aparte)
- [ ] Galería de packs de la comunidad ( GitHub Pages )
- [ ] Marketplace de layouts (`Layout` ya es un documento portátil)
- [ ] Auto-update (tauri-plugin-updater)

## Regla permanente

> Nunca intentar reemplazar la taskbar ni gestionar ventanas del sistema.
> **Shell, no OS.**
