// Renders a 1200x630 social card per chapter (plus the hub) with headless Edge/Chrome.
// usage: node tools/learn-pages/og.mjs
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { CHAPTERS, SERIES } from "./data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const OUT = join(ROOT, "assets/images/learn/dsa-master");
const TMP = join(process.env.TEMP || HERE, "dsa-og");
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const browser = BROWSERS.find(existsSync);
if (!browser) throw new Error("no Edge/Chrome found");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const card = ({ kicker, title, sub }) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:"Segoe UI",Inter,Arial,sans-serif;color:#fff;
background:radial-gradient(60% 90% at 100% 0%,rgba(0,222,81,.32),rgba(0,222,81,0) 70%),#0f0f0f;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.k{font-size:28px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#00DE51}
h1{font-size:${title.length > 52 ? 62 : 74}px;line-height:1.08;letter-spacing:-.03em;max-width:1010px;margin-top:22px}
.s{font-size:30px;color:#bdbdbd;margin-top:22px;max-width:960px;line-height:1.35}
.f{display:flex;justify-content:space-between;align-items:center;font-size:28px;color:#d6d6d6}
.f b{color:#fff}.pill{border:2px solid #00DE51;border-radius:999px;padding:6px 20px;color:#00DE51;font-size:24px}
</style><div><div class="k">${esc(kicker)}</div><h1>${esc(title)}</h1><div class="s">${esc(sub)}</div></div>
<div class="f"><span><b>Shivam Thakur</b> &middot; shivamthakur.me/learn/dsa-master</span><span class="pill">Free &middot; JavaScript</span></div>`;

const jobs = [
  { file: "dsa-master", kicker: "Free course · 28 chapters", title: SERIES.h1, sub: "From Big-O and recursion to graphs, dynamic programming and interview prep." },
  ...CHAPTERS.map((c) => ({ file: c.slug, kicker: `DSA Master · Chapter ${c.n} of ${CHAPTERS.length}`, title: c.h1, sub: c.level + " · " + c.teaches.slice(0, 3).join(" · ") })),
];

let ok = 0;
for (const j of jobs) {
  const html = join(TMP, `${j.file}.html`), png = join(OUT, `${j.file}.png`);
  writeFileSync(html, card(j));
  const r = spawnSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1200,630", `--screenshot=${png}`, pathToFileURL(html).href], { timeout: 60000, stdio: "pipe" });
  if (r.status === 0 && existsSync(png)) ok++; else console.warn("FAILED", j.file, String(r.stderr).slice(0, 200));
}
rmSync(TMP, { recursive: true, force: true });
console.log(`rendered ${ok}/${jobs.length} cards to assets/images/learn/dsa-master`);

// lighter webp copies for the on-page hero image (optional: needs python + Pillow)
const py = spawnSync("python", [join(HERE, "webp.py")], { encoding: "utf8" });
console.log(py.status === 0 ? py.stdout.trim() : "webp step skipped (python/Pillow not available); pages fall back to the png");
