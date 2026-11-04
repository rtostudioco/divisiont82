import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** Level 2 widget — month calendar with today highlighted. */
export function CalendarWidget() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysPrev = new Date(year, month, 0).getDate();

    const out: Array<{ day: number; other: boolean }> = [];
    for (let i = firstDow - 1; i >= 0; i--) out.push({ day: daysPrev - i, other: true });
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d, other: false });
    while (out.length % 7 !== 0 || out.length < 42) {
      out.push({ day: out.length - firstDow - daysInMonth + 1, other: true });
      if (out.length >= 42) break;
    }
    return out.slice(0, 42);
  }, [cursor]);

  const isToday = (cell: { day: number; other: boolean }) =>
    !cell.other &&
    cell.day === today.getDate() &&
    cursor.getMonth() === today.getMonth() &&
    cursor.getFullYear() === today.getFullYear();

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="widget" role="group" aria-label="Calendar">
      <div className="widget__label">
        <CalendarDays size={11} /> CALENDAR
      </div>
      <div className="cal">
        <div className="cal__head">
          <button
            className="cal__nav"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft size={13} />
          </button>
          <span className="cal__month">{monthLabel}</span>
          <button
            className="cal__nav"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight size={13} />
          </button>
        </div>
        {DOW.map((d, i) => (
          <span key={`dow-${i}`} className="cal__dow">{d}</span>
        ))}
        {cells.map((cell, i) => (
          <span
            key={`d-${i}`}
            className={[
              "cal__day",
              cell.other ? "cal__day--other" : "",
              isToday(cell) ? "cal__day--today" : "",
            ].join(" ")}
            aria-current={isToday(cell) ? "date" : undefined}
          >
            {cell.day}
          </span>
        ))}
      </div>
    </div>
  );
}
