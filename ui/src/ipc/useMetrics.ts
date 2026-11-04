import { useEffect, useRef, useState } from "react";
import type { MetricsSnapshot } from "../types";
import bridge from "./bridge";

/**
 * Polls the metrics backend and keeps a rolling history for sparklines.
 * Works against the real Rust collector (Tauri) and the mock backend (browser).
 */
export function useMetrics(intervalMs = 1000, historySize = 60) {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const cpuHistory = useRef<number[]>([]);
  const ramHistory = useRef<number[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const snap = await bridge.metrics();
        if (!alive) return;
        cpuHistory.current = [...cpuHistory.current, snap.cpuAvgPercent].slice(-historySize);
        ramHistory.current = [...ramHistory.current, snap.memPercent].slice(-historySize);
        setSnapshot(snap);
        setTick((t) => t + 1);
      } catch {
        // backend hiccup — keep previous state
      }
    };

    poll();
    timer = setInterval(poll, intervalMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [intervalMs, historySize]);

  return { snapshot, cpuHistory: cpuHistory.current, ramHistory: ramHistory.current, tick };
}
