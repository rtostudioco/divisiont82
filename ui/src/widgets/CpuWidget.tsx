import { Activity } from "lucide-react";
import { useMetrics } from "../ipc/useMetrics";
import { Ring, Sparkline } from "./primitives";

/** Level 2 widget — processor load: average ring, sparkline, per-core bars. */
export function CpuWidget() {
  const { snapshot, cpuHistory } = useMetrics(1000, 60);
  const avg = snapshot?.cpuAvgPercent ?? 0;

  return (
    <div className="widget" role="group" aria-label="CPU usage">
      <div className="widget__label">
        <Activity size={11} /> CPU
      </div>
      <div className="widget__row">
        <Ring percent={avg} size={72}>
          <span className="widget__value" style={{ fontSize: 16 }}>
            {avg.toFixed(0)}
            <small>%</small>
          </span>
        </Ring>
        <div style={{ flex: 1, minWidth: 0, alignSelf: "flex-end" }}>
          <Sparkline data={cpuHistory} height={44} />
        </div>
      </div>
      <div className="widget__cores" aria-hidden="true">
        {(snapshot?.cpuCores ?? []).map((core) => (
          <div
            key={core.name}
            className="widget__core-bar"
            style={{ height: `${Math.max(4, core.usagePercent)}%` }}
            title={`${core.name}: ${core.usagePercent.toFixed(0)}%`}
          />
        ))}
      </div>
    </div>
  );
}
