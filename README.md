# Plan: Blog, Case Study & Service pages for Shivam Thakur portfolio (static, theme-matched, SEO/AEO/GEO)

## Context

The site at `c:\xampp\htdocs\s` is a **single-page** static portfolio for **Shivam Thakur, Full Stack Developer** — an HTTrack copy of the themesflat "Isak" HTML template (only `index.html` exists, plus `assets/`). Stack is plain HTML + Bootstrap 5 + jQuery + GSAP/ScrollTrigger + Swiper, **no build step**.

The user wants six new page types added, all **fully static** (each detail page is its own `.html` file — no PHP, no JS data fetching), **visually identical to the existing theme** (same cards/UI/spacing), with **advanced SEO + AEO + GEO** handled everywhere. The template's own CSS (`assets/css/styles.css`) already ships complete, currently-unused blog/listing/single-post styling, so **no meaningful new CSS is needed** — we compose existing classes. The outcome: a production-ready multi-page portfolio that ranks well and answers-engine well, while keeping the polished look intact.

Confirmed decisions: **folders + slug URLs**; **full realistic content**; **retrofit index.html + add sitewide SEO**; **CTAs link back to `index.html#contact`** (one working form).

---

## File structure (final)

```
/  (c:\xampp\htdocs\s)
├─ index.html                      # retrofit: SEO/OG/JSON-LD + branding fixes
├─ blog.html                       # blog listing
├─ case-studies.html               # case study (portfolio) listing
├─ services.html                   # services listing
├─ robots.txt                      # NEW
├─ sitemap.xml                     # NEW
├─ llms.txt                        # NEW (GEO/AEO — LLM-facing site summary)
├─ blog/
│   ├─ scaling-nodejs-apis.html
│   ├─ react-performance-optimization.html
│   ├─ building-rest-vs-graphql.html
│   └─ deploying-fullstack-on-vercel.html
├─ case-studies/
│   ├─ drone-startup-platform.html
│   ├─ realtime-analytics-dashboard.html
│   └─ ecommerce-headless-storefront.html
├─ services/
│   ├─ web-development.html
│   ├─ web-design.html
│   ├─ api-backend-development.html
│   ├─ frontend-development.html
│   └─ performance-seo.html
└─ assets/  (unchanged, referenced as ../assets/... from subfolder pages)
```

Detail pages live in subfolders → clean URLs (`/blog/scaling-nodejs-apis.html`), correct `../assets/` and `../` root-link paths, and clean canonicals. Listings stay at root so `blog.html`/`case-studies.html`/`services.html` are the section hubs.

---

## Shared shell strategy (critical for consistency)

Because there's no build step, the layout shell is copy-pasted into every page. **Perfect ONE shell template first, then derive all others from it** to prevent divergence.

The shell (cloned verbatim from `index.html`) includes, in order:
- `<head>`: font/css links (`../assets/...` on subpages), favicon — **plus the new SEO block** (see below).
- `#preload` spinner, `.body-background` (cloud img + `.bg-video`).
- `.action-open-mobile.d-lg-none` mobile drawer, `.sidebar-tools.pst-v1` (nav + `.toggle-switch-mode` theme toggle + `.go-top`), `.overlay-pop`.
- `main#wrapper` → `.tf-header-wrap` (logo `img.image-switch` + `.time-local` clock) → `.sidebar-user` (profile card, name "Shivam Thakur", social, CTA) → `.main-content > .container > .row > .col-lg-7.col-xl-8.ms-auto > .wrap-container > [PAGE SECTIONS] + #footer.tf-footer.flat-spacing`.
- Script block (jquery, bootstrap, nice-select, jquery-validate, swiper, carousel.js, infinityslide.js, ScrollSmooth.js, gsap+SplitText+ScrollTrigger+ScrollToPlugin, gsapAnimation.js, countto.js, animation-change-text.js, main.js).
- `.mobile-bottom-nav.d-lg-none`.
- `<body class="counter-scroll">` retained (preloader + counters + theme-init depend on it).

**Navigation rewrite on all new pages** (source uses bare `#work` anchors that won't scroll on a standalone page):
- Section anchors in sidebar-tools / mobile drawer / mobile-bottom-nav → `index.html#home`, `index.html#about`, `index.html#work`, `index.html#service`, `index.html#contact`, etc. (prefix `../index.html#...` on subpages).
- Add cross-page hub links to Blog / Case Studies / Services (see nav integration below).
- Logo/CTA links → `index.html` / `index.html#contact` (`../` prefixed on subpages).
- `.time-local` clock, theme toggle, preloader all keep working since their JS keys off classes/ids we preserve.

**Keep `#preload`** on every page (gsapAnimation.js `loader()` path). Swiper init in `carousel.js` is guarded by `$(".section-testimonial").length`, so pages without a testimonial slider are safe; if we add a "related"/reviews Swiper we'll match existing selectors (`.swiper-testimonial` etc.) or omit sliders.

---

## Per-page composition (reusing existing classes)

Every listing/detail page uses a **breadcrumb page-title header** at the top of `.wrap-container`, styled like a section:
```
<div class="section-... flat-spacing">
  <nav class="sect-tag ..."> <i class="icon icon-..."></i> Home / Blog </nav>
  <h4 class="s-title letter-space--2 text-black-72 split-text effect-blur-fade">…</h4>
  <p class="s-desc text-black-56 scrolling-effect effectTop">…</p>
</div>
```

- **blog.html** — page-title header → grid of `.article-blog` cards (image, `.infor_sub` category·date, `.infor_name` title, `.btn-action` → `blog/<slug>.html`) using existing section images → `.wg-pagination`/`.pagination-item` (single page, decorative) → CTA linking `index.html#contact` → footer.
- **blog/<slug>.html** — page-title header (breadcrumb Home / Blog / Title) → `.blog-single-wrap` (`.image` hero, `.meta-list .meta-item` author/date/read-time, body with H2/H3 + `.blockquote-wrap`) → an **FAQ block** (`.service-accordion_item` Bootstrap collapse, 3–4 Q&As) for AEO → `.entry-footer .tags-links` + `.social-links` (share) → "Related posts" row of `.article-blog` cards → CTA → footer.
- **case-studies.html** — page-title header → grid of case-study cards. Reuse the **`.wg-work` card** markup (work-image, `.w-title`, `.w-desc`, `.w-highlight` box-high Year/Role, `.w-tag-list`, `.tf-btn-action`) but **without `.element-sticky`** (plain grid, not sticky stack); link `.tf-btn-action` → `case-studies/<slug>.html` → CTA → footer.
- **case-studies/<slug>.html** — page-title header (breadcrumb) → hero image (`.blog-single-wrap .image`) → project meta (`.w-highlight` Client/Year/Role/Stack) → structured body: **Overview / Problem / Solution / Results** (H2 sections, keep semantic) → optional metrics row (`.counter .number` countup) → tech tags (`.w-tag-list`) → FAQ accordion (AEO) → "Related case studies" `.wg-work` cards → CTA → footer.
- **services.html** — page-title header → **`#accordion-service`** Bootstrap collapse list of `.service-accordion_item` (one per service: `.accordion-action` h4 title + `.accordion-content` with `.tf-grid-layout sm-col-2` images, `.service-tag` tags, `.service-desc`) — mirrors index's Services section — each item's "Learn more" links to `services/<slug>.html`, separated by `.br-line` → CTA → footer.
- **services/<slug>.html** — page-title header (breadcrumb) → service overview (`.s-desc`) → "What's included" list → process steps → deliverables → FAQ accordion (AEO) → related services → strong CTA (`index.html#contact`) → footer.

**Content (full, realistic):**
- 3 case studies: `drone-startup-platform` (build on existing Drone/work-1), `realtime-analytics-dashboard` (work-2), `ecommerce-headless-storefront` (work-3). Each: real full-stack narrative, stack (React/Next.js/Node/Mongo etc.), quantified results.
- 4 blog posts: Scaling Node.js APIs; React performance optimization; REST vs GraphQL; Deploying full-stack apps on Vercel. Real technical copy + FAQ.
- 5 services: Web Development, Web Design, API & Backend Development, Frontend Development, Performance & SEO. Reuse `service-1..6.jpg`.
- Images: reuse `assets/images/section/work-1..3.jpg`, `service-1..6.jpg`, `award-1..5.jpg`. Every `<img>` gets descriptive `alt`. Logos keep `class="image-switch" data-dark=...`.

---

## SEO / AEO / GEO spec

**Small CSS additions to `styles.css`** (only theme-parity fixes, additive): define the referenced-but-missing vars so blog borders render — add to `:root` `--white-16: rgba(255,255,255,0.16); --primary-rgb: 0,222,81; --primary-2: #00BF43;` and matching values in `.dark-mode`. Add a visually-hidden `.skip-link:focus` reveal style if not present. Nothing else changes visually.

**Per-page `<head>` (every page incl. index):**
- Unique `<title>` — pattern `<Page> — Shivam Thakur | Full Stack Developer` (≤60 chars).
- `<meta name="description">` unique, 150–160 chars.
- `<link rel="canonical" href="https://shivamthakurfolio.dev/<path>">`.
- `<meta name="robots" content="index,follow,max-image-preview:large">`.
- `<meta name="theme-color">` (light `#EBEBEB`, dark via media) ; `<meta name="author" content="Shivam Thakur">` (fix themesflat).
- Open Graph: `og:type` (website/article/profile), `og:title`, `og:description`, `og:url`, `og:image` (absolute, reuse a section jpg), `og:site_name`.
- Twitter: `summary_large_image`, title/description/image.
- `<html lang="en">`.

**JSON-LD (`application/ld+json`) — GEO/structured data:**
- **index.html**: `Person` (Shivam Thakur, jobTitle, sameAs socials, knowsAbout tech list) + `WebSite` (+ optional `SearchAction`) + `ProfilePage`.
- **blog.html**: `Blog` + `BreadcrumbList`; **case-studies.html**: `CollectionPage` + `ItemList` + `BreadcrumbList`; **services.html**: `ItemList` of `Service` + `BreadcrumbList`.
- **blog/<slug>**: `BlogPosting` (headline, datePublished, author Person, image, wordcount) + `BreadcrumbList` + `FAQPage` (from the on-page FAQ).
- **case-studies/<slug>**: `CreativeWork`/`Article` (about the project, `creator` Person) + `BreadcrumbList` + `FAQPage`.
- **services/<slug>**: `Service` (+ `provider` Person, `areaServed`, `Offer`) + `BreadcrumbList` + `FAQPage`.

**AEO (answer engine):** each detail page includes a visible **FAQ accordion** (semantic `<h2>`/`<h3>` questions, concise answers) backed by `FAQPage` JSON-LD; use question-style headings and short lead paragraphs so answers are extractable.

**GEO / semantic HTML upgrades (apply on new pages; light touch on index):** wrap main region in `<main>`, listing cards region in `<section>`, detail body in `<article>`, breadcrumb in `<nav aria-label="Breadcrumb">`, dates in `<time datetime>`, add `#main-content` skip-link as first focusable element, meaningful `alt` on all images, single `<h1>` per page (page-title becomes the H1 via `.s-title` on an `<h1>` or an sr-only H1).

**Sitewide files:**
- `robots.txt` — allow all, point to `Sitemap: https://shivamthakurfolio.dev/sitemap.xml`.
- `sitemap.xml` — all 15 URLs (index, 3 listings, 4 blog, 3 case studies, 5 services) with `<lastmod>`.
- `llms.txt` — Markdown site summary for LLMs (who Shivam is, page map with links + one-line descriptions) per the emerging llms.txt convention.

**index.html retrofit (branding + SEO):** fix `<title>` (currently "Isak…"), author meta (`themesflat.com`), description (mentions "Davies"); replace contact email `hello@isak.design` → real/placeholder Shivam email; update contact form `action` (currently `isak-omega.vercel.app`) to a neutral placeholder or `mailto`-safe note; replace placeholder social `#` hrefs with real/placeholder profiles; add hub nav links + full SEO/OG/JSON-LD head block. Testimonial copy still says "Isak" — update to "Shivam".

---

## Critical files

- **Read/clone from:** `c:\xampp\htdocs\s\index.html` (shell, section patterns, cards, footer, scripts — lines noted in exploration: work card ~557, service accordion ~823, contact ~1334, footer ~1374, scripts ~1400, mobile nav ~1420).
- **Edit:** `index.html` (retrofit), `assets/css/styles.css` (add missing CSS vars + skip-link — additive only).
- **Create:** the 15 HTML pages listed in File structure, plus `robots.txt`, `sitemap.xml`, `llms.txt`.

---

## Implementation order

1. **Build the canonical shell** as `blog.html` (root-level paths first). Rewrite all nav to `index.html#...`, add hub links, insert SEO head block skeleton. Verify it renders identically to index (theme, dark toggle, clock, preloader).
2. **Add missing CSS vars** to `styles.css` (`--white-16`, `--primary-rgb`, `--primary-2`) + skip-link style.
3. **blog.html** listing content (`.article-blog` cards + pagination + FAQ-free listing SEO).
4. **blog/ detail template** → build `blog/scaling-nodejs-apis.html` fully (`.blog-single-wrap` + FAQ accordion + BlogPosting/FAQPage/Breadcrumb JSON-LD, `../` paths), then derive the other 3 posts.
5. **case-studies.html** listing (`.wg-work` grid) → **case-studies/ detail template** (drone-startup-platform full) → derive other 2.
6. **services.html** listing (`#accordion-service`) → **services/ detail template** (web-development full) → derive other 4.
7. **index.html retrofit** (branding fixes + SEO/OG/JSON-LD + hub nav links).
8. **robots.txt, sitemap.xml, llms.txt.**
9. Final consistency pass across all shells (nav, footer year, meta patterns).

---

## Verification checklist

- Serve locally: `python -m http.server 8000` in `c:\xampp\htdocs\s` (or open via XAMPP `http://localhost/s/`). Visit each of the 15 pages.
- **Visual parity:** each new page shows the same sidebar profile, nav, background, spacing, fonts as index; cards match `index.html` styling exactly.
- **Theme toggle:** click `.toggle-switch-mode` on a new page → dark mode applies and persists across navigation (localStorage `darkMode`).
- **Nav/links:** sidebar + mobile-bottom-nav links jump to `index.html#section`; hub links open blog/case-studies/services; every detail "back"/breadcrumb link resolves (no 404, correct `../` paths); CTAs reach `index.html#contact`.
- **Animations/preloader:** preloader clears; GSAP entrance animations fire; `.time-local` clock ticks; accordions expand (bootstrap.min.js loaded).
- **Images:** no broken images (all reuse existing jpgs); alt text present.
- **SEO/AEO/GEO validation:** view-source each page — unique title/description/canonical, OG/Twitter tags present, one `<h1>`, skip-link present. Paste JSON-LD into Google Rich Results Test / schema.org validator → Person/WebSite, BlogPosting+FAQPage, CreativeWork+FAQPage, Service+FAQPage, BreadcrumbList all valid. `robots.txt`, `sitemap.xml` (well-formed XML, all 15 URLs), `llms.txt` reachable.
- **Static-only check:** grep confirms no server-side includes / runtime data fetches added; every page is standalone HTML.
