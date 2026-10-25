// AI Integration & Agents: a chat assistant answering from your data, RAG retrieval, an agent using tools.
import { C, raw, appear, flash, grow, kf, packet, svg, check, badge, card, bar, txt, sparkle, FLOW } from "./lib.mjs";

const typingDots = (x, y, cls) => `<g class="${cls}">${[0, 1, 2].map((i) => `<circle class="bounce b${i}" cx="${x + i * 24}" cy="${y}" r="8" fill="#9A9A9A"/>`).join("")}</g>`;
const BOUNCE = `.bounce{animation:bounce 1s ease-in-out infinite}.b1{animation-delay:.15s}.b2{animation-delay:.3s}@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-10px)}}`;

// ─────────────────────────────────────────── 1. Chat assistant: question typed, answer streams with a source
function one() {
  const T = 9;
  const lines = [400, 420, 360, 410, 250];
  const body = `
${card(450, 150, 772, 640, 32)}
<circle cx="500" cy="193" r="26" fill="${C.gt}"/>${sparkle(500, 193, 0.85)}
${bar(540, 178, 150, 16, C.ink)}<circle cx="546" cy="212" r="5" fill="${C.g}"/>${bar(558, 207, 76, 10)}
${[0, 1, 2].map((i) => `<circle cx="${1140 + i * 16}" cy="193" r="5" fill="#BDBDBD"/>`).join("")}
<path d="M450 236 H1222" stroke="#EDEDED" stroke-width="3"/>

<g class="${appear("q", T, 20, 92)}"><rect x="790" y="268" width="400" height="96" rx="26" fill="${C.ink}"/>${txt(818, 308, "What is our refund", { size: 26, fill: "#fff", anchor: "start", weight: 500 })}${txt(818, 342, "policy for annual plans?", { size: 26, fill: "#fff", anchor: "start", weight: 500 })}</g>

${typingDots(512, 424, flash("typing", T, 24, 33))}
<rect class="${flash("tbub", T, 24, 33)}" x="480" y="394" width="130" height="60" rx="26" fill="#F2F2F2" opacity=".0"/>
<g class="${appear("ans", T, 35, 92, { dy: 6 })}"><rect x="480" y="394" width="560" height="216" rx="26" fill="#F2F2F2"/>${sparkle(514, 426, 0.65)}</g>
${lines.map((w, i) => `<rect class="${grow(`l${i}`, T, 37 + i * 4.6, 41 + i * 4.6, 92)}" x="544" y="${418 + i * 36}" width="${w}" height="13" rx="6.5" fill="${i === 0 ? C.ink : "#A8A8A8"}"/>`).join("")}
<g class="${appear("src", T, 64, 92)}"><rect x="480" y="628" width="250" height="46" rx="23" fill="${C.gt}" stroke="${C.g}" stroke-width="3"/>
<path d="M502 640 h16 l7 7 v18 h-23 z" fill="#fff" stroke="${C.g2}" stroke-width="3" stroke-linejoin="round"/>${txt(536, 659, "refund-policy.pdf", { size: 20, fill: C.g2, anchor: "start", weight: 600 })}</g>
<g class="${appear("fast", T, 68, 92)}">${txt(1040, 659, "Answered in 1.2s", { size: 20, fill: C.sub, anchor: "end", weight: 500 })}</g>

<rect x="480" y="712" width="620" height="54" rx="27" fill="#F2F2F2"/>
<rect class="${kf("typed", T, [["0,4", "transform:scaleX(0);opacity:1"], ["16,19", "transform:scaleX(1);opacity:1"], ["21,100", "transform:scaleX(1);opacity:0"]], "transform-box:fill-box;transform-origin:0 50%", "linear")}" x="512" y="732" width="300" height="14" rx="7" fill="#9A9A9A"/>
${txt(512, 746, "Ask anything…", { size: 22, fill: "#BDBDBD", anchor: "start", weight: 500, cls: kf("ph", T, [["0,2", "opacity:1"], ["4,20", "opacity:0"], ["22,100", "opacity:1"]]) })}
<g class="${kf("send", T, [["0,17", "transform:scale(1)"], [19, "transform:scale(.82)"], ["21,100", "transform:scale(1)"]], "transform-box:fill-box;transform-origin:center")}"><circle cx="1150" cy="739" r="30" fill="${C.g}"/><path d="M1150 752 V726 M1139 737 L1150 726 L1161 737" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  raw(BOUNCE);
  return svg("An AI assistant: a question is typed and sent, the answer streams in and cites the source document.", body, ".typing,.typed{opacity:0}");
}

// ─────────────────────────────────────────── 2. RAG: documents → chunks → vector index → grounded answer
function two() {
  const T = 9;
  const doc = (x, y, rot) => `<g transform="rotate(${rot} ${x + 100} ${y + 130})">${card(x, y, 200, 260, 18, { shadow: false })}<rect x="${x + 22}" y="${y + 26}" width="60" height="12" rx="6" fill="${C.ink}"/>${[0, 1, 2, 3, 4, 5].map((i) => bar(x + 22, y + 60 + i * 28, [150, 130, 156, 110, 146, 90][i], 10)).join("")}</g>`;
  const chunks = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    const k = j * 3 + i;
    chunks.push(`<g class="${appear(`c${k}`, T, 12 + k * 1.6, 92, { scale: true })}"><rect x="${480 + i * 76}" y="${300 + j * 56}" width="64" height="42" rx="10" fill="#fff" stroke="${C.line}" stroke-width="3"/>${bar(492 + i * 76, 316 + j * 56, 40, 10, k % 4 === 1 ? C.g : "#CFCFCF")}</g>`);
  }
  const hits = new Set(["2,1", "3,1", "2,2", "3,2", "4,2"]);
  const dots = [];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 7; i++) {
    const x = 860 + i * 42, y = 290 + j * 48, hit = hits.has(`${i},${j}`);
    dots.push(`<circle cx="${x}" cy="${y}" r="8" fill="#DCDCDC"/>` + (hit ? `<circle class="hit" cx="${x}" cy="${y}" r="9" fill="${C.g}"/>` : ""));
  }
  const label = (x, s) => txt(x, 660, s, { size: 24, fill: C.sub, weight: 600 });
  const body = `
<path d="M395 430 H460 M720 430 H800 M1150 430 H1240" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" class="flow" fill="none"/>
${packet("M380 430 H475", T, 0.05, 0.12)}${packet("M705 430 H815", T, 0.32, 0.38)}${packet("M1135 430 H1255", T, 0.56, 0.62)}
${doc(150, 300, -6)}${doc(170, 290, 3)}${doc(185, 290, 0)}
${label(285, "Your documents")}
${chunks.join("")}
${label(594, "Chunks")}
${card(820, 240, 300, 330, 28)}
${dots.join("")}
<circle class="${flash("ring", T, 48, 60)}" cx="972" cy="362" r="80" fill="none" stroke="${C.g}" stroke-width="4" stroke-dasharray="8 8"/>
${label(970, "Vector index")}
<g class="${appear("query", T, 36, 92)}"><rect x="790" y="150" width="360" height="56" rx="28" fill="${C.ink}"/><circle cx="822" cy="176" r="10" fill="none" stroke="${C.g}" stroke-width="4"/><path d="M829 183 l9 9" stroke="${C.g}" stroke-width="4" stroke-linecap="round"/>${txt(850, 186, "“refund policy?”", { size: 24, fill: "#fff", anchor: "start", weight: 500 })}</g>
${card(1250, 250, 270, 330, 28)}
${sparkle(1290, 292, 0.8)}${bar(1318, 284, 120, 14, C.ink)}
${[0, 1, 2, 3, 4].map((i) => `<rect class="${grow(`a${i}`, T, 62 + i * 3, 65 + i * 3, 92)}" x="1280" y="${336 + i * 32}" width="${[200, 180, 210, 160, 120][i]}" height="12" rx="6" fill="#A8A8A8"/>`).join("")}
<g class="${appear("cite", T, 78, 92)}"><rect x="1280" y="510" width="96" height="36" rx="18" fill="${C.gt}"/>${txt(1328, 534, "p. 4", { size: 18, fill: C.g2, weight: 700 })}<rect x="1386" y="510" width="96" height="36" rx="18" fill="${C.gt}"/>${txt(1434, 534, "p. 9", { size: 18, fill: C.g2, weight: 700 })}</g>
${label(1385, "Grounded answer")}`;
  raw(FLOW);
  raw(`.hit{animation:hit ${T}s infinite}@keyframes hit{0%,50%{opacity:0;transform:scale(.4)}54%,92%{opacity:1;transform:scale(1)}95%,100%{opacity:0}}.hit{transform-box:fill-box;transform-origin:center}`);
  return svg("Retrieval-augmented AI: documents are split into chunks, indexed as vectors, the best matches are found and the answer cites its sources.", body, ".ring{opacity:0}");
}

// ─────────────────────────────────────────── 3. Agent: a goal, then tools used in turn, then the result
function three() {
  const T = 11;
  const tools = [
    ["Web search", 1150, 250, (x, y) => `<circle cx="${x}" cy="${y}" r="18"/><ellipse cx="${x}" cy="${y}" rx="7" ry="18"/><path d="M${x - 18} ${y} H${x + 18}"/>`],
    ["CRM", 260, 250, (x, y) => `<path d="M${x - 16} ${y - 10} v22 a16 6 0 0 0 32 0 v-22"/><ellipse cx="${x}" cy="${y - 10}" rx="16" ry="6"/><path d="M${x - 16} ${y + 1} a16 6 0 0 0 32 0"/>`],
    ["Calendar", 260, 560, (x, y) => `<rect x="${x - 19}" y="${y - 15}" width="38" height="34" rx="6"/><path d="M${x - 19} ${y - 4} H${x + 19} M${x - 9} ${y - 21} v10 M${x + 9} ${y - 21} v10"/><circle cx="${x - 7}" cy="${y + 8}" r="2.5" fill="${C.ink}"/><circle cx="${x + 7}" cy="${y + 8}" r="2.5" fill="${C.g}" stroke="${C.g}"/>`],
    ["Email", 1150, 560, (x, y) => `<rect x="${x - 20}" y="${y - 14}" width="40" height="28" rx="5"/><path d="M${x - 20} ${y - 12} L${x} ${y + 3} L${x + 20} ${y - 12}"/>`],
  ];
  const AX = 836, AY = 450;
  const body = `
<g stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow">${tools.map(([, x, y]) => `<path d="M${AX} ${AY} L${x + 130} ${y + 60}"/>`).join("")}</g>
${tools.map(([, x, y], i) => {
    const t0 = 0.06 + i * 0.2;
    return packet(`M${AX} ${AY} L${x + 130} ${y + 60}`, T, t0, t0 + 0.06) + packet(`M${AX} ${AY} L${x + 130} ${y + 60}`, T, t0 + 0.13, t0 + 0.19, { back: true, fill: C.ink, r: 10 });
  }).join("")}
<g class="spin"><circle cx="${AX}" cy="${AY}" r="134" fill="none" stroke="${C.g}" stroke-width="4" stroke-dasharray="12 16"/></g>
<g filter="url(#sh)"><circle cx="${AX}" cy="${AY}" r="104" fill="#fff" stroke="${C.line}" stroke-width="3"/></g>
<circle class="think" cx="${AX}" cy="${AY}" r="104" fill="${C.gt}"/>
${sparkle(AX, AY - 6, 2.6)}${sparkle(AX + 44, AY - 44, 0.9, C.g2)}
${txt(AX, 640, "AI Agent", { size: 28 })}
<g class="${appear("goal", T, 1, 92)}"><rect x="606" y="110" width="460" height="62" rx="31" fill="${C.ink}"/>${txt(AX, 150, "“Book a demo with Acme Inc.”", { size: 24, fill: "#fff", weight: 500 })}</g>
${tools.map(([name, x, y, icon], i) => {
    const t = 12 + i * 20;
    return `${card(x, y, 260, 120, 24)}
<rect class="${flash(`on${i}`, T, t, t + 9)}" x="${x}" y="${y}" width="260" height="120" rx="24" fill="${C.gt}" stroke="${C.g}" stroke-width="5"/>
<rect x="${x + 22}" y="${y + 28}" width="64" height="64" rx="16" fill="${C.gt}"/><g fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${icon(x + 54, y + 60)}</g>
${txt(x + 104, y + 56, name, { size: 24, anchor: "start" })}${bar(x + 104, y + 72, 110, 10)}
${badge(x + 246, y + 14, appear(`ok${i}`, T, t + 7, 92, { scale: true }))}`;
  }).join("")}
<g class="${appear("done", T, 86, 96, { scale: true })}"><rect x="586" y="700" width="500" height="76" rx="38" fill="${C.g}"/><circle cx="632" cy="738" r="20" fill="#fff"/>${check(632, 738, 0.8, C.g2)}${txt(664, 747, "Demo booked · invite sent", { size: 24, fill: "#fff", anchor: "start", weight: 700 })}</g>`;
  raw(FLOW);
  raw(`.spin{transform-box:fill-box;transform-origin:center;animation:spin 14s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.think{animation:think 1.6s ease-in-out infinite}@keyframes think{0%,100%{opacity:0}50%{opacity:.7}}`);
  return svg("An AI agent works toward a goal: it searches the web, updates the CRM, books the calendar and sends the email invite.", body, ".think{opacity:0}");
}

export default { "ai-1": one, "ai-2": two, "ai-3": three };
