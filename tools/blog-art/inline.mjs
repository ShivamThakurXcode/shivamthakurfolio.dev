// In-article figures for the blog posts (1400×854 WebP = 2× the 700×427 image-spot slot).
// usage: node tools/blog-art/inline.mjs [name]
import { join } from "node:path";
import { icon, sparkle, check } from "../service-art/lib.mjs";
import { C, ROOT, SANS, MONO, TITLE, t, box, pill, code, codeCard, arrow, LIGHT, DEFS, render } from "./kit.mjs";

const W = 1400, H = 854;
const RED = "#E5484D";
const frame = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${DEFS}
<rect width="${W}" height="${H}" fill="${C.bg}"/><rect width="${W}" height="${H}" fill="url(#dots)" opacity=".7"/>
${body}
</svg>`;
const label = (x, y, s, o = {}) => t(x, y, s, { size: 22, weight: 700, ...o });
const note = (x, y, s, o = {}) => t(x, y, s, { size: 19, fill: C.sub, weight: 500, ...o });
const step = (x, y, n, fill = C.ink, color = "#fff") => `<circle cx="${x}" cy="${y}" r="20" fill="${fill}"/>${t(x, y + 7, String(n), { size: 19, weight: 800, anchor: "middle", fill: color })}`;
const tag = (x, y, s, o = {}) => pill(x, y, s, o).svg;
const cross = (x, y, s = 1, col = RED) => `<path d="M${x - 9 * s} ${y - 9 * s} l${18 * s} ${18 * s} M${x + 9 * s} ${y - 9 * s} l${-18 * s} ${18 * s}" stroke="${col}" stroke-width="${4 * s}" stroke-linecap="round"/>`;
const tick = (x, y, r = 16) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.g}"/>${check(x, y, r / 20, "#fff", 4)}`;
const nope = (x, y, r = 16) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${RED}"/>${cross(x, y, r / 22, "#fff")}`;
// DOM node chip centred on cx
const node = (cx, y, s, { kind = "el", w } = {}) => {
  const ww = w ?? Math.max(120, s.length * 13 + 44);
  const st = { el: { fill: "#fff", stroke: C.line, color: C.ink, dash: "" }, hi: { fill: C.g, stroke: C.g2, color: C.ink, dash: "" }, doc: { fill: C.ink, stroke: C.ink, color: "#fff", dash: "" }, text: { fill: C.gt, stroke: C.g2, color: C.g2, dash: "6 5" } }[kind];
  return `<g filter="url(#sh)"><rect x="${cx - ww / 2}" y="${y}" width="${ww}" height="54" rx="16" fill="${st.fill}" stroke="${st.stroke}" stroke-width="2"${st.dash ? ` stroke-dasharray="${st.dash}"` : ""}/></g>${t(cx, y + 35, s, { size: 21, weight: 700, anchor: "middle", font: kind === "text" ? SANS : MONO, fill: st.color })}`;
};
const link = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="#BDBDBD" stroke-width="3"/>`;
// food on a tray
const FOOD = {
  rice: (x, y) => `<path d="M${x - 34} ${y} a34 26 0 0 0 68 0 z" fill="#fff" stroke="#BDBDBD" stroke-width="3"/><path d="M${x - 30} ${y} q30 -24 60 0" fill="#FAFAF7" stroke="#BDBDBD" stroke-width="3"/>`,
  dal: (x, y) => `<path d="M${x - 34} ${y} a34 26 0 0 0 68 0 z" fill="#fff" stroke="#BDBDBD" stroke-width="3"/><ellipse cx="${x}" cy="${y}" rx="32" ry="9" fill="#F2B544"/>`,
  sabzi: (x, y) => `<path d="M${x - 34} ${y} a34 26 0 0 0 68 0 z" fill="#fff" stroke="#BDBDBD" stroke-width="3"/><ellipse cx="${x}" cy="${y}" rx="32" ry="9" fill="#6BBF59"/>`,
  roti: (x, y) => `<ellipse cx="${x}" cy="${y + 8}" rx="34" ry="16" fill="#E8B97E" stroke="#C9965A" stroke-width="3"/><circle cx="${x - 10}" cy="${y + 6}" r="3" fill="#C9965A"/><circle cx="${x + 12}" cy="${y + 11}" r="3" fill="#C9965A"/>`,
  lassi: (x, y) => `<path d="M${x - 20} ${y - 30} h40 l-5 52 h-30 z" fill="#FFFDF5" stroke="#BDBDBD" stroke-width="3"/><path d="M${x - 18} ${y - 18} h36" stroke="#F4E3B5" stroke-width="6"/>`,
};
const food = (k, x, y, name, { off = false } = {}) => `<g${off ? ' opacity=".35"' : ""}>${FOOD[k](x, y)}</g>${off ? `<path d="M${x - 40} ${y - 20} L${x + 40} ${y + 30}" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>` : ""}${t(x, y + 62, name, { size: 18, weight: 700, anchor: "middle", fill: off ? "#A0A0A0" : C.ink })}`;

const FIG = {
  // ── REST vs GraphQL: the restaurant analogy
  "rest-graphql-restaurant": () => `
${box(60, 60, 620, 734, { r: 30 })}
${tag(92, 92, "Restaurant REST", { fill: C.ink, color: "#fff", size: 22, h: 46 })}
${box(92, 170, 556, 120, { r: 20, fill: "#F6F6F6", stroke: "#F6F6F6", shadow: false })}
${t(120, 220, "Combo #3", { size: 30, weight: 800, font: TITLE })}${note(120, 258, "Rice · dal · sabzi · roti, always together")}
${t(560, 236, "Fixed", { size: 18, weight: 800, fill: C.sub, anchor: "middle" })}
${box(92, 320, 556, 200, { r: 20 })}
${food("rice", 168, 400, "Rice", { off: true })}${food("dal", 296, 400, "Dal")}${food("sabzi", 424, 400, "Sabzi", { off: true })}${food("roti", 552, 400, "Roti", { off: true })}
${t(370, 560, "You only wanted the dal, but you get the whole combo.", { size: 19, weight: 600, anchor: "middle", fill: C.sub })}
${box(92, 590, 556, 110, { r: 20, fill: "#FFF5F5", stroke: "#F7C9CB", shadow: false })}
${step(132, 645, 2, RED)}${t(166, 638, "Want just the dal?", { size: 21, weight: 800 })}${note(166, 666, "Another trip to the counter")}
${tag(92, 724, "2 trips · extra food", { fill: "#FDE7E8", color: RED, size: 19, h: 42 })}

${box(720, 60, 620, 734, { r: 30, stroke: C.g, sw: 3 })}
${tag(752, 92, "Restaurant GraphQL", { fill: C.g, color: C.ink, size: 22, h: 46 })}
<g transform="rotate(-1.5 1030 245)">${box(752, 170, 556, 150, { r: 14 })}
<path d="M752 214 H1308" stroke="#EDEDED" stroke-width="2"/>${t(778, 202, "ORDER SHEET", { size: 16, weight: 800, fill: C.sub, extra: 'letter-spacing="2"' })}
${t(778, 260, "Just dal, extra roti,", { size: 26, weight: 600, font: TITLE })}${t(778, 298, "no rice, and a lassi.", { size: 26, weight: 600, font: TITLE })}</g>
${box(752, 350, 556, 170, { r: 20 })}
${food("dal", 860, 410, "Dal")}${food("roti", 990, 410, "Extra roti")}${food("lassi", 1120, 414, "Lassi")}
${tick(1240, 430, 22)}
${t(1030, 560, "One order, exactly what you asked for.", { size: 19, weight: 600, anchor: "middle", fill: C.sub })}
${box(752, 590, 556, 110, { r: 20, fill: C.gt, stroke: C.gt, shadow: false })}
${step(792, 645, 1, C.g, C.ink)}${t(826, 638, "One trip to the counter", { size: 21, weight: 800 })}${note(826, 666, "Nothing more, nothing less")}
${tag(752, 724, "1 order · 1 trip", { fill: C.gt, color: C.g2, size: 19, h: 42 })}`,

  // ── REST request flow: client → server → database → response
  "rest-graphql-flow": () => {
    const card = (x, ic, name, sub) => `${box(x, 250, 300, 230, { r: 28 })}<circle cx="${x + 150}" cy="320" r="44" fill="${C.gt}"/>${icon(ic, x + 150, 320, { s: 1.1 })}${t(x + 150, 410, name, { size: 28, weight: 800, anchor: "middle" })}${note(x + 150, 444, sub, { anchor: "middle" })}`;
    return `
${card(60, "layout", "Client", "Browser or app")}${card(550, "code", "Server", "Express route")}${card(1040, "db", "Database", "posts table")}
${arrow("M370 300 H540")}${tag(380, 248, "GET /posts", { fill: C.ink, color: C.g, size: 18, h: 38, font: MONO })}${step(455, 220, 1, C.g, C.ink)}
${arrow("M860 300 H1030")}${tag(884, 248, "find posts", { fill: "#fff", color: C.ink, size: 18, h: 38, font: MONO })}${step(945, 220, 2, C.g, C.ink)}
${arrow("M1030 430 H860")}${tag(910, 446, "rows", { fill: "#fff", color: C.ink, size: 18, h: 38, font: MONO })}${step(945, 516, 3, C.g, C.ink)}
${arrow("M540 430 H370")}${tag(390, 446, "200 OK", { fill: C.g, color: C.ink, size: 18, h: 38, font: MONO })}${step(455, 516, 4, C.g, C.ink)}
${codeCard(60, 580, 1280, 214, [
      [["[", "p"]],
      [["  { ", "p"], ["\"id\"", "s"], [": ", "p"], ["1", "n"], [", ", "p"], ["\"title\"", "s"], [": ", "p"], ["\"Hello World\"", "s"], [", ", "p"], ["\"content\"", "s"], [": ", "p"], ["\"My first post!\"", "s"], [" }", "p"]],
      [["]", "p"]],
    ], { file: "Response · application/json", lh: 38, size: 24 })}
${t(1310, 125, "Request goes in, JSON comes back", { size: 22, weight: 700, anchor: "end", fill: C.sub })}
${t(60, 125, "The REST flow", { size: 40, weight: 600, font: TITLE })}`;
  },

  // ── API client testing GET /posts
  "rest-graphql-api-client": () => {
    const side = [["GET", "/posts", true], ["GET", "/posts/:id"], ["POST", "/posts"], ["PATCH", "/posts/:id"], ["DELETE", "/posts/:id"]];
    const mcol = { GET: C.g2, POST: "#B45309", PATCH: "#3E63DD", DELETE: RED };
    return `
${box(60, 60, 1280, 734, { r: 28 })}
<path d="M60 124 H1340" stroke="#EDEDED" stroke-width="2"/>${[0, 1, 2].map((i) => `<circle cx="${96 + i * 22}" cy="92" r="7" fill="#DCDCDC"/>`).join("")}${t(700, 100, "API Client", { size: 19, weight: 700, anchor: "middle", fill: C.sub })}
<rect x="60" y="124" width="300" height="670" fill="#FAFAFA"/><path d="M360 124 V794" stroke="#EDEDED" stroke-width="2"/>
${t(88, 170, "Blog API", { size: 20, weight: 800 })}${note(88, 196, "Collection · 5 requests", { size: 16 })}
${side.map(([m, p, on], i) => `${on ? `<rect x="76" y="${222 + i * 56}" width="268" height="46" rx="12" fill="${C.gt}"/>` : ""}${t(92, 252 + i * 56, m, { size: 15, weight: 800, font: MONO, fill: mcol[m] })}${t(170, 252 + i * 56, p, { size: 17, font: MONO, weight: 500 })}`).join("")}
<rect x="392" y="152" width="120" height="56" rx="12" fill="${C.gt}"/>${t(452, 188, "GET", { size: 22, weight: 800, font: MONO, fill: C.g2, anchor: "middle" })}
<rect x="524" y="152" width="640" height="56" rx="12" fill="#F4F4F4"/>${t(548, 188, "http://localhost:3000/posts", { size: 22, font: MONO, weight: 500 })}
<rect x="1180" y="152" width="128" height="56" rx="12" fill="${C.g}"/>${t(1244, 188, "Send", { size: 22, weight: 800, anchor: "middle" })}
${["Params", "Headers", "Body", "Auth"].map((s, i) => t(400 + i * 120, 252, s, { size: 18, weight: 600, fill: C.sub })).join("")}
<path d="M392 270 H1308" stroke="#EDEDED" stroke-width="2"/>
${t(392, 314, "Response", { size: 22, weight: 800 })}
${tag(1032, 288, "200 OK", { fill: C.gt, color: C.g2, size: 18, h: 38, font: MONO })}${t(1178, 314, "12 ms", { size: 18, weight: 600, fill: C.sub })}${t(1250, 314, "JSON", { size: 18, weight: 700, fill: C.sub })}
<rect x="392" y="336" width="916" height="426" rx="16" fill="#1E1E1E"/>
${[1, 2, 3, 4, 5, 6, 7].map((n) => t(424, 386 + (n - 1) * 50, String(n), { size: 20, font: MONO, weight: 400, fill: "#5A5A5A", anchor: "end" })).join("")}
${code(452, 386, [
      [["[", "p"]],
      [["  {", "p"]],
      [["    \"id\"", "s"], [": ", "p"], ["1", "n"], [",", "p"]],
      [["    \"title\"", "s"], [": ", "p"], ["\"Hello World\"", "s"], [",", "p"]],
      [["    \"content\"", "s"], [": ", "p"], ["\"My first post!\"", "s"]],
      [["  }", "p"]],
      [["]", "p"]],
    ], { size: 22, lh: 50 })}`;
  },

  // ── API versioning: v1 and v2 side by side
  "rest-graphql-versioning": () => {
    const client = (y, name, sub) => `${box(60, y, 330, 150, { r: 24 })}<circle cx="118" cy="${y + 75}" r="34" fill="${C.gt}"/>${icon(name.startsWith("Old") ? "phone" : "layout", 118, y + 75, { s: 0.9 })}${t(170, y + 68, name, { size: 23, weight: 800 })}${note(170, y + 98, sub, { size: 17 })}`;
    const lane = (y, v, body, fields) => `${box(560, y, 380, 150, { r: 24, stroke: v === "v2" ? C.g : C.line, sw: v === "v2" ? 3 : 2 })}${tag(588, y + 24, v, { fill: v === "v2" ? C.g : C.ink, color: v === "v2" ? C.ink : "#fff", size: 20, h: 40, font: MONO })}${t(660, y + 52, `/api/${v}/posts`, { size: 22, font: MONO, weight: 700 })}${note(588, y + 112, body, { size: 17 })}
${box(1010, y, 330, 150, { r: 24, fill: "#1E1E1E", stroke: "#1E1E1E" })}${code(1034, y + 52, fields, { size: 18, lh: 30 })}`;
    return `
${t(60, 125, "Versioning in practice", { size: 40, weight: 600, font: TITLE })}${note(1340, 125, "Both versions run side by side", { anchor: "end", size: 21, weight: 600 })}
${box(470, 180, 560, 540, { r: 34, fill: "rgba(255,255,255,0.35)", stroke: "#D6D6D6", dash: "10 10", shadow: false })}${t(750, 216, "Your API server", { size: 19, weight: 800, fill: C.sub, anchor: "middle" })}
${client(240, "Old mobile app", "Built against v1")}${client(470, "New web app", "Uses the latest v2")}
${lane(240, "v1", "Unchanged, keeps working", [[["{ ", "p"], ["\"id\"", "s"], [": ", "p"], ["1", "n"], [",", "p"]], [["  ", "p"], ["\"title\"", "s"], [": ", "p"], ["\"Hello World\"", "s"], [" }", "p"]]])}
${lane(470, "v2", "New fields, new behaviour", [[["{ ", "p"], ["\"id\"", "s"], [": ", "p"], ["1", "n"], [",", "p"]], [["  ", "p"], ["\"title\"", "s"], [": ", "p"], ["\"Hello World\"", "s"], [",", "p"]], [["  ", "p"], ["\"author\"", "s"], [": ", "p"], ["\"Asha\"", "s"], [" }", "p"]]])}
${arrow("M394 315 H552")}${arrow("M394 545 H552")}${arrow("M944 315 H1002", { color: C.ink, head: "ahk" })}${arrow("M944 545 H1002", { color: C.ink, head: "ahk" })}
${box(60, 744, 1280, 70, { r: 20, fill: C.gt, stroke: C.gt, shadow: false })}${tick(102, 779, 18)}${t(134, 786, "Existing clients never break: v1 stays live while new apps move to v2.", { size: 21, weight: 700 })}`;
  },

  // ── Vercel: push → build → CDN + functions, previews and production
  "vercel-build-flow": () => `
${box(60, 70, 400, 150, { r: 24, fill: "#1E1E1E", stroke: "#1E1E1E" })}${[0, 1, 2].map((i) => `<circle cx="${86 + i * 20}" cy="96" r="6" fill="#3A3A3A"/>`).join("")}
${code(88, 156, [[["$ ", "k"], ["git push", "p"]], [["✓ ", "k"], ["Build started", "o"]]], { size: 22, lh: 38 })}
${arrow("M466 145 H548")}
${box(556, 70, 300, 150, { r: 24, stroke: C.g, sw: 3 })}<circle cx="626" cy="145" r="38" fill="${C.gt}"/>${icon("gear", 626, 145, { s: 1 })}${t(682, 138, "Build", { size: 28, weight: 800 })}${note(682, 168, "Install & compile", { size: 17 })}
${arrow("M862 115 C900 115 900 110 936 110")}${arrow("M862 175 C900 175 900 260 936 260")}
${box(944, 50, 396, 120, { r: 22 })}<circle cx="1000" cy="110" r="32" fill="${C.gt}"/><g fill="none" stroke="${C.ink}" stroke-width="3.5"><circle cx="1000" cy="110" r="17"/><ellipse cx="1000" cy="110" rx="7" ry="17"/><path d="M983 110 H1017"/></g>
${t(1048, 104, "Static assets", { size: 22, weight: 800 })}${note(1048, 134, "Served from the edge CDN", { size: 17 })}
${box(944, 200, 396, 120, { r: 22 })}<circle cx="1000" cy="260" r="32" fill="${C.gt}"/>${icon("code", 1000, 260, { s: 0.85 })}
${t(1048, 254, "Server code", { size: 22, weight: 800 })}${note(1048, 284, "Runs as serverless functions", { size: 17 })}
${box(60, 380, 620, 410, { r: 28 })}${t(92, 430, "Every branch gets a preview", { size: 24, weight: 800 })}
${tag(92, 462, "feature/login", { fill: C.ink, color: C.g, size: 18, h: 40, font: MONO })}${arrow("M300 482 H352")}${tag(360, 462, "Preview deployed", { fill: C.gt, color: C.g2, size: 18, h: 40 })}
${box(92, 530, 556, 220, { r: 20, fill: "#FAFAFA", shadow: false })}<path d="M92 574 H648" stroke="#EDEDED" stroke-width="2"/>${[0, 1, 2].map((i) => `<circle cx="${116 + i * 18}" cy="552" r="5" fill="#DCDCDC"/>`).join("")}
<rect x="180" y="540" width="440" height="26" rx="13" fill="#fff"/>${t(196, 559, "my-app-git-feature-login.vercel.app", { size: 15, font: MONO, weight: 500 })}
${tag(116, 600, "Preview", { fill: C.gt, color: C.g2, size: 17, h: 36 })}<rect x="116" y="656" width="300" height="14" rx="7" fill="#E4E4E4"/><rect x="116" y="684" width="220" height="14" rx="7" fill="#E4E4E4"/><rect x="116" y="712" width="260" height="14" rx="7" fill="#E4E4E4"/>
${box(720, 380, 620, 410, { r: 28, stroke: C.g, sw: 3 })}${t(752, 430, "Promote to production", { size: 24, weight: 800 })}
${tag(752, 462, "main", { fill: C.ink, color: C.g, size: 18, h: 40, font: MONO })}${arrow("M846 482 H898")}
<rect x="910" y="460" width="160" height="44" rx="22" fill="${C.g}"/>${t(990, 489, "Promote", { size: 19, weight: 800, anchor: "middle" })}
${box(752, 530, 556, 220, { r: 20, fill: "#FAFAFA", shadow: false })}<path d="M752 574 H1308" stroke="#EDEDED" stroke-width="2"/>${[0, 1, 2].map((i) => `<circle cx="${776 + i * 18}" cy="552" r="5" fill="#DCDCDC"/>`).join("")}
<rect x="840" y="540" width="440" height="26" rx="13" fill="#fff"/>${t(856, 559, "myapp.com", { size: 15, font: MONO, weight: 500 })}
${tick(800, 640, 24)}${t(840, 634, "Live in production", { size: 22, weight: 800 })}${note(840, 664, "Same build, promoted, no rebuild", { size: 17 })}
<rect x="776" y="700" width="260" height="14" rx="7" fill="#E4E4E4"/>`,

  // ── Event loop (deep dive)
  "async-event-loop": () => {
    const frameRow = (y, s, hi) => `<rect x="84" y="${y}" width="252" height="58" rx="14" fill="${hi ? C.g : "#F4F4F4"}"/>${t(210, y + 37, s, { size: 20, weight: 700, anchor: "middle", font: MONO })}`;
    const chip = (x, y, s, dark) => tag(x, y, s, { fill: dark ? C.ink : "#F0F0F0", color: dark ? "#fff" : C.ink, size: 18, h: 44, pad: 18, font: MONO });
    return `
${box(60, 60, 300, 560, { r: 28 })}${t(84, 108, "Call Stack", { size: 26, weight: 800 })}${note(84, 136, "One thing at a time", { size: 16 })}
${frameRow(536, "main()")}${frameRow(470, "getUser()")}${frameRow(404, "console.log()", true)}
${t(210, 380, "runs top frame", { size: 15, weight: 700, fill: C.g2, anchor: "middle" })}
${box(1040, 60, 300, 330, { r: 28 })}${t(1064, 108, "Web APIs", { size: 26, weight: 800 })}${note(1064, 136, "Provided by the browser", { size: 16 })}
${chip(1064, 170, "setTimeout()")}${chip(1064, 232, "fetch()")}${chip(1064, 294, "DOM events")}
<circle cx="700" cy="230" r="112" fill="url(#glow)"/>
<g filter="url(#sh)"><circle cx="700" cy="230" r="86" fill="${C.ink}"/></g>
<path d="M664 196 a50 50 0 1 1 -6 60" fill="none" stroke="${C.g}" stroke-width="7" stroke-linecap="round"/><path d="M652 184 l12 14 l16 -8" fill="none" stroke="${C.g}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
${t(700, 352, "Event Loop", { size: 26, weight: 800, anchor: "middle" })}
${box(470, 372, 460, 56, { r: 28, fill: C.gt, stroke: C.gt, shadow: false })}${t(700, 408, "Only moves work when the stack is empty", { size: 18, weight: 700, anchor: "middle", fill: C.g2 })}
${box(420, 470, 920, 120, { r: 26, stroke: C.g, sw: 3 })}${t(448, 516, "Microtask queue", { size: 23, weight: 800 })}${t(448, 546, "Runs first, all of it", { size: 16, weight: 700, fill: C.g2 })}
${chip(760, 508, "promise.then()", true)}${chip(1000, 508, "await", true)}
${box(420, 610, 920, 120, { r: 26 })}${t(448, 656, "Callback (task) queue", { size: 23, weight: 800 })}${t(448, 686, "Then one task at a time", { size: 16, weight: 700, fill: C.sub })}
${chip(760, 648, "setTimeout cb")}${chip(1010, 648, "click handler")}
${arrow("M364 150 C600 80 820 80 1032 140", { color: C.ink, head: "ahk", dash: "8 8" })}${t(700, 62, "async call handed off", { size: 17, weight: 700, anchor: "middle", fill: C.sub })}
${arrow("M1190 396 V462")}${arrow("M1300 396 C1360 450 1360 620 1346 660")}
${arrow("M620 466 C600 400 620 330 640 300")}${arrow("M614 302 C520 300 420 330 368 380")}
${box(60, 760, 1280, 60, { r: 20, fill: "#fff", shadow: false })}${t(700, 798, "Order:  stack  →  all microtasks  →  one task  →  repeat", { size: 20, weight: 700, anchor: "middle", font: MONO })}`;
  },

  // ── Closures: the scope chain
  "closures-scope-chain": () => `
${box(60, 60, 1280, 734, { r: 34, fill: "#FAFAFA", stroke: "#D6D6D6" })}${tag(88, 84, "Global scope", { fill: "#E9E9E9", color: C.ink, size: 18, h: 38 })}
${box(130, 150, 760, 560, { r: 30, fill: C.gt, stroke: C.g, sw: 3, shadow: false })}${tag(156, 172, "outer() scope", { fill: C.g, color: C.ink, size: 18, h: 38, font: MONO })}
${code(166, 252, [[["function ", "k"], ["outer", "f"], ["() {", "p"]]], { size: 25, theme: LIGHT })}
<rect x="190" y="276" width="530" height="34" rx="8" fill="#C6F7D8" opacity=".9"/>
${code(166, 296, [[["  const ", "k"], ["message", "f"], [" = ", "p"], ["\"I'm from outer\"", "s"], [";", "p"]]], { size: 25, theme: LIGHT })}
<g filter="url(#sh)"><rect x="178" y="340" width="642" height="196" rx="24" fill="#fff" stroke="${C.g2}" stroke-width="3"/></g>${tag(560, 322, "inner() scope", { fill: C.ink, color: "#fff", size: 18, h: 38, font: MONO })}
${code(166, 400, [[["  function ", "k"], ["inner", "f"], ["() {", "p"]], [["    console.", "p"], ["log", "f"], ["(message);", "p"]], [["  }", "p"]]], { size: 25, lh: 48, theme: LIGHT })}
${code(166, 628, [[["  inner", "f"], ["();", "p"]], [["}", "p"]]], { size: 25, lh: 40, theme: LIGHT })}
${code(100, 752, [[["outer", "f"], ["();", "p"]], ], { size: 25, theme: LIGHT })}${t(220, 752, "// \"I'm from outer\"", { size: 22, font: MONO, weight: 400, fill: "#8A8A8A" })}
${arrow("M560 446 C640 446 760 380 724 302", { dash: "8 8", w: 4 })}${tick(806, 440, 22)}
${t(938, 220, "Scope chain", { size: 30, weight: 600, font: TITLE })}
${[["inner()", C.ink, "#fff"], ["outer()", C.g, C.ink], ["global", "#E9E9E9", C.ink]].map(([s, f, c], i) => `${tag(938, 262 + i * 104, s, { fill: f, color: c, size: 20, h: 48, font: MONO })}${i < 2 ? arrow(`M990 ${316 + i * 104} V${356 + i * 104}`, { color: C.ink, head: "ahk", w: 3 }) : ""}`).join("")}
${note(1088, 292, "looks here first", { size: 17 })}${note(1088, 396, "then outward", { size: 17 })}${note(1088, 500, "then global", { size: 17 })}
${box(938, 580, 380, 130, { r: 22, fill: "#FFF5F5", stroke: "#F7C9CB", shadow: false })}${nope(976, 622, 18)}${t(1006, 629, "Not the other way", { size: 20, weight: 800 })}${note(964, 668, "outer() can't see inner()'s", { size: 17 })}${note(964, 694, "variables", { size: 17 })}`,

  // ── How JavaScript runs in the browser
  "js-how-it-runs": () => `
${box(60, 60, 600, 400, { r: 28 })}<path d="M60 116 H660" stroke="#EDEDED" stroke-width="2"/>${[0, 1, 2].map((i) => `<circle cx="${92 + i * 22}" cy="88" r="7" fill="#DCDCDC"/>`).join("")}
<rect x="170" y="74" width="460" height="30" rx="15" fill="#F4F4F4"/>${t(190, 96, "index.html", { size: 17, font: MONO, weight: 500 })}
${step(110, 166, 1, C.g, C.ink)}${t(144, 173, "The browser loads the page", { size: 21, weight: 800 })}
${code(96, 232, [[["<h1>", "k"], ["Hello!", "p"], ["</h1>", "k"]], [["<p>", "k"], ["Welcome to my site.", "p"], ["</p>", "k"]]], { size: 22, lh: 42, theme: LIGHT })}
<rect x="84" y="300" width="552" height="48" rx="12" fill="${C.gt}" stroke="${C.g}" stroke-width="2"/>
${code(96, 332, [[["<script ", "k"], ["src=", "p"], ["\"app.js\"", "s"], ["></script>", "k"]]], { size: 22, theme: LIGHT })}
${step(110, 398, 2, C.g, C.ink)}${t(144, 405, "It reaches the <script> tag", { size: 21, weight: 800 })}
${arrow("M666 324 H732")}
${codeCard(740, 60, 600, 400, [
    [["const ", "k"], ["name", "f"], [" = ", "p"], ["\"Shivam\"", "s"], [";", "p"]],
    [["console", "p"], [".", "p"], ["log", "f"], ["(", "p"], ["\"Hi, \"", "s"], [" + name);", "p"]],
    [["console", "p"], [".", "p"], ["log", "f"], ["(", "p"], ["\"Done\"", "s"], [");", "p"]],
  ], { file: "app.js", lh: 60, size: 24 })}
${step(790, 380, 3, C.g, C.ink)}${t(824, 387, "Runs top to bottom, line by line", { size: 20, weight: 800, fill: "#fff" })}
${arrow("M1300 140 V330", { w: 4 })}
${box(60, 510, 1280, 280, { r: 28, fill: "#1E1E1E", stroke: "#1E1E1E" })}${t(92, 558, "Console", { size: 20, weight: 800, fill: "#fff" })}<path d="M60 580 H1340" stroke="#2C2C2C" stroke-width="2"/>
${code(92, 640, [[["›  ", "o"], ["Hi, Shivam", "p"]], [["›  ", "o"], ["Done", "p"]]], { size: 26, lh: 52 })}
${tag(1050, 612, "Output, in order", { fill: "#2C2C2C", color: C.g, size: 18, h: 40 })}`,

  // ── DOM tree (beginner guide) with querySelector
  "js-dom-tree": () => `
${link(700, 134, 400, 220)}${link(700, 134, 1000, 220)}${link(400, 274, 400, 350)}${link(1000, 274, 800, 350)}${link(1000, 274, 1000, 350)}${link(1000, 274, 1200, 350)}
${node(700, 80, "<html>")}${node(400, 220, "<head>")}${node(1000, 220, "<body>")}${node(400, 350, "<title>")}${node(800, 350, "<h1>")}${node(1000, 350, "<p>")}${node(1200, 350, "<button>", { kind: "hi" })}
<circle cx="1200" cy="377" r="70" fill="none" stroke="${C.g}" stroke-width="3" stroke-dasharray="6 8"/>
${codeCard(60, 520, 1280, 270, [
    [["const ", "k"], ["btn", "f"], [" = ", "p"], ["document", "p"], [".", "p"], ["querySelector", "f"], ["(", "p"], ["\"button\"", "s"], [");", "p"]],
    [["btn", "f"], [".", "p"], ["textContent", "f"], [" = ", "p"], ["\"Clicked!\"", "s"], [";", "p"]],
  ], { file: "app.js", lh: 52, size: 26 })}
${arrow("M1020 620 C1180 600 1240 520 1218 454")}${tag(1010, 704, "JavaScript grabs the node", { fill: C.g, color: C.ink, size: 18, h: 40 })}
${t(60, 120, "The DOM", { size: 40, weight: 600, font: TITLE })}${note(60, 156, "Your HTML as a tree of nodes")}`,

  // ── Event loop for beginners: the page never freezes
  "js-event-loop": () => `
${t(60, 115, "Main thread", { size: 34, weight: 600, font: TITLE })}${note(272, 115, "runs your code, one thing at a time", { size: 20 })}
${box(60, 150, 1280, 120, { r: 26 })}
${[["Run code", 0], ["Update page", 1], ["Handle click", 0], ["Run code", 1], ["Show data", 2]].map(([s, k], i) => `<rect x="${84 + i * 250}" y="178" width="232" height="64" rx="16" fill="${k === 2 ? C.g : k ? C.gt : "#F4F4F4"}"/>${t(200 + i * 250, 218, s, { size: 20, weight: 700, anchor: "middle" })}`).join("")}
${box(60, 360, 520, 300, { r: 28 })}${t(88, 408, "Slow tasks step aside", { size: 24, weight: 800 })}${note(88, 438, "handed to the browser (Web APIs)", { size: 17 })}
${[["setTimeout(fn, 2000)", "clock"], ["fetch(\"/api/data\")", "cloud"]].map(([s, ic], i) => `<rect x="88" y="${470 + i * 86}" width="464" height="68" rx="16" fill="#F4F4F4"/>${icon(ic, 126, 504 + i * 86, { s: 0.75, col: C.g2 })}${t(160, 512 + i * 86, s, { size: 20, font: MONO, weight: 600 })}`).join("")}
${box(820, 360, 520, 300, { r: 28, stroke: C.g, sw: 3 })}${t(848, 408, "Results wait in a queue", { size: 24, weight: 800 })}${note(848, 438, "until the main thread is free", { size: 17 })}
${["timer done → fn", "data arrived → .then()"].map((s, i) => `<rect x="848" y="${470 + i * 86}" width="464" height="68" rx="16" fill="${C.gt}"/>${t(872, 512 + i * 86, s, { size: 20, font: MONO, weight: 600 })}`).join("")}
${arrow("M584 510 H812")}${t(698, 496, "when finished", { size: 16, weight: 700, anchor: "middle", fill: C.sub })}
<circle cx="1080" cy="306" r="34" fill="${C.ink}"/><path d="M1066 294 a16 16 0 1 1 -2 18" fill="none" stroke="${C.g}" stroke-width="4" stroke-linecap="round"/><path d="M1059 288 l6 7 l8 -4" fill="none" stroke="${C.g}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${arrow("M1080 354 V340", { w: 3 })}${arrow("M1046 306 C980 306 980 290 960 276")}${t(1128, 314, "Event loop hands it back", { size: 17, weight: 700, fill: C.g2 })}
${arrow("M360 278 C340 300 320 316 320 352", { color: C.ink, head: "ahk", dash: "8 8" })}
${box(60, 708, 1280, 86, { r: 22, fill: C.gt, stroke: C.gt, shadow: false })}${tick(104, 751, 20)}${t(140, 759, "The page never freezes: slow work happens on the side, results come back when ready.", { size: 21, weight: 700 })}`,

  // ── DOM tree with node types (DOM & events post)
  "dom-tree-nodes": () => `
${link(700, 134, 700, 180)}${link(700, 234, 420, 300)}${link(700, 234, 980, 300)}${link(420, 354, 300, 420)}${link(420, 354, 540, 420)}${link(980, 354, 820, 420)}${link(980, 354, 980, 420)}${link(980, 354, 1140, 420)}
${link(300, 474, 300, 540)}${link(820, 474, 820, 540)}${link(980, 474, 980, 540)}${link(1140, 474, 1140, 540)}
${node(700, 80, "document", { kind: "doc" })}${node(700, 180, "<html>")}${node(420, 300, "<head>")}${node(980, 300, "<body>")}
${node(300, 420, "<title>")}${node(540, 420, "<meta>")}${node(820, 420, "<h1>")}${node(980, 420, "<p>")}${node(1140, 420, "<button>", { kind: "hi" })}
${node(300, 540, "\"My Page\"", { kind: "text" })}${node(820, 540, "\"Hello\"", { kind: "text" })}${node(980, 540, "\"Welcome!\"", { kind: "text", w: 150 })}${node(1140, 540, "\"Click me\"", { kind: "text", w: 150 })}
${box(60, 670, 820, 124, { r: 24, shadow: false })}
<rect x="92" y="708" width="44" height="30" rx="8" fill="${C.ink}"/>${t(148, 731, "Document", { size: 19, weight: 700 })}
<rect x="290" y="708" width="44" height="30" rx="8" fill="#fff" stroke="${C.line}" stroke-width="2"/>${t(346, 731, "Element node", { size: 19, weight: 700 })}
<rect x="530" y="708" width="44" height="30" rx="8" fill="${C.gt}" stroke="${C.g2}" stroke-width="2" stroke-dasharray="5 4"/>${t(586, 731, "Text node", { size: 19, weight: 700 })}
${note(92, 770, "Every tag and every piece of text is a node.", { size: 17 })}
${box(920, 670, 420, 124, { r: 24, fill: C.ink, stroke: C.ink, shadow: false })}${sparkle(966, 732, 0.9)}${t(1000, 724, "JavaScript can change", { size: 21, weight: 800, fill: "#fff" })}${t(1000, 754, "any node, live", { size: 21, weight: 800, fill: C.g })}`,
};

const only = process.argv[2];
render(Object.keys(FIG).filter((n) => !only || n === only).map((name) => ({ name, svg: frame(FIG[name]()), out: join(ROOT, "assets/images/blog/inline", `${name}.webp`) })), W, H);
