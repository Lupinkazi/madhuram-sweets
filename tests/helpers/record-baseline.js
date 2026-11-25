"use strict";
/*
 * Records the preservation baseline from the CURRENT site code into
 * tests/fixtures/baseline.json. Run once on the unfixed code and commit
 * the result:  node tests/helpers/record-baseline.js
 * Re-recording after the fix would hide regressions, so do not.
 */
const fs = require("node:fs");
const path = require("node:path");
const sc = require("./scenarios");

async function main() {
  const inputs = sc.generateInputs();
  const baseline = {
    note: "Recorded on the unfixed code by tests/helpers/record-baseline.js. Do not re-record after the ghee-sweets fix.",
    seeds: sc.SEEDS,
    inputs,
    observed: {
      orderList: inputs.orderList.map(sc.observeOrderListSequence),
      search: sc.observeSearch(inputs.searchQueries),
      dialog: sc.observeDialog(inputs.dialog),
      orderForm: await sc.observeForms(inputs.orderForm),
      contactForm: await sc.observeForms(inputs.contactForm),
      prefill: sc.observePrefill(inputs.prefill),
      art: sc.observeArt(),
      static: sc.observeStatic()
    }
  };
  fs.mkdirSync(path.dirname(sc.BASELINE_PATH), { recursive: true });
  fs.writeFileSync(sc.BASELINE_PATH, `${JSON.stringify(baseline, null, 1)}\n`);
  const kb = Math.round(fs.statSync(sc.BASELINE_PATH).size / 1024);
  console.log(`Baseline written to ${path.relative(process.cwd(), sc.BASELINE_PATH)} (${kb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
