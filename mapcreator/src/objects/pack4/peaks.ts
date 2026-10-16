import { rgb, type RGB } from '../util';
import { clamp, lerp, mixc, rf, type G } from './common';

/** Tegner bjerge som malede tinder set skråt oppefra: lys flade mod øverst til venstre, skyggeflade mod nederst til højre, kamme, render og sne. */

export interface Palette {
  lo: RGB;
  mid: RGB;
  hi: RGB;
  /** Fodbakker (nedre dele), græs eller grus. */
  foot: RGB;
}

export const PAL: Record<string, Palette> = {
  grey: { lo: [58, 62, 78], mid: [124, 124, 130], hi: [214, 212, 206], foot: [96, 104, 76] },
  brown: { lo: [60, 42, 32], mid: [128, 98, 70], hi: [214, 180, 136], foot: [110, 98, 60] },
  red: { lo: [84, 34, 30], mid: [168, 84, 56], hi: [238, 160, 112], foot: [138, 92, 56] },
  dark: { lo: [22, 20, 28], mid: [64, 60, 66], hi: [138, 128, 124], foot: [52, 46, 44] },
  sand: { lo: [110, 80, 54], mid: [192, 156, 108], hi: [244, 222, 172], foot: [180, 152, 104] },
};

type P = [number, number];
type Rnd = () => number;

/** Brudt linje med forskydning vinkelret på linjen (midtpunktsforskydning). Inkluderer begge ender. */
export function jag(r: Rnd, a: P, b: P, amp: number, depth = 3): P[] {
  if (depth <= 0) return [a, b];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const k = (r() - 0.5) * 2 * amp * len;
  const m: P = [mx - (dy / len) * k, my + (dx / len) * k];
  const left = jag(r, a, m, amp * 0.72, depth - 1);
  const right = jag(r, m, b, amp * 0.72, depth - 1);
  return [...left, ...right.slice(1)];
}

export interface PeakSpec {
  cx: number;
  /** Y for fodens midte (nederste kant af flankerne). */
  baseY: number;
  hw: number;
  ht: number;
  /** Græsklædt fod og ingen sne (forbjerge). */
  foothill?: boolean;
  /** Sne 0..1. */
  snow: number;
  /** Hvor meget toppen læner til siden (andel af hw). */
  lean?: number;
  /** Ujævnhed af silhuetten (0.1-0.3). */
  rough?: number;
}

const trace = (g: G, pts: P[]): void => {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath();
};

const lit = (c: RGB, t: number): RGB => mixc(c, [255, 250, 235], t);

/** Én tinde. `pal` giver stenens farver. */
export function drawPeak(g: G, r: Rnd, s: PeakSpec, pal: Palette): void {
  const { cx, baseY, hw, ht } = s;
  const rough = s.rough ?? 0.16;
  const A: P = [cx + (s.lean ?? rf(r, -0.12, 0.12)) * hw, baseY - ht];
  const L: P = [cx - hw, baseY + rf(r, -0.04, 0.06) * hw];
  const R: P = [cx + hw * rf(r, 0.92, 1.05), baseY + rf(r, -0.06, 0.05) * hw];
  const M: P = [cx + rf(r, -0.2, 0.3) * hw, baseY + hw * rf(r, 0.14, 0.24)];
  const edgeL = jag(r, A, L, rough, 3);
  const edgeR = jag(r, A, R, rough, 3);
  const ridge = jag(r, A, M, rough * 0.7, 3);
  const baseL = jag(r, L, M, 0.07, 2);
  const baseR = jag(r, M, R, 0.07, 2);
  const faceL = [...edgeL, ...baseL.slice(1), ...ridge.slice(0, -1).reverse()];
  const faceR = [...ridge, ...baseR.slice(1), ...edgeR.slice(0, -1).reverse()];

  const footMix = s.foothill ? 0.78 : 0.42;
  const foot = s.foothill ? mixc(pal.foot, [84, 120, 54], 0.55) : pal.foot;
  const lightFace = (g2: G): CanvasGradient => {
    const gr = g2.createLinearGradient(A[0] - hw * 0.5, A[1], L[0] + hw * 0.4, baseY + hw * 0.2);
    gr.addColorStop(0, rgb(lit(pal.hi, 0.12)));
    gr.addColorStop(0.45, rgb(mixc(pal.mid, pal.hi, 0.55)));
    gr.addColorStop(0.85, rgb(mixc(pal.mid, foot, footMix * 0.6)));
    gr.addColorStop(1, rgb(mixc(pal.mid, foot, footMix)));
    return gr;
  };
  const darkFace = (g2: G): CanvasGradient => {
    const gr = g2.createLinearGradient(A[0], A[1], R[0] + hw * 0.1, baseY + hw * 0.2);
    gr.addColorStop(0, rgb(mixc(pal.mid, pal.lo, 0.55)));
    gr.addColorStop(0.6, rgb(mixc(pal.lo, pal.mid, 0.2)));
    gr.addColorStop(1, rgb(mixc(mixc(pal.lo, foot, footMix * 0.8), [10, 8, 10], 0.15)));
    return gr;
  };

  const faces: { pts: P[]; fill: (g2: G) => CanvasGradient; sideLit: boolean }[] = [
    { pts: faceL, fill: lightFace, sideLit: true },
    { pts: faceR, fill: darkFace, sideLit: false },
  ];
  const snowY = A[1] + ht * (0.12 + 0.72 * s.snow);
  const ph1 = r() * 6;
  const ph2 = r() * 6;
  const snowLine = (x: number): number => snowY + ht * 0.07 * (Math.sin(x * 0.07 + ph1) + 0.6 * Math.sin(x * 0.19 + ph2));
  const gullyCount = clamp(Math.round(hw / 18), 3, 9);
  for (const f of faces) {
    g.save();
    trace(g, f.pts);
    g.fillStyle = f.fill(g);
    g.fill();
    g.clip();
    // riller og kamme: smalle tilspidsede furer fra toppen mod foden
    const base = f.sideLit ? baseL : baseR;
    const starts: { s: P; b: P }[] = [];
    for (let i = 0; i < gullyCount; i++) {
      const u = (i + 0.3 + r() * 0.5) / gullyCount;
      const b = base[Math.min(base.length - 1, Math.max(0, Math.round(u * (base.length - 1))))]!;
      const bb: P = [lerp(b[0], base[Math.min(base.length - 1, Math.round(u * (base.length - 1)) + 1)]![0], 0.5), b[1]];
      const t0 = rf(r, 0.0, 0.32);
      starts.push({ s: [A[0] + (bb[0] - A[0]) * t0, A[1] + (bb[1] - A[1]) * t0], b: bb });
    }
    // flutes: skiftevis lyse og mørke kiler mellem rillerne
    for (let i = 0; i + 1 < starts.length; i++) {
      const a = starts[i]!;
      const b = starts[i + 1]!;
      g.fillStyle = i % 2 ? `rgba(255,246,222,${f.sideLit ? 0.13 : 0.05})` : `rgba(12,8,16,${f.sideLit ? 0.1 : 0.16})`;
      trace(g, [a.s, a.b, b.b, b.s]);
      g.fill();
    }
    // lys og skyggekant på selve fladens kamme
    g.lineCap = 'round';
    for (const { s: st, b } of starts) {
      const line = jag(r, st, b, 0.05, 3);
      const draw = (ox: number, oy: number, col: string, w0: number): void => {
        g.beginPath();
        line.forEach((p, i) => (i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)));
        g.strokeStyle = col;
        g.lineWidth = w0;
        g.stroke();
      };
      draw(0, 0, f.sideLit ? 'rgba(18,12,20,.34)' : 'rgba(10,6,14,.4)', Math.max(1, hw / 40));
      draw(-1, -0.6, f.sideLit ? 'rgba(255,248,226,.2)' : 'rgba(210,200,230,.1)', Math.max(0.8, hw / 70));
    }
    // struktur: korte skråstreger (sprækker og afskalninger) i fladens retning
    for (let i = 0; i < 22; i++) {
      const t = r();
      const x = lerp(f.sideLit ? L[0] : A[0], f.sideLit ? A[0] : R[0], r());
      const y = A[1] + (baseY - A[1]) * (0.12 + 0.88 * t);
      const len = hw * rf(r, 0.06, 0.16);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * len * 0.8, y + len);
      g.strokeStyle = r() < 0.5 ? `rgba(14,8,10,${0.12 + r() * 0.14})` : `rgba(255,244,220,${f.sideLit ? 0.1 + r() * 0.1 : 0.05})`;
      g.lineWidth = 0.8 + r() * 1.4;
      g.stroke();
    }
    // klippelag: tynde vandrette bånd med let hældning
    for (let i = 0; i < 7; i++) {
      const yy = A[1] + ht * (0.18 + r() * 0.8);
      g.beginPath();
      g.moveTo(cx - hw, yy);
      g.lineTo(cx + hw, yy + (r() - 0.4) * hw * 0.2);
      g.strokeStyle = `rgba(20,12,8,${0.05 + r() * 0.06})`;
      g.lineWidth = 0.8 + r() * 1.6;
      g.stroke();
    }
    // sne over snelinjen og tunger ned langs rillerne
    if (s.snow > 0.02 && !s.foothill) {
      const top = A[1] - 4;
      const sx0 = cx - hw * 1.1;
      const sx1 = cx + hw * 1.1;
      g.beginPath();
      g.moveTo(sx0, top);
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const x = lerp(sx0, sx1, i / n);
        g.lineTo(x, snowLine(x));
      }
      g.lineTo(sx1, top);
      g.closePath();
      const sg = g.createLinearGradient(A[0] - hw * 0.4, A[1], A[0] + hw * 0.3, snowY + ht * 0.1);
      if (f.sideLit) {
        sg.addColorStop(0, 'rgba(255,255,255,.98)');
        sg.addColorStop(1, 'rgba(214,228,246,.96)');
      } else {
        sg.addColorStop(0, 'rgba(196,212,238,.96)');
        sg.addColorStop(1, 'rgba(132,152,196,.94)');
      }
      g.fillStyle = sg;
      g.fill();
      for (const { s: st, b } of starts) {
        if (r() < 0.35) continue;
        const sy = snowLine(st[0] + (b[0] - st[0]) * 0.3);
        const len = ht * rf(r, 0.1, 0.26);
        const dx = b[0] - st[0];
        const dy = b[1] - st[1];
        const dl = Math.hypot(dx, dy) || 1;
        const t1 = clamp((sy - st[1]) / (dy || 1), 0, 1);
        const px = st[0] + dx * t1;
        const py = st[1] + dy * t1;
        g.beginPath();
        g.moveTo(px, py - 3);
        g.lineTo(px + (dx / dl) * len + rf(r, -2, 2), py + (dy / dl) * len);
        g.strokeStyle = f.sideLit ? 'rgba(250,252,255,.9)' : 'rgba(176,196,228,.9)';
        g.lineWidth = Math.max(1.4, hw / 28);
        g.stroke();
      }
      // skygge under snelinjen
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const x = lerp(sx0, sx1, i / n);
        if (i) g.lineTo(x, snowLine(x) + 1.5);
        else g.moveTo(x, snowLine(x) + 1.5);
      }
      g.strokeStyle = 'rgba(30,38,70,.26)';
      g.lineWidth = Math.max(1, hw / 30);
      g.stroke();
    }
    // mørkere i bunden (ambient occlusion mod foden)
    const ao = g.createLinearGradient(0, baseY - ht * 0.18, 0, baseY + hw * 0.22);
    ao.addColorStop(0, 'rgba(14,8,6,0)');
    ao.addColorStop(1, f.sideLit ? 'rgba(14,8,6,.3)' : 'rgba(10,6,6,.42)');
    g.fillStyle = ao;
    g.fillRect(cx - hw * 1.2, baseY - ht * 0.18, hw * 2.4, ht * 0.18 + hw * 0.3);
    // græs og grus ved foden
    if (s.foothill) {
      for (let i = 0; i < 26; i++) {
        const x = lerp(L[0], R[0], r());
        const y = baseY + hw * rf(r, -0.15, 0.2) - ht * Math.pow(r(), 2) * 0.5;
        g.fillStyle = rgb(mixc([74, 112, 50], [118, 142, 70], r()), 0.4);
        g.beginPath();
        g.ellipse(x, y, hw * rf(r, 0.05, 0.12), hw * rf(r, 0.03, 0.07), 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }
  // kontur og lys kant
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const outline = [...edgeL, ...baseL.slice(1), ...baseR.slice(1), ...edgeR.slice(0, -1).reverse()];
  trace(g, outline);
  g.strokeStyle = 'rgba(22,12,8,.82)';
  g.lineWidth = Math.max(1.4, hw / 30);
  g.stroke();
  g.beginPath();
  edgeL.forEach((p, i) => (i ? g.lineTo(p[0] + 1.4, p[1] + 1.8) : g.moveTo(p[0] + 1.4, p[1] + 1.8)));
  g.strokeStyle = 'rgba(255,248,226,.32)';
  g.lineWidth = Math.max(1, hw / 50);
  g.stroke();
  g.beginPath();
  ridge.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.strokeStyle = 'rgba(22,12,8,.5)';
  g.lineWidth = Math.max(1, hw / 45);
  g.stroke();
}
