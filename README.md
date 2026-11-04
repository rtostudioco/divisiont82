<div align="center">

# ⬡ DIVISIONT82

**Holographic desktop shell for Windows & Linux · MCP-native**

*Not an OS. Not a compositor. A shell that floats on top of yours.*

[![CI](https://github.com/YOUR_GITHUB_USER/divisiont82/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)
[![Release](https://github.com/YOUR_GITHUB_USER/divisiont82/actions/workflows/release.yml/badge.svg)](./.github/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg)](./LICENSE)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-22d3ee.svg)](#platform-support)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-a78bfa.svg)](https://tauri.app)

</div>

---

DivisionT82 transforms **Windows** and **Linux** into personalized, holographic
work environments — floating glass panels, smart widgets, declarative theme
packs and an MCP-native extension layer. It never replaces your operating
system: it *floats* above it using native per-platform capabilities.

> **Design rule #1** *(learned from projects like [Serpantinum](https://serpantinum.dev))*
> DivisionT82 is a **shell, not an OS**. It does not manage keybinds, monitors
> or your taskbar. Your system stays in charge.

## The three levels

| Level | Engine | What it does |
|---|---|---|
| 1 | **Theme Engine** | Declarative `.d82theme` packs: palette, glass (opacity/blur/saturation), typography, motion, holo layer. Hot-reloadable, hot-pluggable from `<appdata>/themes/`. |
| 2 | **Widget Engine** | CPU, RAM, network, clock, calendar, weather, launchpad — fed by a Rust metrics collector over IPC. |
| 3 | **Holo Interface** | Floating transparent always-on-top panels, drag & edge-snap, click-through mode, animated holo backdrop (grid / dust / matrix / orbit). |

## Theme packs

Four flagship packs ship embedded in the binary:

| Pack | Identity |
|---|---|
| **OBSIDIAN** | Obsidian glass over the void — cyan circuitry, violet plasma |
| **QUANTUM** | Emerald/magenta superposition, orbiting particles |
| **NEURAL** | Warm amber synapses over carbon black |
| **MINIMAL** | Quiet operator — graphite, one emerald signal, zero noise |

Community packs are single JSON files validated against
[`themes/schema/theme.schema.json`](themes/schema/theme.schema.json):

```jsonc
{
  "id": "my-pack",
  "name": "DivisionT82 / MY-PACK",
  "version": "1.0.0",
  "palette": { "bg": "#0a0a0f", "accent": "#22d3ee", "...": "..." },
  "glass":  { "opacity": 0.42, "blurRadius": 26, "...": "..." },
  "holo":   { "grid": true, "particles": "dust", "...": "..." }
}
```

## MCP-native

`modules/mcp-bridge` is a **zero-dependency Model Context Protocol server**
(stdio JSON-RPC) that exposes the shell to AI assistants:

```
list_themes · describe_theme · get_metrics · shell_status
```

Point any MCP client at `bun modules/mcp-bridge/src/index.ts` and the shell
becomes scriptable by agents.

## Repository layout

```
divisiont82/
├── crates/d82-core/      Pure Rust core: theme engine, widget specs, metrics (+tests)
├── src-tauri/            Tauri v2 shell: commands, panel windows, layout persistence
├── ui/                   TypeScript + React webview frontend (holo interface)
├── themes/               .d82theme packs + JSON Schema  ← single source of truth
├── modules/mcp-bridge/   Universal MCP server (stdio, zero deps)
├── scripts/              Theme validator · sync · MCP conformance test
└── docs/                 Architecture, theme format spec, roadmap
```

## Getting started

**Prerequisites:** [Bun](https://bun.sh) ≥ 1.1, [Rust](https://rustup.rs) stable,
and Tauri v2 [system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/YOUR_GITHUB_USER/divisiont82
cd divisiont82
bun install

# Run the holo interface in a plain browser (mock backend)
bun run dev

# Validate themes + MCP + typecheck + build
bun run test:all
bun run test:rust        # cargo test for the Rust core

# Run the real desktop shell (Windows / Linux)
bun run desktop:dev
bun run desktop:build    # → .msi/.exe (Windows), .deb/.AppImage (Linux)
```

## Platform support

| Platform | Status | Notes |
|---|---|---|
| Windows 10/11 | ✅ target | Transparent always-on-top panels; Acrylic/Mica planned via `window-vibrancy` |
| Linux (X11) | ✅ target | Works out of the box on mainstream desktops |
| Linux (Wayland) | 🟡 planned | Generic windows first; layer-shell adapter for Hyprland/Sway/KDE as optional module |
| macOS | 🔵 future | Untested but architecturally unblocked by Tauri |

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md). Short version:

- **v0.1** — Theme Engine + Widget Engine + floating panels *(this repo)*
- **v0.2** — Click-through ambient layers, per-compositor Wayland adapter, MCP host bridge
- **v0.3** — Python sidecar module SDK, community pack gallery

## Testing philosophy

Every layer ships with concrete, runnable tests:

| Layer | Command |
|---|---|
| Theme packs & schema | `bun run validate:themes` |
| Rust core (themes, color math, widgets, metrics) | `cargo test -p d82-core` |
| MCP protocol conformance | `bun run test:mcp` |
| UI type-safety & build | `bun run check:ui && bun run build:ui` |

## License

[MIT](./LICENSE) — © 2026 DivisionT82 contributors.
Concept inspired by the desktop-shell movement (Serpantinum & friends). All code original.
