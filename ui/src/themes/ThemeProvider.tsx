import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ThemePack } from "../types";
import bridge from "../ipc/bridge";

interface ThemeContextValue {
  theme: ThemePack | null;
  themes: ThemePack[];
  setTheme: (id: string) => void;
  loading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  themes: [],
  setTheme: () => undefined,
  loading: true,
  error: null,
});

/** Flattens a pack into `--d82-*` CSS custom properties on <html>. */
export function applyThemeVars(pack: ThemePack): void {
  const root = document.documentElement;
  const p = pack.palette;
  const vars: Array<[string, string]> = [
    ["--d82-bg", p.bg],
    ["--d82-bg-elevated", p.bgElevated],
    ["--d82-bg-panel", p.bgPanel],
    ["--d82-stroke", p.stroke],
    ["--d82-stroke-holo", p.strokeHolo],
    ["--d82-text", p.text],
    ["--d82-text-dim", p.textDim],
    ["--d82-accent", p.accent],
    ["--d82-accent-2", p.accent2],
    ["--d82-accent-3", p.accent3],
    ["--d82-danger", p.danger],
    ["--d82-warn", p.warn],
    ["--d82-ok", p.ok],
    ["--d82-glass-opacity", String(pack.glass.opacity)],
    ["--d82-glass-blur", `${pack.glass.blurRadius}px`],
    ["--d82-glass-saturation", String(pack.glass.saturation)],
    ["--d82-radius", `${pack.glass.borderRadius}px`],
    ["--d82-font-display", pack.typography.display],
    ["--d82-font-body", pack.typography.body],
    ["--d82-font-mono", pack.typography.mono],
    ["--d82-scale", String(pack.typography.scale)],
    ["--d82-motion-intensity", String(pack.motion.intensity)],
    ["--d82-panel-glow", String(pack.motion.panelGlow)],
    ["--d82-grid-opacity", String(pack.holo.gridOpacity)],
  ];
  for (const [k, v] of vars) root.style.setProperty(k, v);
  root.dataset.d82Theme = pack.id;
  root.dataset.d82Mode = pack.appearance.mode;
  root.dataset.d82Particles = pack.holo.particles;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<ThemePack[]>([]);
  const [theme, setThemeState] = useState<ThemePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const packs = await bridge.listThemes();
        if (!alive) return;
        setThemes(packs);
        const saved = await bridge.activeTheme();
        const next = packs.find((p) => p.id === saved) ?? packs[0] ?? null;
        setThemeState(next);
        if (next) applyThemeVars(next);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setTheme = useCallback(
    (id: string) => {
      const next = themes.find((t) => t.id === id);
      if (!next) return;
      setThemeState(next);
      applyThemeVars(next);
      try {
        localStorage.setItem("d82.theme", id);
      } catch {
        /* private mode */
      }
      void bridge.switchTheme(id).catch(() => undefined);
    },
    [themes],
  );

  const value = useMemo(
    () => ({ theme, themes, setTheme, loading, error }),
    [theme, themes, setTheme, loading, error],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
