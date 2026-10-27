// Sitewide sync for DSA Master: sitemap, learn.html links, llms.txt, robots, redirects, headers.
// Safe to re-run. usage: node tools/learn-pages/sitewide.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAPTERS, SERIES } from "./data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = "https://shivamthakur.me";
const MODIFIED = "2026-10-27";
const pad = (n) => String(n).padStart(2, "0");

// read with LF, write back with the file's own line endings
function edit(name, fn) {
  const raw = readFileSync(join(ROOT, name), "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const out = fn(raw.replace(/\r\n/g, "\n"));
  if (out !== raw.replace(/\r\n/g, "\n")) writeFileSync(join(ROOT, name), out.replace(/\n/g, nl));
  console.log(out === raw.replace(/\r\n/g, "\n") ? `${name}: already up to date` : `${name}: updated`);
}

// sitemap: hub + every chapter replace the old single handbook URL
edit("sitemap.xml", (s) => {
  s = s.replace(/  <url>\s*<loc>https:\/\/shivamthakur\.me\/learn\/(js-dsa-handbook|dsa-master)[^<]*<\/loc>[\s\S]*?<\/url>\n/g, "");
  const url = (loc, pri, freq) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${MODIFIED}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>\n`;
  const block = url(`${SITE}/learn/dsa-master`, "0.9", "weekly") + CHAPTERS.map((c) => url(`${SITE}/learn/dsa-master/${c.slug}`, "0.8", "monthly")).join("");
  return s.replace(/(  <url>\s*<loc>https:\/\/shivamthakur\.me\/learn<\/loc>[\s\S]*?<\/url>\n)/, `$1${block}`);
});

// learn.html: card + chapter list point at the new URLs
edit("learn.html", (s) => {
  s = s.replace(/learn\/js-dsa-handbook\.html#chapter-(\d\d)/g, (_, n) => `learn/dsa-master/${CHAPTERS[+n - 1].slug}`);
  s = s.replace(/learn\/js-dsa-handbook\.html/g, "learn/dsa-master");
  s = s.replace(/https:\/\/shivamthakur\.me\/learn\/js-dsa-handbook/g, `${SITE}/learn/dsa-master`);
  s = s.replace('<h2 class="learn-card-title">DSA with JavaScript</h2>', '<h2 class="learn-card-title">DSA Master</h2>');
  s = s.replace('"name": "Data Structures & Algorithms with JavaScript"', `"name": ${JSON.stringify(SERIES.fullName)}`);
  return s;
});

// llms.txt: rewrite the Learn section
edit("llms.txt", (s) => {
  const sec = `## Learn\n\n- [Learn](${SITE}/learn): free learning hub.\n- [${SERIES.fullName}](${SITE}/learn/dsa-master): ${SERIES.summary}\n${CHAPTERS.map((c) => `- [Chapter ${c.n}: ${c.h1}](${SITE}/learn/dsa-master/${c.slug}): ${c.summary}`).join("\n")}\n`;
  return s.replace(/## Learn\n[\s\S]*?(?=\n## )/, sec);
});

// robots: keep the raw markdown sources out of search results
edit("robots.txt", (s) => (s.includes("Disallow: /docs/") ? s : s.replace("User-agent: *\nAllow: /\n", "User-agent: *\nAllow: /\nDisallow: /docs/\n")));

// Netlify
edit("_redirects", (s) => {
  const rules = ["/learn/js-dsa-handbook    /learn/dsa-master    301!", "/learn/js-dsa-handbook.html    /learn/dsa-master    301!"];
  return rules.every((r) => s.includes(r)) ? s : s.trimEnd() + `\n\n# DSA handbook moved to the DSA Master series (a #chapter-NN fragment is forwarded by script on the hub)\n${rules.join("\n")}\n`;
});
edit("_headers", (s) => (s.includes("/docs/*") ? s : s.trimEnd() + "\n\n# Raw markdown sources are not pages\n/docs/*\n  X-Robots-Tag: noindex\n"));

// Apache
edit(".htaccess", (s) => {
  if (!s.includes("js-dsa-handbook")) {
    s = s.replace("# Internally rewrite extensionless URL to the real .html file.",
      "# ---- DSA handbook moved to the DSA Master series ----\nRewriteRule ^learn/js-dsa-handbook(\\.html)?/?$ /learn/dsa-master [R=301,L,NC]\n\n# Internally rewrite extensionless URL to the real .html file.");
  }
  if (!s.includes("NOINDEX")) {
    s = s.replace("# ---- Renamed case studies", "# Raw markdown sources are not pages\nRewriteRule ^docs/ - [E=NOINDEX:1]\n\n# ---- Renamed case studies")
      .replace('  Header always set X-Content-Type-Options "nosniff"', '  Header always set X-Content-Type-Options "nosniff"\n  Header set X-Robots-Tag "noindex" env=NOINDEX');
  }
  return s;
});

edit("README.md", (s) => (s.includes("tools/learn-pages") ? s : s.trimEnd() + "\n\n## DSA Master (learn/dsa-master)\n\nThe 28 chapter pages and the hub are generated from `docs/js-dsa-handbook/*.md`:\n\n```\nnode tools/learn-pages/build.mjs      # pages\nnode tools/learn-pages/og.mjs         # social cards (needs Edge/Chrome)\nnode tools/learn-pages/sitewide.mjs   # sitemap, llms.txt, robots, redirects\n```\n\nSEO data per chapter (title, description, FAQ) lives in `tools/learn-pages/data.mjs`.\n"));
