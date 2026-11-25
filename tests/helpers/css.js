"use strict";
/*
 * Minimal CSS reader for motion checks: flattens style rules with the
 * at-rule preludes they sit in, resolves duration tokens and extracts
 * transition/animation durations. Not a general CSS parser.
 */

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Splits on `sep` outside parentheses. */
function splitTopLevel(str, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth === 0 && (sep === " " ? /\s/.test(ch) : ch === sep)) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseDeclarations(body) {
  return splitTopLevel(body, ";")
    .map((d) => {
      const i = d.indexOf(":");
      if (i < 0) return null;
      return { prop: d.slice(0, i).trim().toLowerCase(), value: d.slice(i + 1).trim() };
    })
    .filter(Boolean);
}

/**
 * Returns [{ file, selector, ancestors: [prelude...], decls: [{prop,value}] }].
 * @keyframes blocks are skipped (they describe frames, not triggers).
 */
function parseRules(css, file = "") {
  const src = stripComments(css);
  const rules = [];
  function walk(text, ancestors) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      // Drop statement at-rules such as @import that end with ';' inside prelude.
      const cleanPrelude = prelude.replace(/^[\s\S]*;\s*/, "").trim();
      if (/^@keyframes\b/i.test(cleanPrelude) || /^@font-face\b/i.test(cleanPrelude)) {
        // skip
      } else if (/^@(media|supports|layer|container|scope)\b/i.test(cleanPrelude)) {
        walk(body, [...ancestors, cleanPrelude]);
      } else {
        rules.push({ file, selector: cleanPrelude, ancestors, decls: parseDeclarations(body) });
      }
      i = j;
    }
  }
  walk(src, []);
  return rules;
}

/** Custom properties whose value is a single time, e.g. --dur-hover: 180ms. */
function collectTimeTokens(rules) {
  const tokens = {};
  for (const r of rules) {
    for (const d of r.decls) {
      if (d.prop.startsWith("--") && parseTime(d.value) !== null) tokens[d.prop] = d.value;
    }
  }
  return tokens;
}

/** "0.2s" -> 200, "180ms" -> 180, otherwise null. */
function parseTime(token) {
  const m = /^(-?\d*\.?\d+)(ms|s)$/i.exec(String(token).trim());
  if (!m) return null;
  return m[2].toLowerCase() === "s" ? Number(m[1]) * 1000 : Number(m[1]);
}

function resolveTime(token, tokens) {
  const direct = parseTime(token);
  if (direct !== null) return direct;
  const v = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(token);
  if (v) {
    if (tokens[v[1]] !== undefined) return parseTime(tokens[v[1]]);
    if (v[2]) return parseTime(v[2]);
  }
  return null;
}

const DISCRETE_PROPS = new Set(["visibility", "display", "content-visibility", "overlay"]);

/**
 * Every motion found in the rules:
 * { file, selector, ancestors, prop, segment, property, durationMs, easing }.
 * Delays (second time value, *-delay longhands) are ignored. Scroll-driven
 * animations (rule declares animation-timeline) have no duration and are skipped.
 */
function extractMotions(rules, tokens) {
  const motions = [];
  for (const r of rules) {
    if (r.decls.some((d) => d.prop === "animation-timeline")) continue;
    for (const d of r.decls) {
      const value = d.value.replace(/!important\s*$/i, "").trim();
      if (d.prop === "transition" || d.prop === "animation") {
        for (const segment of splitTopLevel(value, ",")) {
          if (/^none$/i.test(segment)) continue;
          const parts = splitTopLevel(segment, " ");
          const times = parts.map((p) => resolveTime(p, tokens)).filter((t) => t !== null);
          const easing = parts.find((p) => /^(var\(--ease\)|ease|ease-in|ease-out|ease-in-out|linear|cubic-bezier\(.*\)|steps\(.*\)|step-start|step-end|var\(--[\w-]*ease[\w-]*\))$/i.test(p)) || null;
          const property = d.prop === "transition" ? parts[0] : null;
          motions.push({
            file: r.file, selector: r.selector, ancestors: r.ancestors, prop: d.prop, segment,
            property, durationMs: times.length ? times[0] : null, easing,
            discrete: property !== null && DISCRETE_PROPS.has(property.toLowerCase())
          });
        }
      } else if (d.prop === "transition-duration" || d.prop === "animation-duration") {
        for (const segment of splitTopLevel(value, ",")) {
          motions.push({
            file: r.file, selector: r.selector, ancestors: r.ancestors, prop: d.prop, segment,
            property: null, durationMs: resolveTime(segment, tokens), easing: "n/a", discrete: false
          });
        }
      }
    }
  }
  return motions;
}

function hasNoPreferenceGuard(ancestors) {
  return ancestors.some((a) => /prefers-reduced-motion\s*:\s*no-preference/i.test(a));
}

module.exports = {
  splitTopLevel,
  parseRules,
  parseTime,
  collectTimeTokens,
  extractMotions,
  hasNoPreferenceGuard
};
