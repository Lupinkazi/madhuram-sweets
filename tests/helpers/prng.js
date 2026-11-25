"use strict";
/*
 * Seeded pseudo-random generator for property tests (mulberry32).
 * Set SEED=<number> to replay a failing run.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getSeed() {
  const fromEnv = Number.parseInt(process.env.SEED ?? "", 10);
  return Number.isFinite(fromEnv) ? fromEnv >>> 0 : (Date.now() ^ (process.pid << 8)) >>> 0;
}

function createRng(seed) {
  const next = mulberry32(seed);
  return {
    seed,
    next,
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** n random picks (with replacement). */
    sample(arr, n) {
      const out = [];
      if (!arr.length) return out;
      for (let i = 0; i < n; i++) out.push(arr[Math.floor(next() * arr.length)]);
      return out;
    },
    /** The full set once, followed by `extra` random picks. */
    fullThenSampled(arr, extra) {
      return [...arr, ...this.sample(arr, extra)];
    }
  };
}

module.exports = { mulberry32, getSeed, createRng };
