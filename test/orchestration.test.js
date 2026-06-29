import test from "node:test";
import assert from "node:assert/strict";
import { orchestrate } from "../src/index.js";

test("setup phases run in the approved order and seed is opt-in", async () => {
  const order = [];
  const action = (name, result = {}) => async () => { order.push(name); return { created: 0, reused: 0, manualActions: [], ...result }; };
  await orchestrate({
    options: { command: "setup", dryRun: false, seed: true },
    context: {},
    actions: {
      validate: action("validate"), pages: action("pages"), databases: action("databases"),
      relations: action("relations"), views: action("views"), docs: action("docs"),
      linkedViews: action("linkedViews"),
      seed: action("seed"), report: action("report"),
    },
  });
  assert.deepEqual(order, ["validate", "pages", "databases", "relations", "views", "linkedViews", "docs", "seed", "report"]);
});

test("view manual actions do not fail core setup", async () => {
  const noop = async () => ({ created: 0, reused: 0, manualActions: [] });
  const result = await orchestrate({
    options: { command: "setup", dryRun: false, seed: false },
    context: {},
    actions: { validate: noop, pages: noop, databases: noop, relations: noop, views: async () => ({ created: 0, reused: 0, manualActions: ["view manual"] }), linkedViews: async () => ({ created: 0, reused: 0, manualActions: ["linked manual"] }), docs: noop, seed: noop, report: noop },
  });
  assert.ok(result.manualActions.includes("view manual"));
  assert.ok(result.manualActions.includes("linked manual"));
});
