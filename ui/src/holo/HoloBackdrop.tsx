import { useEffect, useRef } from "react";
import { useTheme } from "../themes/ThemeProvider";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
}

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  glyphs: string[];
}

/**
 * The holographic layer: animated wallpaper gradient, grid, particle field,
 * scanlines, noise and vignette — all driven by the active theme pack.
 */
export function HoloBackdrop() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mode = theme?.holo.particles ?? "none";
  const motionOn = theme?.motion.enabled ?? true;

  useEffect(() => {
    if (mode === "none" || !motionOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let disposed = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--d82-accent").trim() || "#22d3ee";
    const accent2 =
      getComputedStyle(document.documentElement).getPropertyValue("--d82-accent-2").trim() || "#a78bfa";

    if (mode === "dust" || mode === "orbit") {
      const particles: Particle[] = Array.from({ length: 90 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.8 + 0.4,
        hue: Math.random(),
      }));
      const angleOffset = Math.random() * Math.PI * 2;

      const drawOrbit = (t: number) => {
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.42;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          const r = 120 + ((p.size * 400) % Math.min(canvas.width, canvas.height) * 0.3);
          const a = t * 0.00012 * (p.vx || 1) + angleOffset + p.hue * Math.PI * 2;
          p.x = cx + Math.cos(a) * r;
          p.y = cy + Math.sin(a) * r * 0.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = (p.hue > 0.5 ? accent : accent2) + "55";
          ctx.fill();
        }
      };

      const drawDust = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = (p.hue > 0.5 ? accent : accent2) + "40";
          ctx.fill();
        }
      };

      const loop = (t: number) => {
        if (disposed) return;
        if (mode === "orbit") drawOrbit(t);
        else drawDust();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else if (mode === "matrix") {
      const glyphs = "01アイウエオカキクケコ".split("");
      const columns: MatrixColumn[] = [];
      const colW = 22;
      const count = Math.ceil(canvas.width / colW);
      for (let i = 0; i < count; i++) {
        columns.push({
          x: i * colW,
          y: Math.random() * canvas.height,
          speed: 0.6 + Math.random() * 1.6,
          glyphs: Array.from({ length: 18 }, () => glyphs[Math.floor(Math.random() * glyphs.length)]),
        });
      }
      const loop = () => {
        if (disposed) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "12px monospace";
        for (const col of columns) {
          col.y += col.speed;
          if (col.y > canvas.height + 200) col.y = -200;
          col.glyphs.forEach((g, i) => {
            const alpha = Math.max(0, 0.5 - i * 0.028);
            ctx.fillStyle = accent + Math.round(alpha * 255).toString(16).padStart(2, "0");
            ctx.fillText(g, col.x, col.y - i * 14);
          });
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode, motionOn]);

  return (
    <div className="holo-backdrop" aria-hidden="true">
      {theme?.holo.grid && <div className="holo-backdrop__grid" />}
      {mode !== "none" && motionOn && <canvas ref={canvasRef} className="holo-backdrop__particles" />}
      {theme?.holo.vignette && <div className="holo-backdrop__vignette" />}
      {theme?.glass.scanlines && <div className="holo-backdrop__scanlines" />}
      {theme?.glass.noise && <div className="holo-backdrop__noise" />}
    </div>
  );
}
