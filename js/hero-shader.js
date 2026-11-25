/*
 * Home hero backdrop: an animated mesh gradient drawn with plain WebGL.
 *
 * A vanilla take on the MeshGradient from @paper-design/shaders-react:
 * a few colour points drift on slow looping paths, layered sine waves warp
 * the space between them into liquid folds, and every pixel blends the
 * colours by inverse distance. Hovering the hero speeds the flow up a
 * little and bends the field towards the pointer.
 *
 * - prefers-reduced-motion: draws one still frame, no animation.
 * - Pauses when the hero is off screen or the tab is hidden.
 * - No WebGL: does nothing, and the CSS gradient behind the canvas stays.
 */
(() => {
  "use strict";
  const canvas = document.querySelector("[data-hero-shader]");
  if (!canvas) return;
  const hero = canvas.closest(".hero") || canvas.parentElement;

  /* ---------- Settings ---------- */
  // Brand palette from css/style.css: deep greens through to saffron.
  const COLORS = ["#10281B", "#24543A", "#4F7A4D", "#F28C28", "#FFB870", "#183D2B"];
  const SPEED = 0.3;          // base flow speed
  const HOVER_SPEED = 1.6;    // speed multiplier while the pointer is over the hero
  const RENDER_SCALE = 0.5;   // render at half resolution; the gradient is soft, so it looks identical
  const MAX_DPR = 2;
  const START_TIME = 14;      // a pleasant starting arrangement of the colour points

  const VERTEX_SRC = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAGMENT_SRC = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uPointer;
    uniform float uPointerStrength;
    uniform vec3 uColors[${COLORS.length}];

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2(uv.x * aspect, uv.y);
      float t = uTime;

      // Pull nearby space towards the pointer
      vec2 toPointer = uPointer - p;
      p += toPointer * uPointerStrength * 0.35 * exp(-dot(toPointer, toPointer) * 4.0);

      // Layered domain warp: large slow folds plus finer ripples
      vec2 q = p;
      q += 0.22 * vec2(sin(q.y * 2.3 + t * 0.9), cos(q.x * 1.9 - t * 0.7));
      q += 0.14 * vec2(sin(q.y * 3.7 - t * 0.6 + 1.7), cos(q.x * 3.1 + t * 0.5 + 0.4));
      q += 0.07 * vec2(sin(q.y * 6.1 + t * 0.8 + 2.9), cos(q.x * 5.3 - t * 0.9 + 1.1));

      // Inverse-distance blend of drifting colour points
      vec3 col = vec3(0.0);
      float total = 0.0;
      for (int i = 0; i < ${COLORS.length}; i++) {
        float fi = float(i);
        vec2 c = vec2(
          aspect * (0.5 + 0.42 * sin(t * (0.31 + 0.07 * fi) + fi * 1.91)),
          0.5 + 0.42 * cos(t * (0.27 + 0.05 * fi) + fi * 2.67)
        );
        float d = distance(q, c);
        float d2 = d * d;
        float w = 1.0 / (d2 * d2 + 0.0002);
        col += uColors[i] * w;
        total += w;
      }
      col /= total;

      // Dither so the dark greens do not band
      col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  /* ---------- Helpers ---------- */
  const hexToRgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  function compile(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("hero-shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /* ---------- WebGL setup ---------- */
  if (typeof canvas.getContext !== "function" || typeof window.matchMedia !== "function") return;
  let gl = null;
  try {
    gl = canvas.getContext("webgl", {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "low-power",
    });
  } catch { gl = null; }
  if (!gl) return;

  let program = null;
  let loc = {};

  function init() {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return false;
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("hero-shader:", gl.getProgramInfoLog(program));
      program = null;
      return false;
    }
    gl.useProgram(program);

    // One triangle that covers the whole viewport
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    loc = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      strength: gl.getUniformLocation(program, "uPointerStrength"),
      colors: gl.getUniformLocation(program, "uColors"),
    };
    gl.uniform3fv(loc.colors, new Float32Array(COLORS.flatMap(hexToRgb)));
    return true;
  }

  /* ---------- State ---------- */
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let time = START_TIME;
  let speedMul = 1;
  let hovering = false;
  let strength = 0;
  const pointer = { x: 0.7, y: 0.5 };   // eased position, aspect-corrected units
  const target = { x: 0.7, y: 0.5 };    // raw pointer position
  let onScreen = true;
  let rafId = 0;
  let lastNow = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr * RENDER_SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr * RENDER_SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw() {
    if (!program) return;
    gl.uniform2f(loc.res, canvas.width, canvas.height);
    gl.uniform1f(loc.time, time);
    gl.uniform2f(loc.pointer, pointer.x, pointer.y);
    gl.uniform1f(loc.strength, strength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!canvas.classList.contains("is-ready")) canvas.classList.add("is-ready");
  }

  function frame(now) {
    rafId = 0;
    const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.05) : 0;
    lastNow = now;

    // Ease everything so hover changes never snap
    const k = 1 - Math.exp(-dt * 4);
    speedMul = lerp(speedMul, hovering ? HOVER_SPEED : 1, k);
    strength = lerp(strength, hovering ? 1 : 0, k);
    pointer.x = lerp(pointer.x, target.x, 1 - Math.exp(-dt * 6));
    pointer.y = lerp(pointer.y, target.y, 1 - Math.exp(-dt * 6));
    time += dt * SPEED * speedMul;

    draw();
    schedule();
  }

  function shouldAnimate() {
    return program && onScreen && !document.hidden && !reducedMotion.matches;
  }

  function schedule() {
    if (rafId || !shouldAnimate()) return;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastNow = 0;
  }

  function refresh() {
    stop();
    resize();
    draw();      // always paint at least one frame (the still frame for reduced motion)
    schedule();
  }

  /* ---------- Events ---------- */
  hero.addEventListener("pointerenter", () => { hovering = true; });
  hero.addEventListener("pointerleave", () => { hovering = false; });
  hero.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    target.x = ((event.clientX - rect.left) / rect.width) * (rect.width / rect.height);
    target.y = 1 - (event.clientY - rect.top) / rect.height;
  }, { passive: true });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => { resize(); if (!rafId) draw(); }).observe(canvas);
  } else {
    window.addEventListener("resize", () => { resize(); if (!rafId) draw(); });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) schedule(); else stop();
    }).observe(hero);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else schedule();
  });
  reducedMotion.addEventListener?.("change", refresh);

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    program = null;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    if (init()) refresh();
  });

  if (init()) refresh();
})();
