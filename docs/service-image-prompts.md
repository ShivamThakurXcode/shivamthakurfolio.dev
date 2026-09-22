# Service Image Generation Prompts

Light theme set. Backgrounds are flat light grey (`--bg: #EBEBEB`) with a single green accent (`--primary: #00DE51`).

> The existing `web-dev-*.webp` and `api-beckend-*.webp` files are the OLD dark style and do not
> match this sheet — regenerate all 42 so the set is consistent.

**Target:** 14 services × 3 images = 42 images. Save as `assets/images/service/<slug>-1.webp`, `-2.webp`, `-3.webp`.

---

## 1. The Style Block (PASTE THIS BEFORE EVERY PROMPT)

Every prompt below is the *subject only*. Prepend this block verbatim each time so all 42 images
come out as one consistent set.

```
STYLE: Minimal 3D isometric render on a soft light grey background (#EBEBEB, flat and even,
matching the page background exactly — no vignette, no gradient, no colour cast).
Single accent colour only: vivid green #00DE51, used sparingly on key surfaces and edges.
Objects are light neutral grey (#F0F0F0 to #DCDCDC) matte plastic with soft rounded corners,
clean white-grey highlights, and crisp green accent faces or trim. No glow, no neon emission —
this is a bright daylight product render, not a dark tech render.
Lighting: bright, soft, even studio light from upper left, large softbox quality, gentle
ambient occlusion in the crevices. Soft diffused contact shadow beneath the subject on a
light grey floor. No harsh shadows, no dark corners.
Generous negative space around the subject, subject centred and resting on or floating just
above a low light-grey platform that blends into the background.
Composition: wide 16:9, subject occupies the middle 60% of frame.
Rendering: octane / cinema4d clay-render product quality, crisp edges, no noise, no grain.
Mood: clean, premium, calm, airy, uncluttered, Apple-store bright.

ABSOLUTELY NO TEXT. No letters, no words, no numbers, no digits, no labels, no captions,
no logos, no brand marks, no UI text, no watermarks, no percentages, no code characters
readable as words. Any screen or panel shows only abstract grey and green bars, lines and
dots — never legible glyphs.

NEGATIVE PROMPT: dark background, black background, dark mode, neon, glow, emissive,
bloom, night scene, moody lighting, harsh shadows, vignette, text, typography, letters,
words, numbers, watermark, logo, signature, caption, label, UI copy, cluttered, busy,
messy, photorealistic office, real people, faces, hands, stock photo, multiple accent
colours, blue, purple, orange, red, rainbow, gradient background, pure white background,
low contrast, blurry subject, jpeg artifacts.
```

> **Aspect ratio:** `--ar 16:9` (Midjourney) / `1672 × 941` (DALL·E, SDXL, Flux) — matches the
> existing `width="1672" height="941"` in the markup.

---

## 2. Prompts by Service

### 2.1 Web Development — `web-dev-*`
*(regenerate: existing files are the old dark style)*

| # | Prompt subject |
|---|---|
| 1 | A sleek light grey browser window floating above a light grey platform, its content shown as abstract green blocks and lines. A stylised light grey rocket with green fins launches upward from behind it trailing a bright green exhaust plume and soft grey smoke. A green wireframe globe sits softly behind. A small light grey rounded server stack sits to the right with small green indicator dots. |
| 2 | Three light grey rounded browser panels stacked in staggered depth, front-to-back, each showing abstract green layout blocks. Thin green connector lines link them. A small light grey cube with a crisp green edge floats above. |
| 3 | A light grey rounded monitor shape resting on a low platform, its screen an abstract green wireframe layout grid. Small floating light grey rounded icon tiles orbit it — a green gear, a green database cylinder, a green cursor arrow — each connected by faint thin green connector lines. |

### 2.2 API & Backend Development — `api-backend-*`
*(regenerate: existing `api-beckend-2.webp` contains readable text — the `API` and `99.9%` glyphs violate the no-text rule)*

| # | Prompt subject |
|---|---|
| 1 | A central light grey rounded hub node with crisp green edges, sitting on a low platform. Six thin green connector lines radiate outward to six small light grey rounded tiles, each carrying a simple green pictogram — cloud, database cylinder, padlock, phone outline, globe wireframe, gear. No words on the hub, the hub face is blank matte light grey with a crisp green border only. |
| 2 | Two light grey rounded server racks facing each other, small green indicator dots in vertical rows. Between them an arc of green data packets — small green cubes — travelling along a curved green path. |
| 3 | An exploded stack of four frosted light grey layers hovering in depth, each layer trimmed with a crisp green edge, thin green vertical lines connecting them top to bottom, like an abstract architecture diagram with no labels. |

### 2.3 Frontend Development — `frontend-dev-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded browser frame breaking apart into its component blocks — header bar, sidebar, card grid — the pieces floating separated in 3D space, each trimmed with a crisp green edge, showing abstract green placeholder bars inside. |
| 2 | Three light grey device shapes side by side on a platform at different scales — a wide monitor, a tablet, a phone — each screen showing the same abstract green layout adapting in proportion. Soft contact shadow beneath each. |
| 3 | A light grey rounded component card floating above a platform, with a crisp green outline box snapped around it and small green corner handles, like a design-system component being measured. Faint green alignment guides extend to the frame edges. |

### 2.4 Web Design — `web-design-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded artboard floating on a platform, with a crisp green wireframe grid overlay and green alignment guides. Small light grey rounded swatch chips float beside it in a vertical row, each a different tint of green. |
| 2 | A light grey stylised pen-tool cursor drawing a smooth crisp green bezier curve through the air above a light grey platform, with small green anchor points and handle lines along the curve. |
| 3 | A stack of three light grey rounded screen layers hovering in staggered depth — wireframe layer at back shown as thin green outlines, block layout in the middle, finished layout at front with soft green filled shapes — a design progressing from sketch to final. |

### 2.5 Mobile App Development — `mobile-app-*`

| # | Prompt subject |
|---|---|
| 1 | A single light grey rounded smartphone standing upright on a low platform, screen showing an abstract green app layout of rounded cards and a bottom tab bar of green pictograms. Soft green accent trim along the phone's edges. |
| 2 | Two light grey phone shapes mirrored back to back, one leaning left one leaning right, a single green code-stream ribbon flowing from one into the other — one codebase feeding two platforms. |
| 3 | A light grey phone lying flat on a platform with abstract green UI cards lifting off its screen and floating upward in layered depth, each card trimmed with a crisp green edge. |

### 2.6 SaaS Product Development — `saas-product-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded dashboard panel floating on a platform showing abstract green chart shapes — bars rising, a smooth line curve, a donut ring — with no numbers anywhere. Small light grey tiles float around it with simple green pictograms. |
| 2 | A light grey rounded subscription-card shape floating above a platform, a crisp green recurring-arrow loop circling around it continuously, small green coin discs orbiting the loop. |
| 3 | A stepped light grey platform of three rising tiers, a small light grey rounded cube climbing from the lowest to the highest, a crisp green trail marking the path upward — a product scaling. |

### 2.7 Custom Software Development — `custom-software-*`

| # | Prompt subject |
|---|---|
| 1 | Light grey rounded puzzle-piece blocks floating in 3D space, four of them clicking together into a single form, the seams between them picked out in crisp green. |
| 2 | A light grey spreadsheet-grid plane on the left dissolving into green particles that flow rightward and reassemble into a solid light grey rounded application window with abstract green UI blocks — a spreadsheet becoming real software. |
| 3 | An exploded assembly of light grey modular blocks arranged around a central light grey core cube, each block connected to the core by a thin green connector line, like a bespoke system being composed from parts. |

### 2.8 CRM & ERP Development — `crm-erp-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey central hub disc on a platform with green orbital rings around it, and six small light grey rounded tiles on the rings carrying simple green pictograms — a person silhouette, a cart, an invoice sheet, a box, a chart bar, a gear. |
| 2 | A pipeline of five light grey rounded blocks with crisp green faces arranged left to right in a descending funnel shape, small green spheres flowing through them from wide end to narrow end. |
| 3 | A light grey rounded database cylinder at the centre of a platform, its seams picked out in crisp green, with thin green connector lines fanning out to small light grey department tiles arranged in a ring around it. |

### 2.9 E-commerce Development — `ecommerce-dev-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded shopping-cart form rendered as a minimal 3D object on a platform, its outline picked out in crisp green, with small light grey rounded product boxes floating into it from above, each trimmed with a crisp green edge. |
| 2 | A light grey storefront window shape floating above a platform showing an abstract green product grid of rounded tiles, a solid green checkout button block sitting slightly forward in depth. Button is blank — no text. |
| 3 | A light grey rounded payment-card shape floating at an angle with a green chip and a green tap-wave arc radiating from its edge, a small light grey padlock tile floating nearby with a green face. |

### 2.10 Cloud & DevOps Services — `cloud-devops-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded cloud form floating above a low platform, its underside face crisp green, with three light grey server racks below it connected upward by thin green connector lines, small green indicator dots running in vertical rows. |
| 2 | An infinite-loop ribbon shape rendered in light matte material with a bright green edge, floating above a platform, small green cubes travelling around the loop at intervals — a CI/CD cycle. |
| 3 | A light grey rounded container-box grid — nine identical light grey cubes in a 3×3 floating arrangement — each cube trimmed with a crisp green edge, a few lifted out of alignment as if being orchestrated, thin green connector lines linking them. |

### 2.11 WhatsApp Business API Development — `whatsapp-api-*`

| # | Prompt subject |
|---|---|
| 1 | A single light grey rounded chat-bubble form floating above a platform, trimmed with a crisp green edge, with abstract green message lines inside it — never readable words, only soft green bars. Small green dots trail away from its tail. |
| 2 | Three light grey rounded chat bubbles at staggered depths connected by thin green connector lines flowing into a single light grey hub tile below them, green concentrating at the hub — many conversations routed into one system. |
| 3 | A light grey rounded phone shape on a platform with a crisp green automated flow diagram floating beside it — small light grey nodes connected by green branching lines, one branch splitting into two. No labels on any node. |

### 2.12 Meta API Integration — `meta-api-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded form-card floating above a platform with abstract green input-field bars, a crisp green arrow launching from it toward a light grey hub tile at the right, small green data spheres travelling the arrow's path. |
| 2 | Two light grey rounded platform discs at different heights connected by a wide green bridge ribbon, small green cubes crossing the bridge in both directions. |
| 3 | A central light grey rounded node on a platform with four thin green connector lines fanning out to four small light grey tiles carrying minimal green pictograms — a bell, an envelope, a spreadsheet grid, a chat bubble. |

### 2.13 Performance & SEO — `performance-seo-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey circular gauge ring floating above a platform, the ring mostly filled with bright green and a small unfilled pale grey segment, a sharp charcoal needle pointing high. Completely blank centre — no numbers. |
| 2 | A light grey rounded speedometer-inspired disc on a platform with green tick marks around its edge, and a green motion-blur streak trailing off to the right as if accelerating. |
| 3 | An ascending row of five light grey rounded bars on a platform, each taller than the last, tops capped in bright green, a smooth green curve arcing upward across them. No axis labels, no numbers. |

### 2.14 Website Maintenance & Support — `website-maintenance-*`

| # | Prompt subject |
|---|---|
| 1 | A light grey rounded browser window on a platform with a green wrench and gear floating in front of it at an angle, the window content shown as calm abstract green blocks. |
| 2 | A light grey rounded shield form floating above a platform, trimmed with a crisp green edge, with a soft green accent pulse radiating outward from it, small light grey server tiles sheltered beneath it. |
| 3 | A crisp green circular refresh-arrow loop orbiting around a small light grey rounded stack of disc shapes on a platform — backups cycling. |

---

## 3. How to Use

1. Copy the **Style Block** from §1.
2. Append one row's *Prompt subject* directly after it.
3. Add `--ar 16:9 --style raw` (Midjourney) or set size `1672 × 941`.
4. Generate 4 variants, pick the cleanest, and **reject any output containing a glyph** — this
   is the most common failure mode in this style.
5. Export WebP, quality 80–85, and save to `assets/images/service/`.

## 4. Consistency Checklist

- [ ] Background is flat light grey (#EBEBEB) — not white, not gradient, not vignetted
- [ ] Objects are light neutral grey, matte — nothing dark, nothing glowing
- [ ] Only green (#00DE51) is used as accent — no second hue anywhere
- [ ] Zero readable characters
- [ ] Soft diffused contact shadow under the subject, no harsh shadows
- [ ] Generous empty space at the frame edges
- [ ] 16:9, 1672 × 941

**Page-blend test:** drop the finished image onto a `#EBEBEB` block. If you can see where the
image ends and the page begins, the background is off — regenerate.
