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
