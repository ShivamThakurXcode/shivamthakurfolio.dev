// APIs & Integrations: an API hub wired to your tools, a webhook triggering actions, a WhatsApp bot flow.
import { C, raw, appear, flash, kf, packet, svg, check, badge, card, bar, txt, sparkle, dots3, FLOW } from "./lib.mjs";

const ICON = {
  pay: (x, y) => `<rect x="${x - 24}" y="${y - 17}" width="48" height="34" rx="6"/><path d="M${x - 24} ${y - 6} H${x + 24} M${x - 14} ${y + 8} H${x - 2}"/>`,
  chat: (x, y) => `<path d="M${x - 22} ${y + 20} l5 -13 a24 22 0 1 1 9 8 z"/><path d="M${x - 8} ${y - 6} q4 10 14 12" stroke-width="4"/>`,
  mail: (x, y) => `<rect x="${x - 24}" y="${y - 17}" width="48" height="34" rx="6"/><path d="M${x - 24} ${y - 14} L${x} ${y + 4} L${x + 24} ${y - 14}"/>`,
  crm: (x, y) => `<circle cx="${x - 9}" cy="${y - 8}" r="9"/><path d="M${x - 26} ${y + 20} a17 15 0 0 1 34 0"/><circle cx="${x + 13}" cy="${y - 4}" r="7"/><path d="M${x + 6} ${y + 9} a14 12 0 0 1 20 11"/>`,
  cart: (x, y) => `<path d="M${x - 26} ${y - 18} h8 l7 28 h26 l6 -20 h-36"/><circle cx="${x - 6}" cy="${y + 18}" r="4"/><circle cx="${x + 14}" cy="${y + 18}" r="4"/>`,
  cal: (x, y) => `<rect x="${x - 22}" y="${y - 18}" width="44" height="40" rx="7"/><path d="M${x - 22} ${y - 5} H${x + 22} M${x - 10} ${y - 24} v11 M${x + 10} ${y - 24} v11"/>`,
  server: (x, y) => `<rect x="${x - 30}" y="${y - 30}" width="60" height="24" rx="6"/><rect x="${x - 30}" y="${y + 4}" width="60" height="24" rx="6"/><circle cx="${x - 16}" cy="${y - 18}" r="3" fill="${C.g}" stroke="none"/><circle cx="${x - 16}" cy="${y + 16}" r="3" fill="${C.g}" stroke="none"/>`,
  bell: (x, y) => `<path d="M${x - 18} ${y + 12} c4 -4 4 -10 4 -18 a14 14 0 0 1 28 0 c0 8 0 14 4 18 z"/><path d="M${x - 6} ${y + 18} a6 6 0 0 0 12 0"/>`,
};
const icon = (k, x, y, w = 5) => `<g fill="none" stroke="${C.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICON[k](x, y)}</g>`;

// ─────────────────────────────────────────── 1. API hub with spokes; data flows in from every tool
function one() {
  const T = 8, HX = 836, HY = 470, R = 300;
  const sats = ["pay", "chat", "mail", "cart", "crm", "cal"].map((k, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    return [k, HX + Math.cos(a) * R, HY + Math.sin(a) * R];
  });
  const body = `
<g stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow">${sats.map(([, x, y]) => `<path d="M${x} ${y} L${HX} ${HY}"/>`).join("")}</g>
${sats.map(([, x, y], i) => packet(`M${x} ${y} L${HX} ${HY}`, T, 0.04 + i * 0.14, 0.12 + i * 0.14)).join("")}
<g class="spin"><circle cx="${HX}" cy="${HY}" r="132" fill="none" stroke="${C.g}" stroke-width="4" stroke-dasharray="12 16"/></g>
<circle class="pulse" cx="${HX}" cy="${HY}" r="104" fill="${C.g}" opacity=".25"/>
<g filter="url(#sh)"><circle cx="${HX}" cy="${HY}" r="104" fill="${C.ink}"/></g>
${txt(HX, HY - 6, "{ }", { size: 54, fill: C.g, weight: 700, mono: true })}${txt(HX, HY + 42, "API", { size: 30, fill: "#fff", weight: 800, ls: 4 })}
${sats.map(([k, x, y], i) => `<g filter="url(#sh)"><circle cx="${x}" cy="${y}" r="66" fill="#fff" stroke="${C.line}" stroke-width="3"/></g>
<circle class="${flash(`s${i}`, T, 2 + i * 14, 12 + i * 14)}" cx="${x}" cy="${y}" r="66" fill="${C.gt}" stroke="${C.g}" stroke-width="5"/>${icon(k, x, y)}`).join("")}`;
  raw(FLOW);
  raw(`.spin{transform-box:fill-box;transform-origin:center;animation:spin 16s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.pulse{transform-box:fill-box;transform-origin:center;animation:pulse ${T / 6}s ease-out infinite}@keyframes pulse{0%{transform:scale(1);opacity:.35}100%{transform:scale(1.45);opacity:0}}`);
  return svg("An API hub connected to payments, chat, email, shop, CRM and calendar, with data flowing in from each.", body);
}

// ─────────────────────────────────────────── 2. A webhook arrives, the API answers 200 OK, actions fire
function two() {
  const T = 9;
  const json = [
    ["{", C.mute, 0], ['"type": "payment.succeeded",', "#E6E6E6", 1], ['"amount": 4900,', "#E6E6E6", 1], ['"currency": "usd",', "#E6E6E6", 1], ['"order": "ord_1042"', "#E6E6E6", 1], ["}", C.mute, 0],
  ];
  const actions = [["Order marked paid", "cart", 250], ["Receipt emailed", "mail", 430], ["Team notified", "bell", 610]];
  const body = `
<path d="M600 470 H700" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${actions.map(([, , y]) => `<path d="M970 470 C1030 470 1020 ${y + 55} 1080 ${y + 55}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>`).join("")}
${packet("M585 470 H715", T, 0.18, 0.24)}
${actions.map(([, , y], i) => packet(`M955 470 C1030 470 1020 ${y + 55} 1095 ${y + 55}`, T, 0.32 + i * 0.12, 0.38 + i * 0.12)).join("")}
<g filter="url(#sh)"><rect x="170" y="250" width="430" height="440" rx="28" fill="#1E1E1E"/></g>
<rect x="200" y="280" width="226" height="44" rx="22" fill="${C.g}"/>${txt(313, 309, "POST /webhooks", { size: 20, fill: C.ink, weight: 700, mono: true })}
${json.map(([s, col, ind], i) => txt(210 + ind * 26, 382 + i * 46, s, { size: 21, fill: col, anchor: "start", weight: 400, mono: true, cls: appear(`j${i}`, T, 3 + i * 2, 92, { dy: 4 }) })).join("")}
${card(700, 320, 270, 300, 28)}${icon("server", 835, 420)}
${txt(835, 506, "Your API", { size: 26 })}
<g class="${appear("ok", T, 26, 92, { scale: true })}"><rect x="760" y="538" width="150" height="46" rx="23" fill="${C.gt}"/><circle cx="786" cy="561" r="7" fill="${C.g}"/>${txt(846, 569, "200 OK", { size: 22, fill: C.g2, weight: 800, mono: true })}</g>
${actions.map(([name, k, y], i) => `${card(1080, y, 420, 110, 24)}
<rect class="${flash(`a${i}`, T, 38 + i * 12, 92)}" x="1080" y="${y}" width="420" height="110" rx="24" fill="${C.gt}" stroke="${C.g}" stroke-width="4"/>
<rect x="1104" y="${y + 23}" width="64" height="64" rx="16" fill="#fff" stroke="${C.line}" stroke-width="3"/>${icon(k, 1136, y + 55, 4)}
${txt(1190, y + 64, name, { size: 26, anchor: "start" })}${badge(1460, y + 55, appear(`d${i}`, T, 39 + i * 12, 92, { scale: true }))}`).join("")}`;
  raw(FLOW);
  return svg("A payment webhook arrives at your API, which answers 200 OK and triggers order, email and team notification actions.", body);
}

// ─────────────────────────────────────────── 3. WhatsApp support bot: chat on the left, the automation flow on the right
function three() {
  const T = 10;
  const nodes = [["Message received", "chat"], ["Detect intent: order status", "ai"], ["Fetch order · Shop API", "server"], ["Reply with tracking + buttons", "send"]];
  const nodeIcon = (k, x, y) => k === "ai" ? sparkle(x, y, 1.1) : k === "send"
    ? `<path d="M${x - 18} ${y - 16} L${x + 20} ${y} L${x - 18} ${y + 16} L${x - 10} ${y} Z" fill="${C.g}"/>`
    : `<g transform="translate(${x} ${y}) scale(.7) translate(${-x} ${-y})">${icon(k, x, y, 6)}</g>`;
  const body = `
<defs><clipPath id="chat"><rect x="200" y="130" width="520" height="680" rx="36"/></clipPath></defs>
<path d="M720 300 C860 300 880 218 1000 218" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${packet("M720 300 C860 300 880 218 1000 218", T, 0.06, 0.1)}
${[0, 1, 2].map((i) => `<path d="M1210 ${266 + i * 160} V${330 + i * 160}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="8 8" class="flow"/>${packet(`M1210 ${256 + i * 160} V${340 + i * 160}`, T, 0.14 + i * 0.09, 0.19 + i * 0.09)}`).join("")}
<path d="M1000 698 C860 698 860 430 720 430" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${packet("M1000 698 C860 698 860 430 720 430", T, 0.38, 0.42)}
<g filter="url(#sh)"><rect x="200" y="130" width="520" height="680" rx="36" fill="#F4F4F4"/></g>
<g clip-path="url(#chat)"><rect x="200" y="130" width="520" height="100" fill="${C.g2}"/></g>
<circle cx="256" cy="180" r="26" fill="#fff"/><g transform="translate(256 182) scale(.36)" fill="none" stroke="${C.g2}" stroke-width="9" stroke-linejoin="round"><path d="M-34 -18 H34 L28 40 H-28 Z"/><path d="M-16 -18 V-28 a16 16 0 0 1 32 0 V-18"/></g>
${txt(296, 176, "Shop Support", { size: 26, fill: "#fff", anchor: "start", weight: 700 })}${txt(296, 204, "online · replies instantly", { size: 18, fill: "#D9FBE6", anchor: "start", weight: 500 })}
<g class="${appear("m1", T, 3, 94)}"><rect x="430" y="262" width="262" height="64" rx="20" fill="#D9FBE6"/>${txt(452, 302, "Where is my order?", { size: 22, anchor: "start", weight: 500 })}
<path d="M640 314 l5 5 l9 -9 M650 314 l5 5 l9 -9" fill="none" stroke="#9A9A9A" stroke-width="2.5" stroke-linecap="round" class="${flash("tk", T, 0, 8)}"/>
<path d="M640 314 l5 5 l9 -9 M650 314 l5 5 l9 -9" fill="none" stroke="${C.g2}" stroke-width="2.5" stroke-linecap="round" class="${flash("tk2", T, 8, 94)}"/></g>
<g class="${flash("typ", T, 12, 40)}"><rect x="228" y="352" width="110" height="54" rx="20" fill="#fff"/><g class="dotsb">${dots3(256, 379, 26, 7, "#9A9A9A")}</g></g>
<g class="${appear("m2", T, 42, 94)}"><rect x="228" y="352" width="380" height="150" rx="20" fill="#fff"/>
${txt(252, 392, "Order #1042 is on its way.", { size: 22, anchor: "start", weight: 500 })}${txt(252, 426, "Arriving today, 2–4 PM.", { size: 22, anchor: "start", weight: 500 })}
<rect x="252" y="452" width="330" height="10" rx="5" fill="#EDEDED"/><rect x="252" y="452" width="250" height="10" rx="5" fill="${C.g}"/><circle cx="502" cy="457" r="9" fill="${C.g}" stroke="#fff" stroke-width="3"/></g>
<g class="${appear("qr", T, 47, 94)}"><rect x="228" y="516" width="178" height="48" rx="24" fill="#fff" stroke="${C.g}" stroke-width="3"/>${txt(317, 547, "Track order", { size: 20, fill: C.g2, weight: 700 })}
<rect x="418" y="516" width="190" height="48" rx="24" fill="#fff" stroke="${C.g}" stroke-width="3"/>${txt(513, 547, "Talk to agent", { size: 20, fill: C.g2, weight: 700 })}</g>
<rect class="${flash("press", T, 56, 60)}" x="228" y="516" width="178" height="48" rx="24" fill="${C.g}" opacity=".35"/>
<g class="${appear("m3", T, 62, 94)}"><rect x="228" y="582" width="300" height="190" rx="20" fill="#fff"/><rect x="244" y="598" width="268" height="158" rx="14" fill="${C.gt}"/>
<path d="M266 734 C320 700 300 650 360 650 S430 690 490 622" fill="none" stroke="${C.g2}" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/><circle cx="266" cy="734" r="8" fill="${C.ink}"/>
<path d="M490 596 a16 16 0 0 1 16 16 c0 14 -16 28 -16 28 s-16 -14 -16 -28 a16 16 0 0 1 16 -16z" fill="${C.g}"/><circle cx="490" cy="612" r="6" fill="#fff"/></g>
${nodes.map(([name, k], i) => {
    const y = 170 + i * 160;
    return `${card(1000, y, 460, 96, 24)}<rect class="${flash(`f${i}`, T, 8 + i * 9, 94)}" x="1000" y="${y}" width="460" height="96" rx="24" fill="${C.gt}" stroke="${C.g}" stroke-width="4"/>
<rect x="1022" y="${y + 18}" width="60" height="60" rx="16" fill="#fff" stroke="${C.line}" stroke-width="3"/>${nodeIcon(k, 1052, y + 48)}
${txt(1100, y + 57, name, { size: 22, anchor: "start" })}${badge(1440, y + 4, appear(`k${i}`, T, 10 + i * 9, 94, { scale: true }), 16)}`;
  }).join("")}`;
  raw(FLOW);
  raw(`.dotsb circle{animation:bounce 1s ease-in-out infinite}.dotsb circle:nth-child(2){animation-delay:.15s}.dotsb circle:nth-child(3){animation-delay:.3s}@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}}`);
  return svg("A WhatsApp support bot: a customer asks about an order, the automation detects intent, fetches the order and replies with tracking and quick-reply buttons.", body, ".typ,.tk,.press{opacity:0}");
}

export default { "integrations-1": one, "integrations-2": two, "integrations-3": three };
