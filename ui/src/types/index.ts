/** Mirrors `d82_core::theme::ThemePack` (camelCase via serde). */
export interface ThemePack {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  appearance: {
    mode: "dark" | "light";
    wallpaper: { mode: "system" | "gradient" | "asset"; asset: string | null };
  };
  palette: {
    bg: string;
    bgElevated: string;
    bgPanel: string;
    stroke: string;
    strokeHolo: string;
    text: string;
    textDim: string;
    accent: string;
    accent2: string;
    accent3: string;
    danger: string;
    warn: string;
    ok: string;
  };
  glass: {
    opacity: number;
    blurRadius: number;
    saturation: number;
    borderRadius: number;
    noise: boolean;
    scanlines: boolean;
  };
  typography: {
    display: string;
    body: string;
    mono: string;
    scale: number;
  };
  motion: {
    enabled: boolean;
    intensity: number;
    panelGlow: number;
  };
  holo: {
    grid: boolean;
    gridOpacity: number;
    particles: "none" | "dust" | "matrix" | "orbit";
    waveform: boolean;
    vignette: boolean;
  };
  sounds: {
    enabled: boolean;
    pack: string | null;
  };
}

/** Mirrors `d82_core::sys::MetricsSnapshot`. */
export interface MetricsSnapshot {
  cpuAvgPercent: number;
  cpuCores: Array<{ name: string; usagePercent: number }>;
  memTotalBytes: number;
  memUsedBytes: number;
  memPercent: number;
  collectedAtMs: number;
}

/** Mirrors `d82_core::widgets::Layout` / `Panel` / `WidgetInstance`. */
export interface WidgetInstance {
  id: string;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  settings: Record<string, unknown>;
}

export interface Panel {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  widgets: WidgetInstance[];
}

export interface Layout {
  name: string;
  themeId: string;
  panels: Panel[];
}
