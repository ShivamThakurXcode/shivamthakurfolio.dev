// SaaS Product Development: live dashboard, pricing → payment → Pro, tenants and MRR growing.
import { C, raw, appear, flash, grow, draw, kf, counter, packet, svg, check, badge, card, bar, txt, sparkle } from "./lib.mjs";

const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// ─────────────────────────────────────────── 1. Dashboard: KPIs count up, the chart draws, new customers arrive
function one() {
  const T = 8;
  const kpis = [
    ["ka", ["$2.1k", "$6.8k", "$9.7k", "$12.4k"], "+12%"],
    ["kb", ["214", "690", "1,032", "1,284"], "+8%"],
    ["kc", ["+9%", "+21%", "+30%", "+38%"], "MoM"],
  ];
  const pts = [[610, 560], [690, 530], [770, 545], [850, 480], [930, 495], [1010, 430], [1090, 410], [1170, 386]];
  const line = `M${pts.map((p) => p.join(" ")).join(" L")}`;
  const body = `
${card(440, 160, 792, 620, 32)}
<path d="M550 160 V780" stroke="#EDEDED" stroke-width="3"/>
<rect x="477" y="192" width="36" height="36" rx="10" fill="${C.g}"/>${sparkle(495, 210, 0.6, "#fff")}
${[0, 1, 2, 3, 4].map((i) => `<rect x="481" y="${270 + i * 64}" width="28" height="28" rx="8" fill="${i ? "#E4E4E4" : C.gt}"/>${i ? "" : `<rect x="489" y="${278}" width="12" height="12" rx="3" fill="${C.g}"/>`}`).join("")}
${kpis.map(([p, vals, chip], i) => {
    const x = 580 + i * 210;
    return `${card(x, 196, 196, 128, 22, { shadow: false })}${bar(x + 20, 220, 90, 10)}
${counter(p, T, vals, 6 + i * 2, 4, 92, `x="${x + 20}" y="292" ${'font-family="Inter, \'Segoe UI\', Arial, sans-serif"'} font-size="40" font-weight="700" fill="${C.ink}"`)}
<g class="${appear(`ch${i}`, T, 20 + i * 2, 92)}"><rect x="${x + 112}" y="214" width="66" height="26" rx="13" fill="${C.gt}"/>${txt(x + 145, 233, chip, { size: 16, fill: C.g2, weight: 700 })}</g>`;
  }).join("")}
${card(580, 344, 616, 270, 22, { shadow: false })}
<circle cx="612" cy="370" r="6" fill="${C.g}"/>${bar(626, 364, 110, 12, C.ink)}${bar(1090, 364, 80, 12)}
${[420, 480, 540].map((y) => `<path d="M610 ${y} H1170" stroke="#EDEDED" stroke-width="3" stroke-dasharray="6 8"/>`).join("")}
<path class="${appear("area", T, 50, 92, { dy: 0 })}" d="${line} L1170 590 L610 590 Z" fill="${C.gt}"/>
<path class="${draw("ln", T, 20, 55, Math.ceil(pathLen(pts)))}" d="${line}" fill="none" stroke="${C.g}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<g class="${appear("end", T, 54, 92, { scale: true })}"><circle class="ping" cx="1170" cy="386" r="14" fill="${C.g}" opacity=".3"/><circle cx="1170" cy="386" r="9" fill="${C.g}" stroke="#fff" stroke-width="4"/></g>
${card(580, 634, 616, 120, 22, { shadow: false })}
${[0, 1, 2].map((i) => {
    const y = 664 + i * 32;
    return `<g class="${appear(`row${i}`, T, 58 + i * 4, 92)}"><circle cx="612" cy="${y}" r="11" fill="${i === 1 ? C.ink : C.g}" opacity="${i === 1 ? 1 : 0.85}"/>${bar(634, y - 6, 140 - i * 20, 12, "#BDBDBD")}${bar(830, y - 5, 90, 10)}
<rect x="1100" y="${y - 11}" width="72" height="22" rx="11" fill="${C.gt}"/><circle cx="1116" cy="${y}" r="5" fill="${C.g}"/>${bar(1126, y - 4, 34, 8, C.g2)}</g>`;
  }).join("")}`;
  raw(`.ping{transform-box:fill-box;transform-origin:center;animation:ping 1.4s ease-out infinite}@keyframes ping{from{transform:scale(1);opacity:.5}to{transform:scale(2.6);opacity:0}}`);
  return svg("A SaaS dashboard: revenue, users and growth figures count up, the revenue chart draws and new customers appear.", body,
    [0, 1, 2].map((i) => `.ka${i},.kb${i},.kc${i}`).join(",") + "{opacity:0}");
}

// ─────────────────────────────────────────── 2. Pricing: the Pro plan is chosen, the card is charged, Pro unlocks
function two() {
  const T = 9;
  const plans = [["Basic", "$9", 250], ["Pro", "$29", 570], ["Team", "$99", 890]];
  const planCard = ([name, price, x], pro) => `
${card(x, 200, 290, 460, 28)}
${txt(x + 32, 252, name, { size: 26, anchor: "start", fill: pro ? C.g2 : C.sub })}
${txt(x + 32, 340, price, { size: 64, weight: 700, anchor: "start" })}${txt(x + 32 + price.length * 36 + 8, 340, "/mo", { size: 22, anchor: "start", fill: C.sub, weight: 500 })}
<path d="M${x + 32} 372 H${x + 258}" stroke="#EDEDED" stroke-width="3"/>
${[0, 1, 2, 3].map((i) => `${check(x + 44, 410 + i * 44, 0.8, pro || i < 2 ? C.g : "#CFCFCF", 4.5)}${bar(x + 70, 404 + i * 44, [150, 120, 160, 110][i], 12, i < 2 || pro ? "#BDBDBD" : "#E4E4E4")}`).join("")}
<rect x="${x + 32}" y="580" width="226" height="52" rx="26" fill="${pro ? C.ink : "#fff"}" stroke="${pro ? C.ink : "#DCDCDC"}" stroke-width="3"/>${bar(x + 95, 600, 100, 12, pro ? "#fff" : "#CFCFCF")}`;
  const body = `
${planCard(plans[0], false)}${planCard(plans[2], false)}
<g class="${kf("lift", T, [["0,24", "transform:translateY(0)"], ["30,92", "transform:translateY(-16px)"], ["96,100", "transform:translateY(0)"]], "", "ease")}">
${planCard(plans[1], true)}
<rect class="${flash("sel", T, 25, 92)}" x="570" y="200" width="290" height="460" rx="28" fill="none" stroke="${C.g}" stroke-width="6"/>
<g class="${flash("btn", T, 25, 92)}"><rect x="602" y="580" width="226" height="52" rx="26" fill="${C.g}"/>${check(715, 606, 1, "#fff", 5)}</g>
<g class="${appear("pro", T, 54, 92, { scale: true })}"><rect x="650" y="178" width="130" height="44" rx="22" fill="${C.g}" stroke="#fff" stroke-width="4"/>${sparkle(676, 200, 0.55, "#fff")}${txt(728, 209, "PRO", { size: 22, fill: "#fff", weight: 800, ls: 2 })}</g>
</g>
<circle class="${kf("tap", T, [["0,24", "transform:scale(.4);opacity:0"], [25, "transform:scale(.4);opacity:.8"], ["31,100", "transform:scale(1.6);opacity:0"]], "transform-box:fill-box;transform-origin:center")}" cx="715" cy="606" r="34" fill="none" stroke="${C.g}" stroke-width="5"/>
<g class="${kf("payin", T, [["0,32", "transform:translateX(70px);opacity:0"], ["38,92", "transform:translateX(0);opacity:1"], ["96,100", "transform:translateX(0);opacity:0"]], "", "ease")}">
<g filter="url(#sh)"><rect x="1240" y="300" width="250" height="156" rx="20" fill="${C.ink}"/></g>
<rect x="1266" y="336" width="44" height="34" rx="8" fill="${C.g}"/><path d="M1266 353 H1310 M1288 336 V370" stroke="${C.ink}" stroke-width="2" opacity=".4"/>
${txt(1266, 418, "•••• 4242", { size: 26, fill: "#fff", anchor: "start", mono: true })}${bar(1266, 432, 90, 8, "#555")}
<path d="M1446 336 a10 10 0 0 1 0 22 M1456 328 a20 20 0 0 1 0 38" fill="none" stroke="#777" stroke-width="4" stroke-linecap="round"/>
</g>
<g class="${appear("paid", T, 46, 92)}">${card(1240, 486, 250, 76, 38)}<circle cx="1280" cy="524" r="20" fill="${C.g}"/>${check(1280, 524, 0.8)}${txt(1312, 532, "Paid $29", { size: 24, anchor: "start" })}</g>
<g transform="translate(0 0)"><path d="M0 0 L0 34 L9 26 L16 42 L23 39 L16 24 L28 24 Z" fill="${C.ink}" stroke="#fff" stroke-width="3" stroke-linejoin="round"><animateMotion path="M1500 820 C1300 820 900 720 712 600" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.06;0.24;1" keyPoints="0;0;1;1" keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1"/></path></g>`;
  return svg("Pricing plans: the Pro plan is selected, the card is charged and the Pro badge unlocks.", body, ".tap{opacity:0}");
}

// ─────────────────────────────────────────── 3. Multi-tenant growth: workspaces join, MRR bars climb
function three() {
  const T = 9;
  const tiles = [];
  const letters = ["A", "B", "C", "D", "E", "F"];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
    const k = j * 3 + i, x = 210 + i * 210, y = 270 + j * 236;
    const tone = [C.g, C.ink, C.g2, C.ink, C.g, C.g2][k];
    tiles.push(`<g class="${appear(`t${k}`, T, 6 + k * 7, 92, { scale: true })}">${card(x, y, 190, 216, 22, { shadow: false })}
<rect x="${x + 22}" y="${y + 22}" width="48" height="48" rx="14" fill="${tone}"/>${txt(x + 46, y + 56, letters[k], { size: 26, fill: "#fff", weight: 800 })}
${bar(x + 22, y + 92, 120, 14, "#BDBDBD")}${bar(x + 22, y + 116, 80, 10)}
${[0, 1, 2].map((a) => `<circle cx="${x + 36 + a * 22}" cy="${y + 160}" r="13" fill="${["#DCDCDC", C.gt, "#E8E8E8"][a]}" stroke="#fff" stroke-width="3"/>`).join("")}
<rect x="${x + 22}" y="${y + 188}" width="146" height="8" rx="4" fill="#EDEDED"/><rect class="${grow(`u${k}`, T, 10 + k * 7, 22 + k * 7, 92)}" x="${x + 22}" y="${y + 188}" width="${60 + k * 14}" height="8" rx="4" fill="${C.g}"/></g>`);
  }
  const heights = [60, 95, 140, 190, 250, 320];
  const body = `
${card(170, 170, 700, 600, 32)}
${txt(210, 228, "Workspaces", { size: 28, anchor: "start" })}
<rect x="738" y="200" width="96" height="40" rx="20" fill="${C.gt}"/>${counter("tc", T, ["1", "2", "3", "4", "5", "6"], 6, 7, 92, `x="786" y="229" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="22" font-weight="700" fill="${C.g2}"`)}
${tiles.join("\n")}
${card(930, 170, 580, 600, 32)}
${txt(970, 228, "Monthly recurring revenue", { size: 22, anchor: "start", fill: C.sub, weight: 500 })}
${counter("mrr", T, ["$4.2k", "$7.9k", "$11.3k", "$18.9k"], 10, 10, 92, `x="970" y="296" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="56" font-weight="700" fill="${C.ink}"`)}
<g class="${appear("up", T, 46, 92, { scale: true })}"><rect x="1360" y="254" width="110" height="44" rx="22" fill="${C.g}"/><path d="M1384 286 l14 -14 l14 14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${txt(1440, 284, "4.5x", { size: 20, fill: "#fff", weight: 800 })}</g>
<path d="M970 720 H1470" stroke="#E4E4E4" stroke-width="3"/>
${heights.map((h, i) => `<rect class="${grow(`b${i}`, T, 8 + i * 7, 16 + i * 7, 92, { origin: "50% 100%", axis: "Y" })}" x="${985 + i * 80}" y="${720 - h}" width="52" height="${h}" rx="12" fill="${i === 5 ? C.g : i > 2 ? C.g2 : "#BDBDBD"}"${i > 2 && i < 5 ? ' opacity=".55"' : ""}/>`).join("")}`;
  return svg("Multi-tenant SaaS growth: new customer workspaces join one by one while monthly recurring revenue climbs.", body,
    [0, 1, 2, 3, 4].map((i) => `.tc${i}`).join(",") + "," + [0, 1, 2].map((i) => `.mrr${i}`).join(",") + "{opacity:0}");
}

export default { "saas-1": one, "saas-2": two, "saas-3": three };
