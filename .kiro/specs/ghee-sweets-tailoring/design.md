# Ghee Sweets Tailoring Bugfix Design

## Overview

The site presents Madhuram Sweets & Snacks as a general sweets-and-namkeen shop with five catalog categories and about 83 products. The shop makes only ghee sweets, so 62 of those products, four categories, most of the marketing copy, the SEO metadata, several images and the content brief are wrong. Visitors can add non-existent products to an order request, and search engines index the wrong offering.

The fix has three parts:

1. **Data.** `js/data.js` keeps only the 21 current Ghee Sweets products and regroups them into three ghee groups. Everything that renders products (catalog, chips, picker, homepage collection, detail dialog, order list) is already data-driven, so most of the UI corrects itself once the data is right.
2. **Static content.** The header, footer, homepage, page copy, `<title>`, meta and Open Graph descriptions, gallery markup and alt text on all eight pages are rewritten for a ghee-only shop. `README.md`, `image.md` and the root `design.md` are updated to match.
3. **Simplification and motion.** The header loses the "Our products" dropdown and gets one plain "Ghee sweets" link. The catalog filter set shrinks from six chips to four. All motion uses the existing `--ease` token (`cubic-bezier(0.22, 1, 0.36, 1)`) with durations between 160 and 650 ms. Spatial motion that currently ignores `prefers-reduced-motion` is moved behind `@media (prefers-reduced-motion: no-preference)`.

The approach is minimal. No page is added or removed, no URL changes, and no framework, dependency or build step is introduced.

## Glossary

- **Bug_Condition (C)**: A rendered page, data record, document or interaction that presents, links to, describes or allows ordering of a product, category or claim outside the ghee-sweets offering, or that forces the five-category path or out-of-range motion.
- **Property (P)**: The desired state for inputs in C: only ghee sweets are shown, linked, described and orderable, the brand and tagline are unchanged, and motion stays within 160–650 ms with the design.md easing and respects reduced motion.
- **Preservation**: Behavior outside C that must stay identical: URLs, `?cat=` fallback, order-list pruning, form validation and delivery, search, sort, detail dialog, branding, config, accessibility, responsive layout, sitemap/robots, no-build setup and demo labelling.
- **Ghee group**: One of the new catalog groups in `data.categories`. Proposed ids: `ghee-laddoo`, `ghee-dry`, `ghee-syrup`. Names and membership are a proposal for the client to confirm.
- **Full collection**: The catalog state with `cat = "all"`, shown as "All ghee sweets".
- **Legacy category id**: A `cat` value used by the old site (`premium`, `ghee`, `dry-fruit`, `bengali`, `namkeen`). None of these is a valid id after the fix.
- **`data.categories` / `data.products` / `data.signatureOrder` / `data.gallery`**: Arrays exported as `SweetShop.data` from `js/data.js`.
- **`unitRules`**: The object in `js/data.js` that overrides pack options per product id. It throws `unitRules: unknown product` if an id is missing from `products`.
- **`initCatalogue`**: The function in `js/products.js` that builds chips, reads `cat`, `q` and `sort` from the URL, filters, sorts and announces results.
- **`initSignature`**: The function in `js/products.js` that fills the homepage `[data-signature-grid]` from `data.signatureOrder`.
- **`art(product, variant)`**: The demo illustration generator in `js/products.js`. It picks a palette and shape set from `product.category`.
- **`isValid(item)` / `read()`**: The order-list functions in `js/cart.js` that drop stored lines whose product id, unit or quantity is no longer valid.
- **`initPicker`**: The function in `js/cart.js` that builds one `<details class="picker-group">` per non-empty category on order.html.
- **`config.verified`**: The flag in `js/config.js` that controls structured data and demo labelling.

## Bug Details

### Bug Condition

The bug shows up wherever the site's content or data describes the shop as anything other than a ghee-sweets shop. The root cause is in the data and the hand-written HTML: `js/data.js` defines five categories and 83 products, and each of the eight HTML pages hard-codes the five-category navigation, footer links and general sweets-and-namkeen copy. The data-driven parts (catalog, chips, picker, homepage collection) then render whatever the data contains. A smaller part of the bug is the interaction design: a dropdown and six filter chips for a single product line, a 1.4 s hero image animation, and hover image zooms that run when reduced motion is requested.

**Formal Specification:**
```
CONST GHEE_IDS = { "makkhan-bada", "magaj-besan-laddoo", "pinni", "mohan-thal",
                   "mysore-pak", "mawa-patisa", "chandrakala", "sohan-papdi",
                   "mitha-ghewar", "malphuwa", "motichoor-laddoo", "kala-jamun",
                   "mithi-faini", "karachi-halwa", "malai-doda", "mawa-bati",
                   "gulab-jamun", "gond-laddoo", "mawa-jalebi", "mithi-bundi",
                   "kaju-mysore" }                      // the 21 current Ghee Sweets
CONST REMOVED_CATEGORIES = { "premium", "dry-fruit", "bengali", "namkeen" }
CONST OFF_OFFER_TERMS = { "namkeen", "snack", "savoury", "chhena", "bengali",
                          "dry fruit", "dry-fruit", "premium sweets",
                          "kaju katli", "rasmalai", "rasgulla" }
      // matched case-insensitively, after removing the protected brand string
      // "Madhuram Sweets & Snacks" (and its HTML-escaped form)

FUNCTION isBugCondition(input)
  INPUT: input of type SiteArtifact
         // one of: DataRecord, RenderedPage, Document, Interaction
  OUTPUT: boolean

  IF input IS DataRecord THEN
    RETURN (input.kind = "product"  AND input.id NOT IN GHEE_IDS)
        OR (input.kind = "category" AND input.id IN REMOVED_CATEGORIES ∪ {"ghee"} )
        OR (input.kind = "signatureOrder" AND ANY id IN input.ids : id NOT IN GHEE_IDS)
        OR (input.kind = "gallery"  AND input.caption CONTAINS ANY OFF_OFFER_TERMS)
        OR (input.kind = "unitRule" AND input.productId NOT IN GHEE_IDS)

  IF input IS RenderedPage THEN
    text := visibleText(input) ∪ title ∪ metaDescription ∪ ogTitle ∪ ogDescription
            ∪ altTexts ∪ captions ∪ ariaLabels
    RETURN stripBrand(text) CONTAINS ANY OFF_OFFER_TERMS
        OR ANY link IN input.links : link.href MATCHES "products.html?cat=" + c
                                     FOR SOME c IN REMOVED_CATEGORIES
        OR ANY image IN input.images : image.src IN nonGheeCategoryImages
        OR NOT stripBrand(text) STATES "ghee sweets"

  IF input IS Document  (README.md, image.md, design.md) THEN
    RETURN input REQUESTS content or photos FOR ANY c IN REMOVED_CATEGORIES
        OR input LISTS "namkeen.html"

  IF input IS Interaction THEN
    RETURN (input.type = "headerProductNav" AND input.levels > 1)
        OR (input.type = "catalogFilter" AND input.chipCount > 1 + count(nonEmptyGheeGroups))
        OR (input.type = "motion" AND (input.durationMs < 160 OR input.durationMs > 650
                                       OR input.easing ≠ var(--ease)))
        OR (input.type = "motion" AND input.isSpatial
                                  AND input.runsWhen(prefers-reduced-motion: reduce))
END FUNCTION
```

`nonGheeCategoryImages` is `{ category-premium-sweets.svg, category-dry-fruit-sweets.svg, category-bengali-sweets.svg, category-namkeen.svg }` in `assets/images/`. Motion durations count the transition or animation duration only, not stagger delays. Color, border and background transitions on hover and focus are non-spatial and may keep running under reduced motion.

### Examples

- **Header dropdown (1.1).** On every page, "Our products" opens `#products-menu` with Premium sweets, Ghee sweets, Dry fruit sweets, Bengali sweets and Namkeen. Expected: a single "Ghee sweets" link to `products.html` with no dropdown.
- **Catalog (1.2).** products.html shows 83 cards and six chips (All products + five categories). Expected: 21 cards and four chips: "All ghee sweets", "Laddoos", "Barfi, pak & dry sweets", "Syrup sweets".
- **Homepage categories (1.3).** `.bento-categories` holds five cards, the first linking to `?cat=premium`. Expected: three cards linking to `?cat=ghee-laddoo`, `?cat=ghee-dry` and `?cat=ghee-syrup`, with ghee copy.
- **Homepage collection (1.4).** `signatureOrder` lists eight non-ghee ids, so the grid shows Shahi Rasmalai, Bahubali Sandwich and others. Expected: up to eight ghee sweets, with no "Signature" tag because no ghee item has `signature: true`.
- **Metadata (1.6).** products.html has `content="Browse premium sweets, ghee sweets, dry fruit sweets, Bengali sweets and namkeen..."`. Expected: a ghee-only description such as "Browse the ghee sweets made by Madhuram Sweets & Snacks in the Kathmandu Valley: laddoos, barfi and pak, and syrup sweets."
- **Gallery (1.7).** The homepage gallery preview shows `category-dry-fruit-sweets.svg` with alt "Kaju katli on a silver tray (demo illustration)". Expected: a ghee or shop image with matching alt text that keeps "(demo illustration)".
- **Order picker (1.8).** order.html has five `picker-group` sections with 83 rows and the search placeholder "e.g. katli". Expected: three groups with 21 rows and a placeholder such as "e.g. laddoo".
- **Motion (2.10).** `.hero-photo img` runs `hero-photo-in 1.4s`; `.gallery-thumb:hover img { scale: 1.04 }` runs under reduced motion. Expected: 650 ms or less, and scale only inside `prefers-reduced-motion: no-preference`.
- **Edge case: legacy link (3.2).** `products.html?cat=namkeen` or `?cat=ghee` from an old bookmark. Expected: the full collection of 21 ghee sweets, no error, and the URL rewritten to `products.html`.
- **Edge case: stale order list (3.3).** localStorage holds `[{id:"kaju-katli",unit:"250 g",qty:2},{id:"gulab-jamun",unit:"Piece",qty:3}]`. Expected: the order list shows only Gulab Jamun × 3 (Piece).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All eight page URLs, their section structure, landmarks and heading order (3.1). The homepage keeps its category, collection, story, values, gallery and final CTA sections; only their content changes. `#signature-title` keeps its id.
- Unknown or legacy `cat` values fall back to `"all"` through the existing `options.some(...)` check in `initCatalogue` (3.2).
- `isValid` and `read()` in `js/cart.js` keep dropping lines whose product id or unit is no longer valid, and keep valid ghee lines with their unit and quantity (3.3).
- Order form validation, summary text (`toLines`), totals, and delivery through `none`, `whatsapp`, `mailto` or `endpoint` with the current status messages (3.4).
- Contact form fields (name, phone, optional email, message), validation and delivery, including the `?product=` prefill (3.5).
- Catalog search (debounced 180 ms, accent-insensitive, 80-character limit), the sort options, URL state for `q` and `sort`, and the detail dialog content, pack select, quantity input, add action and focus return (3.6).
- Brand name "Madhuram Sweets & Snacks", tagline "100% Veg", logo, color tokens and Poppins from design.md (3.7).
- Contact, hours, map and social values read from `js/config.js` with +977, NPR, `region=NP` and Kathmandu Valley only. `js/config.js` is not edited (3.8).
- Keyboard, touch and screen-reader support: visible `:focus-visible`, accessible names, dialog and lightbox focus return, no hover-only interactions (3.9).
- No horizontal overflow and touch-friendly controls from 360 to 1920 px (3.10).
- `sitemap.xml` and `robots.txt` stay valid and list the same URLs. Neither needs editing (3.11).
- Plain HTML, CSS and vanilla JavaScript with no frameworks, dependencies or build step (3.12).
- While `config.verified` is false, no structured data is injected, and "demo illustration", "Demo item" and "To be confirmed" labels stay (3.13).

**Scope:**
All inputs that do not involve off-offer content, the five-category navigation path or out-of-range motion are unaffected by this fix. This includes:
- Adding, changing and removing ghee sweets in the order list, and submitting either form.
- Searching and sorting within the ghee catalog and opening a ghee product's detail dialog.
- Config-driven rendering (phone, email, address, hours, map, social links, placeholder highlighting).
- Gallery lightbox navigation, back-to-top, toast messages and the order badge.
- Non-product pages' structure and every page's header layout logic other than the removed dropdown.

## Hypothesized Root Cause

Based on the bug description and the code, the causes are:

1. **Catalog data describes a different shop.** `js/data.js` lines 22–59 define five categories and lines 65–157 define 83 products, 62 of them outside the ghee offering. Every data-driven view inherits this:
   - `initCatalogue` builds chips from `data.categories` without filtering empty groups.
   - `initPicker` builds one group per category.
   - `signatureOrder` (lines 186–189) lists only non-ghee ids.
   - `gallery` (lines 192–201) includes dry fruit, Bengali, namkeen and premium images.

2. **Navigation and copy are hard-coded per page.** The header `#products-menu` dropdown, the footer "Products" list, the footer description ("100% veg sweets, namkeen and snacks..."), page copy, `<title>`, `meta[name=description]` and `og:*` tags are written by hand in each of the eight HTML files. There is no shared template, so each page must be corrected.

3. **Hard-coded JS strings.** `initCatalogue` falls back to the tagline "Sweets and namkeen from our kitchen." and the heading "All products". The order page search placeholder is "e.g. katli". The illustration generator `art()` has palettes and drawing branches for `namkeen`, `bengali`, `dry-fruit` and `premium`, and falls back to `PALETTES.premium` for unknown categories.

4. **Data integrity trap.** `unitRules` throws on unknown ids. Removing products without removing `nuts` (`kaju-roasted`, `badam-roasted`, `pista-namkeen`, `kaju-masala`) and `weight` (`sandesh`) entries would stop `data.js` with an error and break every page.

5. **Motion outside the design.md ranges.** `css/animations.css` runs `hero-in 0.8s`, `hero-photo-in 1.4s` and `hero-seal 0.9s`, all above 650 ms. In `css/style.css`, image `scale` on `.cat-card:hover`, `.product-card:hover`, `.gallery-thumb:hover` and `.masonry figure button:hover` sits in `@media (hover: hover)` without a reduced-motion guard. Durations are written as literals instead of tokens, which makes the range hard to keep.

6. **Documentation lags behind the decision.** `README.md` mentions "sweets & namkeen" and Bengali products. `image.md` asks for photos of Premium, Dry Fruit, Bengali and Namkeen items. The root `design.md` lists those categories as homepage examples (Section 8, Section 3), names a "Products / Sweets / Namkeen" page (Section 9), and suggests `sweets.html` and `namkeen.html` (Section 14).

## Correctness Properties

Property 1: Bug Condition - Ghee-only catalog, content and simplified motion

_For any_ site artifact where the bug condition holds (isBugCondition returns true), the fixed site SHALL present only ghee sweets: `data.products` contains exactly the 21 ids in GHEE_IDS, each assigned to a ghee group; `data.categories` contains only ghee groups; every chip, picker group, homepage card, collection item, gallery caption and order option refers only to ghee sweets; every page's visible text, title, meta and Open Graph descriptions, alt text and captions contain no OFF_OFFER_TERMS outside the brand name and state that the shop makes ghee sweets; no link targets a removed category; the header product navigation has one level; the catalog shows at most one chip per non-empty ghee group plus "All ghee sweets"; and every transition or animation uses `var(--ease)` with a duration from 160 to 650 ms, with spatial motion running only under `prefers-reduced-motion: no-preference`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - Ordering, catalog behavior, branding and platform constraints

_For any_ input where the bug condition does NOT hold (isBugCondition returns false), the fixed site SHALL produce the same result as the original site, preserving: page URLs and structure; fallback of unknown `cat` values to the full collection; silent pruning of stored order lines with unknown ids and retention of valid ghee lines; order and contact form validation, summaries and channel delivery; search, sort and detail dialog results for ghee sweets; brand name, "100% Veg" tagline, logo, color tokens and Poppins; config-driven Nepal contact details; keyboard, touch and screen-reader access; overflow-free layouts from 360 to 1920 px; valid sitemap.xml and robots.txt; the no-build vanilla stack; and withheld structured data with demo labels while `config.verified` is false.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13**

## Fix Implementation

### Changes Required

Assuming the root cause analysis is correct:

**File**: `js/data.js`

**Data**: `categories`, `products`, `unitRules`, `UNITS`, `signatureOrder`, `gallery`

**Specific Changes**:
1. **Replace the five categories with three ghee groups.** Each keeps the current shape (`id`, `name`, `tagline`, `image`, `units`) and adds `art: "ghee"` so the illustration generator keeps its current ghee look. Proposed groups, to be confirmed by the client:

   | id | name | tagline | products |
   |---|---|---|---|
   | `ghee-laddoo` | Laddoos | Round sweets bound with ghee. | magaj-besan-laddoo, pinni, motichoor-laddoo, gond-laddoo, mithi-bundi |
   | `ghee-dry` | Barfi, pak & dry sweets | Fudges, pak and flaky sweets made with ghee. | mohan-thal, mysore-pak, kaju-mysore, karachi-halwa, malai-doda, sohan-papdi, mawa-patisa, mithi-faini |
   | `ghee-syrup` | Syrup sweets | Ghee-fried sweets finished in syrup. | makkhan-bada, chandrakala, mitha-ghewar, malphuwa, kala-jamun, mawa-bati, gulab-jamun, mawa-jalebi |

   All three use `image: "assets/images/category-ghee-sweets.svg"` until real photos exist, and `units: ["250 g", "500 g", "1 kg"]`. Taglines avoid ghee source, purity or certification claims.
2. **Keep only the 21 ghee products.** Delete the Premium, Dry fruit, Bengali and Namkeen blocks. Keep each ghee product's `id`, `name`, `description` and flags exactly as they are, and change only `category` to its group id. Keep the list in the current order so the "featured" sort stays the same within the collection.
3. **Clean `unitRules` and `UNITS`.** Keep the `pieces` list, which contains only ghee ids. Remove the `nuts` and `weight` lists and the unused `UNITS.nuts`. Keep the throwing check, since it guards against typos.
4. **Empty `signatureOrder`.** Set it to `[]` and add a comment that ids go here only after the client confirms signature items.
5. **Ghee-only gallery.** Remove the four non-ghee entries. Keep the shop interior, preparation, ghee sweets, celebration and kitchen entries with their "(demo illustration)" captions. Update the header comment (lines 1–20) to describe ghee groups.

**File**: `js/products.js`

**Functions**: `art`, `productCard` (unchanged), `initSignature`, `initCatalogue`

**Specific Changes**:
1. **Illustrations.** In `art()`, choose the drawing family with `getCategory(product.category)?.art || "ghee"`. Keep only the `ghee` palette and the ghee shape list (`["ball", "square", "ball", "diamond"]`). Remove the `namkeen`, `bengali`, `dry-fruit` and `premium` palettes and drawing branches. Because the random seed comes from `product.id`, each ghee product's illustration stays identical.
2. **Homepage collection.** In `initSignature`, use `data.signatureOrder` when it has valid ids. Otherwise show the first eight products of `data.products`. Cards keep `productCard`, which adds the "Signature" tag only when `p.signature` is true.
3. **Chips.** Build chip options from `data.categories.filter((c) => data.products.some((p) => p.category === c.id))`. Rename the "all" option to "All ghee sweets". Leave the `options.some(...)` fallback for `cat` unchanged, so legacy ids resolve to `"all"`.
4. **Strings.** Change the full-collection heading to "All ghee sweets" and the fallback tagline to "Every sweet we make is a ghee sweet." Keep the result-count wording.
5. **Smooth filter changes (progressive).** In `apply()`, when `document.startViewTransition` exists and `prefers-reduced-motion: no-preference` matches, wrap the DOM update in a same-document view transition and skip it on first load. Give the grid a `view-transition-name` and set the group duration to 240 ms with `var(--ease)` in `css/animations.css`. Where the API is missing, the update happens instantly as today.

**File**: `js/cart.js`

**Function**: `initPicker`

**Specific Changes**:
1. No logic change. The picker already builds one group per non-empty category, so it produces three groups with the first open. `isValid` and `read()` stay as they are and prune removed ids.

**Files**: `index.html`, `about.html`, `products.html`, `gallery.html`, `quality.html`, `order.html`, `contact.html`, `404.html`

**Specific Changes**:
1. **Header navigation.** Replace `<li class="nav-dropdown">` (the trigger button and `#products-menu`) with `<li><a href="products.html">Ghee sweets</a></li>`, and add `aria-current="page"` on products.html. `initNav` already handles an empty `triggers` list, and the collapse-to-menu behavior stays. Leave the dropdown CSS in place; it is unused but harmless, and removing it is optional cleanup.
2. **Footer.** Change the "Products" list to "All ghee sweets" (`products.html`), "Laddoos" (`?cat=ghee-laddoo`), "Barfi, pak & dry sweets" (`?cat=ghee-dry`) and "Syrup sweets" (`?cat=ghee-syrup`). Change the description to "100% veg ghee sweets for the Kathmandu Valley, made with care for everyday treats and celebrations."
3. **Metadata.** Rewrite `<title>`, `meta[name=description]`, `og:title` and `og:description` on each page to describe a ghee-sweets shop in the Kathmandu Valley, keeping "Madhuram Sweets & Snacks". Example for index.html: title "Madhuram Sweets & Snacks | Ghee Sweets in Kathmandu", description "100% veg ghee sweets made in the Kathmandu Valley. Browse laddoos, barfi and pak, and syrup sweets, then send an order request."
4. **index.html.**
   - Hero: state that the shop makes ghee sweets.
   - `.bento-categories`: three cards. The first is `cat-card--overlay` for `ghee-syrup`, then two `cat-card--split` cards for `ghee-laddoo` and `ghee-dry`. Each has a short ghee description and an "Explore …" CTA.
   - Section intro: replace "From silver-leafed kaju katli to crisp namkeen" with ghee copy.
   - Collection: change the copy to "A selection from our ghee sweets." Keep the section and `#signature-title`.
   - Story, values and final CTA: remove namkeen, chhena and dry fruit wording. Add no founding year, ghee source or certification.
   - Gallery preview: replace the dry fruit and any other non-ghee thumbnails with ghee, kitchen or shop images, and update `data-caption`, `aria-label` and `alt` to match while keeping "(demo illustration)".
5. **Other pages.** Rewrite copy on about.html (story and timeline), products.html (tagline and noscript text), quality.html, gallery.html (static figures, captions, alt), order.html (intro and the `#picker-search` placeholder "e.g. laddoo"), contact.html and 404.html so they describe ghee sweets only.

**File**: `css/style.css`

**Specific Changes**:
1. **Motion tokens.** Next to `--ease`, add `--dur-hover: 180ms`, `--dur-menu: 240ms`, `--dur-card: 300ms`, `--dur-reveal: 600ms`. Replace literal durations in transitions with these tokens. Every token is between 160 and 650 ms.
2. **Three-card category bento.** Replace the five `nth-child` rules with: child 1 `grid-column: 1 / span 7; grid-row: span 2`, children 2 and 3 `grid-column: 8 / span 5`. Check the tablet and mobile rules in the same file so the three cards stack without overflow at 360 px.
3. **Reduced-motion guard.** Move image `scale` on hover for `.cat-card`, `.product-card`, `.gallery-thumb` and `.masonry` into `@media (hover: hover) and (prefers-reduced-motion: no-preference)`. Keep shadow, border and color changes in the plain `@media (hover: hover)` block, following `.agents/skills/modern-web-guidance/guides/ui-behaviors/motion.md`.

**File**: `css/animations.css`

**Specific Changes**:
1. **Clamp durations.** `hero-in` 0.8 s → `var(--dur-reveal)` (600 ms). `hero-photo-in` 1.4 s → 650 ms. `.hero-seal` 0.9 s → 600 ms. Switch the view-transition fade-out from `ease-in` to `var(--ease)` and keep 220 ms. Menu (200 ms), dialog (280 ms), toast (300 ms) and reveal (600 ms) already fit and move to tokens.
2. **Catalog view transition.** Add a 240 ms `::view-transition-group(catalogue-grid)` rule inside the existing `no-preference` block.

**Files**: `README.md`, `image.md`, `design.md` (root)

**Specific Changes**:
1. **README.md.** Change the title to "ghee sweets website" and replace "Bengali products" in the demo-content note with "ghee groups and product details".
2. **image.md.** Remove the briefs for Premium, Dry Fruit, Bengali and Namkeen categories and products. Keep briefs for the 21 ghee sweets, one image per ghee group, the hero, shop, kitchen and ghee preparation.
3. **design.md (recommended update to the source of truth).**
   - Add to "Project overrides": "Ghee sweets only. The catalog contains only ghee sweets, grouped into ghee-specific groups. Do not show or describe namkeen, snacks, Bengali/chhena, dry fruit or premium categories. The brand name keeps the word 'Snacks'."
   - Section 8, Section 3: replace the example list with "Laddoos, Barfi, pak & dry sweets, Syrup sweets (ghee groups confirmed by the client)."
   - Section 9: rename "Products / Sweets / Namkeen" to "Products (ghee sweets)" and change "Category filters" to "Ghee group filters, only for groups with products".
   - Section 14 project structure: remove `sweets.html`, `namkeen.html` and `product-detail.html` and list the real pages.
   - Section 7.1: add "When there is a single product line, use a plain link instead of a product dropdown."
   - Section 10: note that all durations stay within 160–650 ms and point to the motion tokens.

**Assets**: The four non-ghee category SVGs in `assets/images/` stop being referenced. Deleting them is optional and needs the user's approval, because deletion is hard to reverse.

## Testing Strategy

### Validation Approach

Testing runs in two phases. First, surface counterexamples that show the bug on the unfixed code. Then verify that the fix removes them and that the behavior in the preservation list is unchanged. Tests use only the browser and Node built-ins (`node:test`, `node:assert`), with a small seeded random generator for property tests. No dependency is added to the site, and any test helper stays outside the served pages.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Load `js/data.js` in a Node `vm` context with a stub `window.SweetShop`. Scan each HTML file's text, metadata, alt text and links. Scan the CSS for durations, easing and unguarded spatial hover rules. Run all of these against the UNFIXED code to observe failures.

**Test Cases**:
1. **Catalog data test**: assert every `data.products` id is in GHEE_IDS and no category id is in REMOVED_CATEGORIES (will fail on unfixed code: 62 extra products, 4 extra categories).
2. **Navigation test**: assert no page links to `products.html?cat=` with a removed category and no page has `#products-menu` (will fail on all eight pages).
3. **Copy and metadata test**: strip the brand string, then assert no OFF_OFFER_TERMS appear in visible text, title, meta, `og:*`, alt or captions (will fail, for example on the products.html description).
4. **Homepage collection test**: assert every `signatureOrder` id is in GHEE_IDS (will fail: eight non-ghee ids).
5. **Motion test**: assert every duration in `css/style.css` and `css/animations.css` is between 160 and 650 ms and image `scale` on hover sits behind `prefers-reduced-motion: no-preference` (will fail on `hero-photo-in 1.4s` and `.gallery-thumb:hover img`).
6. **unitRules edge case**: remove the non-ghee products but leave `unitRules` unchanged, and expect `unitRules: unknown product` (confirms root cause 4).

**Expected Counterexamples**:
- Product ids such as `kaju-katli`, `shahi-rasmalai` and `dal-moth`. Category ids `premium`, `dry-fruit`, `bengali`, `namkeen`. Links `products.html?cat=namkeen`. The meta description "Browse premium sweets, ghee sweets, dry fruit sweets, Bengali sweets and namkeen…". Alt text "Kaju katli on a silver tray". Duration `1.4s`.
- Possible causes: catalog data, hard-coded per-page HTML, hard-coded JS strings and CSS durations, as listed in the root cause section.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed site produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := render_fixed(input)        // fixed data, page, document or interaction
  ASSERT expectedBehavior(result)
END FOR

FUNCTION expectedBehavior(result)
  INPUT: result of type SiteArtifact (fixed)
  OUTPUT: boolean

  RETURN set(ids(data.products)) = GHEE_IDS
     AND ALL c IN data.categories : c.id STARTS WITH "ghee-"
     AND ALL p IN data.products : getCategory(p.category) IS DEFINED
     AND ALL id IN data.signatureOrder : id IN GHEE_IDS
     AND ALL chip IN catalogChips : chip = "all" OR groupHasProducts(chip)
     AND ALL group IN orderPickerGroups : ALL row IN group : row.id IN GHEE_IDS
     AND stripBrand(pageText(result)) CONTAINS NONE OF OFF_OFFER_TERMS
     AND stripBrand(pageText(result)) STATES "ghee sweets"
     AND brandName(result) = "Madhuram Sweets & Snacks" AND tagline(result) = "100% Veg"
     AND NO link IN result : link.href TARGETS a REMOVED_CATEGORY
     AND headerProductNav.levels = 1
     AND ALL motion IN result : 160 ≤ motion.durationMs ≤ 650 AND motion.easing = var(--ease)
     AND ALL spatialMotion IN result : guardedBy(prefers-reduced-motion: no-preference)
     AND ALL placeholderImage IN result : label CONTAINS "demo illustration"
END FUNCTION
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed site produces the same result as the original site.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT render_original(input) = render_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: First record the behavior of the UNFIXED code for ghee-only inputs: order-list operations on ghee ids, search queries that match ghee names, sort keys, form submissions and config rendering. Then write property tests that replay the same generated inputs against the fixed code and compare results.

**Test Cases**:
1. **Order list preservation**: generate random sequences of `add`, `set`, `changeUnit` and `remove` on ghee ids with valid and invalid units and quantities. Assert the stored list and `toLines()` output match the unfixed code.
2. **Stale list pruning**: generate stored lists mixing ghee ids, removed ids and random strings. Assert `read()` keeps exactly the valid ghee lines.
3. **`cat` fallback**: generate `cat` values from the legacy ids, ghee group ids and random strings. Assert legacy and random values resolve to `"all"` with 21 shown cards and no error, and group ids show only that group.
4. **Search and sort**: generate queries from substrings of ghee names and descriptions, with random case and accents, across every sort key. Assert the matching set equals a name/description substring oracle and the order matches the unfixed sorter for the same products.
5. **Forms**: generate valid and invalid name, phone, email, area and message values. Assert validation errors and the summary or message body match the unfixed code for each channel (`none`, `whatsapp`, `mailto`, `endpoint` with a stubbed `fetch`).
6. **Static invariants**: brand name, tagline, logo path, `:root` color tokens, Poppins, `js/config.js` contents, sitemap and robots URLs, page landmarks and heading order, and the absence of JSON-LD while `config.verified` is false are byte- or structure-identical to the unfixed code.

### Unit Tests

- `data.js`: 21 products, three groups, every product's category resolves, `unitRules` loads without throwing, each `pieces` product offers "Piece", "Pack of 6" and "Pack of 12".
- `initCatalogue`: chips are "All ghee sweets" plus non-empty groups; `?cat=namkeen`, `?cat=ghee` and `?cat=` all show the full collection and rewrite the URL to `products.html`.
- `initSignature`: with an empty `signatureOrder`, shows eight ghee cards without a "Signature" tag; with a valid id list, shows those ids in order.
- `art()`: returns the same data URL as the unfixed code for each of the 21 ghee products and variants 0–2.
- `initPicker`: three groups, the first open, 21 rows, count pills update on selection.

### Property-Based Tests

- Generate random ghee product ids, units and quantities, and verify that the order-list state and summary match the unfixed implementation (Property 2).
- Generate random stored order lists that mix valid ghee lines with removed and garbage ids, and verify that only the valid ghee lines survive (Property 2, Requirement 3.3).
- Generate random `cat`, `q` and `sort` URL combinations, and verify that the catalog never shows a non-ghee product, never throws, and falls back to the full collection for unknown `cat` values (Properties 1 and 2).
- Generate random pages and DOM text nodes from the eight HTML files, and verify that no OFF_OFFER_TERMS appear once the brand string is removed (Property 1).

### Integration Tests

- Manual browser pass on each of the eight pages at 1920, 1440, 1024, 768, 430, 390 and 360 px: no horizontal overflow, the header link reads "Ghee sweets", the footer lists the ghee groups, and the three-card bento lays out cleanly.
- Full flow: homepage → category card → filtered catalog → detail dialog → add to order list → order page → submit with channel `none`. The status message must be honest, and focus must return to the trigger after the dialog closes.
- Keyboard and screen reader: Tab through the header (no dropdown), the chips, the dialog and the gallery lightbox. Check focus visibility, accessible names and that the result count is announced.
- Reduced motion: with `prefers-reduced-motion: reduce` emulated in DevTools, no element moves or scales on load, scroll, hover or filter change, and all content is visible. With motion allowed, hero, reveal, menu, dialog and filter transitions use `--ease` and finish within 650 ms.
- Validate `sitemap.xml` and `robots.txt` and compare them with the unfixed versions, and confirm the browser console shows no errors.
