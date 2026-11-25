/*
 * 3D walking-path demo: Dhungedhara (Street View point A) -> Madhuram Sweets & Snacks.
 * Opened from the map pin on contact.html via SweetShop.openRouteDemo().
 *
 * Geometry comes from js/route-data.js (OpenStreetMap footprints/roads, OSRM foot route),
 * in local metres: x = east, y = north, z = up, origin = the shop's Street View point B.
 * Rendering is a small canvas-2D perspective renderer (no libraries): near-plane clipping,
 * back-face culling and painter's ordering per building.
 */
(() => {
  "use strict";
  const S = window.SweetShop;
  const D = S && S.routeData;
  if (!D) return;
  const { el } = S;
  const brand = (S.config && S.config.brand && S.config.brand.name) || "the shop";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Route geometry ---------- */
  const path = D.path;
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[cum.length - 1];
  function pointAt(s) {
    s = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < path.length - 1 && cum[i] < s) i++;
    const a = path[i - 1], b = path[i], seg = cum[i] - cum[i - 1] || 1, t = (s - cum[i - 1]) / seg;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  function headingAt(s) {
    const a = pointAt(s - 4), b = pointAt(s + 10);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  /** Points of the route between distances s0 and s1. */
  function subPath(s0, s1) {
    const out = [pointAt(s0)];
    for (let i = 1; i < path.length - 1; i++) if (cum[i] > s0 && cum[i] < s1) out.push(path[i]);
    out.push(pointAt(s1));
    return out;
  }
  const samples = [];
  for (let s = 0; s <= total; s += 4) samples.push(pointAt(s));

  /* ---------- Scene preparation ---------- */
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const FOG = hexRgb("#F4E8D8");
  const mix = (c, f, k) => `rgb(${Math.round(c[0] + (f[0] - c[0]) * k)} ${Math.round(c[1] + (f[1] - c[1]) * k)} ${Math.round(c[2] + (f[2] - c[2]) * k)})`;
  const scale = (c, k) => c.map((v) => Math.min(255, v * k));
  const PALETTE = ["#F8EEE2", "#F3E4D2", "#EEDCC7", "#F6E9DA"].map(hexRgb);
  const STORE = hexRgb("#F28C28");
  const LIGHT = (() => { const v = [-0.55, -0.83]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l]; })();

  const near = (p, r) => samples.some((q) => Math.abs(q[0] - p[0]) < r && Math.abs(q[1] - p[1]) < r);
  const buildings = D.buildings
    .filter((b) => b.r.some((p) => near(p, 95)))
    .map((b) => {
      const isStore = b.id === D.storeId;
      const base = isStore ? STORE : PALETTE[b.id % PALETTE.length];
      const n = b.r.length;
      const cx = b.r.reduce((a, p) => a + p[0], 0) / n, cy = b.r.reduce((a, p) => a + p[1], 0) / n;
      const walls = b.r.map((a, i) => {
        const c = b.r[(i + 1) % n], dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const nx = dy / len, ny = -dx / len; // outward normal for a counter-clockwise ring
        const lit = 0.74 + 0.22 * Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1]));
        return { a, c, nx, ny, mx: (a[0] + c[0]) / 2, my: (a[1] + c[1]) / 2, rgb: scale(base, lit) };
      });
      return { ring: b.r, h: b.h, cx, cy, isStore, walls, roof: scale(base, isStore ? 1.12 : 1.04) };
    });
  const store = buildings.find((b) => b.isStore);
  const roads = D.roads.filter((r) => r.line.some((p) => near(p, 140)));
  const labels = D.labels.filter((l) => near(l.p, 70) && !/^Dhungedhara$/.test(l.t));

  /* ---------- Camera & projection ---------- */
  const NEAR = 0.5;
  const cam = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
  let basis = null, W = 1, H = 1, F = 1;
  function setBasis() {
    let fx = cam.tx - cam.x, fy = cam.ty - cam.y, fz = cam.tz - cam.z;
    const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
    let rx = fy, ry = -fx; const rl = Math.hypot(rx, ry) || 1; rx /= rl; ry /= rl;
    const ux = ry * fz, uy = -rx * fz, uz = rx * fy - ry * fx;
    basis = { fx, fy, fz, rx, ry, ux, uy, uz };
  }
  function toCam(x, y, z) {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z, b = basis;
    return [dx * b.rx + dy * b.ry, dx * b.ux + dy * b.uy + dz * b.uz, dx * b.fx + dy * b.fy + dz * b.fz];
  }
  // principal point sits above centre so the walker stays clear of the directions card
  const toScreen = (p) => [W / 2 + (p[0] / p[2]) * F, H * 0.4 - (p[1] / p[2]) * F];
  function clipNear(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    return out;
  }
  /** Add a world-space polygon (array of [x,y,z]) to the current canvas path. */
  function addPoly(ctx, world) {
    const c = clipNear(world.map((p) => toCam(p[0], p[1], p[2])));
    if (c.length < 3) return false;
    const s0 = toScreen(c[0]);
    ctx.moveTo(s0[0], s0[1]);
    for (let i = 1; i < c.length; i++) { const s = toScreen(c[i]); ctx.lineTo(s[0], s[1]); }
    ctx.closePath();
    return true;
  }
  /** Flat ribbon along a polyline at height z, built from CCW quads + joint discs (nonzero fill unions them). */
  function addRibbon(ctx, line, w, z = 0) {
    const hw = w / 2;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (l < 0.01) continue;
      const nx = (-dy / l) * hw, ny = (dx / l) * hw;
      addPoly(ctx, [[a[0] - nx, a[1] - ny, z], [b[0] - nx, b[1] - ny, z], [b[0] + nx, b[1] + ny, z], [a[0] + nx, a[1] + ny, z]]);
    }
    for (const p of line) addDisc(ctx, p, hw, z);
  }
  function addDisc(ctx, p, r, z = 0, n = 10) {
    const pts = [];
    for (let k = 0; k < n; k++) { const t = (k / n) * Math.PI * 2; pts.push([p[0] + Math.cos(t) * r, p[1] + Math.sin(t) * r, z]); }
    addPoly(ctx, pts);
  }
  function screenOf(x, y, z) {
    const c = toCam(x, y, z);
    return c[2] < NEAR ? null : { s: toScreen(c), d: c[2] };
  }

  /* ---------- State ---------- */
  let dialog, canvas, ctx, raf = 0, last = 0;
  const ui = {};
  let s = 0, playing = false, mode = "follow", yawOff = 0, pitch = 0.62, radius = 175, dpr = 1;
  const speed = total / 26; // the demo plays in about 26 s; real walking pace is shown separately
  let camYaw = null, currentStep = -1, needResize = true, hintTimer = 0;
  const smooth = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, init: false };
  const bbox = path.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const centre = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];

  /* ---------- On-screen hints ---------- */
  const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const compass = (b) => COMPASS[Math.round((((b % 360) + 360) % 360) / 45) % 8];
  const walkMinutes = Math.max(1, Math.round(D.distance / 1.25 / 60));
  function stepText(st) {
    const road = st.name || "the road";
    if (st.type === "depart") return { title: `Head ${compass(st.bearing)} on ${road}`, note: "Start at Dhungedhara" };
    if (st.type === "cross") return { title: `Cross to the shop on your ${st.modifier || "left"}`, note: `${brand} is just across the road` };
    if (st.type === "arrive") return { title: "You've arrived", note: brand };
    return { title: `Keep ${st.modifier || "straight"} on ${road}`, note: `Heading ${compass(st.bearing)}` };
  }
  const ICON = {
    depart: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    left: '<path d="M16 20v-6a5 5 0 0 0-5-5H6M10 5 6 9l4 4"/>',
    right: '<path d="M8 20v-6a5 5 0 0 1 5-5h5M14 5l4 4-4 4"/>',
    cross: '<path d="M3 6h18M3 18h18M7 9v6M12 9v6M17 9v6"/>',
    arrive: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4.5v4h4"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function svg(name) {
    const span = document.createElement("span");
    span.className = "rw-ico";
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;
    return span;
  }
  const stepIcon = (st) => (st.type === "depart" ? "depart" : st.type === "cross" ? "cross" : st.type === "arrive" ? "arrive" : /left/.test(st.modifier) ? "left" : "right");

  /* ---------- Full-screen walkthrough ---------- */
  function build() {
    canvas = el("canvas", {
      class: "rw-canvas", tabindex: "0", role: "img",
      "aria-label": `3D view of the ${D.distance} metre walking route from Dhungedhara along Jamacho Marg to ${brand}. Drag or use the arrow keys to look around.`
    });
    ctx = canvas.getContext("2d");
    ui.stepIco = el("div", { class: "rw-step-ico" });
    ui.count = el("p", { class: "rw-step-count" });
    ui.title = el("p", { class: "rw-step-title" });
    ui.note = el("p", { class: "rw-step-note" });
    ui.left = el("span", { class: "rw-left" });
    ui.range = el("input", { class: "rw-range", type: "range", min: "0", max: "1000", value: "0", "aria-label": "Position along the route" });
    ui.play = el("button", { type: "button", class: "rw-btn rw-btn--play", "aria-label": "Pause" }, [svg("pause")]);
    ui.replay = el("button", { type: "button", class: "rw-btn", "aria-label": "Replay from the start" }, [svg("replay")]);
    ui.follow = el("button", { type: "button", class: "rw-seg", "aria-pressed": "true", text: "Follow" });
    ui.overview = el("button", { type: "button", class: "rw-seg", "aria-pressed": "false", text: "Overview" });
    ui.hint = el("p", { class: "rw-hint", "aria-hidden": "true", text: "Drag to look around" });
    const close = el("button", { type: "submit", class: "rw-close", "aria-label": "Close walkthrough" }, [svg("close")]);

    dialog = el("dialog", { class: "rw", "aria-labelledby": "rw-title", closedby: "any" }, [
      canvas,
      el("header", { class: "rw-top" }, [
        el("p", { class: "rw-eyebrow", text: "Walking route" }),
        el("h2", { id: "rw-title", class: "rw-title" }, ["Dhungedhara ", el("span", { "aria-hidden": "true", text: "→" }), el("span", { class: "visually-hidden", text: "to" }), ` ${brand}`]),
        el("p", { class: "rw-meta", text: `${D.distance} m · about ${walkMinutes} min on foot · Jamacho Marg` }),
        el("p", { class: "rw-credit", text: "Map data © OpenStreetMap contributors" })
      ]),
      el("form", { method: "dialog", class: "rw-close-form" }, [close]),
      ui.hint,
      el("section", { class: "rw-card", "aria-label": "Directions" }, [
        el("div", { class: "rw-step" }, [
          ui.stepIco,
          el("div", { class: "rw-step-text", "aria-live": "polite" }, [ui.count, ui.title, ui.note])
        ]),
        el("div", { class: "rw-bar" }, [
          ui.play,
          el("div", { class: "rw-progress" }, [ui.range, ui.left]),
          ui.replay,
          el("div", { class: "rw-segs", role: "group", "aria-label": "Camera" }, [ui.follow, ui.overview])
        ])
      ])
    ]);
    document.body.append(dialog);
    S.enableLightDismiss(dialog);

    ui.play.addEventListener("click", () => {
      if (!playing && s >= total) s = 0;
      setPlaying(!playing);
    });
    ui.replay.addEventListener("click", () => { s = 0; smooth.init = false; camYaw = null; setPlaying(true); });
    ui.range.addEventListener("input", () => { s = (ui.range.valueAsNumber / 1000) * total; setPlaying(false); });
    ui.follow.addEventListener("click", () => setMode("follow"));
    ui.overview.addEventListener("click", () => setMode("overview"));
    dialog.addEventListener("close", stop);

    // Drag / arrow keys look around; wheel zooms the overview.
    let drag = null;
    canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); hideHint(); });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      yawOff -= (e.clientX - drag.x) * 0.008;
      pitch = Math.max(0.25, Math.min(1.35, pitch + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
    });
    const endDrag = () => { drag = null; };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("wheel", (e) => {
      if (mode !== "overview") return;
      e.preventDefault();
      radius = Math.max(60, Math.min(320, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
    }, { passive: false });
    canvas.addEventListener("keydown", (e) => {
      const k = { ArrowLeft: () => { yawOff += 0.12; }, ArrowRight: () => { yawOff -= 0.12; }, ArrowUp: () => { pitch = Math.min(1.35, pitch + 0.06); }, ArrowDown: () => { pitch = Math.max(0.25, pitch - 0.06); } }[e.key];
      if (k) { k(); e.preventDefault(); hideHint(); }
      if (e.key === " ") { e.preventDefault(); ui.play.click(); }
    });
    new ResizeObserver(() => { needResize = true; }).observe(canvas);
  }
  function setMode(m) {
    mode = m;
    yawOff = 0; pitch = m === "overview" ? 1.0 : 0.62;
    ui.follow.setAttribute("aria-pressed", String(m === "follow"));
    ui.overview.setAttribute("aria-pressed", String(m === "overview"));
  }
  function setPlaying(v) {
    playing = v;
    const ended = !v && s >= total;
    const name = v ? "pause" : "play";
    ui.play.replaceChildren(svg(name));
    ui.play.setAttribute("aria-label", v ? "Pause" : ended ? "Play again" : "Play");
  }
  function hideHint() { clearTimeout(hintTimer); ui.hint.classList.add("is-hidden"); }
  function stop() { cancelAnimationFrame(raf); raf = 0; playing = false; clearTimeout(hintTimer); }

  /* ---------- Frame ---------- */
  function updateCamera(dt) {
    let x, y, z, tx, ty, tz;
    if (mode === "follow") {
      const p = pointAt(s), h = headingAt(s);
      if (camYaw === null) camYaw = h;
      let diff = h - camYaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      camYaw += reduceMotion ? diff : diff * (1 - Math.exp(-dt * 2.2));
      const yaw = camYaw + yawOff, back = 30, up = 12 + pitch * 18;
      x = p[0] - Math.cos(yaw) * back; y = p[1] - Math.sin(yaw) * back; z = up;
      tx = p[0] + Math.cos(camYaw) * 10; ty = p[1] + Math.sin(camYaw) * 10; tz = 1.5;
    } else {
      const a = (100 * Math.PI) / 180 + yawOff, horiz = Math.cos(pitch) * radius;
      x = centre[0] + Math.cos(a) * horiz; y = centre[1] + Math.sin(a) * horiz; z = Math.sin(pitch) * radius + 20;
      tx = centre[0]; ty = centre[1]; tz = 0;
    }
    const k = !smooth.init || reduceMotion ? 1 : 1 - Math.exp(-dt * 4);
    for (const [key, v] of Object.entries({ x, y, z, tx, ty, tz })) smooth[key] += (v - smooth[key]) * k;
    smooth.init = true;
    Object.assign(cam, smooth);
    setBasis();
  }

  function draw() {
    // background sky + ground
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    sky.addColorStop(0, "#CFE3E8"); sky.addColorStop(1, "#F4E8D8");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); addPoly(ctx, [[-600, -600, 0], [700, -600, 0], [700, 600, 0], [-600, 600, 0]]);
    ctx.fillStyle = "#EDE2D0"; ctx.fill();

    if (D.green.length) {
      ctx.beginPath(); for (const g of D.green) addPoly(ctx, g.map((p) => [p[0], p[1], 0]));
      ctx.fillStyle = "#D9E6CC"; ctx.fill();
    }
    // roads: kerb then surface
    ctx.beginPath(); for (const r of roads) addRibbon(ctx, r.line, r.w + 1.4, 0);
    ctx.fillStyle = "#D8C8B2"; ctx.fill();
    ctx.beginPath(); for (const r of roads) addRibbon(ctx, r.line, r.w, 0);
    ctx.fillStyle = "#FFFDF8"; ctx.fill();

    // route: whole path faint, walked part solid
    ctx.beginPath(); addRibbon(ctx, path, 2.6, 0.05);
    ctx.fillStyle = "rgb(242 140 40 / 0.35)"; ctx.fill();
    if (s > 0.2) {
      ctx.beginPath(); addRibbon(ctx, subPath(0, s), 2.6, 0.06);
      ctx.fillStyle = "#E87924"; ctx.fill();
    }
    // start marker
    ctx.beginPath(); addDisc(ctx, D.start, 3.2, 0.07, 16);
    ctx.fillStyle = "#24543A"; ctx.fill();
    ctx.beginPath(); addDisc(ctx, D.start, 1.4, 0.08, 12);
    ctx.fillStyle = "#FFF6EA"; ctx.fill();

    // buildings + walker, far to near
    const items = buildings.map((b) => ({ b, d: (b.cx - cam.x) ** 2 + (b.cy - cam.y) ** 2 + (b.h / 2 - cam.z) ** 2 }));
    const w = pointAt(s);
    items.push({ walker: true, d: (w[0] - cam.x) ** 2 + (w[1] - cam.y) ** 2 + cam.z ** 2 });
    items.sort((a, b) => b.d - a.d);
    ctx.lineJoin = "round";
    for (const it of items) {
      if (it.walker) { drawWalker(w); continue; }
      const b = it.b, fog = Math.max(0, Math.min(0.75, (Math.sqrt(it.d) - 110) / 260));
      const vis = b.walls.filter((wl) => (cam.x - wl.a[0]) * wl.nx + (cam.y - wl.a[1]) * wl.ny > 0);
      vis.sort((p, q) => ((q.mx - cam.x) ** 2 + (q.my - cam.y) ** 2) - ((p.mx - cam.x) ** 2 + (p.my - cam.y) ** 2));
      // fade buildings standing between a close camera and the walker so they never hide the route
      const camDist = Math.hypot(b.cx - cam.x, b.cy - cam.y);
      ctx.globalAlpha = !b.isStore && mode === "follow" && camDist < 26 ? 0.35 : 1;
      ctx.lineWidth = 0.6; ctx.strokeStyle = "rgb(60 40 20 / 0.14)";
      for (const wl of vis) {
        ctx.beginPath();
        if (!addPoly(ctx, [[wl.a[0], wl.a[1], 0], [wl.c[0], wl.c[1], 0], [wl.c[0], wl.c[1], b.h], [wl.a[0], wl.a[1], b.h]])) continue;
        ctx.fillStyle = mix(wl.rgb, FOG, fog); ctx.fill(); ctx.stroke();
      }
      if (cam.z > b.h) {
        ctx.beginPath();
        if (addPoly(ctx, b.ring.map((p) => [p[0], p[1], b.h]))) { ctx.fillStyle = mix(b.roof, FOG, fog); ctx.fill(); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
    drawRouteOverlay();
    if (mode === "overview") drawWalker(w);
    drawLabels();
    drawCompass();
  }

  function drawWalker(p) {
    const t = performance.now() / 1000;
    // pulsing ground ring
    const pr = 2.2 + (reduceMotion ? 1 : (t * 1.6) % 1) * 3.5;
    ctx.beginPath(); addDisc(ctx, p, pr, 0.09, 20);
    ctx.fillStyle = `rgb(36 84 58 / ${reduceMotion ? 0.18 : 0.35 * (1 - ((t * 1.6) % 1))})`; ctx.fill();
    ctx.beginPath(); addDisc(ctx, p, 1.1, 0.1, 12);
    ctx.fillStyle = "rgb(16 40 27 / 0.35)"; ctx.fill();
    const foot = screenOf(p[0], p[1], 0), head = screenOf(p[0], p[1], 3.2);
    if (!foot || !head) return;
    const r = Math.max(4, Math.min(14, (1.3 * F) / head.d));
    ctx.lineCap = "round";
    ctx.strokeStyle = "#24543A"; ctx.lineWidth = r * 0.9;
    ctx.beginPath(); ctx.moveTo(foot.s[0], foot.s[1]); ctx.lineTo(head.s[0], head.s[1] + r); ctx.stroke();
    ctx.beginPath(); ctx.arc(head.s[0], head.s[1], r, 0, Math.PI * 2);
    ctx.fillStyle = "#F28C28"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
  }

  /** Route drawn above the buildings (dashed ahead, solid behind) so it stays visible in dense streets. */
  function drawRouteOverlay() {
    const strokeLine = (s0, s1, dash) => {
      ctx.beginPath();
      let pen = false;
      for (let d = s0; d <= s1 + 0.01; d += 1.5) {
        const p = pointAt(Math.min(d, s1)), q = screenOf(p[0], p[1], 0.3);
        if (!q) { pen = false; continue; }
        if (pen) ctx.lineTo(q.s[0], q.s[1]); else ctx.moveTo(q.s[0], q.s[1]);
        pen = true;
      }
      ctx.setLineDash(dash);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = 6; ctx.strokeStyle = "rgb(255 255 255 / 0.85)"; ctx.stroke();
      ctx.lineWidth = 3.5; ctx.strokeStyle = "#E87924"; ctx.stroke();
      ctx.setLineDash([]);
    };
    if (s < total) strokeLine(s, total, [2, 9]);
    if (s > 0.2) strokeLine(0, s, []);
  }
  const uiScale = () => Math.max(0.9, Math.min(1.25, W / 1100));
  function pill(text, x, y, bg, fg, size) {
    ctx.font = `600 ${size}px Poppins, Arial, sans-serif`;
    const tw = ctx.measureText(text).width, padX = size * 0.7, h = size * 1.9;
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x - tw / 2 - padX, y - h, tw + padX * 2, h, h / 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y - h / 2);
  }
  function drawLabels() {
    for (const l of labels) {
      const p = screenOf(l.p[0], l.p[1], 4);
      if (!p || p.d > 230) continue;
      const size = Math.round(Math.max(11, Math.min(14, 900 / p.d)) * uiScale());
      ctx.font = `500 ${size}px Poppins, Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgb(255 253 248 / 0.9)"; ctx.strokeText(l.t, p.s[0], p.s[1]);
      ctx.fillStyle = "#3C4A40"; ctx.fillText(l.t, p.s[0], p.s[1]);
    }
    const st = screenOf(D.start[0], D.start[1], 5);
    if (st) pill("Start · Dhungedhara", st.s[0], st.s[1], "#24543A", "#FFF6EA", Math.round(13 * uiScale()));
    if (store) {
      const sp = screenOf(store.cx, store.cy, store.h + 3);
      if (sp) pill(brand, sp.s[0], sp.s[1], "#B95819", "#FFFFFF", Math.round(15 * uiScale()));
    }
  }
  function drawCompass() {
    // north direction projected onto the screen plane
    const nx = basis.ry, ny = -(basis.uy);
    const l = Math.hypot(nx, ny) || 1, cx = W - 44, cy = 112;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(Math.atan2(nx / l, -ny / l));
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = "rgb(255 253 248 / 0.92)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fillStyle = "#B33F32"; ctx.fill();
    ctx.font = "700 9px Poppins, Arial, sans-serif"; ctx.fillStyle = "#26372D"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("N", 0, 10);
    ctx.restore();
  }

  function updateHud() {
    let idx = 0;
    D.steps.forEach((st, i) => { if (s + 1.5 >= st.at) idx = i; });
    if (s >= total - 0.5) idx = D.steps.length - 1;
    if (idx !== currentStep) {
      currentStep = idx;
      const st = D.steps[idx], t = stepText(st);
      ui.stepIco.replaceChildren(svg(stepIcon(st)));
      ui.stepIco.dataset.type = st.type;
      ui.count.textContent = st.type === "arrive" ? "Destination" : `Step ${idx + 1} of ${D.steps.length - 1}`;
      ui.title.textContent = t.title;
      ui.note.textContent = t.note;
      dialog.classList.toggle("is-arrived", st.type === "arrive");
    }
    const left = Math.max(0, Math.round(total - s));
    ui.left.textContent = left ? `${left} m` : "Here";
    const v = Math.round((s / total) * 1000);
    ui.range.value = String(v);
    ui.range.style.setProperty("--p", `${v / 10}%`);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (needResize) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      F = H / 2 / Math.tan((50 * Math.PI) / 360);
      needResize = false;
    }
    if (playing) {
      s += speed * dt;
      if (s >= total) { s = total; setPlaying(false); }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateCamera(dt);
    draw();
    updateHud();
    raf = requestAnimationFrame(frame);
  }

  S.openRouteDemo = function openRouteDemo() {
    if (!dialog) build();
    s = reduceMotion ? total : 0;
    setMode(reduceMotion ? "overview" : "follow");
    radius = 175; camYaw = null; smooth.init = false; currentStep = -1; needResize = true;
    ui.hint.classList.remove("is-hidden");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 4500);
    dialog.showModal();
    setPlaying(!reduceMotion);
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  };
})();
