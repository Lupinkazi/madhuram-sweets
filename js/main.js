/*
 * Shared site behaviour: config binding, navigation, sticky header,
 * scroll reveal, back-to-top, toast and catalogue helpers.
 * Loaded on every page after config.js and data.js.
 */
(() => {
  "use strict";
  const S = window.SweetShop;
  const cfg = S.config;
  const data = S.data;
  const root = document.documentElement;

  /* ---------- Small DOM helpers ---------- */
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  /** Build an element. Text is always set via textContent (never innerHTML). */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of [].concat(children)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  /** Inline SVG icon from the sprite-free icon set below. */
  const ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    prev: '<path d="M15 6l-6 6 6 6"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8c-.2 1-1 1.6-2 1.5A6 6 0 0 1 8.4 10c-.1-1 .5-1.8 1.5-2l.8 1.8z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>'
  };
  function icon(name, extraClass = "") {
    const span = document.createElement("span");
    span.innerHTML = `<svg class="${extraClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
    return span.firstElementChild;
  }

  /* ---------- Catalogue helpers ---------- */
  // Only available products are active; unavailable ones never reach a list or the order picker.
  data.products = data.products.filter((p) => p.available !== false);
  const productMap = new Map(data.products.map((p) => [p.id, p]));
  const categoryMap = new Map(data.categories.map((c) => [c.id, c]));
  const getProduct = (id) => productMap.get(id);
  const getCategory = (id) => categoryMap.get(id);
  const inCategory = (p, catId) => p.category === catId || (p.alsoIn || []).includes(catId);
  const unitsFor = (p) => (p && p.units) || [data.SINGLE_UNIT];
  /** Price (Rs.) of one unit of a product, or null when that size is not offered. */
  function priceFor(p, unit) {
    if (!p) return null;
    if (p.pricing) {
      const size = data.SWEET_SIZES.find(([, label]) => label === (unit || unitsFor(p)[0]));
      const v = size ? p.pricing[size[0]] : null;
      return Number.isFinite(v) && v > 0 ? v : null;
    }
    return Number.isFinite(p.price) && p.price > 0 ? p.price : null;
  }
  const hasPrice = (p, unit) => cfg.ordering.showPrices && priceFor(p, unit) !== null;
  const money = (value) => `Rs. ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}`;
  /** All offered prices of a product as [{ unit, price }]. */
  const priceOptions = (p) => unitsFor(p).map((unit) => ({ unit, price: priceFor(p, unit) })).filter((o) => o.price !== null);
  const priceLabel = (p) => {
    const first = priceOptions(p)[0];
    if (!first || !cfg.ordering.showPrices) return "Price on request";
    return p.pricing ? `${money(first.price)} / ${first.unit.toLowerCase()}` : money(first.price);
  };
  /** Extra sweet sizes, e.g. "Half kg Rs. 650 · 1 kg Rs. 1,300" (empty for single-price dishes). */
  const priceMore = (p) => (p.pricing && cfg.ordering.showPrices ? priceOptions(p).slice(1).map((o) => `${o.unit} ${money(o.price)}`).join(" · ") : "");

  /* ---------- Popover polyfill (only when native support is missing) ---------- */
  if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
    import("https://unpkg.com/@oddbird/popover-polyfill@0.7.3/dist/popover.min.js").catch(() => {});
  }
  const isOpen = (node) => {
    try { return node.matches(":popover-open"); } catch { return node.classList.contains(":popover-open"); }
  };

  /* ---------- Config binding ---------- */
  function getPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  /* ---------- Contact map ----------
     Real Google map (Maps JavaScript API). The key is not in the code or page source:
     it is fetched from /api/maps-key (server env GOOGLE_MAPS_API_KEY). Restrict the key to
     your domain in Google Cloud Console, because the browser sends it to Google.
     If the key is missing or rejected, a keyless Google embed is shown instead. */
  const SHOP_FALLBACK = "27.7235857,85.2934309";
  function shopLatLng(c) {
    const [lat, lng] = String(c.mapCenter || SHOP_FALLBACK).split(",").map(Number);
    return { lat, lng };
  }
  function buildPin() {
    const tipId = "map-pin-tip";
    const pin = el("button", {
      type: "button", class: "map-pin", "aria-describedby": tipId,
      "aria-label": `${cfg.brand.name}, Dhungedhara: show the walking path from Dhungedhara`
    });
    pin.innerHTML = '<svg viewBox="0 0 40 52" aria-hidden="true" focusable="false"><path d="M20 1C9.5 1 1 9.3 1 19.6 1 33.4 20 51 20 51s19-17.6 19-31.4C39 9.3 30.5 1 20 1z" fill="#F28C28" stroke="#fff" stroke-width="2"/><circle cx="20" cy="19.5" r="7" fill="#fff"/></svg>';
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      if (S.openRouteDemo) S.openRouteDemo(pin);
      else toast("The path demo is still loading. Please try again in a moment.");
    });
    return el("div", { class: "map-pin-wrap" }, [
      el("p", { class: "map-pin-tip", id: tipId, text: "Tap location icon to see path" }),
      pin
    ]);
  }
  function loadGoogleMaps(key) {
    if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(window.google.maps);
    return new Promise((resolve, reject) => {
      const cb = "__sweetShopMapsReady";
      window[cb] = () => { delete window[cb]; resolve(window.google.maps); };
      const params = new URLSearchParams({ key, callback: cb, loading: "async", v: "weekly", language: "en", region: "NP" });
      const script = el("script", { src: `https://maps.googleapis.com/maps/api/js?${params}`, async: true });
      script.addEventListener("error", () => reject(new Error("maps_script_failed")));
      document.head.append(script);
    });
  }
  function showEmbedMap(stage, c) {
    const at = c.mapCenter || SHOP_FALLBACK;
    stage.replaceChildren(
      el("iframe", {
        src: `https://www.google.com/maps?q=${at}&ll=${at}&z=18&hl=en&gl=np&output=embed`,
        title: `Map showing ${cfg.brand.name}`, loading: "lazy", tabindex: "-1",
        referrerpolicy: "strict-origin-when-cross-origin"
      }),
      el("div", { class: "map-pin-anchor" }, [buildPin()])
    );
  }
  async function initMap(box, c) {
    const stage = el("div", { class: "map-stage" });
    box.append(stage, el("a", {
      class: "btn btn-secondary btn-sm map-open",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapCenter || c.mapQuery)}`,
      target: "_blank", rel: "noopener", text: "Open in Google Maps"
    }));
    let failed = false;
    const fallback = () => { if (!failed) { failed = true; showEmbedMap(stage, c); } };
    window.gm_authFailure = fallback; // Google calls this when the key is rejected
    try {
      const res = await fetch("/api/maps-key", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("no_key");
      const { key } = await res.json();
      if (!key) throw new Error("no_key");
      const maps = await loadGoogleMaps(key);
      if (failed) return;
      const center = shopLatLng(c);
      const canvas = el("div", { class: "map-canvas", role: "region", "aria-label": `Map showing ${cfg.brand.name} in Dhungedhara, Kathmandu` });
      stage.replaceChildren(canvas);
      const map = new maps.Map(canvas, {
        center, zoom: 18, minZoom: 12,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        clickableIcons: false, gestureHandling: "cooperative",
        styles: [{ featureType: "poi.business", elementType: "labels.icon", stylers: [{ saturation: -40 }] }]
      });
      // HTML pin + tooltip anchored to the shop's coordinates; it moves with the map.
      class PinOverlay extends maps.OverlayView {
        constructor() { super(); this.node = buildPin(); this.node.classList.add("is-overlay"); maps.OverlayView.preventMapHitsAndGesturesFrom(this.node); }
        onAdd() { this.getPanes().overlayMouseTarget.append(this.node); }
        draw() {
          const p = this.getProjection().fromLatLngToDivPixel(new maps.LatLng(center.lat, center.lng));
          if (p) this.node.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        }
        onRemove() { this.node.remove(); }
      }
      new PinOverlay().setMap(map);
    } catch {
      fallback();
    }
  }  function bindConfig() {
    const c = cfg.contact;
    $$("[data-config]").forEach((node) => {
      const value = getPath(cfg, node.dataset.config);
      if (typeof value === "string" && value) node.textContent = value;
    });
    $$("[data-config-phones]").forEach((a) => {
      const list = (c.phones || []).filter((p) => p && p.href);
      if (!list.length) return;
      const wrap = el("span", { class: "phone-list" }, list.map((p) => el("a", { href: `tel:${p.href}`, text: p.display })));
      a.replaceWith(wrap);
    });
    $$("[data-config-tel]").forEach((a) => {
      if (c.phoneHref) a.href = `tel:${c.phoneHref}`;
      else (a.closest("[data-config-item]") || a).hidden = true;
    });
    $$("[data-config-mail]").forEach((a) => {
      if (c.email) a.href = `mailto:${c.email}`;
      else (a.closest("[data-config-item]") || a).hidden = true;
    });
    $$("[data-whatsapp]").forEach((a) => {
      if (!c.whatsapp) { (a.closest("[data-config-item]") || a).hidden = true; return; }
      const text = a.dataset.whatsapp;
      a.href = `https://wa.me/${encodeURIComponent(c.whatsapp)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
      a.target = "_blank";
      a.rel = "noopener";
    });
    $$("[data-social]").forEach((a) => {
      const url = cfg.social[a.dataset.social];
      if (url) a.href = url;
      else (a.closest("li") || a).hidden = true;
    });
    $$("[data-config-hours]").forEach((dl) => {
      dl.replaceChildren(...cfg.hours.flatMap((h) => [el("dt", { text: h.days }), el("dd", { text: h.time })]));
    });
    $$("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });
    $$("[data-map]").forEach((box) => {
      if (!c.mapQuery) {
        box.replaceWith(el("div", { class: "empty-state" }, [
          el("h3", { text: "Map coming soon" }),
          el("p", { text: "Add the shop's location to contact.mapQuery in js/config.js to show a map here." })
        ]));
        return;
      }
      initMap(box, c);
    });
    if (cfg.highlightPlaceholders) root.classList.add("show-placeholders");
  }

  /* ---------- Responsive navigation (see navbar guide) ---------- */
  function initNav() {
    const header = $(".site-header");
    if (!header) return;
    const inner = $(".header-inner", header);
    const menu = $("#site-menu", header);
    const triggers = $$(".dropdown-trigger", header);
    const canHover = matchMedia("(hover: hover)");
    let wide = false;
    let lastWidth = 0;

    const submenuOf = (trigger) => document.getElementById(trigger.getAttribute("aria-controls"));

    function applyLayout(nextWide) {
      const menuWasOpen = menu.hasAttribute("popover") && isOpen(menu);
      wide = nextWide;
      header.classList.toggle("is-wide", wide);
      if (wide) menu.removeAttribute("popover");
      else menu.setAttribute("popover", "auto");

      triggers.forEach((trigger) => {
        const submenu = submenuOf(trigger);
        if (submenu.hasAttribute("popover") && isOpen(submenu)) submenu.hidePopover();
        if (wide) {
          submenu.setAttribute("popover", "auto");
          trigger.setAttribute("popovertarget", submenu.id);
          submenu.hidden = false;
        } else {
          submenu.removeAttribute("popover");
          trigger.removeAttribute("popovertarget");
          submenu.hidden = true;
        }
        trigger.setAttribute("aria-expanded", "false");
      });
      if (!wide && menuWasOpen) menu.showPopover();
    }

    function measure(force = false) {
      const width = header.clientWidth;
      if (!force && !wide && width <= lastWidth) { lastWidth = width; return; }
      lastWidth = width;
      header.classList.add("is-measuring", "is-wide");
      const fits = inner.scrollWidth <= inner.clientWidth + 1;
      header.classList.toggle("is-wide", wide);
      if (fits !== wide) applyLayout(fits);
      requestAnimationFrame(() => header.classList.remove("is-measuring"));
    }

    applyLayout(false);
    measure(true);
    const ro = new ResizeObserver(() => measure());
    ro.observe(header);
    ro.observe(menu);
    document.fonts?.ready.then(() => measure(true));

    /* Collapsed panel sits directly under the header */
    menu.addEventListener("beforetoggle", (event) => {
      if (event.newState === "open") {
        menu.style.setProperty("--menu-top", `${Math.round(header.getBoundingClientRect().bottom + 8)}px`);
      }
    });

    triggers.forEach((trigger) => {
      const submenu = submenuOf(trigger);
      const item = trigger.closest("li");
      let previewing = false;

      // Narrow layout: inline disclosure toggled with hidden
      trigger.addEventListener("click", (event) => {
        if (submenu.hasAttribute("popover")) {
          if (previewing) { previewing = false; event.preventDefault(); }
          return;
        }
        submenu.hidden = !submenu.hidden;
        trigger.setAttribute("aria-expanded", String(!submenu.hidden));
      });

      // Wide layout: native popover drives aria-expanded (beforetoggle is synchronous)
      submenu.addEventListener("beforetoggle", (event) => {
        if (submenu.hasAttribute("popover")) trigger.setAttribute("aria-expanded", String(event.newState === "open"));
      });
      submenu.addEventListener("toggle", (event) => {
        if (!submenu.hasAttribute("popover")) return;
        const open = event.newState === "open";
        if (!open) previewing = false;
        if (open && !CSS.supports("position-area", "block-end")) {
          const t = trigger.getBoundingClientRect();
          const s = submenu.getBoundingClientRect();
          let top = t.bottom + 8;
          if (top + s.height > innerHeight) top = Math.max(8, t.top - s.height - 8);
          const left = Math.min(Math.max(8, t.left), innerWidth - s.width - 8);
          submenu.style.top = `${top}px`;
          submenu.style.left = `${left}px`;
        }
      });

      item.addEventListener("pointerenter", (event) => {
        if (!wide || !canHover.matches || event.pointerType === "touch" || isOpen(submenu)) return;
        try { submenu.showPopover({ source: trigger }); } catch { submenu.showPopover(); }
        previewing = true;
      });
      item.addEventListener("pointerleave", () => {
        if (previewing && isOpen(submenu)) submenu.hidePopover();
        previewing = false;
      });
      item.addEventListener("focusout", (event) => {
        if (wide && event.relatedTarget && !item.contains(event.relatedTarget) && isOpen(submenu)) submenu.hidePopover();
      });
    });

    /* Sticky header background once the utility bar scrolls away */
    const sentinel = $(".utility-bar") || $("main");
    if (sentinel) {
      new IntersectionObserver(([entry]) => {
        header.classList.toggle("is-scrolled", !entry.isIntersecting);
      }).observe(sentinel);
    }

    /* Keep scroll-padding in sync with the real header height */
    new ResizeObserver(() => {
      // Separate from --header-h (which sizes the header) to avoid a resize feedback loop
      root.style.setProperty("--header-offset", `${Math.round(header.offsetHeight)}px`);
    }).observe(header);
  }

  /* ---------- Scroll reveal (native scroll-driven CSS; IO fallback) ---------- */
  const nativeReveal = CSS.supports("(animation-timeline: view()) and (animation-range: entry)");
  const motionOK = matchMedia("(prefers-reduced-motion: no-preference)").matches;
  let revealObserver = null;
  if (!nativeReveal && motionOK && "IntersectionObserver" in window) {
    root.classList.add("js-reveal");
    revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  }
  function observeReveal(scope = document) {
    if (!revealObserver) return;
    $$(".reveal:not(.is-visible)", scope).forEach((node) => revealObserver.observe(node));
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    const button = $("[data-back-to-top]");
    const first = $("main > *");
    if (!button || !first) return;
    new IntersectionObserver(([entry]) => {
      button.classList.toggle("is-visible", !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe(first);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0 });
      const target = document.getElementById("main");
      target?.focus({ preventScroll: true });
    });
  }

  /* ---------- Toast (single polite live region) ---------- */
  let toastNode = null;
  let toastTimer = 0;
  function toast(message, link) {
    if (!toastNode) {
      toastNode = el("div", { class: "toast", role: "status" });
      document.body.append(toastNode);
    }
    clearTimeout(toastTimer);
    toastNode.replaceChildren(el("span", { text: message }), link ? el("a", { href: link.href, text: link.text }) : null);
    toastTimer = setTimeout(() => toastNode.replaceChildren(), 5000);
  }

  /* ---------- Order list badge ---------- */
  function updateOrderBadge(count) {
    $$("[data-order-count]").forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    });
    $$("[data-order-link]").forEach((link) => {
      link.setAttribute("aria-label", count ? `Order list, ${count} ${count === 1 ? "item" : "items"}` : "Order list, empty");
    });
  }

  /* ---------- Dialog light-dismiss fallback for closedby="any" ---------- */
  function enableLightDismiss(dialog) {
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const outside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    dialog.addEventListener("pointerdown", (e) => { pressedOutside = outside(e); });
    dialog.addEventListener("pointerup", (e) => { if (pressedOutside && outside(e)) dialog.close(); });
  }

  /* ---------- Structured data (only for verified client information) ---------- */
  function injectStructuredData() {
    if (!cfg.verified) return;
    const c = cfg.contact;
    const json = {
      "@context": "https://schema.org",
      "@type": ["Bakery", "Restaurant"],
      name: cfg.brand.name,
      url: cfg.siteUrl,
      servesCuisine: ["Indian", "Nepalese", "Vegetarian"],
      telephone: c.phoneHref || undefined,
      email: c.email || undefined,
      address: c.address ? { "@type": "PostalAddress", streetAddress: c.address, addressCountry: "NP" } : undefined,
      openingHours: cfg.hours.map((h) => `${h.days} ${h.time}`),
      sameAs: Object.values(cfg.social).filter(Boolean)
    };
    if (cfg.brand.foundedYear) json.foundingDate = String(cfg.brand.foundedYear);
    document.head.append(el("script", { type: "application/ld+json", text: JSON.stringify(json) }));
  }

  /* ---------- Public API ---------- */
  Object.assign(S, {
    $, $$, el, icon, getProduct, getCategory, inCategory, unitsFor, priceFor, priceOptions, priceMore, hasPrice, money, priceLabel,
    toast, observeReveal, updateOrderBadge, enableLightDismiss, isOpen
  });

  /* "Call the shop" button: pick one of the shop's numbers, then open the dialer. */
  function initCallPicker() {
    const buttons = $$("[data-call-picker]");
    const list = (cfg.contact.phones || []).filter((p) => p && p.href);
    if (!buttons.length) return;
    if (!list.length) { buttons.forEach((b) => { b.hidden = true; }); return; }

    const title = el("h2", { id: "call-picker-title", class: "call-picker__title", text: "Choose a number to call" });
    const closeBtn = el("button", { type: "button", class: "call-picker__close", "aria-label": "Close" , text: "×" });
    const options = list.map((p) => el("a", { class: "call-picker__option", href: `tel:${p.href}`, text: p.display }));
    const dialog = el("dialog", { class: "call-picker", "aria-labelledby": "call-picker-title" }, [
      el("div", { class: "call-picker__head" }, [title, closeBtn]),
      el("div", { class: "call-picker__list" }, options)
    ]);
    document.body.append(dialog);

    const close = () => dialog.close();
    closeBtn.addEventListener("click", close);
    options.forEach((o) => o.addEventListener("click", () => setTimeout(close, 0)));
    // Click on the backdrop (the dialog element itself) closes it.
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });

    buttons.forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else window.location.href = `tel:${list[0].href}`;
    }));
  }

  bindConfig();
  initCallPicker();
  initNav();
  initBackToTop();
  injectStructuredData();
  // Page scripts render content after this file; observe once the DOM is complete.
  document.addEventListener("DOMContentLoaded", () => observeReveal());
})();
