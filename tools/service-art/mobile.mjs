// Mobile App Development: app screens swiping, one codebase → iOS + Android, push notifications.
import { C, raw, appear, flash, grow, kf, packet, svg, check, badge, card, bar, txt, sparkle, mountains, FLOW } from "./lib.mjs";

const bag = (x, y, s = 1, col = "#fff") => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${col}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path d="M-34 -18 H34 L28 40 H-28 Z"/><path d="M-16 -18 V-28 a16 16 0 0 1 32 0 V-18"/></g>`;
const star = (x, y, s = 1, fill = C.g) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -14 L4 -4 L14 -4 L6 2 L9 13 L0 6 L-9 13 L-6 2 L-14 -4 L-4 -4 Z" fill="${fill}"/>`;

// simple app screen (home) at x,y with width w
const homeScreen = (x, y, w, cls = (k) => "") => `
<g class="${cls(0)}"><circle cx="${x + 30}" cy="${y + 36}" r="16" fill="${C.gt}"/>${bar(x + 56, y + 26, w * 0.35, 12, C.ink)}${bar(x + 56, y + 44, w * 0.22, 8)}</g>
<g class="${cls(1)}"><rect x="${x + 14}" y="${y + 74}" width="${w - 28}" height="${w * 0.48}" rx="16" fill="${C.g}"/>${bar(x + 32, y + 98, w * 0.42, 12, "#fff")}${bar(x + 32, y + 120, w * 0.3, 9, "#C6F7D8")}</g>
<g class="${cls(2)}">${[0, 1, 2].map((r) => `<rect x="${x + 14}" y="${y + 100 + w * 0.48 + r * 56}" width="${w - 28}" height="44" rx="12" fill="#F4F4F4"/><circle cx="${x + 36}" cy="${y + 122 + w * 0.48 + r * 56}" r="10" fill="${r === 1 ? C.ink : "#DCDCDC"}"/>${bar(x + 54, y + 116 + w * 0.48 + r * 56, w * 0.4, 10, "#BDBDBD")}`).join("")}</g>
<g class="${cls(3)}"><rect x="${x + 14}" y="${y + 290 + w * 0.48}" width="${w - 28}" height="44" rx="22" fill="${C.ink}"/>${bar(x + w / 2 - 36, y + 307 + w * 0.48, 72, 10, "#fff")}</g>`;

// ─────────────────────────────────────────── 1. One phone, three screens swiping
function one() {
  const T = 9, SX = 700, SY = 124, SW = 272, SH = 692;
  const screenA = (x) => `
<rect x="${x + 40}" y="${SY + 110}" width="${SW - 80}" height="220" rx="36" fill="${C.gt}"/>${mountains(`M${x + 60} ${SY + 310} l50 -70 l34 44 l26 -30 l54 56 z`, x + 196, SY + 160, 20)}
${bar(x + 50, SY + 380, 172, 20, C.ink)}${bar(x + 74, SY + 414, 124, 12)}${bar(x + 66, SY + 436, 140, 12)}
${[0, 1, 2].map((i) => `<circle cx="${x + 116 + i * 20}" cy="${SY + 500}" r="${i ? 5 : 7}" fill="${i ? "#DCDCDC" : C.g}"/>`).join("")}
<rect x="${x + 24}" y="${SY + 596}" width="${SW - 48}" height="56" rx="28" fill="${C.g}"/>${txt(x + SW / 2, SY + 632, "Get started", { size: 22, fill: "#fff", weight: 700 })}`;
  const screenB = (x) => `
<circle cx="${x + 40}" cy="${SY + 74}" r="18" fill="${C.ink}"/>${bar(x + 68, SY + 64, 100, 14, C.ink)}${bar(x + 68, SY + 84, 70, 9)}
<rect x="${x + 20}" y="${SY + 114}" width="${SW - 40}" height="46" rx="23" fill="#F4F4F4"/><circle cx="${x + 46}" cy="${SY + 137}" r="8" fill="none" stroke="#9A9A9A" stroke-width="3"/>${bar(x + 64, SY + 132, 90, 10, "#CFCFCF")}
<rect x="${x + 20}" y="${SY + 178}" width="${SW - 40}" height="128" rx="20" fill="${C.g}"/>${bar(x + 40, SY + 206, 120, 14, "#fff")}${bar(x + 40, SY + 230, 80, 10, "#C6F7D8")}<rect x="${x + 40}" y="${SY + 260}" width="80" height="28" rx="14" fill="#fff"/>
${[0, 1, 2, 3].map((k) => `<rect x="${x + 20 + (k % 2) * 120}" y="${SY + 324 + Math.floor(k / 2) * 128}" width="112" height="116" rx="18" fill="#F4F4F4"/><rect x="${x + 36 + (k % 2) * 120}" y="${SY + 340 + Math.floor(k / 2) * 128}" width="40" height="40" rx="12" fill="${k === 1 ? C.gt : "#E4E4E4"}"/>${bar(x + 36 + (k % 2) * 120, SY + 396 + Math.floor(k / 2) * 128, 70, 10, "#BDBDBD")}`).join("")}
<path d="M${x} ${SY + 610} H${x + SW}" stroke="#EDEDED" stroke-width="3"/>${[0, 1, 2, 3].map((k) => `<rect x="${x + 34 + k * 60}" y="${SY + 630}" width="22" height="22" rx="7" fill="${k ? "#DCDCDC" : C.g}"/>`).join("")}`;
  const screenC = (x) => `
<rect x="${x}" y="${SY}" width="${SW}" height="300" fill="${C.gt}"/>${mountains(`M${x + 20} ${SY + 300} l80 -110 l50 64 l36 -40 l86 86 z`, x + 200, SY + 90, 24)}
${bar(x + 24, SY + 330, 170, 20, C.ink)}${[0, 1, 2, 3, 4].map((i) => star(x + 34 + i * 26, SY + 378, 0.7, i < 4 ? C.g : "#DCDCDC")).join("")}
${bar(x + 24, SY + 408, 200, 10)}${bar(x + 24, SY + 428, 170, 10)}${bar(x + 24, SY + 448, 190, 10)}
${txt(x + 24, SY + 530, "$49", { size: 44, weight: 800, anchor: "start" })}
<rect x="${x + 24}" y="${SY + 596}" width="${SW - 48}" height="56" rx="28" fill="${C.ink}"/>${txt(x + SW / 2, SY + 632, "Add to cart", { size: 22, fill: "#fff", weight: 700 })}`;
  const body = `
<defs><clipPath id="scr"><rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="40"/></clipPath></defs>
<g class="${appear("notif", T, 8, 92)}"><g class="float">${card(440, 270, 230, 88, 22)}<rect x="458" y="290" width="48" height="48" rx="14" fill="${C.g}"/>${bag(482, 316, 0.42)}${bar(520, 296, 120, 12, C.ink)}${bar(520, 318, 90, 10)}</g></g>
<g class="${appear("rate", T, 40, 92)}"><g class="float f2">${card(1010, 560, 210, 74, 37)}${star(1052, 597, 1.2)}${txt(1080, 607, "4.9", { size: 28, weight: 800, anchor: "start" })}${bar(1130, 592, 66, 10)}</g></g>
<g filter="url(#sh)"><rect x="686" y="110" width="300" height="720" rx="52" fill="${C.ink}"/></g>
<rect x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="40" fill="#fff"/>
<g clip-path="url(#scr)"><g class="swipe">${screenA(SX)}${screenB(SX + SW)}${screenC(SX + 2 * SW)}</g></g>
<rect x="791" y="134" width="90" height="26" rx="13" fill="${C.ink}"/>
<g class="hand"><circle cx="930" cy="560" r="26" fill="${C.ink}" opacity=".18"/><circle cx="930" cy="560" r="14" fill="${C.ink}" opacity=".35"/></g>`;
  raw(`.swipe{animation:swipe ${T}s cubic-bezier(.6,0,.2,1) infinite}@keyframes swipe{0%,27%{transform:translateX(0)}33%,60%{transform:translateX(-${SW}px)}66%,90%{transform:translateX(-${2 * SW}px)}96%,100%{transform:translateX(0)}}
.hand{animation:hand ${T}s infinite}@keyframes hand{0%,20%{opacity:0;transform:translateX(0)}23%{opacity:1;transform:translateX(0)}31%{opacity:1;transform:translateX(-150px)}33%,53%{opacity:0;transform:translateX(-150px)}56%{opacity:1;transform:translateX(0)}64%{opacity:1;transform:translateX(-150px)}66%,100%{opacity:0;transform:translateX(-150px)}}
.float{animation:float 3.4s ease-in-out infinite}.f2{animation-delay:-1.7s}@keyframes float{50%{transform:translateY(-8px)}}`);
  return svg("A mobile app: onboarding, home and product screens swipe by on a phone, with a notification and a 4.9 rating.", body, ".hand{opacity:0}");
}

// ─────────────────────────────────────────── 2. One codebase ships to iOS and Android
function two() {
  const T = 9;
  const iosPath = "M590 420 C720 420 740 330 860 330";
  const andPath = "M590 500 C740 500 760 790 960 790 H1325 V722";
  const phone = (x, ios, p) => `
<g filter="url(#sh)"><rect x="${x}" y="200" width="250" height="522" rx="${ios ? 46 : 30}" fill="${C.ink}"/></g>
<rect x="${x + 12}" y="212" width="226" height="498" rx="${ios ? 36 : 22}" fill="#fff"/>
${ios ? `<rect x="${x + 90}" y="226" width="70" height="22" rx="11" fill="${C.ink}"/>` : `<circle cx="${x + 125}" cy="234" r="8" fill="${C.ink}"/>`}
<g transform="translate(0 50)">${homeScreen(x + 12, 212, 226, (k) => appear(`${p}${k}`, T, 30 + k * 6, 92))}</g>
${badge(x + 240, 210, appear(`${p}ok`, T, 58, 92, { scale: true }), 22)}`;
  const code = [[["g", 80], ["s", 140]], [["w", 180]], [["s", 120], ["g", 60]], [["w", 200]], [["g", 70]], [["s", 160]], [["w", 130], ["s", 70]], [["g", 90]]];
  const COL = { g: C.g, w: "#E6E6E6", s: "#6E6E6E" };
  const body = `
<path d="${iosPath}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
<path d="${andPath}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${packet(iosPath, T, 0.14, 0.26)}${packet(andPath, T, 0.14, 0.3)}
<g filter="url(#sh)"><rect x="170" y="240" width="420" height="440" rx="28" fill="#1E1E1E"/></g>
${[204, 226, 248].map((x) => `<circle cx="${x}" cy="276" r="7" fill="#3A3A3A"/>`).join("")}<path d="M170 304 H590" stroke="#2C2C2C" stroke-width="3"/>
${code.map((segs, i) => { let x = 210 + (i % 3 === 1 ? 30 : 0); return segs.map(([c, w]) => { const r = bar(x, 334 + i * 40, w, 14, COL[c]); x += w + 14; return r; }).join(""); }).join("")}
<rect x="270" y="704" width="220" height="48" rx="24" fill="${C.g}"/>${txt(380, 736, "One codebase", { size: 22, fill: "#fff", weight: 700 })}
${phone(860, true, "i")}${phone(1200, false, "a")}
${txt(985, 176, "iOS", { size: 28 })}${txt(1325, 176, "Android", { size: 28 })}`;
  raw(FLOW);
  return svg("One codebase ships to both an iOS and an Android phone, which build the same app screens.", body);
}

// ─────────────────────────────────────────── 3. Push notifications arrive, a tap opens the app
function three() {
  const T = 9;
  const noti = (y, k, at) => `<g class="${kf(`n${k}`, T, [["0," + at, "transform:translateY(-40px);opacity:0"], [at + 4 + ",50", "transform:translateY(0);opacity:1"], ["54,100", "transform:translateY(0);opacity:0"]], "", "cubic-bezier(.2,.8,.2,1)")}">
${card(994, y, 262, 92, 22)}<rect x="1012" y="${y + 20}" width="52" height="52" rx="14" fill="${C.g}"/>${bag(1038, y + 48, 0.42)}
${bar(1078, y + 26, [130, 110, 140][k], 13, C.ink)}${bar(1078, y + 50, [150, 120, 100][k], 10)}</g>`;
  const pushPath = "M560 430 C720 430 820 360 960 360";
  const body = `
<path d="${pushPath}" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" fill="none" class="flow"/>
${[0.06, 0.2, 0.34].map((t) => packet(pushPath, T, t, t + 0.06)).join("")}
<g filter="url(#sh)"><rect x="300" y="300" width="260" height="260" rx="64" fill="${C.g}"/></g>${bag(430, 436, 1.25)}
<g class="${appear("bd", T, 12, 92, { scale: true })}"><circle cx="550" cy="312" r="40" fill="${C.ink}" stroke="#F0F0F0" stroke-width="6"/>
${["1", "2", "3"].map((n, i) => txt(550, 326, n, { size: 38, fill: "#fff", weight: 800, cls: i < 2 ? flash(`c${i}`, T, 12 + i * 14, 25 + i * 14) : flash("c2", T, 40, 92) })).join("")}</g>
${txt(430, 620, "Your app", { size: 26, fill: C.sub })}
<g filter="url(#sh)"><rect x="960" y="120" width="330" height="700" rx="54" fill="${C.ink}"/></g>
<rect x="974" y="134" width="302" height="672" rx="42" fill="${C.gt}"/>
<rect x="1080" y="148" width="90" height="26" rx="13" fill="${C.ink}"/>
${txt(1125, 266, "9:41", { size: 72, weight: 300 })}${bar(1065, 286, 120, 12, "#9EDDB6")}
${noti(330, 0, 10)}${noti(436, 1, 24)}${noti(542, 2, 38)}
<circle class="${kf("tap", T, [["0,44", "transform:scale(.3);opacity:0"], [46, "transform:scale(.3);opacity:.9"], ["52,100", "transform:scale(1.5);opacity:0"]], "transform-box:fill-box;transform-origin:center")}" cx="1125" cy="376" r="40" fill="none" stroke="${C.ink}" stroke-width="5"/>
<g class="${kf("open", T, [["0,52", "transform:scale(.6);opacity:0"], ["57,92", "transform:scale(1);opacity:1"], ["96,100", "transform:scale(1);opacity:0"]], "transform-box:fill-box;transform-origin:center", "cubic-bezier(.2,.8,.2,1)")}">
<rect x="974" y="134" width="302" height="672" rx="42" fill="#fff"/>${homeScreen(988, 190, 274)}</g>`;
  raw(FLOW);
  return svg("Push notifications arrive on a phone's lock screen, the app badge counts up and a tap opens the app.", body, ".c0,.c1,.tap,.n0,.n1,.n2{opacity:0}");
}

export default { "mobile-1": one, "mobile-2": two, "mobile-3": three };
