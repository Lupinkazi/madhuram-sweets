# Bugfix Requirements Document

## Introduction

Madhuram Sweets & Snacks, both online and in its physical shop, makes only ghee sweets. The static website presents it as a general sweets-and-namkeen shop. The catalog has five categories (Premium, Ghee, Dry Fruit, Bengali, Namkeen) with about 83 products, of which only the 21 Ghee Sweets items are real products. The navigation, homepage, page copy, meta descriptions, Open Graph tags, image alt text, gallery and image brief all advertise products the shop does not make. Customers can browse and add non-existent products to an order request, and search engines index the business under the wrong offering.

The client also wants the site to feel more elegant, smooth and simple. With one product line, the five-category navigation and filter set adds steps that no longer help anyone.

Decisions confirmed with the user:
- The catalog keeps only the current Ghee Sweets items. Premium, Dry Fruit, Bengali and Namkeen categories and their products are removed. The ghee items may be regrouped into ghee-specific groupings.
- The brand name "Madhuram Sweets & Snacks" and the "100% Veg" tagline stay unchanged.
- design.md stays the design source of truth (orange-and-green palette, Poppins, rounded Bento layout, Kathmandu Valley only, minimal forms, no invented claims). The modern-web-guidance guides set the implementation patterns for motion, accessibility, forms and responsive layout.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a visitor opens the "Our products" dropdown in the header or the "Products" list in the footer on any page THEN the system lists Premium sweets, Dry fruit sweets, Bengali sweets and Namkeen alongside Ghee sweets

1.2 WHEN a visitor views the full catalog on products.html THEN the system shows Premium, Dry Fruit, Bengali and Namkeen products and category filter chips that the shop does not make

1.3 WHEN a visitor views the homepage category section THEN the system shows five category cards, including Premium, Dry Fruit, Bengali and Namkeen, with the copy "From silver-leafed kaju katli to crisp namkeen"

1.4 WHEN a visitor views the homepage signature collection THEN the system features non-ghee items (Shahi Rasmalai, Bahubali Sandwich, Badam Caramel, Indrani, Badam Khajur, Amrit Shikanji, Badam Bake, Hazelnut Sweets)

1.5 WHEN a visitor reads the hero, story, timeline, "why choose us", footer description, products page tagline, quality page and order page copy THEN the system describes the shop as making "sweets, namkeen and snacks", savoury items, chhena sweets or dry fruit sweets, with no message that it is a ghee-sweets specialist

1.6 WHEN a search engine or social preview reads any page's title, meta description or Open Graph description THEN the system describes the offering as general sweets, namkeen, dry fruit sweets and Bengali sweets (for example "100% Veg Sweets & Namkeen in Kathmandu")

1.7 WHEN a visitor views images on the homepage or gallery, or a screen reader reads their alt text and captions THEN the system shows and describes non-ghee products (kaju katli, dry fruit, Bengali sweets, namkeen trays) as shop products

1.8 WHEN a visitor builds an order on order.html THEN the system offers non-ghee products in the product picker and the order list

1.9 WHEN the client or photographer reads image.md and README.md THEN the system's documentation asks for photos and content for Premium, Dry Fruit, Bengali and Namkeen categories and products

1.10 WHEN a visitor tries to find a sweet and place an order THEN the system makes them choose among five category filters and sub-menus for a single product line, which adds steps and visual clutter

### Expected Behavior (Correct)

2.1 WHEN a visitor opens the header product navigation or the footer product list on any page THEN the system SHALL show only ghee-sweets entries (the full ghee collection and any ghee groupings defined in the catalog data) and SHALL NOT link to Premium, Dry Fruit, Bengali or Namkeen

2.2 WHEN a visitor views the full catalog on products.html THEN the system SHALL show only the current Ghee Sweets products, with filter options only for ghee groupings that contain at least one product

2.3 WHEN a visitor views the homepage category section THEN the system SHALL present only the ghee collection or ghee groupings, with copy that describes ghee sweets and no reference to namkeen, chhena or dry fruit sweets

2.4 WHEN a visitor views the homepage signature collection THEN the system SHALL feature only ghee sweets from the catalog, and SHALL NOT label any item a bestseller or signature item unless the catalog data marks it so

2.5 WHEN a visitor reads copy on any page (index, about, products, quality, gallery, order, contact, 404) THEN the system SHALL state clearly that the shop makes only ghee sweets, SHALL NOT mention namkeen, snacks, savoury items, chhena or Bengali sweets, or dry fruit sweets as products, and SHALL NOT add unverified claims such as founding year, ghee source or certifications

2.6 WHEN a search engine or social preview reads any page's title, meta description or Open Graph description THEN the system SHALL describe the business as a ghee-sweets shop in the Kathmandu Valley while keeping the brand name "Madhuram Sweets & Snacks"

2.7 WHEN a visitor views homepage or gallery images, or a screen reader reads their alt text and captions THEN the system SHALL show and describe only ghee sweets, the shop, or ghee preparation, and SHALL keep the "demo illustration" labels on placeholder images

2.8 WHEN a visitor builds an order on order.html THEN the system SHALL offer only ghee sweets in the product picker and order list

2.9 WHEN the client or photographer reads image.md and README.md THEN the system's documentation SHALL list only the images and content needed for the ghee-sweets catalog

2.10 WHEN a visitor browses, searches and orders THEN the system SHALL offer a simpler path (fewer navigation levels and filters, clear calls to action, consistent spacing and typography per design.md) with smooth transitions of 160–650 ms using the design.md easing, and SHALL keep content visible with no spatial motion when `prefers-reduced-motion: reduce` is set

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a visitor requests any existing page URL (index.html, about.html, products.html, gallery.html, quality.html, order.html, contact.html, 404.html) THEN the system SHALL CONTINUE TO serve that page with its current section structure, landmarks and heading order

3.2 WHEN a visitor opens products.html with an old or unknown `cat` query value (for example `?cat=namkeen` or `?cat=bengali`) THEN the system SHALL CONTINUE TO fall back to the full collection without errors

3.3 WHEN a visitor has a saved order list containing product IDs that no longer exist in the catalog THEN the system SHALL CONTINUE TO drop those entries silently and keep valid ghee-sweet entries

3.4 WHEN a visitor adds ghee sweets to the order list, changes quantity or pack size, and submits the order form THEN the system SHALL CONTINUE TO validate fields, build the summary and deliver it through the configured channel (none, whatsapp, mailto or endpoint) with honest status messages

3.5 WHEN a visitor submits the contact form THEN the system SHALL CONTINUE TO validate and deliver it as it does now, asking only for name, phone, optional email and message

3.6 WHEN a visitor searches, sorts or opens a product detail dialog for a ghee sweet THEN the system SHALL CONTINUE TO return matching results, sort them, and show the product name, description, pack sizes and order action

3.7 WHEN any page renders THEN the system SHALL CONTINUE TO show the brand name "Madhuram Sweets & Snacks", the "100% Veg" tagline, the existing logo, the orange-and-green color tokens and Poppins typography from design.md

3.8 WHEN any page renders contact, hours, map or social details THEN the system SHALL CONTINUE TO read them from js/config.js with Nepal (+977, NPR, Kathmandu Valley only) settings

3.9 WHEN a visitor uses keyboard, touch or a screen reader on navigation, dialogs, the gallery lightbox, filters or forms THEN the system SHALL CONTINUE TO provide visible focus, accessible names, focus return on dialog close, and no hover-only interactions

3.10 WHEN a visitor views the site at any width from 360 px to 1920 px THEN the system SHALL CONTINUE TO render without horizontal overflow and with touch-friendly controls

3.11 WHEN a crawler reads sitemap.xml and robots.txt THEN the system SHALL CONTINUE TO receive valid files that list the same page URLs

3.12 WHEN the site is served THEN the system SHALL CONTINUE TO run as plain HTML, CSS and vanilla JavaScript with no frameworks, dependencies or build step

3.13 WHEN `config.verified` is false THEN the system SHALL CONTINUE TO withhold structured data and keep demo and placeholder labelling
