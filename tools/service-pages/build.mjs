// Builds the 8 service detail pages in services/ from data.mjs and the shared site shell.
// usage: node tools/service-pages/build.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICES, BY_SLUG } from "./data.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const SITE = "https://shivamthakur.me";
const MODIFIED = "2026-10-26";
const PHONE = "918958394972", PHONE_TXT = "+91 89583 94972", EMAIL = "shivam.it1311@gmail.com";
// retired URLs whose pages are replaced by a renamed one; removed after the new page is written
const RENAMED = { "custom-software-development": "ai-integration", "api-backend-development": "api-integrations" };
// the service as it reads mid-sentence, for question headings
const TOPIC = {
  "web-development": "full-stack web app development", "saas-product-development": "SaaS product development",
  "ai-integration": "AI integration", "mobile-app-development": "mobile app development",
  "api-integrations": "API development and integrations", "crm-erp-development": "custom CRM and ERP software",
  "ecommerce-development": "e-commerce development", "cloud-devops-services": "cloud, DevOps and website care",
};
const AREA = ["Agra", "Mathura", "Firozabad", "Aligarh", "Etawah", "Bharatpur"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const wa = (text) => `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
const ARROW = `<span class="ic-wrap"><i class="icon icon-arrow-right-top"></i></span>`;
const btn = (href, text, { white = false, ext = false, label = "" } = {}) =>
  `<a href="${href}" class="tf-btn-action${white ? " style-white" : ""}"${ext ? ' target="_blank" rel="noopener"' : ""}${label ? ` aria-label="${esc(label)}"` : ""}>${ARROW}<span class="text text-body-3 letter-space--05 fw-medium">${esc(text)}</span>${ARROW}</a>`;

// ── shell: asset links, body top and the footer/scripts tail come from the frozen site template
const shell = readFileSync(join(HERE, "shell.html"), "utf8").replace(/\r\n/g, "\n");
const cut = (from, to, keepTo = false) => {
  const a = shell.indexOf(from), b = shell.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`shell marker missing: ${from} / ${to}`);
  return shell.slice(a, keepTo ? b + to.length : b);
};
const ASSETS = cut('    <link rel="stylesheet" href="../assets/fonts/fonts.css">', "\n\n    <script type=\"application/ld+json\">");
const BODY_TOP = cut('<body class="counter-scroll inner-page">', '                <div class="row">\n', true);
const CARD_ASIDE = cut("                                    <!-- Dark contact card -->", "                                </div>\n                                </div>\n\n                </div>");
let TAIL = cut("                </div>\n            </div>\n        </div>\n        <!-- Footer -->", "</html>", true);
TAIL = TAIL.replace(/(<nav class="foot-col" aria-label="Services">[\s\S]*?<ul class="foot-list">)[\s\S]*?(<\/ul>)/,
  (_, a, b) => `${a}\n${SERVICES.map((s) => `                            <li><a href="../services/${s.slug}" class="text-body-3">${esc(s.short === "AI" ? "AI Integration" : s.name.replace(/ \(.*\)/, ""))}</a></li>`).join("\n")}\n                            <li><a href="../services" class="text-body-3">View all services</a></li>\n                        ${b}`);

function head(s, url, og) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: s.title, description: s.desc, inLanguage: "en", dateModified: MODIFIED,
        isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${url}#service` }, breadcrumb: { "@id": `${url}#breadcrumb` },
        speakable: { "@type": "SpeakableSpecification", cssSelector: [".svc-summary", ".svc-faq .accordion-content"] } },
      { "@type": "Service", "@id": `${url}#service`, name: s.name, serviceType: s.serviceType, description: s.summary, url, image: og,
        provider: { "@id": `${SITE}/#business` },
        areaServed: [...AREA.map((n) => ({ "@type": "City", name: n })), { "@type": "State", name: "Uttar Pradesh" }, { "@type": "Country", name: "India" }, "Worldwide (remote)"],
        hasOfferCatalog: { "@type": "OfferCatalog", name: `${s.name}: what's included`, itemListElement: s.included.items.map(([, n, d]) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n, description: d } })) },
        offers: { "@type": "Offer", url, availability: "https://schema.org/InStock", priceCurrency: "USD", description: "Fixed-price quote after a free consultation." } },
      { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
        { "@type": "ListItem", position: 3, name: s.name, item: url }] },
      { "@type": "HowTo", "@id": `${url}#howto`, name: `How ${s.name.replace(/ \(.*\)/, "")} projects work with Shivam Thakur`, description: s.process.intro,
        step: s.process.steps.map(([, n, , t], i) => ({ "@type": "HowToStep", position: i + 1, name: n, text: t })) },
      { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: s.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };
  const title = `${s.title} | Shivam Thakur`.length <= 60 ? `${s.title} | Shivam Thakur` : s.title;
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

    <title>${esc(title)}</title>
    <meta name="description"
        content="${esc(s.desc)}">
    <meta name="author" content="Shivam Thakur">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="#EBEBEB" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0F0F0F" media="(prefers-color-scheme: dark)">
    <meta name="keywords" content="${esc(s.keywords)}, Shivam Thakur">

    <!-- Geo -->
    <meta name="geo.region" content="IN-UP">
    <meta name="geo.placename" content="Agra, Uttar Pradesh, India">
    <meta name="geo.position" content="27.1767;78.0081">
    <meta name="ICBM" content="27.1767, 78.0081">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Shivam Thakur — Full Stack Developer">
    <meta property="og:title" content="${esc(s.title)}">
    <meta property="og:description" content="${esc(s.desc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${og}">
    <meta property="og:locale" content="en_IN">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(s.title)}">
    <meta name="twitter:description" content="${esc(s.desc)}">
    <meta name="twitter:image" content="${og}">

${ASSETS}

    <script type="application/ld+json">
${JSON.stringify(graph, null, 2).replace(/^/gm, "    ")}
    </script>
</head>

`;
}

const P = "                            "; // section indent
const listItems = (items) => items.map(([a, b]) => `<li><strong>${esc(a)}</strong> &mdash; ${esc(b)}</li>`).join("");
const row = (img, alt, inner, { reverse = false, first = false } = {}) => `${P}    <div class="service-row${reverse ? " is-reverse" : ""} scrolling-effect effectBottom">
${P}        <div class="service-row_media"><div class="wrap_image"><img ${first ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="1672" height="941" src="../assets/images/service/${img}.svg" alt="${esc(alt)}"></div></div>
${P}        <div class="service-row_text">
${inner}
${P}        </div>
${P}    </div>`;
function page(s) {
  const url = `${SITE}/services/${s.slug}`;
  const old = [join(ROOT, "services", `${s.slug}.html`), ...Object.entries(RENAMED).filter(([, n]) => n === s.slug).map(([o]) => join(ROOT, "services", `${o}.html`))].find(existsSync);
  const og = (old && readFileSync(old, "utf8").match(/property="og:image" content="([^"]+)"/)?.[1]) || `${SITE}/assets/images/section/service-1.webp`;
  const waMsg = `Hi Shivam, I'm interested in ${s.name}. `;
  const t = (txt) => `${P}            ${txt}`;

  const hero = `${P}<div class="section-about banner-dark flat-spacing">
${P}    <nav class="sect-tag text-caption fw-medium" aria-label="Breadcrumb">
${P}        <i class="icon icon-service"></i>
${P}        <a href="/" class="link text-black-56">Home</a>&nbsp;/&nbsp;<a href="../services" class="link text-black-56">Services</a>&nbsp;/&nbsp;<span class="text-black-72">${esc(s.name)}</span>
${P}    </nav>
${P}    <h1 class="s-title letter-space--2 text-black-72 split-text effect-blur-fade">${esc(s.h1[0])} <br class="d-none d-lg-block">${esc(s.h1[1])}</h1>
${P}    <p class="s-desc text-black-56 svc-summary scrolling-effect effectTop">${esc(s.summary)}</p>
${P}    <div class="svc-meta text-body-3 text-black-56"><span><span class="svc-dot" aria-hidden="true"></span>Available for new projects</span><span>Agra, India &middot; working worldwide</span><span>Replies within 24 hours</span></div>
${P}    <div class="svc-actions">
${P}        ${btn(wa(waMsg), "WhatsApp me", { ext: true, label: `Chat on WhatsApp about ${s.name}` })}
${P}        ${btn("#build", "Get a free quote", { white: true })}
${P}        ${btn(`tel:+${PHONE}`, `Call ${PHONE_TXT}`, { white: true })}
${P}    </div>
${P}    <div class="case-meta-grid svc-facts">
${s.facts.map(([l, v]) => `${P}        <div class="case-meta-card"><p class="meta-label text-caption fw-medium text-black-56"><span class="slashes">//</span> ${esc(l)}</p><p class="meta-value text-body-2 fw-medium text-black-72">${esc(v)}</p></div>`).join("\n")}
${P}    </div>
${P}    <div class="br-line"></div>
${P}</div>`;

  const rows = [
    row(`${s.art}-1`, `${s.name} illustration`, [
      t(`<h2 class="s-title letter-space--2 text-black-72">Who is ${esc(TOPIC[s.slug])} for?</h2>`),
      t(`<ul class="svc-list">${listItems(s.useCases)}</ul>`)].join("\n"), { first: true }),
    row(`${s.art}-included`, `What's included in ${s.name}`, [
      t(`<h2 class="s-title letter-space--2 text-black-72">What&rsquo;s included</h2>`),
      t(`<p class="s-desc text-black-56">${esc(s.included.intro)}</p>`),
      t(`<ul class="svc-list">${listItems(s.included.items.map(([, a, b]) => [a, b]))}</ul>`)].join("\n"), { reverse: true }),
    row(`${s.art}-process`, `How I work: ${s.process.steps.map((x) => x[1]).join(", ")}`, [
      t(`<h2 class="s-title letter-space--2 text-black-72">How I work</h2>`),
      t(`<p class="s-desc text-black-56">${esc(s.process.intro)}</p>`),
      t(`<ol class="svc-list svc-steps">${s.process.steps.map(([, n, , d]) => `<li><strong>${esc(n)}</strong> &mdash; ${esc(d)}</li>`).join("")}</ol>`)].join("\n")),
    row(`${s.art}-deliver`, `Deliverables for ${s.name}`, [
      t(`<h2 class="s-title letter-space--2 text-black-72">What you get</h2>`),
      t(`<p class="s-desc text-black-56">${esc(s.deliver.intro)}</p>`),
      t(`<ul class="svc-list">${s.deliver.items.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>`)].join("\n"), { reverse: true }),
  ].join("\n\n");


  const article = `${P}<article class="blog-single-wrap section-work flat-spacing">
${P}    <div class="entry-content">
${rows}
${P}    </div>
${P}</article>`;

  const faq = `${P}<section class="section-service flat-spacing svc-faq" aria-label="Frequently asked questions">
${P}    <div class="sect-tag text-caption fw-medium effectFade fadeUp no-div mb-0"><i class="icon icon-service"></i> FAQ &middot; ${esc(s.name)}</div>
${P}    <div class="" id="accordion-faq">
${s.faq.map(([q, a], i) => `${i ? `${P}        <div class="br-line scrolling-effect effectBottom"></div>\n` : ""}${P}        <div class="service-accordion_item scrolling-effect effectBottom" role="presentation">
${P}            <div class="accordion-action" data-bs-target="#faq-${i + 1}" role="button" data-bs-toggle="collapse" aria-controls="faq-${i + 1}" aria-expanded="true">
${P}                <h2 class="text letter-space--2 text-black-72 h4">${esc(q)}</h2>
${P}                <div class="ic-wrap"><span class="ic-accordion-custom"></span></div>
${P}            </div>
${P}            <div id="faq-${i + 1}" class="collapse show" data-bs-parent="#accordion-faq"><div class="accordion-content"><p class="service-desc text-black-56">${esc(a)}</p></div></div>
${P}        </div>`).join("\n")}
${P}    </div>
${P}</section>`;

  const quick = [
    ["WhatsApp", "Fastest reply. Send a message about your project and I'll answer the same day.", btn(wa(waMsg), "Chat on WhatsApp", { ext: true })],
    ["Call", "Prefer to talk it through? Call me, Mon–Sat, 10am–7pm IST.", btn(`tel:+${PHONE}`, PHONE_TXT)],
    ["Email", "Send a brief, a spec or a link and get a written reply within 24 hours.", btn(`mailto:${EMAIL}?subject=${encodeURIComponent(`${s.name} enquiry`)}`, "Email me")],
  ];
  const actions = `${P}<section class="section-service flat-spacing svc-quick" aria-label="Quick contact">
${P}    <div class="sect-tag text-caption fw-medium effectFade fadeUp no-div"><i class="icon icon-send"></i> Free consultation &middot; reply within 24 hours</div>
${P}    <div class="tf-grid-layout sm-col-2 md-col-3">
${quick.map(([h, d, b]) => `${P}        <div class="svc-quick-card scrolling-effect effectBottom">
${P}            <h3 class="text letter-space--2 text-black-72 h5">${h === "WhatsApp" ? '<span class="svc-dot" aria-hidden="true"></span>' : ""}${h}</h3>
${P}            <p class="text-body-2 text-black-56">${esc(d)}</p>
${P}            ${b}
${P}        </div>`).join("\n")}
${P}    </div>
${P}</section>`;

  const others = `${P}<section class="section-service flat-spacing" aria-label="Other services">
${P}    <div class="sect-tag text-caption fw-medium effectFade fadeUp no-div"><i class="icon icon-service"></i> Other services</div>
${P}    <div class="tf-grid-layout sm-col-2">
${s.related.map((slug) => { const r = BY_SLUG[slug]; return `${P}        <article class="article-blog scrolling-effect effectBottom">
${P}            <div class="blog-image"><a href="${slug}"><img loading="lazy" width="1672" height="941" src="../assets/images/service/${r.art}-1.svg" alt="${esc(r.name)}"></a></div>
${P}            <div class="blog-content"><div><p class="infor_sub text-body-3 text-black-56">${esc(r.short)}</p><h3 class="infor_name h6 text-black-72"><a href="${slug}" class="link">${esc(r.name)}</a></h3></div><a href="${slug}" class="btn-action" aria-label="View: ${esc(r.name)}"><i class="icon icon-arrow-right-top"></i></a></div>
${P}        </article>`; }).join("\n")}
${P}    </div>
${P}</section>`;

  const contact = `${P}<div class="section-contact flat-spacing spacing-tight" id="build">
${P}    <div class="build-grid">
${P}        <!-- Intro + quick form (sends via WhatsApp, no backend needed) -->
${P}        <div class="build-col-main">
${P}        <div class="sect-tag text-caption fw-medium effectFade fadeUp no-div"><i class="icon icon-send"></i> Let&rsquo;s build</div>
${P}        <h2 class="s-title letter-space--2 split-text effect-blur-fade h4">${esc(s.cta[0])} <br class="d-none d-lg-block">${esc(s.cta[1])}</h2>
${P}        <form class="form-contact build-form effectFade fadeUp no-div" id="buildform" data-service="${esc(s.name)}" action="${wa(waMsg)}" method="get">
${P}            <div class="form-content">
${P}                <fieldset class="field-ip"><input type="text" name="name" id="build-name" placeholder="Your Name *" autocomplete="name" required></fieldset>
${P}                <fieldset class="field-ip"><input type="email" name="email" id="build-email" placeholder="Email Address *" autocomplete="email" required></fieldset>
${P}                <fieldset class="field-ip"><input type="text" name="message" id="build-message" placeholder="Tell me about your project"></fieldset>
${P}            </div>
${P}            <div class="form-action">
${P}                <button type="submit" class="tf-btn-action">${ARROW}<span class="text text-body-3 letter-space--05 fw-medium">Send on WhatsApp</span>${ARROW}</button>
${P}            </div>
${P}        </form>
${P}        </div>

${CARD_ASIDE}                                </div>
                                </div>`;

  const script = `
    <script>
    /* Service enquiry form: opens WhatsApp with the details pre-filled (no backend required). */
    document.addEventListener("DOMContentLoaded", function () {
        var form = document.getElementById("buildform");
        if (!form) return;
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }
            var d = new FormData(form);
            var text = "Hi Shivam, I'm interested in " + form.dataset.service + ".\\nName: " + d.get("name") + "\\nEmail: " + d.get("email") + "\\nProject: " + (d.get("message") || "-");
            window.open("https://wa.me/${PHONE}?text=" + encodeURIComponent(text), "_blank", "noopener");
        });
    });
    </script>
</body>`;

  const html = head(s, url, og) + BODY_TOP + "\n" + [hero, article, faq, actions, others, contact].join("\n\n") + "\n\n" + TAIL.replace("</body>", script.trimStart());
  return html.replace(/\n/g, "\r\n");
}

for (const s of SERVICES) {
  writeFileSync(join(ROOT, "services", `${s.slug}.html`), page(s));
  console.log("wrote services/" + s.slug + ".html");
}
for (const [oldSlug, newSlug] of Object.entries(RENAMED)) {
  const f = join(ROOT, "services", `${oldSlug}.html`);
  if (existsSync(join(ROOT, "services", `${newSlug}.html`)) && existsSync(f)) { unlinkSync(f); console.log("removed services/" + oldSlug + ".html"); }
}
