// Builds the Backend Master series: learn/backend-master.html (hub) + learn/backend-master/<slug>.html (36 chapters)
// from docs/backend-master-handbook/*.md, data-backend.mjs and the frozen site shell (same look as DSA Master).
// usage: node tools/learn-pages/build-backend.mjs   (then: node tools/learn-pages/sitewide-backend.mjs)
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SERIES, STAGES, CHAPTERS, BY_N } from "./data-backend.mjs";

const require = createRequire(import.meta.url);
const { Marked } = require("../../assets/js/vendor/marked.min.js");
const hljs = require("../../assets/js/vendor/highlight.min.js");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const SITE = "https://shivamthakur.me";
const PERSON = `${SITE}/#person`, WEBSITE = `${SITE}/#website`;
const HUB = `${SITE}/learn/backend-master`;
const BASE = "/learn/backend-master";
const MODIFIED = SERIES.published;
const TOTAL = CHAPTERS.length;
const QUIZ_CHAPTERS = 35;
const SHORT = "Backend Master";
const warn = (m) => { warnings++; console.warn("WARN:", m); };
let warnings = 0;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s) => String(s).replace(/<[^>]+>/g, "").replace(/`/g, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pad = (n) => String(n).padStart(2, "0");
const urlOf = (c) => `${HUB}/${c.slug}`;
const pathOf = (c) => `${BASE}/${c.slug}`;
const niceDate = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const ld = (o) => JSON.stringify(o, null, 2).replace(/<\//g, "<\\/").replace(/^/gm, "    ");

// ── shell pieces (frozen copy of the old reader page; its asset links are one level deep)
const shell = readFileSync(join(HERE, "shell.html"), "utf8").replace(/\r\n/g, "\n");
const cut = (from, to) => {
  const a = shell.indexOf(from), b = shell.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`shell marker missing: ${from} / ${to}`);
  return shell.slice(a, b);
};
const ASSETS = cut("    <!-- font -->", '\n\n    <script type="application/ld+json">');
const BODY_TOP = cut('<body class="counter-scroll inner-page learn-reader-page">', '        <div class="main-content" id="main-content">');
// footer "Learn" column lists both courses
const LEARN_LIST = `<ul class="foot-list">
                            <li><a href="../learn/dsa-master" class="text-body-3">DSA Master (all chapters)</a></li>
                            <li><a href="../learn/backend-master" class="text-body-3">Backend Master (all chapters)</a></li>
                            <li><a href="../learn/backend-master/how-the-internet-works-dns-tcp-tls" class="text-body-3">How the Internet Works</a></li>
                            <li><a href="../learn/backend-master/postgresql-indexes-explain-analyze-query-performance" class="text-body-3">PostgreSQL Indexes</a></li>
                            <li><a href="../learn/backend-master/authentication-passwords-sessions-jwt-oauth-mfa" class="text-body-3">Authentication in Node.js</a></li>
                            <li><a href="../learn/backend-master/system-design-for-backend-engineers" class="text-body-3">System Design for Backend</a></li>
                            <li><a href="../learn/dsa-master/big-o-notation-time-complexity" class="text-body-3">Big-O &amp; Time Complexity</a></li>
                            <li><a href="../learn/dsa-master/dynamic-programming-1d" class="text-body-3">Dynamic Programming</a></li>
                        </ul>`;
const TAIL = cut("        <!-- Footer -->", '    <script src="../assets/js/vendor/marked.min.js">')
  .replace(/(aria-label="Learn">\s*<span[^>]*>Learn<\/span>\s*)<ul class="foot-list">[\s\S]*?<\/ul>/, (_, a) => a + LEARN_LIST);
if (!TAIL.includes("Backend Master (all chapters)")) throw new Error("footer Learn list not replaced");
// chapter pages sit one folder deeper than the shell was written for
const deeper = (s) => s.replace(/(href|src|data-light|data-dark)="\.\.\//g, '$1="../../');

// ── images
const OG_DIR = join(ROOT, "assets/images/learn/backend-master");
const ogFor = (c) => {
  const f = c ? `${c.slug}.png` : "backend-master.png";
  return existsSync(join(OG_DIR, f)) ? `${SITE}/assets/images/learn/backend-master/${f}` : `${SITE}/assets/images/section/work-1.webp`;
};

// ── markdown → HTML
function splitSections(md) {
  const secs = [{ title: null, lines: [] }];
  let fence = false;
  for (const l of md.split("\n")) {
    if (/^```/.test(l)) fence = !fence;
    if (!fence && /^## /.test(l)) secs.push({ title: l.slice(3).trim(), lines: [l] });
    else secs.at(-1).lines.push(l);
  }
  return secs;
}

// "Chapter 8" in running prose → link to that chapter (first two mentions per target; never in code, headings or links)
function linkChapters(html, selfN, seen) {
  const SKIP = /^<(\/?)(pre|code|a|h[1-6]|button|summary)\b/i;
  let depth = 0;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) {
      const m = SKIP.exec(part);
      if (m && !part.endsWith("/>")) depth += m[1] ? -1 : 1;
      return part;
    }
    if (depth > 0) return part;
    return part.replace(/\b(Chapters?) (\d{1,2})\b/g, (all, word, num) => {
      const n = +num, t = BY_N[n];
      if (!t || n === selfN || (seen[n] = (seen[n] || 0) + 1) > 2) return all;
      const a = `<a href="${pathOf(t)}" title="${esc(t.title)}">`;
      return word === "Chapter" ? `${a}Chapter ${n}</a>` : `${word} ${a}${n}</a>`;
    });
  }).join("");
}

const LANG_LABEL = { javascript: "JavaScript", js: "JavaScript", typescript: "TypeScript", json: "JSON", bash: "Shell", sh: "Shell", shell: "Shell", html: "HTML", css: "CSS", python: "Python", sql: "SQL", yaml: "YAML", graphql: "GraphQL", lua: "Lua", ini: "INI", powershell: "PowerShell" };
const EMOJI = /[\p{Extended_Pictographic}️‍]/gu;
const svg = (inner) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">${inner}</svg>`;
const ICON = {
  memory: svg('<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'),
  pattern: svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  interview: svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  warn: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  pro: svg('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'),
  revise: svg('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  idea: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
};
// the book's recurring boxed sections: an emoji-prefixed H3 plus everything up to the next heading becomes a callout card
const CALLOUTS = [
  [/^\u{1F9E0}/u, "memory"], [/^\u{1F3AF}/u, "pattern"], [/^\u{1F525}/u, "interview"],
  [/^[⚠✅\u{1F41B}]/u, "warn"], [/^\u{1F680}/u, "pro"], [/^\u{1F4CC}/u, "revise"],
  [/^[\u{1F4A1}\u{1F50D}]/u, "idea"],
];
function wrapCallouts(html) {
  const chunks = html.split(/\n(?=<(?:h[1-6]|p|ul|ol|pre|blockquote|hr|div|table)[\s>])/);
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    const kind = /^<h3 id="[^"]*" class="callout-title" data-callout="([a-z]+)">/.exec(chunks[i])?.[1];
    if (!kind) { out.push(chunks[i]); continue; }
    const body = [chunks[i]];
    while (i + 1 < chunks.length && !/^<(?:h[1-4]|hr)[\s>]/.test(chunks[i + 1])) body.push(chunks[++i]);
    out.push(`<aside class="callout callout-${kind}">\n${body.join("\n")}\n</aside>`);
  }
  return out.join("\n");
}

// "**Q1.** text" + one line "A) .. B) .. C) .. D) .." per question, then "### Answer Key" table "| 1 | B | why |"
function parseQuiz(lines) {
  const qs = [], why = {}, ans = {};
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m;
    if ((m = /^\*\*Q(\d+)\.\*\*\s*(.*)$/.exec(l))) {
      const q = { n: +m[1], q: m[2], opts: {} };
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && !/^\*\*Q\d+\./.test(lines[j]) && !/^###/.test(lines[j])) {
        const opt = lines[j].trim();
        if (/^A\) /.test(opt)) {
          const parts = opt.split(/\s{2,}(?=[B-D]\) )/);
          for (const p of parts) { const mm = /^([A-D])\)\s+([\s\S]*)$/.exec(p); if (mm) q.opts[mm[1].toLowerCase()] = mm[2].trim(); }
        } else q.q += " " + opt;
        j++;
      }
      qs.push(q); i = j - 1;
    } else if ((m = /^\|\s*(\d+)\s*\|\s*([A-D])\s*\|\s*(.*?)\s*\|\s*$/.exec(l))) {
      ans[+m[1]] = m[2].toLowerCase(); why[+m[1]] = m[3];
    }
  }
  for (const q of qs) { q.ans = ans[q.n]; q.why = why[q.n] || ""; }
  return qs;
}

function quizHtml(qs, inline) {
  const items = qs.map((q) => `<li class="quiz-q" data-answer="${q.ans}" data-why="${esc(plain(q.why))}"><p class="quiz-text">${inline(q.q)}</p><ul class="quiz-opts">${
    Object.entries(q.opts).map(([k, t]) => `<li><button type="button" class="quiz-opt" data-k="${k}"><span class="k">${k}</span><span class="t">${inline(t)}</span></button></li>`).join("")
  }</ul><p class="quiz-note" hidden></p></li>`).join("\n");
  const key = qs.map((q) => `${q.n}-${q.ans}`).join(", ");
  return `<div class="quiz" data-quiz>
<p class="quiz-intro">Tap an answer to check it. Your score updates as you go.</p>
<p class="quiz-score" aria-live="polite">Score: 0 / 0 answered (${qs.length} questions)</p>
<ol class="quiz-list">
${items}
</ol>
<details class="quiz-key"><summary>Show the answer key</summary><p>${key}</p></details>
</div>`;
}

// resources/... links point at the lab files shipped beside the chapters
const RES_DIR = join(ROOT, "learn/backend-master/resources");
function fixHref(href) {
  const m = /^(?:\.\/)?resources\/(.*)$/.exec(href);
  if (!m) return href;
  let rest = m[1];
  if (rest === "" || rest.endsWith("/")) rest += "README.txt";
  if (!existsSync(join(ROOT, "docs/backend-master-handbook/resources", rest))) warn(`missing resource: ${href} -> ${rest}`);
  return `${BASE}/resources/${rest}`;
}

function renderChapter(c) {
  let md = readFileSync(join(ROOT, "docs/backend-master-handbook", c.file), "utf8").replace(/\r\n/g, "\n");
  const at = md.search(/^# Chapter /m);
  if (at < 0) throw new Error(`no chapter heading in ${c.file}`);
  md = md.slice(at);
  const h1m = /^# Chapter \d+:?\s*(.*)$/m.exec(md);
  const bookTitle = plain(h1m ? h1m[1] : c.title);
  md = md.replace(/^# .*\n/, "")
    .split("\n").filter((l) => !/^\*?\*?Say "Continue/.test(l) && !/^\*End of /.test(l)).join("\n")
    .replace(/(\n\s*---\s*)+\s*$/, "\n");

  const used = {}, heads = [], seen = {};
  const m = new Marked({ gfm: true });
  m.use({
    renderer: {
      heading(text, level, raw) {
        const base = slugify(raw) || "section";
        used[base] = (used[base] || 0) + 1;
        const id = used[base] > 1 ? `${base}-${used[base]}` : base;
        const clean = text.replace(EMOJI, "").replace(/\s{2,}/g, " ").trim();
        if (level === 2) heads.push({ id, text: plain(raw).replace(EMOJI, "").replace(/\s{2,}/g, " ").trim() });
        const kind = level === 3 && CALLOUTS.find(([re]) => re.test(raw.trim()))?.[1];
        if (kind) return `<h3 id="${id}" class="callout-title" data-callout="${kind}"><span class="callout-ic" aria-hidden="true">${ICON[kind]}</span><span>${clean}</span></h3>\n`;
        return `<h${level} id="${id}">${clean}</h${level}>\n`;
      },
      code(code, info) {
        const lang = (info || "").split(/\s+/)[0];
        if (lang && hljs.getLanguage(lang)) {
          return `<div class="code-block"><div class="code-head"><span class="code-lang">${LANG_LABEL[lang] || lang}</span><button type="button" class="code-copy" aria-label="Copy code">Copy</button></div><pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang }).value}</code></pre></div>\n`;
        }
        return `<pre class="is-plain"><code>${esc(code)}</code></pre>\n`;
      },
      table(header, body) { return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`; },
      link(href, title, text) {
        const ext = /^https?:/.test(href);
        return `<a href="${esc(fixHref(href))}"${title ? ` title="${esc(title)}"` : ""}${ext ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      },
    },
  });

  let quiz = null;
  const out = splitSections(md).map((s) => {
    const body = s.lines.join("\n");
    if (s.title && /Multiple Choice/.test(s.title)) {
      const qs = parseQuiz(s.lines.slice(1));
      const bad = qs.filter((q) => !q.ans || Object.keys(q.opts).length !== 4 || !q.q);
      if (bad.length || qs.length !== 20) warn(`${c.file}: quiz parsed ${qs.length} questions, ${bad.length} malformed`);
      quiz = qs;
      return m.parse(s.lines[0]) + quizHtml(qs, (t) => m.parseInline(t));
    }
    return wrapCallouts(linkChapters(m.parse(body), c.n, seen));
  }).join("\n");

  const words = out.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return { html: out, heads, quiz, bookTitle, words, mins: Math.max(1, Math.round(words / 220)) };
}

// ── page pieces
function head({ title, desc, url, canonical = url, og, ogAlt, keywords, graph, extra = "" }) {
  const shortTitle = title.replace(new RegExp(` \\| ${SHORT}$`), "");
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

    <!-- Primary SEO -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta name="author" content="Shivam Thakur">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="en" href="${canonical}">
    <link rel="alternate" hreflang="x-default" href="${canonical}">
    <meta name="theme-color" content="#EBEBEB" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0F0F0F" media="(prefers-color-scheme: dark)">
    <meta name="keywords" content="${esc(keywords)}, Shivam Thakur">
${extra}
    <!-- Geo -->
    <meta name="geo.region" content="IN-UP">
    <meta name="geo.placename" content="Agra, Uttar Pradesh, India">
    <meta name="geo.position" content="27.1767;78.0081">
    <meta name="ICBM" content="27.1767, 78.0081">

    <!-- Open Graph -->
    <meta property="og:type" content="${extra.includes("article:") ? "article" : "website"}">
    <meta property="og:site_name" content="Shivam Thakur — Full Stack Developer">
    <meta property="og:locale" content="en_IN">
    <meta property="og:title" content="${esc(shortTitle)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${og}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${esc(ogAlt)}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(shortTitle)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${og}">
    <meta name="twitter:image:alt" content="${esc(ogAlt)}">

${url === HUB ? ASSETS : deeper(ASSETS)}
    <link rel="stylesheet" href="${url === HUB ? "../" : "../../"}assets/css/hljs-github-dark.min.css">

    <script type="application/ld+json">
${ld(graph)}
    </script>
</head>

`;
}

const authorRef = { "@type": "Person", "@id": PERSON, name: "Shivam Thakur", url: `${SITE}/` };
const crumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
});
const faqNode = (url, faq) => ({
  "@type": "FAQPage", "@id": `${url}#faq`,
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});
const faqHtml = (faq, heading) => `<section class="learn-faq" aria-labelledby="faq-title">
<h2 id="faq-title">${esc(heading)}</h2>
${faq.map(([q, a]) => `<details class="learn-faq-item"><summary><h3>${esc(q)}</h3></summary><p>${esc(a)}</p></details>`).join("\n")}
</section>`;

function sidebar(active) {
  const items = CHAPTERS.map((c) => {
    const on = c.n === active;
    return `<div class="learn-item${on ? " active" : ""}" data-text="${esc((c.n + " " + c.title).toLowerCase())}"><a class="learn-link" href="${pathOf(c)}"${on ? ' aria-current="page"' : ""}><span class="num">${pad(c.n)}</span><span class="name">${esc(c.title)}</span></a></div>`;
  }).join("\n");
  return `<button type="button" class="learn-toggle" id="learnToggle" aria-expanded="false" aria-controls="learnSide">
                    <i class="icon icon-edu"></i> Chapters
                </button>

                <aside class="learn-side" id="learnSide" aria-label="${SHORT} chapters">
                    <div class="learn-side-head">
                        <p class="learn-side-title"><a href="${BASE}">${SHORT}</a></p>
                        <p class="learn-side-sub text-caption">${TOTAL} chapters &middot; free course</p>
                        <div class="learn-progress" aria-hidden="true"><span style="width:${(active / TOTAL * 100).toFixed(1)}%"></span></div>
                        <input type="search" id="learnFilter" class="learn-filter" placeholder="Filter chapters" aria-label="Filter chapters" autocomplete="off">
                    </div>
                    <nav class="learn-nav" id="learnNav" aria-label="Chapters">
${items}
                    </nav>
                </aside>`;
}

const CHAPTER_JS = (slug) => `
    <script>
    (function () {
      var side = document.getElementById('learnSide'), toggle = document.getElementById('learnToggle'), filter = document.getElementById('learnFilter'), nav = document.getElementById('learnNav');
      try { localStorage.setItem('backendMasterLast', ${JSON.stringify(slug)}); } catch (e) {}
      toggle.addEventListener('click', function () { toggle.setAttribute('aria-expanded', side.classList.toggle('open')); });
      filter.addEventListener('input', function () {
        var q = filter.value.trim().toLowerCase();
        nav.querySelectorAll('.learn-item').forEach(function (el) { el.hidden = !!q && el.dataset.text.indexOf(q) === -1; });
      });
      var act = nav.querySelector('.learn-item.active');
      if (act) nav.scrollTop = Math.max(act.offsetTop - nav.offsetTop - 12, 0);

      var toc = document.getElementById('learnToc'), mq = window.matchMedia('(min-width: 1200px)');
      function syncToc() { toc.open = mq.matches; }
      syncToc();
      if (mq.addEventListener) mq.addEventListener('change', syncToc);
      var subs = {};
      toc.querySelectorAll('a').forEach(function (a) { subs[a.getAttribute('href').slice(1)] = a; });
      if ('IntersectionObserver' in window) {
        var cur = null;
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting || !subs[e.target.id]) return;
            if (cur) cur.classList.remove('is-current');
            cur = subs[e.target.id]; cur.classList.add('is-current');
          });
        }, { rootMargin: '-72px 0px -70% 0px' });
        document.querySelectorAll('.learn-article h2[id]').forEach(function (h) { io.observe(h); });
      }

      document.addEventListener('click', function (e) {
        var b = e.target.closest('.code-copy');
        if (!b) return;
        var code = b.closest('.code-block').querySelector('code');
        var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(code.innerText).then(done, function () {});
      });

      var quiz = document.querySelector('[data-quiz]');
      if (quiz) {
        var score = 0, done = 0, total = quiz.querySelectorAll('.quiz-q').length, out = quiz.querySelector('.quiz-score');
        quiz.addEventListener('click', function (e) {
          var b = e.target.closest('.quiz-opt');
          if (!b) return;
          var q = b.closest('.quiz-q');
          if (q.classList.contains('answered')) return;
          q.classList.add('answered');
          var ans = q.dataset.answer, ok = b.dataset.k === ans, note = q.querySelector('.quiz-note'), why = q.dataset.why ? ' ' + q.dataset.why : '';
          if (ok) { score++; b.classList.add('is-correct'); } else { b.classList.add('is-wrong'); q.querySelector('[data-k="' + ans + '"]').classList.add('is-correct'); }
          done++;
          note.hidden = false;
          note.textContent = (ok ? 'Correct.' : 'Not quite. The correct answer is ' + ans.toUpperCase() + '.') + why;
          out.textContent = 'Score: ' + score + ' / ' + done + ' answered (' + total + ' questions)';
        });
      }
    })();
    </script>
</body>
</html>
`;

function chapterPage(c) {
  const r = renderChapter(c);
  const url = urlOf(c), idx = c.n - 1, prev = CHAPTERS[idx - 1], next = CHAPTERS[idx + 1];
  const og = ogFor(c);
  const title = `${c.title} | ${SHORT}`.length <= 60 ? `${c.title} | ${SHORT}` : c.title;
  if (title.length > 60) warn(`title ${title.length} chars: ${c.slug}`);
  if (c.desc.length < 110 || c.desc.length > 160) warn(`desc ${c.desc.length} chars: ${c.slug}`);
  if (c.teaches.length !== 5 || c.faq.length !== 4) warn(`teaches/faq counts: ${c.slug}`);
  const tags = c.keywords.split(",").map((s) => s.trim());
  const iso = `PT${r.mins}M`;
  const bc = [["Home", `${SITE}/`], ["Learn", `${SITE}/learn`], [SHORT, HUB], [c.title, url]];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description: c.desc, inLanguage: "en", dateModified: MODIFIED,
        isPartOf: { "@id": WEBSITE }, primaryImageOfPage: { "@id": `${url}#image` }, breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#article` },
        speakable: { "@type": "SpeakableSpecification", cssSelector: [".learn-summary", ".learn-faq"] } },
      { "@type": "ImageObject", "@id": `${url}#image`, url: og, width: 1200, height: 630, caption: c.h1 },
      { "@type": ["TechArticle", "LearningResource"], "@id": `${url}#article`, mainEntityOfPage: { "@id": `${url}#webpage` },
        headline: c.h1, alternativeHeadline: r.bookTitle, description: c.desc, abstract: c.summary, image: og, url,
        author: authorRef, publisher: authorRef, inLanguage: "en", datePublished: SERIES.published, dateModified: MODIFIED,
        wordCount: r.words, timeRequired: iso, articleSection: "Backend Development", keywords: tags.join(", "),
        proficiencyLevel: c.level, educationalLevel: c.level, teaches: c.teaches, learningResourceType: "Chapter",
        educationalUse: "Self Study", programmingLanguage: ["JavaScript", "SQL"], about: { "@type": "Thing", name: tags[0] },
        isAccessibleForFree: true, position: c.n, isPartOf: { "@id": `${HUB}#course` },
        ...(prev ? { isBasedOn: { "@type": "TechArticle", "@id": `${urlOf(prev)}#article`, name: prev.h1, url: urlOf(prev) } } : {}) },
      { ...crumbs(bc), "@id": `${url}#breadcrumb` },
      faqNode(url, c.faq),
      ...(r.quiz ? [{ "@type": "Quiz", "@id": `${url}#quiz`, name: `${c.title}: ${r.quiz.length} multiple choice questions`, educationalLevel: c.level, inLanguage: "en",
        about: { "@type": "Thing", name: tags[0] }, isPartOf: { "@id": `${url}#article` },
        hasPart: r.quiz.map((q) => ({ "@type": "Question", eduQuestionType: "Multiple choice", name: plain(q.q), text: plain(q.q),
          acceptedAnswer: { "@type": "Answer", text: plain(q.opts[q.ans]) },
          suggestedAnswer: Object.entries(q.opts).filter(([k]) => k !== q.ans).map(([, t]) => ({ "@type": "Answer", text: plain(t) })) })) }] : []),
    ],
  };

  const extra = `    <link rel="prev" href="${prev ? urlOf(prev) : HUB}">
${next ? `    <link rel="next" href="${urlOf(next)}">\n` : ""}    <meta property="article:published_time" content="${SERIES.published}T00:00:00+05:30">
    <meta property="article:modified_time" content="${MODIFIED}T00:00:00+05:30">
    <meta property="article:author" content="${SITE}/#about">
    <meta property="article:section" content="Backend Development">
${tags.map((t) => `    <meta property="article:tag" content="${esc(t)}">`).join("\n")}
`;

  const heroDir = `../../assets/images/learn/backend-master/${c.slug}`;
  const hero = existsSync(join(OG_DIR, `${c.slug}.png`))
    ? `<figure class="learn-hero"><picture>${existsSync(join(OG_DIR, `${c.slug}.webp`)) ? `<source type="image/webp" srcset="${heroDir}.webp">` : ""}<img src="${heroDir}.png" width="1200" height="630" fetchpriority="high" decoding="async" alt="${esc(`${c.h1}: ${SHORT} chapter ${c.n} cover`)}"></picture></figure>`
    : "";

  const main = `        <div class="main-content" id="main-content">
            <nav class="learn-crumbbar" aria-label="Breadcrumb">
                <ol>
                    <li><a href="/">Home</a></li>
                    <li><a href="/learn">Learn</a></li>
                    <li><a href="${BASE}">${SHORT}</a></li>
                    <li><span aria-current="page">${esc(c.title)}</span></li>
                </ol>
            </nav>
            <div class="learn-shell">
                ${sidebar(c.n)}

                <div class="learn-main" id="learnMain">
                  <div class="learn-body">
                    <article class="learn-article" id="learnArticle">
                        <p class="learn-eyebrow">Chapter ${c.n} of ${TOTAL} &middot; ${c.level}</p>
                        <h1>${esc(c.h1)}</h1>
                        <p class="learn-book-title">${esc(r.bookTitle)}</p>
                        <ul class="learn-meta text-caption">
                            <li>${r.mins} min read</li>
                            <li>${c.level}</li>
                            <li>Updated <time datetime="${MODIFIED}">${niceDate(MODIFIED)}</time></li>
                            <li>By <a href="/#about">Shivam Thakur</a></li>
                        </ul>
                        ${hero}
                        <section class="learn-summary" aria-label="Chapter summary">
                            <p>${esc(c.summary)}</p>
                            <p class="learn-box-title">In this chapter you will learn</p>
                            <ul>${c.teaches.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
                        </section>
${r.html}
${faqHtml(c.faq, `${c.title.split(/[:&]/)[0].trim()}: frequently asked questions`)}
                        <aside class="learn-author">
                            <p><strong>Written by <a href="/#about">Shivam Thakur</a></strong>, a full stack developer based in Agra, India. ${SHORT} is free to read. If you are hiring or need something built, <a href="/contact">get in touch</a>.</p>
                        </aside>
                    <nav class="learn-pager" id="learnPager" aria-label="Chapter navigation">
                        ${prev ? `<a class="prev" rel="prev" href="${pathOf(prev)}"><span>&larr; Previous &middot; Chapter ${prev.n}</span><strong>${esc(prev.title)}</strong></a>` : `<a class="prev" href="${BASE}"><span>&larr; Course home</span><strong>${SHORT} overview</strong></a>`}
                        ${next ? `<a class="next" rel="next" href="${pathOf(next)}"><span>Next &middot; Chapter ${next.n} &rarr;</span><strong>${esc(next.title)}</strong></a>` : `<a class="next" href="${BASE}"><span>Course complete &rarr;</span><strong>Back to all chapters</strong></a>`}
                    </nav>
                    </article>
                  </div>
                </div>

                <details class="learn-toc" id="learnToc" open>
                    <summary>On this page</summary>
                    <nav aria-label="On this page"><ul>${[...r.heads, { id: "faq-title", text: "Frequently asked questions" }].map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ul></nav>
                </details>
            </div>
        </div>
`;
  const html = head({ title, desc: c.desc, url, og, ogAlt: `${c.h1}: ${SHORT} chapter ${c.n}`, keywords: c.keywords, graph, extra })
    + deeper(BODY_TOP) + main + deeper(TAIL) + CHAPTER_JS(c.slug);
  return { html, words: r.words, mins: r.mins, quiz: r.quiz?.length ?? 0 };
}

function hubPage(stats) {
  const url = HUB, og = ogFor(null);
  const totalMins = CHAPTERS.reduce((a, c) => a + stats[c.n].mins, 0);
  const hours = Math.round(totalMins / 60), words = CHAPTERS.reduce((a, c) => a + stats[c.n].words, 0);
  if (SERIES.desc.length < 110 || SERIES.desc.length > 160) warn(`hub desc ${SERIES.desc.length} chars`);
  if (SERIES.title.length > 60) warn(`hub title ${SERIES.title.length} chars`);
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": ["CollectionPage", "WebPage"], "@id": `${url}#webpage`, url, name: SERIES.title, description: SERIES.desc, inLanguage: "en", dateModified: MODIFIED,
        isPartOf: { "@id": WEBSITE }, primaryImageOfPage: { "@id": `${url}#image` }, breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#course` }, speakable: { "@type": "SpeakableSpecification", cssSelector: [".learn-summary", ".learn-faq"] } },
      { "@type": "ImageObject", "@id": `${url}#image`, url: og, width: 1200, height: 630, caption: SERIES.fullName },
      { "@type": "Course", "@id": `${url}#course`, name: SERIES.fullName, description: SERIES.summary, url, image: og, inLanguage: "en",
        isAccessibleForFree: true, provider: authorRef, author: authorRef, educationalLevel: "Beginner to Advanced", dateModified: MODIFIED, datePublished: SERIES.published,
        about: ["Backend development", "Node.js", "PostgreSQL", "System design"], keywords: SERIES.keywords, courseCode: "BE-NODE",
        teaches: CHAPTERS.map((c) => c.title),
        syllabusSections: CHAPTERS.map((c) => ({ "@type": "Syllabus", name: `Chapter ${c.n}: ${c.title}`, description: c.desc, url: urlOf(c), timeRequired: `PT${stats[c.n].mins}M` })),
        offers: { "@type": "Offer", category: "Free", price: 0, priceCurrency: "USD", availability: "https://schema.org/InStock", url },
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${hours}H`, instructor: authorRef, courseSchedule: { "@type": "Schedule", repeatFrequency: "self-paced" } } },
      { "@type": "ItemList", "@id": `${url}#chapters`, name: `${SERIES.name} chapters`, numberOfItems: TOTAL,
        itemListElement: CHAPTERS.map((c) => ({ "@type": "ListItem", position: c.n, name: c.h1, url: urlOf(c) })) },
      { ...crumbs([["Home", `${SITE}/`], ["Learn", `${SITE}/learn`], [SHORT, url]]), "@id": `${url}#breadcrumb` },
      faqNode(url, SERIES.faq),
    ],
  };

  const card = (c) => `<a class="dsa-card" href="${pathOf(c)}"><span class="dsa-card-num">${pad(c.n)}</span><span class="dsa-card-body"><h3>${esc(c.h1)}</h3><span class="dsa-card-desc">${esc(c.desc)}</span><span class="dsa-card-meta text-caption">${c.level} &middot; ${stats[c.n].mins} min read</span></span></a>`;
  const stages = STAGES.map((s) => `<section class="dsa-stage" aria-labelledby="stage-${slugify(s.name)}">
<h2 id="stage-${slugify(s.name)}">${esc(s.name)} <span class="text-caption">Chapters ${s.range[0]}${s.range[1] > s.range[0] ? `&ndash;${s.range[1]}` : ""}</span></h2>
<p class="dsa-stage-blurb">${esc(s.blurb)}</p>
<div class="dsa-grid">
${CHAPTERS.filter((c) => c.n >= s.range[0] && c.n <= s.range[1]).map(card).join("\n")}
</div>
</section>`).join("\n");

  const mapJson = JSON.stringify(Object.fromEntries(CHAPTERS.map((c) => [c.n, c.slug])));
  const main = `        <div class="main-content" id="main-content">
            <div class="container">
                <div class="row">
                    <div class="section-about banner-dark flat-spacing">
                        <nav class="sect-tag text-caption fw-medium" aria-label="Breadcrumb">
                            <i class="icon icon-edu"></i>
                            <a href="/" class="link text-black-56">Home</a>&nbsp;/&nbsp;<a href="/learn" class="link text-black-56">Learn</a>&nbsp;/&nbsp;<span class="text-black-72">${SHORT}</span>
                        </nav>
                        <h1 class="s-title letter-space--2 text-black-72 split-text effect-blur-fade">${esc(SERIES.h1)}</h1>
                        <p class="s-desc text-black-56 scrolling-effect effectTop">${esc(SERIES.desc)}</p>
                        <div class="br-line"></div>
                    </div>

                    <section class="flat-spacing dsa-hub" aria-label="About ${SHORT}">
                        <div class="learn-summary">
                            <p>${esc(SERIES.summary)}</p>
                            <ul class="dsa-stats">
                                <li><strong>${TOTAL}</strong><span>Chapters</span></li>
                                <li><strong>${Math.round(words / 1000)}k+</strong><span>Words</span></li>
                                <li><strong>${QUIZ_CHAPTERS * 20}</strong><span>Quiz questions</span></li>
                                <li><strong>100%</strong><span>Free</span></li>
                            </ul>
                            <div class="dsa-cta">
                                <a href="${pathOf(CHAPTERS[0])}" class="tf-btn-action" id="dsaStart"><span class="ic-wrap"><i class="icon icon-arrow-right-top"></i></span><span class="text text-body-3 letter-space--05 fw-medium">Start with Chapter 1</span><span class="ic-wrap"><i class="icon icon-arrow-right-top"></i></span></a>
                                <a href="#" class="dsa-continue" id="dsaContinue" hidden>Continue where you left off</a>
                            </div>
                        </div>

${stages}

                        <section class="dsa-stage" aria-labelledby="stage-path">
                            <h2 id="stage-path">How to study this course</h2>
                            <p class="dsa-stage-blurb">Read the chapters in order: each one builds on the ShopLine project from the one before, and the cross-links in the text point back to the chapter that introduced an idea. Run the code yourself, do the chapter quiz and the exercises, then move on. About ${hours} hours of reading in total. The lab files used in Chapters 13 to 29 are published in the <a href="${BASE}/resources/README.txt">resources folder</a>, and <a href="${pathOf(CHAPTERS[35])}">Chapter 36</a> keeps the cheat sheets and the honest ledger of what was tested.</p>
                        </section>

                        <div class="learn-article dsa-faq-wrap">
${faqHtml(SERIES.faq, `${SHORT}: frequently asked questions`)}
                            <aside class="learn-author">
                                <p><strong>Written by <a href="/#about">Shivam Thakur</a></strong>, a full stack developer based in Agra, India. Need a developer? <a href="/contact">Get in touch</a>.</p>
                            </aside>
                        </div>
                    </section>
                </div>
            </div>
        </div>
`;
  const script = `
    <script>
    (function () {
      var map = ${mapJson};
      var m = /^#chapter-(\\d+)/.exec(location.hash);
      if (m && map[+m[1]]) { location.replace('${BASE}/' + map[+m[1]]); return; }
      try {
        var last = localStorage.getItem('backendMasterLast');
        var ok = false; for (var k in map) if (map[k] === last) ok = true;
        if (ok) { var a = document.getElementById('dsaContinue'); a.href = '${BASE}/' + last; a.hidden = false; }
      } catch (e) {}
    })();
    </script>
</body>
</html>
`;
  const body = BODY_TOP.replace("counter-scroll inner-page learn-reader-page", "counter-scroll inner-page learn-hub-page");
  return head({ title: SERIES.title, desc: SERIES.desc, url, og, ogAlt: `${SERIES.fullName} course`, keywords: SERIES.keywords, graph }) + body + main + TAIL + script;
}

// ── write
const nl = (s) => s.replace(/\r?\n/g, "\r\n");
mkdirSync(join(ROOT, "learn/backend-master"), { recursive: true });
rmSync(RES_DIR, { recursive: true, force: true });
cpSync(join(ROOT, "docs/backend-master-handbook/resources"), RES_DIR, { recursive: true });
const stats = {};
let quizzes = 0;
for (const c of CHAPTERS) {
  const p = chapterPage(c);
  stats[c.n] = { words: p.words, mins: p.mins };
  quizzes += p.quiz;
  writeFileSync(join(ROOT, "learn/backend-master", `${c.slug}.html`), nl(p.html));
  console.log(`wrote learn/backend-master/${c.slug}.html  (${p.words} words, ${p.mins} min, ${p.quiz} quiz)`);
}
if (quizzes !== QUIZ_CHAPTERS * 20) warn(`total quiz questions ${quizzes}`);
writeFileSync(join(ROOT, "learn/backend-master.html"), nl(hubPage(stats)));
console.log(`wrote learn/backend-master.html  (${warnings} warnings)`);
