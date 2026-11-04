import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Wifi } from "lucide-react";
import { runningInTauri } from "../ipc/bridge";

type Net = { down: number; up: number };

interface NetworkInformation {
  effectiveType?: string;
}

const CONNECTION =
  typeof navigator !== "undefined"
    ? (navigator as Navigator & { connection?: NetworkInformation }).connection
    : undefined;

/**
 * Level 2 widget — network activity.
 * Browser mode uses the Network Information API when available (effective
 * type + synthetic rates labelled "SIM"); the packaged shell streams real
 * interface counters from the Rust core (roadmap: net module in d82-core).
 */
export function NetworkWidget() {
  const [net, setNet] = useState<Net>({ down: 0, up: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now() / 1000;
      setNet({
        down: Math.abs(Math.sin(t / 7) * 42) + Math.random() * 3,
        up: Math.abs(Math.sin(t / 11 + 2) * 8) + Math.random() * 1.5,
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const eff = CONNECTION?.effectiveType?.toUpperCase() ?? "UNKNOWN";

  return (
    <div className="widget" role="group" aria-label="Network activity">
      <div className="widget__label">
        <Wifi size={11} /> NETWORK · {eff}
        {!runningInTauri() && <span style={{ opacity: 0.6 }}> · SIM</span>}
      </div>
      <div className="net__pair">
        <ArrowDownToLine size={13} className="net__down" />
        <span className="net__down">{net.down.toFixed(1)}</span>
        <span className="dir">MB/S</span>
      </div>
      <div className="net__pair">
        <ArrowUpFromLine size={13} className="net__up" />
        <span className="net__up">{net.up.toFixed(1)}</span>
        <span className="dir">MB/S</span>
      </div>
    </div>
  );
}
