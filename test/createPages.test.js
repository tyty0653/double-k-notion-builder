import test from "node:test";
import assert from "node:assert/strict";
import { createPages } from "../src/createPages.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

const schema = { pages: [{ key: "boss", title: "Boss Dashboard", sections: ["Pending Quotes"] }] };

test("pages reuse valid state IDs", async () => {
  const client = new FakeNotionClient();
  client.seedObject({ object: "page", id: "existing", in_trash: false });
  const state = { pages: { boss: "existing" } };
  const result = await createPages({ client, schema, parentPageId: "parent", state });
  assert.equal(result.reused, 1);
  assert.equal(client.callsFor("pages.create").length, 0);
});

test("pages create once with dashboard headings when no match exists", async () => {
  const client = new FakeNotionClient();
  const state = { pages: {} };
  const result = await createPages({ client, schema, parentPageId: "parent", state });
  assert.equal(result.created, 1);
  assert.equal(client.callsFor("pages.create").length, 1);
  const children = client.callsFor("pages.create")[0].args.children;
  assert.ok(children.some((block) => block.type === "heading_2"));
  await createPages({ client, schema, parentPageId: "parent", state });
  assert.equal(client.callsFor("pages.create").length, 1);
});
