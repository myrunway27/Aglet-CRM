/**
 * Generates the site's imagery as abstract dark-teal art via headless canvas.
 *   node scripts/gen-images.mjs   →  assets/img/*.jpg
 *
 * These are original generated graphics (no external sources — the sandbox
 * has no image-host access). Swap any file for a real photograph, keep the
 * filename, and rebuild.
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/img");
mkdirSync(OUT, { recursive: true });

const SPECS = [
  { name: "hero",      w: 1800, h: 1100, style: "office" },
  { name: "svc-code",  w: 900,  h: 675,  style: "code" },
  { name: "svc-cloud", w: 900,  h: 675,  style: "corridor" },
  { name: "svc-sec",   w: 900,  h: 675,  style: "circuit" },
  { name: "svc-ai",    w: 900,  h: 675,  style: "neural" },
  { name: "svc-ops",   w: 900,  h: 675,  style: "ops" },
  { name: "dz-research", w: 900, h: 765, style: "chart" },
  { name: "dz-strategy", w: 900, h: 765, style: "notes" },
  { name: "dz-identity", w: 900, h: 765, style: "swatch" },
  { name: "dz-launch",   w: 1800, h: 690, style: "horizon" },
];

const DRAW = String(function draw(ctx, W, H, style, rand) {
  const TEAL = "#2CB1BC", TEAL_LT = "#5FCBD3";
  // mulberry32 — deterministic so rebuilds are stable
  let s = rand;
  const R = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ground: near-black with a soft teal-graphite gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#141818"); g.addColorStop(.55, "#181D1E"); g.addColorStop(1, "#10201F");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const glow = (x, y, r, c, a) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, c.replace("A)", a + ")")); rg.addColorStop(1, c.replace("A)", "0)"));
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const T = (a) => "rgba(44,177,188," + a + ")";

  if (style === "office") {
    // deep room: receding light bars + bokeh, like an office at night
    glow(W * .72, H * .3, W * .5, "rgba(44,177,188,A)", .1);
    glow(W * .2, H * .75, W * .42, "rgba(95,203,211,A)", .06);
    for (let i = 0; i < 26; i++) { // hanging light streaks
      const x = R() * W, y = R() * H * .45, l = 30 + R() * 120;
      ctx.strokeStyle = "rgba(220,235,235," + (0.02 + R() * .05) + ")";
      ctx.lineWidth = 1 + R() * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + l); ctx.stroke();
      glow(x, y + l, 14 + R() * 26, "rgba(210,240,240,A)", .05 + R() * .08);
    }
    for (let i = 0; i < 40; i++) { // bokeh field, denser low
      const y = H * (.45 + R() * .55);
      glow(R() * W, y, 8 + R() * 60, i % 3 ? "rgba(44,177,188,A)" : "rgba(200,220,220,A)", .03 + R() * .07);
    }
    // desk silhouettes
    ctx.fillStyle = "rgba(8,10,10,.55)";
    for (let i = 0; i < 6; i++) { const x = i * W / 5.4 + R() * 40; ctx.fillRect(x, H * .78 + R() * H * .06, W * .13, H * .3); }
  }

  if (style === "code") {
    glow(W * .28, H * .34, W * .55, "rgba(44,177,188,A)", .12);
    const cw = 16, rh = 26; ctx.font = "600 18px monospace";
    for (let c = 0; c < W / cw; c++) for (let r = 0; r < H / rh; r++) {
      if (R() < .55) continue;
      const depth = R();
      ctx.fillStyle = depth > .9 ? T(.75) : depth > .7 ? T(.3) : "rgba(190,205,205," + (.04 + depth * .08) + ")";
      ctx.fillText("{}[]<>/=+*;:._#%&$01"[Math.floor(R() * 20)], c * cw, r * rh);
    }
    ctx.fillStyle = "rgba(10,13,13,.35)"; ctx.fillRect(0, 0, W, H); // sink it back
    glow(W * .7, H * .7, W * .3, "rgba(95,203,211,A)", .07);
  }

  if (style === "corridor") { // data-centre perspective
    const vx = W * .5, vy = H * .42;
    for (let i = 0; i < 15; i++) { // rack edges racing to the vanishing point
      const t = i / 15, x = t < .5 ? t * 2 * vx : W - (1 - t) * 2 * (W - vx);
      ctx.strokeStyle = T(.05 + Math.abs(t - .5) * .5);
      ctx.lineWidth = 1 + Math.abs(t - .5) * 6;
      ctx.beginPath(); ctx.moveTo(x < vx ? 0 : W, H * (x < vx ? .95 - t * .4 : .55 + (t - .5) * .8)); ctx.lineTo(vx, vy); ctx.stroke();
    }
    for (let i = 0; i < 90; i++) { // rack LEDs, denser near edges
      const t = R(), side = R() < .5, d = Math.pow(t, 1.6);
      const x = side ? d * (vx * .92) : W - d * ((W - vx) * .92);
      const y = vy + (H - vy) * (1 - d) * (.25 + R() * .75) * (side ? 1 : 1);
      ctx.fillStyle = R() < .8 ? T(.25 + R() * .6) : "rgba(230,245,245," + (.2 + R() * .5) + ")";
      const sz = 1 + (1 - d) * 3.2; ctx.fillRect(x, y, sz, sz);
    }
    glow(vx, vy, W * .34, "rgba(44,177,188,A)", .16);
  }

  if (style === "circuit") {
    glow(W * .5, H * .5, W * .5, "rgba(44,177,188,A)", .08);
    ctx.lineCap = "round";
    for (let i = 0; i < 42; i++) { // manhattan traces with via dots
      let x = R() * W, y = R() * H; const seg = 3 + Math.floor(R() * 4);
      const bright = R() > .75;
      ctx.strokeStyle = bright ? T(.55) : T(.10 + R() * .16); ctx.lineWidth = bright ? 2.4 : 1.4;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let sg = 0; sg < seg; sg++) {
        const len = 40 + R() * 150;
        if (R() < .5) x += (R() < .5 ? -1 : 1) * len; else y += (R() < .5 ? -1 : 1) * len;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = bright ? TEAL_LT : T(.4);
      ctx.beginPath(); ctx.arc(x, y, bright ? 4.5 : 2.6, 0, 7); ctx.fill();
      if (bright) glow(x, y, 26, "rgba(95,203,211,A)", .3);
    }
  }

  if (style === "neural") {
    const P = [];
    for (let i = 0; i < 46; i++) P.push({ x: R() * W, y: R() * H, r: 1.6 + R() * 3.4 });
    for (const a of P) for (const b of P) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 30 && d < W * .16) {
        ctx.strokeStyle = T(.16 * (1 - d / (W * .16)));
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (const p of P) {
      const hot = R() > .8;
      ctx.fillStyle = hot ? TEAL_LT : T(.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, hot ? p.r * 1.6 : p.r, 0, 7); ctx.fill();
      if (hot) glow(p.x, p.y, 34, "rgba(95,203,211,A)", .32);
    }
    glow(W * .3, H * .32, W * .4, "rgba(44,177,188,A)", .1);
  }

  if (style === "ops") { // wall of monitoring panels
    const cols = 4, rows = 3, gx = W / cols, gy = H / rows;
    for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
      const x0 = cx * gx + 14, y0 = cy * gy + 14, pw = gx - 28, phh = gy - 28;
      ctx.fillStyle = "rgba(22,28,28,.9)"; ctx.fillRect(x0, y0, pw, phh);
      ctx.strokeStyle = T(.2); ctx.strokeRect(x0, y0, pw, phh);
      const kind = (cx + cy) % 3;
      if (kind === 0) { // line graph
        ctx.strokeStyle = T(.7); ctx.lineWidth = 1.8; ctx.beginPath();
        for (let i = 0; i <= 24; i++) ctx.lineTo(x0 + 8 + i * (pw - 16) / 24, y0 + phh * (.75 - R() * .5));
        ctx.stroke();
      } else if (kind === 1) { // bars
        for (let i = 0; i < 9; i++) { const bh = phh * (.15 + R() * .6); ctx.fillStyle = T(.25 + R() * .45); ctx.fillRect(x0 + 8 + i * (pw - 16) / 9, y0 + phh - 8 - bh, (pw - 16) / 9 - 4, bh); }
      } else { // log lines
        for (let i = 0; i < 7; i++) { ctx.fillStyle = "rgba(190,205,205," + (.08 + R() * .12) + ")"; ctx.fillRect(x0 + 8, y0 + 10 + i * (phh - 18) / 7, (pw - 16) * (.3 + R() * .65), 3); }
      }
    }
    glow(W * .5, H * .1, W * .5, "rgba(44,177,188,A)", .08);
    ctx.fillStyle = "rgba(10,13,13,.22)"; ctx.fillRect(0, 0, W, H);
  }

  if (style === "chart") { // analytics: area line over faint grid
    ctx.strokeStyle = "rgba(190,205,205,.05)";
    for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, i * H / 10); ctx.lineTo(W, i * H / 10); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke(); }
    const pts = []; let y = H * .62;
    for (let i = 0; i <= 30; i++) { y += (R() - .52) * H * .09; y = Math.max(H * .18, Math.min(H * .85, y)); pts.push([i * W / 30, y]); }
    const ag = ctx.createLinearGradient(0, 0, 0, H); ag.addColorStop(0, T(.4)); ag.addColorStop(1, T(0));
    ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(0, H);
    for (const [px, py] of pts) ctx.lineTo(px, py); ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = TEAL_LT; ctx.lineWidth = 3; ctx.beginPath();
    for (const [px, py] of pts) ctx.lineTo(px, py); ctx.stroke();
    const [ex, ey] = pts[24]; glow(ex, ey, 40, "rgba(95,203,211,A)", .5);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 7); ctx.fill();
    glow(W * .15, H * .2, W * .35, "rgba(44,177,188,A)", .08);
  }

  if (style === "notes") { // strategy wall of glowing tiles
    glow(W * .5, H * .35, W * .5, "rgba(44,177,188,A)", .09);
    for (let i = 0; i < 34; i++) {
      const x = R() * W * .92, yy = R() * H * .88, sz = 46 + R() * 60, tilt = (R() - .5) * .3;
      ctx.save(); ctx.translate(x + sz / 2, yy + sz / 2); ctx.rotate(tilt);
      const hot = R() > .78;
      ctx.fillStyle = hot ? T(.5) : "rgba(200,214,214," + (.06 + R() * .1) + ")";
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz * .82);
      if (hot) { ctx.strokeStyle = TEAL_LT; ctx.lineWidth = 1.4; ctx.strokeRect(-sz / 2, -sz / 2, sz, sz * .82); }
      for (let l = 0; l < 3; l++) { ctx.fillStyle = "rgba(14,18,18," + (.5 + R() * .3) + ")"; ctx.fillRect(-sz / 2 + 7, -sz / 2 + 9 + l * 9, sz * (.35 + R() * .4), 2.6); }
      ctx.restore();
    }
    // connective string
    ctx.strokeStyle = T(.35); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i <= 6; i++) ctx.lineTo(W * i / 6, H * (.3 + Math.sin(i * 1.7) * .18 + R() * .1));
    ctx.stroke();
  }

  if (style === "swatch") { // identity: fanned colour bars in the brand family
    glow(W * .7, H * .25, W * .45, "rgba(44,177,188,A)", .1);
    const cols2 = ["#2CB1BC", "#5FCBD3", "#1E8F99", "#E9EFEE", "#93A0A2", "#177A83", "#BFE9EC"];
    for (let i = 0; i < 16; i++) {
      const x = W * .08 + i * W * .055, yy = H * .2 + Math.sin(i * .55) * H * .1;
      ctx.save(); ctx.translate(x, yy); ctx.rotate(-.35 + i * .028);
      ctx.fillStyle = cols2[i % cols2.length] + (i % 2 ? "cc" : "ee");
      ctx.fillRect(0, 0, W * .055, H * .56);
      ctx.fillStyle = "rgba(14,18,18,.8)"; ctx.fillRect(0, H * .56 - 26, W * .055, 26);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(10,13,13,.25)"; ctx.fillRect(0, 0, W, H);
  }

  if (style === "horizon") { // launch: light streaks over a horizon line
    const hy = H * .58;
    const hg = ctx.createLinearGradient(0, hy - H * .3, 0, hy + H * .2);
    hg.addColorStop(0, "rgba(44,177,188,0)"); hg.addColorStop(.5, T(.22)); hg.addColorStop(1, "rgba(44,177,188,0)");
    ctx.fillStyle = hg; ctx.fillRect(0, hy - H * .3, W, H * .5);
    ctx.strokeStyle = TEAL_LT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
    for (let i = 0; i < 60; i++) { // rising streaks
      const x = R() * W, l = 20 + R() * 140, above = R() < .7;
      ctx.strokeStyle = above ? T(.06 + R() * .3) : "rgba(190,205,205," + (.03 + R() * .08) + ")";
      ctx.lineWidth = .8 + R() * 1.8;
      const yy = above ? hy - R() * H * .5 : hy + R() * H * .35;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy - l * (above ? 1 : .4)); ctx.stroke();
    }
    glow(W * .5, hy, W * .3, "rgba(95,203,211,A)", .2);
    glow(W * .85, H * .2, W * .3, "rgba(44,177,188,A)", .08);
  }

  // universal finish: vignette + fine grain so everything reads as one set
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(6,8,8,.5)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 900; i++) {
    ctx.fillStyle = "rgba(255,255,255," + (R() * .022) + ")";
    ctx.fillRect(R() * W, R() * H, 1, 1);
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
      return cv.toDataURL("image/jpeg", 0.82);
    },
    [sp.w, sp.h, sp.style, 1000 + i * 77, DRAW]
  );
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  writeFileSync(resolve(OUT, sp.name + ".jpg"), buf);
  console.log(sp.name.padEnd(12), sp.style.padEnd(9), (buf.length / 1024).toFixed(0) + " KB");
}
await browser.close();
