"use strict";
/*
 * Property 1: Bug Condition - Ghee-only catalog, content and simplified motion
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10**
 * (expected behavior: Requirements 2.1-2.10)
 *
 * Encodes expectedBehavior() from .kiro/specs/ghee-sweets-tailoring/design.md.
 * On the unfixed site these tests FAIL; the failures are the counterexamples
 * that prove the bug. After the fix they must pass.
 *
 * The bug is deterministic, so each property is scoped to the concrete
 * artifacts (8 pages, data.js records, 2 stylesheets, 3 documents). The seeded
 * generator visits the full set once and then extra random samples.
 * Replay with: SEED=<seed> node --test tests/bug-condition.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  GHEE_IDS, REMOVED_CATEGORIES, NON_GHEE_CATEGORY_IMAGES, PAGES, DOCUMENTS,
  stripBrand, findOffOfferTerms
} = require("./helpers/constants");
const { readText, loadData, loadDataFromSource, readPage, pageTextFields } = require("./helpers/load");
const { parseRules, collectTimeTokens, extractMotions, hasNoPreferenceGuard } = require("./helpers/css");
const { getSeed, createRng } = require("./helpers/prng");

const SEED = getSeed();
const rng = createRng(SEED);
console.log(`[bug-condition] seed=${SEED}`);

const EXTRA_SAMPLES = 40;
const MAX_LISTED = 40;

/** Fails with a readable list of counterexamples (deduplicated). */
function assertNone(violations, label) {
  const unique = [...new Set(violations)];
  if (unique.length) {
    const shown = unique.slice(0, MAX_LISTED).map((v) => `  - ${v}`).join("\n");
    const more = unique.length > MAX_LISTED ? `\n  ... and ${unique.length - MAX_LISTED} more` : "";
    assert.fail(`${label}: ${unique.length} counterexample(s) (seed=${SEED})\n${shown}${more}`);
  }
}

const gheeSet = new Set(GHEE_IDS);
const removedCatLink = new RegExp(`products\\.html\\?cat=(${REMOVED_CATEGORIES.map((c) => c.replace("-", "\\-")).join("|")})(?![\\w-])`, "i");

/* ------------------------------------------------------------------ */
describe("Property 1 / data: js/data.js describes only ghee sweets", () => {
  const data = loadData();

  it("set(ids(products)) equals the 21 GHEE_IDS", () => {
    const ids = data.products.map((p) => p.id);
    const extra = rng.fullThenSampled(ids, EXTRA_SAMPLES).filter((id) => !gheeSet.has(id)).map((id) => `extra product "${id}"`);
    const missing = GHEE_IDS.filter((id) => !ids.includes(id)).map((id) => `missing ghee product "${id}"`);
    assertNone([...extra, ...missing], `products (${ids.length} total)`);
  });

  it("every category id starts with 'ghee-'", () => {
    const bad = rng.fullThenSampled(data.categories, EXTRA_SAMPLES)
      .filter((c) => !c.id.startsWith("ghee-"))
      .map((c) => `category "${c.id}" (${c.name})`);
    assertNone(bad, "categories");
  });

  it("every product's category resolves to a defined ghee group", () => {
    const catIds = new Set(data.categories.map((c) => c.id));
    const bad = rng.fullThenSampled(data.products, EXTRA_SAMPLES)
      .filter((p) => !catIds.has(p.category) || !p.category.startsWith("ghee-"))
      .map((p) => `${p.id} -> "${p.category}"`);
    assertNone(bad, "product categories");
  });

  it("every signatureOrder id is a ghee sweet", () => {
    const bad = rng.fullThenSampled(data.signatureOrder, EXTRA_SAMPLES)
      .filter((id) => !gheeSet.has(id))
      .map((id) => `signatureOrder "${id}"`);
    assertNone(bad, "signatureOrder");
  });

  it("no gallery caption contains an off-offer term", () => {
    const bad = rng.fullThenSampled(data.gallery, EXTRA_SAMPLES)
      .map((g) => [g, findOffOfferTerms(g.caption)])
      .filter(([, terms]) => terms.length)
      .map(([g, terms]) => `"${g.caption}" [${terms.join(", ")}] (${g.src})`);
    const images = data.gallery
      .filter((g) => NON_GHEE_CATEGORY_IMAGES.some((img) => g.src.endsWith(img)))
      .map((g) => `gallery src ${g.src}`);
    assertNone([...bad, ...images], "gallery");
  });
});

/* ------------------------------------------------------------------ */
describe("Property 1 / pages: all 8 pages present a ghee-sweets shop", () => {
  const pages = PAGES.map(readPage);
  const pageOrder = rng.fullThenSampled(pages, EXTRA_SAMPLES);

  it("stripBrand(text) contains no OFF_OFFER_TERMS (text, title, meta, og, alt, aria-label, captions)", () => {
    const bad = [];
    for (const page of pages) {
      const fields = pageTextFields(page);
      for (const [kind, text] of rng.fullThenSampled(fields, 10)) {
        const terms = findOffOfferTerms(text);
        if (terms.length) bad.push(`${page.page} ${kind}: "${text.slice(0, 140)}" [${terms.join(", ")}]`);
      }
    }
    assertNone(bad, "off-offer copy");
  });

  it("every page states that the shop makes ghee sweets", () => {
    const bad = pageOrder
      .filter((p) => {
        const all = pageTextFields(p).map(([, t]) => t).join(" ");
        return !/ghee sweets/i.test(stripBrand(all));
      })
      .map((p) => `${p.page} never says "ghee sweets"`);
    assertNone(bad, "ghee statement");
  });

  it("no link targets a removed category", () => {
    const bad = [];
    for (const page of pageOrder) {
      for (const href of page.hrefs) if (removedCatLink.test(href)) bad.push(`${page.page} href="${href}"`);
    }
    assertNone(bad, "removed-category links");
  });

  it("header product navigation has one level (no #products-menu or .nav-dropdown)", () => {
    const bad = [];
    for (const page of pageOrder) {
      for (const t of page.tags) {
        if (t.attrs.id === "products-menu") bad.push(`${page.page} <${t.tag} id="products-menu">`);
        if ((t.attrs.class || "").split(/\s+/).includes("nav-dropdown")) bad.push(`${page.page} <${t.tag} class="nav-dropdown">`);
      }
    }
    assertNone(bad, "header dropdown");
  });

  it("no image uses a non-ghee category illustration", () => {
    const bad = [];
    for (const page of pageOrder) {
      for (const src of page.srcs) {
        if (NON_GHEE_CATEGORY_IMAGES.some((img) => src.endsWith(img))) bad.push(`${page.page} src="${src}"`);
      }
    }
    assertNone(bad, "non-ghee images");
  });

  it("placeholder images keep the 'demo illustration' label", () => {
    const bad = [];
    // Captions of real photographs (non-SVG gallery entries) do not need the label.
    const realCaptions = new Set(
      [...readText("js/data.js").matchAll(/src:\s*"[^"]+\.(?:jpe?g|webp|png)"[^}]*?caption:\s*"([^"]+)"/gi)].map((m) => m[1])
    );
    for (const page of pageOrder) {
      for (const img of page.images) {
        const placeholder = /^assets\/images\/.+\.svg$/i.test(img.src);
        if (placeholder && img.alt && !/demo illustration/i.test(img.alt)) bad.push(`${page.page} ${img.src} alt="${img.alt}"`);
      }
      for (const cap of page.captions) if (!realCaptions.has(cap) && !/demo illustration/i.test(cap)) bad.push(`${page.page} data-caption="${cap}"`);
    }
    assertNone(bad, "demo labels");
  });
});

/* ------------------------------------------------------------------ */
describe("Property 1 / documents: README.md, image.md and design.md brief only ghee sweets", () => {
  // A line that mentions a removed category only to rule it out is allowed.
  const NEGATION = /\b(do not|don't|never|not|no longer|removed?)\b/i;

  it("no line requests content or photos for removed categories; namkeen.html is not listed", () => {
    const bad = [];
    for (const doc of DOCUMENTS) {
      const lines = readText(doc).split(/\r?\n/);
      const indexed = lines.map((text, i) => ({ text, n: i + 1 }));
      for (const { text, n } of rng.fullThenSampled(indexed, EXTRA_SAMPLES)) {
        if (/namkeen\.html/i.test(text)) bad.push(`${doc}:${n} lists namkeen.html`);
        const terms = findOffOfferTerms(text);
        if (terms.length && !NEGATION.test(stripBrand(text))) bad.push(`${doc}:${n} [${terms.join(", ")}] "${text.trim().slice(0, 120)}"`);
      }
    }
    assertNone(bad, "documents");
  });
});

/* ------------------------------------------------------------------ */
describe("Property 1 / motion: 160-650 ms, var(--ease), spatial hover gated by reduced motion", () => {
  const files = ["css/style.css", "css/animations.css"];
  const rules = files.flatMap((f) => parseRules(readText(f), f));
  const tokens = collectTimeTokens(rules);
  const motions = extractMotions(rules, tokens);

  it("every transition/animation duration is 160-650 ms and uses var(--ease)", () => {
    const bad = [];
    for (const m of rng.fullThenSampled(motions, EXTRA_SAMPLES)) {
      if (m.durationMs === null) continue; // no duration: nothing animates
      const where = `${m.file} ${m.selector} { ${m.prop}: ${m.segment} }`;
      if (m.durationMs < 160 || m.durationMs > 650) bad.push(`${where} -> ${m.durationMs} ms`);
      if (!m.discrete && m.easing !== "n/a" && m.easing !== "var(--ease)") bad.push(`${where} -> easing ${m.easing || "default (ease)"}`);
    }
    assertNone(bad, "motion timing");
  });

  it("hover scale/transform/translate on images runs only under prefers-reduced-motion: no-preference", () => {
    const spatial = /^(scale|transform|translate|rotate)$/;
    const bad = rules
      .filter((r) => /:hover/.test(r.selector) && /\bimg\b/.test(r.selector))
      .filter((r) => r.decls.some((d) => spatial.test(d.prop) && !/^none$/i.test(d.value)))
      .filter((r) => !hasNoPreferenceGuard(r.ancestors))
      .map((r) => `${r.file} ${r.ancestors.join(" > ") || "(top level)"} > ${r.selector} { ${r.decls.map((d) => `${d.prop}: ${d.value}`).join("; ")} }`);
    assertNone(bad, "unguarded image hover motion");
  });
});

/* ------------------------------------------------------------------ */
describe("Root cause 4 edge case: unitRules guards product ids", () => {
  it("removing non-ghee products while keeping unitRules throws 'unitRules: unknown product'", () => {
    const source = readText("js/data.js");
    const nonGheeLine = new RegExp(`^\\s*p\\("[^"]+",\\s*"[^"]*",\\s*"(${REMOVED_CATEGORIES.join("|")})".*$`, "gm");
    const removed = source.match(nonGheeLine) || [];
    const trimmed = source.replace(nonGheeLine, "");
    if (removed.length) {
      // Unfixed data: unitRules still names nuts/weight ids from removed categories.
      assert.throws(() => loadDataFromSource(trimmed), /unitRules: unknown product/);
    } else {
      // Fixed data has nothing to remove; unitRules must then load cleanly.
      assert.doesNotThrow(() => loadDataFromSource(trimmed));
    }
  });
});
