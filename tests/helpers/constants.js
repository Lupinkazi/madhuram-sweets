"use strict";
/*
 * Constants from the Bug Condition section of
 * .kiro/specs/ghee-sweets-tailoring/design.md
 */

/** The 21 current Ghee Sweets products. */
const GHEE_IDS = Object.freeze([
  "makkhan-bada", "magaj-besan-laddoo", "pinni", "mohan-thal",
  "mysore-pak", "mawa-patisa", "chandrakala", "sohan-papdi",
  "mitha-ghewar", "malphuwa", "motichoor-laddoo", "kala-jamun",
  "mithi-faini", "karachi-halwa", "malai-doda", "mawa-bati",
  "gulab-jamun", "gond-laddoo", "mawa-jalebi", "mithi-bundi",
  "kaju-mysore"
]);

const REMOVED_CATEGORIES = Object.freeze(["premium", "dry-fruit", "bengali", "namkeen"]);

/** Matched case-insensitively after stripBrand(). */
const OFF_OFFER_TERMS = Object.freeze([
  "namkeen", "snack", "savoury", "chhena", "bengali",
  "dry fruit", "dry-fruit", "premium sweets",
  "kaju katli", "rasmalai", "rasgulla"
]);

/** Category images in assets/images/ that show non-ghee products. */
const NON_GHEE_CATEGORY_IMAGES = Object.freeze([
  "category-premium-sweets.svg",
  "category-dry-fruit-sweets.svg",
  "category-bengali-sweets.svg",
  "category-namkeen.svg"
]);

const PAGES = Object.freeze([
  "index.html", "about.html", "products.html", "gallery.html",
  "quality.html", "order.html", "contact.html", "404.html"
]);

const DOCUMENTS = Object.freeze(["README.md", "image.md", "design.md"]);

/** Removes the protected brand string (plain and HTML-escaped). */
function stripBrand(text) {
  return String(text)
    .split("Madhuram Sweets &amp; Snacks").join(" ")
    .split("Madhuram Sweets & Snacks").join(" ")
    .split("msweetssnacks@gmail.com").join(" ");
}

/** OFF_OFFER_TERMS found in `text` once the brand string is removed. */
function findOffOfferTerms(text) {
  const lower = stripBrand(text).toLowerCase();
  return OFF_OFFER_TERMS.filter((term) => lower.includes(term));
}

module.exports = {
  GHEE_IDS,
  REMOVED_CATEGORIES,
  OFF_OFFER_TERMS,
  NON_GHEE_CATEGORY_IMAGES,
  PAGES,
  DOCUMENTS,
  stripBrand,
  findOffOfferTerms
};
