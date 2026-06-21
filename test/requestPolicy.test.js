import test from "node:test";
import assert from "node:assert/strict";
import { runWrite, withReadRetry } from "../src/requestPolicy.js";

test("safe reads retry transient errors", async () => {
  let calls = 0;
  const result = await withReadRetry(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("rate"), { status: 429 });
    return "ok";
  }, { sleep: async () => {}, random: () => 0, maxAttempts: 3 });
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("safe reads do not retry permanent errors", async () => {
  let calls = 0;
  await assert.rejects(() => withReadRetry(async () => {
    calls += 1;
    throw Object.assign(new Error("bad"), { status: 400 });
  }, { sleep: async () => {} }));
  assert.equal(calls, 1);
});

test("writes are never generically retried", async () => {
  let calls = 0;
  await assert.rejects(() => runWrite(async () => {
    calls += 1;
    throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
  }));
  assert.equal(calls, 1);
});
