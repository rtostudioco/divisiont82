import { useCallback, useEffect, useRef, useState } from "react";
import bridge, { runningInTauri, SHELL_VERSION } from "./ipc/bridge";
import { ThemeProvider, useTheme } from "./themes/ThemeProvider";
import { HoloBackdrop } from "./holo/HoloBackdrop";
import { Panel } from "./holo/Panel";
import { Dock } from "./holo/Dock";
import { WIDGET_REGISTRY } from "./widgets";
import type { Layout } from "./types";

function HoloShell() {
  const { loading, error, theme, themes, setTheme } = useTheme();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [holoHidden, setHoloHidden] = useState(false);

  const openRef = useRef(openPanels);
  useEffect(() => {
    openRef.current = openPanels;
  }, [openPanels]);
  const collapsedRef = useRef<Record<string, boolean> | null>(null);

  useEffect(() => {
    let alive = true;
    bridge
      .layout()
      .then((l) => {
        if (!alive) return;
        setLayout(l);
        const init: Record<string, boolean> = {};
        for (const p of l.panels) init[p.id] = true;
        setOpenPanels(init);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const togglePanel = useCallback((id: string) => {
    setOpenPanels((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  /**
   * Global shortcut actions (Rust emits `d82://shortcut` with one of these).
   * The same actions are reachable from the dock buttons.
   */
  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "toggle-panels": {
          const current = openRef.current;
          const ids = Object.keys(current);
          if (ids.length === 0) break;
          const anyOpen = Object.values(current).some(Boolean);
          if (anyOpen) {
            collapsedRef.current = { ...current };
            setOpenPanels(Object.fromEntries(ids.map((id) => [id, false])));
          } else {
            setOpenPanels(
              collapsedRef.current ??
                Object.fromEntries(ids.map((id) => [id, true])),
            );
          }
          break;
        }
        case "cycle-theme": {
          if (!theme || themes.length === 0) break;
          const idx = themes.findIndex((t) => t.id === theme.id);
          const next = themes[(idx + 1) % themes.length];
          if (next) setTheme(next.id);
          break;
        }
        case "toggle-holo":
          setHoloHidden((h) => !h);
          break;
        case "toggle-mcp":
          void (async () => {
            try {
              const status = await bridge.mcpStatus();
              if (status.running) await bridge.mcpStop();
              else await bridge.mcpStart();
            } catch {
              /* the AI Core panel surfaces the error */
            } finally {
              window.dispatchEvent(new CustomEvent("d82.mcp.status"));
            }
          })();
          break;
        default:
          break;
      }
    },
    [theme, themes, setTheme],
  );

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;
    bridge
      .listenShortcuts((action) => handleAction(action))
      .then((u) => {
        if (alive) unlisten = u;
        else u();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      unlisten?.();
    };
  }, [handleAction]);

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "monospace",
          color: "var(--d82-danger, #fb4d5c)",
        }}
        role="alert"
      >
        DIVISIONT82 · THEME ENGINE ERROR: {error}
      </div>
    );
  }

  if (loading || !theme) {
    return (
      <div
        style={{
          height: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--d82-font-mono, monospace)",
          letterSpacing: "0.4em",
          color: "var(--d82-text-dim, #7c8b94)",
        }}
        aria-busy="true"
      >
        INITIALIZING HOLO LAYER…
      </div>
    );
  }

  return (
    <div className="holo-desktop">
      {!holoHidden && (
        <>
          <HoloBackdrop />

          <header className="holo-brand">
            <span className="holo-brand__mark">D82</span>
            <span className="holo-brand__name">DIVISIONT82</span>
            <span className="holo-brand__ver">
              v{SHELL_VERSION} · {theme.name.replace("DivisionT82 / ", "")} ·{" "}
              {runningInTauri() ? "SHELL" : "WEB-DEMO"}
            </span>
          </header>

          {layout?.panels.map((panel) => (
            <Panel
              key={panel.id}
              id={panel.id}
              title={panel.title}
              initialX={panel.x}
              initialY={panel.y}
              initialWidth={panel.width}
              initialHeight={panel.height}
              visible={openPanels[panel.id] ?? false}
              storageKey={`d82.panel.${panel.id}`}
            >
              {panel.widgets.map((w) => {
                const Widget = WIDGET_REGISTRY[w.kind];
                return Widget ? <Widget key={w.id} settings={w.settings} /> : null;
              })}
            </Panel>
          ))}

          <Dock
            openPanels={openPanels}
            togglePanel={togglePanel}
            onToggleHolo={() => setHoloHidden(true)}
          />
        </>
      )}

      {holoHidden && (
        <button className="holo-hint" onClick={() => setHoloHidden(false)}>
          HOLO PAUSED — click or ctrl+alt+v to restore
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HoloShell />
    </ThemeProvider>
  );
}
