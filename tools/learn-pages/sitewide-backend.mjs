// Sitewide sync for Backend Master: sitemap, learn.html (second course card + metadata + JSON-LD), llms.txt, robots, headers.
// Safe to re-run. usage: node tools/learn-pages/sitewide-backend.mjs   (run after build-backend.mjs)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAPTERS, SERIES } from "./data-backend.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = "https://shivamthakur.me";
const MODIFIED = SERIES.published;

function edit(name, fn) {
  const raw = readFileSync(join(ROOT, name), "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lf = raw.replace(/\r\n/g, "\n");
  const out = fn(lf);
  if (out !== lf) writeFileSync(join(ROOT, name), out.replace(/\n/g, nl));
  console.log(`${name}: ${out === lf ? "already up to date" : "updated"}`);
}

edit("sitemap.xml", (s) => {
  s = s.replace(/  <url>\s*<loc>https:\/\/shivamthakur\.me\/learn\/backend-master[^<]*<\/loc>[\s\S]*?<\/url>\n/g, "");
  const url = (loc, pri, freq) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${MODIFIED}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>\n`;
  const block = url(`${SITE}/learn/backend-master`, "0.9", "weekly") + CHAPTERS.map((c) => url(`${SITE}/learn/backend-master/${c.slug}`, "0.8", "monthly")).join("");
  // after the last DSA Master entry
  const all = [...s.matchAll(/  <url>\s*<loc>https:\/\/shivamthakur\.me\/learn\/dsa-master[^<]*<\/loc>[\s\S]*?<\/url>\n/g)];
  if (!all.length) throw new Error("no dsa-master sitemap entries");
  const last = all.at(-1), at = last.index + last[0].length;
  return s.slice(0, at) + block + s.slice(at);
});

edit("learn.html", (s) => {
  const TITLE = "Learn Backend & DSA — Free Courses | Shivam Thakur";
  const OGT = "Learn Backend & DSA — Free Courses";
  const DESC = "Two free courses: Backend Master (36 chapters on Node.js, databases, security and system design) and DSA Master (28 chapters of JavaScript algorithms).";
  const KW = "learn backend development, backend development course, nodejs backend tutorial, system design for beginners, dsa with javascript, data structures and algorithms javascript, free coding courses, Shivam Thakur";
  s = s.replace(/<title>[^<]*<\/title>/, `<title>${TITLE.replace(/&/g, "&amp;")}</title>`);
  s = s.replace(/(<meta name="description"\s+content=")[^"]*(")/, `$1${DESC}$2`);
  s = s.replace(/(<meta name="keywords" content=")[^"]*(")/, `$1${KW}$2`);
  s = s.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${OGT.replace(/&/g, "&amp;")}$2`);
  s = s.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${OGT.replace(/&/g, "&amp;")}$2`);
  s = s.replace(/(<meta property="og:description"\s+content=")[^"]*(")/, `$1${DESC}$2`);
  s = s.replace(/(<meta name="twitter:description"\s+content=")[^"]*(")/, `$1${DESC}$2`);
  s = s.replace('"name": "Learn — DSA with JavaScript"', '"name": "Learn — Backend Master and DSA Master"');

  // JSON-LD: regenerate the whole block (CollectionPage listing both courses + breadcrumb)
  const person = { "@type": "Person", "@id": `${SITE}/#person`, name: "Shivam Thakur", url: `${SITE}/` };
  const course = (id, name, description, hub) => ({ "@type": "Course", "@id": `${SITE}/learn/${id}#course`, name, description, url: `${SITE}/learn/${id}`,
    inLanguage: "en", isAccessibleForFree: true, provider: person, hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR", category: "Free" }, ...hub });
  const graph = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": `${SITE}/learn#learn`, name: "Learn — Backend Master and DSA Master", url: `${SITE}/learn`, description: DESC, inLanguage: "en", author: person, isPartOf: { "@id": `${SITE}/#website` },
      mainEntity: { "@type": "ItemList", itemListElement: [
        { "@type": "ListItem", position: 1, item: course("backend-master", SERIES.fullName, SERIES.summary, {}) },
        { "@type": "ListItem", position: 2, item: course("dsa-master", "DSA Master: Data Structures & Algorithms in JavaScript", "A free 28-chapter handbook covering Big-O, recursion, arrays, hashing, linked lists, trees, graphs, dynamic programming, and interview preparation, all in JavaScript.", {}) },
      ] } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE}/learn` }] },
  ] };
  const json = JSON.stringify(graph, null, 2).replace(/<\//g, "<\\/").replace(/^/gm, "    ");
  s = s.replace(/(<script type="application\/ld\+json">\n)[\s\S]*?(\n    <\/script>)/, (_, a, b) => a + json + b);

  // hero text
  s = s.replace(/Learn DSA with JavaScript\n(\s+)<\/h1>/, "Learn Backend &amp; DSA\n$1</h1>");
  s = s.replace(/One complete, free handbook that takes you from Big-O to interview-ready, written in\s+JavaScript from the first page to the last\./,
    "Two complete, free courses: build and scale real backends, then master the algorithms behind coding interviews. Everything is written in JavaScript and runs as shown.");

  // second course card, placed before the DSA card
  if (!s.includes('id="backend-master"')) {
    const start = s.indexOf('                            <section class="section-work flat-spacing" id="dsa-master"');
    if (start < 0) throw new Error("dsa card not found");
    const dsa = s.slice(start);
    const end = dsa.indexOf("</section>") + "</section>".length;
    const card = dsa.slice(0, end);
    const be = card
      .replace('id="dsa-master" aria-label="DSA Master course"', 'id="backend-master" aria-label="Backend Master course"')
      .replace(">DSA Master</h2>", ">Backend Master</h2>")
      .replace(/<p class="w-desc[\s\S]*?<\/p>/, `<p class="w-desc text-white-56 text-body-3">
                                                From &ldquo;what is a server?&rdquo; to a production system. Node.js, APIs, PostgreSQL,
                                                security, testing, scaling and system design, built around one running
                                                e-commerce project and real measured examples.
                                            </p>`)
      .replace('<p class="text-body-1 text-white-72">28</p>', '<p class="text-body-1 text-white-72">36</p>')
      .replace(/(<div class="w-tag-list[^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<div class="cs-detail-bottom">)/, (_, a, z) =>
        a + "\n" + ["Node.js", "PostgreSQL", "REST & GraphQL", "Security", "System Design"].map((t) => `                                                    <div class="tag"><span class="text-body-3 fw-medium text-white-72">${t.replace(/&/g, "&amp;")}</span></div>`).join("\n") + "\n                                                " + z)
      .replace(/href="learn\/dsa-master"/g, 'href="learn/backend-master"')
      .replace("Start the DSA Master course", "Start the Backend Master course")
      .replace(/assets\/images\/learn\/dsa-master\/dsa-master\.(webp|png)/g, "assets/images/learn/backend-master/backend-master.$1")
      .replace(/alt="[^"]*"/, 'alt="Backend Master: Node.js, databases, security and system design, a free 36-chapter course"')
      .replace('<span class="text-white-72">01</span> / 01', '<span class="text-white-72">01</span> / 02');
    s = s.slice(0, start) + be + "\n\n" + s.slice(start);
    s = s.replace('<span class="text-white-72">01</span> / 01', '<span class="text-white-72">02</span> / 02');
  }
  // footer Learn list
  if (!s.includes("learn/backend-master")) throw new Error("backend card missing");
  if (!s.includes("Backend Master (all chapters)")) s = s.replace(/(aria-label="Learn">\s*<span[^>]*>Learn<\/span>\s*<ul class="foot-list">\n)(\s*)(<li><a href="learn\/dsa-master" class="text-body-3">DSA Master \(all chapters\)<\/a><\/li>)/, (_, a, ind, li) =>
    `${a}${ind}${li}\n${ind}<li><a href="learn/backend-master" class="text-body-3">Backend Master (all chapters)</a></li>\n${ind}<li><a href="learn/backend-master/system-design-for-backend-engineers" class="text-body-3">System Design for Backend</a></li>`);
  return s;
});

edit("llms.txt", (s) => {
  const sec = `- [${SERIES.fullName}](${SITE}/learn/backend-master): ${SERIES.summary}\n${CHAPTERS.map((c) => `- [Backend Master Chapter ${c.n}: ${c.h1}](${SITE}/learn/backend-master/${c.slug}): ${c.summary}`).join("\n")}\n`;
  s = s.replace(/- \[[^\]]*\]\(https:\/\/shivamthakur\.me\/learn\/backend-master[^\n]*\n/g, "");
  // put it at the end of the "## Learn" section
  return s.replace(/(## Learn\n[\s\S]*?)(\n## |\s*$)/, (_, body, tail) => body.replace(/\n*$/, "\n") + sec + (tail.startsWith("\n## ") ? tail : ""));
});

edit("robots.txt", (s) => (s.includes("/learn/backend-master/resources/") ? s : s.replace("Disallow: /docs/\n", "Disallow: /docs/\nDisallow: /learn/backend-master/resources/\n")));
edit("_headers", (s) => (s.includes("/learn/backend-master/resources/*") ? s : s.trimEnd() + "\n\n# Backend Master lab files are downloads, not pages\n/learn/backend-master/resources/*\n  X-Robots-Tag: noindex\n  Content-Type: text/plain; charset=utf-8\n"));
edit(".htaccess", (s) => {
  if (s.includes("learn/backend-master/resources")) return s;
  return s.replace("RewriteRule ^docs/ - [E=NOINDEX:1]", "RewriteRule ^docs/ - [E=NOINDEX:1]\nRewriteRule ^learn/backend-master/resources/ - [E=NOINDEX:1]");
});

edit("README.md", (s) => (s.includes("build-backend.mjs") ? s : s.trimEnd() + "\n\n## Backend Master (learn/backend-master)\n\nThe 36 chapter pages and the hub are generated from `docs/backend-master-handbook/*.md`:\n\n```\nnode tools/learn-pages/build-backend.mjs      # pages + copies resources/ into learn/backend-master/resources\nnode tools/learn-pages/og-backend.mjs         # social cards (needs Edge/Chrome)\nnode tools/learn-pages/sitewide-backend.mjs   # sitemap, learn.html, llms.txt, robots, headers\n```\n\nSEO data per chapter lives in `tools/learn-pages/data-backend.mjs`.\n"));
