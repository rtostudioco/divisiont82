import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Ghost, Minus, Pin } from "lucide-react";
import bridge from "../ipc/bridge";

interface PanelProps {
  id: string;
  title: string;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  visible: boolean;
  storageKey: string;
  children: ReactNode;
}

interface Position {
  x: number;
  y: number;
}

const EDGE_SNAP = 26;

function loadPosition(key: string, fallback: Position): Position {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw) as Position;
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * A floating holographic panel: frameless glass card with a draggable header,
 * edge snapping and position persistence. In the packaged shell each visible
 * panel is backed by a real always-on-top transparent window (see
 * `src-tauri/src/commands/panels.rs`); the drag logic here mirrors the
 * user-side experience and stores geometry for the host.
 */
export function Panel({
  id,
  title,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  visible,
  storageKey,
  children,
}: PanelProps) {
  const [pos, setPos] = useState<Position>(() => loadPosition(storageKey, { x: initialX, y: initialY }));
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [ghost, setGhost] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`d82.ct.${id}`) === "1";
    } catch {
      return false;
    }
  });
  const [snapHint, setSnapHint] = useState(false);
  const [entering, setEntering] = useState(true);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) setEntering(true);
  }, [visible]);

  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => setEntering(false), 600);
    return () => clearTimeout(t);
  }, [entering]);

  const persist = useCallback(
    (p: Position) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const toggleGhost = () => {
    const next = !ghost;
    setGhost(next);
    try {
      localStorage.setItem(`d82.ct.${id}`, next ? "1" : "0");
    } catch {
      /* private mode */
    }
    void bridge.setClickThrough(id, next).catch(() => undefined);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    let nx = e.clientX - drag.dx;
    let ny = e.clientY - drag.dy;
    const el = panelRef.current;
    const w = el?.offsetWidth ?? 300;
    const h = el?.offsetHeight ?? 200;
    nx = Math.min(window.innerWidth - 60, Math.max(-w + 90, nx));
    ny = Math.min(window.innerHeight - 70, Math.max(0, ny));

    const nearEdge = nx < EDGE_SNAP || ny < EDGE_SNAP || nx > window.innerWidth - w - EDGE_SNAP;
    setSnapHint(nearEdge);

    // Magnetic edge snap
    if (nx < EDGE_SNAP) nx = EDGE_SNAP;
    if (ny < EDGE_SNAP) ny = EDGE_SNAP;
    if (nx > window.innerWidth - w - EDGE_SNAP) nx = window.innerWidth - w - EDGE_SNAP;
    if (ny > window.innerHeight - h - 80) ny = window.innerHeight - h - 80;

    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setSnapHint(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    persist(pos);
  };

  if (!visible) return null;

  return (
    <section
      ref={panelRef}
      className={[
        "holo-panel",
        snapHint ? "holo-panel--snap-hint" : "",
        entering ? "holo-panel--enter" : "",
        ghost ? "holo-panel--ghost" : "",
      ].join(" ")}
      style={{ left: pos.x, top: pos.y, width: initialWidth, height: collapsed ? "auto" : initialHeight }}
      aria-label={`Panel ${title}`}
    >
      <div
        className="holo-panel__header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="holo-panel__dot" aria-hidden="true" />
        <span className="holo-panel__title">{title}</span>
        <button
          className="holo-panel__btn"
          onClick={() => setPinned((p) => !p)}
          title={pinned ? "Always on top (pinned)" : "Float below windows"}
          aria-pressed={pinned}
        >
          <Pin size={12} style={{ opacity: pinned ? 1 : 0.35 }} />
        </button>
        <button
          className="holo-panel__btn"
          onClick={toggleGhost}
          title={ghost ? "Click-through ON (Tauri) — clicks pass through" : "Enable click-through (Tauri)"}
          aria-pressed={ghost}
        >
          <Ghost size={12} style={{ opacity: ghost ? 1 : 0.35 }} />
        </button>
        <button className="holo-panel__btn" onClick={() => setCollapsed((c) => !c)} title="Collapse">
          <Minus size={12} style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform .2s" }} />
        </button>
      </div>
      <div className={collapsed ? "holo-panel__body holo-panel__body--collapsed" : "holo-panel__body"}>
        {children}
      </div>
    </section>
  );
}
