/*
 * Gallery: masonry rendering with filters, an accessible <dialog>
 * lightbox (prev/next, arrow keys, Escape), YouTube facades, press,
 * certificates and testimonials. Sections with no data show an
 * honest empty state instead of invented content.
 */
(() => {
  "use strict";
  const S = window.SweetShop;
  const { $, $$, el, icon } = S;
  const data = S.data;

  /* ---------- Lightbox ---------- */
  let box = null;
  let items = [];
  let index = 0;

  function buildLightbox() {
    const img = el("img", { alt: "", width: 1200, height: 900 });
    const caption = el("figcaption");
    const count = el("p", { class: "lightbox-count", "aria-live": "polite" });
    const prev = el("button", { type: "button", class: "icon-btn", "aria-label": "Previous image" }, [icon("prev")]);
    const next = el("button", { type: "button", class: "icon-btn", "aria-label": "Next image" }, [icon("next")]);
    const close = el("button", { type: "submit", class: "icon-btn dialog-close", "aria-label": "Close gallery", autofocus: true }, [icon("close")]);
    box = el("dialog", { class: "lightbox surface-dark", "aria-label": "Image viewer", closedby: "any" }, [
      el("form", { method: "dialog" }, [close]),
      el("figure", {}, [img, caption]),
      el("div", { class: "lightbox-bar" }, [prev, count, next])
    ]);
    document.body.append(box);
    S.enableLightDismiss(box);
    prev.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => show(index + 1));
    box.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); show(index - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); show(index + 1); }
    });
    box._parts = { img, caption, count, prev, next };
  }

  function show(i) {
    index = (i + items.length) % items.length;
    const item = items[index];
    const { img, caption, count, prev, next } = box._parts;
    img.src = item.src;
    img.alt = item.alt || item.caption || "";
    if (item.w && item.h) { img.width = item.w; img.height = item.h; }
    caption.textContent = item.caption || "";
    count.textContent = `Image ${index + 1} of ${items.length}`;
    prev.hidden = next.hidden = items.length < 2;
  }

  function openLightbox(list, start = 0) {
    if (!list.length) return;
    if (!box) buildLightbox();
    items = list;
    show(start);
    box.showModal();
  }

  // Any [data-lightbox-group] container with [data-lightbox-src] buttons
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-lightbox-src]");
    if (!trigger) return;
    const group = trigger.closest("[data-lightbox-group]") || document.body;
    const triggers = $$("[data-lightbox-src]", group).filter((t) => !t.closest("[hidden]"));
    const list = triggers.map((t) => ({
      src: t.dataset.lightboxSrc,
      caption: t.dataset.caption || "",
      alt: t.querySelector("img")?.alt || t.dataset.caption || "",
      w: Number(t.dataset.w) || 0,
      h: Number(t.dataset.h) || 0
    }));
    openLightbox(list, Math.max(0, triggers.indexOf(trigger)));
  });

  /* ---------- Gallery page ---------- */
  function initGalleryPage() {
    const grid = $("[data-gallery-render]");
    if (!grid) return;
    const filters = $("[data-gallery-filter]");
    const status = $("[data-gallery-status]");

    const figures = data.gallery.map((g, i) => el("figure", { dataset: { category: g.category } }, [
      el("button", { type: "button", dataset: { lightboxSrc: g.src, caption: g.caption, w: g.w, h: g.h }, "aria-label": `Open image: ${g.caption}` }, [
        el("img", { src: g.src, alt: g.caption, width: g.w, height: g.h, loading: i < 3 ? null : "lazy", decoding: "async" })
      ])
    ]));
    grid.replaceChildren(...figures);

    const used = new Set(data.gallery.map((g) => g.category));
    const cats = [{ id: "all", name: "All" }, ...data.galleryCategories.filter((c) => used.has(c.id))];
    filters.replaceChildren(...cats.map((c) => el("label", { class: "chip" }, [
      el("input", { type: "radio", name: "gallery-cat", value: c.id, checked: c.id === "all" || null }),
      el("span", { text: c.name })
    ])));
    filters.addEventListener("change", (event) => {
      const value = event.target.value;
      let shown = 0;
      figures.forEach((f) => {
        const match = value === "all" || f.dataset.category === value;
        f.hidden = !match;
        if (match) shown++;
      });
      status.textContent = `${shown} ${shown === 1 ? "image" : "images"} shown`;
    });
  }

  initGalleryPage();
  S.openLightbox = openLightbox;
})();
