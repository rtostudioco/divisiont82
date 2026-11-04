import { useEffect, useState } from "react";
import bridge from "./ipc/bridge";
import { runningInTauri } from "./ipc/bridge";
import { ThemeProvider, useTheme } from "./themes/ThemeProvider";
import { HoloBackdrop } from "./holo/HoloBackdrop";
import { Panel } from "./holo/Panel";
import { Dock } from "./holo/Dock";
import { WIDGET_REGISTRY } from "./widgets";
import type { Layout } from "./types";

function HoloShell() {
  const { loading, error, theme } = useTheme();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});

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

  const togglePanel = (id: string) =>
    setOpenPanels((s) => ({ ...s, [id]: !s[id] }));

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
      <HoloBackdrop />

      <header className="holo-brand">
        <span className="holo-brand__mark">D82</span>
        <span className="holo-brand__name">DIVISIONT82</span>
        <span className="holo-brand__ver">
          v0.1.0 · {theme.name.replace("DivisionT82 / ", "")} · {runningInTauri() ? "SHELL" : "WEB-DEMO"}
        </span>
      </header>

      {layout?.panels.map((panel) => (
        <Panel
          key={panel.id}
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

      <Dock openPanels={openPanels} togglePanel={togglePanel} />
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
