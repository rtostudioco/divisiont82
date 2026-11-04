# Contributing to DivisionT82

## Setup

```bash
bun install
bun run test:all   # themes + mcp + typecheck + build
cargo test -p d82-core
```

## Ground rules

1. **Shell, not OS** — never add features that manage keybinds, monitors or the taskbar.
2. **Themes are data** — no code in `.d82theme` files; extend the schema instead.
3. **Core stays framework-free** — `crates/d82-core` must never depend on Tauri.
4. **Every layer tested** — new packs must pass the validator; new core logic needs unit tests.

## Commit style

Conventional Commits: `feat(theme): ...`, `fix(widgets): ...`, `docs: ...`.

## PR checklist

- [ ] `bun run test:all` passes
- [ ] `cargo test -p d82-core` passes
- [ ] New theme packs validate and respect WCAG AA text contrast
- [ ] No new heavyweight dependencies without discussion
