import test from "node:test";
import assert from "node:assert/strict";
import { createRelations } from "../src/createRelations.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

test("relations are added only after all targets resolve", async () => {
  const client = new FakeNotionClient();
  client.seedObject({ id: "ds-a", properties: {} });
  client.seedObject({ id: "ds-b", properties: {} });
  const schema = { databases: [
    { key: "a", properties: { Related: { type: "relation", target: "b" } } },
    { key: "b", properties: {} },
  ] };
  const state = { databases: { a: { dataSourceId: "ds-a" }, b: { dataSourceId: "ds-b" } } };
  const result = await createRelations({ client, schema, state });
  assert.equal(result.created, 1);
  assert.deepEqual(client.callsFor("dataSources.update")[0].args.properties.Related, {
    relation: { data_source_id: "ds-b", type: "single_property", single_property: {} },
  });
  await createRelations({ client, schema, state });
  assert.equal(client.callsFor("dataSources.update").length, 1);
});

test("relations stop before writes when a target ID is missing", async () => {
  const client = new FakeNotionClient();
  const schema = { databases: [{ key: "a", properties: { Related: { type: "relation", target: "b" } } }] };
  await assert.rejects(() => createRelations({ client, schema, state: { databases: {} } }), /missing data source IDs/);
  assert.equal(client.callsFor("dataSources.update").length, 0);
});
