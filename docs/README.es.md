# DivisionT82 — Resumen en español

**Shell de escritorio holográfico para Windows y Linux · MCP-nativo.**
*No es un OS, no es un compositor: es un shell que flota sobre el tuyo.*

## Los tres niveles

| Nivel | Motor | Función |
|---|---|---|
| 1 | **Theme Engine** | Packs `.d82theme` declarativos: paleta, glass (opacidad/blur/saturación), tipografía, motion y capa holo. Hot-plug desde `<appdata>/themes/` |
| 2 | **Widget Engine** | CPU, RAM, red, reloj, calendario, clima, accesos — alimentados por un colector Rust vía IPC |
| 3 | **Holo Interface** | Paneles flotantes transparentes siempre encima, drag & snap, click-through, backdrop holográfico animado |

## Packs insignia

| Pack | Identidad |
|---|---|
| **OBSIDIAN** | Vidrio de obsidiana sobre el vacío — circuitos cian, plasma violeta |
| **QUANTUM** | Superposición esmeralda/magenta, partículas orbitales |
| **NEURAL** | Sinapsis ámbar cálidas sobre negro carbón |
| **MINIMAL** | Operador silencioso — grafito, una señal esmeralda, cero ruido |

## Arquitectura (resumen)

```
divisiont82/
├── crates/d82-core/    → Núcleo Rust puro (temas, widgets, métricas) + tests
├── src-tauri/          → Shell Tauri v2 (comandos, ventanas panel, layout)
├── ui/                 → Frontend TypeScript/React (interfaz holo)
├── themes/             → Packs .d82theme + JSON Schema (fuente única)
├── modules/mcp-bridge/ → Servidor MCP universal (stdio, cero deps)
├── scripts/            → Validador de temas, sync, test MCP
└── docs/               → Arquitectura, formato de temas, roadmap
```

## Inicio rápido

```bash
bun install
bun run dev              # interfaz holo en el navegador (backend simulado)
bun run test:all         # temas + MCP + typecheck + build
cargo test -p d82-core   # núcleo Rust
bun run desktop:dev      # shell real de escritorio (requiere deps de Tauri)
```

## Regla de oro

> **Shell, no OS.** DivisionT82 nunca gestiona keybinds, monitores ni la
> taskbar — el sistema operativo queda al mando. (Lección aprendida del
> ecosistema Serpantinum.)

Licencia MIT. Ver `docs/architecture.md` para el detalle completo.
