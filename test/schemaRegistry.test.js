import test from "node:test";
import assert from "node:assert/strict";
import {
  databaseByKey,
  systemSchema,
  validateSchema,
} from "../src/schemaRegistry.js";

const DATABASE_KEYS = [
  "customers",
  "sites",
  "services",
  "quotations",
  "quoteItems",
  "retailJobs",
  "projects",
  "projectDocuments",
  "variationOrders",
  "payments",
  "sopTemplates",
  "aiKnowledgeBase",
  "excelImportStaging",
];

test("registry contains the complete Double K page and database surface", () => {
  assert.equal(systemSchema.pages.length, 13);
  assert.deepEqual(systemSchema.databases.map(({ key }) => key), DATABASE_KEYS);
  assert.equal(systemSchema.csvTemplates.length, 13);
});

test("quotation schema preserves manual company quote IDs", () => {
  const quotations = databaseByKey("quotations");
  assert.deepEqual(quotations.properties["Quote ID"], { type: "title" });
  assert.deepEqual(quotations.properties["Original Quote ID"], { type: "rich_text" });
  assert.equal(quotations.properties["Quote ID"].generated, undefined);
  assert.deepEqual(quotations.properties.Status.options, [
    "Draft", "Waiting Info", "Manager Check", "Need Boss Approval",
    "Boss Approved", "Sent", "Follow Up", "Accepted", "Rejected",
    "Expired", "Cancelled",
  ]);
});

test("critical formulas, relations, and import review options are declared", () => {
  assert.equal(
    databaseByKey("quoteItems").properties.Subtotal.expression,
    'prop("Quantity") * prop("Unit Price") - prop("Discount Amount")',
  );
  assert.equal(databaseByKey("customers").properties["Related Sites"].target, "sites");
  assert.deepEqual(
    databaseByKey("excelImportStaging").properties["Quote ID Status"].options,
    ["Valid", "Missing Quote ID", "Duplicate Quote ID", "Needs Manual Review"],
  );
});

test("registry validation resolves all targets and stable sample counts", () => {
  assert.deepEqual(validateSchema(systemSchema), []);
  assert.deepEqual(
    Object.fromEntries(Object.entries(systemSchema.seeds).map(([key, rows]) => [key, rows.length])),
    {
      customers: 3,
      sites: 3,
      services: 8,
      quotations: 5,
      quoteItems: 7,
      retailJobs: 2,
      projects: 2,
      projectDocuments: 2,
      variationOrders: 1,
      payments: 3,
      sopTemplates: 5,
      aiKnowledgeBase: 5,
    },
  );
});
