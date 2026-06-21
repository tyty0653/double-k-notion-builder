import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadState, saveState } from "../src/stateStore.js";

test("state is atomic, round-trippable, and secret-free", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "double-k-state-"));
  const filename = path.join(directory, "notion-state.json");
  await saveState(filename, {
    schemaVersion: 1,
    notionApiVersion: "2026-03-11",
    parentPageId: "parent",
    pages: { bossDashboard: "page" },
    databases: { customers: { databaseId: "db", dataSourceId: "ds" } },
    linkedViews: { approval: { viewId: "view", linkedDatabaseId: "linked-db", targetPageId: "page", dataSourceId: "ds", customerName: "must-not-persist", filter: { businessData: "must-not-persist" } } },
    seeds: { customers: { sample: "row" } },
    NOTION_TOKEN: "secret-token",
    headers: { authorization: "bad" },
  });
  const raw = await fs.readFile(filename, "utf8");
  assert.ok(!raw.includes("secret-token"));
  assert.ok(!raw.includes("authorization"));
  assert.ok(!raw.includes("must-not-persist"));
  assert.deepEqual(await loadState(filename), {
    schemaVersion: 1,
    notionApiVersion: "2026-03-11",
    parentPageId: "parent",
    pages: { bossDashboard: "page" },
    databases: { customers: { databaseId: "db", dataSourceId: "ds" } },
    linkedViews: { approval: { viewId: "view", linkedDatabaseId: "linked-db", targetPageId: "page", dataSourceId: "ds" } },
    seeds: { customers: { sample: "row" } },
  });
});
