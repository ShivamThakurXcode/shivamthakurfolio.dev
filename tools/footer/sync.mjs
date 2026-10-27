// Writes the site footer into every page (and the build shells), with link prefixes for each folder depth.
// Safe to re-run. usage: node tools/footer/sync.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SERVICES } from "../service-pages/data.mjs";
import { CHAPTERS } from "../learn-pages/data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SKIP = new Set([".git", ".claude", ".dist", ".kilo", "node_modules", "docs", "assets", ".vscode"]);
const PHONE = "918958394972", PHONE_TXT = "+91 89583 94972", EMAIL = "shivam.it1311@gmail.com";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const footName = (s) => (s.slug === "ai-integration" ? "AI Integration" : s.name.replace(/ \(.*\)/, ""));

const CASES = [
  ["MyDigiSense", "mydigisense-digital-presence-marketplace-platform"],
  ["ProDigiChat", "prodigichat-whatsapp-marketing-automation-platform"],
  ["DigiCRM", "digicrm-invoice-payment-management-crm"],
  ["MailMaster", "mailmaster-bulk-email-marketing-platform"],
  ["IDMATS", "idmats-digital-marketing-technical-skills-institute"],
  ["DigiConn Unite", "digiconn-unite-digital-marketing-agency-website"],
  ["FlayerMarketing", "flayermarketing-digital-marketing-agency-website"],
];
const LEARN_PICK = { 1: "Big-O & Time Complexity", 2: null, 4: null, 11: null, 15: null, 18: null, 28: null };
const learnLabel = (c) => LEARN_PICK[c.n] || c.title.split(":")[0];

const ICON = {
  github: '<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504c.5.092.682-.217.682-.483c0-.237-.008-.868-.013-1.703c-2.782.605-3.369-1.343-3.369-1.343c-.454-1.158-1.11-1.466-1.11-1.466c-.908-.62.069-.608.069-.608c1.003.07 1.531 1.032 1.531 1.032c.892 1.53 2.341 1.088 2.91.832c.092-.647.35-1.088.636-1.338c-2.22-.253-4.555-1.113-4.555-4.951c0-1.093.39-1.988 1.029-2.688c-.103-.253-.446-1.272.098-2.65c0 0 .84-.27 2.75 1.026A9.6 9.6 0 0 1 12 6.844c.85.004 1.705.115 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027c.546 1.379.203 2.398.1 2.651c.64.7 1.028 1.595 1.028 2.688c0 3.848-2.339 4.695-4.566 4.943c.359.309.678.919.678 1.852c0 1.336-.012 2.415-.012 2.743c0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2"/>',
  linkedin: '<path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93zM6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .92.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37z"/>',
  instagram: '<path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/>',
  whatsapp: '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z"/>',
  mail: '<path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 4.7l-8 5.334L4 8.7V6.297l8 5.333l8-5.333z"/>',
  phone: '<path d="M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24a11.4 11.4 0 0 0 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02z"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7m0 9.5A2.5 2.5 0 1 1 14.5 9A2.5 2.5 0 0 1 12 11.5"/>',
  clock: '<path d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20m1 5v5.41l3.29 3.3l-1.41 1.41L11 13V7z"/>',
};
const fill = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON[name]}</svg>`;
const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

// p = relative prefix to the site root for this file ("", "../" or "../../")
export function footer(p) {
  const col = (title, label, links) => `                    <nav class="foot-col" aria-label="${label}">
                        <span class="foot-col-title text-caption fw-medium">${title}</span>
                        <ul class="foot-list">
${links.map(([href, text]) => `                            <li><a href="${href}" class="text-body-3">${esc(text)}</a></li>`).join("\n")}
                        </ul>
                    </nav>`;
  const services = [...SERVICES.map((s) => [`${p}services/${s.slug}`, footName(s)]), [`${p}services`, "View all services"]];
  const cases = [...CASES.map(([n, slug]) => [`${p}case-studies/${slug}`, n]), [`${p}case-studies`, "All case studies"]];
  const learn = [[`${p}learn/dsa-master`, "DSA Master (all chapters)"], ...CHAPTERS.filter((c) => c.n in LEARN_PICK).map((c) => [`${p}learn/dsa-master/${c.slug}`, learnLabel(c)])];
  const company = [["/#about", "About"], [`${p}services`, "Services"], [`${p}case-studies`, "Case Studies"], [`${p}blog`, "Blog"], [`${p}learn`, "Learn"], [`${p}contact`, "Contact"]];
  const social = (href, label, icon) => `<li><a href="${href}" target="_blank" rel="noopener" aria-label="${label}">${fill(icon)}</a></li>`;
  const item = (icon, inner) => `<li class="foot-contact-item">${fill(icon, 16)}${inner}</li>`;

  return `<footer id="footer" class="tf-footer flat-spacing spacing-tight">
            <div class="br-line"></div>
            <div class="foot-dark">
                <div class="foot-top">
                    <a href="/" class="f-logo-link" aria-label="Shivam Thakur home">
                        <img loading="lazy" width="30" height="30" src="${p}assets/images/logo/logo-s-w.svg" alt="Shivam Thakur logo"><span class="f-logo-name" aria-hidden="true">Shivam Thakur</span></a>
                    <ul class="build-social-list foot-socials">
                        ${social("https://github.com/ShivamThakurXcode/", "GitHub profile", "github")}
                        ${social("https://www.linkedin.com/in/shivam-thakur-9b1a54311/", "LinkedIn profile", "linkedin")}
                        ${social("https://www.instagram.com/shivamthakur.dev", "Instagram profile", "instagram")}
                    </ul>
                    <div class="foot-cta">
                        <a href="${p}contact" class="foot-btn foot-btn-outline">Hire me ${ARROW}</a>
                        <a href="https://wa.me/${PHONE}" class="foot-btn foot-btn-wa" target="_blank" rel="noopener">${fill("whatsapp", 20)}Chat on WhatsApp</a>
                    </div>
                </div>

                <div class="foot-divider foot-divider-top"></div>

                <div class="foot-main">
${col("Services", "Services", services)}

${col("Case Studies", "Case studies", cases)}

${col("Learn", "Learn", learn)}

${col("Company", "Company", company)}

                    <div class="foot-col">
                        <span class="foot-col-title text-caption fw-medium">Contact</span>
                        <ul class="foot-contact-list">
                            ${item("mail", `<a href="mailto:${EMAIL}" class="text-body-3">${EMAIL}</a>`)}
                            ${item("phone", `<a href="tel:+${PHONE}" class="text-body-3">${PHONE_TXT}</a>`)}
                            ${item("pin", '<span class="text-body-3">Agra, Uttar Pradesh, India</span>')}
                            ${item("clock", '<span class="text-body-3">Replies within 24 hours</span>')}
                        </ul>
                        <div class="foot-badge">
                            <span class="foot-status-dot" aria-hidden="true"></span>
                            <span><span class="foot-badge-cap text-caption">Availability</span><strong class="text-body-3">Open to freelance &amp; full-time</strong></span>
                        </div>
                    </div>
                </div>

                <div class="foot-divider"></div>

                <div class="foot-bottom">
                    <p class="text-nocopy text-caption">&copy; 2026 Shivam Thakur &middot; Full Stack Developer</p>
                    <p class="foot-bottom-mid text-caption">Based in Agra, India &middot; working worldwide</p>
                    <div class="foot-meta">
                        <a href="/sitemap.xml" class="text-caption">Sitemap</a>
                        <a href="#" class="text-caption go-top">Back to top</a>
                    </div>
                </div>
            </div>
        </footer>`;
}

// ── apply to every page
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { if (!SKIP.has(f)) walk(p); } else if (p.endsWith(".html")) files.push(p);
  }
})(ROOT);

const prefixFor = (file) => {
  const rel = relative(ROOT, file).split(sep);
  if (rel[0] === "tools") return "../"; // the two build shells are written one level deep
  return "../".repeat(rel.length - 1);
};

let changed = 0, total = 0;
for (const f of files) {
  const raw = readFileSync(f, "utf8");
  if (!/<footer\b/.test(raw)) continue;
  total++;
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const src = raw.replace(/\r\n/g, "\n");
  const out = src.replace(/<footer\b[\s\S]*?<\/footer>/, () => footer(prefixFor(f)));
  if (out !== src) { writeFileSync(f, out.replace(/\n/g, nl)); changed++; }
}
console.log(`footer: ${changed} of ${total} pages updated`);
