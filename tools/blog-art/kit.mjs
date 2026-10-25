// Shared drawing + render toolkit for the static blog images (thumbnails and in-article figures).
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { C } from "../service-art/lib.mjs";

export { C };
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TMP = join(tmpdir(), "blog-art");
const CAPTURE = join(ROOT, ".claude/skills/anatomy/scripts/capture.mjs");

export const TITLE = `font-family="'Apfel Grotezk', Inter, sans-serif"`, SANS = `font-family="Inter, 'Segoe UI', sans-serif"`, MONO = `font-family="Consolas, 'Courier New', monospace"`;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const t = (x, y, s, { size = 24, fill = C.ink, weight = 500, anchor = "start", font = SANS, extra = "" } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" ${font} font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(s)}</text>`;
export const box = (x, y, w, h, { r = 24, fill = "#fff", stroke = C.line, sw = 2, shadow = true, dash = "" } = {}) =>
  `${shadow ? `<g filter="url(#sh)">` : ""}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>${shadow ? "</g>" : ""}`;
export const pill = (x, y, s, { fill = C.gt, color = C.g2, size = 20, h = 40, pad = 18, weight = 700, font = SANS } = {}) => {
  const w = Math.round(s.length * size * (font === MONO ? 0.56 : 0.6) + pad * 2);
  return { w, svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>${t(x + w / 2, y + h / 2 + size * 0.36, s, { size, fill: color, weight, anchor: "middle", font })}` };
};

// code in a monospace block; each line is a list of [text, kind] tokens, indentation kept with xml:space
export const DARK = { k: "#00DE51", f: "#FFFFFF", s: "#9EDDB6", n: "#FDBA74", c: "#7A7A7A", p: "#D4D4D4", o: "#9A9A9A" };
export const LIGHT = { k: "#00A13B", f: C.ink, s: "#0F7B4F", n: "#B45309", c: "#8A8A8A", p: "#3A3A3A", o: "#6B6B6B" };
export const code = (x, y, lines, { size = 22, lh = 34, theme = DARK } = {}) => lines.map((toks, i) =>
  `<text x="${x}" y="${y + i * lh}" ${MONO} font-size="${size}" xml:space="preserve">${toks.map(([s, k]) => `<tspan fill="${theme[k]}"${k === "f" ? ' font-weight="700"' : ""}>${esc(s)}</tspan>`).join("")}</text>`).join("");
export const codeCard = (x, y, w, h, lines, { file = "", size = 22, lh = 34 } = {}) => `${box(x, y, w, h, { fill: "#1E1E1E", stroke: "#1E1E1E" })}
${[0, 1, 2].map((i) => `<circle cx="${x + 26 + i * 20}" cy="${y + 26}" r="6" fill="#3A3A3A"/>`).join("")}${file ? t(x + 96, y + 32, file, { size: 18, fill: "#8A8A8A", font: MONO, weight: 400 }) : ""}
<path d="M${x} ${y + 50} H${x + w}" stroke="#2C2C2C" stroke-width="2"/>
${code(x + 28, y + 50 + lh, lines, { size, lh })}`;
export const arrow = (d, { color = C.g2, dash = "", w = 4, head = "ah" } = {}) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ""} marker-end="url(#${head})"/>`;

export const DEFS = `<defs>
<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000" flood-opacity=".07"/></filter>
<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#DCDCDC"/></pattern>
<marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.g2}"/></marker>
<marker id="ahk" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.ink}"/></marker>
<marker id="ahr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#E5484D"/></marker>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.g}" stop-opacity=".22"/><stop offset="1" stop-color="${C.g}" stop-opacity="0"/></radialGradient>
</defs>`;

const font = (file) => pathToFileURL(join(ROOT, "assets/fonts", file)).href;
const FONTS = `<style>
@font-face{font-family:"Apfel Grotezk";src:url("${font("ApfelGrotezk-Regular.otf")}");font-weight:400 700}
@font-face{font-family:Inter;src:url("${font("inter/Inter-Medium.woff2")}");font-weight:500}
@font-face{font-family:Inter;src:url("${font("inter/Inter-SemiBold.woff2")}");font-weight:600}
@font-face{font-family:Inter;src:url("${font("inter/Inter-Bold.woff2")}");font-weight:700}
@font-face{font-family:Inter;src:url("${font("inter/Inter-ExtraBold.woff2")}");font-weight:800}
html,body{margin:0;background:${C.bg}}svg{display:block}
</style>`;

// items: [{ name, svg, out }] → screenshot each SVG with the site fonts and save it as WebP at `out`
export function render(items, W, H) {
  mkdirSync(TMP, { recursive: true });
  const pairs = [];
  for (const { name, svg, out } of items) {
    const html = join(TMP, `${name}.html`), png = join(TMP, `${name}.png`);
    writeFileSync(join(TMP, `${name}.svg`), svg);
    writeFileSync(html, `<!doctype html><meta charset="utf-8">${FONTS}${svg}`);
    execFileSync(process.execPath, ["--experimental-websocket", CAPTURE, html, "--out", png, "--width", String(W), "--height", String(H), "--scale", "1", "--wait", "900", "--select", "svg"], { stdio: "pipe" });
    mkdirSync(dirname(out), { recursive: true });
    pairs.push([png, out]);
    console.log("rendered", name);
  }
  execFileSync("python", ["-c", `import sys,json
from PIL import Image
for src, dst in json.loads(sys.argv[1]):
    Image.open(src).convert("RGB").crop((0, 0, ${W}, ${H})).save(dst, "WEBP", quality=90, method=6)
    print("wrote", dst)`, JSON.stringify(pairs)], { stdio: "inherit" });
}
