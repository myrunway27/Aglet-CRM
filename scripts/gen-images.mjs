/**
 * Generates the site's imagery as composed scenes via headless canvas.
 *   node scripts/gen-images.mjs   →  assets/img/*.jpg
 *
 * Original generated graphics (the sandbox has no image-host access).
 * Deterministic seeds — rebuilds are stable. Swap any file for a real
 * photograph (keep the filename) and rebuild.
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/img");
mkdirSync(OUT, { recursive: true });

const SPECS = [
  { name: "hero",        w: 1800, h: 1100, style: "office" },
  { name: "svc-code",    w: 900,  h: 675,  style: "code" },
  { name: "svc-cloud",   w: 900,  h: 675,  style: "corridor" },
  { name: "svc-sec",     w: 900,  h: 675,  style: "circuit" },
  { name: "svc-ai",      w: 900,  h: 675,  style: "neural" },
  { name: "svc-ops",     w: 900,  h: 675,  style: "ops" },
  { name: "dz-research", w: 900,  h: 765,  style: "research" },
  { name: "dz-strategy", w: 900,  h: 765,  style: "strategy" },
  { name: "dz-identity", w: 900,  h: 765,  style: "identity" },
  { name: "dz-launch",   w: 1800, h: 690,  style: "horizon" },
];

const DRAW = String(function draw(ctx, W, H, style, rand) {
  let s = rand;
  const R = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const T = (a) => "rgba(44,177,188," + a + ")";
  const TL = (a) => "rgba(95,203,211," + a + ")";
  const glow = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + rgb + "," + a + ")"); g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const finish = (dark) => {
    ctx.filter = "none"; ctx.globalCompositeOperation = "source-over";
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .78);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, dark ? "rgba(4,7,7,.55)" : "rgba(30,40,40,.18)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 1100; i++) {
      ctx.fillStyle = "rgba(255,255,255," + (R() * .02) + ")";
      ctx.fillRect(R() * W, R() * H, 1, 1);
    }
  };

  /* ============================================== HERO: office at night */
  if (style === "office") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0C1112"); g.addColorStop(.55, "#101617"); g.addColorStop(1, "#0A0F10");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // window wall with city bokeh behind
    ctx.filter = "blur(9px)";
    for (let i = 0; i < 70; i++) {
      const x = R() * W, y = H * .06 + R() * H * .4;
      const warm = R() < .4;
      glow(x, y, 4 + R() * 16, warm ? "224,190,140" : "120,200,205", .1 + R() * .3);
    }
    ctx.filter = "none";
    ctx.strokeStyle = "rgba(6,9,9,.9)"; ctx.lineWidth = 10;
    for (let x = W * .04; x < W; x += W / 11) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * .52); ctx.stroke(); }
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, H * .3); ctx.lineTo(W, H * .3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H * .52); ctx.lineTo(W, H * .52); ctx.stroke();
    // wall below window line
    ctx.fillStyle = "rgba(10,14,15,.85)"; ctx.fillRect(0, H * .52, W, H * .48);

    // pendant lights
    for (let i = 0; i < 7; i++) {
      const x = W * (.1 + i * .13) + R() * 30, y = H * (.1 + R() * .1);
      ctx.strokeStyle = "rgba(200,210,210,.12)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      glow(x, y + 6, 26, "235,220,180", .5); glow(x, y + 6, 90, "235,220,180", .1);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#F4E8CC"; ctx.beginPath(); ctx.arc(x, y + 6, 4.5, 0, 7); ctx.fill();
    }

    // desk rows: far (blurred) then near
    const desk = (cx, cy, sc, blur) => {
      ctx.filter = blur ? "blur(" + blur + "px)" : "none";
      const dw = 300 * sc, dh = 14 * sc;
      // monitors
      const n = R() < .5 ? 2 : 1;
      for (let m = 0; m < n; m++) {
        const mw = 108 * sc, mh = 66 * sc;
        const mx = cx - (n === 2 ? (m === 0 ? mw + 8 * sc : -8 * sc) : mw / 2);
        const my = cy - dh - mh - 8 * sc;
        ctx.globalCompositeOperation = "lighter";
        glow(mx + mw / 2, my + mh / 2, mw * 1.15, "120,210,215", .16);
        ctx.globalCompositeOperation = "source-over";
        const sg = ctx.createLinearGradient(0, my, 0, my + mh);
        sg.addColorStop(0, "rgba(190,235,238,.92)"); sg.addColorStop(1, "rgba(90,170,178,.8)");
        ctx.fillStyle = "rgba(8,11,11,.95)"; ctx.fillRect(mx - 3 * sc, my - 3 * sc, mw + 6 * sc, mh + 6 * sc);
        ctx.fillStyle = sg; ctx.fillRect(mx, my, mw, mh);
        for (let l = 0; l < 5; l++) { // code lines on screen
          ctx.fillStyle = "rgba(20,45,48," + (.25 + R() * .3) + ")";
          ctx.fillRect(mx + 6 * sc, my + (8 + l * 10) * sc, mw * (.3 + R() * .5), 3 * sc);
        }
      }
      // seated silhouette: back to camera, head breaking the screen's top edge
      if (R() < .8) {
        const px = cx, topY = cy - dh - 68 * sc;
        const hy = topY + 4 * sc;
        ctx.fillStyle = "rgba(5,8,8,.97)";
        ctx.beginPath(); ctx.ellipse(px, topY + 52 * sc, 44 * sc, 40 * sc, 0, Math.PI, 0); ctx.fill(); // shoulders over lower screen
        ctx.beginPath(); ctx.arc(px, hy, 20 * sc, 0, 7); ctx.fill();               // head above screen line
        ctx.strokeStyle = TL(.45); ctx.lineWidth = 2 * sc;                          // screen rim light on head
        ctx.beginPath(); ctx.arc(px, hy, 20 * sc, 0.35, 2.8); ctx.stroke();
      }
      // desktop
      ctx.fillStyle = "rgba(14,19,20,.98)"; ctx.fillRect(cx - dw / 2, cy - dh, dw, dh);
      ctx.fillStyle = "rgba(3,5,5,.9)"; ctx.fillRect(cx - dw / 2, cy, dw, 90 * sc);
      ctx.filter = "none";
    };
    for (let i = 0; i < 5; i++) desk(W * (.14 + i * .19) + R() * 20, H * .66, .78, 2.2); // far row
    for (let i = 0; i < 4; i++) desk(W * (.1 + i * .27) + R() * 24, H * .88, 1.15, 0);   // near row

    // foreground bokeh + haze
    ctx.filter = "blur(14px)";
    for (let i = 0; i < 8; i++) glow(R() * W, H * (.75 + R() * .25), 20 + R() * 46, R() < .5 ? "235,220,180" : "120,205,210", .12 + R() * .12);
    ctx.filter = "none";
    glow(W * .68, H * .42, W * .45, "44,177,188", .07);
    finish(true);
  }

  /* ===================================================== SERVICE CARDS */
  if (style === "code") {
    ctx.fillStyle = "#0E1414"; ctx.fillRect(0, 0, W, H);
    const band = (y0, y1, blur, alpha) => {
      ctx.filter = blur ? "blur(" + blur + "px)" : "none";
      ctx.font = "600 19px monospace";
      for (let c = 0; c < W / 17; c++) for (let r = y0 / 27; r < y1 / 27; r++) {
        if (R() < .5) continue;
        const d = R();
        ctx.fillStyle = d > .9 ? TL(alpha) : d > .7 ? T(alpha * .5) : "rgba(190,205,205," + alpha * .18 + ")";
        ctx.fillText("{}[]<>/=+*;:._#%&$01"[Math.floor(R() * 20)], c * 17, r * 27);
      }
      ctx.filter = "none";
    };
    band(0, H * .3, 5, .5); band(H * .3, H * .68, 0, .95); band(H * .68, H, 5, .5);
    ctx.globalCompositeOperation = "lighter"; glow(W * .32, H * .46, W * .5, "44,177,188", .12);
    ctx.globalCompositeOperation = "source-over";
    finish(true);
  }

  if (style === "corridor") {
    ctx.fillStyle = "#0B1112"; ctx.fillRect(0, 0, W, H);
    const vx = W * .5, vy = H * .44;
    // ceiling light strip
    ctx.globalCompositeOperation = "lighter";
    for (let i = 1; i < 9; i++) {
      const t = i / 9, y = vy - (vy) * (1 - t) * .9, hw = (1 - t) * W * .18 + 8;
      glow(vx, y, hw, "170,225,228", .1 + t * .06);
    }
    ctx.globalCompositeOperation = "source-over";
    // racks
    const rack = (side) => {
      for (let i = 0; i < 8; i++) {
        const t = i / 8, d = Math.pow(1 - t, 1.7);
        const x = side ? vx - 30 - d * (vx - 20) : vx + 30 + d * (vx - 20);
        const rw = 14 + d * 66, top = vy - d * H * .3, bot = vy + d * H * .62;
        ctx.filter = d > .55 ? "none" : "blur(" + ((0.55 - d) * 5) + "px)";
        ctx.fillStyle = "rgba(13,19,20," + (.6 + d * .4) + ")";
        ctx.fillRect(side ? x - rw : x, top, rw, bot - top);
        for (let L = 0; L < 16; L++) {
          if (R() < .35) continue;
          const ly = top + (bot - top) * (L / 16) + 4;
          ctx.fillStyle = R() < .82 ? T(.3 + R() * .6) : "rgba(240,250,250," + (.3 + R() * .5) + ")";
          const sz = .8 + d * 2.6; ctx.fillRect((side ? x - rw : x) + rw * (.15 + R() * .7), ly, sz, sz);
        }
      }
      ctx.filter = "none";
    };
    rack(true); rack(false);
    // floor reflection
    const fg = ctx.createLinearGradient(0, vy, 0, H);
    fg.addColorStop(0, T(.12)); fg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fg; ctx.beginPath();
    ctx.moveTo(vx - 26, vy); ctx.lineTo(vx + 26, vy); ctx.lineTo(vx + W * .3, H); ctx.lineTo(vx - W * .3, H); ctx.fill();
    glow(vx, vy, W * .3, "95,203,211", .2);
    finish(true);
  }

  if (style === "circuit") {
    ctx.fillStyle = "#0C1213"; ctx.fillRect(0, 0, W, H);
    // central chip
    const cw = W * .3, chx = W * .5 - cw / 2, chy = H * .5 - cw / 2;
    ctx.lineCap = "round";
    // traces radiating manhattan-style
    for (let i = 0; i < 44; i++) {
      const fromChip = i < 22;
      let x = fromChip ? chx + R() * cw : R() * W, y = fromChip ? chy + R() * cw : R() * H;
      const bright = R() > .7;
      ctx.filter = bright ? "none" : "blur(1.2px)";
      ctx.strokeStyle = bright ? T(.6) : T(.1 + R() * .15);
      ctx.lineWidth = bright ? 2.6 : 1.4;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let sg = 0; sg < 4; sg++) {
        const len = 46 + R() * 150;
        if (R() < .5) x += (R() < .5 ? -1 : 1) * len; else y += (R() < .5 ? -1 : 1) * len;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = bright ? "#5FCBD3" : T(.4);
      ctx.beginPath(); ctx.arc(x, y, bright ? 4.6 : 2.6, 0, 7); ctx.fill();
      if (bright) { ctx.globalCompositeOperation = "lighter"; glow(x, y, 26, "95,203,211", .3); ctx.globalCompositeOperation = "source-over"; }
    }
    ctx.filter = "none";
    ctx.fillStyle = "#131B1C"; ctx.fillRect(chx, chy, cw, cw);
    ctx.strokeStyle = TL(.8); ctx.lineWidth = 2; ctx.strokeRect(chx, chy, cw, cw);
    for (let p = 0; p < 12; p++) { // pins
      const t = chx + 10 + (cw - 20) * (p / 11);
      ctx.fillStyle = TL(.7);
      ctx.fillRect(t, chy - 8, 3, 8); ctx.fillRect(t, chy + cw, 3, 8);
    }
    ctx.globalCompositeOperation = "lighter"; glow(W * .5, H * .5, cw, "44,177,188", .22);
    ctx.globalCompositeOperation = "source-over";
    // infinity etch on the chip
    ctx.strokeStyle = TL(.9); ctx.lineWidth = 5; ctx.beginPath();
    const cx0 = W * .5, cy0 = H * .5, rr = cw * .14;
    ctx.arc(cx0 - rr, cy0, rr, 0, Math.PI * 2); ctx.moveTo(cx0 + rr * 2, cy0);
    ctx.arc(cx0 + rr, cy0, rr, 0, Math.PI * 2); ctx.stroke();
    finish(true);
  }

  if (style === "neural") {
    ctx.fillStyle = "#0C1213"; ctx.fillRect(0, 0, W, H);
    const P = [];
    for (let i = 0; i < 52; i++) {
      const core = R() < .4;
      P.push({ x: core ? W * (.3 + R() * .4) : R() * W, y: core ? H * (.3 + R() * .4) : R() * H, r: 1.6 + R() * 3.6, core });
    }
    ctx.filter = "blur(.6px)";
    for (const a of P) for (const b of P) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 30 && d < W * .17) {
        ctx.strokeStyle = T((a.core && b.core ? .3 : .13) * (1 - d / (W * .17)));
        ctx.lineWidth = a.core && b.core ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.filter = "none";
    for (const p of P) {
      const hot = p.core && R() > .5;
      ctx.fillStyle = hot ? "#7FDDE4" : T(.55);
      ctx.beginPath(); ctx.arc(p.x, p.y, hot ? p.r * 1.7 : p.r, 0, 7); ctx.fill();
      if (hot) { ctx.globalCompositeOperation = "lighter"; glow(p.x, p.y, 36, "95,203,211", .35); ctx.globalCompositeOperation = "source-over"; }
    }
    ctx.globalCompositeOperation = "lighter"; glow(W * .5, H * .48, W * .42, "44,177,188", .14);
    ctx.globalCompositeOperation = "source-over";
    finish(true);
  }

  if (style === "ops") {
    ctx.fillStyle = "#0C1112"; ctx.fillRect(0, 0, W, H);
    // wall of panels with slight perspective darkening at edges
    const cols = 4, rows = 3, gx = W / cols, gy = (H * .78) / rows;
    for (let cx2 = 0; cx2 < cols; cx2++) for (let cy2 = 0; cy2 < rows; cy2++) {
      const x0 = cx2 * gx + 12, y0 = cy2 * gy + 12, pw = gx - 24, ph = gy - 24;
      ctx.fillStyle = "rgba(16,23,24,.95)"; ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = T(.25); ctx.strokeRect(x0, y0, pw, ph);
      const kind = (cx2 + cy2) % 3;
      if (kind === 0) {
        ctx.strokeStyle = TL(.85); ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= 22; i++) ctx.lineTo(x0 + 8 + i * (pw - 16) / 22, y0 + ph * (.72 - R() * .48));
        ctx.stroke();
        const ag = ctx.createLinearGradient(0, y0, 0, y0 + ph); ag.addColorStop(0, T(.2)); ag.addColorStop(1, T(0));
        ctx.fillStyle = ag; ctx.fillRect(x0 + 6, y0 + ph * .3, pw - 12, ph * .66);
      } else if (kind === 1) {
        for (let i = 0; i < 9; i++) { const bh = ph * (.15 + R() * .58); ctx.fillStyle = T(.3 + R() * .5); ctx.fillRect(x0 + 8 + i * (pw - 16) / 9, y0 + ph - 8 - bh, (pw - 16) / 9 - 4, bh); }
      } else {
        for (let i = 0; i < 7; i++) { ctx.fillStyle = "rgba(190,205,205," + (.1 + R() * .14) + ")"; ctx.fillRect(x0 + 8, y0 + 10 + i * (ph - 18) / 7, (pw - 16) * (.3 + R() * .65), 3.2); }
        if (R() < .5) { ctx.fillStyle = "rgba(226,115,63,.8)"; ctx.fillRect(x0 + 8, y0 + 10 + Math.floor(R() * 7) * (ph - 18) / 7, 26, 3.2); }
      }
    }
    // desk + silhouette in front
    ctx.fillStyle = "#070B0B"; ctx.fillRect(0, H * .82, W, H * .18);
    const px = W * .62;
    ctx.fillStyle = "rgba(6,9,9,.98)";
    ctx.beginPath(); ctx.arc(px, H * .74, 34, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px, H * .9, 72, 62, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = TL(.4); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, H * .74, 34, -0.7, 0.8); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; glow(W * .5, H * .32, W * .5, "44,177,188", .1);
    ctx.globalCompositeOperation = "source-over";
    finish(true);
  }

  /* ============================== DESIGN & MARKETING (light section) */
  const lightGround = () => {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#F2F4F4"); g.addColorStop(1, "#E2E8E8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const wl = ctx.createLinearGradient(0, 0, W * .7, H * .4);   // window light
    wl.addColorStop(0, "rgba(255,255,255,.85)"); wl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wl; ctx.fillRect(0, 0, W, H);
  };
  const card = (x, y, w2, h2, rot, fill) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.shadowColor = "rgba(40,60,60,.28)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
    ctx.fillStyle = fill; ctx.fillRect(-w2 / 2, -h2 / 2, w2, h2);
    ctx.shadowColor = "transparent"; ctx.restore();
  };

  if (style === "research") {
    lightGround();
    // desk surface
    ctx.fillStyle = "#D8DEDE"; ctx.fillRect(0, H * .72, W, H * .28);
    // laptop: screen with dark dashboard
    const sw = W * .62, sh = H * .52, sx = W * .19, sy = H * .16;
    ctx.shadowColor = "rgba(40,60,60,.35)"; ctx.shadowBlur = 34; ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#10191A"; ctx.fillRect(sx - 12, sy - 12, sw + 24, sh + 24);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#122022"; ctx.fillRect(sx, sy, sw, sh);
    // chart grid + area line on screen
    ctx.strokeStyle = "rgba(200,215,215,.1)";
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(sx, sy + sh * i / 6); ctx.lineTo(sx + sw, sy + sh * i / 6); ctx.stroke(); }
    const pts = []; let yy = sy + sh * .62;
    for (let i = 0; i <= 24; i++) { yy += (R() - .55) * sh * .07; yy = Math.max(sy + sh * .16, Math.min(sy + sh * .86, yy)); pts.push([sx + sw * i / 24, yy]); }
    const ag = ctx.createLinearGradient(0, sy, 0, sy + sh); ag.addColorStop(0, T(.5)); ag.addColorStop(1, T(0));
    ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(sx, sy + sh);
    for (const [px2, py2] of pts) ctx.lineTo(px2, py2); ctx.lineTo(sx + sw, sy + sh); ctx.fill();
    ctx.strokeStyle = "#5FCBD3"; ctx.lineWidth = 3.4; ctx.beginPath();
    for (const [px2, py2] of pts) ctx.lineTo(px2, py2); ctx.stroke();
    const [ex, ey] = pts[19];
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 5.4, 0, 7); ctx.fill();
    glow(ex, ey, 30, "95,203,211", .5);
    // stat chips on screen
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(240,248,248,.09)"; ctx.fillRect(sx + 14 + i * (sw / 3.3), sy + 12, sw / 3.8, 34);
      ctx.fillStyle = TL(.9); ctx.fillRect(sx + 22 + i * (sw / 3.3), sy + 36, sw / 9, 4);
    }
    // laptop base + notebook and cup on desk
    ctx.fillStyle = "#C9D1D1"; ctx.fillRect(sx - 40, sy + sh + 12, sw + 80, 16);
    card(W * .82, H * .84, 140, 96, .08, "#FFFFFF");
    ctx.fillStyle = "#2CB1BC"; ctx.beginPath(); ctx.arc(W * .11, H * .85, 34, 0, 7); ctx.fill();
    ctx.fillStyle = "#F2F4F4"; ctx.beginPath(); ctx.arc(W * .11, H * .85, 26, 0, 7); ctx.fill();
    finish(false);
  }

  if (style === "strategy") {
    lightGround();
    // wall of sticky notes in brand palette, thread connecting a path
    const cols2 = ["#2CB1BC", "#5FCBD3", "#BFE9EC", "#FFFFFF", "#E8D9A0", "#9FB4B6"];
    const pins = [];
    for (let i = 0; i < 26; i++) {
      const x = W * .08 + R() * W * .84, y = H * .1 + R() * H * .72, sz = 70 + R() * 52;
      const c = cols2[Math.floor(R() * cols2.length)];
      card(x, y, sz, sz * .92, (R() - .5) * .22, c);
      // scribble lines on note
      ctx.save(); ctx.translate(x, y); ctx.rotate((R() - .5) * .2);
      for (let l = 0; l < 3; l++) { ctx.fillStyle = "rgba(20,30,30," + (.25 + R() * .25) + ")"; ctx.fillRect(-sz * .32, -sz * .22 + l * 12, sz * (.3 + R() * .32), 3.4); }
      ctx.restore();
      if (R() < .3) pins.push([x, y]);
    }
    // red-thread style connector, but in deep teal
    if (pins.length > 2) {
      ctx.strokeStyle = "#177A83"; ctx.lineWidth = 2.6; ctx.beginPath();
      pins.sort((a, b) => a[0] - b[0]);
      for (const [x, y] of pins) ctx.lineTo(x, y); ctx.stroke();
      for (const [x, y] of pins) { ctx.fillStyle = "#0F5A60"; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
    }
    finish(false);
  }

  if (style === "identity") {
    lightGround();
    // table
    ctx.fillStyle = "#E6EAEA"; ctx.fillRect(0, 0, W, H);
    const wl2 = ctx.createLinearGradient(0, 0, W, H);
    wl2.addColorStop(0, "rgba(255,255,255,.9)"); wl2.addColorStop(1, "rgba(200,212,212,.4)");
    ctx.fillStyle = wl2; ctx.fillRect(0, 0, W, H);
    // fanned swatch cards
    const swc = ["#2CB1BC", "#5FCBD3", "#1E8F99", "#BFE9EC", "#0F5A60", "#DDE4E4", "#9FB4B6", "#177A83"];
    for (let i = 0; i < 8; i++) {
      const ang = -.7 + i * .16;
      const x = W * .38 + Math.cos(ang) * W * .05 * i * .6, y = H * .58 + Math.sin(ang) * 30;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang * .55);
      ctx.shadowColor = "rgba(40,60,60,.3)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, -H * .3, W * .13, H * .44);
      ctx.shadowColor = "transparent";
      ctx.fillStyle = swc[i]; ctx.fillRect(6, -H * .3 + 6, W * .13 - 12, H * .3);
      for (let l = 0; l < 2; l++) { ctx.fillStyle = "rgba(30,40,40," + (.5 - l * .2) + ")"; ctx.fillRect(8, H * .05 + l * 11, W * .07 * (1 - l * .3), 3.4); }
      ctx.restore();
    }
    // lemniscate sketch on paper, top-left
    card(W * .16, H * .2, 200, 140, -.08, "#FFFFFF");
    ctx.save(); ctx.translate(W * .16, H * .2); ctx.rotate(-.08);
    ctx.strokeStyle = "#1E8F99"; ctx.lineWidth = 5; ctx.beginPath();
    ctx.arc(-26, 0, 24, 0, Math.PI * 2); ctx.moveTo(50, 0); ctx.arc(26, 0, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    finish(false);
  }

  /* ============================================== WIDE LAUNCH BANNER */
  if (style === "horizon") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0A1011"); g.addColorStop(.62, "#0E1617"); g.addColorStop(1, "#081010");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const hy = H * .6, cx3 = W * .5;
    // glow band + sun disc rising
    ctx.globalCompositeOperation = "lighter";
    glow(cx3, hy, W * .26, "95,203,211", .3);
    glow(cx3, hy, W * .5, "44,177,188", .12);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#DFF6F7";
    ctx.beginPath(); ctx.arc(cx3, hy, H * .085, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = TL(.9); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
    // perspective floor grid
    ctx.strokeStyle = T(.16); ctx.lineWidth = 1.4;
    for (let i = -9; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(cx3 + i * 40, hy); ctx.lineTo(cx3 + i * W * .12, H); ctx.stroke(); }
    for (let i = 1; i < 7; i++) { const y = hy + Math.pow(i / 7, 1.7) * (H - hy); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // rising streaks above horizon
    for (let i = 0; i < 70; i++) {
      const x = R() * W, l = 26 + R() * 150, yy = hy - R() * H * .5;
      ctx.filter = R() < .4 ? "blur(1.6px)" : "none";
      ctx.strokeStyle = R() < .8 ? T(.06 + R() * .3) : "rgba(220,240,240," + (.06 + R() * .16) + ")";
      ctx.lineWidth = .8 + R() * 2;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy - l); ctx.stroke();
    }
    ctx.filter = "none";
    finish(true);
  }
});

const browser = await chromium.launch();
const page = await browser.newPage();
for (let i = 0; i < SPECS.length; i++) {
  const sp = SPECS[i];
  const dataUrl = await page.evaluate(
    ([w, h, style, seed, fnSrc]) => {
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const fn = new Function("return (" + fnSrc + ")")();
      fn(cv.getContext("2d"), w, h, style, seed);
      return cv.toDataURL("image/jpeg", 0.85);
    },
    [sp.w, sp.h, sp.style, 2000 + i * 131, DRAW]
  );
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  writeFileSync(resolve(OUT, sp.name + ".jpg"), buf);
  console.log(sp.name.padEnd(12), (buf.length / 1024).toFixed(0) + " KB");
}
await browser.close();
