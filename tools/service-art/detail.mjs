// Detail-page illustrations, one set of three per service, driven by tools/service-pages/data.mjs:
// <art>-included (what's included), <art>-process (how I work), <art>-deliver (deliverables).
import { C, raw, appear, flash, kf, shown, packet, svg, check, badge, card, bar, txt, sparkle, icon, FLOW } from "./lib.mjs";
import { SERVICES } from "../service-pages/data.mjs";

const fit = (s, max, size) => (s.length * size * 0.56 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : "");
const label = (x, y, s, size, max, extra = "") =>
  txt(x, y, s, { size, anchor: "start", weight: 700, ...extra }).replace("<text ", `<text${fit(s, max, size)} `);

// ─────────────────────────────────────────── What's included: hub + six feature tiles lighting up
function included(sv) {
  const T = 8, HX = 640, HW = 392, HY = 330, HH = 280;
  const tiles = sv.included.items.map(([ic, name], i) => {
    const left = i % 2 === 0, row = Math.floor(i / 2);
    return { ic, name, x: left ? 130 : 1122, y: 170 + row * 240, left };
  });
  const body = `
${tiles.map((t) => {
    const sx = t.left ? HX : HX + HW, sy = HY + HH / 2, ex = t.left ? t.x + 420 : t.x, ey = t.y + 60;
    const mx = (sx + ex) / 2;
    return `<path d="M${sx} ${sy} C${mx} ${sy} ${mx} ${ey} ${ex} ${ey}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>`;
  }).join("")}
${tiles.map((t, i) => {
    const sx = t.left ? HX : HX + HW, sy = HY + HH / 2, ex = t.left ? t.x + 420 : t.x, ey = t.y + 60, mx = (sx + ex) / 2;
    return packet(`M${sx} ${sy} C${mx} ${sy} ${mx} ${ey} ${ex} ${ey}`, T, 0.02 + i * 0.12, 0.08 + i * 0.12);
  }).join("")}
<g filter="url(#sh)"><rect x="${HX}" y="${HY}" width="${HW}" height="${HH}" rx="36" fill="${C.ink}"/></g>
<circle class="pulse" cx="${HX + HW / 2}" cy="${HY + 74}" r="30" fill="${C.g}" opacity=".25"/>${sparkle(HX + HW / 2, HY + 74, 1.5)}
${sv.hub.map((l, k) => txt(HX + HW / 2, HY + 164 + k * 46, l, { size: 38, fill: "#fff", weight: 800 })).join("")}
${txt(HX + HW / 2, HY + 252, "WHAT'S INCLUDED", { size: 17, fill: C.g, weight: 700, ls: 3 })}
${tiles.map((t, i) => `${card(t.x, t.y, 420, 120, 24)}
<rect class="${flash(`on${i}`, T, 7 + i * 12, 92)}" x="${t.x}" y="${t.y}" width="420" height="120" rx="24" fill="${C.gt}" stroke="${C.g}" stroke-width="4"/>
<rect x="${t.x + 24}" y="${t.y + 28}" width="64" height="64" rx="18" fill="#fff" stroke="${C.line}" stroke-width="3"/>${icon(t.ic, t.x + 56, t.y + 60, { s: 0.85 })}
${label(t.x + 106, t.y + 60, t.name, 27, 290)}${bar(t.x + 106, t.y + 80, 130, 10)}
${badge(t.x + 404, t.y + 16, appear(`ok${i}`, T, 8 + i * 12, 92, { scale: true }), 17)}`).join("\n")}`;
  raw(FLOW);
  raw(`.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 1.8s ease-out infinite}@keyframes pulse{0%{transform:scale(1);opacity:.45}100%{transform:scale(2);opacity:0}}`);
  return svg(`What's included in ${sv.name}: ${sv.included.items.map((x) => x[1]).join(", ")}.`, body);
}

// ─────────────────────────────────────────── How I work: five steps along a filling timeline
function process(sv) {
  const T = 10, XS = [236, 536, 836, 1136, 1436], Y = 470, L = XS[4] - XS[0];
  const arrive = [4, 20, 36, 52, 68];
  const STOPS = [[0, 0], [4, 0], [16, 1], [20, 1], [32, 2], [36, 2], [48, 3], [52, 3], [64, 4], [92, 4]];
  const off = (n) => +(L - (XS[n] - XS[0])).toFixed(1);
  raw(`.prog{animation:prog ${T}s infinite}@keyframes prog{${STOPS.map(([p, n]) => `${p}%{stroke-dashoffset:${off(n)};opacity:1}`).join("")}96%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:${L};opacity:0}}
.dot{animation:dot ${T}s infinite}@keyframes dot{${STOPS.map(([p, n]) => `${p}%{transform:translateX(${XS[n] - XS[0]}px);opacity:1}`).join("")}96%{transform:translateX(${L}px);opacity:0}100%{transform:translateX(0);opacity:0}}`);
  const counter = [0, 1, 2, 3, 4].map((k) => {
    const on = k === 0 ? 0 : arrive[k], off = k === 4 ? 94 : arrive[k + 1] - 0.5;
    return `<text class="${shown(`st${k}`, T, on, off)}" x="836" y="281" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="26" font-weight="700" fill="#fff">Step ${k + 1} of 5 · ${sv.process.steps[k][1]}</text>`;
  }).join("");
  const body = `
<rect x="596" y="238" width="480" height="64" rx="32" fill="${C.ink}"/>${counter}
<path d="M${XS[0]} ${Y} H${XS[4]}" stroke="#DCDCDC" stroke-width="8" stroke-linecap="round"/>
<path class="prog" d="M${XS[0]} ${Y} H${XS[4]}" stroke="${C.g}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}"/>
<circle class="dot" cx="${XS[0]}" cy="${Y}" r="14" fill="${C.g}" stroke="#fff" stroke-width="5"/>
${sv.process.steps.map(([ic, name, sub], i) => {
    const x = XS[i];
    return `<g filter="url(#sh)"><circle cx="${x}" cy="${Y}" r="68" fill="#fff" stroke="${C.line}" stroke-width="4"/></g>
<circle class="${flash(`on${i}`, T, arrive[i] - 1, 92)}" cx="${x}" cy="${Y}" r="68" fill="${C.gt}" stroke="${C.g}" stroke-width="6"/>
${icon(ic, x, Y, { s: 1.15, w: 5 })}
<circle cx="${x - 50}" cy="${Y - 50}" r="20" fill="${C.ink}" stroke="#F0F0F0" stroke-width="4"/>${txt(x - 50, Y - 43, `0${i + 1}`, { size: 17, fill: "#fff", weight: 800 })}
${badge(x + 50, Y - 50, appear(`dn${i}`, T, arrive[i] + 8, 92, { scale: true }), 18)}
${txt(x, Y + 134, name, { size: 36, weight: 800 })}${txt(x, Y + 178, sub, { size: 25, fill: C.sub, weight: 500 })}`;
  }).join("\n")}`;
  return svg(`How I work on ${sv.name}, in five steps: ${sv.process.steps.map((s) => s[1]).join(", ")}.`, body,
    ".st0,.st1,.st2,.st3,.dot{opacity:0}.prog{stroke-dashoffset:0}");
}

// ─────────────────────────────────────────── Deliverables: a handover box and a checklist that ticks off
function deliver(sv) {
  const T = 9, items = sv.deliver.items;
  const ticks = items.map((_, i) => 30 + i * 9);
  const pops = [["doc", "Docs"], ["code", "Code"], ["lock", "Access"]];
  const counter = [0, 1, 2, 3, 4, 5].map((k) => {
    const on = k === 0 ? 0 : ticks[k - 1], off = k === 5 ? 92 : (k === 0 ? ticks[0] : ticks[k]) - 0.5;
    return `<text class="${shown(`c${k}`, T, on, off)}" x="1446" y="231" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="22" font-weight="800" fill="${C.g2}">${k}/5</text>`;
  }).join("");
  const body = `
<g class="${kf("lid", T, [["0,4", "transform:translateY(0)"], [7, "transform:translateY(-10px)"], ["10,100", "transform:translateY(0)"]], "", "ease")}">
<path d="M260 450 L200 400 L330 380 L420 440 Z" fill="${C.gt}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>
<path d="M580 450 L640 400 L510 380 L420 440 Z" fill="${C.gt}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/></g>
${pops.map(([ic, name], i) => {
    const x = 300 + i * 120;
    return `<g class="${appear(`p${i}`, T, 8 + i * 7, 92, { dy: 40 })}"><g class="float f${i}">${card(x - 52, 230, 104, 104, 24)}${icon(ic, x, 270, { s: 0.9 })}${txt(x, 318, name, { size: 18, weight: 700, fill: C.sub })}</g></g>`;
  }).join("")}
<g filter="url(#sh)"><rect x="250" y="440" width="340" height="250" rx="18" fill="#fff" stroke="${C.ink}" stroke-width="5"/></g>
<rect x="398" y="440" width="44" height="250" fill="${C.g}"/><path d="M250 440 H590" stroke="${C.ink}" stroke-width="5"/>
<rect x="290" y="600" width="90" height="56" rx="8" fill="#fff" stroke="${C.ink}" stroke-width="3"/>${bar(302, 614, 60, 8, C.ink)}${bar(302, 632, 44, 8)}
${txt(420, 750, "Everything you need to own it", { size: 22, fill: C.sub, weight: 600 })}
${card(760, 170, 760, 600, 32)}
${txt(800, 236, "Deliverables", { size: 32, weight: 800, anchor: "start" })}
<rect x="1396" y="204" width="100" height="40" rx="20" fill="${C.gt}"/>${counter}
${items.map((it, i) => {
    const y = 286 + i * 82;
    return `${i ? `<path d="M800 ${y - 16} H1480" stroke="#EFEFEF" stroke-width="2"/>` : ""}<circle cx="822" cy="${y + 22}" r="22" fill="#fff" stroke="#DCDCDC" stroke-width="4"/>
<g class="${appear(`t${i}`, T, ticks[i], 92, { scale: true })}"><circle cx="822" cy="${y + 22}" r="22" fill="${C.g}"/>${check(822, y + 22, 0.85)}</g>
${label(862, y + 32, it, 27, 610, { weight: 600 })}`;
  }).join("")}
<g class="${appear("done", T, 78, 92, { scale: true })}"><rect x="1210" y="700" width="270" height="48" rx="24" fill="${C.g}"/>${check(1240, 724, 0.8)}${txt(1262, 732, "Handover complete", { size: 20, fill: "#fff", weight: 800, anchor: "start" })}</g>`;
  raw(`.float{animation:float 3s ease-in-out infinite}.f1{animation-delay:-1s}.f2{animation-delay:-2s}@keyframes float{50%{transform:translateY(-8px)}}`);
  return svg(`Deliverables for ${sv.name}: ${items.join("; ")}.`, body, ".c0,.c1,.c2,.c3,.c4{opacity:0}");
}

const out = {};
for (const sv of SERVICES) {
  out[`${sv.art}-included`] = () => included(sv);
  out[`${sv.art}-process`] = () => process(sv);
  out[`${sv.art}-deliver`] = () => deliver(sv);
}
export default out;
