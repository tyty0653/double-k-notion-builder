import test from "node:test";
import assert from "node:assert/strict";
import { systemSchema, validateSchema } from "../src/schemaRegistry.js";

const byKey = (key) => systemSchema.linkedViews.find((view) => view.key === key);

test("registry declares five Quotation Centre and ten Boss Dashboard linked views", () => {
  assert.equal(systemSchema.linkedViews.length, 15);
  assert.equal(systemSchema.linkedViews.filter(({ pageKey }) => pageKey === "quotationCentre").length, 5);
  assert.equal(systemSchema.linkedViews.filter(({ pageKey }) => pageKey === "bossDashboard").length, 10);
  assert.deepEqual(systemSchema.linkedViews.map(({ name }) => name), [
    "Retail Quotations", "Project Quotations", "Need Boss Approval", "Boss Approved", "Follow Up",
    "Pending Boss Approval Quotes", "Today Retail Jobs", "Active Projects", "Outstanding Payments",
    "Quotes to Follow Up", "Expiring Quotes", "Recent Accepted Quotes", "Project Stage Overview",
    "Variation Orders Pending Approval", "Recent Imported Excel Records Needing Review",
  ]);
});

test("registry preserves exact linked-view filters and sorts", () => {
  assert.deepEqual(byKey("quotation-centre-retail").filter,
    { property: "Quote Type", select: { equals: "Retail" } });
  assert.deepEqual(byKey("boss-today-retail-jobs").filter, { and: [
    { property: "Appointment Date", date: { equals: "today" } },
    { property: "Job Status", select: { does_not_equal: "Cancelled" } },
  ] });
  assert.deepEqual(byKey("boss-expiring-quotes").filter, { and: [
    { property: "Valid Until", date: { next_week: {} } },
    { property: "Status", select: { equals: ["Sent", "Follow Up"] } },
  ] });
  assert.deepEqual(byKey("boss-import-review").sorts,
    [{ property: "Created Date", direction: "descending" }]);
});

test("Project Stage Overview is a board grouped by the select property", () => {
  const view = byKey("boss-project-stage-overview");
  assert.equal(view.type, "board");
  assert.deepEqual(view.groupBy, { property: "Project Stage", type: "select", groupBy: "option" });
});

test("linked-view definitions resolve only valid pages, headings, databases, and properties", () => {
  assert.deepEqual(validateSchema(systemSchema), []);
});
