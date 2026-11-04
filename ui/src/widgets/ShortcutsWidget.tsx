import { useEffect, useState } from "react";
import { Pencil, Plus, Rocket, RotateCcw, X } from "lucide-react";
import bridge from "../ipc/bridge";

interface LaunchItem {
  label: string;
  href: string;
}

const STORAGE_KEY = "d82.launchpad";

const DEFAULTS: LaunchItem[] = [
  { label: "GitHub", href: "https://github.com/rtostudioco/divisiont82" },
  { label: "Themes", href: "https://github.com/rtostudioco/divisiont82/tree/main/themes" },
  { label: "Roadmap", href: "https://github.com/rtostudioco/divisiont82/blob/main/docs/roadmap.md" },
  { label: "Serpantinum", href: "https://serpantinum.dev" },
  { label: "Tauri", href: "https://tauri.app" },
];

function loadItems(): LaunchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as LaunchItem[];
    if (!Array.isArray(parsed)) return DEFAULTS;
    return parsed.filter(
      (i) => typeof i.label === "string" && typeof i.href === "string" && i.label.length > 0,
    );
  } catch {
    return DEFAULTS;
  }
}

function persistItems(items: LaunchItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* private mode */
  }
}

/**
 * Level 2 widget — editable launchpad.
 *
 * Tiles are persisted in localStorage; in the packaged shell they open in the
 * user's default browser via the opener plugin (http(s) only, enforced by the
 * Rust command).
 */
export function ShortcutsWidget() {
  const [items, setItems] = useState<LaunchItem[]>(() => loadItems());
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftHref, setDraftHref] = useState("");

  useEffect(() => persistItems(items), [items]);

  const open = (item: LaunchItem) => {
    void bridge.openTarget(item.href).catch(() => window.open(item.href, "_blank", "noopener,noreferrer"));
  };

  const add = () => {
    const label = draftLabel.trim();
    const href = draftHref.trim();
    if (!label || !(href.startsWith("http://") || href.startsWith("https://"))) return;
    setItems((list) => [...list, { label, href }]);
    setDraftLabel("");
    setDraftHref("");
  };

  const remove = (index: number) => {
    setItems((list) => list.filter((_, i) => i !== index));
  };

  const reset = () => {
    setItems(DEFAULTS);
    setEditing(false);
  };

  return (
    <div className="widget" role="group" aria-label="Launchpad">
      <div className="widget__label">
        <Rocket size={11} /> LAUNCHPAD
        <button
          className={`launch__edit-btn ${editing ? "launch__edit-btn--on" : ""}`}
          onClick={() => setEditing((e) => !e)}
          aria-pressed={editing}
          title="Edit tiles"
        >
          <Pencil size={10} />
        </button>
        {editing && (
          <button className="launch__edit-btn" onClick={reset} title="Restore defaults">
            <RotateCcw size={10} />
          </button>
        )}
      </div>

      <div className="launch__grid">
        {items.map((item, i) => (
          <div key={`${item.href}-${i}`} className="launch__cell">
            <button className="launch__item" onClick={() => open(item)} title={item.href}>
              <span className="launch__badge" aria-hidden="true">{item.label.slice(0, 1).toUpperCase()}</span>
              <span>{item.label}</span>
            </button>
            {editing && (
              <button className="launch__x" onClick={() => remove(i)} aria-label={`Remove ${item.label}`}>
                <X size={9} />
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="launch__add">
          <input
            className="launch__input"
            placeholder="Label"
            value={draftLabel}
            maxLength={18}
            onChange={(e) => setDraftLabel(e.target.value)}
          />
          <input
            className="launch__input launch__input--wide"
            placeholder="https://…"
            value={draftHref}
            onChange={(e) => setDraftHref(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="launch__add-btn" onClick={add} disabled={!draftLabel.trim() || !draftHref.trim()}>
            <Plus size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
