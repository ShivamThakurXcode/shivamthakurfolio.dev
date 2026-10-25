// E-commerce Development: add to cart, checkout steps, secure payment → order confirmed → delivered.
import { C, raw, appear, flash, grow, kf, draw, packet, svg, check, badge, card, bar, txt, sparkle, FLOW } from "./lib.mjs";

const cartIcon = (x, y, s = 1, col = C.ink, w = 5) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="M-24 -16 h8 l7 26 h26 l6 -18 h-35"/><circle cx="-5" cy="18" r="4"/><circle cx="14" cy="18" r="4"/></g>`;
// simple product glyphs drawn inside an image tile centred on x,y
const GLYPH = [
  (x, y) => `<path d="M${x - 46} ${y + 20} q10 -30 40 -30 l30 -10 q14 0 20 20 v20 z" fill="${C.ink}"/><path d="M${x - 46} ${y + 20} h90" stroke="#fff" stroke-width="5"/>`,
  (x, y) => `<rect x="${x - 18}" y="${y - 40}" width="36" height="16" rx="5" fill="${C.ink}"/><rect x="${x - 28}" y="${y - 26}" width="56" height="70" rx="16" fill="${C.g}"/>`,
  (x, y) => `<circle cx="${x}" cy="${y}" r="38" fill="none" stroke="${C.ink}" stroke-width="10"/><circle cx="${x}" cy="${y}" r="14" fill="${C.g}"/>`,
  (x, y) => `<path d="M${x - 36} ${y - 20} h72 l-8 60 h-56 z" fill="${C.g2}"/><path d="M${x - 16} ${y - 20} v-10 a16 16 0 0 1 32 0 v10" fill="none" stroke="${C.ink}" stroke-width="6"/>`,
  (x, y) => `<rect x="${x - 34}" y="${y - 34}" width="68" height="68" rx="34" fill="#fff" stroke="${C.ink}" stroke-width="8"/><path d="M${x} ${y - 18} V${y} L${x + 14} ${y + 10}" stroke="${C.ink}" stroke-width="6" stroke-linecap="round" fill="none"/>`,
  (x, y) => `<path d="M${x - 40} ${y - 10} l40 -30 l40 30 l-14 10 v40 h-52 v-40 z" fill="${C.ink}"/>`,
];

// ─────────────────────────────────────────── 1. Storefront: products fly into the cart, counter goes up
function one() {
  const T = 8;
  const cells = [];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) cells.push([470 + i * 250, 244 + j * 278, j * 3 + i]);
  const fly = (k, t0, t1) => {
    const [x, y] = cells[k];
    return `<g><animateMotion path="M${x + 196} ${y + 232} C${x + 196} ${y + 80} ${1100} 120 1176 186" dur="${T}s" repeatCount="indefinite" calcMode="linear" keyTimes="0;${t0};${t1};1" keyPoints="0;0;1;1"/>
<g class="${kf(`fly${k}`, T, [[`0,${t0 * 100 - 0.1}`, "opacity:0;transform:scale(1)"], [t0 * 100, "opacity:1;transform:scale(1)"], [t1 * 100 - 0.5, "opacity:1;transform:scale(.45)"], [`${t1 * 100},100`, "opacity:0;transform:scale(.45)"]])}"><circle r="26" fill="${C.g}" stroke="#fff" stroke-width="5"/>${cartIcon(0, 0, 0.45, "#fff", 8)}</g></g>`;
  };
  const body = `
${card(440, 140, 792, 680, 32)}
<rect x="476" y="174" width="34" height="34" rx="10" fill="${C.g}"/>${bar(522, 184, 90, 14, C.ink)}
${[0, 1, 2].map((i) => bar(700 + i * 74, 186, 54, 10, "#CFCFCF")).join("")}
<rect x="930" y="170" width="190" height="42" rx="21" fill="#F4F4F4"/><circle cx="954" cy="191" r="8" fill="none" stroke="#9A9A9A" stroke-width="3"/>${bar(972, 186, 100, 10, "#DCDCDC")}
<g class="bounce">${cartIcon(1176, 192, 1.1)}</g>
<circle cx="1200" cy="168" r="17" fill="${C.ink}" stroke="#fff" stroke-width="4"/>
${["0", "1", "2"].map((n, i) => txt(1200, 175, n, { size: 18, fill: "#fff", weight: 800, cls: kf(`c${i}`, T, i === 0 ? [["0,23", "opacity:1"], ["24,96", "opacity:0"], ["98,100", "opacity:1"]] : i === 1 ? [["0,23", "opacity:0"], ["24,57", "opacity:1"], ["58,100", "opacity:0"]] : [["0,57", "opacity:0"], ["58,94", "opacity:1"], ["96,100", "opacity:0"]]) })).join("")}
${cells.map(([x, y, k]) => `${card(x, y, 230, 262, 22, { shadow: false })}<rect x="${x + 14}" y="${y + 14}" width="202" height="146" rx="16" fill="${[C.gt, "#F4F4F4", "#F4F4F4", C.gt, "#F4F4F4", C.gt][k]}"/>${GLYPH[k](x + 115, y + 88)}
${bar(x + 18, y + 180, 120, 13, "#9A9A9A")}${txt(x + 18, y + 236, ["$89", "$24", "$59", "$42", "$129", "$310"][k], { size: 26, weight: 800, anchor: "start" })}
<circle cx="${x + 196}" cy="${y + 228}" r="20" fill="${C.ink}"/><path d="M${x + 196} ${y + 219} v18 M${x + 187} ${y + 228} h18" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`).join("")}
${[[1, 12], [5, 46]].map(([k, p]) => { const [x, y] = cells[k]; return `<circle class="${kf(`tap${k}`, T, [[`0,${p - 1}`, "transform:scale(.4);opacity:0"], [p, "transform:scale(.4);opacity:.9"], [`${p + 6},100`, "transform:scale(1.6);opacity:0"]], "transform-box:fill-box;transform-origin:center")}" cx="${x + 196}" cy="${y + 228}" r="22" fill="none" stroke="${C.g}" stroke-width="4"/>`; }).join("")}
${fly(1, 0.12, 0.24)}${fly(5, 0.46, 0.58)}`;
  raw(`.bounce{transform-box:fill-box;transform-origin:50% 100%;animation:bounce ${T}s infinite}@keyframes bounce{0%,23%,30%,57%,64%,100%{transform:scale(1)}26%,60%{transform:scale(1.18)}}`);
  return svg("An online store: shoppers add products, which fly into the cart while the cart counter goes up.", body, ".c0,.c1,[class^=tap],[class^=fly]{opacity:0}");
}

// ─────────────────────────────────────────── 2. Checkout: cart → shipping → payment → done
function two() {
  const T = 10;
  const NX = [450, 690, 930, 1170], steps = ["Cart", "Shipping", "Payment", "Done"];
  const reach = [2, 26, 51, 73];
  const L = NX[3] - NX[0];
  const panel = (cls, inner) => `<g class="${cls}">${inner}</g>`;
  const field = (x, y, w, label, typed, at) => `${bar(x, y, 90, 10, "#BDBDBD")}<rect x="${x}" y="${y + 20}" width="${w}" height="50" rx="14" fill="#fff" stroke="${C.line}" stroke-width="3"/><rect class="${grow(`f${x}${y}`, T, at, at + 4, 50)}" x="${x + 18}" y="${y + 39}" width="${typed}" height="12" rx="6" fill="${C.ink}"/>`;
  const body = `
${card(330, 150, 1010, 640, 32)}
<path d="M${NX[0]} 236 H${NX[3]}" stroke="#E4E4E4" stroke-width="6" stroke-linecap="round"/>
<path class="${kf("prog", T, [["0,4", `stroke-dashoffset:${L};opacity:1`], ["24,28", `stroke-dashoffset:${L - 240};opacity:1`], ["49,53", `stroke-dashoffset:${L - 480};opacity:1`], ["71,92", "stroke-dashoffset:0;opacity:1"], ["95,99", "stroke-dashoffset:0;opacity:0"], [100, `stroke-dashoffset:${L};opacity:0`]], "", "cubic-bezier(.5,0,.3,1)")}" d="M${NX[0]} 236 H${NX[3]}" stroke="${C.g}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}"/>
${NX.map((x, i) => `<circle cx="${x}" cy="236" r="26" fill="#fff" stroke="#DCDCDC" stroke-width="4"/>${txt(x, 245, String(i + 1), { size: 22, fill: C.sub, weight: 700 })}
<g class="${flash(`n${i}`, T, reach[i], 92)}"><circle cx="${x}" cy="236" r="26" fill="${C.g}"/>${check(x, 236, 0.9)}</g>${txt(x, 296, steps[i], { size: 22, fill: C.sub })}`).join("")}
<path d="M370 330 H1300" stroke="#EDEDED" stroke-width="3"/>
${panel(kf("p1", T, [["0,22", "opacity:1"], ["25,96", "opacity:0"], ["99,100", "opacity:1"]]), `
${[0, 1].map((i) => `<rect x="420" y="${370 + i * 110}" width="84" height="84" rx="16" fill="${i ? C.gt : "#F4F4F4"}"/><g transform="translate(462 ${412 + i * 110}) scale(.62) translate(-462 ${-(412 + i * 110)})">${GLYPH[i ? 3 : 1](462, 412 + i * 110)}</g>
${bar(530, 384 + i * 110, 200, 14, C.ink)}${bar(530, 412 + i * 110, 120, 10)}${txt(1250, 420 + i * 110, i ? "$42.00" : "$86.00", { size: 26, weight: 700, anchor: "end" })}`).join("")}
<path d="M420 600 H1250" stroke="#EDEDED" stroke-width="3"/>${txt(420, 650, "Total", { size: 26, anchor: "start", fill: C.sub })}${txt(1250, 652, "$128.00", { size: 34, weight: 800, anchor: "end" })}
<rect x="1010" y="684" width="240" height="56" rx="28" fill="${C.ink}"/>${txt(1130, 720, "Continue", { size: 22, fill: "#fff", weight: 700 })}`)}
${panel(flash("p2", T, 22.5, 48), `
${field(420, 370, 400, "Name", 220, 28)}${field(850, 370, 400, "Phone", 180, 32)}${field(420, 480, 830, "Address", 420, 36)}${field(420, 590, 400, "City", 160, 40)}${field(850, 590, 400, "ZIP", 90, 43)}
<rect x="1010" y="684" width="240" height="56" rx="28" fill="${C.ink}"/>${txt(1130, 720, "Continue", { size: 22, fill: "#fff", weight: 700 })}`)}
${panel(flash("p3", T, 48.5, 70), `
<rect x="420" y="380" width="830" height="70" rx="16" fill="#fff" stroke="${C.line}" stroke-width="3"/><rect x="440" y="398" width="56" height="34" rx="6" fill="${C.ink}"/><rect x="448" y="406" width="16" height="12" rx="3" fill="${C.g}"/>
${txt(520, 426, "4242  4242  4242  4242", { size: 26, anchor: "start", mono: true, weight: 500, cls: grow("num", T, 52, 58, 70) })}
<rect x="420" y="480" width="400" height="70" rx="16" fill="#fff" stroke="${C.line}" stroke-width="3"/>${txt(444, 526, "12 / 28", { size: 26, anchor: "start", mono: true, weight: 500 })}
<rect x="850" y="480" width="400" height="70" rx="16" fill="#fff" stroke="${C.line}" stroke-width="3"/>${txt(874, 526, "•••", { size: 26, anchor: "start", mono: true, weight: 700 })}
<g fill="none" stroke="${C.g2}" stroke-width="4" stroke-linecap="round"><rect x="420" y="604" width="22" height="18" rx="4"/><path d="M425 604 v-6 a6 6 0 0 1 12 0 v6"/></g>${txt(454, 620, "Encrypted & secure", { size: 20, anchor: "start", fill: C.g2, weight: 600 })}
<rect class="${kf("payb", T, [["0,64", "transform:scale(1)"], [66, "transform:scale(.94)"], ["68,100", "transform:scale(1)"]], "transform-box:fill-box;transform-origin:center")}" x="950" y="684" width="300" height="56" rx="28" fill="${C.g}"/>${txt(1100, 720, "Pay $128.00", { size: 22, fill: "#fff", weight: 800 })}`)}
${panel(flash("p4", T, 70.5, 92), `
<g class="${appear("big", T, 73, 92, { scale: true })}"><circle cx="835" cy="500" r="70" fill="${C.g}"/>${check(835, 500, 2.4, "#fff", 10)}</g>
${txt(835, 630, "Order confirmed", { size: 38, weight: 800 })}${txt(835, 672, "Receipt sent to your email", { size: 22, fill: C.sub, weight: 500 })}`)}`;
  return svg("A checkout flow: the cart, shipping details and card payment steps complete in turn, ending with order confirmed.", body, ".p1,.p2,.p3{opacity:0}.prog{stroke-dashoffset:0}");
}

// ─────────────────────────────────────────── 3. Secure payment → order confirmed → delivered
function three() {
  const T = 9;
  const body = `
<path d="M520 420 H640 M1000 420 C1060 420 1060 640 1120 640" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${packet("M505 420 H655", T, 0.12, 0.18)}${packet("M985 420 C1060 420 1060 640 1135 640", T, 0.42, 0.48)}
<g class="${kf("tapcard", T, [["0,6", "transform:translateY(0)"], [10, "transform:translateY(-14px)"], ["14,100", "transform:translateY(0)"]], "", "ease")}">
<g filter="url(#sh)"><rect x="170" y="320" width="340" height="210" rx="24" fill="${C.ink}"/></g>
<rect x="200" y="360" width="56" height="42" rx="8" fill="${C.g}"/><path d="M200 381 H256 M228 360 V402" stroke="${C.ink}" stroke-width="2" opacity=".4"/>
<path d="M458 362 a12 12 0 0 1 0 26 M470 352 a24 24 0 0 1 0 46" fill="none" stroke="#777" stroke-width="4" stroke-linecap="round"/>
${txt(200, 468, "•••• 4242", { size: 30, fill: "#fff", anchor: "start", mono: true })}${bar(200, 490, 110, 10, "#555")}${bar(400, 490, 60, 10, "#555")}</g>
<g class="${appear("lock", T, 8, 92, { scale: true })}"><circle cx="500" cy="318" r="40" fill="${C.g}" stroke="#F0F0F0" stroke-width="6"/><rect x="484" y="314" width="32" height="24" rx="5" fill="#fff"/><path d="M490 314 v-8 a10 10 0 0 1 20 0 v8" fill="none" stroke="#fff" stroke-width="5"/></g>
${txt(340, 590, "Secure payment", { size: 26, fill: C.sub })}
${card(640, 180, 360, 560, 28)}
<g class="${appear("ok", T, 20, 92, { scale: true })}"><circle cx="820" cy="262" r="40" fill="${C.g}"/>${check(820, 262, 1.3, "#fff", 7)}</g>
${txt(820, 344, "Order confirmed", { size: 28, weight: 800 })}${txt(820, 378, "#1042", { size: 22, fill: C.sub, weight: 600, mono: true })}
<path d="M670 410 H970" stroke="#EDEDED" stroke-width="3" stroke-dasharray="8 8"/>
${[0, 1, 2].map((i) => `<g class="${appear(`r${i}`, T, 24 + i * 4, 92)}"><rect x="672" y="${438 + i * 68}" width="48" height="48" rx="12" fill="${i === 1 ? C.gt : "#F4F4F4"}"/>${bar(736, 448 + i * 68, 120, 12, "#9A9A9A")}${bar(736, 470 + i * 68, 70, 9)}${txt(968, 470 + i * 68, ["$86", "$42", "$0"][i], { size: 22, weight: 700, anchor: "end" })}</g>`).join("")}
<g class="${appear("tot", T, 36, 92)}"><path d="M670 650 H970" stroke="#EDEDED" stroke-width="3"/>${txt(672, 700, "Total", { size: 24, anchor: "start", fill: C.sub })}${txt(968, 702, "$128", { size: 30, weight: 800, anchor: "end" })}</g>
<path d="M1120 690 H1500" stroke="#DCDCDC" stroke-width="6" stroke-linecap="round"/>
<path d="M1130 690 H1490" stroke="#fff" stroke-width="3" stroke-dasharray="18 16"/>
<g filter="url(#sh)"><path d="M1420 600 l46 -40 l46 40 v86 h-92 z" fill="#fff" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/></g><rect x="1454" y="640" width="24" height="46" rx="4" fill="${C.gt}" stroke="${C.ink}" stroke-width="4"/>
<g class="${kf("van", T, [["0,46", "transform:translateX(0);opacity:1"], ["74,92", "transform:translateX(150px);opacity:1"], ["95,100", "transform:translateX(150px);opacity:0"]], "", "cubic-bezier(.5,0,.3,1)")}">
<rect x="1120" y="600" width="96" height="70" rx="10" fill="${C.g}"/><path d="M1216 618 h26 l20 22 v30 h-46 z" fill="${C.ink}"/><rect x="1226" y="626" width="18" height="14" rx="3" fill="#9EDDB6"/>
<rect x="1146" y="616" width="44" height="36" rx="5" fill="#fff" opacity=".9"/><path d="M1146 630 h44 M1168 616 v36" stroke="${C.g2}" stroke-width="3"/>
<circle cx="1146" cy="676" r="13" fill="${C.ink}" stroke="#F0F0F0" stroke-width="4"/><circle cx="1238" cy="676" r="13" fill="${C.ink}" stroke="#F0F0F0" stroke-width="4"/></g>
${badge(1500, 556, appear("home", T, 76, 92, { scale: true }), 24)}
<g class="${appear("dl", T, 78, 92)}"><rect x="1330" y="740" width="170" height="46" rx="23" fill="${C.g}"/>${txt(1415, 771, "Delivered", { size: 22, fill: "#fff", weight: 800 })}</g>`;
  raw(FLOW);
  return svg("Secure card payment, then the order is confirmed with a receipt and a delivery van brings the parcel home.", body);
}

export default { "ecommerce-1": one, "ecommerce-2": two, "ecommerce-3": three };
