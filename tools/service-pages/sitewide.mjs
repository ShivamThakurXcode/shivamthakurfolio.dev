// Sitewide sync for the service lineup: renamed-slug links, footer Services column, sitemap, llms.txt, redirects.
// Safe to re-run. usage: node tools/service-pages/sitewide.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICES } from "./data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MODIFIED = "2026-10-26";
const RENAMED = { "custom-software-development": "ai-integration", "api-backend-development": "api-integrations" };
const SKIP = new Set(["node_modules", ".git", ".claude", "tools", "docs"]);
const footName = (s) => (s.slug === "ai-integration" ? "AI Integration" : s.name.replace(/ \(.*\)/, "")).replace(/&/g, "&amp;");

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!SKIP.has(f)) walk(p); } else if (p.endsWith(".html")) files.push(p);
  }
})(ROOT);

const rename = (t) => Object.entries(RENAMED).reduce((acc, [o, n]) => acc.replace(new RegExp(`services/${o}(?![a-z-])`, "g"), `services/${n}`), t);

let n = 0;
for (const f of files) {
  const raw = readFileSync(f, "utf8"), nl = raw.includes("\r\n") ? "\r\n" : "\n";
  let s = rename(raw.replace(/\r\n/g, "\n"));
  // footer Services column: keep each page's own link prefix (services/…, ../services/… or /services/…)
  s = s.replace(/(<nav class="foot-col" aria-label="Services">[\s\S]*?<ul class="foot-list">)([\s\S]*?)(\n\s*<\/ul>)/, (m, a, list, c) => {
    const pre = (list.match(/href="([^"]*?)services\//) || [, ""])[1];
    const pad = (list.match(/\n(\s*)<li>/) || [, "                            "])[1];
    return `${a}\n${SERVICES.map((x) => `${pad}<li><a href="${pre}services/${x.slug}" class="text-body-3">${footName(x)}</a></li>`).join("\n")}\n${pad}<li><a href="${pre}services" class="text-body-3">View all services</a></li>${c}`;
  });
  const out = s.replace(/\n/g, nl);
  if (out !== raw) { writeFileSync(f, out); n++; }
}
console.log("html files updated:", n, "of", files.length);

// sitemap: renamed URLs + fresh lastmod on every service page
let sm = rename(readFileSync(join(ROOT, "sitemap.xml"), "utf8"));
sm = sm.replace(/(<loc>https:\/\/shivamthakur\.me\/services\/[a-z-]+<\/loc>\s*<lastmod>)[^<]+/g, `$1${MODIFIED}`);
writeFileSync(join(ROOT, "sitemap.xml"), sm);

// llms.txt: the Services section, rewritten from the data
const llmsRaw = readFileSync(join(ROOT, "llms.txt"), "utf8");
const llmsNl = llmsRaw.includes("\r\n") ? "\r\n" : "\n";
const llms = llmsRaw.replace(/\r\n/g, "\n");
const svc = `## Services\n\n- [Services overview](https://shivamthakur.me/services): the 8 services Shivam offers, each with scope, process, timelines and FAQ.\n${SERVICES.map((s) => `- [${s.name}](https://shivamthakur.me/services/${s.slug}): ${s.desc}`).join("\n")}\n`;
writeFileSync(join(ROOT, "llms.txt"), llms.replace(/## Services\n[\s\S]*?(?=\n## )/, svc).replace(/\n/g, llmsNl));

// README tree
writeFileSync(join(ROOT, "README.md"), Object.entries(RENAMED).reduce((t, [o, nw]) => t.replaceAll(`${o}.html`, `${nw}.html`), rename(readFileSync(join(ROOT, "README.md"), "utf8"))));

// redirects: point old targets at the new slugs, then add old → new rules once
let nf = rename(readFileSync(join(ROOT, "_redirects"), "utf8"));
const nfRules = Object.entries(RENAMED).map(([o, nw]) => `/services/${o}    /services/${nw}    301!`);
if (!nf.includes(nfRules[0])) nf = nf.trimEnd() + `\n\n# Renamed service pages\n${nfRules.join("\n")}\n`;
writeFileSync(join(ROOT, "_redirects"), nf);

let ht = readFileSync(join(ROOT, ".htaccess"), "utf8");
ht = ht.replace(/(\/services\/)(custom-software-development|api-backend-development)( \[R=301)/g, (m, a, o, c) => a + RENAMED[o] + c);
const htRules = Object.entries(RENAMED).map(([o, nw]) => `RewriteRule ^services/${o}(\\.html)?/?$ /services/${nw} [R=301,L,NC]`);
if (!ht.includes(htRules[0])) ht = ht.replace("# Internally rewrite extensionless URL to the real .html file.", `# ---- Renamed service pages ----\n${htRules.join("\n")}\n\n# Internally rewrite extensionless URL to the real .html file.`);
writeFileSync(join(ROOT, ".htaccess"), ht);
console.log("sitemap, llms.txt, README, _redirects, .htaccess updated");
