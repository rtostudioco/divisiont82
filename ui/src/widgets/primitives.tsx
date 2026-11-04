interface RingProps {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}

/** Circular progress ring used by the gauge widgets. */
export function Ring({ percent, size = 74, stroke = 6, color, children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg className="widget__ring" width={size} height={size}>
        <circle
          className="widget__ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={r}
        />
        <circle
          className="widget__ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={color ? { stroke: color } : undefined}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
}

/** Lightweight SVG sparkline (no canvas, no deps). */
export function Sparkline({ data, height = 34, color }: SparklineProps) {
  const w = 100;
  const h = height;
  if (data.length < 2) {
    return <svg className="widget__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  }
  const max = Math.max(100, ...data);
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 4) - 2).toFixed(2)}`);
  const line = points.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const stroke = color ?? "var(--d82-accent, #22d3ee)";

  return (
    <svg className="widget__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill={stroke} opacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
