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

test("builder-managed matching views are reused without writes", async () => {
  const context = await fixture();
  await createLinkedViews(context);
  context.client.calls.length = 0;
  const result = await createLinkedViews(context);
  assert.equal(result.reused, 1);
  assert.equal(context.client.callsFor("views.create").length, 0);
  assert.equal(context.client.callsFor("views.update").length, 0);
});

test("builder-managed changed views are updated rather than duplicated", async () => {
  const context = await fixture();
  await createLinkedViews(context);
  const view = context.client.viewObjects.get(context.state.linkedViews.approval.viewId);
  view.filter = { property: "Status", select: { equals: "Draft" } };
  context.client.calls.length = 0;
  const result = await createLinkedViews(context);
  assert.equal(result.reused, 1);
  assert.equal(context.client.callsFor("views.create").length, 0);
  assert.equal(context.client.callsFor("views.update").length, 1);
  assert.deepEqual(context.client.callsFor("views.update")[0].args.filter, context.schema.linkedViews[0].filter);
});

test("matching untracked manual view is adopted without changing it", async () => {
  const context = await fixture();
  await createLinkedViews(context);
  const existingId = context.state.linkedViews.approval.viewId;
  context.state.linkedViews = {};
  context.client.calls.length = 0;
  const result = await createLinkedViews(context);
  assert.equal(result.reused, 1);
  assert.equal(context.state.linkedViews.approval.viewId, existingId);
  assert.equal(context.client.callsFor("views.create").length, 0);
  assert.equal(context.client.callsFor("views.update").length, 0);
});

test("conflicting untracked manual view is reported without overwrite or duplicate", async () => {
  const context = await fixture();
  await createLinkedViews(context);
  const existing = context.client.viewObjects.get(context.state.linkedViews.approval.viewId);
  existing.filter = { property: "Status", select: { equals: "Draft" } };
  context.state.linkedViews = {};
  context.client.calls.length = 0;
  const result = await createLinkedViews(context);
  assert.match(result.manualActions[0], /conflicts/);
  assert.equal(context.client.callsFor("views.create").length, 0);
  assert.equal(context.client.callsFor("views.update").length, 0);
});

test("multiple matching manual views are reported as ambiguous", async () => {
  const context = await fixture();
  await createLinkedViews(context);
  const existing = context.client.viewObjects.get(context.state.linkedViews.approval.viewId);
  context.client.seedView({ ...structuredClone(existing), id: "duplicate-view" });
  context.state.linkedViews = {};
  context.client.calls.length = 0;
  const result = await createLinkedViews(context);
  assert.match(result.manualActions[0], /Multiple linked views/);
  assert.equal(context.client.callsFor("views.create").length, 0);
  assert.equal(context.client.callsFor("views.update").length, 0);
});

test("missing or ambiguous headings never cause fallback placement", async () => {
  const missing = await fixture({ heading: "Different Heading" });
  missing.schema.linkedViews[0].heading = "Expected Heading";
  const missingResult = await createLinkedViews(missing);
  assert.match(missingResult.manualActions[0], /expected exactly one heading/);
  assert.equal(missing.client.callsFor("views.create").length, 0);

  const ambiguous = await fixture();
  const pageId = ambiguous.state.pages.dashboard;
  ambiguous.client.children.get(pageId).push(structuredClone(ambiguous.client.children.get(pageId)[0]));
  const ambiguousResult = await createLinkedViews(ambiguous);
  assert.match(ambiguousResult.manualActions[0], /expected exactly one heading/);
  assert.equal(ambiguous.client.callsFor("views.create").length, 0);
});

test("linked view API failures are non-fatal manual actions", async () => {
  const context = await fixture();
  context.client.failViewCreation = true;
  const result = await createLinkedViews(context);
  assert.equal(result.created, 0);
  assert.match(result.manualActions[0], /manual setup/);
});

test("builder-managed update failures are non-fatal manual actions", async () => {
  const context = await fixture();
  await createLinkedViews(context);
  context.client.viewObjects.get(context.state.linkedViews.approval.viewId).filter = null;
  context.client.failViewUpdate = true;
  const result = await createLinkedViews(context);
  assert.equal(result.reused, 0);
  assert.match(result.manualActions[0], /manual setup/);
  assert.equal(context.client.callsFor("views.create").length, 1);
});

test("same-named linked view on another page is ignored", async () => {
  const context = await fixture();
  const otherDatabase = context.client.seedObject({ object: "database", id: "other-linked-db", parent: { type: "page_id", page_id: "other-page" }, in_trash: false });
  context.client.seedView({
    object: "view", id: "other-view", name: "Need Boss Approval", type: "table",
    parent: { type: "database_id", database_id: otherDatabase.id }, data_source_id: "quotes-ds",
    filter: context.schema.linkedViews[0].filter, sorts: context.schema.linkedViews[0].sorts,
    configuration: { type: "table", properties: [] },
  });
  const result = await createLinkedViews(context);
  assert.equal(result.created, 1);
  assert.equal(context.client.callsFor("views.create").length, 1);
});
