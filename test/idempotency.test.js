import test from "node:test";
import assert from "node:assert/strict";
import { createPages } from "../src/createPages.js";
import { createDatabases } from "../src/createDatabases.js";
import { createRelations } from "../src/createRelations.js";
import { createViews } from "../src/createViews.js";
import { systemSchema } from "../src/schemaRegistry.js";
import { FakeNotionClient } from "./helpers/fakeNotionClient.js";

test("a complete structure rerun creates no duplicate objects", async () => {
  const client = new FakeNotionClient();
  const state = { pages: {}, databases: {}, seeds: {} };
  const context = { client, schema: systemSchema, parentPageId: "parent", state };
  await createPages(context);
  await createDatabases(context);
  await createRelations(context);
  await createViews(context);
  const first = {
    pages: client.callsFor("pages.create").length,
    databases: client.callsFor("databases.create").length,
    relations: client.callsFor("dataSources.update").length,
    views: client.callsFor("views.create").length,
  };
  await createPages(context);
  await createDatabases(context);
  await createRelations(context);
  await createViews(context);
  assert.deepEqual({
    pages: client.callsFor("pages.create").length,
    databases: client.callsFor("databases.create").length,
    relations: client.callsFor("dataSources.update").length,
    views: client.callsFor("views.create").length,
  }, first);
});
