"use strict";
/*
 * Property 2: Preservation - Ordering, catalog behavior, branding and
 * platform constraints.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13**
 *
 * Observation-first: tests/fixtures/baseline.json was recorded from the
 * UNFIXED code by tests/helpers/record-baseline.js. These tests replay the
 * stored seeded inputs (ghee ids, ghee names, form inputs, config
 * rendering: inputs where isBugCondition is false) and compare.
 * Extra seeded properties use an oracle instead of the baseline; set
 * SEED=<n> to replay a failing run.
 *
 * Excluded on purpose because they depend on the number or names of
 * categories, which the fix changes by design:
 *   - catalogue chip count and labels, picker group count and pills
 *   - category eyebrow/heading/tagline text, result-count wording,
 *     document.title on products.html, the detail dialog's category line
 *   - search queries whose matches depend on a category name
 *     (filtered out in scenarios.js, see CATEGORY_NAMES)
 *   - page copy, meta tags, header dropdown, footer product links and
 *     footer nav labels, CSS durations, homepage collection contents
 *
 * Run: node --test tests/preservation.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { ROOT, readText } = require("./helpers/load");
const { GHEE_IDS, REMOVED_CATEGORIES, PAGES } = require("./helpers/constants");
const { createRng, getSeed } = require("./helpers/prng");
const { loadSite, parseDocument } = require("./helpers/dom-stub");
const { parseRules } = require("./helpers/css");
const sc = require("./helpers/scenarios");

const baseline = sc.readBaseline();
const { inputs, observed } = baseline;
const SEED = getSeed();
const plain = (v) => JSON.parse(JSON.stringify(v));
console.log(`preservation seed: ${SEED} (SEED=${SEED} to replay)`);

/** Footer nav labels name product groups, so they are compared without the label. */
function normalizeStatic(snapshot) {
  const copy = JSON.parse(JSON.stringify(snapshot));
  for (const page of Object.values(copy.pages)) {
    const footerAt = page.landmarks.indexOf("footer");
    if (footerAt >= 0) {
      page.landmarks = page.landmarks.map((l, i) => (i > footerAt ? l.replace(/\[aria-label=[^\]]*\]/, "") : l));
    }
  }
  return copy;
}

/* ------------------------------------------------------------------ */
/* 3.4 Order list operations                                           */
/* ------------------------------------------------------------------ */

test("order list add/set/changeUnit/remove and toLines() match the baseline (3.4)", () => {
  assert.ok(inputs.orderList.length >= 30);
  inputs.orderList.forEach((ops, i) => {
    assert.deepEqual(sc.observeOrderListSequence(ops), observed.orderList[i], `sequence ${i}: ${JSON.stringify(ops)}`);
  });
});

/* ------------------------------------------------------------------ */
/* 3.3 Stale order list pruning                                        */
/* ------------------------------------------------------------------ */

const REMOVED_IDS = ["kaju-katli", "sandesh", "dal-moth", "shahi-rasmalai", "bahubali-sandwich"];

function genStoredList(rng, S) {
  const n = rng.int(8);
  const lines = [];
  for (let i = 0; i < n; i++) {
    const roll = rng.next();
    let id;
    if (roll < 0.5) id = rng.pick(GHEE_IDS);
    else if (roll < 0.75) id = rng.pick(REMOVED_IDS);
    else id = rng.pick(["", "GULAB-JAMUN", "x", "<script>", "__proto__", "laddoo", Math.random().toString(36).slice(2)]);
    const p = S.getProduct(id);
    const units = p ? S.unitsFor(p) : ["250 g"];
    const unit = rng.next() < 0.75 ? rng.pick(units) : rng.pick(["Box", "2 kg", "", "piece", "Piece", "1 kg"]);
    const qty = rng.next() < 0.75 ? 1 + rng.int(99) : rng.pick([0, 100, -1, 2.5, "3", null]);
    const line = { id, unit, qty };
    if (rng.next() < 0.05) delete line.unit;
    lines.push(line);
  }
  return lines;
}

function expectedKept(lines, S, catalogIds) {
  return lines.filter((l) => {
    if (!catalogIds.includes(l.id)) return false;
    const p = S.getProduct(l.id);
    return S.unitsFor(p).includes(l.unit) && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 99;
  });
}

/** Simulates the planned ghee-only catalogue on the current data. */
function gheeOnlyCatalog(S) {
  S.data.products = S.data.products.filter((p) => GHEE_IDS.includes(p.id));
  S.data.signatureOrder = S.data.signatureOrder.filter((id) => GHEE_IDS.includes(id));
}

test("read() keeps exactly the valid stored lines, with their unit and quantity (3.3)", () => {
  const rng = createRng(SEED);
  for (const ghee of [false, true]) {
    for (let run = 0; run < 60; run++) {
      const probe = loadSite({ page: "404.html", scripts: sc.BASE_SCRIPTS, configure: ghee ? gheeOnlyCatalog : undefined });
      const lines = genStoredList(rng, probe.S);
      const site = loadSite({
        page: "404.html",
        scripts: sc.BASE_SCRIPTS,
        storage: { [sc.ORDER_KEY]: JSON.stringify(lines) },
        configure: ghee ? gheeOnlyCatalog : undefined
      });
      const catalogIds = site.S.data.products.map((p) => p.id);
      assert.deepEqual(plain(site.S.orderList.items()), expectedKept(lines, site.S, catalogIds), `seed ${SEED}, ghee-only=${ghee}: ${JSON.stringify(lines)}`);
    }
  }
});

test("stale list example keeps only Gulab Jamun × 3 (Piece) once removed products are gone (3.3)", () => {
  const stored = JSON.stringify([{ id: "kaju-katli", unit: "250 g", qty: 2 }, { id: "gulab-jamun", unit: "Piece", qty: 3 }]);
  // Simulated ghee-only catalogue on today's data, and the real data when it no longer has kaju-katli.
  const runs = [loadSite({ page: "order.html", storage: { [sc.ORDER_KEY]: stored }, configure: gheeOnlyCatalog })];
  const real = loadSite({ page: "order.html", storage: { [sc.ORDER_KEY]: stored } });
  if (!real.S.getProduct("kaju-katli")) runs.push(real);
  for (const site of runs) {
    assert.deepEqual(plain(site.S.orderList.items()), [{ id: "gulab-jamun", unit: "Piece", qty: 3 }]);
    assert.deepEqual(plain(site.S.orderList.toLines()), ["- Gulab Jamun × 3 (Piece)"]);
    const rows = site.document.querySelectorAll("[data-summary-body] tr");
    assert.equal(rows.length, 1);
    assert.match(rows[0].textContent, /Gulab Jamun/);
  }
});

test("malformed stored lists are ignored without errors (3.3)", () => {
  for (const raw of ["not json", "{}", "null", "42", '{"id":"gulab-jamun"}', "[null, 1, \"x\"]"]) {
    const site = loadSite({ page: "404.html", scripts: sc.BASE_SCRIPTS, storage: { [sc.ORDER_KEY]: raw } });
    assert.deepEqual(plain(site.S.orderList.items()), [], raw);
  }
});

/* ------------------------------------------------------------------ */
/* 3.2 Unknown and legacy ?cat= values                                 */
/* ------------------------------------------------------------------ */

function catValues(rng) {
  const random = Array.from({ length: 12 }, () => {
    const chars = "abcdefghijklmnopqrstuvwxyz-_0123456789 %&<>\"'";
    return Array.from({ length: rng.int(16) }, () => rng.pick([...chars])).join("");
  });
  return [...REMOVED_CATEGORIES, "ghee", "", "all", "ALL", "Ghee", "ghee-laddoo", "ghee-dry", "ghee-syrup", "products", ...random];
}

function checkCat(site, value) {
  const { document: doc, S } = site;
  const known = S.data.categories.some((c) => c.id === value);
  const expected = known || value === "all" ? value : "all";
  const form = doc.querySelector("[data-catalogue-form]");
  assert.equal(form.elements.cat.value, expected, `cat=${JSON.stringify(value)}`);
  const visible = doc.querySelectorAll("[data-catalogue-grid] > li").filter((li) => !li.hidden).map((li) => li.dataset.id);
  const history = site.calls.history;
  const url = history[history.length - 1];
  if (expected === "all") {
    assert.equal(url, "/products.html", `cat=${JSON.stringify(value)} should rewrite the URL to products.html`);
    for (const id of GHEE_IDS) assert.ok(visible.includes(id), `cat=${JSON.stringify(value)} hides ${id}`);
    assert.equal(visible.length, S.data.products.length);
  } else {
    assert.equal(url, `/products.html?cat=${encodeURIComponent(value)}`);
    for (const id of visible) assert.equal(S.getProduct(id).category, value);
  }
}

test("unknown cat values fall back to the full collection and rewrite the URL (3.2)", () => {
  const rng = createRng(SEED ^ 0x5eed);
  for (const value of catValues(rng)) {
    const site = loadSite({ page: "products.html", search: `?cat=${encodeURIComponent(value)}` });
    checkCat(site, value);
  }
});

test("legacy category ids fall back to all ghee sweets once they are not categories (3.2)", () => {
  // Simulates the planned data on today's code: ghee products only and none
  // of the legacy category ids.
  const legacy = new Set([...REMOVED_CATEGORIES, "ghee"]);
  const configure = (S) => {
    gheeOnlyCatalog(S);
    S.data.categories = S.data.categories.filter((c) => !legacy.has(c.id));
  };
  for (const value of [...legacy, "", "random-value"]) {
    const site = loadSite({ page: "products.html", search: `?cat=${encodeURIComponent(value)}`, configure });
    checkCat(site, value);
    assert.equal(site.document.querySelectorAll("[data-catalogue-grid] > li").filter((li) => !li.hidden).length, GHEE_IDS.length);
  }
  // And with the real data, whichever legacy ids are no longer categories
  for (const value of legacy) {
    const site = loadSite({ page: "products.html", search: `?cat=${value}` });
    checkCat(site, value);
  }
});

/* ------------------------------------------------------------------ */
/* 3.6 Search, sort and detail dialog                                  */
/* ------------------------------------------------------------------ */

test("catalogue search and sort results for ghee sweets match the baseline (3.6)", () => {
  const now = sc.observeSearch(inputs.searchQueries);
  for (const sort of Object.keys(observed.search.bySort)) {
    assert.equal(now.bySort[sort].resolvedSort, observed.search.bySort[sort].resolvedSort, `sort=${sort}`);
    observed.search.bySort[sort].rows.forEach((row, i) => {
      assert.deepEqual(now.bySort[sort].rows[i], row, `sort=${sort} q=${JSON.stringify(row.q)}`);
    });
  }
  assert.deepEqual(now.viaUrl, observed.search.viaUrl);
  assert.deepEqual(now.viaSelect, observed.search.viaSelect);
});

test("search matches equal a name/description substring oracle, accent- and case-insensitive (3.6)", () => {
  const products = sc.gheeProducts(loadSite({ page: "404.html", scripts: sc.BASE_SCRIPTS }).S);
  for (const row of observed.search.bySort.featured.rows) {
    const needle = sc.norm(row.q.slice(0, 80).trim());
    const expected = products.filter((p) => !needle || sc.norm(`${p.name} ${p.description}`).includes(needle)).map((p) => p.id);
    assert.deepEqual([...row.ids].sort(), [...expected].sort(), `q=${JSON.stringify(row.q)}`);
  }
});

test("product detail dialog content, pack select and add action match the baseline (3.6)", () => {
  assert.deepEqual(sc.observeDialog(inputs.dialog), observed.dialog);
});

test("demo illustrations art(product, variant) are unchanged for every ghee sweet (3.6, 3.13)", () => {
  assert.deepEqual(sc.observeArt(), observed.art);
});

/* ------------------------------------------------------------------ */
/* 3.4, 3.5 Forms                                                      */
/* ------------------------------------------------------------------ */

test("order form validation, summary and delivery on every channel match the baseline (3.4)", async () => {
  const channels = new Set(inputs.orderForm.map((c) => c.channel));
  assert.deepEqual([...channels].sort(), ["endpoint", "mailto", "none", "whatsapp"]);
  for (let i = 0; i < inputs.orderForm.length; i++) {
    assert.deepEqual(await sc.observeFormCase(inputs.orderForm[i]), observed.orderForm[i], `order case ${i}: ${JSON.stringify(inputs.orderForm[i])}`);
  }
});

test("contact form validation and delivery on every channel match the baseline (3.5)", async () => {
  for (let i = 0; i < inputs.contactForm.length; i++) {
    assert.deepEqual(await sc.observeFormCase(inputs.contactForm[i]), observed.contactForm[i], `contact case ${i}: ${JSON.stringify(inputs.contactForm[i])}`);
  }
});

test("contact form keeps only name, phone, optional email and message (3.5)", () => {
  const doc = parseDocument(readText("contact.html"));
  const form = doc.querySelector("form[data-form='contact']");
  const names = form.querySelectorAll("input, select, textarea").filter((f) => !f.closest(".honeypot")).map((f) => f.getAttribute("name"));
  assert.deepEqual(names, ["name", "email", "phone", "message"]);
  assert.equal(form.querySelector("[name='email']").hasAttribute("required"), false);
});

test("?product= prefills the contact message for ghee sweets (3.5)", () => {
  assert.deepEqual(sc.observePrefill(inputs.prefill), observed.prefill);
});

/* ------------------------------------------------------------------ */
/* 3.1, 3.7, 3.8, 3.11, 3.12, 3.13 Static snapshots                    */
/* ------------------------------------------------------------------ */

test("brand, tokens, fonts, config, sitemap, robots and page structure match the baseline (3.1, 3.7, 3.8, 3.11, 3.13)", () => {
  const now = normalizeStatic(sc.observeStatic());
  const before = normalizeStatic(observed.static);
  assert.deepEqual(now.brand, before.brand);
  assert.equal(now.brand.name, "Madhuram Sweets & Snacks");
  assert.equal(now.brand.tagline, "100% Veg");
  assert.deepEqual(now.nepal, before.nepal);
  assert.equal(now.nepal.currency, "NPR");
  assert.match(now.nepal.phoneHref, /^\+977/);
  assert.equal(now.configHash, before.configHash, "js/config.js must not change");
  assert.deepEqual(now.colorTokens, before.colorTokens);
  assert.deepEqual(now.fontTokens, before.fontTokens);
  assert.deepEqual(now.fontFaces, before.fontFaces);
  assert.deepEqual(now.sitemap, before.sitemap);
  assert.ok(now.sitemap.wellFormed);
  assert.deepEqual(now.robots, before.robots);
  assert.equal(now.signatureTitle, true);
  for (const page of PAGES) {
    assert.deepEqual(now.pages[page], before.pages[page], page);
    assert.equal(now.pages[page].h1Count, 1, `${page} has one h1`);
  }
});

test("structured data stays withheld and demo labels stay while config.verified is false (3.13)", () => {
  const now = sc.observeStatic();
  assert.equal(now.verified, false);
  for (const page of PAGES) {
    assert.equal(now.renderedJsonLd[page], 0, page);
    assert.equal(now.pages[page].jsonLd, 0, page);
  }
  const site = loadSite({ page: "products.html" });
  for (const id of GHEE_IDS) {
    const img = site.document.querySelector(`[data-catalogue-grid] > li[data-id="${id}"] img`);
    assert.match(img.getAttribute("alt"), /\(demo illustration\)$/, id);
  }
  // Only placeholder illustrations carry the demo label; real photographs do not.
  for (const g of site.S.data.gallery.filter((x) => x.src.endsWith(".svg"))) assert.match(g.caption, /demo illustration/i, g.src);
  const productsJs = readText("js/products.js");
  for (const label of ["Demo item", "To be confirmed", "Demo illustration"]) assert.ok(productsJs.includes(label), label);
});

test("plain HTML, CSS and vanilla JS: local js/ scripts only, no package.json or framework files (3.12)", () => {
  for (const page of PAGES) {
    const doc = parseDocument(readText(page));
    for (const s of doc.querySelectorAll("script")) {
      const src = s.getAttribute("src");
      if (src === null) {
        assert.equal(s.getAttribute("type"), "application/ld+json", `${page}: inline script`);
        continue;
      }
      assert.match(src, /^js\/[\w-]+\.js$/, `${page}: ${src}`);
    }
  }
  const forbidden = ["package.json", "package-lock.json", "node_modules", "yarn.lock", "pnpm-lock.yaml", "vite.config.js", "webpack.config.js", "next.config.js", "angular.json", "svelte.config.js", "tsconfig.json"];
  for (const name of forbidden) assert.equal(fs.existsSync(path.join(ROOT, name)), false, name);
});

/* ------------------------------------------------------------------ */
/* 3.9 Accessibility structure                                         */
/* ------------------------------------------------------------------ */

function accessibleName(el, doc) {
  const label = el.getAttribute("aria-label");
  if (label && label.trim()) return label.trim();
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const text = by.split(/\s+/).map((id) => doc.getElementById(id)?.textContent || "").join(" ").trim();
    if (text) return text;
  }
  const text = el.textContent.replace(/\s+/g, " ").trim();
  if (text) return text;
  const alt = el.querySelectorAll("img").map((i) => i.getAttribute("alt") || "").join(" ").trim();
  if (alt) return alt;
  return (el.getAttribute("title") || "").trim();
}

test("every link and button has an accessible name on every rendered page (3.9)", () => {
  for (const page of PAGES) {
    const site = loadSite({ page });
    const doc = site.document;
    for (const el of doc.querySelectorAll("a[href], button")) {
      assert.ok(accessibleName(el, doc), `${page}: <${el.localName} class="${el.className}"> has no accessible name`);
    }
  }
});

test("focus styles, dialog focus return and no hover-only controls (3.9)", () => {
  const cssFiles = ["css/style.css", "css/responsive.css", "css/animations.css"];
  const rules = cssFiles.flatMap((f) => parseRules(readText(f), f));
  assert.ok(rules.some((r) => /:focus-visible/.test(r.selector) && r.decls.some((d) => /^outline/.test(d.prop))), ":focus-visible outline rule");

  // Hover never reveals content that is otherwise hidden
  for (const r of rules.filter((x) => /:hover/.test(x.selector))) {
    for (const d of r.decls) {
      const reveals = (d.prop === "display" && d.value !== "none") || (d.prop === "visibility" && d.value === "visible");
      assert.ok(!reveals, `${r.file}: "${r.selector}" reveals content on hover only`);
    }
  }

  // Dialogs are native modal dialogs, closed through method="dialog" or close(),
  // so the browser returns focus to the opener.
  const products = readText("js/products.js");
  const gallery = readText("js/gallery.js");
  for (const [file, src] of [["js/products.js", products], ["js/gallery.js", gallery]]) {
    assert.match(src, /\.showModal\(\)/, `${file} opens with showModal()`);
    assert.match(src, /method: "dialog"/, `${file} has a method="dialog" close form`);
    assert.doesNotMatch(src, /\.show\(\)|\.open\s*=\s*true/, `${file} must not open dialogs non-modally`);
  }
  const main = readText("js/main.js");
  assert.match(main, /target\?\.focus\(\{ preventScroll: true \}\)/, "back-to-top moves focus to #main");

  // Pointer hover previews are paired with click/keyboard activation
  for (const file of ["js/main.js", "js/products.js", "js/gallery.js", "js/cart.js", "js/forms.js"]) {
    const src = readText(file);
    if (/pointerenter|mouseenter|mouseover/.test(src)) {
      assert.match(src, /addEventListener\("click"/, `${file}: hover behaviour without a click equivalent`);
    }
  }

  // Rendered dialog returns focus to the trigger after closing (stubbed native behaviour)
  for (const d of observed.dialog) assert.equal(d.afterAdd.focusReturned, true);
});

/* ------------------------------------------------------------------ */
/* 3.10 Layout guard (static; the browser pass covers the rest)        */
/* ------------------------------------------------------------------ */

function stripFunctions(value, names) {
  let out = value;
  for (const name of names) {
    let i;
    while ((i = out.toLowerCase().indexOf(`${name}(`)) >= 0) {
      let depth = 0;
      let j = i + name.length;
      for (; j < out.length; j++) {
        if (out[j] === "(") depth++;
        else if (out[j] === ")" && --depth === 0) break;
      }
      out = `${out.slice(0, i)}${out.slice(j + 1)}`;
    }
  }
  return out;
}

test("category bento and header rules have no fixed widths above 360 px (3.10)", () => {
  const selectorRe = /\.(bento-categories|cat-card|site-header|header-inner|site-menu|site-nav|brand|menu-cta|header-actions|menu-button|dropdown-list|utility-bar|utility-inner)\b/;
  const props = /^(width|min-width|inline-size|min-inline-size|flex-basis|flex|grid-template-columns|grid-auto-columns)$/;
  for (const file of ["css/style.css", "css/responsive.css"]) {
    for (const r of parseRules(readText(file), file).filter((x) => selectorRe.test(x.selector))) {
      const hasMax = r.decls.some((d) => d.prop === "max-width" || d.prop === "max-inline-size");
      for (const d of r.decls.filter((x) => props.test(x.prop))) {
        if (hasMax && (d.prop === "width" || d.prop === "inline-size")) continue;
        const bare = stripFunctions(d.value, ["min", "clamp"]);
        for (const m of bare.matchAll(/(\d*\.?\d+)(px|rem|em)\b/g)) {
          const px = m[2] === "px" ? Number(m[1]) : Number(m[1]) * 16;
          assert.ok(px <= 360, `${file}: "${r.selector}" ${d.prop}: ${d.value}`);
        }
      }
    }
  }
});
