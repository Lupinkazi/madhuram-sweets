# Madhuram Sweets & Snacks — Restaurant & Sweets Website

A static, multi-page website built with HTML5, CSS3 and vanilla JavaScript only. It follows `design.md` (orange & green sweets-and-restaurant design system) and the `modern-web-guidance` skill.

The website presents the complete Madhuram Sweets & Snacks menu across 14 categories (Sweets, Thali, Quick Bites, Biryani, Chaats, Snacks & Breakfast, Soup, Burgur, Curry, South Indian, Lassi, Beverage, Extra Additional, Salad) with authentic prices in Nepalese Rupees (Rs.) and real food photography.

## Run it

- **Recommended:** serve the folder with any static server, e.g. `npx serve .`, or `node server.js`, and open the printed URL.
- Double-clicking `index.html` also works, but Chrome blocks web fonts on `file://` URLs. The site then falls back to a metric-matched Arial and the console shows a font CORS error. Everything else works.

No build step, no dependencies.

## Structure

```
index.html  about.html  products.html  quality.html  gallery.html
order.html  contact.html  404.html
robots.txt  sitemap.xml
assets/fonts    self-hosted Poppins 400/500/600/700 (OFL) + Playfair Display italic (accent only)
assets/images   food photography, menu crops, shop photos
assets/images/menu/   14 menu category folders with authentic food photography
assets/icons    favicon.svg
css/style.css        tokens, base, layout, header, components, sections, dialogs, footer
css/responsive.css   tablet / mobile / narrow-mobile layers
css/animations.css   motion (all opt-in via prefers-reduced-motion)
js/config.js    brand, contact, hours, social, ordering channel
js/data.js      14 menu categories, 101 products with exact menu prices
js/main.js      config binding, navigation, sticky header, reveal, back-to-top, toast
js/cart.js      order list (localStorage) + order page picker & summary
js/products.js  product cards, product dialog, signature collection, catalogue
js/forms.js     validation + delivery adapter
js/gallery.js   gallery page and lightbox
```

The header and footer are plain HTML repeated on every page (no layout shift, works without JavaScript). If you change a nav link, change it in all nine pages.

## Replacing demo content

| What | Where |
|---|---|
| Shop name, phone, WhatsApp, email, address, map, hours, social | `js/config.js` (also update the static fallback text in the HTML header/footer for no-JS visitors and SEO) |
| Products: add, rename, remove, prices, pack sizes | `js/data.js` → `products` |
| Product photos | put files in `assets/images/products/` and set `image: "assets/images/products/gulab-jamun.webp"`. Optional `images: [...]` enables the dialog thumbnails |
| Hero, category, story and gallery images | replace the SVGs in `assets/images/` (keep names or update the `src`/`width`/`height`) |
| Founding story, timeline, quality text | elements marked `data-placeholder` in the HTML |

Set `highlightPlaceholders: true` in `config.js` to outline every `data-placeholder` element while editing.

Products flagged `confirm: true` show a "To be confirmed" tag. Products flagged `demo: true` show a "Demo item" tag. Remove the flags once verified.

### Prices
Prices are hidden ("Price on request") until **both** `price` is set on a product **and** `ordering.showPrices` is `true`. The order summary only shows a total when every selected item has a verified price. Price sorting appears automatically when prices exist.

## Ordering & enquiries (integration point)

A frontend-only site cannot store orders or send email by itself. Both forms (order, contact) go through `SweetShop.deliver(type, payload, text)` in `js/forms.js`, controlled by `config.ordering.channel`:

| channel | behaviour | what the visitor is told |
|---|---|---|
| `"none"` (demo default) | nothing is sent | "has not been sent", with Copy summary / Call / WhatsApp / Email buttons |
| `"whatsapp"` | opens `wa.me/<contact.whatsapp>` with the summary pre-filled | "only sent when you press Send in WhatsApp" |
| `"mailto"` | opens the visitor's email app addressed to `contact.email` | same hand-off wording |
| `"endpoint"` | `POST` JSON to `ordering.endpoint` (Formspree, your API, serverless function…) | success **only** on a 2xx response; otherwise an error |

Endpoint payload: `{ type: "order" | "contact", ...fields, items?: [{ id, unit, qty, name }], submittedAt }`. Validate everything again on the server; client checks are for usability only. A honeypot field (`website`) is included for basic spam filtering.

## Structured data
`LocalBusiness` (Bakery) JSON-LD is injected only when `config.verified` is `true`. Fill in real details first. Also update `siteUrl`, `robots.txt` and `sitemap.xml` with the live domain, and add an Open Graph image (`og:image`, 1200×630 JPG) once real photography exists.

## Browser support
Baseline widely-available features are used freely. Newer features are progressive enhancements with fallbacks:
- Popover API (navigation): polyfill loaded only when unsupported.
- Scroll-driven reveal animations: IntersectionObserver fallback; content is never hidden when motion is reduced.
- `closedby="any"` on dialogs: pointer light-dismiss fallback.
- Anchor positioning for the desktop submenu: script positioning fallback.
- Cross-document view transitions: plain navigation where unsupported.

## Pre-launch checklist
- [ ] All `config.js` values replaced and `verified: true`
- [ ] Real product list, names spelled as the shop uses them
- [ ] Real photographs (WebP/AVIF, with width/height) replacing demo SVGs
- [ ] Story, timeline and quality text replaced; `data-placeholder` items resolved
- [ ] Ordering channel connected and tested end to end
- [ ] Footer line "Demo website · all business details are placeholders" removed
- [ ] Domain set in `robots.txt`, `sitemap.xml`, `config.siteUrl`

## Scope
This site serves **Nepal, Kathmandu Valley only** (Kathmandu, Lalitpur, Bhaktapur). There is no gifting or distributor feature. The contact map is a Google map (Maps JavaScript API). The key is kept out of the code: set `GOOGLE_MAPS_API_KEY` in `.env` (or your host's environment variables) and the page fetches it from `/api/maps-key`. Because the map runs in the browser, Google still receives the key from visitors, so restrict it in Google Cloud Console to your domain (HTTP referrers) and to the Maps JavaScript API. The shop pin uses `contact.mapCenter` in js/config.js. If the key is missing or rejected, the page shows a keyless Google embed. Tapping the pin opens a full-screen 3D walkthrough (js/route-3d.js) from Dhungedhara to the shop, built from OpenStreetMap buildings and roads plus an OSRM foot route stored in js/route-data.js.
