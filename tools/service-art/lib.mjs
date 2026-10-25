// Shared helpers for the flat, always-on animated service illustrations.
// Every SVG is 1672x941 (the 16:9 slot); slot 1 is shown square-cropped, so keep its art inside x 430–1242.

export const W = 1672, H = 941;
// site theme: --primary #00DE51, --verified #00BF43, --surface #F0F0F0, titles black-72, body black-56
export const C = { bg: "#F0F0F0", card: "#FFFFFF", line: "#E3E3E3", ink: "#1C1C1C", sub: "#6B6B6B", mute: "#CFCFCF", skel: "#F2F2F2", g: "#00DE51", g2: "#00BF43", gt: "#E3FCEC" };
export const FONT = `font-family="Inter, 'Segoe UI', Arial, sans-serif"`;
export const MONO = `font-family="Consolas, 'Courier New', monospace"`;

let css = [];
export const r2 = (n) => +n.toFixed(2);
export const raw = (s) => { css.push(s); };

// element fades/rises in at `at`% of the cycle and out at `out`%
export function appear(cls, cycle, at, out = 94, { dy = 10, scale = false } = {}) {
  const hid = scale ? "opacity:0;transform:scale(.6)" : `opacity:0;transform:translateY(${dy}px)`;
  const on = scale ? "opacity:1;transform:scale(1)" : "opacity:1;transform:translateY(0)";
  css.push(`.${cls}{animation:${cls} ${cycle}s infinite;${scale ? "transform-box:fill-box;transform-origin:center;" : ""}}
@keyframes ${cls}{0%,${r2(at)}%{${hid}}${r2(at + 3)}%,${r2(out)}%{${on}}${r2(out + 3)}%,100%{opacity:0}}`);
  return cls;
}
export function flash(cls, cycle, on, off) {
  css.push(`.${cls}{animation:${cls} ${cycle}s infinite}
@keyframes ${cls}{0%,${r2(on)}%{opacity:0}${r2(on + 2)}%,${r2(off)}%{opacity:1}${r2(off + 3)}%,100%{opacity:0}}`);
  return cls;
}
// bar that grows from its left edge between `at` and `to`
export function grow(cls, cycle, at, to, out = 94, { origin = "0 50%", axis = "X", to: end = 1 } = {}) {
  css.push(`.${cls}{transform-box:fill-box;transform-origin:${origin};animation:${cls} ${cycle}s infinite}
@keyframes ${cls}{0%,${r2(at)}%{transform:scale${axis}(0)}${r2(to)}%,${r2(out)}%{transform:scale${axis}(${end});opacity:1}${r2(out + 3)}%,100%{transform:scale${axis}(${end});opacity:0}}`);
  return cls;
}
// stroke that draws itself (path length `len`)
export function draw(cls, cycle, at, to, len, out = 94) {
  css.push(`.${cls}{stroke-dasharray:${len};animation:${cls} ${cycle}s infinite}
@keyframes ${cls}{0%,${r2(at)}%{stroke-dashoffset:${len};opacity:1}${r2(to)}%,${r2(out)}%{stroke-dashoffset:0;opacity:1}${r2(out + 3)}%,100%{stroke-dashoffset:0;opacity:0}}`);
  return cls;
}
// free-form keyframes: frames is [[pct | "a,b", "css"], ...]
export function kf(cls, cycle, frames, extra = "", timing = "") {
  css.push(`.${cls}{animation:${cls} ${cycle}s ${timing} infinite;${extra}}
@keyframes ${cls}{${frames.map(([p, v]) => `${typeof p === "number" ? `${r2(p)}%` : p.split(",").map((q) => `${r2(+q)}%`).join(",")}{${v}}`).join("")}}`);
  return cls;
}
// visible between on..off; when on is 0 it is visible at the start of the loop and fades back in at the end
export function shown(cls, cycle, on, off) {
  return on <= 0
    ? kf(cls, cycle, [["0," + off, "opacity:1"], [off + 2 + ",96", "opacity:0"], [99 + ",100", "opacity:1"]])
    : flash(cls, cycle, on, off);
}
// numbers that tick through `values`, the last one staying until `out`
export function counter(prefix, cycle, values, at, step, out, attrs) {
  return values.map((v, i) => {
    const on = at + i * step, off = i === values.length - 1 ? out : on + step - 0.6;
    return `<text class="${flash(`${prefix}${i}`, cycle, on, off)}" ${attrs}>${v}</text>`;
  }).join("");
}
// a dot travelling along `d`, moving between keyTimes `t0`..`t1` (fractions of the cycle)
export const packet = (d, cycle, t0, t1, { r = 12, fill = C.g, back = false } = {}) =>
  `<circle r="${r}" fill="${fill}" stroke="#fff" stroke-width="4"><animateMotion path="${d}" dur="${cycle}s" repeatCount="indefinite" calcMode="linear" keyTimes="0;${t0};${t1};1" keyPoints="${back ? "1;1;0;0" : "0;0;1;1"}"/></circle>`;

export function svg(label, body, still = "", defs = "") {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity=".07"/></filter>${defs}</defs>
<style>${css.join("\n")}
@media (prefers-reduced-motion:reduce){*{animation:none!important}${still}}</style>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${body}
</svg>`;
  css = [];
  return s;
}

export const check = (x, y, s = 1, col = "#fff", w = 5) => `<path d="M${x - 9 * s} ${y} l${6 * s} ${6 * s} l${12 * s} ${-12 * s}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const badge = (x, y, cls, r = 20) => `<g class="${cls}"><circle cx="${x}" cy="${y}" r="${r}" fill="${C.g}" stroke="#fff" stroke-width="5"/>${check(x, y, r / 20)}</g>`;
export const mountains = (d, x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.g}"/><path d="${d}" fill="${C.g2}" opacity=".9"/>`;
export const card = (x, y, w, h, r = 28, { fill = C.card, stroke = C.line, shadow = true, cls = "" } = {}) =>
  `${shadow ? `<g filter="url(#sh)"${cls ? ` class="${cls}"` : ""}>` : ""}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"${!shadow && cls ? ` class="${cls}"` : ""}/>${shadow ? "</g>" : ""}`;
export const bar = (x, y, w, h = 12, fill = C.mute, cls = "") => `<rect${cls ? ` class="${cls}"` : ""} x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;
export const txt = (x, y, s, { size = 26, fill = C.ink, weight = 600, anchor = "middle", cls = "", mono = false, ls = 0 } = {}) =>
  `<text${cls ? ` class="${cls}"` : ""} x="${x}" y="${y}" text-anchor="${anchor}" ${mono ? MONO : FONT} font-size="${size}" font-weight="${weight}"${ls ? ` letter-spacing="${ls}"` : ""} fill="${fill}">${String(s).replace(/&(?![a-z]+;|#\d+;)/g, "&amp;").replace(/</g, "&lt;")}</text>`;
export const sparkle = (x, y, s = 1, fill = C.g) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -16 C2 -5 5 -2 16 0 C5 2 2 5 0 16 C-2 5 -5 2 -16 0 C-5 -2 -2 -5 0 -16Z" fill="${fill}"/>`;
export const dots3 = (x, y, gap = 22, r = 7, fill = "#DCDCDC") => [0, 1, 2].map((i) => `<circle cx="${x + i * gap}" cy="${y}" r="${r}" fill="${fill}"/>`).join("");
export const FLOW = `.flow{animation:flow 1s linear infinite}@keyframes flow{to{stroke-dashoffset:-20}}`;
