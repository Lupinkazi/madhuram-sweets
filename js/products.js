/*
 * Product rendering: demo illustrations, product cards, the product
 * detail dialog, the homepage signature collection and the catalogue
 * (filter, search, sort with URL state).
 */
(() => {
  "use strict";
  const S = window.SweetShop;
  const { $, $$, el, icon, getProduct, getCategory, inCategory, unitsFor, priceFor, money, priceLabel, hasPrice } = S;
  const data = S.data;

  /* ---------- Demo illustration generator ----------
     Used only when a product has no `image`. Each product gets a
     deterministic composition so cards do not repeat exactly. */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, list) => list[Math.floor(r() * list.length)];

  /* Drawing families, keyed by a category's `art` value. Every ghee group
     uses "ghee"; add a family here only if a new product line needs one. */
  const PALETTES = {
    ghee: [["#F0B556", "#C9802A"], ["#E7A541", "#B86E22"], ["#6B2E1F", "#3E170F"], ["#EAC26B", "#C08B33"]]
  };
  const SHAPES = {
    ghee: ["ball", "square", "ball", "diamond"]
  };
  const BACKDROPS = ["#FFF1E0", "#F4E8D8", "#E7F0E4", "#FFE9D2", "#EEF1E4"];

  function sweetsLayout(r, kind, fill, edge) {
    const pieces = [];
    const cx = 200, cy = 168;
    const count = kind === "diamond" ? 9 : 7;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + r() * 0.3;
      const ring = i === 0 ? 0 : 1;
      const x = cx + Math.cos(angle) * (ring ? 78 + r() * 18 : 0);
      const y = cy + Math.sin(angle) * (ring ? 42 + r() * 10 : 0) - 6;
      const s = 26 + r() * 8;
      if (kind === "diamond") {
        pieces.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r() * 30 - 15).toFixed(1)})"><polygon points="0,${-s * 0.7} ${s},0 0,${s * 0.7} ${-s},0" fill="url(#g)" stroke="${edge}" stroke-width="1.2"/><polygon points="0,${-s * 0.7} ${s},0 0,${-s * 0.15}" fill="#fff" opacity="0.35"/></g>`);
      } else if (kind === "roll") {
        pieces.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><ellipse rx="${s}" ry="${s * 0.62}" fill="url(#g)" stroke="${edge}"/><ellipse rx="${s * 0.6}" ry="${s * 0.36}" fill="#8FA36A"/><ellipse rx="${s * 0.28}" ry="${s * 0.17}" fill="${edge}"/></g>`);
      } else if (kind === "square") {
        pieces.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r() * 20 - 10).toFixed(1)})"><rect x="${-s * 0.8}" y="${-s * 0.55}" width="${s * 1.6}" height="${s * 1.1}" rx="6" fill="url(#g)" stroke="${edge}"/><path d="M${-s * 0.6} ${-s * 0.2}h${s * 1.2}M${-s * 0.6} ${s * 0.15}h${s * 1.2}" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/></g>`);
      } else {
        pieces.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="${s * 0.78}" fill="url(#rg)"/><circle cx="${-s * 0.25}" cy="${-s * 0.3}" r="${s * 0.16}" fill="#fff" opacity="0.4"/></g>`);
      }
    }
    return pieces.join("");
  }

  function art(product, variant = 0) {
    const r = rng(hash(product.id) + variant * 7919);
    const requested = getCategory(product.category)?.art || "ghee";
    const family = PALETTES[requested] ? requested : "ghee";
    const [fill, edge] = pick(r, PALETTES[family]);
    const bg = pick(r, BACKDROPS);
    const plate = `<ellipse cx="200" cy="212" rx="160" ry="34" fill="#24543A" opacity="0.12" filter="url(#b)"/><ellipse cx="200" cy="176" rx="158" ry="86" fill="#FFFFFF"/><ellipse cx="200" cy="176" rx="140" ry="72" fill="none" stroke="#C99543" stroke-opacity="0.45" stroke-width="2"/>`;
    const body = plate + sweetsLayout(r, pick(r, SHAPES[family]), fill, edge);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="${edge}"/></linearGradient><radialGradient id="rg" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="0.25" stop-color="${fill}"/><stop offset="1" stop-color="${edge}"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="8"/></filter><radialGradient id="v" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="300" fill="${bg}"/><rect width="400" height="300" fill="url(#v)"/><path d="M0 250 H400" stroke="#C99543" stroke-opacity="0.18"/>${body}<text x="386" y="290" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#786B61">Demo illustration</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /* Real photos: set `image` (and optionally `images: [...]` for the gallery). */
  function imageFor(p, variant = 0) {
    if (Array.isArray(p.images) && p.images[variant]) return p.images[variant];
    if (variant === 0 && p.image) return p.image;
    return art(p, variant);
  }
  const imageVariants = (p) => (Array.isArray(p.images) && p.images.length ? p.images.map((_, i) => i) : p.image ? [0] : [0, 1, 2]);
  const altFor = (p) => (p.image ? p.name : `${p.name} (demo illustration)`);

  /* ---------- Product card ---------- */
  function productCard(p, { headingLevel = "h3", reveal = true, index = 0 } = {}) {
    const cat = getCategory(p.category);
    const openBtn = el("button", { type: "button", dataset: { productOpen: p.id }, text: p.name });
    const tags = [];
    if (p.signature) tags.push(el("span", { class: "tag", text: "Signature" }));
    if (p.confirm) tags.push(el("span", { class: "tag tag--confirm", text: "To be confirmed" }));
    if (p.demo) tags.push(el("span", { class: "tag tag--confirm", text: "Demo item" }));

    const card = el("article", { class: "product-card" }, [
      el("img", { src: imageFor(p), alt: altFor(p), width: 400, height: 300, loading: "lazy", decoding: "async" }),
      el("header", {}, [
        el("p", { class: "eyebrow", text: cat ? cat.name : "" }),
        el(headingLevel, {}, [openBtn]),
        tags.length ? el("div", { class: "tag-row" }, tags) : null
      ]),
      el("p", { text: p.description || (cat ? cat.tagline : "") }),
      el("footer", {}, [
        el("span", { class: hasPrice(p) ? "price" : "price price--request", text: priceLabel(p) }),
        el("button", { type: "button", class: "btn btn-sm btn-primary", dataset: { addToOrder: p.id } }, [
          icon("plus"), "Add", el("span", { class: "visually-hidden", text: ` ${p.name} to order list` })
        ])
      ])
    ]);
    return el("li", { class: reveal ? "reveal" : null, style: `--i:${index % 4}`, dataset: { id: p.id } }, [card]);
  }

  /* ---------- Product detail dialog ---------- */
  let dialog = null;
  let current = null;
  function buildDialog() {
    const close = el("button", { type: "submit", class: "icon-btn dialog-close", "aria-label": "Close product details" }, [icon("close")]);
    dialog = el("dialog", { class: "product-dialog", id: "product-dialog", "aria-labelledby": "pd-title", closedby: "any" }, [
      el("div", { class: "pd-media" }, [
        el("img", { id: "pd-image", alt: "", width: 800, height: 600 }),
        el("div", { class: "pd-thumbs", role: "group", "aria-label": "Product images", id: "pd-thumbs" })
      ]),
      el("div", { class: "pd-info" }, [
        el("form", { method: "dialog" }, [close]),
        el("div", {}, [el("p", { class: "eyebrow", id: "pd-cat" }), el("h2", { id: "pd-title" })]),
        el("p", { id: "pd-desc" }),
        el("p", { class: "pd-note", id: "pd-note", hidden: true }),
        el("dl", { class: "pd-meta" }, [
          el("dt", { text: "Price" }), el("dd", { id: "pd-price" }),
          el("dt", { text: "Available as" }), el("dd", { id: "pd-units" })
        ]),
        el("form", { class: "pd-form", id: "pd-form" }, [
          el("div", { class: "field" }, [el("label", { for: "pd-unit", text: "Pack" }), el("select", { id: "pd-unit", name: "unit" })]),
          el("div", { class: "field" }, [el("label", { for: "pd-qty", text: "Quantity" }), el("input", { id: "pd-qty", name: "qty", type: "number", inputmode: "numeric", min: 1, max: 99, value: 1, required: true })]),
          el("button", { type: "submit", class: "btn btn-primary", autofocus: true }, [icon("plus"), "Add to order list"])
        ]),
        el("div", { class: "btn-row" }, [
          el("a", { class: "btn btn-secondary", id: "pd-enquire", href: "contact.html" }, ["Enquire about this product"]),
          el("a", { class: "text-link", href: "order.html" }, ["Go to order page"])
        ])
      ])
    ]);
    document.body.append(dialog);
    S.enableLightDismiss(dialog);

    $("#pd-form", dialog).addEventListener("submit", (event) => {
      event.preventDefault();
      if (!current) return;
      const unit = $("#pd-unit", dialog).value;
      const qty = Number($("#pd-qty", dialog).value) || 1;
      S.orderList.add(current.id, unit, qty);
      dialog.close();
      S.toast(`${current.name} (${unit} × ${qty}) added to your order list.`, { href: "order.html", text: "View list" });
    });
    $("#pd-unit", dialog).addEventListener("change", (event) => {
      if (!current) return;
      const u = event.target.value;
      const price = priceFor(current, u);
      $("#pd-price", dialog).textContent = price !== null && S.config.ordering.showPrices ? money(price) : "Price on request";
    });
    $("#pd-thumbs", dialog).addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-variant]");
      if (!btn) return;
      $("#pd-image", dialog).src = imageFor(current, Number(btn.dataset.variant));
      $$("#pd-thumbs button", dialog).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    });
  }

  function openProduct(id) {
    const p = getProduct(id);
    if (!p) return;
    if (!dialog) buildDialog();
    current = p;
    const cat = getCategory(p.category);
    $("#pd-image", dialog).src = imageFor(p);
    $("#pd-image", dialog).alt = altFor(p);
    $("#pd-cat", dialog).textContent = cat ? cat.name : "";
    $("#pd-title", dialog).textContent = p.name;
    $("#pd-desc", dialog).textContent = p.description || (cat ? cat.tagline : "");
    $("#pd-price", dialog).textContent = priceLabel(p);
    $("#pd-units", dialog).textContent = unitsFor(p).join(", ");
    const note = $("#pd-note", dialog);
    note.hidden = !(p.confirm || p.demo);
    note.textContent = p.demo ? "Demo item: replace or remove before launch." : "Name and details to be confirmed by the shop.";
    $("#pd-unit", dialog).replaceChildren(...unitsFor(p).map((u) => el("option", { value: u, text: u })));
    $("#pd-qty", dialog).value = "1";
    $("#pd-enquire", dialog).href = `contact.html?product=${encodeURIComponent(p.id)}`;
    const variants = imageVariants(p);
    $("#pd-thumbs", dialog).replaceChildren(...variants.map((v) =>
      el("button", { type: "button", dataset: { variant: v }, "aria-pressed": String(v === 0), "aria-label": `Show image ${v + 1} of ${variants.length}` }, [
        el("img", { src: imageFor(p, v), alt: "", width: 72, height: 54 })
      ])));
    $("#pd-thumbs", dialog).hidden = variants.length < 2;
    dialog.showModal();
  }

  /* ---------- Delegated actions (any page) ---------- */
  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-product-open]");
    if (open) { openProduct(open.dataset.productOpen); return; }
    const add = event.target.closest("[data-add-to-order]");
    if (add) {
      const p = getProduct(add.dataset.addToOrder);
      if (!p) return;
      const unit = unitsFor(p)[0];
      S.orderList.add(p.id, unit, 1);
      S.toast(`${p.name} (${unit}) added to your order list.`, { href: "order.html", text: "View list" });
    }
  });

  /* ---------- Homepage signature collection ---------- */
  function initSignature() {
    const grid = $("[data-signature-grid]");
    if (!grid) return;
    // Confirmed signature ids first; until the client confirms any,
    // show the first eight products of the ghee collection.
    const chosen = (data.signatureOrder || []).map(getProduct).filter(Boolean);
    const items = chosen.length ? chosen : data.products.slice(0, 8);
    grid.replaceChildren(...items.map((p, i) => productCard(p, { index: i })));
  }

  /* ---------- Catalogue page ---------- */
  function initCatalogue() {
    const grid = $("[data-catalogue-grid]");
    if (!grid) return;
    const form = $("[data-catalogue-form]");
    const chips = $("[data-category-chips]");
    const searchInput = $("#catalogue-search");
    const sortSelect = $("#catalogue-sort");
    const status = $("[data-result-count]");
    const heading = $("[data-category-heading]");
    const tagline = $("[data-category-tagline]");
    const empty = $("[data-catalogue-empty]");

    // Category chips from data: only groups that have products
    const groups = data.categories.filter((c) => data.products.some((p) => inCategory(p, c.id)));
    const options = [{ id: "all", name: "All items" }, ...groups];
    chips.replaceChildren(...options.map((c) => el("label", { class: "chip" }, [
      el("input", { type: "radio", name: "cat", value: c.id }),
      el("span", { text: c.name })
    ])));

    if (data.products.some((p) => hasPrice(p))) {
      sortSelect.append(el("option", { value: "price-asc", text: "Price: low to high" }), el("option", { value: "price-desc", text: "Price: high to low" }));
    }

    const order = new Map(data.products.map((p, i) => [p.id, i]));
    const nodes = new Map();
    data.products.forEach((p, i) => nodes.set(p.id, productCard(p, { reveal: false, index: i })));
    grid.replaceChildren(...nodes.values());

    const params = new URLSearchParams(location.search);
    const state = {
      cat: options.some((o) => o.id === params.get("cat")) ? params.get("cat") : "all",
      q: (params.get("q") || "").slice(0, 80),
      sort: ["featured", "name-asc", "name-desc", "price-asc", "price-desc"].includes(params.get("sort")) ? params.get("sort") : "featured"
    };
    form.elements.cat.value = state.cat;
    searchInput.value = state.q;
    sortSelect.value = [...sortSelect.options].some((o) => o.value === state.sort) ? state.sort : "featured";
    state.sort = sortSelect.value;

    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const basePrice = (p) => (Number.isFinite(p.price) && p.price > 0 ? p.price : (p.pricing ? (p.pricing.perPiece ?? p.pricing["200g"] ?? p.pricing.halfKg ?? p.pricing.kg ?? Infinity) : Infinity));
    const sorters = {
      featured: (a, b) => (b.signature - a.signature) || (order.get(a.id) - order.get(b.id)),
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
      "price-asc": (a, b) => basePrice(a) - basePrice(b),
      "price-desc": (a, b) => basePrice(b) - basePrice(a)
    };
    const move = Object.hasOwn(Element.prototype, "moveBefore")
      ? (node) => grid.moveBefore(node, null)
      : (node) => grid.append(node);

    // Filter changes cross-fade through a same-document view transition
    // when the browser supports it and the visitor allows motion.
    const motionOK = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: no-preference)") : null;
    const canTransition = () => typeof document.startViewTransition === "function" && Boolean(motionOK && motionOK.matches);

    let lastSort = null;
    let firstRun = true;
    function matches(p, q) {
      const pc = getCategory(p.category);
      const hay = norm(`${p.name} ${p.description} ${pc ? pc.name : ""}`);
      return (state.cat === "all" || inCategory(p, state.cat)) && (!q || hay.includes(q));
    }
    function render(cat) {
      const q = norm(state.q.trim());
      let shown = 0;
      for (const p of data.products) {
        const match = matches(p, q);
        nodes.get(p.id).hidden = !match;
        if (match) shown++;
      }
      if (state.sort !== lastSort) {
        [...data.products].sort(sorters[state.sort]).forEach((p) => move(nodes.get(p.id)));
        lastSort = state.sort;
      }
      heading.textContent = cat ? cat.name : "All menu items";
      tagline.textContent = cat ? cat.tagline : "Explore our authentic sweets, snacks, and restaurant delicacies.";
      empty.hidden = shown > 0;
      return shown;
    }

    function apply({ announce = true } = {}) {
      const cat = state.cat === "all" ? null : getCategory(state.cat);
      // The count is computed synchronously so the announcement and URL
      // never wait on the transition; the transition only animates the swap.
      let shown;
      if (!firstRun && canTransition()) {
        const q = norm(state.q.trim());
        shown = data.products.filter((p) => matches(p, q)).length;
        document.startViewTransition(() => { render(cat); });
      } else {
        shown = render(cat);
      }
      firstRun = false;
      if (announce) {
        const where = cat ? ` in ${cat.name}` : "";
        const query = state.q.trim() ? ` matching “${state.q.trim()}”` : "";
        status.textContent = `${shown} ${shown === 1 ? "product" : "products"}${where}${query}`;
      }
      const next = new URLSearchParams();
      if (state.cat !== "all") next.set("cat", state.cat);
      if (state.q.trim()) next.set("q", state.q.trim());
      if (state.sort !== "featured") next.set("sort", state.sort);
      const qs = next.toString();
      history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}`);
      document.title = `${cat ? cat.name : "Menu"} | ${S.config.brand.name}`;
    }

    form.addEventListener("submit", (event) => event.preventDefault());
    form.addEventListener("change", (event) => {
      if (event.target.name === "cat") state.cat = event.target.value;
      if (event.target === sortSelect) state.sort = sortSelect.value;
      apply();
    });
    let timer = 0;
    searchInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = searchInput.value.slice(0, 80); apply(); }, 180);
    });
    $("[data-catalogue-reset]")?.addEventListener("click", () => {
      state.cat = "all"; state.q = ""; searchInput.value = ""; form.elements.cat.value = "all";
      apply();
      searchInput.focus();
    });

    apply();
  }

  Object.assign(S, { art, imageFor, productCard, openProduct });
  initSignature();
  initCatalogue();
})();
