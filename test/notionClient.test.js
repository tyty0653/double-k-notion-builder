import test from "node:test";
import assert from "node:assert/strict";
import { createNotionClient, NOTION_API_VERSION } from "../src/notionClient.js";

test("client always uses the approved explicit API version", () => {
  let received;
  class ClientSpy {
    constructor(options) { received = options; }
  }
  createNotionClient({ token: "test-token", ClientClass: ClientSpy });
  assert.equal(NOTION_API_VERSION, "2026-03-11");
  assert.deepEqual(received, {
    auth: "test-token",
    notionVersion: "2026-03-11",
    retry: { maxRetries: 3, initialRetryDelayMs: 500, maxRetryDelayMs: 10000 },
  });
});

test("client rejects missing credentials without leaking tokens", () => {
  assert.throws(() => createNotionClient({ token: "" }), /NOTION_TOKEN is required/);
});
