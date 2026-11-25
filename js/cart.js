/*
 * Order list (frontend-only basket) persisted in localStorage,
 * plus the order page product picker and summary table.
 * Nothing here sends data anywhere; see forms.js for delivery.
 */
(() => {
  "use strict";
  const S = window.SweetShop;
  const { $, $$, el, getProduct, getCategory, unitsFor, priceFor, hasPrice, money } = S;
  const KEY = "sweetshop.orderList.v1";
  const MAX_QTY = 99;
  const listeners = new Set();

  const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.round(Number(n) || 1)));

  function isValid(item) {
    const p = item && getProduct(item.id);
    return Boolean(p) && unitsFor(p).includes(item.unit) && Number.isInteger(item.qty) && item.qty >= 1 && item.qty <= MAX_QTY;
  }

  function read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(isValid) : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: keep in memory */ }
    memory = items;
    notify();
  }

  let memory = read();
  const items = () => memory.slice();
  const notify = () => listeners.forEach((fn) => fn(items()));

  const orderList = {
    items,
    count: () => memory.length,
    find: (id) => memory.find((i) => i.id === id),
    add(id, unit, qty = 1) {
      const p = getProduct(id);
      if (!p) return;
      unit = unitsFor(p).includes(unit) ? unit : unitsFor(p)[0];
      const next = items();
      const existing = next.find((i) => i.id === id && i.unit === unit);
      if (existing) existing.qty = clampQty(existing.qty + qty);
      else next.push({ id, unit, qty: clampQty(qty) });
      write(next);
    },
    set(id, unit, qty) {
      const next = items();
      const existing = next.find((i) => i.id === id && i.unit === unit);
      if (existing) existing.qty = clampQty(qty);
      else next.push({ id, unit, qty: clampQty(qty) });
      write(next.filter(isValid));
    },
    changeUnit(id, fromUnit, toUnit) {
      const next = items();
      const line = next.find((i) => i.id === id && i.unit === fromUnit);
      if (!line) return;
      const clash = next.find((i) => i.id === id && i.unit === toUnit);
      if (clash) { clash.qty = clampQty(clash.qty + line.qty); next.splice(next.indexOf(line), 1); }
      else line.unit = toUnit;
      write(next.filter(isValid));
    },
    remove(id, unit) {
      write(items().filter((i) => !(i.id === id && (unit === undefined || i.unit === unit))));
    },
    clear() { write([]); },
    subscribe(fn) { listeners.add(fn); fn(items()); return () => listeners.delete(fn); },
    /** Plain-text lines used by form delivery. */
    toLines() {
      return memory.map((i) => {
        const p = getProduct(i.id);
        const price = hasPrice(p, i.unit) ? ` @ ${money(priceFor(p, i.unit))}` : "";
        return `- ${p.name} × ${i.qty} (${i.unit})${price}`;
      });
    },
    total() {
      let total = 0;
      for (const i of memory) {
        const p = getProduct(i.id);
        if (!hasPrice(p, i.unit)) return null;
        total += priceFor(p, i.unit) * i.qty;
      }
      return total;
    }
  };

  // Sync across tabs
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) { memory = read(); notify(); }
  });

  S.orderList = orderList;
  orderList.subscribe((list) => S.updateOrderBadge(list.length));

  /* ---------- Order page: product picker ---------- */
  function initPicker() {
    const picker = $("[data-order-picker]");
    if (!picker) return;
    const rows = new Map();

    S.data.categories.forEach((cat, index) => {
      const products = S.data.products.filter((p) => p.category === cat.id);
      if (!products.length) return;
      const list = el("div", { class: "picker-list" });
      const pill = el("span", { class: "count-pill", text: `${products.length} items` });
      const group = el("details", { class: "picker-group", open: index === 0 || null, dataset: { category: cat.id } }, [
        el("summary", {}, [cat.name, pill]),
        list
      ]);

      products.forEach((p) => {
        const id = `pick-${p.id}`;
        const units = unitsFor(p);
        const check = el("input", { type: "checkbox", id, class: "pick-check", value: p.id });
        const qtyInput = el("input", { type: "number", inputmode: "numeric", min: 1, max: MAX_QTY, step: 1, value: 1, "aria-label": `Quantity of ${p.name}` });
        const dec = el("button", { type: "button", "aria-label": `Decrease quantity of ${p.name}`, text: "−" });
        const inc = el("button", { type: "button", "aria-label": `Increase quantity of ${p.name}`, text: "+" });
        const unit = el("select", { "aria-label": `Unit for ${p.name}` }, units.map((u) => el("option", { value: u, text: hasPrice(p, u) ? `${u} · ${money(priceFor(p, u))}` : u })));
        const row = el("div", { class: "pick-row", dataset: { id: p.id, search: `${p.name} ${cat.name}`.toLowerCase() } }, [
          check,
          el("label", { for: id, text: p.name }),
          el("div", { class: "qty", role: "group", "aria-label": `Quantity for ${p.name}` }, [dec, qtyInput, inc]),
          unit
        ]);
        let currentUnit = units[0];

        const sync = () => {
          if (check.checked) orderList.set(p.id, unit.value, qtyInput.value);
        };
        check.addEventListener("change", () => {
          if (check.checked) orderList.set(p.id, unit.value, qtyInput.value);
          else orderList.remove(p.id, currentUnit);
        });
        qtyInput.addEventListener("change", () => {
          qtyInput.value = String(clampQty(qtyInput.value));
          if (!check.checked) check.checked = true;
          sync();
        });
        dec.addEventListener("click", () => {
          qtyInput.value = String(clampQty(Number(qtyInput.value) - 1));
          if (check.checked) sync();
        });
        inc.addEventListener("click", () => {
          qtyInput.value = String(clampQty(Number(qtyInput.value) + 1));
          if (!check.checked) check.checked = true;
          sync();
        });
        unit.addEventListener("change", () => {
          if (check.checked) orderList.changeUnit(p.id, currentUnit, unit.value);
          currentUnit = unit.value;
        });

        rows.set(p.id, { row, check, qtyInput, unit, setUnit: (u) => { currentUnit = u; unit.value = u; } });
        list.append(row);
      });
      picker.append(group);
    });

    // Reflect the stored list (and changes from the summary or other tabs)
    orderList.subscribe((list) => {
      rows.forEach((r, id) => {
        const line = list.find((i) => i.id === id);
        r.check.checked = Boolean(line);
        if (line) { r.qtyInput.value = String(line.qty); r.setUnit(line.unit); }
      });
      $$(".picker-group", picker).forEach((group) => {
        const selected = list.filter((i) => getProduct(i.id)?.category === group.dataset.category).length;
        const pill = $(".count-pill", group);
        const total = $$(".pick-row", group).length;
        pill.textContent = selected ? `${selected} selected` : `${total} items`;
      });
    });

    // Filter rows by name
    const search = $("[data-picker-search]");
    const status = $("[data-picker-status]");
    search?.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      $$(".picker-group", picker).forEach((group) => {
        let groupShown = 0;
        $$(".pick-row", group).forEach((row) => {
          const match = !q || row.dataset.search.includes(q);
          row.hidden = !match;
          if (match) groupShown++;
        });
        group.hidden = groupShown === 0;
        if (q && groupShown) group.open = true;
        shown += groupShown;
      });
      if (status) status.textContent = q ? `${shown} ${shown === 1 ? "product matches" : "products match"} “${search.value.trim()}”` : "";
    });

    $("[data-picker-expand]")?.addEventListener("click", (event) => {
      const groups = $$(".picker-group", picker);
      const expand = !groups.every((g) => g.open);
      groups.forEach((g) => { g.open = expand; });
      event.currentTarget.textContent = expand ? "Collapse all" : "Expand all";
    });
  }

  /* ---------- Order page: summary table ---------- */
  function initSummary() {
    const body = $("[data-summary-body]");
    if (!body) return;
    const table = body.closest("table");
    const empty = $("[data-summary-empty]");
    const totalCell = $("[data-summary-total]");
    const clearBtn = $("[data-summary-clear]");

    orderList.subscribe((list) => {
      body.replaceChildren(...list.map((line) => {
        const p = getProduct(line.id);
        const unitPrice = hasPrice(p, line.unit) ? money(priceFor(p, line.unit)) : "On request";
        const subtotal = hasPrice(p, line.unit) ? money(priceFor(p, line.unit) * line.qty) : "—";
        const remove = el("button", { type: "button", class: "remove-btn", text: "Remove", "aria-label": `Remove ${p.name} (${line.unit}) from order list` });
        remove.addEventListener("click", () => {
          orderList.remove(line.id, line.unit);
          S.toast(`${p.name} removed from your order list.`);
          $("[data-picker-search]")?.focus();
        });
        return el("tr", {}, [
          el("th", { scope: "row" }, [el("span", { text: p.name }), el("br"), el("span", { class: "muted", text: line.unit }), el("br"), remove]),
          el("td", { text: String(line.qty) }),
          el("td", { text: unitPrice }),
          el("td", { text: subtotal })
        ]);
      }));
      table.hidden = list.length === 0;
      empty.hidden = list.length > 0;
      if (clearBtn) clearBtn.hidden = list.length === 0;
      const total = orderList.total();
      totalCell.textContent = list.length && total !== null ? money(total) : "Confirmed by the shop";
    });

    clearBtn?.addEventListener("click", () => {
      orderList.clear();
      S.toast("Your order list has been cleared.");
    });
  }

  initPicker();
  initSummary();
})();
