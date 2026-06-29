import test from "node:test";
import assert from "node:assert/strict";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

test("fake client models linked database parents, heading blocks, and view updates", async () => {
  const client = new FakeNotionClient();
  const page = await client.pages.create({
    parent: { type: "page_id", page_id: "root" },
    properties: { title: { type: "title", title: [] } },
    children: [{ object: "block", type: "heading_2", heading_2: { rich_text: [{ plain_text: "Section" }] } }],
  });
  const children = await client.blocks.children.list({ block_id: page.id });
  assert.equal(children.results[0].type, "heading_2");
  assert.ok(children.results[0].id);

  const view = await client.views.create({
    create_database: { parent: { type: "page_id", page_id: page.id }, position: { type: "after_block", block_id: children.results[0].id } },
    data_source_id: "source-ds",
    name: "Linked",
    type: "table",
  });
  const container = await client.databases.retrieve({ database_id: view.parent.database_id });
  assert.equal(container.parent.page_id, page.id);
  await client.views.update({ view_id: view.id, name: "Updated" });
  assert.equal((await client.views.retrieve({ view_id: view.id })).name, "Updated");
});
