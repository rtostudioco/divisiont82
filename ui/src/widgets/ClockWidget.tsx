import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

interface ClockWidgetProps {
  settings?: { seconds?: boolean; format?: "12h" | "24h" };
}

/** Level 2 widget — local time with optional seconds. */
export function ClockWidget({ settings }: ClockWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const use24 = settings?.format !== "12h";
  const hh = use24
    ? now.getHours().toString().padStart(2, "0")
    : (() => {
        const h = now.getHours() % 12 || 12;
        return h.toString().padStart(2, "0");
      })();
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");

  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="widget widget--clock" role="timer" aria-label="Local time">
      <div className="widget__label">
        <Clock3 size={11} /> LOCAL TIME
      </div>
      <div className="widget__time">
        {hh}:{mm}
        {settings?.seconds !== false && <span className="sec">:{ss}</span>}
      </div>
      <div className="widget__date">{date}</div>
    </div>
  );
}
