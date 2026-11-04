import { MemoryStick } from "lucide-react";
import { useMetrics } from "../ipc/useMetrics";
import { Ring, Sparkline } from "./primitives";

function gb(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1);
}

/** Level 2 widget — memory pressure: ring, absolute usage, history. */
export function RamWidget() {
  const { snapshot, ramHistory } = useMetrics(1000, 60);
  const percent = snapshot?.memPercent ?? 0;

  return (
    <div className="widget" role="group" aria-label="Memory usage">
      <div className="widget__label">
        <MemoryStick size={11} /> RAM
      </div>
      <div className="widget__row">
        <Ring percent={percent} size={72} color="var(--d82-accent-2, #a78bfa)">
          <span className="widget__value" style={{ fontSize: 16 }}>
            {percent.toFixed(0)}
            <small>%</small>
          </span>
        </Ring>
        <div style={{ flex: 1, minWidth: 0, alignSelf: "flex-end" }}>
          <div
            className="widget__value"
            style={{ fontSize: 15, textAlign: "right", marginBottom: 4 }}
          >
            {snapshot ? gb(snapshot.memUsedBytes) : "--"}
            <small>/ {snapshot ? gb(snapshot.memTotalBytes) : "--"} GB</small>
          </div>
          <Sparkline data={ramHistory} height={26} color="var(--d82-accent-2, #a78bfa)" />
        </div>
      </div>
    </div>
  );
}
