// Static blog thumbnails (1400×800 WebP) for every post in blog/.
// usage: node tools/blog-art/build.mjs        (needs Chrome for the capture script and Python + Pillow for WebP)
import { join } from "node:path";
import { icon, sparkle, check } from "../service-art/lib.mjs";
import { C, ROOT, TITLE, SANS, MONO, esc, t, box, pill, code, codeCard, arrow, DARK, LIGHT, DEFS, render } from "./kit.mjs";

const W = 1400, H = 800;
function frame(post, art) {
  const chip = pill(80, 88, post.chip, { fill: "#fff", color: C.ink, size: 20, h: 44, pad: 40 });
  const lines = post.title.map((l, i) => {
    const y = 250 + i * 92;
    const parts = l.split(/(\*[^*]+\*)/).filter(Boolean).map((p) => p.startsWith("*") ? `<tspan fill="${C.g2}">${esc(p.slice(1, -1))}</tspan>` : esc(p));
    return `<text x="76" y="${y}" ${TITLE} font-size="86" font-weight="600" letter-spacing="-1.5" fill="${C.ink}">${parts.join("")}</text>`;
  }).join("");
  const subY = 250 + (post.title.length - 1) * 92 + 76;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${DEFS}
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<rect x="660" y="0" width="${W - 660}" height="${H}" fill="url(#dots)"/>
<circle cx="1030" cy="400" r="420" fill="url(#glow)"/>
${chip.svg}<circle cx="102" cy="110" r="7" fill="${C.g}"/>
${lines}
${post.sub.map((s, i) => t(80, subY + i * 40, s, { size: 30, fill: C.sub, weight: 500 })).join("")}
<rect x="80" y="676" width="48" height="48" rx="14" fill="${C.ink}"/>${t(104, 709, "S", { size: 28, fill: C.g, weight: 800, anchor: "middle", font: TITLE })}
${t(144, 696, "Shivam Thakur", { size: 22, weight: 700 })}${t(144, 722, `shivamthakur.me  ·  ${post.read} min read`, { size: 19, fill: C.sub, weight: 500 })}
${art}
</svg>`;
}

// ─────────────────────────────────────────── illustrations (right column, x 700–1330)
const ART = {
  "chatgpt-6-astra-guide": () => `
${box(720, 100, 600, 480)}
<circle cx="768" cy="150" r="24" fill="${C.ink}"/>${sparkle(768, 150, 0.85)}
${t(806, 146, "GPT-6 Astra", { size: 24, weight: 800 })}${t(806, 172, "Newest model", { size: 17, fill: C.sub })}
${pill(1176, 132, "NEW", { size: 16, h: 34, pad: 18 }).svg}
<path d="M720 196 H1320" stroke="#EFEFEF" stroke-width="2"/>
<rect x="930" y="222" width="360" height="64" rx="22" fill="${C.ink}"/>${t(954, 262, "Plan a 3-day trip to Agra", { size: 21, fill: "#fff" })}
${pill(752, 306, "Thought for 6 seconds", { fill: "#F4F4F4", color: C.sub, size: 16, h: 32, pad: 16, weight: 600 }).svg}
<rect x="752" y="352" width="460" height="150" rx="22" fill="#F4F4F4"/>${sparkle(784, 384, 0.6)}
${t(810, 392, "Day 1: Taj Mahal at sunrise", { size: 19, weight: 600 })}${t(810, 426, "Day 2: Agra Fort & Mehtab Bagh", { size: 19, weight: 600 })}${t(810, 460, "Day 3: Fatehpur Sikri", { size: 19, weight: 600 })}
<rect x="810" y="478" width="220" height="10" rx="5" fill="#D6D6D6"/>
<rect x="752" y="520" width="500" height="44" rx="22" fill="#F4F4F4"/>${t(776, 548, "Ask anything", { size: 18, fill: "#A0A0A0" })}
<circle cx="1284" cy="542" r="22" fill="${C.g}"/><path d="M1284 552 V532 M1275 541 L1284 532 L1293 541" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${[["sparkle", "Reasoning"], ["gear", "Tool use"], ["doc", "Long context"]].map(([ic, l], i) => {
    const x = 720 + i * 204;
    return `${box(x, 608, 192, 84, { r: 20 })}<rect x="${x + 16}" y="626" width="48" height="48" rx="14" fill="${C.gt}"/>${icon(ic, x + 40, 650, { s: 0.7, col: C.g2 })}${t(x + 74, 657, l, { size: 17, weight: 700 })}`;
  }).join("")}`,

  "deploying-fullstack-on-vercel": () => `
${box(720, 96, 600, 132, { fill: "#1E1E1E", stroke: "#1E1E1E" })}
${[0, 1, 2].map((i) => `<circle cx="${746 + i * 20}" cy="122" r="6" fill="#3A3A3A"/>`).join("")}${t(816, 128, "terminal", { size: 17, fill: "#8A8A8A", font: MONO, weight: 400 })}
${code(748, 172, [[["$ ", "k"], ["git push origin main", "p"]], [["✓ ", "k"], ["Deployment queued", "o"]]], { lh: 36 })}
${[["gear", "Build", "Install & compile"], ["layout", "Preview", "Unique URL per PR"], ["globe", "Production", "Promoted & live"]].map(([ic, l, s], i) => {
    const x = 720 + i * 210;
    return `${box(x, 270, 180, 170, { r: 22, stroke: i === 2 ? C.g : C.line, sw: i === 2 ? 3 : 2 })}
<circle cx="${x + 90}" cy="326" r="32" fill="${C.gt}"/>${ic === "globe" ? `<g fill="none" stroke="${C.ink}" stroke-width="3.5"><circle cx="${x + 90}" cy="326" r="18"/><ellipse cx="${x + 90}" cy="326" rx="7" ry="18"/><path d="M${x + 72} 326 H${x + 108}"/></g>` : icon(ic, x + 90, 326, { s: 0.75 })}
${t(x + 90, 392, l, { size: 22, weight: 800, anchor: "middle" })}${t(x + 90, 420, s, { size: 15, fill: C.sub, anchor: "middle" })}
<circle cx="${x + 160}" cy="290" r="15" fill="${C.g}" stroke="#fff" stroke-width="3"/>${check(x + 160, 290, 0.65)}`;
  }).join("")}
${arrow("M902 355 H922")}${arrow("M1112 355 H1132")}
${box(720, 476, 600, 96, { r: 22 })}
<circle cx="760" cy="524" r="8" fill="${C.g}"/>${t(782, 516, "Ready", { size: 18, weight: 800, fill: C.g2 })}${t(782, 544, "my-app.vercel.app", { size: 20, font: MONO, weight: 400, fill: C.ink })}
${pill(1140, 504, "Production", { size: 16, h: 40, pad: 16 }).svg}
${[["lock", "Env vars"], ["code", "Functions"], ["cloud", "Edge cache"]].map(([ic, l], i) => {
    const x = 720 + i * 204;
    return `${box(x, 608, 192, 84, { r: 20 })}<rect x="${x + 16}" y="626" width="48" height="48" rx="14" fill="${C.gt}"/>${icon(ic, x + 40, 650, { s: 0.7, col: C.g2 })}${t(x + 76, 657, l, { size: 18, weight: 700 })}`;
  }).join("")}`,

  "javascript-complete-guide-for-beginners": () => `
<rect x="720" y="100" width="180" height="180" rx="40" fill="${C.ink}"/>${t(810, 222, "JS", { size: 92, weight: 600, fill: C.g, anchor: "middle", font: TITLE })}
${codeCard(924, 100, 396, 180, [
    [["const ", "k"], ["greet", "f"], [" = (name) =>", "p"]],
    [["  `Hello, ${name}!`", "s"], [";", "p"]],
    [["greet", "f"], ["(", "p"], ["\"Shivam\"", "s"], [");", "p"]],
  ], { file: "app.js", size: 20, lh: 32 })}
<path d="M775 640 C840 640 860 560 925 560 S1010 610 1075 600 S1170 500 1230 480" fill="none" stroke="#D6D6D6" stroke-width="8" stroke-linecap="round"/>
<path d="M775 640 C840 640 860 560 925 560 S1010 610 1075 600 S1170 500 1230 480" fill="none" stroke="${C.g}" stroke-width="8" stroke-linecap="round" stroke-dasharray="560 2000"/>
${[[775, 640, "code", "Variables"], [925, 560, "layers", "Functions"], [1075, 600, "db", "Objects"], [1230, 480, "layout", "DOM"]].map(([x, y, ic, l], i) =>
    `<circle cx="${x}" cy="${y}" r="36" fill="${i < 3 ? C.g : "#fff"}" stroke="${i < 3 ? "#fff" : C.line}" stroke-width="5" filter="url(#sh)"/>${i < 3 ? check(x, y, 1.1, C.ink, 5) : icon(ic, x, y, { s: 0.75 })}${t(x, y + 66, l, { size: 20, weight: 700, anchor: "middle" })}`).join("")}
<g filter="url(#sh)"><rect x="1150" y="320" width="170" height="104" rx="22" fill="${C.g}"/></g>${t(1235, 362, "Next up", { size: 17, weight: 700, fill: C.ink, anchor: "middle" })}${t(1235, 398, "Async & await", { size: 21, weight: 800, fill: C.ink, anchor: "middle" })}
${arrow("M1235 430 V444")}`,

  "javascript-closures-explained": () => `
<g filter="url(#sh)"><rect x="720" y="90" width="600" height="400" rx="26" fill="${C.gt}" stroke="${C.g}" stroke-width="3"/></g>
${pill(744, 110, "Outer scope: makeCounter", { fill: C.g, color: C.ink, size: 17, h: 34, pad: 16 }).svg}
<rect x="746" y="214" width="290" height="40" rx="8" fill="#C6F7D8"/>
${code(756, 196, [[["function ", "k"], ["makeCounter", "f"], ["() {", "p"]], [["  let ", "k"], ["count", "f"], [" = ", "p"], ["0", "n"], [";", "p"]]], { size: 24, lh: 46, theme: LIGHT })}
<g filter="url(#sh)"><rect x="770" y="272" width="530" height="170" rx="20" fill="#fff" stroke="${C.g2}" stroke-width="3"/></g>
${pill(1092, 254, "Inner function", { fill: C.ink, color: "#fff", size: 16, h: 34, pad: 16 }).svg}
${code(756, 316, [[["  return ", "k"], ["function", "k"], [" () {", "p"]], [["    count", "f"], ["++;", "p"]], [["    return ", "k"], ["count", "f"], [";", "p"]], [["  };", "p"]]], { size: 24, lh: 36, theme: LIGHT })}
${code(756, 474, [[["}", "p"]]], { size: 24, theme: LIGHT })}
${arrow("M1100 352 C1100 296 1090 240 1050 236", { dash: "8 8" })}
${pill(1020, 356, "remembers count", { fill: C.gt, color: C.g2, size: 16, h: 34, pad: 14 }).svg}
${codeCard(720, 524, 600, 184, [
    [["const ", "k"], ["next", "f"], [" = ", "p"], ["makeCounter", "f"], ["();", "p"]],
    [["next", "f"], ["();  ", "p"], ["// 1", "c"]],
    [["next", "f"], ["();  ", "p"], ["// 2", "c"]],
  ], { file: "counter.js", lh: 34 })}`,

  "javascript-async-deep-dive": () => {
    const frameRow = (x, y, w, l, hi = false) => `<rect x="${x}" y="${y}" width="${w}" height="44" rx="12" fill="${hi ? C.g : "#F4F4F4"}"/>${t(x + w / 2, y + 29, l, { size: 19, weight: 700, anchor: "middle", font: MONO, fill: C.ink })}`;
    const chip = (x, y, l, k) => { const p = pill(x, y, l, { fill: k ? C.ink : "#F0F0F0", color: k ? "#fff" : C.ink, size: 17, h: 40, pad: 16, font: MONO, weight: 600 }); return p.svg; };
    return `
${box(720, 92, 260, 236, { r: 22 })}${t(744, 130, "Call Stack", { size: 21, weight: 800 })}
${frameRow(744, 152, 212, "main()")}${frameRow(744, 204, 212, "loadUser()")}${frameRow(744, 256, 212, "then(cb)", true)}
${box(1060, 92, 260, 236, { r: 22 })}${t(1084, 130, "Web APIs", { size: 21, weight: 800 })}
${chip(1084, 152, "fetch(url)", false)}${chip(1084, 204, "setTimeout", false)}${chip(1084, 256, "click", false)}
<circle cx="1020" cy="210" r="34" fill="${C.ink}"/><path d="M1006 198 a16 16 0 1 1 -2 18" fill="none" stroke="${C.g}" stroke-width="4" stroke-linecap="round"/><path d="M999 192 l6 7 l8 -4" fill="none" stroke="${C.g}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${t(1020, 268, "Event", { size: 15, weight: 800, anchor: "middle" })}${t(1020, 286, "loop", { size: 15, weight: 800, anchor: "middle" })}
${box(720, 360, 600, 92, { r: 22, stroke: C.g, sw: 3 })}${t(744, 398, "Microtask queue", { size: 19, weight: 800 })}${t(744, 424, "runs first", { size: 15, fill: C.g2, weight: 700 })}
${chip(950, 386, "promise.then", true)}${chip(1132, 386, "await", true)}
${box(720, 472, 600, 92, { r: 22 })}${t(744, 510, "Task queue", { size: 19, weight: 800 })}${t(744, 536, "then the next task", { size: 15, fill: C.sub, weight: 600 })}
${chip(950, 498, "setTimeout cb", false)}${chip(1150, 498, "click cb", false)}
${arrow("M1190 332 C1190 350 1190 350 1190 352", { w: 3 })}
${codeCard(720, 596, 600, 124, [
    [["const ", "k"], ["res", "f"], [" = ", "p"], ["await ", "k"], ["fetch", "f"], ["(url);", "p"]],
    [["const ", "k"], ["user", "f"], [" = ", "p"], ["await ", "k"], ["res.", "p"], ["json", "f"], ["();", "p"]],
  ], { file: "user.js", lh: 32, size: 21 })}`;
  },

  "javascript-dom-events": () => {
    const node = (cx, y, l, { hi = false, w = 150 } = {}) => `<g filter="url(#sh)"><rect x="${cx - w / 2}" y="${y}" width="${w}" height="54" rx="16" fill="${hi ? C.g : "#fff"}" stroke="${hi ? C.g2 : C.line}" stroke-width="2"/></g>${t(cx, y + 35, `<${l}>`, { size: 21, weight: 700, anchor: "middle", font: MONO, fill: C.ink })}`;
    const link = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="#BDBDBD" stroke-width="3"/>`;
    return `
${link(980, 148, 860, 214)}${link(980, 148, 1100, 214)}${link(860, 268, 860, 324)}${link(1100, 268, 1100, 324)}${link(1100, 378, 1100, 434)}
${node(980, 94, "html")}${node(860, 214, "head")}${node(1100, 214, "body")}${node(860, 324, "title")}${node(1100, 324, "main")}${node(1100, 434, "button", { hi: true, w: 170 })}
<circle cx="1160" cy="476" r="34" fill="none" stroke="${C.g}" stroke-width="3" opacity=".7"/><circle cx="1160" cy="476" r="52" fill="none" stroke="${C.g}" stroke-width="2" opacity=".35"/>
<path d="M1158 470 L1158 506 L1167 498 L1174 514 L1181 511 L1174 495 L1186 495 Z" fill="${C.ink}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
${arrow("M1222 452 C1268 420 1268 380 1230 352", { dash: "8 8" })}${arrow("M1228 334 C1266 300 1266 262 1230 244", { dash: "8 8" })}${arrow("M1196 218 C1210 180 1150 130 1066 124", { dash: "8 8" })}
${pill(1196, 278, "bubbles up", { fill: "#fff", color: C.g2, size: 16, h: 34, pad: 14 }).svg}
${pill(900, 441, "click", { fill: C.ink, color: C.g, size: 18, h: 40, pad: 18, font: MONO }).svg}${arrow("M988 461 H1006", { w: 3 })}
${codeCard(720, 540, 600, 172, [
    [["button", "f"], [".", "p"], ["addEventListener", "f"], ["(", "p"], ["\"click\"", "s"], [", (e) => {", "p"]],
    [["  e.target.", "p"], ["textContent", "f"], [" = ", "p"], ["\"Clicked!\"", "s"], [";", "p"]],
    [["});", "p"]],
  ], { file: "events.js", lh: 34, size: 21 })}`;
  },

  "building-rest-vs-graphql": () => {
    const req = (x, y, m, path) => { const p = pill(x, y, m, { fill: m === "GET" ? C.gt : C.ink, color: m === "GET" ? C.g2 : C.g, size: 16, h: 34, pad: 12, font: MONO }); return `${p.svg}${t(x + p.w + 12, y + 24, path, { size: 19, font: MONO, weight: 600 })}`; };
    return `
${box(720, 92, 290, 470, { r: 24 })}
${t(744, 136, "REST", { size: 28, weight: 800, font: TITLE })}${t(986, 136, "2 requests", { size: 16, fill: C.sub, weight: 700, anchor: "end" })}
${req(744, 166, "GET", "/users/42")}
<rect x="744" y="214" width="242" height="96" rx="14" fill="#F4F4F4"/>${code(760, 244, [[["{ ", "p"], ["\"name\"", "s"], [": ", "p"], ["\"Asha\"", "s"], [",", "p"]], [["  ", "p"], ["\"email\"", "s"], [": ", "p"], ["…", "o"], [" }", "p"]]], { size: 16, lh: 30, theme: LIGHT })}
${req(744, 336, "GET", "/users/42/posts")}
<rect x="744" y="384" width="242" height="96" rx="14" fill="#F4F4F4"/>${code(760, 414, [[["[{ ", "p"], ["\"title\"", "s"], [": ", "p"], ["\"Hi\"", "s"], [",", "p"]], [["   ", "p"], ["\"body\"", "s"], [": ", "p"], ["…", "o"], [" }]", "p"]]], { size: 16, lh: 30, theme: LIGHT })}
${t(744, 530, "Over-fetches extra fields", { size: 16, fill: C.sub, weight: 600 })}
${box(1030, 92, 290, 470, { r: 24, stroke: C.g, sw: 3 })}
${t(1054, 136, "GraphQL", { size: 28, weight: 800, font: TITLE })}${t(1296, 136, "1 request", { size: 16, fill: C.g2, weight: 800, anchor: "end" })}
${req(1054, 166, "POST", "/graphql")}
<rect x="1054" y="214" width="242" height="290" rx="14" fill="#1E1E1E"/>
${code(1072, 250, [
      [["query", "k"], [" {", "p"]],
      [["  user", "f"], ["(id: ", "p"], ["42", "n"], [") {", "p"]],
      [["    name", "p"]],
      [["    posts", "f"], [" {", "p"]],
      [["      title", "p"]],
      [["    }", "p"]],
      [["  }", "p"]],
      [["}", "p"]],
    ], { size: 18, lh: 31 })}
${t(1054, 530, "Exactly the fields you ask for", { size: 16, fill: C.g2, weight: 700 })}
<circle cx="1020" cy="327" r="26" fill="${C.ink}"/>${t(1020, 334, "vs", { size: 18, weight: 800, fill: C.g, anchor: "middle" })}
${[["code", "Resources & verbs"], ["layers", "Schema & resolvers"], ["chart", "N+1 & caching"]].map(([ic, l], i) => {
      const x = 720 + i * 204;
      return `${box(x, 600, 192, 84, { r: 20 })}<rect x="${x + 16}" y="618" width="48" height="48" rx="14" fill="${C.gt}"/>${icon(ic, x + 40, 642, { s: 0.7, col: C.g2 })}${t(x + 74, 637, l.split(" & ")[0] + " &", { size: 16, weight: 700 })}${t(x + 74, 659, l.split(" & ")[1], { size: 16, weight: 700 })}`;
    }).join("")}`;
  },
};

const POSTS = [
  { slug: "chatgpt-6-astra-guide", chip: "AI", title: ["GPT-6 *Astra*", "explained"], sub: ["What OpenAI's newest model", "means for ChatGPT"], read: 11 },
  { slug: "deploying-fullstack-on-vercel", chip: "DevOps", title: ["Deploy a", "*full-stack* app"], sub: ["On Vercel, properly: builds,", "previews, env vars & caching"], read: 14 },
  { slug: "javascript-complete-guide-for-beginners", chip: "JavaScript", title: ["JavaScript,", "finally *clicked*"], sub: ["Zero to confident", "in one read"], read: 22 },
  { slug: "javascript-closures-explained", chip: "JavaScript", title: ["*Closures*,", "without the", "confusion"], sub: ["Scope, memory & the classic loop bug"], read: 10 },
  { slug: "javascript-async-deep-dive", chip: "JavaScript", title: ["*Async*", "JavaScript,", "demystified"], sub: ["Event loop, promises & async/await"], read: 12 },
  { slug: "javascript-dom-events", chip: "JavaScript", title: ["Make any page", "come *alive*"], sub: ["DOM manipulation, events,", "bubbling & delegation"], read: 11 },
  { slug: "building-rest-vs-graphql", chip: "API Design", title: ["*REST* vs", "*GraphQL*"], sub: ["The complete build guide,", "from verbs to resolvers"], read: 14 },
];


const only = process.argv[2];
render(POSTS.filter((p) => !only || p.slug === only).map((post) => ({ name: post.slug, svg: frame(post, ART[post.slug]()), out: join(ROOT, "assets/images/blog", `${post.slug}.webp`) })), W, H);
