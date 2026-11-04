import { useEffect, useRef, useState } from "react";
import { Cpu, CloudSun, CalendarDays, Clock3, Rocket, Palette, Wifi } from "lucide-react";
import { useTheme } from "../themes/ThemeProvider";

interface DockProps {
  openPanels: Record<string, boolean>;
  togglePanel: (id: string) => void;
}

const PANEL_BUTTONS = [
  { id: "panel-system", icon: Cpu, label: "SYSTEM" },
  { id: "panel-time", icon: Clock3, label: "CHRONO" },
  { id: "panel-env", icon: CloudSun, label: "ENVIRONMENT" },
  { id: "panel-launch", icon: Rocket, label: "LAUNCHPAD" },
];

/**
 * Floating holo dock: panel switches + theme pack switcher.
 */
export function Dock({ openPanels, togglePanel }: DockProps) {
  const { themes, theme, setTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  return (
    <nav className="holo-dock" aria-label="DivisionT82 dock">
      {PANEL_BUTTONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`holo-dock__btn ${openPanels[id] ? "holo-dock__btn--active" : ""}`}
          onClick={() => togglePanel(id)}
          aria-pressed={openPanels[id]}
          aria-label={`Toggle ${label} panel`}
        >
          <Icon size={17} />
          <span className="holo-dock__tooltip">{label}</span>
        </button>
      ))}

      <div className="holo-dock__sep" />

      <button
        className={`holo-dock__btn ${pickerOpen ? "holo-dock__btn--active" : ""}`}
        onClick={() => setPickerOpen((o) => !o)}
        aria-expanded={pickerOpen}
        aria-label="Switch theme pack"
      >
        <Palette size={17} />
        <span className="holo-dock__tooltip">THEME PACK</span>
      </button>

      <button className="holo-dock__btn" aria-label="Network status" onClick={() => togglePanel("panel-env")}>
        <Wifi size={17} />
        <span className="holo-dock__tooltip">NETWORK</span>
      </button>

      <button
        className="holo-dock__btn"
        aria-label="Calendar"
        onClick={() => togglePanel("panel-time")}
      >
        <CalendarDays size={17} />
        <span className="holo-dock__tooltip">CALENDAR</span>
      </button>

      {pickerOpen && (
        <div className="holo-dock__popover" ref={popoverRef} role="menu" aria-label="Theme packs">
          <div className="holo-dock__popover-title">THEME PACKS · .d82theme</div>
          {themes.map((pack) => (
            <button
              key={pack.id}
              role="menuitemradio"
              aria-checked={theme?.id === pack.id}
              className={`holo-theme-item ${theme?.id === pack.id ? "holo-theme-item--active" : ""}`}
              onClick={() => {
                setTheme(pack.id);
                setPickerOpen(false);
              }}
            >
              <span
                className="holo-theme-item__swatch"
                style={{
                  background: `linear-gradient(135deg, ${pack.palette.accent}, ${pack.palette.accent2})`,
                }}
              />
              <span className="holo-theme-item__name">{pack.name.replace("DivisionT82 / ", "")}</span>
              <span className="holo-theme-item__id">v{pack.version}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
