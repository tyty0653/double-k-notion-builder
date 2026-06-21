import test from "node:test";
import assert from "node:assert/strict";
import { createViews } from "../src/createViews.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

const schema = { views: [{ key: "approval", databaseKey: "quotes", name: "Need Boss Approval", type: "table", filter: { property: "Status", select: { equals: "Need Boss Approval" } } }] };
const state = { databases: { quotes: { databaseId: "db", dataSourceId: "ds" } } };

test("simple views use the current data-source endpoint", async () => {
  const client = new FakeNotionClient();
  const result = await createViews({ client, schema, state });
  assert.equal(result.created, 1);
  assert.deepEqual(client.callsFor("views.create")[0].args, {
    data_source_id: "ds",
    database_id: "db",
    name: "Need Boss Approval",
    type: "table",
    filter: schema.views[0].filter,
    position: { type: "end" },
  });
});

test("view failures are non-fatal manual actions", async () => {
  const client = new FakeNotionClient();
  client.failViewCreation = true;
  const result = await createViews({ client, schema, state });
  assert.equal(result.created, 0);
  assert.equal(result.manualActions.length, 1);
});
