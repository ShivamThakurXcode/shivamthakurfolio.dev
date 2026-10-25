// Business Software (CRM, ERP, dashboards): a deal moving through the pipeline, spreadsheet → dashboard, departments synced.
import { C, raw, appear, flash, grow, kf, counter, packet, svg, check, badge, card, bar, txt, sparkle, FLOW } from "./lib.mjs";

const F = `font-family="Inter, 'Segoe UI', Arial, sans-serif"`;

// ─────────────────────────────────────────── 1. Kanban sales pipeline: a deal moves to Won
function one() {
  const T = 10, CX = [466, 654, 842, 1030], CW = 176;
  const cols = ["Lead", "Qualified", "Proposal", "Won"];
  const deal = (x, y, amt, hi = false) => `<rect x="${x}" y="${y}" width="152" height="92" rx="16" fill="#fff" stroke="${hi ? C.g : C.line}" stroke-width="${hi ? 4 : 3}"/>
<circle cx="${x + 26}" cy="${y + 28}" r="12" fill="${hi ? C.g : "#DCDCDC"}"/>${bar(x + 46, y + 22, 80, 12, hi ? C.ink : "#BDBDBD")}
${txt(x + 16, y + 74, amt, { size: 22, weight: 800, anchor: "start", fill: hi ? C.ink : C.sub })}${bar(x + 96, y + 64, 40, 10, "#E4E4E4")}`;
  const statics = [[0, 290, "$8k"], [0, 400, "$12k"], [1, 290, "$15k"], [1, 400, "$6k"], [2, 290, "$31k"], [3, 290, "$18k"]];
  const D = (dx, dy, r = 0) => `transform:translate(${dx}px,${dy}px) rotate(${r}deg)`;
  const body = `
${card(440, 150, 792, 640, 32)}
${txt(476, 210, "Sales pipeline", { size: 28, anchor: "start" })}
${counter("tot", T, ["$148k", "$172k"], 0.01, 58, 92, `x="1196" y="210" text-anchor="end" ${F} font-size="28" font-weight="800" fill="${C.g2}"`)}
${cols.map((c, i) => `<rect x="${CX[i]}" y="236" width="${CW}" height="528" rx="20" fill="#F6F6F6"/>
${i === 3 ? `<rect class="${flash("won", T, 58, 92)}" x="${CX[i]}" y="236" width="${CW}" height="528" rx="20" fill="${C.gt}" stroke="${C.g}" stroke-width="4"/>` : ""}
<circle cx="${CX[i] + 22}" cy="264" r="7" fill="${i === 3 ? C.g : ["#BDBDBD", "#9A9A9A", C.ink][i]}"/>${txt(CX[i] + 38, 271, c, { size: 20, anchor: "start", fill: C.sub })}`).join("")}
${statics.map(([c, y, a]) => deal(CX[c] + 12, y, a)).join("")}
<g class="${kf("deal", T, [["0,10", D(0, 0)], [14, D(94, -24, 4)], ["18,30", D(188, 0)], [34, D(282, -80, 4)], ["38,50", D(376, -110)], [54, D(470, -134, 4)], ["58,90", D(564, -110)], [93, D(564, -110) + ";opacity:1"], [94, D(564, -110) + ";opacity:0"], [95, D(0, 0) + ";opacity:0"], [99, D(0, 0) + ";opacity:1"]], "", "cubic-bezier(.5,0,.3,1)")}">
<g filter="url(#sh)">${deal(CX[0] + 12, 510, "$24k", true)}</g></g>
<g class="${appear("conf", T, 60, 90, { scale: true })}">${[[1060, 520, C.g], [1180, 500, C.ink], [1200, 590, C.g2], [1046, 610, "#BDBDBD"], [1120, 470, C.g]].map(([x, y, f], i) => i % 2 ? `<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="${f}" transform="rotate(${i * 30} ${x} ${y})"/>` : `<circle cx="${x}" cy="${y}" r="7" fill="${f}"/>`).join("")}</g>`;
  return svg("A sales pipeline board: a $24k deal moves from lead through qualified and proposal to won, and the total updates.", body, ".tot0,.conf{opacity:0}");
}

// ─────────────────────────────────────────── 2. Spreadsheet chaos becomes a clean dashboard
function two() {
  const T = 9;
  const rows = 9, cols = 5;
  let grid = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = 170 + c * 112, y = 270 + r * 50;
    grid += r === 0 ? bar(x + 14, y + 20, 60, 12, "#9A9A9A") : bar(x + 14, y + 20, [70, 50, 80, 40, 60][(r * 3 + c) % 5], 10, "#CFCFCF");
  }
  const seg = (len, off, col, cls) => `<circle class="${cls}" cx="1060" cy="560" r="78" fill="none" stroke="${col}" stroke-width="32" stroke-dasharray="${len} 490" stroke-dashoffset="${-off}" transform="rotate(-90 1060 560)"/>`;
  const sweep = (cls, at, to, len) => kf(cls, T, [["0," + at, "stroke-dasharray:0 490;opacity:1"], [to + ",92", `stroke-dasharray:${len} 490;opacity:1`], ["95,100", `stroke-dasharray:${len} 490;opacity:0`]]);
  const C2 = 2 * Math.PI * 78;
  const body = `
${card(150, 200, 600, 540, 24)}
<rect x="150" y="200" width="600" height="60" rx="24" fill="#F4F4F4"/><path d="M150 230 V260 H750 V230" fill="#F4F4F4"/>${[0, 1, 2].map((i) => `<rect x="${178 + i * 60}" y="219" width="44" height="22" rx="6" fill="#E4E4E4"/>`).join("")}
<rect x="150" y="270" width="600" height="50" fill="#F8F8F8"/>
${[1, 2, 3, 4].map((c) => `<path d="M${170 + c * 112} 270 V720" stroke="#EDEDED" stroke-width="2"/>`).join("")}${Array.from({ length: rows }, (_, r) => `<path d="M150 ${320 + r * 50} H750" stroke="#EDEDED" stroke-width="2"/>`).join("")}
${grid}
<rect class="${kf("scan", T, [["0,4", "transform:translateY(0);opacity:0"], [6, "transform:translateY(50px);opacity:1"], [34, "transform:translateY(400px);opacity:1"], ["37,100", "transform:translateY(400px);opacity:0"]], "", "linear")}" x="150" y="270" width="600" height="50" fill="${C.g}" opacity=".18"/>
${packet("M740 470 H800", T, 0.12, 0.18)}${packet("M872 470 H930", T, 0.3, 0.36)}
<g class="pulse"><circle cx="836" cy="470" r="44" fill="${C.g}"/></g><circle cx="836" cy="470" r="44" fill="${C.g}"/>${sparkle(836, 470, 1.3, "#fff")}
${card(920, 200, 600, 540, 24)}
${[["Revenue", ["$21k", "$58k", "$84k"]], ["Orders", ["96", "240", "312"]], ["On time", ["71%", "88%", "96%"]]].map(([l, v], i) => {
    const x = 946 + i * 186;
    return `<rect x="${x}" y="226" width="170" height="104" rx="18" fill="#F6F6F6"/>${txt(x + 18, 260, l, { size: 18, anchor: "start", fill: C.sub, weight: 600 })}
${counter(`k${i}`, T, v, 36 + i * 2, 5, 92, `x="${x + 18}" y="308" ${F} font-size="34" font-weight="800" fill="${C.ink}"`)}`;
  }).join("")}
<circle cx="1060" cy="560" r="78" fill="none" stroke="#EDEDED" stroke-width="32"/>
${seg(C2 * 0.55, 0, C.g, sweep("d0", 40, 50, C2 * 0.55))}${seg(C2 * 0.27, C2 * 0.55, C.ink, sweep("d1", 50, 55, C2 * 0.27))}${seg(C2 * 0.18, C2 * 0.82, "#BDBDBD", sweep("d2", 55, 59, C2 * 0.18))}
${txt(1060, 572, "62%", { size: 32, weight: 800, cls: appear("pct", T, 50, 92, { scale: true }) })}
<path d="M1190 700 H1490" stroke="#E4E4E4" stroke-width="3"/>
${[120, 180, 140, 230, 290].map((h, i) => `<rect class="${grow(`b${i}`, T, 44 + i * 3, 52 + i * 3, 92, { origin: "50% 100%", axis: "Y" })}" x="${1206 + i * 56}" y="${700 - h}" width="38" height="${h}" rx="10" fill="${i === 4 ? C.g : i === 3 ? C.g2 : "#CFCFCF"}"/>`).join("")}`;
  raw(`.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 1.8s ease-out infinite}@keyframes pulse{0%{transform:scale(1);opacity:.4}100%{transform:scale(1.7);opacity:0}}`);
  return svg("A cluttered spreadsheet is scanned row by row and turned into a clean dashboard with KPIs, a donut chart and a bar chart.", body,
    ".scan,.k00,.k01,.k10,.k11,.k20,.k21{opacity:0}");
}

// ─────────────────────────────────────────── 3. ERP: every department synced to one database
function three() {
  const T = 9, X = 836, Y = 470;
  const deps = [
    ["Sales", 180, 170, ["128 orders", "129 orders"], "M480 245 C620 245 640 410 736 430"],
    ["Inventory", 180, 620, ["Stock 940", "Stock 939"], "M480 695 C620 695 640 530 736 510"],
    ["Finance", 1192, 170, ["$41.2k", "$41.3k"], "M1192 245 C1052 245 1032 410 936 430"],
    ["Shipping", 1192, 620, ["3 to ship", "4 to ship"], "M1192 695 C1052 695 1032 530 936 510"],
  ];
  const icons = [
    (x, y) => `<path d="M${x - 18} ${y + 14} l12 -14 l10 8 l14 -18" fill="none"/><path d="M${x + 8} ${y - 10} h10 v10" fill="none"/>`,
    (x, y) => `<path d="M${x - 18} ${y - 8} l18 -10 l18 10 v20 l-18 10 l-18 -10 z M${x - 18} ${y - 8} l18 10 l18 -10 M${x} ${y + 2} v20" fill="none"/>`,
    (x, y) => `<rect x="${x - 20}" y="${y - 14}" width="40" height="28" rx="6" fill="none"/><circle cx="${x}" cy="${y}" r="7" fill="none"/>`,
    (x, y) => `<path d="M${x - 22} ${y - 10} h26 v22 h-26 z M${x + 4} ${y - 2} h10 l8 8 v6 h-18 z" fill="none"/><circle cx="${x - 12}" cy="${y + 14}" r="4" fill="${C.ink}"/><circle cx="${x + 12}" cy="${y + 14}" r="4" fill="${C.ink}"/>`,
  ];
  const body = `
${deps.map(([, , , , d]) => `<path d="${d}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>`).join("")}
${packet(deps[0][4], T, 0.06, 0.16)}${[1, 2, 3].map((i) => packet(deps[i][4], T, 0.22, 0.32, { back: true, fill: C.ink, r: 10 })).join("")}
<g class="spin"><circle cx="${X}" cy="${Y}" r="176" fill="none" stroke="${C.g}" stroke-width="4" stroke-dasharray="12 16"/></g>
<g filter="url(#sh)"><path d="M${X - 100} ${Y - 90} v170 a100 30 0 0 0 200 0 v-170" fill="#fff" stroke="${C.ink}" stroke-width="6"/></g>
<path d="M${X - 100} ${Y - 30} a100 30 0 0 0 200 0 M${X - 100} ${Y + 30} a100 30 0 0 0 200 0" fill="none" stroke="${C.ink}" stroke-width="6"/>
<ellipse cx="${X}" cy="${Y - 90}" rx="100" ry="30" fill="${C.gt}" stroke="${C.ink}" stroke-width="6"/>
<circle class="${flash("hub", T, 15, 24)}" cx="${X}" cy="${Y - 90}" r="16" fill="${C.g}"/>
${deps.map(([name, x, y, vals], i) => `${card(x, y, 300, 150, 24)}
<rect class="${flash(`on${i}`, T, i ? 31 : 4, i ? 42 : 16)}" x="${x}" y="${y}" width="300" height="150" rx="24" fill="${C.gt}" stroke="${C.g}" stroke-width="4"/>
<rect x="${x + 24}" y="${y + 24}" width="60" height="60" rx="16" fill="#fff" stroke="${C.line}" stroke-width="3"/><g stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${icons[i](x + 54, y + 54)}</g>
${txt(x + 104, y + 62, name, { size: 24, anchor: "start", fill: C.sub })}
${counter(`v${i}`, T, vals, 0.01, i ? 32 : 14, 92, `x="${x + 24}" y="${y + 126}" ${F} font-size="30" font-weight="800" fill="${C.ink}"`)}
${badge(x + 284, y + 16, appear(`ok${i}`, T, i ? 33 : 15, 92, { scale: true }), 16)}`).join("")}`;
  raw(FLOW);
  raw(`.spin{transform-box:fill-box;transform-origin:center;animation:spin 16s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`);
  return svg("An ERP: a new sale is written to one central database and inventory, finance and shipping update instantly.", body, ".v00,.v10,.v20,.v30{opacity:0}");
}

export default { "business-software-1": one, "business-software-2": two, "business-software-3": three };
