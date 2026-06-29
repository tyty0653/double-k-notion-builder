import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyQuoteIds,
  createQuoteId,
  preserveOriginalQuoteNumber,
} from "../src/quoteRules.js";

test("duplicate checks never rewrite displayed quote numbers", () => {
  assert.deepEqual(classifyQuoteIds([" DK-001 ", "dk-001", ""]), [
    { original: " DK-001 ", status: "Duplicate Quote ID" },
    { original: "dk-001", status: "Duplicate Quote ID" },
    { original: "", status: "Missing Quote ID" },
  ]);
});

test("original quote numbers are preserved and no generator exists", () => {
  assert.equal(preserveOriginalQuoteNumber(" 001/A "), " 001/A ");
  assert.equal(createQuoteId(), undefined);
});
