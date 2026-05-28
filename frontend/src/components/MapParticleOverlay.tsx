import { useEffect, useRef } from 'react';

/**
 * Elegant slow orbital particles around the map border.
 * No collision — just serene, firefly-like drifting light points.
 */
export function MapParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    interface Orb {
      angle: number;
      radiusX: number;
      radiusY: number;
      speed: number;
      size: number;
      opacity: number;
      hue: number;
      trail: { x: number; y: number }[];
      wobbleAmp: number;
      wobbleFreq: number;
      wobblePhase: number;
    }

    const orbs: Orb[] = [];
    const COUNT = 16;
    let W = 0, H = 0, cx = 0, cy = 0;
    let frame = 0;

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      W = rect.width;
      H = rect.height;
      canvas.width = W;
      canvas.height = H;
      cx = W / 2;
      cy = H / 2;
      initOrbs();
    }

    function initOrbs() {
      orbs.length = 0;
      const rx = W / 2 - 12;
      const ry = H / 2 - 12;

      for (let i = 0; i < COUNT; i++) {
        const angle = (i / COUNT) * Math.PI * 2;
        orbs.push({
          angle,
          radiusX: rx * (0.85 + i * 0.008),
          radiusY: ry * (0.85 + i * 0.008),
          speed: 0.0006 + i * 0.00012,
          size: 0.8 + (i % 4) * 0.4,
          opacity: 0.2 + (i % 3) * 0.1,
          hue: 198,
          trail: [],
          wobbleAmp: 0.01 + (i % 5) * 0.008,
          wobbleFreq: 1.8 + (i % 3) * 0.6,
          wobblePhase: i * 0.4,
        });
      }
    }

    // Cache static orbit rings on an offscreen canvas
    let ringsCache: HTMLCanvasElement | null = null;
    function getRingsBg(): HTMLCanvasElement {
      if (ringsCache && ringsCache.width === W && ringsCache.height === H) return ringsCache;
      ringsCache = document.createElement('canvas');
      ringsCache.width = W; ringsCache.height = H;
      const rc = ringsCache.getContext('2d')!;
      for (let r = 0.78; r <= 0.94; r += 0.08) {
        rc.beginPath();
        rc.ellipse(cx, cy, (W/2-12)*r, (H/2-12)*r, 0, 0, Math.PI*2);
        rc.strokeStyle = 'rgba(0,180,255,0.01)';
        rc.lineWidth = 0.5;
        rc.stroke();
      }
      return ringsCache;
    }

    function draw() {
      frame++;
      if (frame % 2 !== 0) { requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(getRingsBg(), 0, 0);

      // ── Update & draw orbs (lightweight rendering) ──
      for (const o of orbs) {
        o.angle += o.speed;
        if (o.angle > Math.PI * 200) o.angle -= Math.PI * 200; // prevent float drift

        const wobble = Math.sin(frame * 0.008 * o.wobbleFreq + o.wobblePhase) * o.wobbleAmp;
        const rx = o.radiusX * (1 + wobble);
        const ry = o.radiusY * (1 + wobble * 0.7);

        const x = cx + Math.cos(o.angle) * rx;
        const y = cy + Math.sin(o.angle) * ry;

        // Short trail (3 points)
        o.trail.push({ x, y });
        if (o.trail.length > 4) o.trail.shift();

        // Draw trail (simple line segments — cheap)
        for (let t = 1; t < o.trail.length; t++) {
          const alpha = (t / o.trail.length) * o.opacity * 0.25;
          ctx.beginPath();
          ctx.moveTo(o.trail[t-1].x, o.trail[t-1].y);
          ctx.lineTo(o.trail[t].x, o.trail[t].y);
          ctx.strokeStyle = `rgba(0,200,255,${alpha})`;
          ctx.lineWidth = o.size * 0.4;
          ctx.stroke();
        }

        // Core dot (simple — no radial gradient)
        ctx.beginPath();
        ctx.arc(x, y, o.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,220,255,${o.opacity + 0.15})`;
        ctx.fill();

        // Soft outer glow (single circle, low opacity)
        ctx.beginPath();
        ctx.arc(x, y, o.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,180,255,${o.opacity * 0.18})`;
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: 0.8 }} />
  );
}
