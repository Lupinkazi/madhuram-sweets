# Sweet Shop Website — Design System & UI Specification

**Design direction:** A warm, modern sweets-house experience inspired by the friendly, rounded visual language of `sweetshop.app`, adapted for a real confectionery brand with an orange-and-green identity.

**Core visual idea:** A warm cream canvas, confident orange actions, deep green typography and feature surfaces, rounded cards, expressive food photography, and an asymmetrical Bento Grid. The result should feel welcoming, appetising, memorable, and trustworthy—not like a generic restaurant template.

**Technology constraint:** HTML5, CSS3, and Vanilla JavaScript only. Do not use frontend frameworks or CSS frameworks.

## Reference adaptation and licensing

The visual structure takes selective inspiration from the open-source Sweet Shop design guide: a warm canvas, generous vertical rhythm, centered content containers, rounded cards, Poppins typography, modular feature layouts, and responsive card stacking. The reference is a digital-comics storefront, so only reusable visual principles are adapted; its product content, publisher sections, device mockups, and marketing-specific layouts are not part of this sweets-shop website.

- **Reference:** https://opendesignmd.com/designs/sweetshop-app/DESIGN.md
- **License:** MIT; license details and notice: https://opendesignmd.com/licenses/
- **Brand override:** the reference's pink and navy colors are not used. Madhuram Sweets & Snacks must retain its approved orange-and-green identity and the color tokens defined in this file.
- **Implementation rule:** keep all colors centralized in CSS custom properties. Do not introduce pink, navy, or unrelated accent palettes as additional brand colors.



> **Project overrides (take precedence over the rest of this file):**
> - No gifting or gift-hamper features anywhere: no gift category, "Gifts and celebrations" section, corporate or wedding gift boxes.
> - No distributor / business-enquiry page or form.
> - Nepal only, Kathmandu Valley only (Kathmandu, Lalitpur, Bhaktapur). Phone numbers use +977, currency is NPR, maps use Google Maps with `region=NP`. Do not show nationwide delivery or service coverage.
> - Forms ask only for what a local order needs: name, phone, optional email, delivery area and address (order) or message (contact). Do not add account registration, distributor, corporate-order, or unrelated lead-generation fields.
> - Brand: Madhuram Sweets & Snacks, "100% Veg".
> - Ghee sweets only. The catalog contains only ghee sweets, grouped into ghee-specific groups. Do not show or describe namkeen, snacks, Bengali/chhena, dry fruit or premium categories. The brand name keeps the word 'Snacks'.
---

## 1. Brand Experience

### Brand personality

The website should communicate:

- **Tradition:** A sweets business with care, craft, and a sense of continuity.
- **Warmth:** Hospitality, sharing, everyday treats, and celebrations.
- **Quality:** Careful product presentation and clear, reliable information.
- **Fresh visual energy:** Orange creates appetite and warmth; green provides a calm, confident counterbalance.
- **Approachability:** A modern interface that feels easy to explore for customers of every age.
- **Trust:** Clear product information, genuine photography, transparent contact details, and straightforward ordering or enquiry paths.

### Desired first impression

Visitors should immediately understand what the shop offers, see appealing sweets, recognize the brand's orange-and-green identity, and find a clear way to explore products or contact the business.

### Design principles

1. Use genuine, appetising product photography as the primary visual asset.
2. Keep warm cream and white as the dominant surfaces.
3. Use orange for important actions and moments of emphasis; use green for brand structure, headings, navigation, and selected feature panels.
4. Use rounded cards and controls to create a friendly, cohesive visual language inspired by `sweetshop.app`.
5. Use an asymmetrical Bento Grid to create visual rhythm, not to force every section into cards.
6. Keep the page spacious, readable, and easy to navigate.
7. Make product discovery, contact, and ordering actions obvious on every screen size.
8. Use authentic brand content. Never invent product prices, reviews, awards, certifications, or business claims.

---

## 2. Color System

The palette combines a lively confectionery orange with a grounded green, supported by warm cream, soft peach, pale green, and clean white. The orange should feel bright and appetising without becoming visually aggressive. The green should provide the strongest structural contrast and make the overall identity feel balanced.

### Primary palette

| Token | Hex | Intended use |
|---|---|---|
| `--color-orange` | `#F28C28` | Primary CTA backgrounds, active highlights, key icons, selected labels |
| `--color-orange-hover` | `#E87924` | Hover and pressed states for orange actions |
| `--color-orange-deep` | `#B95819` | Small emphasis details, decorative accents, and strong orange surfaces when needed |
| `--color-green` | `#24543A` | Primary brand green, headings, navigation, dark feature panels, footer |
| `--color-green-soft` | `#4F7A4D` | Secondary category accents, icons, supporting highlights |
| `--color-green-light` | `#E7F0E4` | Soft feature surfaces, category backgrounds, selected states |
| `--color-cream` | `#FFF6EA` | Main page background and large light surfaces |
| `--color-peach` | `#FFE3C7` | Alternate warm surfaces, decorative details, product highlights |
| `--color-ink` | `#26372D` | Main body text on light surfaces |
| `--color-white` | `#FFFFFF` | Product cards, forms, and clean content surfaces |

### Supporting neutrals and semantic colors

| Token | Hex | Intended use |
|---|---|---|
| `--color-cream-deep` | `#F4E8D8` | Subtle section backgrounds and card variations |
| `--color-line` | `#E8DDCF` | Dividers, borders, and input outlines |
| `--color-muted` | `#68756B` | Secondary text on light surfaces |
| `--color-green-dark` | `#183D2B` | Deeper green surfaces and high-contrast footer details |
| `--color-success` | `#2F7449` | Success messages and available states |
| `--color-error` | `#B33F32` | Form errors and destructive states |
| `--color-warning` | `#996018` | Non-destructive warnings and attention states |

### Color usage ratio

Use the palette approximately as follows across the full site:

- **60–70%** warm cream, white, and light neutral surfaces.
- **15–20%** deep and soft green for structure, headings, navigation, and selected panels.
- **10–15%** orange for CTAs, active states, and visual emphasis.
- **5–10%** peach and pale green as supporting decorative or section accents.

Orange should guide attention, not cover every section. Green should create a stable visual anchor. Avoid placing large amounts of saturated orange and saturated green side by side without a neutral breathing space.

### CSS custom properties

```css
:root {
  /* Brand colors */
  --color-orange: #F28C28;
  --color-orange-hover: #E87924;
  --color-orange-deep: #B95819;
  --color-green: #24543A;
  --color-green-soft: #4F7A4D;
  --color-green-light: #E7F0E4;

  /* Surfaces and text */
  --color-cream: #FFF6EA;
  --color-cream-deep: #F4E8D8;
  --color-peach: #FFE3C7;
  --color-white: #FFFFFF;
  --color-ink: #26372D;
  --color-muted: #68756B;
  --color-line: #E8DDCF;
  --color-green-dark: #183D2B;

  /* Semantic colors */
  --color-success: #2F7449;
  --color-error: #B33F32;
  --color-warning: #996018;

  /* Typography */
  --font-body: "Poppins", Arial, sans-serif;
  --font-display: "Poppins", Arial, sans-serif;

  /* Radius */
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 30px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-card: 0 10px 30px rgba(36, 84, 58, 0.08);
  --shadow-hover: 0 16px 38px rgba(36, 84, 58, 0.14);
}
```

### Contrast and accessibility guidance

- Use white or warm cream text on deep green surfaces.
- Use deep green or ink text on orange surfaces. Do not use white text on the bright orange CTA color for normal-sized text because the contrast is too low.
- Use ink or deep green text on cream, peach, pale green, and white surfaces.
- Do not use orange text for long paragraphs or small text on cream backgrounds.
- Keep secondary text readable; do not reduce contrast simply to make it look subtle.
- Never communicate form status through color alone. Pair each status color with text and, where useful, an icon.
- Check final foreground/background combinations against WCAG contrast guidance during implementation.

---

## 3. Typography

### Font direction

Use **Poppins** as the primary typeface to match the rounded, friendly, modern character of the `sweetshop.app` reference. Use a sensible system fallback so the site remains readable if the web font does not load.

Recommended font stack:

```css
font-family: "Poppins", Arial, sans-serif;
```

Use locally hosted font files when available. Otherwise, load Poppins responsibly and include only the weights required by the design. Verify font licensing before production use.

### Type scale

| Role | Desktop guidance | Mobile guidance | Weight |
|---|---:|---:|---:|
| Hero heading | 56–76px | 38–48px | 700–800 |
| Page heading | 44–60px | 34–42px | 700–800 |
| Section heading | 34–44px | 27–34px | 700 |
| Card heading | 21–26px | 19–23px | 600–700 |
| Body | 16–18px | 15–17px | 400 |
| Supporting text | 14–15px | 13–14px | 400 |
| Eyebrow / overline | 11–13px | 11–12px | 600; uppercase with tracking |
| Navigation | 14–15px | 14–16px | 500–600 |

Use `clamp()` for fluid headings rather than abrupt breakpoint jumps.

### Typography behavior

- Keep display headings short, clear, and expressive.
- Use a maximum text width of approximately 55–65 characters for paragraphs.
- Use line-height of approximately 1.1–1.2 for display headings and 1.55–1.75 for body text.
- Use Poppins Bold or Extra Bold selectively for hero and major section headings; do not make every element heavy.
- Avoid all-caps body copy.
- Use sentence case for buttons and navigation labels. Reserve uppercase for compact eyebrow labels.
- Avoid overly tight letter spacing in body text.

---

## 4. Layout, Grid & Spacing

### Overall layout

- Center content within a maximum width of approximately 1280px to 1440px.
- Use a fluid page gutter: `clamp(18px, 4vw, 64px)`.
- Use a consistent vertical section rhythm of approximately 88–120px on desktop and 56–76px on mobile.
- Keep text blocks narrower than image areas where possible.
- Use full-bleed photography or color sections sparingly for strong editorial moments.
- Maintain a consistent relationship between card padding, grid gaps, and section spacing.
- Keep a centered content container and a predictable vertical section rhythm; approximately 96px between major desktop sections is a useful starting point, adjusted to content.
- Use a simple three-column feature-card grid when cards have equal information weight; retain the 12-column asymmetrical Bento Grid for category and editorial storytelling.
- A 24px card padding and 24px grid gap are useful defaults for larger feature cards; reduce them proportionally on smaller screens.

### Bento Grid philosophy

The Bento Grid is a signature layout pattern for category discovery, featured products, brand values, and selected gallery moments. The open-source reference contributes its friendly rounded-card treatment, centered content alignment, and clear vertical rhythm; the sweets-shop layout should retain an editorial, asymmetrical grid rather than using identical cards everywhere.

The grid should feel curated. Vary card sizes deliberately while keeping the reading order logical.

Recommended desktop grid:

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}
```

Example spans:

- Hero feature: 7 or 8 columns.
- Supporting feature: 4 or 5 columns.
- Standard cards: 3 or 4 columns.
- Wide editorial card: 6 or 8 columns.
- Full-width section feature: 12 columns.

Use explicit grid placement for major editorial compositions. Avoid arbitrary spans that make the reading order confusing.

### Responsive grid behavior

- **Large desktop (1200px+):** 12-column Bento Grid, varied spans, generous whitespace.
- **Tablet (768px–1199px):** 6-column grid, usually two cards per row.
- **Mobile (below 768px):** 2-column grid for compact category tiles; use full-width rows for featured content and important CTAs.
- **Narrow mobile (below 390px):** Stack cards when images or text become cramped.

Preserve a logical reading order in the HTML. CSS placement must not make keyboard or screen-reader navigation confusing.

### Spacing scale

Use a consistent spacing scale based on 4px:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}
```

---

## 5. Shape, Borders & Elevation

### Corner radius

Rounded geometry is an important part of the reference style. Keep it consistent across buttons, cards, image containers, forms, and small labels.

| Token | Value | Usage |
|---|---:|---|
| `--radius-sm` | 10px | Inputs, small labels, compact controls |
| `--radius-md` | 16px | Standard cards and buttons |
| `--radius-lg` | 22px | Bento cards and image containers |
| `--radius-xl` | 30px | Large feature cards and hero panels |
| `--radius-pill` | 999px | Pills, tags, and compact CTA variants |

### Borders and shadows

- Prefer thin warm-neutral borders over heavy outlines.
- Use soft, low-opacity green-tinted shadows only where they clarify layering.
- Product cards should remain visually clean and image-led.
- Avoid excessive glassmorphism. The identity should feel warm, tactile, and food-focused.
- Use orange outlines or pale green surfaces for selected states; avoid decorating every card with a bright border.

Suggested tokens:

```css
:root {
  --border-subtle: 1px solid var(--color-line);
  --shadow-card: 0 10px 30px rgba(36, 84, 58, 0.08);
  --shadow-hover: 0 16px 38px rgba(36, 84, 58, 0.14);
}
```

### Decorative visual language

- Rounded blocks, soft organic curves, and occasional icing- or syrup-inspired flowing shapes may be used as section transitions.
- Keep decorative shapes subtle and behind content.
- Do not use decorative illustrations in place of real product photography.
- Avoid excessive blobs, gradients, and floating elements that compete with product images.

---

## 6. Imagery & Art Direction

### Photography style

Photography is the most important visual asset on the website.

Use:

- Real product photography supplied by the shop wherever possible.
- Natural, recognizable sweet textures and details.
- Soft directional studio light.
- Warm highlights and gentle shadows.
- Cream, peach, pale green, or natural food-styling backgrounds.
- Premium product presentation and packaging photography supplied by the shop.
- Close-up photographs that show texture without making food look artificial.
- Consistent visual quality and color treatment across product collections.

### Image composition

- **Hero:** One strong signature sweets composition with enough negative space for text.
- **Category cards:** Clear product grouping with a recognizable subject.
- **Product cards:** Consistent angle, crop, and background wherever possible.
- **Product collections:** Clear product groupings, trays, and authentic in-store or serving context.
- **About:** Real shop, team, preparation, or heritage photographs.
- **Quality:** Authentic preparation and hygiene-process photographs, when supplied and approved.

### Image implementation

- Prefer WebP or AVIF with appropriate fallbacks where required.
- Specify width and height or an aspect ratio to reduce layout shifts.
- Lazy-load below-the-fold images.
- Do not lazy-load the primary hero image if it is the Largest Contentful Paint element.
- Use descriptive filenames and meaningful alt text.
- Keep image focal points visible on mobile with `object-position` adjustments.
- Avoid repeating the same image across multiple product cards unless the image is intentionally part of a shared category treatment.

### Avoid

- Cartoon-style food illustrations as the primary product imagery.
- Plastic-looking or excessively glossy sweets.
- Unrelated restaurant or café photography.
- Over-saturated colors and aggressive filters.
- Repeating the same placeholder image throughout the catalogue.
- AI-generated imagery presented as actual product photography.

Temporary imagery must be clearly treated as replaceable placeholder content until the client supplies genuine photographs.

---

## 7. Core Components

### 7.1 Header and navigation

**Desktop:**

- Optional slim utility bar for verified contact details or announcements.
- Main header with logo on the left, navigation in the center/right, and a prominent orange Order Now action.
- Use a cream or white header surface with deep green navigation text.
- Sticky behavior after scrolling, with a subtle background and border transition.
- Dropdown for product categories with clear hover, click, and keyboard behavior.
- When there is a single product line, use a plain link instead of a product dropdown.

**Mobile:**

- Compact logo and menu toggle.
- Full-height or dropdown navigation panel with a white or cream surface.
- Clear close control and visible focus states.
- Prominent order/contact action within easy reach.
- No hover-only interactions.

### 7.2 Buttons

**Primary button:**

- Orange background (`--color-orange`).
- Deep green or ink text for accessible contrast.
- Medium-to-bold label.
- Rounded rectangular or pill shape, used consistently.
- Subtle hover lift or shade transition.

**Secondary button:**

- White, cream, or transparent background.
- Deep green text and a subtle warm-neutral or green border.

**Green button:**

- Deep green background.
- White text.
- Use for secondary high-emphasis actions or actions on orange/cream sections when visual balance requires it.

**Dark-surface button:**

- Orange background with deep green text, or transparent white border with white text.

All buttons must have clear hover, active, focus-visible, and disabled states. Ensure the full clickable area is comfortable on touch screens.

### 7.3 Bento feature card

Each card can use:

- A distinct cream, white, pale green, peach, or deep green background.
- Short eyebrow label.
- Strong title.
- One concise supporting sentence.
- Optional link or CTA.
- Product or lifestyle image where relevant.
- Image overlay only when text contrast is sufficient.

Do not put long paragraphs inside small cards. Keep card layouts consistent while allowing different sizes and image positions.

### 7.4 Product card

**Required elements:**

- Product image.
- Product name.
- Optional short description.
- Optional verified price and unit.
- View Details, Enquire, or Add to Order action, depending on the actual ordering capability.

**Design behavior:**

- Consistent image ratio within each product collection.
- White or warm cream surface with a soft border and rounded corners.
- Subtle image zoom on hover; do not crop away the product.
- Clear focus state for keyboard users.
- No invented prices, ratings, stock status, ingredients, or product claims.

### 7.5 Category card

**Required elements:**

- Distinctive product photograph.
- Category title.
- Short description.
- Explore link.

Use different grid spans for visual hierarchy. Use pale green or peach as supporting surfaces, not as a substitute for readable text and useful product imagery.

### 7.6 Forms

- White or cream field surfaces.
- Clear labels above inputs.
- Warm-neutral border.
- Deep green focus ring.
- Inline validation messages.
- Visible required-field indicators.
- Accessible success and error messages.
- Comfortable field height and spacing on mobile.

Do not rely on placeholder text as the only label.

### 7.7 Badges and labels

Use small labels for details such as Signature, Festive, New, or product category, but only when those details are accurate and useful. Use pale green, peach, or a restrained orange treatment. Avoid excessive badges and do not use color alone to communicate meaning.

### 7.8 Social media pills

- Use a consistent pill shape and spacing.
- Prefer deep green or neutral surfaces for a unified brand appearance.
- Official platform colors may be used only when they improve recognition and do not clash with the palette.
- Use accessible labels and links with clear focus states.

---

## 8. Homepage Design Specification

The homepage should establish the brand, guide product discovery, and make ordering or enquiry easy. Use a clear vertical flow with occasional color shifts and rounded Bento compositions.

### Section 1 — Hero

**Layout:**

- Full-width warm cream canvas.
- Small eyebrow such as `TRADITION • TASTE • CELEBRATION`.
- Large, bold heading focused on the shop's real brand promise.
- Supporting copy about the products and customer experience; use approved brand wording.
- Primary CTA: Explore Our Sweets.
- Secondary CTA: Order Now or Contact Us.
- Large signature sweets photograph in an asymmetric image panel.
- Optional small supporting card for a verified signature product or brand fact.

The hero should feel spacious and inviting, not crowded. A height around 75–90vh is a guide, not a fixed requirement; adapt to the actual content and mobile viewport. Use orange to emphasize the primary action and green to anchor the headline or a supporting feature.

### Section 2 — Trust and heritage strip

Show three or four concise trust points, such as:

- Traditional craftsmanship.
- Carefully selected ingredients.
- Quality-focused preparation.
- Made for celebrations.

Use factual claims only. Add years of heritage, certifications, or sourcing statements only after verification.

### Section 3 — Explore categories

Create the primary Bento Grid using the categories that the client actually sells:

- Laddoos, Barfi, pak & dry sweets, Syrup sweets (ghee groups confirmed by the client).

Use one large feature tile and several smaller supporting tiles. Each tile should use an appropriate photograph, a short title, and an Explore link. Do not display categories that the shop does not offer.

### Section 4 — Signature collection

Show a curated row or Bento arrangement of best-selling or signature products.

Each product entry must be editable and use verified product information. Provide a path to the full catalogue. Do not label an item a bestseller unless the client confirms it.

### Section 5 — Brand story

Use a split editorial layout:

- One large real photograph of the shop, team, or sweets preparation.
- A compact heritage or story label.
- A strong heading.
- Two short paragraphs maximum.
- Discover Our Story CTA.

### Section 6 — Why customers choose us

Use three or four Bento cards for the brand's verified strengths, for example:

- Quality ingredients.
- Traditional recipes.
- Careful preparation.
- Friendly service.

Do not make unsupported health, freshness, hygiene, or certification claims.

### Section 7 — Testimonials

Only display genuine customer reviews with permission. If none are supplied, omit the section or use a neutral customer-feedback invitation rather than inventing testimonials.

### Section 8 — Gallery preview

Show a small curated selection of authentic product, store, team, and event photographs. Link to the full gallery.

### Section 9 — Final call to action

Use a clear, memorable invitation to explore, order, or contact the shop. Example direction: `Make Every Celebration Sweeter.`

Include clear Order Now and Contact Us actions. Keep the section visually distinct with deep green, cream, and restrained orange.

### Section 10 — Footer

Include:

- Brand logo and short description.
- Product category links.
- About and quality links.
- Contact information.
- Business hours, if verified.
- Social media links.
- Copyright notice.

Use deep green as the main footer surface with cream typography and restrained orange details.

---

## 9. Supporting Pages

### About Us

- Brand introduction.
- Verified company history and timeline.
- Founder or family story where approved.
- Craftsmanship and values.
- Team or shop photography.
- CTA to explore products or contact the business.

### Products (ghee sweets)

- Clear category navigation.
- Product search.
- Ghee group filters, only for groups with products.
- Optional sorting when enough data exists.
- Product grid with consistent cards.
- Product detail view or dedicated product detail page.
- Enquiry or ordering action.

Use product data that can be maintained from a simple JavaScript data file or structured object. Do not hard-code each card's layout separately.

### Product detail

- Large product image or gallery.
- Product name and category.
- Verified description and ingredients where supplied.
- Verified price and unit, if applicable.
- Available pack sizes, if supplied.
- Quantity control only when ordering supports it.
- Clear enquiry or order CTA.

### Quality

- Quality philosophy.
- Ingredient sourcing, if documented.
- Preparation and hygiene practices, if documented.
- Quality checks, if documented.
- Certificates only when real and current.

### Gallery

- Responsive image grid or masonry layout.
- Filters only where enough images exist.
- Accessible lightbox with previous/next controls.
- Escape-to-close and keyboard navigation.
- Descriptive captions when supplied.

### Order / Enquiry

- Customer contact details.
- Product selection, where supported.
- Quantity and pack-size selection, where supported.
- Clear order summary.
- Validation and confirmation states.
- Integration-ready submission behavior.

A static frontend alone cannot securely save orders, send emails, or process payments. Connect the form to an approved backend, form service, or WhatsApp workflow before presenting it as a live order system. Never show a false success state when submission has not occurred.

### Contact

- Verified address, phone, email, and business hours.
- Contact form.
- Map embed using the correct business location.
- WhatsApp link only when the client provides the correct number.

---

## 10. Motion & Interaction

### Motion style

Motion should feel smooth, friendly, restrained, and intentional. It should support visual hierarchy rather than compete with the food photography.

Recommended interactions:

- Header background transition on scroll.
- Small staggered reveal for Bento cards.
- Subtle image scale on hover.
- Button color and elevation transitions.
- Smooth dropdown and mobile-menu transitions.
- Lightbox transitions.
- Small count or status transitions only when meaningful.
- Optional subtle movement in decorative icing/syrup shapes; keep it low-key and never distracting.

### Timing guidance

- Small hover transitions: 160–220ms.
- Menu transitions: 200–280ms.
- Card reveal: 400–650ms.
- Use gentle easing such as `cubic-bezier(0.22, 1, 0.36, 1)`.
- All durations stay within 160–650ms. Use the motion tokens in `css/style.css` instead of literal values: `--dur-hover` (180ms), `--dur-menu` (240ms), `--dur-card` (300ms) and `--dur-reveal` (600ms), all with `var(--ease)`.

### Performance and accessibility

- Prefer CSS transitions and the Intersection Observer API.
- Avoid scroll handlers that perform expensive layout calculations.
- Animate `transform` and `opacity` where possible.
- Respect `prefers-reduced-motion: reduce`.
- Ensure motion does not hide content or block interaction.

---

## 11. Responsive Behavior

### Desktop — 1200px and above

- Full 12-column Bento system.
- Wide editorial hero.
- Larger image crops and generous gutters.
- Desktop navigation and dropdowns.
- Balanced use of green feature panels and orange actions.

### Tablet — 768px to 1199px

- 6-column grid.
- Reduce heading sizes and gaps.
- Keep image/text relationships clear.
- Use compact navigation where necessary.
- Maintain comfortable tap targets.

### Mobile — below 768px

- Single-column editorial sections where needed.
- Two-column category tiles only when images and labels remain legible.
- Stack hero content with clear CTA placement.
- Full-width buttons where helpful.
- Compact cards and reduced section spacing.
- Mobile menu with touch-friendly controls.

### Narrow mobile — below 390px

- Avoid cramped two-column layouts.
- Reduce decorative elements.
- Keep body text comfortably readable.
- Ensure buttons and fields fit without horizontal scrolling.

### Required viewport checks

Test at minimum:

- 1920 × 1080
- 1440 × 900
- 1024 × 768
- 768 × 1024
- 430 × 932
- 390 × 844
- 360 × 800

The design must not create horizontal overflow at any supported width.

---

## 12. Accessibility & Usability

- Use semantic HTML landmarks: `header`, `nav`, `main`, `section`, and `footer`.
- Maintain logical heading order.
- Provide meaningful alt text for informative images; use empty alt text for purely decorative images.
- Ensure keyboard access to all navigation, dialogs, filters, and controls.
- Use visible `:focus-visible` styling.
- Associate form labels and validation messages with their inputs.
- Use buttons for actions and links for navigation.
- Maintain adequate contrast for orange, green, and neutral combinations.
- Do not rely on color alone for selected, error, or success states.
- Ensure modals manage focus and return focus to the trigger when closed.
- Respect reduced-motion settings.
- Ensure interactive elements have accessible names and adequate touch-target sizes.

---

## 13. Content & Brand Data Rules

All brand-specific information must be replaceable without redesigning the site.

Keep the following client data configurable:

- Shop name and logo.
- Tagline.
- Brand story and founding year.
- Contact information.
- Address and map location.
- Business hours.
- Product names and categories.
- Product descriptions and images.
- Prices, pack sizes, and availability.
- Customer testimonials.
- Certifications and awards.
- Social media URLs.

### Accuracy rules

1. Do not transfer another website's company history, founders, contact details, prices, testimonials, or certifications to the new client.
2. Do not invent product prices, reviews, awards, or quality claims.
3. Mark missing content as a clearly named placeholder during development.
4. Use real client photographs wherever possible.
5. Obtain permission for logos, testimonials, and third-party photographs.
6. Make the brand palette configurable through CSS custom properties rather than scattering color values throughout stylesheets.

---

## 14. HTML, CSS & JavaScript Implementation Guidance

### HTML

- Use semantic, accessible markup.
- Keep content order logical.
- Use reusable class naming conventions.
- Add meaningful metadata and page titles.
- Keep important content available even when JavaScript is unavailable, wherever practical.

### CSS

Organize styles into clear sections:

1. Design tokens and reset.
2. Base typography.
3. Layout containers and spacing.
4. Header and navigation.
5. Buttons and form controls.
6. Bento Grid utilities.
7. Product and category cards.
8. Page sections.
9. Footer.
10. Motion and responsive media queries.

Use CSS custom properties for colors, typography, radii, shadows, and spacing. Avoid unnecessary specificity and duplicated rules. Keep orange and green usage consistent with the color system in this document.

### JavaScript

Use Vanilla JavaScript for:

- Mobile navigation.
- Dropdown menus.
- Product search and filtering.
- Product detail dialogs.
- Gallery lightbox.
- Quantity controls and order summary, when applicable.
- Form validation and real submission integration.
- Back-to-top control.

Keep data separate from rendering logic. Avoid inline event handlers. Use event listeners and small, focused functions.

### Suggested project structure

```text
sweet-shop/
├── index.html
├── about.html
├── products.html
├── quality.html
├── gallery.html
├── order.html
├── contact.html
├── 404.html
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── pages.css
│   ├── motion.css
│   └── responsive.css
├── js/
│   ├── data.js
│   ├── navigation.js
│   ├── products.js
│   ├── gallery.js
│   ├── forms.js
│   └── main.js
└── README.md
```

This is a suggested structure; keep it proportionate to the actual project and do not create empty or unnecessary files.

---

## 15. Quality Checklist

Before calling the website complete, verify:

### Visual quality

- [ ] Orange and green palette is applied consistently.
- [ ] Warm cream and white remain the primary canvas.
- [ ] Orange is reserved mainly for CTAs, highlights, and selected accents.
- [ ] Deep green provides readable typography and structural contrast.
- [ ] Rounded cards and controls feel consistent with the chosen visual direction.
- [ ] Bento Grid cards have clear visual hierarchy and logical reading order.
- [ ] Food photographs are realistic, high quality, and relevant.
- [ ] Typography and spacing are consistent.
- [ ] No section feels overcrowded.

### Functionality

- [ ] Navigation links work.
- [ ] Mobile navigation opens and closes correctly.
- [ ] Dropdowns work with mouse, touch, and keyboard.
- [ ] Product search and filters work when present.
- [ ] Product detail interactions work.
- [ ] Gallery lightbox works and is keyboard accessible.
- [ ] Forms validate and communicate their actual submission status.
- [ ] No dead buttons or placeholder links remain in the finished site.

### Responsive quality

- [ ] Layout works at all required viewport sizes.
- [ ] No horizontal overflow.
- [ ] Images crop appropriately.
- [ ] Text remains readable.
- [ ] Controls are touch-friendly.

### Technical quality

- [ ] No frontend framework is used.
- [ ] No unnecessary dependencies are added.
- [ ] No console errors remain.
- [ ] Images have dimensions and appropriate loading behavior.
- [ ] Reduced-motion preferences are respected.
- [ ] Semantic HTML and visible focus states are present.
- [ ] SEO metadata is included on each page.
- [ ] Color contrast is checked for actual text/background combinations.

---

## 16. Final Creative Direction

The finished website should feel like a welcoming, well-established sweets house presented through a fresh, contemporary digital experience.

It should not look like a generic restaurant template, a supermarket catalogue, or an old-fashioned business website. It should also avoid copying unrelated app-specific content or illustrations from the visual reference.

The signature experience is:

**Warm cream surfaces. Confident orange calls to action. Deep green typography and feature panels. Soft rounded cards. A curated asymmetrical Bento Grid. Beautiful authentic sweets photography. Friendly Poppins typography. Clear product discovery and ordering journeys.**

Every visual decision should reinforce the products, the craft, the brand's orange-and-green identity, and the joy of sharing sweets.
