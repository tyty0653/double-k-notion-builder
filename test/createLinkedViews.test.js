import test from "node:test";
import assert from "node:assert/strict";
import { createLinkedViews } from "../src/createLinkedViews.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

async function fixture(definition = {}) {
  const client = new FakeNotionClient();
  const page = await client.pages.create({
    parent: { type: "page_id", page_id: "root" },
    properties: { title: { type: "title", title: [] } },
    children: [{ object: "block", type: "heading_2", heading_2: { rich_text: [{ plain_text: definition.heading ?? "Need Boss Approval" }] } }],
  });
  client.seedObject({ object: "data_source", id: "quotes-ds", properties: {
    "Quote ID": { id: "quote-id", title: {} },
    Status: { id: "status", select: {} },
    "Quote Date": { id: "quote-date", date: {} },
    Notes: { id: "notes", rich_text: {} },
  } });
  const state = { pages: { dashboard: page.id }, databases: { quotes: { databaseId: "source-db", dataSourceId: "quotes-ds" } }, linkedViews: {} };
  const schema = { linkedViews: [{
    key: "approval", pageKey: "dashboard", heading: "Need Boss Approval", databaseKey: "quotes",
    name: "Need Boss Approval", type: "table",
    filter: { property: "Status", select: { equals: "Need Boss Approval" } },
    sorts: [{ property: "Quote Date", direction: "ascending" }],
    visibleProperties: ["Quote ID", "Status", "Quote Date"],
    ...definition,
  }] };
  const persisted = [];
  return { client, schema, state, persist: async (next) => persisted.push(structuredClone(next)), persisted };
}

test("linked view creation uses heading placement, filters, sorts, visible properties, and safe state", async () => {
  const context = await fixture();
  const result = await createLinkedViews(context);
  assert.equal(result.created, 1);
  const heading = (await context.client.blocks.children.list({ block_id: context.state.pages.dashboard })).results[0];
  assert.deepEqual(context.client.callsFor("views.create")[0].args, {
    create_database: {
      parent: { type: "page_id", page_id: context.state.pages.dashboard },
      position: { type: "after_block", block_id: heading.id },
    },
    data_source_id: "quotes-ds",
    name: "Need Boss Approval",
    type: "table",
    filter: context.schema.linkedViews[0].filter,
    sorts: context.schema.linkedViews[0].sorts,
    configuration: { type: "table", properties: [
      { property_id: "quote-id", visible: true },
      { property_id: "status", visible: true },
      { property_id: "quote-date", visible: true },
      { property_id: "notes", visible: false },
    ] },
  });
  assert.deepEqual(Object.keys(context.state.linkedViews.approval).sort(),
    ["dataSourceId", "linkedDatabaseId", "targetPageId", "viewId"]);
  assert.equal(context.persisted.length, 1);
});

test("board view groups by the resolved select property ID", async () => {
  const context = await fixture({
    type: "board",
    groupBy: { property: "Status", type: "select", groupBy: "option" },
  });
  await createLinkedViews(context);
  assert.deepEqual(context.client.callsFor("views.create")[0].args.configuration.group_by, {
    type: "select", property_id: "status", group_by: "option",
    sort: { type: "manual" }, hide_empty_groups: true,
  });
});
