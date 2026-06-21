import test from "node:test";
import assert from "node:assert/strict";
import { createDryRunPlan } from "../src/index.js";
import { systemSchema } from "../src/schemaRegistry.js";

test("dry-run is deterministic and needs no client or filesystem", () => {
  const first = createDryRunPlan(systemSchema, { includeSeed: false });
  const second = createDryRunPlan(systemSchema, { includeSeed: false });
  assert.deepEqual(first, second);
  assert.equal(first.pages, 13);
  assert.equal(first.databases, 13);
  assert.ok(first.actions.some((action) => action.id === "dryrun:database:quotations"));
  assert.equal(first.seedRecords, 0);
  assert.equal(createDryRunPlan(systemSchema, { includeSeed: true }).seedRecords, 46);
});
