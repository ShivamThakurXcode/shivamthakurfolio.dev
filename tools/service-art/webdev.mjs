// Web Development / Full-Stack Web Apps: one request through three layers, code becomes the page, ship it.
import { C, FONT, r2, raw, appear, flash, check, badge, mountains } from "./lib.mjs";
import { svg as wrap } from "./lib.mjs";
const css = { push: raw };
const svg = (label, defs, body, still = "") => wrap(label, body, still, defs);
// ─────────────────────────────────────────────────────────── 1. One request, three layers
function one() {
  const T = 8;
  const b = (i) => appear(`b${i}`, T, 4 + i * 3.4);
  const cards = [470, 632, 794];
  const body = `
<path d="M990 310 H1080 M1160 430 V500" stroke="${C.mute}" stroke-width="4" stroke-dasharray="10 10" class="flow" fill="none"/>
${[["M975 310 H1095", "0;0.40;0.50;1"], ["M1160 415 V515", "0;0.52;0.62;1"], ["M1160 515 V415 M1095 310 H975", "0;0.66;0.80;1"]]
    .map(([d, kt], i) => `<circle r="${i === 2 ? 10 : 12}" fill="${i === 2 ? C.ink : C.g}" stroke="#fff" stroke-width="4"><animateMotion path="${d}" dur="${T}s" repeatCount="indefinite" calcMode="linear" keyTimes="${kt}" keyPoints="0;0;1;1"/></circle>`).join("\n")}

<g filter="url(#sh)"><rect x="430" y="170" width="560" height="600" rx="32" fill="${C.card}" stroke="${C.line}" stroke-width="3"/></g>
<path d="M430 236 H990" stroke="#EDEDED" stroke-width="3"/>
${[468, 496, 524].map((x) => `<circle cx="${x}" cy="203" r="8" fill="#DCDCDC"/>`).join("")}
<rect x="560" y="185" width="300" height="36" rx="18" fill="${C.skel}"/><circle cx="584" cy="203" r="7" fill="${C.g}"/><rect x="600" y="198" width="140" height="10" rx="5" fill="#D9D9D9"/>
${badge(930, 203, appear("ok", T, 80, 94, { scale: true }))}

<g fill="${C.skel}">
<rect x="470" y="266" width="86" height="22" rx="11"/>${[806, 856, 906].map((x) => `<rect x="${x}" y="270" width="36" height="14" rx="7"/>`).join("")}
<rect x="470" y="318" width="320" height="30" rx="8"/><rect x="470" y="360" width="240" height="30" rx="8"/>
<rect x="470" y="412" width="300" height="14" rx="7"/><rect x="470" y="436" width="250" height="14" rx="7"/>
<rect x="470" y="478" width="150" height="50" rx="25"/><rect x="820" y="318" width="130" height="210" rx="20"/>
${cards.map((x) => `<rect x="${x}" y="570" width="146" height="160" rx="20"/>`).join("")}
</g>
<rect class="${b(0)}" x="470" y="266" width="86" height="22" rx="11" fill="${C.ink}"/>
<g class="${b(1)}" fill="#BDBDBD">${[806, 856, 906].map((x) => `<rect x="${x}" y="270" width="36" height="14" rx="7"/>`).join("")}</g>
<g class="${b(2)}" fill="${C.ink}"><rect x="470" y="318" width="320" height="30" rx="8"/><rect x="470" y="360" width="240" height="30" rx="8"/></g>
<g class="${b(3)}" fill="#C4C4C4"><rect x="470" y="412" width="300" height="14" rx="7"/><rect x="470" y="436" width="250" height="14" rx="7"/></g>
<g class="${appear("b4", T, 4 + 4 * 3.4, 94, { scale: true })}"><rect x="470" y="478" width="150" height="50" rx="25" fill="${C.g}"/><rect x="500" y="498" width="90" height="10" rx="5" fill="#fff"/></g>
<g class="${b(5)}"><rect x="820" y="318" width="130" height="210" rx="20" fill="${C.gt}"/>${mountains("M836 512 l38-56 l26 32 l18-20 l32 44 z", 862, 362, 16)}</g>
${cards.map((x, i) => `<g class="${b(6 + i)}"><rect x="${x}" y="570" width="146" height="160" rx="20" fill="#fff" stroke="${C.line}" stroke-width="3"/>
<circle cx="${x + 36}" cy="608" r="16" fill="${C.gt}"/><circle cx="${x + 36}" cy="608" r="7" fill="${C.g}"/>
<rect x="${x + 22}" y="642" width="100" height="12" rx="6" fill="${C.ink}"/><rect x="${x + 22}" y="666" width="80" height="10" rx="5" fill="${C.mute}"/><rect x="${x + 22}" y="686" width="92" height="10" rx="5" fill="${C.mute}"/></g>`).join("\n")}

<g filter="url(#sh)"><rect x="1080" y="220" width="160" height="210" rx="28" fill="${C.card}" stroke="${C.line}" stroke-width="3"/></g>
<rect class="${flash("ga", T, 48, 60)}" x="1080" y="220" width="160" height="210" rx="28" fill="${C.gt}" stroke="${C.g}" stroke-width="5"/>
<text x="1160" y="324" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="64" font-weight="700" fill="${C.ink}">{ }</text>
<text x="1160" y="392" text-anchor="middle" ${FONT} font-size="26" font-weight="600" letter-spacing="3" fill="${C.sub}">API</text>

<g filter="url(#sh)"><rect x="1080" y="500" width="160" height="230" rx="28" fill="${C.card}" stroke="${C.line}" stroke-width="3"/></g>
<rect class="${flash("gd", T, 60, 72)}" x="1080" y="500" width="160" height="230" rx="28" fill="${C.gt}" stroke="${C.g}" stroke-width="5"/>
<g stroke="${C.ink}" stroke-width="5" fill="#fff"><path d="M1116 560 v72 a44 13 0 0 0 88 0 v-72"/><path d="M1116 596 a44 13 0 0 0 88 0" fill="none"/><ellipse cx="1160" cy="560" rx="44" ry="13" fill="${C.gt}"/></g>
<text x="1160" y="698" text-anchor="middle" ${FONT} font-size="26" font-weight="600" letter-spacing="3" fill="${C.sub}">DB</text>`;
  css.push(`.flow{animation:flow 1s linear infinite}@keyframes flow{to{stroke-dashoffset:-20}}`);
  return svg("A browser builds a web page, sends a request to the API, which reads the database and returns a successful response.", "", body, ".ga,.gd{opacity:0}");
}

// ─────────────────────────────────────────────────────────── 2. Code becomes the page
function two() {
  const T = 10;
  const COL = { g: C.g, w: "#E6E6E6", s: "#6E6E6E" };
  const LINES = [
    [0, [["g", 70], ["s", 150]]], [1, [["w", 210]]], [1, [["s", 160]]], [0, [["g", 84]]],
    [0, [["g", 60], ["s", 120]]], [1, [["w", 170], ["s", 80]]], [1, [["s", 210]]], [0, [["g", 70]]],
    [0, [["g", 80], ["w", 130]]], [0, [["s", 110]]],
  ];
  const BLOCK_END = { 3: "A", 7: "B", 9: "C" };
  const yOf = (i) => 270 + i * 46, X0 = 230, IND = 40, GAP = 14;
  const total = LINES.reduce((s, [, segs]) => s + segs.reduce((a, [, w]) => a + w, 0), 0);
  const PAUSE = 0.7, BPAUSE = 2.6, start = 4, end = 54;
  const per = (end - start - PAUSE * 9 - BPAUSE * 2) / total;
  let t = start, rects = [], caret = [], blocks = {};
  LINES.forEach(([ind, segs], i) => {
    let x = X0 + ind * IND;
    const y = yOf(i);
    if (i) caret.push([t - 0.05, null]); // jump marker
    caret.push([t, [x, y]]);
    segs.forEach(([c, w], j) => {
      const t0 = t, t1 = t + w * per;
      const cls = `t${i}_${j}`;
      css.push(`.${cls}{transform-box:fill-box;transform-origin:0 50%;animation:${cls} ${T}s linear infinite}
@keyframes ${cls}{0%,${r2(t0)}%{transform:scaleX(0);opacity:1}${r2(t1)}%,90%{transform:scaleX(1);opacity:1}93%,100%{transform:scaleX(1);opacity:0}}`);
      rects.push(`<rect class="${cls}" x="${x}" y="${y - 7}" width="${w}" height="14" rx="7" fill="${COL[c]}"/>`);
      x += w + GAP;
      t = t1;
    });
    caret.push([t, [x - GAP + 6, y]]);
    if (BLOCK_END[i]) { blocks[BLOCK_END[i]] = t; t += BPAUSE; } else t += PAUSE;
  });
  // caret path keyframes (hold, then jump to the next line)
  let last = caret[0][1], stops = [`0%{transform:translate(${last[0]}px,${last[1]}px)}`];
  for (const [at, pos] of caret) {
    if (!pos) { stops.push(`${r2(at)}%{transform:translate(${last[0]}px,${last[1]}px)}`); continue; }
    stops.push(`${r2(at)}%{transform:translate(${pos[0]}px,${pos[1]}px)}`);
    last = pos;
  }
  stops.push(`90%{transform:translate(${last[0]}px,${last[1]}px)}100%{transform:translate(${caret[0][1][0]}px,${caret[0][1][1]}px)}`);
  css.push(`.caret{animation:caret ${T}s linear infinite}@keyframes caret{${stops.join("")}}
.blink{animation:blink .9s steps(1) infinite}@keyframes blink{50%{opacity:0}}`);

  // device frames cross-fade: desktop -> tablet -> phone -> desktop
  css.push(`.dev{transform-box:fill-box;transform-origin:center}
.dD{animation:dD ${T}s infinite}@keyframes dD{0%,60%{opacity:1;transform:scale(1)}63%,91%{opacity:0;transform:scale(.96)}94%,100%{opacity:1;transform:scale(1)}}
.dT{animation:dT ${T}s infinite}@keyframes dT{0%,60%{opacity:0;transform:scale(.96)}63%,73%{opacity:1;transform:scale(1)}76%,100%{opacity:0;transform:scale(.96)}}
.dM{animation:dM ${T}s infinite}@keyframes dM{0%,73%{opacity:0;transform:scale(.96)}76%,88%{opacity:1;transform:scale(1)}91%,100%{opacity:0;transform:scale(.96)}}`);
  const iT = flash("iT", T, 61, 74), iM = flash("iM", T, 74, 89);
  // desktop indicator: on at the start and again at the end of the loop
  css.push(`.iD{animation:iD ${T}s infinite}@keyframes iD{0%,61%{opacity:1}64%,90%{opacity:0}93%,100%{opacity:1}}`);
  const iD = "iD";
  const pA = appear("pA", T, blocks.A + 0.5, 86), pB = appear("pB", T, blocks.B + 0.5, 86), pC = appear("pC", T, blocks.C + 0.5, 86, { scale: true });

  const card = (x, y, w, h, r, ic) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff" stroke="${C.line}" stroke-width="3"/><circle cx="${x + ic}" cy="${y + ic}" r="${ic * 0.45}" fill="${C.gt}"/><circle cx="${x + ic}" cy="${y + ic}" r="${ic * 0.2}" fill="${C.g}"/>`;
  const devIcon = (x, kind, stroke) => ({
    D: `<rect x="${x - 26}" y="724" width="52" height="34" rx="6"/><path d="M${x - 10} 768 H${x + 10} M${x} 758 V768"/>`,
    T: `<rect x="${x - 17}" y="722" width="34" height="46" rx="7"/>`,
    M: `<rect x="${x - 12}" y="724" width="24" height="42" rx="7"/>`,
  }[kind]).replace(/^/, "");
  const icons = (stroke, extra = "") => `<g fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round" ${extra}>`;

  const body = `
<g filter="url(#sh)"><rect x="140" y="150" width="680" height="640" rx="32" fill="#1E1E1E"/></g>
${[180, 206, 232].map((x) => `<circle cx="${x}" cy="192" r="8" fill="#3A3A3A"/>`).join("")}
<rect x="280" y="177" width="160" height="30" rx="15" fill="#2C2C2C"/><circle cx="300" cy="192" r="6" fill="${C.g}"/><rect x="314" y="187" width="100" height="10" rx="5" fill="#555"/>
<path d="M140 232 H820" stroke="#2C2C2C" stroke-width="3"/>
${LINES.map((_, i) => `<rect x="176" y="${yOf(i) - 5}" width="20" height="10" rx="5" fill="#3F3F3F"/>`).join("")}
${rects.join("\n")}
<g class="caret"><rect class="blink" x="0" y="-16" width="5" height="32" rx="2.5" fill="${C.g}"/></g>

<g class="dev dD">
<g filter="url(#sh)"><rect x="900" y="210" width="580" height="440" rx="24" fill="#fff" stroke="${C.line}" stroke-width="3"/></g>
${[928, 950, 972].map((x) => `<circle cx="${x}" cy="236" r="6" fill="#DCDCDC"/>`).join("")}<path d="M900 260 H1480" stroke="#EDEDED" stroke-width="3"/>
<g class="${pA}"><rect x="940" y="294" width="250" height="24" rx="6" fill="${C.ink}"/><rect x="940" y="328" width="180" height="24" rx="6" fill="${C.ink}"/><rect x="940" y="368" width="240" height="10" rx="5" fill="${C.mute}"/><rect x="940" y="388" width="200" height="10" rx="5" fill="${C.mute}"/></g>
<g class="${pB}">${card(940, 426, 250, 150, 18, 36)}<rect x="994" y="456" width="150" height="12" rx="6" fill="${C.ink}"/><rect x="960" y="500" width="200" height="10" rx="5" fill="${C.mute}"/><rect x="960" y="520" width="170" height="10" rx="5" fill="${C.mute}"/><rect x="960" y="540" width="190" height="10" rx="5" fill="${C.mute}"/>
<rect x="1220" y="294" width="230" height="282" rx="18" fill="${C.gt}"/>${mountains("M1236 560 l70-110 l46 60 l34-38 l48 88 z", 1262, 340, 18)}</g>
<g class="${pC}"><rect x="940" y="596" width="150" height="40" rx="20" fill="${C.g}"/><rect x="965" y="611" width="100" height="10" rx="5" fill="#fff"/></g>
</g>

<g class="dev dT">
<g filter="url(#sh)"><rect x="990" y="170" width="400" height="520" rx="30" fill="#fff" stroke="${C.line}" stroke-width="3"/></g><circle cx="1190" cy="190" r="5" fill="#DCDCDC"/>
<rect x="1020" y="218" width="240" height="22" rx="6" fill="${C.ink}"/><rect x="1020" y="250" width="170" height="22" rx="6" fill="${C.ink}"/><rect x="1020" y="286" width="260" height="10" rx="5" fill="${C.mute}"/>
<rect x="1020" y="314" width="340" height="150" rx="16" fill="${C.gt}"/>${mountains("M1040 456 l60-80 l40 50 l30-30 l50 60 z", 1056, 348, 14)}
${card(1020, 482, 340, 120, 16, 34)}<rect x="1068" y="506" width="160" height="12" rx="6" fill="${C.ink}"/><rect x="1040" y="548" width="280" height="10" rx="5" fill="${C.mute}"/><rect x="1040" y="570" width="220" height="10" rx="5" fill="${C.mute}"/>
<rect x="1020" y="622" width="150" height="40" rx="20" fill="${C.g}"/><rect x="1045" y="637" width="100" height="10" rx="5" fill="#fff"/>
</g>

<g class="dev dM">
<g filter="url(#sh)"><rect x="1065" y="180" width="250" height="500" rx="36" fill="#fff" stroke="${C.line}" stroke-width="3"/></g><rect x="1150" y="194" width="80" height="16" rx="8" fill="#DCDCDC"/>
<rect x="1090" y="234" width="170" height="18" rx="5" fill="${C.ink}"/><rect x="1090" y="260" width="120" height="18" rx="5" fill="${C.ink}"/><rect x="1090" y="290" width="190" height="9" rx="4.5" fill="${C.mute}"/>
<rect x="1090" y="316" width="200" height="120" rx="14" fill="${C.gt}"/>${mountains("M1104 428 l44-60 l30 38 l22-22 l40 44 z", 1118, 344, 11)}
${card(1090, 452, 200, 120, 14, 28)}<rect x="1128" y="474" width="130" height="10" rx="5" fill="${C.ink}"/><rect x="1106" y="508" width="168" height="9" rx="4.5" fill="${C.mute}"/><rect x="1106" y="526" width="140" height="9" rx="4.5" fill="${C.mute}"/><rect x="1106" y="544" width="156" height="9" rx="4.5" fill="${C.mute}"/>
<rect x="1090" y="590" width="200" height="40" rx="20" fill="${C.g}"/><rect x="1150" y="605" width="80" height="10" rx="5" fill="#fff"/>
<rect x="1160" y="656" width="60" height="6" rx="3" fill="#DCDCDC"/>
</g>

${icons("#BDBDBD")}${devIcon(1110, "D")}${devIcon(1190, "T")}${devIcon(1270, "M")}</g>
${icons(C.g, `class="${iD}"`)}${devIcon(1110, "D")}</g>
${icons(C.g, `class="${iT}"`)}${devIcon(1190, "T")}</g>
${icons(C.g, `class="${iM}"`)}${devIcon(1270, "M")}</g>`;
  return svg("Code is typed in an editor and the live preview builds the page, then adapts from desktop to tablet to phone.", "", body, ".dT,.dM,.iT,.iM,.caret{opacity:0}");
}

// ─────────────────────────────────────────────────────────── 3. Ship it
function three() {
  const T = 9;
  const XS = [250, 545, 840, 1135, 1430], Y = 400, L = 1180;
  const arrive = [6, 16, 36, 54, 72], done = [6, 28, 46, 64];
  const STOPS = [[0, 0], [6, 0], [16, 1], [28, 1], [36, 2], [46, 2], [54, 3], [64, 3], [72, 4], [92, 4]];
  const off = (n) => r2(L - (XS[n] - XS[0]));
  css.push(`.prog{animation:prog ${T}s infinite}@keyframes prog{${STOPS.map(([p, n]) => `${p}%{stroke-dashoffset:${off(n)};opacity:1}`).join("")}96%{stroke-dashoffset:0;opacity:0}100%{stroke-dashoffset:${L};opacity:0}}
.dot{animation:dot ${T}s infinite}@keyframes dot{${STOPS.map(([p, n]) => `${p}%{transform:translateX(${XS[n] - XS[0]}px);opacity:1}`).join("")}96%{transform:translateX(${L}px);opacity:0}100%{transform:translateX(0);opacity:0}}
.gear{transform-box:fill-box;transform-origin:center;animation:gear ${T}s infinite}@keyframes gear{0%,16%{transform:rotate(0)}28%,100%{transform:rotate(360deg)}}
.arrow{animation:arrow ${T}s infinite}@keyframes arrow{0%,54%,59%,64%,100%{transform:translateY(0)}56.5%,61.5%{transform:translateY(-12px)}}
.rip{transform-box:fill-box;transform-origin:center;animation:rip 1.8s ease-out infinite}.rip.r2{animation-delay:.9s}@keyframes rip{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.55);opacity:0}}
.needle{transform-origin:640px 712px;animation:needle ${T}s infinite}@keyframes needle{0%,72%{transform:rotate(-90deg)}86%,94%{transform:rotate(90deg)}98%,100%{transform:rotate(-90deg)}}
.arc{animation:arc ${T}s infinite}@keyframes arc{0%,72%{stroke-dashoffset:220}86%,94%{stroke-dashoffset:0}98%,100%{stroke-dashoffset:220}}`);
  const bars = [0.96, 1, 0.92].map((f, i) => {
    css.push(`.bar${i}{transform-box:fill-box;transform-origin:0 50%;animation:bar${i} ${T}s infinite}@keyframes bar${i}{0%,${74 + i * 2}%{transform:scaleX(0)}${86 + i * 2}%,94%{transform:scaleX(${f})}98%,100%{transform:scaleX(0)}}`);
    return `<rect x="990" y="${652 + i * 40}" width="140" height="12" rx="6" fill="#EDEDED"/><rect class="bar${i}" x="990" y="${652 + i * 40}" width="140" height="12" rx="6" fill="${C.g}"/>`;
  });
  const nums = [["24", 74, 77], ["61", 77, 80], ["88", 80, 83], ["100", 83, 94]].map(([n, a, b], i) =>
    `<text class="${flash(`n${i}`, T, a, b)}" x="760" y="712" ${FONT} font-size="64" font-weight="700" fill="${C.ink}">${n}</text>`);
  const icon = [
    `<path d="M${XS[0] - 44} ${Y} H${XS[0] - 18} M${XS[0] + 18} ${Y} H${XS[0] + 44}"/><circle cx="${XS[0]}" cy="${Y}" r="18"/>`,
    `<g class="gear"><circle cx="${XS[1]}" cy="${Y}" r="22"/><circle cx="${XS[1]}" cy="${Y}" r="8"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="${XS[1] - 6}" y="${Y - 36}" width="12" height="13" rx="3" fill="${C.ink}" stroke="none" transform="rotate(${a} ${XS[1]} ${Y})"/>`).join("")}</g>`,
    `<rect x="${XS[2] - 28}" y="${Y - 34}" width="56" height="72" rx="9"/><rect x="${XS[2] - 13}" y="${Y - 43}" width="26" height="15" rx="5" fill="${C.ink}" stroke="none"/>${[-10, 8, 26].map((dy, i) => `<path d="M${XS[2] + 2} ${Y + dy} H${XS[2] + 16}" stroke="#BDBDBD"/><g class="${appear(`ck${i}`, T, 37 + i * 3, 94, { scale: true })}">${check(XS[2] - 10, Y + dy, 0.75, C.g, 5)}</g>`).join("")}`,
    `<path d="M${XS[3] - 34} ${Y + 22} H${XS[3] + 32} A20 20 0 0 0 ${XS[3] + 30} ${Y - 18} A28 28 0 0 0 ${XS[3] - 22} ${Y - 24} A22 22 0 0 0 ${XS[3] - 34} ${Y + 22} Z" fill="#fff"/><g class="arrow"><path d="M${XS[3]} ${Y + 14} V${Y - 10} M${XS[3] - 10} ${Y} L${XS[3]} ${Y - 10} L${XS[3] + 10} ${Y}" stroke="${C.g2}"/></g>`,
    `<circle cx="${XS[4]}" cy="${Y}" r="34"/><ellipse cx="${XS[4]}" cy="${Y}" rx="14" ry="34"/><path d="M${XS[4] - 34} ${Y} H${XS[4] + 34} M${XS[4] - 30} ${Y - 16} H${XS[4] + 30} M${XS[4] - 30} ${Y + 16} H${XS[4] + 30}"/>`,
  ];
  const names = ["Commit", "Build", "Test", "Deploy", "Live"];
  const body = `
<path d="M${XS[0]} ${Y} H${XS[4]}" stroke="#DCDCDC" stroke-width="8" stroke-linecap="round"/>
<path class="prog" d="M${XS[0]} ${Y} H${XS[4]}" stroke="${C.g}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}"/>
<circle class="dot" cx="${XS[0]}" cy="${Y}" r="14" fill="${C.g}" stroke="#fff" stroke-width="5"/>
<g class="${flash("live", T, 72, 94)}"><circle class="rip" cx="${XS[4]}" cy="${Y}" r="84" fill="none" stroke="${C.g}" stroke-width="4"/><circle class="rip r2" cx="${XS[4]}" cy="${Y}" r="84" fill="none" stroke="${C.g}" stroke-width="4"/></g>
${XS.map((x, i) => {
    const r = i === 4 ? 84 : 74;
    return `<g filter="url(#sh)"><circle cx="${x}" cy="${Y}" r="${r}" fill="#fff" stroke="${C.line}" stroke-width="4"/></g>
<circle class="${flash(`on${i}`, T, arrive[i] - 1, 94)}" cx="${x}" cy="${Y}" r="${r}" fill="${C.gt}" stroke="${C.g}" stroke-width="6"/>
<g fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${icon[i]}</g>
<text x="${x}" y="${Y + 140}" text-anchor="middle" ${FONT} font-size="30" font-weight="600" fill="${C.sub}">${names[i]}</text>
${i < 4 ? badge(x + 54, Y - 54, appear(`dn${i}`, T, done[i], 94, { scale: true })) : ""}`;
  }).join("\n")}
<g class="${appear("pill", T, 72, 94, { scale: true })}"><rect x="${XS[4] - 56}" y="258" width="112" height="44" rx="22" fill="${C.g}"/><circle cx="${XS[4] - 30}" cy="280" r="6" fill="#fff"/><text x="${XS[4] + 10}" y="290" text-anchor="middle" ${FONT} font-size="24" font-weight="700" letter-spacing="2" fill="#fff">LIVE</text></g>

<g filter="url(#sh)"><rect x="520" y="604" width="640" height="170" rx="28" fill="#fff" stroke="${C.line}" stroke-width="3"/></g>
<path d="M572 712 A68 68 0 0 1 708 712" fill="none" stroke="#EDEDED" stroke-width="14" stroke-linecap="round"/>
<path class="arc" d="M572 712 A68 68 0 0 1 708 712" fill="none" stroke="${C.g}" stroke-width="14" stroke-linecap="round" stroke-dasharray="220" stroke-dashoffset="220"/>
<g class="needle"><path d="M640 712 V662" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/></g><circle cx="640" cy="712" r="9" fill="${C.ink}"/>
${nums.join("")}
<text x="762" y="748" ${FONT} font-size="22" font-weight="600" fill="${C.sub}">Performance</text>
${bars.join("")}
${[0, 1, 2].map((i) => `<circle cx="968" cy="${658 + i * 40}" r="7" fill="${i === 1 ? C.g2 : C.g}"/>`).join("")}`;
  return svg("A deployment pipeline: commit, build, test and deploy steps complete in turn, the site goes live and scores 100 on performance.", "", body, ".n0,.n1,.n2,.dot{opacity:0}.prog,.arc{stroke-dashoffset:0}.needle{transform:rotate(90deg)}.rip{opacity:0}");
}

export default { "web-dev-1": one, "web-dev-2": two, "web-dev-3": three };
