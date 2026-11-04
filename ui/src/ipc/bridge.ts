/**
 * DivisionT82 IPC bridge.
 *
 * One API surface, two backends:
 * - **Tauri**: every call is proxied to the Rust shell via `invoke`.
 * - **Mock**: when the UI runs in a plain browser (dev, demo, CI), a
 *   simulated backend keeps everything interactive. Metrics are synthetic
 *   waveforms; themes are fetched from `/themes/*.json` (synced from the
 *   root `themes/` directory by `scripts/sync-themes.ts`).
 *
 * This file is what makes the exact same frontend runnable as the desktop
 * shell AND as the public web demo.
 */
import type { Layout, MetricsSnapshot, ThemePack } from "../types";

const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const runningInTauri = (): boolean => IS_TAURI;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

// ---------------------------------------------------------------------------
// Mock backend
// ---------------------------------------------------------------------------

const CORES = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
const BOOT = Date.now();

function wave(t: number, base: number, amp: number, periodMs: number, phase: number): number {
  const v = base + amp * Math.sin((t / periodMs) * Math.PI * 2 + phase);
  const jitter = amp * 0.18 * Math.sin(t / 97 + phase * 3.7);
  return Math.min(100, Math.max(1, v + jitter));
}

function mockMetrics(): MetricsSnapshot {
  const t = Date.now() - BOOT;
  const cpuCores = Array.from({ length: CORES }, (_, i) => ({
    name: `CPU${i}`,
    usagePercent: Math.round(wave(t, 22 + (i % 4) * 9, 16, 17_000 + i * 3_100, i * 1.3) * 10) / 10,
  }));
  const cpuAvgPercent =
    Math.round((cpuCores.reduce((acc, c) => acc + c.usagePercent, 0) / CORES) * 10) / 10;
  const memTotalBytes = 16 * 1024 ** 3;
  const memPercent = wave(t, 46, 8, 61_000, 0.8);
  return {
    cpuAvgPercent,
    cpuCores,
    memTotalBytes,
    memUsedBytes: Math.round((memPercent / 100) * memTotalBytes),
    memPercent,
    collectedAtMs: Date.now(),
  };
}

function mockLayout(): Layout {
  return {
    name: "default",
    themeId: "obsidian",
    panels: [
      {
        id: "panel-system",
        title: "SYSTEM",
        x: 48, y: 64, width: 340, height: 260, collapsed: false,
        widgets: [
          { id: "sys-cpu", kind: "cpu", x: 0, y: 0, width: 1, height: 1, settings: { history: 60 } },
          { id: "sys-ram", kind: "ram", x: 1, y: 0, width: 1, height: 1, settings: {} },
        ],
      },
      {
        id: "panel-time",
        title: "CHRONO",
        x: 420, y: 64, width: 300, height: 260, collapsed: false,
        widgets: [
          { id: "time-clock", kind: "clock", x: 0, y: 0, width: 1, height: 1, settings: { seconds: true, format: "24h" } },
          { id: "time-calendar", kind: "calendar", x: 0, y: 1, width: 1, height: 1, settings: {} },
        ],
      },
      {
        id: "panel-env",
        title: "ENVIRONMENT",
        x: 760, y: 64, width: 300, height: 260, collapsed: false,
        widgets: [
          { id: "env-weather", kind: "weather", x: 0, y: 0, width: 1, height: 1, settings: { lat: 4.71, lon: -74.07, city: "Bogotá" } },
          { id: "env-net", kind: "network", x: 0, y: 1, width: 1, height: 1, settings: {} },
        ],
      },
      {
        id: "panel-launch",
        title: "LAUNCHPAD",
        x: 48, y: 380, width: 340, height: 200, collapsed: false,
        widgets: [
          { id: "launch-shortcuts", kind: "shortcuts", x: 0, y: 0, width: 1, height: 1, settings: {} },
        ],
      },
    ],
  };
}

async function fetchPacks(): Promise<ThemePack[]> {
  const res = await fetch("/themes/index.json");
  if (!res.ok) throw new Error(`theme index unavailable (${res.status})`);
  const index = (await res.json()) as { packs: string[] };
  const packs = await Promise.all(
    index.packs.map(async (file) => {
      const r = await fetch(`/themes/${file}`);
      if (!r.ok) throw new Error(`failed to load ${file}`);
      return (await r.json()) as ThemePack;
    }),
  );
  return packs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface Bridge {
  listThemes(): Promise<ThemePack[]>;
  switchTheme(id: string): Promise<ThemePack | null>;
  activeTheme(): Promise<string>;
  metrics(): Promise<MetricsSnapshot>;
  layout(): Promise<Layout>;
  saveLayout(_layout: Layout): Promise<void>;
  resetLayout(): Promise<Layout>;
  openPanel(_panelId: string): Promise<void>;
  closePanel(_panelId: string): Promise<void>;
}

const bridge: Bridge = IS_TAURI
  ? {
      listThemes: () => tauriInvoke<ThemePack[]>("list_themes"),
      switchTheme: (id) => tauriInvoke<ThemePack>("switch_theme", { id }),
      activeTheme: () => tauriInvoke<string>("active_theme"),
      metrics: () => tauriInvoke<MetricsSnapshot>("metrics_snapshot"),
      layout: () => tauriInvoke<Layout>("load_layout"),
      saveLayout: (layout) => tauriInvoke<void>("save_layout", { layout }),
      resetLayout: () => tauriInvoke<Layout>("reset_layout"),
      openPanel: (panelId) => tauriInvoke<void>("open_panel", { id: panelId, title: panelId, x: 80, y: 80, width: 360, height: 280 }),
      closePanel: (panelId) => tauriInvoke<void>("close_panel", { id: panelId }),
    }
  : {
      listThemes: fetchPacks,
      switchTheme: async (id) => {
        const packs = await fetchPacks();
        return packs.find((p) => p.id === id) ?? null;
      },
      activeTheme: async () => localStorage.getItem("d82.theme") ?? "obsidian",
      metrics: async () => mockMetrics(),
      layout: async () => mockLayout(),
      saveLayout: async () => undefined,
      resetLayout: async () => mockLayout(),
      openPanel: async () => undefined,
      closePanel: async () => undefined,
    };

export default bridge;
