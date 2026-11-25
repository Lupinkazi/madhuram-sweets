/*
 * Forms: accessible validation feedback and an honest delivery adapter.
 *
 * Integration point: SweetShop.deliver(type, payload, summaryText)
 * sends orders to WhatsApp only and contact messages to Gmail only.
 */
(() => {
  "use strict";
  const S = window.SweetShop;
  const { $, $$, el, icon, getProduct } = S;
  const cfg = S.config;

  /* ---------- Input hardening ----------
   * Client-side checks are for the user's benefit; they do not replace
   * server-side validation (see api/send-email.js). Values are cleaned
   * before they reach the WhatsApp / Gmail text so hidden characters
   * cannot disguise or reorder what the shop reads.
   */
  // C0/C1 control characters (except tab and newline), soft hyphen, zero-width space,
  // LRM/RLM, bidi embeddings/overrides/isolates, invisible operators and BOM.
  // ZWNJ/ZWJ (U+200C/U+200D) are kept: Devanagari and emoji need them.
  const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
  const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;
  const MARKUP = /<\s*\/?\s*[a-z!?][^>]*>|\bjavascript\s*:|\bdata\s*:\s*text\/html/i;
  const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’\-]*$/u;
  const PHONE = /^\+?[0-9 ()\-]+$/;
  const MIN_FILL_MS = 2500; // faster than this is almost certainly a bot
  const RESUBMIT_MS = 5000; // stops repeated clicks opening several WhatsApp/Gmail tabs

  const isMultiline = (field) => field.localName === "textarea";

  function clean(value, multiline) {
    let v = String(value).normalize("NFC").replace(/\r\n?|[\u2028\u2029]/g, "\n").replace(INVISIBLE, "");
    v = multiline
      ? v.replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n")
      : v.replace(/\s+/g, " ");
    return v.trim();
  }

  const countLinks = (v) => (v.match(LINK) || []).length;

  // Each rule returns "" when the (cleaned, non-empty) value is acceptable, otherwise the message to show.
  const RULES = {
    name: (v) =>
      v.length < 2 ? "Enter your full name."
      : !NAME.test(v) ? "Use letters, spaces, hyphens, full stops or apostrophes only."
      : "",
    phone: (v) => {
      const digits = v.replace(/\D/g, "").length;
      return !PHONE.test(v) ? "Enter a phone number using digits, spaces or a leading +."
        : digits < 7 || digits > 15 ? "Enter a phone number of 7 to 15 digits."
        : "";
    },
    address: (v) => (MARKUP.test(v) || countLinks(v) ? "Enter only your address and a nearby landmark, without links or code." : ""),
    message: (v, form) => {
      if (MARKUP.test(v)) return "Remove HTML or code from your message.";
      const max = form.dataset.form === "order" ? 0 : 2;
      if (countLinks(v) > max) return max ? `Include no more than ${max} links.` : "Remove links from your message.";
      return "";
    }
  };

  function checkRules(field) {
    const rule = RULES[field.name];
    if (!rule) return;
    const value = clean(field.value, isMultiline(field));
    const message = value ? rule(value, field.form) : "";
    field.setCustomValidity(message);
    const errorEl = field.dataset.error && document.getElementById(field.dataset.error);
    if (!errorEl) return;
    if (errorEl.dataset.defaultText === undefined) errorEl.dataset.defaultText = errorEl.textContent;
    errorEl.textContent = message || errorEl.dataset.defaultText;
  }

  /* ---------- Validation: native constraints + :user-invalid, ARIA kept in sync ---------- */
  const supportsUserInvalid = CSS.supports("selector(:user-invalid)");
  const dirty = new WeakMap();
  const fields = (form) => $$("input, select, textarea", form).filter((f) => f.name && !f.closest(".honeypot"));

  function isUserInvalid(field) {
    if (supportsUserInvalid) return field.matches(":user-invalid");
    const state = dirty.get(field);
    const invalid = Boolean(state && state.touched && !field.validity.valid);
    field.classList.toggle("user-invalid-fallback", invalid);
    return invalid;
  }

  function linkError(field, shown) {
    const errorId = field.dataset.error;
    if (!errorId) return;
    const ids = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) field.setAttribute("aria-describedby", ids.join(" "));
    else field.removeAttribute("aria-describedby");
  }

  function sync(field) {
    const invalid = isUserInvalid(field);
    field.setAttribute("aria-invalid", String(invalid));
    linkError(field, invalid);
  }

  function initValidation(form) {
    fields(form).forEach((f) => f.setAttribute("aria-invalid", "false"));
    const mark = (field, key) => {
      const state = dirty.get(field) || {};
      state[key] = true;
      if (key === "blurred" && state.edited) state.touched = true;
      dirty.set(field, state);
    };
    form.addEventListener("input", (e) => { checkRules(e.target); mark(e.target, "edited"); if (e.target.getAttribute("aria-invalid") === "true") sync(e.target); });
    form.addEventListener("change", (e) => { checkRules(e.target); mark(e.target, "edited"); mark(e.target, "blurred"); sync(e.target); });
    form.addEventListener("blur", (e) => { if (e.target.matches?.("input, select, textarea")) { checkRules(e.target); mark(e.target, "blurred"); sync(e.target); } }, true);
    form.addEventListener("invalid", (e) => {
      const state = dirty.get(e.target) || {};
      state.touched = true;
      dirty.set(e.target, state);
      // :user-invalid updates after the event, so sync on the next frame
      requestAnimationFrame(() => sync(e.target));
    }, true);
    form.addEventListener("reset", () => setTimeout(() => fields(form).forEach((f) => { dirty.delete(f); checkRules(f); sync(f); })));
  }

  /* ---------- Summary text (used by WhatsApp, email and copy) ---------- */
  function labelText(field) {
    const label = field.labels && field.labels[0];
    if (!label) return field.name;
    const copy = label.cloneNode(true);
    copy.querySelectorAll(".req, .optional, [aria-hidden='true']").forEach((n) => n.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  function collect(form) {
    const payload = {};
    const lines = [];
    fields(form).forEach((field) => {
      if ((field.type === "checkbox" || field.type === "radio") && !field.checked) return;
      // Re-apply the length limit after cleaning: script-set values bypass maxlength.
      const limit = field.maxLength > 0 ? field.maxLength : 2000;
      const value = clean(field.value, isMultiline(field)).slice(0, limit);
      if (!value) return;
      payload[field.name] = value;
      lines.push(`${labelText(field)}: ${value}`);
    });
    return { payload, lines };
  }

  /* ---------- Delivery: orders -> WhatsApp only, contact -> Gmail only ---------- */
  const waUrl = (text) => `https://wa.me/${encodeURIComponent(cfg.contact.whatsapp)}?text=${encodeURIComponent(text)}`;
  const gmailUrl = (subject, text) =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cfg.contact.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const SUBJECT = { order: "Order request", contact: "Website enquiry" };

  async function deliver(type, payload, text) {
    const c = cfg.contact;
    if (type === "order" && c.whatsapp) {
      const win = window.open(waUrl(text), "_blank", "noopener");
      return { state: win === null ? "handoff-blocked" : "handoff", via: "WhatsApp" };
    }
    if (type === "contact" && c.email) {
      const win = window.open(gmailUrl(SUBJECT.contact, text), "_blank", "noopener");
      return { state: win === null ? "handoff-blocked" : "handoff", via: "Gmail" };
    }
    return { state: "not-connected" };
  }

  const NOUN = { order: "order", contact: "message" };

  function renderStatus(box, type, result, text) {
    const noun = NOUN[type] || "message";
    const c = cfg.contact;
    const app = type === "order" ? "WhatsApp" : "Gmail";
    const copy = {
      handoff: [`Almost done: finish in ${result.via}`, `We opened ${result.via} with your ${noun} filled in. It is only sent when you press Send there.`],
      "handoff-blocked": ["Your browser blocked the new window", `Your ${noun} has not been sent. Allow pop-ups, or use the ${app} button below.`],
      "not-connected": [`Your ${noun} has not been sent`, `${app} is not set up on this website yet. Copy your summary below and send it to us by phone.`]
    }[result.state];

    const actions = [];
    if (result.state !== "handoff") {
      if (type === "order" && c.whatsapp) actions.push(el("a", { class: "btn btn-sm btn-whatsapp", href: waUrl(text), target: "_blank", rel: "noopener noreferrer" }, [icon("whatsapp"), "Send on WhatsApp"]));
      if (type === "contact" && c.email) actions.push(el("a", { class: "btn btn-sm btn-primary", href: gmailUrl(SUBJECT.contact, text), target: "_blank", rel: "noopener noreferrer" }, ["Send with Gmail"]));
      const copyBtn = el("button", { type: "button", class: "btn btn-sm btn-secondary" }, [icon("copy"), "Copy summary"]);
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(text);
          S.toast("Summary copied to your clipboard.");
        } catch {
          const area = el("textarea", { class: "input", rows: 8, readonly: true, "aria-label": "Your summary" });
          area.value = text;
          copyBtn.replaceWith(area);
          area.select();
        }
      });
      actions.push(copyBtn);
      if (c.phoneHref) actions.push(el("a", { class: "btn btn-sm btn-secondary", href: `tel:${c.phoneHref}` }, [icon("phone"), `Call ${c.phoneDisplay}`]));
    }
    box.dataset.state = result.state === "handoff" ? "sent" : result.state === "handoff-blocked" ? "not-connected" : result.state;
    box.replaceChildren(el("h3", { text: copy[0] }), el("p", { text: copy[1] }), actions.length ? el("div", { class: "btn-row" }, actions) : null);
    box.focus();
  }
  /* ---------- Form wiring ---------- */
  function initForm(form) {
    const type = form.dataset.form;
    const box = $("[data-form-status]", form) || $("[data-form-status]");
    const submit = $("button[type='submit']", form);
    const openedAt = Date.now();
    initValidation(form);
    // Custom rules must be current before the browser runs constraint validation,
    // which happens after the submit button's click event.
    submit.addEventListener("click", () => fields(form).forEach(checkRules));

    if (type === "order") {
      // Show the "choose a product" message alongside native field validation,
      // and clear it as soon as something is selected.
      const orderError = $("[data-order-error]");
      submit.addEventListener("click", () => orderError?.classList.toggle("is-shown", S.orderList.count() === 0));
      S.orderList.subscribe((list) => { if (list.length) orderError?.classList.remove("is-shown"); });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submit.disabled) return; // a send is already in progress or cooling down
      if (form.querySelector(".honeypot input")?.value) return; // bot trap
      // Re-check in case constraints were bypassed (requestSubmit, edited attributes, novalidate).
      fields(form).forEach(checkRules);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (Date.now() - openedAt < MIN_FILL_MS) {
        box.dataset.state = "not-connected";
        box.replaceChildren(el("h3", { text: "Please check your details" }), el("p", { text: "That was very quick. Check your details, then press the button again." }));
        box.focus();
        return;
      }
      const orderError = $("[data-order-error]");
      if (type === "order") {
        const empty = S.orderList.count() === 0;
        if (orderError) orderError.classList.toggle("is-shown", empty);
        if (empty) { $("[data-picker-search]")?.focus(); return; }
      }

      const { payload, lines } = collect(form);
      const heading = { order: "New order request", contact: "Website enquiry" }[type];
      let text = `${heading} — ${cfg.brand.name}\n\n${lines.join("\n")}`;
      if (type === "order") {
        payload.items = S.orderList.items().map((i) => ({ ...i, name: getProduct(i.id).name }));
        text += `\n\nItems:\n${S.orderList.toLines().join("\n")}`;
        const total = S.orderList.total();
        if (total !== null) text += `\nEstimated total: ${S.money(total)}`;
      }

      submit.disabled = true;
      form.setAttribute("aria-busy", "true");
      const result = await deliver(type, payload, text);
      form.removeAttribute("aria-busy");
      // After a successful hand-off, hold the button briefly so repeated clicks cannot open duplicate tabs.
      if (result.state === "handoff") setTimeout(() => { submit.disabled = false; }, RESUBMIT_MS);
      else submit.disabled = false;
      renderStatus(box, type, result, text);
    });
  }

  /* ---------- Contact page: pre-fill from ?product= ---------- */
  function prefillContact() {
    const form = $("form[data-form='contact']");
    if (!form) return;
    const id = new URLSearchParams(location.search).get("product");
    const p = id && getProduct(id);
    if (!p) return;
    const message = form.elements.message;
    if (message && !message.value) message.value = `I would like to know more about ${p.name}.`;
  }

  $$("form[data-form]").forEach(initForm);
  prefillContact();
  S.deliver = deliver;
})();


