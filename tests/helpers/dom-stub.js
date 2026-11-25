"use strict";
/*
 * Minimal, dependency-free DOM stub for running the site scripts
 * (js/main.js, js/cart.js, js/products.js, js/forms.js) in node:vm.
 *
 * Covers what those scripts use: element tree, attributes, dataset,
 * classList, a small selector engine (tag, #id, .class, [attr], [attr=v],
 * :not(), descendant and child combinators, selector lists), events with
 * capture and bubbling, form controls with constraint validation, dialogs,
 * popovers, localStorage, location/history, fake timers and a fetch stub.
 * It is not a browser. Layout values are always 0.
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { ROOT, decodeEntities } = require("./load");

/* ------------------------------------------------------------------ */
/* Nodes                                                              */
/* ------------------------------------------------------------------ */

class Node {
  constructor(doc) {
    this.ownerDocument = doc || null;
    this.parentNode = null;
    this.childNodes = [];
  }
  get parentElement() {
    return this.parentNode instanceof Element ? this.parentNode : null;
  }
  get textContent() {
    return this.childNodes.map((c) => c.textContent).join("");
  }
  set textContent(value) {
    this.replaceChildren(this.ownerDocument.createTextNode(value == null ? "" : String(value)));
  }
  get children() {
    return this.childNodes.filter((c) => c instanceof Element);
  }
  get firstElementChild() {
    return this.children[0] || null;
  }
  get firstChild() {
    return this.childNodes[0] || null;
  }
  _adopt(node) {
    if (node.parentNode) node.parentNode._detach(node);
    node.parentNode = this;
    return node;
  }
  _detach(node) {
    const i = this.childNodes.indexOf(node);
    if (i >= 0) this.childNodes.splice(i, 1);
    node.parentNode = null;
  }
  _toNode(child) {
    return child instanceof Node ? child : this.ownerDocument.createTextNode(String(child));
  }
  append(...nodes) {
    for (const n of nodes) {
      const node = this._toNode(n);
      this._adopt(node);
      this.childNodes.push(node);
    }
  }
  appendChild(node) {
    this.append(node);
    return node;
  }
  prepend(...nodes) {
    const list = nodes.map((n) => this._toNode(n));
    list.forEach((n) => this._adopt(n));
    this.childNodes.unshift(...list);
  }
  insertBefore(node, ref) {
    if (!ref) return this.appendChild(node);
    this._adopt(node);
    this.childNodes.splice(this.childNodes.indexOf(ref), 0, node);
    return node;
  }
  removeChild(node) {
    this._detach(node);
    return node;
  }
  remove() {
    if (this.parentNode) this.parentNode._detach(this);
  }
  replaceChildren(...nodes) {
    for (const c of this.childNodes.slice()) this._detach(c);
    this.append(...nodes);
  }
  replaceWith(...nodes) {
    const parent = this.parentNode;
    if (!parent) return;
    const list = nodes.map((n) => parent._toNode(n));
    const i = parent.childNodes.indexOf(this);
    parent._detach(this);
    list.forEach((n) => parent._adopt(n));
    parent.childNodes.splice(i, 0, ...list);
  }
  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  /* Events */
  addEventListener(type, fn, options) {
    if (!fn) return;
    const capture = typeof options === "boolean" ? options : Boolean(options && options.capture);
    (this._listeners ||= []).push({ type, fn, capture });
  }
  removeEventListener(type, fn, options) {
    const capture = typeof options === "boolean" ? options : Boolean(options && options.capture);
    this._listeners = (this._listeners || []).filter((l) => !(l.type === type && l.fn === fn && l.capture === capture));
  }
  _fire(event, phaseCapture) {
    for (const l of (this._listeners || []).slice()) {
      if (l.type !== event.type) continue;
      if (phaseCapture !== null && l.capture !== phaseCapture) continue;
      event.currentTarget = this;
      const result = typeof l.fn === "function" ? l.fn.call(this, event) : l.fn.handleEvent(event);
      if (result && typeof result.then === "function") event._promises.push(result);
      if (event._stopped) return;
    }
  }
  dispatchEvent(event) {
    event.target = this;
    const pathNodes = [];
    for (let n = this.parentNode; n; n = n.parentNode) pathNodes.push(n);
    const win = this.ownerDocument && this.ownerDocument.defaultView;
    if (win && pathNodes[pathNodes.length - 1] === this.ownerDocument) pathNodes.push(win);
    for (let i = pathNodes.length - 1; i >= 0 && !event._stopped; i--) pathNodes[i]._fire(event, true);
    if (!event._stopped) this._fire(event, null);
    if (event.bubbles) for (let i = 0; i < pathNodes.length && !event._stopped; i++) pathNodes[i]._fire(event, false);
    if (!event.defaultPrevented && typeof this._defaultAction === "function") this._defaultAction(event);
    return !event.defaultPrevented;
  }
}

class Text extends Node {
  constructor(doc, data) {
    super(doc);
    this.data = String(data);
    this.nodeType = 3;
  }
  get textContent() {
    return this.data;
  }
  set textContent(v) {
    this.data = String(v);
  }
  cloneNode() {
    return new Text(this.ownerDocument, this.data);
  }
}

class Event {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this._stopped = false;
    this._promises = [];
    Object.assign(this, init.extra || {});
  }
  preventDefault() {
    if (this.cancelable) this.defaultPrevented = true;
  }
  stopPropagation() {
    this._stopped = true;
  }
  stopImmediatePropagation() {
    this._stopped = true;
  }
}

const BOOL_ATTRS = ["hidden", "disabled", "required", "open", "readonly", "autofocus", "multiple"];
const STR_ATTRS = ["id", "href", "src", "alt", "type", "name", "title", "target", "rel", "placeholder", "method", "action", "role", "lang"];
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

class Element extends Node {
  constructor(doc, tagName) {
    super(doc);
    this.nodeType = 1;
    this.localName = String(tagName).toLowerCase();
    this.tagName = this.localName.toUpperCase();
    this.nodeName = this.tagName;
    this._attrs = new Map();
    this.style = {
      _props: {},
      setProperty(k, v) { this._props[k] = String(v); },
      removeProperty(k) { delete this._props[k]; },
      getPropertyValue(k) { return this._props[k] || ""; }
    };
    const self = this;
    this.dataset = new Proxy({}, {
      get(_, key) { return typeof key === "string" ? self.getAttribute(`data-${kebab(key)}`) ?? undefined : undefined; },
      set(_, key, value) { self.setAttribute(`data-${kebab(key)}`, value); return true; },
      deleteProperty(_, key) { self.removeAttribute(`data-${kebab(key)}`); return true; },
      has(_, key) { return self.hasAttribute(`data-${kebab(key)}`); },
      ownKeys() { return [...self._attrs.keys()].filter((k) => k.startsWith("data-")).map((k) => camel(k.slice(5))); },
      getOwnPropertyDescriptor(_, key) {
        const v = self.getAttribute(`data-${kebab(key)}`);
        return v === null ? undefined : { value: v, enumerable: true, configurable: true, writable: true };
      }
    });
  }
  /* Attributes */
  getAttribute(name) {
    const v = this._attrs.get(String(name).toLowerCase());
    return v === undefined ? null : v;
  }
  setAttribute(name, value) {
    this._attrs.set(String(name).toLowerCase(), String(value));
  }
  removeAttribute(name) {
    this._attrs.delete(String(name).toLowerCase());
  }
  hasAttribute(name) {
    return this._attrs.has(String(name).toLowerCase());
  }
  toggleAttribute(name, force) {
    const on = force === undefined ? !this.hasAttribute(name) : Boolean(force);
    if (on) this.setAttribute(name, "");
    else this.removeAttribute(name);
    return on;
  }
  get attributes() {
    return [...this._attrs.entries()].map(([name, value]) => ({ name, value }));
  }
  get className() {
    return this.getAttribute("class") || "";
  }
  set className(v) {
    this.setAttribute("class", v);
  }
  get classList() {
    const self = this;
    const list = () => self.className.split(/\s+/).filter(Boolean);
    const save = (arr) => self.setAttribute("class", arr.join(" "));
    return {
      contains: (c) => list().includes(c),
      add: (...cs) => save([...new Set([...list(), ...cs])]),
      remove: (...cs) => save(list().filter((x) => !cs.includes(x))),
      toggle(c, force) {
        const has = list().includes(c);
        const on = force === undefined ? !has : Boolean(force);
        if (on && !has) save([...list(), c]);
        if (!on && has) save(list().filter((x) => x !== c));
        return on;
      },
      get length() { return list().length; },
      [Symbol.iterator]() { return list()[Symbol.iterator](); }
    };
  }
  get htmlFor() {
    return this.getAttribute("for") || "";
  }
  set htmlFor(v) {
    this.setAttribute("for", v);
  }
  get tabIndex() {
    return Number(this.getAttribute("tabindex") ?? -1);
  }
  set tabIndex(v) {
    this.setAttribute("tabindex", v);
  }
  get width() {
    return Number(this.getAttribute("width") || 0);
  }
  set width(v) {
    this.setAttribute("width", v);
  }
  get height() {
    return Number(this.getAttribute("height") || 0);
  }
  set height(v) {
    this.setAttribute("height", v);
  }
  set innerHTML(html) {
    this.replaceChildren(...parseFragment(this.ownerDocument, String(html)));
  }
  get innerHTML() {
    return this.textContent;
  }
  /* Tree queries */
  get nextElementSibling() {
    if (!this.parentNode) return null;
    const sib = this.parentNode.children;
    return sib[sib.indexOf(this) + 1] || null;
  }
  matches(selector) {
    return parseSelectorList(selector).some((complex) => matchComplex(this, complex));
  }
  closest(selector) {
    const list = parseSelectorList(selector);
    for (let n = this; n instanceof Element; n = n.parentNode) {
      if (list.some((complex) => matchComplex(n, complex))) return n;
    }
    return null;
  }
  querySelectorAll(selector) {
    return querySelectorAllIn(this, selector);
  }
  querySelector(selector) {
    return querySelectorAllIn(this, selector)[0] || null;
  }
  cloneNode(deep = false) {
    const copy = this.ownerDocument.createElement(this.localName);
    for (const [k, v] of this._attrs) copy._attrs.set(k, v);
    if (deep) copy.append(...this.childNodes.map((c) => c.cloneNode(true)));
    return copy;
  }
  /* Interaction */
  focus() {
    this.ownerDocument.activeElement = this;
  }
  blur() {
    if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body;
  }
  click() {
    this.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
  }
  getBoundingClientRect() {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  }
  get clientWidth() { return 0; }
  get clientHeight() { return 0; }
  get scrollWidth() { return 0; }
  get offsetHeight() { return 0; }
  scrollIntoView() {}
  /* Popover */
  showPopover() {
    this.classList.add(":popover-open");
  }
  hidePopover() {
    this.classList.remove(":popover-open");
  }
  togglePopover() {
    this.classList.toggle(":popover-open");
  }
  get popover() {
    return this.getAttribute("popover");
  }
  /* Dialog */
  showModal() {
    this._returnFocus = this.ownerDocument.activeElement;
    this.open = true;
    const auto = this.querySelector("[autofocus]");
    (auto || this).focus();
  }
  show() {
    this.showModal();
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
    if (this._returnFocus) this._returnFocus.focus();
  }
  /* Forms */
  get form() {
    return this.closest("form");
  }
  get labels() {
    const out = [];
    if (this.id) out.push(...this.ownerDocument.querySelectorAll(`label[for="${this.id}"]`));
    const wrap = this.parentNode && this.parentNode instanceof Element ? this.parentNode.closest("label") : null;
    if (wrap && !out.includes(wrap)) out.push(wrap);
    return out;
  }
  get options() {
    return this.localName === "select" ? this.querySelectorAll("option") : undefined;
  }
  get selectedIndex() {
    const opts = this.options || [];
    const i = opts.findIndex((o) => o._selected === true);
    if (i >= 0) return i;
    if (opts.some((o) => o._selected !== undefined)) return -1;
    const j = opts.findIndex((o) => o._selected === undefined && o.hasAttribute("selected"));
    return j >= 0 ? j : opts.length ? 0 : -1;
  }
  set selectedIndex(i) {
    (this.options || []).forEach((o, k) => { o._selected = k === i; });
  }
  get value() {
    if (this.localName === "option") return this.hasAttribute("value") ? this.getAttribute("value") : this.textContent.replace(/\s+/g, " ").trim();
    if (this.localName === "select") {
      const opts = this.options;
      const i = this.selectedIndex;
      return i >= 0 ? opts[i].value : "";
    }
    if (this.localName === "textarea") return this._value !== undefined ? this._value : this.textContent;
    if (this._value !== undefined) return this._value;
    const v = this.getAttribute("value");
    if (v !== null) return v;
    return this.localName === "input" && (this.type === "checkbox" || this.type === "radio") ? "on" : "";
  }
  set value(v) {
    v = v == null ? "" : String(v);
    if (this.localName === "select") {
      const opts = this.options;
      const i = opts.findIndex((o) => o.value === v);
      opts.forEach((o, k) => { o._selected = k === i; });
      if (i < 0 && opts.length) opts.forEach((o) => { o._selected = false; });
      this._noSelection = i < 0;
      return;
    }
    if (this.localName === "option") { this.setAttribute("value", v); return; }
    this._value = v;
  }
  get checked() {
    return this._checked !== undefined ? this._checked : this.hasAttribute("checked");
  }
  set checked(on) {
    this._checked = Boolean(on);
    if (on && this.type === "radio" && this.name) {
      const scope = this.form || this.ownerDocument;
      scope.querySelectorAll(`input[type="radio"]`).forEach((r) => {
        if (r !== this && r.name === this.name) r._checked = false;
      });
    }
  }
  get elements() {
    if (this.localName !== "form" && this.localName !== "fieldset") return undefined;
    const controls = this.querySelectorAll("input, select, textarea, button, fieldset, output");
    const list = controls.slice();
    return new Proxy(list, {
      get(target, key) {
        if (typeof key === "string" && !/^\d+$/.test(key) && !(key in Array.prototype) && key !== "length") {
          const named = target.filter((c) => c.getAttribute("name") === key || c.id === key);
          if (!named.length) return undefined;
          if (named.length === 1) return named[0];
          return radioNodeList(named);
        }
        return Reflect.get(target, key);
      }
    });
  }
  get validity() {
    return computeValidity(this);
  }
  get willValidate() {
    return ["input", "select", "textarea"].includes(this.localName) && !this.disabled && !this.readOnly && this.type !== "hidden";
  }
  checkValidity() {
    return !this.willValidate || this.validity.valid;
  }
  reportValidity() {
    return this.checkValidity();
  }
  setCustomValidity(msg) {
    this._customError = String(msg || "");
  }
  get readOnly() {
    return this.hasAttribute("readonly");
  }
  requestSubmit(submitter) {
    if (this.localName !== "form") return;
    const invalid = this.querySelectorAll("input, select, textarea").filter((f) => f.willValidate && !f.validity.valid);
    if (invalid.length) {
      invalid.forEach((f) => f.dispatchEvent(new Event("invalid", { cancelable: true })));
      invalid[0].focus();
      return;
    }
    this.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true, extra: { submitter: submitter || null } }));
  }
  reset() {
    if (this.localName !== "form") return;
    const ok = this.dispatchEvent(new Event("reset", { bubbles: true, cancelable: true }));
    if (!ok) return;
    this.querySelectorAll("input, select, textarea").forEach((f) => {
      delete f._value;
      delete f._checked;
      if (f.localName === "select") f.options.forEach((o) => { delete o._selected; });
    });
  }
  _defaultAction(event) {
    if (event.type !== "click") return;
    if (this.localName === "button" && (this.getAttribute("type") || "submit") === "submit") {
      const form = this.form;
      if (form && !this.disabled) {
        if ((form.getAttribute("method") || "").toLowerCase() === "dialog") {
          const dialog = form.closest("dialog");
          if (dialog) dialog.close();
        } else form.requestSubmit(this);
      }
    }
  }
}

for (const name of BOOL_ATTRS) {
  if (name === "readonly") continue;
  Object.defineProperty(Element.prototype, name, {
    get() { return this.hasAttribute(name); },
    set(v) { this.toggleAttribute(name, Boolean(v)); },
    configurable: true
  });
}
for (const name of STR_ATTRS) {
  Object.defineProperty(Element.prototype, name, {
    get() {
      const v = this.getAttribute(name);
      if (name === "type" && v === null) return this.localName === "button" ? "submit" : this.localName === "input" ? "text" : "";
      return v === null ? "" : v;
    },
    set(v) { this.setAttribute(name, v); },
    configurable: true
  });
}

function radioNodeList(nodes) {
  const list = nodes.slice();
  Object.defineProperty(list, "value", {
    get() {
      const on = nodes.find((n) => n.checked);
      return on ? on.value : "";
    },
    set(v) {
      nodes.forEach((n) => { n._checked = n.value === String(v); });
    }
  });
  return list;
}

/* WHATWG valid e-mail address */
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function computeValidity(f) {
  const state = { valueMissing: false, typeMismatch: false, patternMismatch: false, tooShort: false, tooLong: false, customError: Boolean(f._customError) };
  if (["input", "select", "textarea"].includes(f.localName)) {
    const value = f.value;
    const type = (f.getAttribute("type") || "text").toLowerCase();
    if (f.required) {
      if (type === "checkbox" || type === "radio") state.valueMissing = !f.checked;
      else state.valueMissing = value === "";
    }
    if (value !== "" && type === "email") state.typeMismatch = !EMAIL_RE.test(value);
    const pattern = f.getAttribute("pattern");
    if (value !== "" && pattern !== null && f.localName === "input") {
      // Browsers compile `pattern` with the v flag and ignore it when that fails.
      let re = null;
      try { re = new RegExp(`^(?:${pattern})$`, "v"); } catch { re = null; }
      if (re) state.patternMismatch = !re.test(value);
    }
    // minlength/maxlength apply to user-edited values only.
    if (value !== "" && f._userEdited) {
      const min = f.getAttribute("minlength");
      const max = f.getAttribute("maxlength");
      if (min !== null && value.length < Number(min)) state.tooShort = true;
      if (max !== null && value.length > Number(max)) state.tooLong = true;
    }
  }
  state.valid = !Object.values(state).some(Boolean);
  return state;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                          */
/* ------------------------------------------------------------------ */

const selectorCache = new Map();

function splitTop(str, sepChar) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (const ch of str) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (depth === 0 && ch === sepChar) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseCompound(src) {
  const c = { tag: null, ids: [], classes: [], attrs: [], nots: [], pseudo: [] };
  const re = /^(\*|[a-zA-Z][\w-]*)|#([\w-]+)|\.([\w:-]+)|\[\s*([\w-]+)\s*(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]|:not\(([^)]*)\)|:([\w-]+)/y;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new SyntaxError(`dom-stub: unsupported selector "${src}"`);
    if (m[1]) c.tag = m[1] === "*" ? null : m[1].toLowerCase();
    else if (m[2]) c.ids.push(m[2]);
    else if (m[3]) c.classes.push(m[3]);
    else if (m[4]) c.attrs.push({ name: m[4].toLowerCase(), op: m[5] || null, value: m[6] ?? m[7] ?? m[8] ?? null });
    else if (m[9] !== undefined) c.nots.push(parseSelectorList(m[9]));
    else if (m[10]) c.pseudo.push(m[10]);
    i = re.lastIndex;
  }
  return c;
}

/** Complex selector -> [{ compound, combinator }] from left to right. */
function parseComplex(src) {
  const parts = [];
  const tokens = src.replace(/\s*>\s*/g, " > ").trim().split(/\s+/);
  let combinator = " ";
  for (const t of tokens) {
    if (t === ">") { combinator = ">"; continue; }
    parts.push({ compound: parseCompound(t), combinator });
    combinator = " ";
  }
  return parts;
}

function parseSelectorList(selector) {
  if (selectorCache.has(selector)) return selectorCache.get(selector);
  const list = splitTop(selector, ",").map(parseComplex);
  selectorCache.set(selector, list);
  return list;
}

function matchCompound(el, c) {
  if (!(el instanceof Element)) return false;
  if (c.tag && el.localName !== c.tag) return false;
  for (const id of c.ids) if (el.id !== id) return false;
  if (c.classes.length) {
    const own = el.className.split(/\s+/);
    for (const cls of c.classes) if (!own.includes(cls)) return false;
  }
  for (const a of c.attrs) {
    const v = el.getAttribute(a.name);
    if (v === null) return false;
    if (a.op === "=" && v !== a.value) return false;
    if (a.op === "~=" && !v.split(/\s+/).includes(a.value)) return false;
    if (a.op === "^=" && !v.startsWith(a.value)) return false;
    if (a.op === "$=" && !v.endsWith(a.value)) return false;
    if (a.op === "*=" && !v.includes(a.value)) return false;
  }
  for (const not of c.nots) if (not.some((complex) => matchComplex(el, complex))) return false;
  for (const p of c.pseudo) {
    if (p === "checked") { if (!el.checked) return false; continue; }
    if (p === "disabled") { if (!el.disabled) return false; continue; }
    throw new SyntaxError(`dom-stub: unsupported pseudo-class ":${p}"`);
  }
  return true;
}

function matchComplex(el, parts, index = parts.length - 1) {
  if (!matchCompound(el, parts[index].compound)) return false;
  if (index === 0) return true;
  const comb = parts[index].combinator;
  if (comb === ">") return el.parentNode instanceof Element && matchComplex(el.parentNode, parts, index - 1);
  for (let n = el.parentNode; n instanceof Element; n = n.parentNode) {
    if (matchComplex(n, parts, index - 1)) return true;
  }
  return false;
}

function descendants(root) {
  const out = [];
  const walk = (n) => {
    for (const c of n.childNodes) {
      if (c instanceof Element) { out.push(c); walk(c); }
    }
  };
  walk(root);
  return out;
}

function querySelectorAllIn(root, selector) {
  const list = parseSelectorList(selector);
  return descendants(root).filter((el) => list.some((complex) => matchComplex(el, complex)));
}

/* ------------------------------------------------------------------ */
/* HTML parsing                                                       */
/* ------------------------------------------------------------------ */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);

function parseAttrString(src) {
  const attrs = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs.push([m[1].toLowerCase(), decodeEntities(m[2] ?? m[3] ?? m[4] ?? "")]);
  return attrs;
}

/** Parses well-formed HTML into a list of nodes owned by `doc`. */
function parseFragment(doc, html) {
  const rootNodes = [];
  const stack = [];
  const appendNode = (node) => {
    if (stack.length) stack[stack.length - 1].appendChild(node);
    else rootNodes.push(node);
  };
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+|<)/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) {
      const tag = m[1].toLowerCase();
      const idx = stack.map((e) => e.localName).lastIndexOf(tag);
      if (idx >= 0) stack.length = idx;
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      let attrSrc = m[3] || "";
      const selfClosing = /\/\s*$/.test(attrSrc);
      if (selfClosing) attrSrc = attrSrc.replace(/\/\s*$/, "");
      const el = doc.createElement(tag);
      for (const [k, v] of parseAttrString(attrSrc)) el._attrs.set(k, v);
      appendNode(el);
      if (RAW.has(tag) && !selfClosing) {
        const end = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
        const stop = end < 0 ? html.length : end;
        const raw = html.slice(re.lastIndex, stop);
        if (raw) el.appendChild(doc.createTextNode(tag === "script" || tag === "style" ? raw : decodeEntities(raw)));
        const close = html.indexOf(">", stop);
        re.lastIndex = close < 0 ? html.length : close + 1;
      } else if (!VOID.has(tag) && !selfClosing) {
        stack.push(el);
      }
    } else if (m[4] !== undefined) {
      appendNode(doc.createTextNode(decodeEntities(m[4])));
    }
  }
  return rootNodes;
}

/* ------------------------------------------------------------------ */
/* Document and window                                                */
/* ------------------------------------------------------------------ */

class Document extends Node {
  constructor() {
    super(null);
    this.ownerDocument = this;
    this.nodeType = 9;
    this.activeElement = null;
    this.defaultView = null;
  }
  createElement(tag) {
    return new Element(this, tag);
  }
  createTextNode(text) {
    return new Text(this, text);
  }
  createDocumentFragment() {
    return new Element(this, "#fragment");
  }
  get documentElement() {
    return this.children.find((c) => c.localName === "html") || null;
  }
  get head() {
    return this.documentElement ? this.documentElement.children.find((c) => c.localName === "head") : null;
  }
  get body() {
    return this.documentElement ? this.documentElement.children.find((c) => c.localName === "body") : null;
  }
  get title() {
    const t = this.querySelector("title");
    return t ? t.textContent : "";
  }
  set title(v) {
    let t = this.querySelector("title");
    if (!t) { t = this.createElement("title"); this.head.append(t); }
    t.textContent = v;
  }
  getElementById(id) {
    return descendants(this).find((e) => e.id === id) || null;
  }
  querySelectorAll(selector) {
    return querySelectorAllIn(this, selector);
  }
  querySelector(selector) {
    return querySelectorAllIn(this, selector)[0] || null;
  }
}

function parseDocument(html) {
  const doc = new Document();
  const nodes = parseFragment(doc, html);
  for (const n of nodes) if (n instanceof Element) doc.append(n);
  if (!doc.documentElement) {
    const root = doc.createElement("html");
    root.append(doc.createElement("head"), doc.createElement("body"));
    doc.append(root);
  }
  doc.activeElement = doc.body;
  return doc;
}

function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
    _map: map
  };
}

/**
 * Builds a page document and a vm context acting as `window`.
 * options:
 *   page        HTML file name (default index.html), or html: raw markup
 *   search      location.search, e.g. "?cat=ghee"
 *   storage     initial localStorage entries { key: string }
 *   fetchImpl   async (url, init) => ({ ok, status }); calls are recorded
 *   openResult  value returned by window.open (default {} = not blocked)
 */
function createWindow(options = {}) {
  const page = options.page || "index.html";
  const html = options.html ?? fs.readFileSync(path.join(ROOT, page), "utf8");
  const doc = parseDocument(html);

  const timers = new Map();
  let timerId = 0;
  const calls = { fetch: [], open: [], navigations: [], history: [] };

  const loc = {
    protocol: "https:",
    host: "www.example.com",
    origin: "https://www.example.com",
    pathname: `/${page}`,
    search: options.search || "",
    hash: "",
    get href() { return `${this.origin}${this.pathname}${this.search}${this.hash}`; },
    set href(v) { calls.navigations.push(String(v)); },
    assign(v) { calls.navigations.push(String(v)); },
    replace(v) { calls.navigations.push(String(v)); }
  };

  const mediaQuery = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  class Observer { constructor(cb) { this.cb = cb; } observe() {} unobserve() {} disconnect() {} }

  const win = {
    document: doc,
    location: loc,
    history: {
      state: null,
      replaceState(state, _title, url) {
        calls.history.push(String(url));
        const u = new URL(String(url), loc.href);
        loc.pathname = u.pathname;
        loc.search = u.search;
        loc.hash = u.hash;
      },
      pushState(state, title, url) { this.replaceState(state, title, url); }
    },
    localStorage: createStorage(options.storage),
    sessionStorage: createStorage(),
    navigator: { userAgent: "dom-stub", clipboard: { writeText: async () => {} } },
    matchMedia: mediaQuery,
    CSS: { supports: () => false, escape: (s) => String(s) },
    IntersectionObserver: Observer,
    ResizeObserver: Observer,
    MutationObserver: Observer,
    requestAnimationFrame: (cb) => { cb(0); return 0; },
    cancelAnimationFrame: () => {},
    setTimeout: (fn, ms = 0) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    setInterval: () => 0,
    clearInterval: () => {},
    scrollTo: () => {},
    innerWidth: 1280,
    innerHeight: 800,
    open: (url) => { calls.open.push(String(url)); return options.openResult === undefined ? {} : options.openResult; },
    fetch: async (url, init = {}) => {
      calls.fetch.push({ url: String(url), init });
      const impl = options.fetchImpl || (async () => ({ ok: true, status: 200 }));
      return impl(url, init);
    },
    URL,
    URLSearchParams,
    console,
    Node,
    Text,
    Element,
    HTMLElement: Element,
    HTMLDialogElement: Element,
    Event,
    CustomEvent: Event
  };
  // Window-level events (e.g. "storage" in cart.js)
  win.addEventListener = Node.prototype.addEventListener;
  win.removeEventListener = Node.prototype.removeEventListener;
  win._fire = Node.prototype._fire;
  win.dispatchEvent = function dispatchEvent(event) {
    event.target = this;
    this._fire(event, null);
    return !event.defaultPrevented;
  };
  doc.defaultView = win;
  // Native popover support is reported (Element.prototype defines a
  // `popover` getter), so main.js skips the polyfill import.

  const context = vm.createContext(win);
  win.window = context;
  win.self = context;
  win.globalThis = context;

  return {
    window: context,
    document: doc,
    calls,
    /** Runs pending timers (and timers they schedule) up to `rounds` times. */
    runTimers(rounds = 10) {
      for (let r = 0; r < rounds && timers.size; r++) {
        const pending = [...timers.entries()].sort((a, b) => a[1].ms - b[1].ms);
        timers.clear();
        for (const [, t] of pending) t.fn();
      }
    },
    run(file) {
      const source = fs.readFileSync(path.join(ROOT, file), "utf8");
      vm.runInContext(source, context, { filename: file });
    },
    runSource(source, filename = "inline.js") {
      vm.runInContext(source, context, { filename });
    }
  };
}

/**
 * Loads a page with its site scripts, in the same order as the HTML.
 * options (in addition to createWindow):
 *   scripts     list of js files (default: the page's own <script src> list)
 *   configure   (SweetShop) => void, runs after config.js and data.js
 *               (use it to set config.ordering.channel or filter data)
 */
function loadSite(options = {}) {
  const site = createWindow(options);
  const scripts = options.scripts || site.document.querySelectorAll("script[src]").map((s) => s.getAttribute("src"));
  const early = scripts.filter((s) => s === "js/config.js" || s === "js/data.js");
  const late = scripts.filter((s) => !early.includes(s));
  early.forEach((s) => site.run(s));
  if (options.configure) options.configure(site.window.SweetShop);
  late.forEach((s) => site.run(s));
  site.S = site.window.SweetShop;
  return site;
}

/** Lets pending promise callbacks (fetch stub, async handlers) settle. */
function flush() {
  return new Promise((resolve) => setImmediate(resolve)).then(() => new Promise((resolve) => setImmediate(resolve)));
}

/** Simulates a user typing a value into a field (input + change events). */
function typeInto(field, value) {
  const max = field.getAttribute("maxlength");
  let v = String(value);
  if (max !== null && field.localName !== "select") v = v.slice(0, Number(max));
  field.value = v;
  field._userEdited = true;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  field.dispatchEvent(new Event("blur"));
}

module.exports = {
  Node,
  Text,
  Element,
  Event,
  Document,
  parseDocument,
  parseFragment,
  createStorage,
  createWindow,
  loadSite,
  flush,
  typeInto
};
