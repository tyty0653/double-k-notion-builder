import test from "node:test";
import assert from "node:assert/strict";
import { seedSampleData } from "../src/seedSampleData.js";
import { systemSchema } from "../src/schemaRegistry.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

function configuredState() {
  return {
    databases: Object.fromEntries(systemSchema.databases.map(({ key }) => [key, { databaseId: `db-${key}`, dataSourceId: `ds-${key}` }])),
    seeds: {},
  };
}

test("sample seeding uses exact counts, stable relations, and no people fields", async () => {
  const client = new FakeNotionClient();
  const state = configuredState();
  const result = await seedSampleData({ client, schema: systemSchema, state });
  assert.equal(result.created, 46);
  assert.equal(client.callsFor("pages.create").length, 46);
  for (const call of client.callsFor("pages.create")) {
    for (const value of Object.values(call.args.properties)) assert.equal(value.people, undefined);
    assert.ok(call.args.children[0].paragraph.rich_text[0].text.content.includes("[Sample]"));
  }
  const related = client.callsFor("pages.create").find((call) => call.args.properties.Customer?.relation);
  assert.match(related.args.properties.Customer.relation[0].id, /^page-/);
  await seedSampleData({ client, schema: systemSchema, state });
  assert.equal(client.callsFor("pages.create").length, 46);
});

test("sample quote labels do not claim to be Double K's format", () => {
  const titles = systemSchema.seeds.quotations.map(({ title }) => title);
  assert.ok(titles.every((value) => value.startsWith("SAMPLE-")));
});
