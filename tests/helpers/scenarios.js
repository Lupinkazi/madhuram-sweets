"use strict";
/*
 * Preservation scenarios (Property 2). Each scenario has an input
 * generator (seeded, ghee-only inputs where isBugCondition is false) and
 * an observer that runs the real site scripts in the DOM stub and returns
 * plain JSON. record-baseline.js stores inputs + observations from the
 * UNFIXED code in tests/fixtures/baseline.json; preservation.test.js
 * replays the stored inputs and compares the observations.
 *
 * Observations deliberately leave out what the fix changes by design:
 * category ids and names, chip and picker group counts, page copy and
 * metadata, header/footer navigation, CSS durations, non-ghee products.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readText } = require("./load");
const { GHEE_IDS, PAGES } = require("./constants");
const { createRng } = require("./prng");
const { loadSite, flush, typeInto, parseDocument, Event } = require("./dom-stub");
const { parseRules } = require("./css");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

const BASE_SCRIPTS = ["js/config.js", "js/data.js", "js/main.js", "js/cart.js"];
const ORDER_KEY = "sweetshop.orderList.v1";

/* Group names a ghee query must not depend on: the current "Ghee Sweets"
   category and the ghee groups proposed in design.md. The catalogue search
   haystack includes the category name, so a query that matches only via a
   category name would legitimately change when categories are regrouped. */
const CATEGORY_NAMES = ["Ghee Sweets", "Laddoos", "Barfi, pak & dry sweets", "Syrup sweets", "All ghee sweets", "All products"];

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function gheeProducts(S) {
  return GHEE_IDS.map((id) => S.getProduct(id));
}

/* ------------------------------------------------------------------ */
/* 1. Order list                                                       */
/* ------------------------------------------------------------------ */

const UNIT_POOL = ["250 g", "500 g", "1 kg", "Piece", "Pack of 6", "Pack of 12", "100 g", "Box", "2 kg", ""];
const QTY_POOL = [1, 2, 3, 5, 12, 98, 99, 100, 150, 0, -2, 2.6, 0.4, "4", "", "abc", null];

function genOrderListSequences(seed, count = 30) {
  const rng = createRng(seed);
  const sequences = [];
  for (let s = 0; s < count; s++) {
    const ids = rng.sample(GHEE_IDS, 3); // a few ids per sequence so lines interact
    const ops = [];
    const n = 4 + rng.int(11);
    for (let i = 0; i < n; i++) {
      const id = rng.pick(ids);
      const kind = rng.pick(["add", "add", "set", "set", "changeUnit", "remove", "remove-all"]);
      const unit = rng.pick(UNIT_POOL);
      const qty = rng.pick(QTY_POOL);
      if (kind === "add") ops.push(rng.next() < 0.3 ? { op: "add", id, unit } : { op: "add", id, unit, qty });
      else if (kind === "set") ops.push({ op: "set", id, unit, qty });
      else if (kind === "changeUnit") ops.push({ op: "changeUnit", id, from: rng.pick(UNIT_POOL), to: unit });
      else if (kind === "remove") ops.push({ op: "remove", id, unit });
      else ops.push({ op: "remove", id });
    }
    sequences.push(ops);
  }
  return sequences;
}

function applyOp(list, o) {
  if (o.op === "add") return "qty" in o ? list.add(o.id, o.unit, o.qty) : list.add(o.id, o.unit);
  if (o.op === "set") return list.set(o.id, o.unit, o.qty);
  if (o.op === "changeUnit") return list.changeUnit(o.id, o.from, o.to);
  if (o.op === "remove") return "unit" in o ? list.remove(o.id, o.unit) : list.remove(o.id);
  throw new Error(`unknown op ${o.op}`);
}

function observeOrderListSequence(ops) {
  const site = loadSite({ page: "404.html", scripts: BASE_SCRIPTS });
  const list = site.S.orderList;
  return ops.map((o) => {
    applyOp(list, o);
    return {
      items: list.items(),
      lines: list.toLines(),
      stored: site.window.localStorage.getItem(ORDER_KEY),
      badge: site.document.querySelector("[data-order-count]")?.textContent ?? null
    };
  });
}

/* ------------------------------------------------------------------ */
/* 2. Catalogue search and sort                                        */
/* ------------------------------------------------------------------ */

const ACCENTS = { a: ["á", "à", "â", "ä"], e: ["é", "è", "ê"], i: ["í", "ï"], o: ["ó", "ö", "ô"], u: ["ú", "ü"] };

function decorate(rng, text) {
  return [...text].map((ch) => {
    const lower = ch.toLowerCase();
    if (ACCENTS[lower] && rng.next() < 0.25) return rng.pick(ACCENTS[lower]);
    return rng.next() < 0.4 ? ch.toUpperCase() : ch.toLowerCase();
  }).join("");
}

/** True when the query's matches on ghee products do not depend on category names. */
function categoryIndependent(products, q) {
  const needle = norm(q.slice(0, 80).trim());
  if (!needle) return true;
  return products.every((p) => {
    const base = norm(`${p.name} ${p.description}`).includes(needle);
    return CATEGORY_NAMES.every((c) => norm(`${p.name} ${p.description} ${c}`).includes(needle) === base);
  });
}

function genSearchQueries(seed, count = 40) {
  const site = loadSite({ page: "404.html", scripts: BASE_SCRIPTS });
  const products = gheeProducts(site.S);
  const rng = createRng(seed);
  const queries = ["", "   "];
  let guard = 0;
  while (queries.length < count && guard++ < 5000) {
    const p = rng.pick(products);
    const source = rng.next() < 0.5 ? p.name : p.description;
    let q;
    const roll = rng.next();
    if (roll < 0.08) {
      // Longer than 80 characters: the catalogue keeps the first 80.
      q = `${p.description} ${p.name} ${p.description} ${p.name}`.repeat(2).slice(0, 81 + rng.int(40));
    } else if (roll < 0.15) {
      q = rng.pick(["zzz", "qwerty", "xylo", "🍬", "%", "laddoo pizza"]);
    } else {
      const start = rng.int(source.length);
      const len = 1 + rng.int(Math.min(20, source.length - start));
      q = source.slice(start, start + len);
    }
    q = decorate(rng, q);
    if (rng.next() < 0.15) q = ` ${q} `;
    if (!categoryIndependent(products, q)) continue;
    if (queries.includes(q)) continue;
    queries.push(q);
  }
  return queries;
}

const SORT_KEYS_URL = ["featured", "name-asc", "name-desc", "price-asc", "price-desc", "bogus"];

/** Ghee product ids in grid order that are currently visible. */
function visibleGhee(doc) {
  return doc.querySelectorAll("[data-catalogue-grid] > li")
    .filter((li) => !li.hidden && GHEE_IDS.includes(li.dataset.id))
    .map((li) => li.dataset.id);
}

function lastUrl(site) {
  const h = site.calls.history;
  return h.length ? h[h.length - 1] : null;
}

function observeSearch(queries) {
  const out = { bySort: {}, viaUrl: [] };
  for (const sort of SORT_KEYS_URL) {
    const site = loadSite({ page: "products.html", search: `?sort=${encodeURIComponent(sort)}` });
    const doc = site.document;
    const input = doc.getElementById("catalogue-search");
    const select = doc.getElementById("catalogue-sort");
    const rows = [];
    for (const q of queries) {
      input.value = q;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      site.runTimers();
      rows.push({ q, ids: visibleGhee(doc), url: lastUrl(site), inputValue: input.value });
    }
    out.bySort[sort] = { resolvedSort: select.value, rows };
  }
  // Initial state from the URL (q is trimmed for matching and limited to 80 characters)
  for (const q of queries.slice(0, 12)) {
    for (const sort of ["featured", "name-asc", "name-desc"]) {
      const site = loadSite({ page: "products.html", search: `?q=${encodeURIComponent(q)}&sort=${sort}` });
      out.viaUrl.push({
        q, sort,
        ids: visibleGhee(site.document),
        url: lastUrl(site),
        inputValue: site.document.getElementById("catalogue-search").value
      });
    }
  }
  // Changing sort through the select (only options the page offers)
  const site = loadSite({ page: "products.html" });
  const select = site.document.getElementById("catalogue-sort");
  out.viaSelect = select.options.map((o) => o.value).map((value) => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return { sort: value, ids: visibleGhee(site.document), url: lastUrl(site) };
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* 3. Product detail dialog                                            */
/* ------------------------------------------------------------------ */

function genDialogCases(seed) {
  const rng = createRng(seed);
  return GHEE_IDS.map((id) => ({ id, unitIndex: rng.int(3), qty: rng.pick(["1", "2", "5", "12", "", "0"]) }));
}

function observeDialog(cases) {
  const site = loadSite({ page: "products.html" });
  const { document: doc, S } = site;
  return cases.map(({ id, unitIndex, qty }) => {
    S.orderList.clear();
    // Open through the card button, the way a visitor does
    const opener = doc.querySelector(`[data-catalogue-grid] [data-product-open="${id}"]`);
    opener.focus();
    opener.click();
    const dialog = doc.getElementById("product-dialog");
    const $ = (sel) => dialog.querySelector(sel);
    const unitSelect = $("#pd-unit");
    const snapshot = {
      open: dialog.open,
      title: $("#pd-title").textContent,
      desc: $("#pd-desc").textContent,
      price: $("#pd-price").textContent,
      units: $("#pd-units").textContent,
      unitOptions: unitSelect.options.map((o) => o.value),
      noteHidden: $("#pd-note").hidden,
      note: $("#pd-note").hidden ? null : $("#pd-note").textContent,
      enquire: $("#pd-enquire").getAttribute("href"),
      imageHash: sha256($("#pd-image").getAttribute("src")),
      alt: $("#pd-image").getAttribute("alt"),
      thumbs: $("#pd-thumbs").querySelectorAll("button").map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-pressed")]),
      thumbsHidden: $("#pd-thumbs").hidden,
      focusInDialog: dialog.contains(doc.activeElement)
    };
    unitSelect.value = snapshot.unitOptions[unitIndex % snapshot.unitOptions.length];
    $("#pd-qty").value = qty;
    $("#pd-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    snapshot.afterAdd = {
      open: dialog.open,
      items: S.orderList.items(),
      toast: doc.querySelector(".toast")?.textContent ?? null,
      focusReturned: doc.activeElement === opener
    };
    return snapshot;
  });
}

/* ------------------------------------------------------------------ */
/* 4. Forms                                                            */
/* ------------------------------------------------------------------ */

const NAMES = ["Sita Sharma", "Ram Bahadur Thapa", "Ånita Gurung", "", "   ", "A", "Hari Prasad Koirala-Shrestha"];
const PHONES = ["9800000000", "+977 98012 34567", "(01) 4412345", "98-1234-5678", "", "abc", "12", "9".repeat(25)];
const EMAILS = ["", "", "sita@example.com", "not-an-email", "a@b", "x@@y.com", " ram@example.org "];
const AREAS = ["", "Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
const ADDRESSES = ["", "Baneshwor, near the Shiva temple", "Jawalakhel chowk, opposite the zoo gate", "x".repeat(320)];
const ORDER_MESSAGES = ["", "", "Please deliver after 5 pm.", "Pack as a gift box, please."];
const CONTACT_MESSAGES = ["", "short", "I would like to order sweets for a wedding.", "Do you deliver to Bhaktapur on Saturdays?", "y".repeat(1600)];
const CHANNELS = ["none", "whatsapp", "mailto", "endpoint"];

function genFormCases(seed, type, count) {
  const rng = createRng(seed);
  const cases = [];
  for (let i = 0; i < count; i++) {
    const channel = CHANNELS[i % CHANNELS.length];
    const c = {
      type,
      channel,
      endpointResult: channel === "endpoint" ? rng.pick(["ok", "ok", "fail", "throw"]) : null,
      popupBlocked: channel === "whatsapp" ? rng.next() < 0.3 : false,
      honeypot: rng.next() < 0.08 ? "https://spam.example" : "",
      fields: {}
    };
    const valid = rng.next() < 0.55; // bias towards submissions that pass validation
    c.fields.name = valid ? rng.pick(NAMES.slice(0, 3)) : rng.pick(NAMES);
    c.fields.phone = valid ? rng.pick(PHONES.slice(0, 4)) : rng.pick(PHONES);
    c.fields.email = valid ? rng.pick(["", "sita@example.com"]) : rng.pick(EMAILS);
    if (type === "order") {
      c.fields.area = valid ? rng.pick(AREAS.slice(1, 4)) : rng.pick(AREAS);
      c.fields.address = valid ? rng.pick(ADDRESSES.slice(1, 3)) : rng.pick(ADDRESSES);
      c.fields.message = rng.pick(ORDER_MESSAGES);
      const n = valid ? 1 + rng.int(3) : rng.int(3);
      c.items = Array.from({ length: n }, () => ({ id: rng.pick(GHEE_IDS), unitIndex: rng.int(3), qty: 1 + rng.int(5) }));
    } else {
      c.fields.message = valid ? rng.pick(CONTACT_MESSAGES.slice(2, 4)) : rng.pick(CONTACT_MESSAGES);
    }
    cases.push(c);
  }
  return cases;
}

function decodeText(url) {
  const m = /[?&](?:text|body)=([^&]*)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

function describeActive(node) {
  if (!node) return null;
  if (node.id) return `#${node.id}`;
  if (node.hasAttribute("data-form-status")) return "[data-form-status]";
  return node.localName;
}

async function observeFormCase(c) {
  const page = c.type === "order" ? "order.html" : "contact.html";
  const fetchImpl = async () => {
    if (c.endpointResult === "throw") throw new TypeError("network down");
    return { ok: c.endpointResult === "ok", status: c.endpointResult === "ok" ? 200 : 500 };
  };
  const site = loadSite({
    page,
    fetchImpl,
    openResult: c.popupBlocked ? null : {},
    configure(S) {
      S.config.ordering.channel = c.channel;
      S.config.ordering.endpoint = c.channel === "endpoint" ? "https://forms.example.test/submit" : "";
    }
  });
  const { document: doc, S } = site;
  const form = doc.querySelector(`form[data-form="${c.type}"]`);
  for (const item of c.items || []) {
    const p = S.getProduct(item.id);
    const units = S.unitsFor(p);
    S.orderList.add(item.id, units[item.unitIndex % units.length], item.qty);
  }
  for (const [name, value] of Object.entries(c.fields)) typeInto(form.elements[name], value);
  if (c.honeypot) form.querySelector(".honeypot input").value = c.honeypot;

  const submit = form.querySelector("button[type='submit']");
  submit.click();
  await flush();

  const box = form.querySelector("[data-form-status]");
  const fieldNames = Object.keys(c.fields);
  const statusActions = box.querySelectorAll("a, button").map((n) => ({
    tag: n.localName,
    text: n.textContent.replace(/\s+/g, " ").trim(),
    href: n.getAttribute("href"),
    text_param: n.getAttribute("href") ? decodeText(n.getAttribute("href")) : null
  }));
  const fetches = site.calls.fetch.map((f) => {
    const body = JSON.parse(f.init.body);
    const hasTimestamp = typeof body.submittedAt === "string" && !Number.isNaN(Date.parse(body.submittedAt));
    delete body.submittedAt;
    return { url: f.url, method: f.init.method, headers: f.init.headers, body, hasTimestamp };
  });
  return {
    fields: Object.fromEntries(fieldNames.map((n) => {
      const f = form.elements[n];
      return [n, { valid: f.validity.valid, ariaInvalid: f.getAttribute("aria-invalid"), describedBy: f.getAttribute("aria-describedby"), valueAfter: f.value }];
    })),
    orderErrorShown: doc.querySelector("[data-order-error]")?.classList.contains("is-shown") ?? null,
    status: {
      state: box.dataset.state ?? null,
      heading: box.querySelector("h3")?.textContent ?? null,
      message: box.querySelector("p")?.textContent ?? null,
      actions: statusActions
    },
    opened: site.calls.open.map((u) => ({ url: u, text: decodeText(u) })),
    navigations: site.calls.navigations.map((u) => ({ url: u, text: decodeText(u) })),
    fetches,
    orderListAfter: S.orderList.items(),
    activeElement: describeActive(doc.activeElement),
    submitDisabled: submit.disabled,
    busy: form.getAttribute("aria-busy")
  };
}

async function observeForms(cases) {
  const out = [];
  for (const c of cases) out.push(await observeFormCase(c));
  return out;
}

function genPrefillCases() {
  return [...GHEE_IDS, "", "unknown-sweet", "GULAB-JAMUN", "gulab jamun"];
}

function observePrefill(ids) {
  return ids.map((id) => {
    const site = loadSite({ page: "contact.html", search: id === "" ? "?product=" : `?product=${encodeURIComponent(id)}` });
    return { id, message: site.document.querySelector("form[data-form='contact']").elements.message.value };
  });
}

/* ------------------------------------------------------------------ */
/* 5. Demo illustrations                                               */
/* ------------------------------------------------------------------ */

function observeArt() {
  const site = loadSite({ page: "404.html", scripts: [...BASE_SCRIPTS, "js/products.js"] });
  const { S } = site;
  const out = {};
  for (const id of GHEE_IDS) {
    const p = S.getProduct(id);
    out[id] = [0, 1, 2].map((v) => sha256(S.art(p, v)));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 6. Static snapshots                                                 */
/* ------------------------------------------------------------------ */

const LANDMARK_TAGS = new Set(["header", "nav", "main", "footer", "aside", "form"]);

function landmarkSignature(el) {
  const label = el.getAttribute("aria-label");
  const labelledby = el.getAttribute("aria-labelledby");
  let sig = el.localName;
  if (el.id) sig += `#${el.id}`;
  if (label) sig += `[aria-label=${label}]`;
  if (labelledby) sig += `[aria-labelledby=${labelledby}]`;
  return sig;
}

function pageStructure(html) {
  const doc = parseDocument(html);
  const all = doc.querySelectorAll("*");
  const landmarks = all
    .filter((e) => LANDMARK_TAGS.has(e.localName) || (e.localName === "section" && e.hasAttribute("aria-labelledby")))
    .map(landmarkSignature);
  // Heading levels in document order, consecutive repeats collapsed so the
  // number of cards in a grid (which the fix changes) does not matter.
  const levels = [];
  for (const e of all) {
    const m = /^h([1-6])$/.exec(e.localName);
    if (m && levels[levels.length - 1] !== e.localName) levels.push(e.localName);
  }
  return {
    landmarks,
    headingLevels: levels,
    h1Count: doc.querySelectorAll("h1").length,
    brandNames: doc.querySelectorAll(".brand-name").map((e) => e.textContent),
    brandTags: doc.querySelectorAll(".brand-tag").map((e) => e.textContent),
    logos: doc.querySelectorAll("img.brand-logo").map((e) => e.getAttribute("src")),
    scripts: doc.querySelectorAll("script[src]").map((e) => e.getAttribute("src")),
    stylesheets: doc.querySelectorAll("link[rel='stylesheet']").map((e) => e.getAttribute("href")),
    jsonLd: doc.querySelectorAll("script[type='application/ld+json']").length,
    lang: doc.documentElement.getAttribute("lang"),
    hasSkipLink: Boolean(doc.querySelector("a.skip-link[href='#main']")),
    mainId: doc.querySelector("main")?.id ?? null
  };
}

function observeStatic() {
  const configSource = readText("js/config.js");
  const site = loadSite({ page: "404.html", scripts: ["js/config.js"] });
  const cfg = site.window.SweetShop.config;

  const rules = parseRules(readText("css/style.css"), "css/style.css");
  const rootDecls = rules.filter((r) => r.selector === ":root").flatMap((r) => r.decls);
  const colorTokens = Object.fromEntries(rootDecls.filter((d) => d.prop.startsWith("--color")).map((d) => [d.prop, d.value]));
  const fontTokens = Object.fromEntries(rootDecls.filter((d) => d.prop.startsWith("--font")).map((d) => [d.prop, d.value]));
  const fontFaces = [...readText("css/style.css").matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => {
    const family = /font-family:\s*([^;]+);/.exec(m[1])?.[1].trim();
    const src = /src:\s*([^;]+);/.exec(m[1])?.[1].trim();
    const weight = /font-weight:\s*([^;]+);/.exec(m[1])?.[1].trim() ?? null;
    return { family, src, weight };
  });

  const sitemap = readText("sitemap.xml");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const pages = {};
  for (const page of PAGES) pages[page] = pageStructure(readText(page));

  // Rendered pages: no JSON-LD while config.verified is false
  const renderedJsonLd = {};
  for (const page of PAGES) {
    const s = loadSite({ page });
    renderedJsonLd[page] = s.document.querySelectorAll("script[type='application/ld+json']").length;
  }

  return {
    brand: { name: cfg.brand.name, tagline: cfg.brand.tagline, foundedYear: cfg.brand.foundedYear },
    verified: cfg.verified,
    nepal: {
      currency: cfg.ordering.currency,
      phoneHref: cfg.contact.phoneHref,
      whatsapp: cfg.contact.whatsapp,
      address: cfg.contact.address,
      mapQuery: cfg.contact.mapQuery
    },
    configHash: sha256(configSource),
    colorTokens,
    fontTokens,
    fontFaces,
    sitemap: { locs, wellFormed: /^<\?xml[^>]*\?>/.test(sitemap.trim()) && /<urlset[\s\S]*<\/urlset>\s*$/.test(sitemap.trim()) },
    robots: readText("robots.txt").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")),
    pages,
    renderedJsonLd,
    signatureTitle: Boolean(parseDocument(readText("index.html")).getElementById("signature-title"))
  };
}

/* ------------------------------------------------------------------ */

const SEEDS = Object.freeze({ orderList: 20240601, search: 20240602, dialog: 20240603, orderForm: 20240604, contactForm: 20240605 });

function generateInputs() {
  return {
    orderList: genOrderListSequences(SEEDS.orderList),
    searchQueries: genSearchQueries(SEEDS.search),
    dialog: genDialogCases(SEEDS.dialog),
    orderForm: genFormCases(SEEDS.orderForm, "order", 40),
    contactForm: genFormCases(SEEDS.contactForm, "contact", 32),
    prefill: genPrefillCases()
  };
}

const BASELINE_PATH = path.join(ROOT, "tests", "fixtures", "baseline.json");

function readBaseline() {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

/* Observations are compared with JSON from the baseline, and objects made
   inside the vm realm have a different prototype, so return plain JSON. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const asPlain = (fn) => (...args) => {
  const result = fn(...args);
  return result && typeof result.then === "function" ? result.then(plain) : plain(result);
};

module.exports = {
  SEEDS,
  BASELINE_PATH,
  ORDER_KEY,
  BASE_SCRIPTS,
  CATEGORY_NAMES,
  sha256,
  norm,
  generateInputs,
  readBaseline,
  observeOrderListSequence: asPlain(observeOrderListSequence),
  observeSearch: asPlain(observeSearch),
  observeDialog: asPlain(observeDialog),
  observeForms: asPlain(observeForms),
  observeFormCase: asPlain(observeFormCase),
  observePrefill: asPlain(observePrefill),
  observeArt: asPlain(observeArt),
  observeStatic: asPlain(observeStatic),
  pageStructure,
  categoryIndependent,
  gheeProducts
};
