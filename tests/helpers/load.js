"use strict";
/*
 * Loaders for the static site: js/data.js in a node:vm sandbox and a
 * regex-based HTML scanner. Node built-ins only.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..", "..");

function readText(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

/**
 * Runs js/config.js and the given data.js source in a fresh vm context
 * whose global object acts as `window` (window = { SweetShop: {} }).
 * Returns SweetShop.data. Throws whatever data.js throws.
 */
function loadDataFromSource(dataSource, configSource = readText("js/config.js")) {
  const context = vm.createContext({});
  context.window = context;
  context.SweetShop = {};
  vm.runInContext(configSource, context, { filename: "js/config.js" });
  vm.runInContext(dataSource, context, { filename: "js/data.js" });
  return context.SweetShop.data;
}

function loadData() {
  return loadDataFromSource(readText("js/data.js"));
}

/* ---------------- HTML scanning ---------------- */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", ndash: "–", mdash: "—", copy: "©", rsquo: "’", lsquo: "‘", hellip: "…" };

function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, code.toLowerCase()) ? ENTITIES[code.toLowerCase()] : m;
  });
}

function parseAttrs(attrSource) {
  const attrs = {};
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(attrSource))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/** All start tags as { tag, attrs }. */
function listTags(html) {
  const out = [];
  const re = /<([a-zA-Z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = re.exec(html))) out.push({ tag: m[1].toLowerCase(), attrs: parseAttrs(m[2]) });
  return out;
}

function normalizeSpace(s) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Extracts what visitors, screen readers and crawlers read from a page.
 * textNodes: visible text runs between tags (script, style, svg and
 * comments removed; noscript kept because it is visible without JS).
 */
function scanHtml(html) {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, " ");
  const tags = listTags(withoutComments);

  const titleMatch = withoutComments.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalizeSpace(decodeEntities(titleMatch[1])) : "";

  const meta = (key, value) => {
    const t = tags.find((x) => x.tag === "meta" && x.attrs[key] === value);
    return t ? t.attrs.content ?? "" : "";
  };

  const bodyMatch = withoutComments.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  const body = (bodyMatch ? bodyMatch[1] : withoutComments)
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, " ");
  const textNodes = body
    .split(/<(?:[^>"']|"[^"]*"|'[^']*')*>/)
    .map((s) => normalizeSpace(decodeEntities(s)))
    .filter(Boolean);

  const collect = (attr) => tags.filter((t) => attr in t.attrs).map((t) => t.attrs[attr]);
  const images = tags
    .filter((t) => t.tag === "img")
    .map((t) => ({ src: t.attrs.src ?? "", alt: t.attrs.alt ?? "" }));

  return {
    title,
    metaDescription: meta("name", "description"),
    ogTitle: meta("property", "og:title"),
    ogDescription: meta("property", "og:description"),
    textNodes,
    visibleText: textNodes.join(" "),
    alts: collect("alt").filter(Boolean),
    ariaLabels: collect("aria-label").filter(Boolean),
    captions: collect("data-caption").filter(Boolean),
    placeholders: collect("placeholder").filter(Boolean),
    hrefs: collect("href"),
    srcs: [...collect("src"), ...collect("data-lightbox-src")],
    images,
    tags
  };
}

function readPage(page) {
  const raw = readText(page);
  return Object.assign({ page, raw }, scanHtml(raw));
}

/** Every text field the bug condition inspects, labelled for reporting. */
function pageTextFields(scan) {
  return [
    ["title", scan.title],
    ["meta description", scan.metaDescription],
    ["og:title", scan.ogTitle],
    ["og:description", scan.ogDescription],
    ...scan.textNodes.map((t) => ["text", t]),
    ...scan.alts.map((t) => ["alt", t]),
    ...scan.ariaLabels.map((t) => ["aria-label", t]),
    ...scan.captions.map((t) => ["data-caption", t]),
    ...scan.placeholders.map((t) => ["placeholder", t])
  ];
}

module.exports = {
  ROOT,
  readText,
  loadData,
  loadDataFromSource,
  decodeEntities,
  scanHtml,
  readPage,
  pageTextFields
};
