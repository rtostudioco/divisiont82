# Formato de Theme Packs — `.d82theme`

Un pack es un único archivo JSON, autocontenido y declarativo. Es el contrato
entre diseñadores y el shell: **no hay código en un tema, solo datos**.

## Reglas

| Regla | Detalle |
|---|---|
| Nombre | `<id>.d82theme.json`, en kebab-case igual al campo `id` |
| Validación | JSON Schema (`themes/schema/theme.schema.json`) **y** validador Rust (`d82-core`) |
| Campos desconocidos | Rechazados (strict mode) — evita packs silenciosamente corruptos |
| Colores | Hex de 6 dígitos `#rrggbb` |
| Legibilidad | El contraste `palette.text` vs `palette.bg` debe ser ≥ 4.5 (WCAG AA) — testeado para los packs insignia |

## Secciones

### `palette` (13 colores)

| Clave | Uso |
|---|---|
| `bg`, `bgElevated`, `bgPanel` | Superficies: fondo, elevado, panel glass |
| `stroke`, `strokeHolo` | Bordes sutiles y borde/glow holográfico |
| `text`, `textDim` | Texto principal y secundario |
| `accent`, `accent2`, `accent3` | Tríada de acento (glow, rings, partículas) |
| `danger`, `warn`, `ok` | Semánticos |

### `glass`

| Clave | Rango | Uso |
|---|---|---|
| `opacity` | 0.05–1 | Opacidad del panel |
| `blurRadius` | 0–64 px | `backdrop-filter: blur()` |
| `saturation` | 0–2 | `backdrop-filter: saturate()` |
| `borderRadius` | 0–32 px | Radio de paneles |
| `noise` / `scanlines` | bool | Texturas CRT del backdrop |

### `typography`

Stacks de fuentes (`display`, `body`, `mono`) y `scale` global (0.5–2).

### `motion`

`enabled`, `intensity` (0–1, escala las duraciones), `panelGlow` (0–1).

### `holo`

`grid` + `gridOpacity`, `particles` (`none | dust | matrix | orbit`),
`waveform`, `vignette`.

### `sounds`

Reservado para packs de sonido (v0.2+).

## Ciclo de vida

1. **Repositorio:** los packs insignia viven en `themes/` (fuente única).
2. **Build:** `scripts/sync-themes.ts` los copia a `ui/public/themes/` + genera
   `index.json`; `d82-core` los embebe con `include_str!`.
3. **Runtime:** comandos `list_themes` / `load_theme` / `switch_theme`
   (embebidos + descubiertos en `<appdata>/themes/`).
4. **Validación en CI:** `bun run validate:themes` + `cargo test -p d82-core`.

## Crear un pack

```bash
cp themes/minimal.d82theme.json themes/mypack.d82theme.json
# edita id, name, paleta...
bun run validate:themes
```
