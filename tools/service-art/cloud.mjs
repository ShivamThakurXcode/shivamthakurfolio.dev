// Cloud, DevOps & Care: uptime monitoring, autoscaling containers, Lighthouse scores and daily backups.
import { C, raw, appear, flash, grow, kf, counter, packet, svg, check, badge, card, bar, txt, FLOW } from "./lib.mjs";

const F = `font-family="Inter, 'Segoe UI', Arial, sans-serif"`;

// ─────────────────────────────────────────── 1. Uptime monitor: heartbeat, 99.99%, 90 days of green
function one() {
  const T = 6, P = 230, X0 = 490, Y0 = 520;
  const beat = (x) => `L${x + 70} ${Y0} L${x + 82} ${Y0 - 14} L${x + 94} ${Y0} L${x + 110} ${Y0} L${x + 122} ${Y0 - 70} L${x + 136} ${Y0 + 40} L${x + 148} ${Y0} L${x + P} ${Y0}`;
  let d = `M${X0 - P} ${Y0}`;
  for (let k = -1; k < 5; k++) d += beat(X0 + k * P);
  const body = `
<defs><clipPath id="ecg"><rect x="${X0}" y="420" width="692" height="170" rx="20"/></clipPath></defs>
${card(450, 160, 772, 620, 32)}
<circle class="ping" cx="500" cy="222" r="11" fill="${C.g}"/><circle cx="500" cy="222" r="9" fill="${C.g}"/>
${txt(524, 231, "All systems operational", { size: 24, anchor: "start" })}${txt(1186, 231, "Last 90 days", { size: 20, anchor: "end", fill: C.sub, weight: 500 })}
${txt(486, 344, "99.99%", { size: 88, weight: 800, anchor: "start" })}${txt(492, 386, "Uptime", { size: 22, fill: C.sub, anchor: "start", weight: 500 })}
${counter("ms", T, ["131 ms", "126 ms", "128 ms", "124 ms"], 0.01, 25, 99, `x="1186" y="330" text-anchor="end" ${F} font-size="40" font-weight="800" fill="${C.ink}"`)}
${txt(1186, 368, "Avg response", { size: 20, fill: C.sub, anchor: "end", weight: 500 })}
<rect x="${X0}" y="420" width="692" height="170" rx="20" fill="#F7F7F7"/>
${[460, 520, 560].map((y) => `<path d="M${X0} ${y} H${X0 + 692}" stroke="#ECECEC" stroke-width="2" stroke-dasharray="6 8"/>`).join("")}
<g clip-path="url(#ecg)"><g class="ecg"><path d="${d}" fill="none" stroke="${C.g}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></g></g>
${Array.from({ length: 30 }, (_, i) => `<rect class="${grow(`u${i}`, T * 3, i * 1.2, i * 1.2 + 4, 99, { origin: "50% 100%", axis: "Y" })}" x="${X0 + i * 23.4}" y="618" width="16" height="48" rx="6" fill="${i === 17 ? "#BDBDBD" : C.g}"${i === 17 ? "" : ` opacity="${0.75 + (i % 3) * 0.12}"`}/>`).join("")}
${txt(X0, 706, "90 days ago", { size: 18, fill: C.sub, anchor: "start", weight: 500 })}${txt(X0 + 692, 706, "Today", { size: 18, fill: C.sub, anchor: "end", weight: 500 })}`;
  raw(`.ecg{animation:ecg 1.8s linear infinite}@keyframes ecg{to{transform:translateX(-${P}px)}}
.ping{transform-box:fill-box;transform-origin:center;animation:ping 1.6s ease-out infinite}@keyframes ping{from{transform:scale(1);opacity:.6}to{transform:scale(2.6);opacity:0}}`);
  return svg("An uptime monitor: all systems operational at 99.99%, a live heartbeat line, response time and 90 days of green status bars.", body, ".ms0,.ms1,.ms2{opacity:0}");
}

// ─────────────────────────────────────────── 2. Autoscaling: traffic rises, containers scale out, then back in
function two() {
  const T = 10;
  const slots = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) slots.push([860 + i * 160, 268 + j * 160]);
  // when each container is up: [on, off] (percent of cycle); 0 = from the start
  const life = [[0, 100], [0, 100], [14, 86], [14, 86], [28, 78], [28, 78], [28, 78], [28, 78], [40, 68], [40, 68], [40, 68], [40, 68]];
  const box = ([x, y], k) => {
    const [on, off] = life[k];
    const inner = `<rect x="${x}" y="${y}" width="140" height="140" rx="22" fill="${C.gt}" stroke="${C.g}" stroke-width="4"/>
<path d="M${x + 40} ${y + 50} l30 -16 l30 16 v36 l-30 16 l-30 -16 z M${x + 40} ${y + 50} l30 16 l30 -16 M${x + 70} ${y + 66} v36" fill="none" stroke="${C.g2}" stroke-width="4" stroke-linejoin="round"/>
<rect x="${x + 22}" y="${y + 116}" width="96" height="8" rx="4" fill="#fff"/><rect class="cpu c${k % 3}" x="${x + 22}" y="${y + 116}" width="96" height="8" rx="4" fill="${C.g}"/>`;
    if (on === 0) return inner;
    return `<g class="${kf(`k${k}`, T, [[`0,${on}`, "opacity:0;transform:scale(.5)"], [`${on + 3},${off}`, "opacity:1;transform:scale(1)"], [`${off + 3},100`, "opacity:0;transform:scale(.5)"]], "transform-box:fill-box;transform-origin:center", "cubic-bezier(.2,.8,.2,1)")}">${inner}</g>`;
  };
  const users = Array.from({ length: 8 }, (_, i) => `<circle r="10" fill="${i % 3 ? C.ink : C.g}" opacity=".85"><animateMotion path="M150 ${430 + (i % 3) * 30} C300 ${430 + (i % 3) * 30} 420 470 560 470" dur="${1.4 + (i % 4) * 0.2}s" begin="${-i * 0.37}s" repeatCount="indefinite"/></circle>`).join("");
  const body = `
<path d="M675 470 H820" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${[0.1, 0.3, 0.5, 0.7].map((t) => packet("M660 470 H835", T, t, t + 0.05)).join("")}
<g class="${kf("crowd", T, [["0,6", "opacity:.35"], ["40,62", "opacity:1"], ["86,100", "opacity:.35"]])}">${users}</g>
${card(150, 190, 330, 150, 24)}${txt(176, 236, "Requests / sec", { size: 20, anchor: "start", fill: C.sub, weight: 500 })}
${["120", "640", "1.8k", "4.2k", "1.1k", "300"].map((v, i) => `<text class="rq${i}" x="176" y="300" ${F} font-size="46" font-weight="800" fill="${C.ink}">${v}</text>`).join("")}
<g filter="url(#sh)"><rect x="565" y="415" width="110" height="110" rx="26" fill="${C.ink}"/></g>
<path d="M592 470 H620 M620 470 l26 -24 M620 470 l26 24 M620 470 H650" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="650" cy="446" r="5" fill="${C.g}"/><circle cx="650" cy="470" r="5" fill="${C.g}"/><circle cx="650" cy="494" r="5" fill="${C.g}"/>
${txt(620, 568, "Load balancer", { size: 20, fill: C.sub, weight: 600 })}
${card(820, 190, 700, 600, 28)}
${txt(860, 240, "Containers", { size: 24, anchor: "start" })}
<rect x="1374" y="212" width="110" height="40" rx="20" fill="${C.gt}"/>
${["2", "4", "8", "12", "8", "4", "2"].map((v, i) => `<text class="cn${i}" x="1429" y="240" text-anchor="middle" ${F} font-size="22" font-weight="800" fill="${C.g2}">${v}</text>`).join("")}
${slots.map(([x, y]) => `<rect x="${x}" y="${y}" width="140" height="140" rx="22" fill="none" stroke="#E4E4E4" stroke-width="3" stroke-dasharray="8 8"/>`).join("")}
${slots.map(box).join("")}`;
  // the counters follow the container timeline, so re-time them explicitly
  const steps = [[0, 14], [14, 28], [28, 40], [40, 68], [68, 78], [78, 86], [86, 100]];
  raw(steps.map(([a, b], i) => `.cn${i}{animation:cn${i} ${T}s infinite}@keyframes cn${i}{${a === 0 ? `0%,${b}%{opacity:1}${b + 1}%,100%{opacity:0}` : b === 100 ? `0%,${a}%{opacity:0}${a + 1}%,100%{opacity:1}` : `0%,${a}%{opacity:0}${a + 1}%,${b}%{opacity:1}${b + 1}%,100%{opacity:0}`}}`).join("\n"));
  const rq = [[0, 14], [14, 28], [28, 40], [40, 68], [68, 86], [86, 100]];
  raw(rq.map(([a, b], i) => `.rq${i}{animation:rq${i} ${T}s infinite}@keyframes rq${i}{${a === 0 ? `0%,${b}%{opacity:1}${b + 1}%,100%{opacity:0}` : b === 100 ? `0%,${a}%{opacity:0}${a + 1}%,100%{opacity:1}` : `0%,${a}%{opacity:0}${a + 1}%,${b}%{opacity:1}${b + 1}%,100%{opacity:0}`}}`).join("\n"));
  raw(FLOW);
  raw(`.cpu{transform-box:fill-box;transform-origin:0 50%;animation:cpu 2.4s ease-in-out infinite}.c1{animation-delay:-.8s}.c2{animation-delay:-1.6s}@keyframes cpu{0%,100%{transform:scaleX(.35)}50%{transform:scaleX(.85)}}`);
  return svg("Autoscaling in the cloud: as traffic rises the load balancer spreads requests and containers scale out from 2 to 12, then back in.", body,
    ".cn1,.cn2,.cn4,.cn5,.cn6,.rq0,.rq1,.rq2,.rq4,.rq5{opacity:0}");
}

// ─────────────────────────────────────────── 3. Lighthouse 100s and daily backups
function three() {
  const T = 9, R = 84, CIRC = 2 * Math.PI * R;
  const names = ["Performance", "Accessibility", "Best Practices", "SEO"];
  const gauges = names.map((n, i) => {
    const x = 386 + i * 300, y = 320, at = 6 + i * 4;
    return `<circle cx="${x}" cy="${y}" r="${R + 30}" fill="#fff" filter="url(#sh)"/>
<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="#EDEDED" stroke-width="16"/>
<circle class="${kf(`g${i}`, T, [[`0,${at}`, `stroke-dashoffset:${CIRC}`], [`${at + 16},92`, "stroke-dashoffset:0"], ["96,100", `stroke-dashoffset:${CIRC}`]], "", "cubic-bezier(.3,0,.2,1)")}" cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${C.g}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${CIRC}" transform="rotate(-90 ${x} ${y})"/>
${counter(`n${i}`, T, ["12", "47", "81", "100"], at, 4, 92, `x="${x}" y="${y + 16}" text-anchor="middle" ${F} font-size="46" font-weight="800" fill="${C.ink}"`)}
${txt(x, y + 160, n, { size: 22, fill: C.sub })}`;
  }).join("");
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const body = `
${gauges}
${card(300, 560, 1072, 210, 28)}
<g class="spin"><path d="M396 642 a34 34 0 1 1 -8 24" fill="none" stroke="${C.g}" stroke-width="7" stroke-linecap="round"/><path d="M382 628 l6 16 l16 -6" fill="none" stroke="${C.g}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>
${txt(490, 652, "Daily backups", { size: 28, anchor: "start" })}${txt(490, 690, "Restore any day in one click", { size: 20, anchor: "start", fill: C.sub, weight: 500 })}
${days.map((d, i) => {
    const x = 800 + i * 76;
    return `<circle cx="${x}" cy="650" r="26" fill="#F4F4F4" stroke="#E4E4E4" stroke-width="3"/>
<g class="${appear(`d${i}`, T, 30 + i * 7, 92, { scale: true })}"><circle cx="${x}" cy="650" r="26" fill="${C.g}"/>${check(x, 650, 0.9)}</g>${txt(x, 712, d, { size: 18, fill: C.sub })}`;
  }).join("")}`;
  raw(`.spin{transform-box:fill-box;transform-origin:center;animation:spin 3s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`);
  return svg("Lighthouse scores fill to 100 for performance, accessibility, best practices and SEO, while daily backups tick off each day of the week.", body,
    [0, 1, 2, 3].map((i) => `.n${i}0,.n${i}1,.n${i}2`).join(",") + "{opacity:0}");
}

export default { "cloud-care-1": one, "cloud-care-2": two, "cloud-care-3": three };
