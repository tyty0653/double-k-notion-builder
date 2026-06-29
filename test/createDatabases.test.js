import test from "node:test";
import assert from "node:assert/strict";
import { createDatabases } from "../src/createDatabases.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

const schema = {
  databases: [{
    key: "customers",
    title: "Customers",
    parentPageKey: "crm",
    purpose: "Store customers",
    properties: {
      Name: { type: "title" },
      Status: { type: "select", options: ["Active"] },
      Jobs: { type: "relation", target: "jobs" },
    },
  }],
};

test("database creation uses current initial data source and omits relations", async () => {
  const client = new FakeNotionClient();
  const state = { pages: { crm: "page-crm" }, databases: {} };
  const result = await createDatabases({ client, schema, state });
  assert.equal(result.created, 1);
  const args = client.callsFor("databases.create")[0].args;
  assert.equal(args.parent.page_id, "page-crm");
  assert.ok(args.initial_data_source.properties.Name.title);
  assert.equal(args.initial_data_source.properties.Jobs, undefined);
  assert.match(state.databases.customers.databaseId, /^database-/);
  assert.match(state.databases.customers.dataSourceId, /^datasource-/);
  await createDatabases({ client, schema, state });
  assert.equal(client.callsFor("databases.create").length, 1);
});

test("stale state discovery uses the current data_source search filter", async () => {
  const client = new FakeNotionClient();
  const originalSearch = client.search;
  client.search = async (args) => {
    assert.equal(args.filter.value, "data_source");
    return originalSearch(args);
  };
  client.seedObject({
    object: "database",
    id: "db-existing",
    parent: { type: "page_id", page_id: "page-crm" },
    data_sources: [{ id: "ds-existing" }],
    in_trash: false,
  });
  client.seedObject({
    object: "data_source",
    id: "ds-existing",
    title: [{ type: "text", text: { content: "Customers" } }],
    parent: { type: "database_id", database_id: "db-existing" },
    properties: {},
  });
  const state = { pages: { crm: "page-crm" }, databases: {} };
  const result = await createDatabases({ client, schema, state });
  assert.equal(result.reused, 1);
  assert.deepEqual(state.databases.customers, { databaseId: "db-existing", dataSourceId: "ds-existing" });
  assert.equal(client.callsFor("databases.create").length, 0);
});
