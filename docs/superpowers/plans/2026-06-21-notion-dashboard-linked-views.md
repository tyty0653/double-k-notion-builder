# Automated Notion Dashboard Linked Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `npm run setup` to create or safely adopt 15 filtered linked database views inside Quotation Centre and Boss Dashboard without duplicating views or overwriting conflicting manual configuration.

**Architecture:** Keep the existing four database-native views in `createViews.js`. Add declarative `linkedViews` definitions to the schema registry and a focused `createLinkedViews.js` reconciler that resolves heading blocks and property IDs, creates linked database containers with the Views API, stores safe IDs, updates only builder-managed views, adopts matching manual views, and reports all unsafe conditions as non-fatal manual actions.

**Tech Stack:** Node.js 18+, ECMAScript modules, Node's built-in test runner, `@notionhq/client` 5.22.0, Notion API `2026-03-11`.

---

## File Map

- Modify `src/schemaRegistry.js`: declare and validate all 15 linked-view definitions.
- Create `src/createLinkedViews.js`: resolve headings/properties, create, discover, compare, adopt, reconcile, and report linked views.
- Modify `src/stateStore.js`: sanitize the new linked-view ID state.
- Modify `src/index.js`: add the linked-view phase and dry-run output.
- Modify `test/helpers/fakeNotionClient.js`: model heading blocks, linked database containers, view updates, and property IDs.
- Create `test/linkedViewRegistry.test.js`: test the complete declarative contract.
- Create `test/createLinkedViews.test.js`: test creation, filters, sorts, placement, adoption, conflicts, failures, and builder-managed updates.
- Modify `test/stateStore.test.js`: test ID-only linked-view state.
- Modify `test/orchestration.test.js`: test phase order and non-fatal manual actions.
- Modify `test/dryRun.test.js`: test the new deterministic count and actions.
- Modify `test/idempotency.test.js`: test a complete rerun creates no duplicate linked views.
- Modify `test/quoteRules.test.js`: add a registry-level Quote ID non-automation regression before linked-view production code exists.
- Modify `test/documentation.test.js`: test the revised operator guidance.
- Modify `README.md`, `docs/setup-guide.md`, and `docs/manual-dashboard-guide.md`: document automation, conflicts, API limitations, and verification.

## Expected Dry-Run Contract

The existing fields remain unchanged and the plan adds:

```json
{
  "views": 4,
  "linkedViews": 15,
  "seedRecords": 0
}
```

The `actions` array adds 15 deterministic entries shaped as:

```json
{
  "id": "dryrun:linked-view:quotation-centre-retail",
  "action": "create-or-reuse linked dashboard view"
}
```

Dry-run remains credential-free with `networkCalls: 0` and `filesystemWrites: 0`.

---

### Task 1: Declare and validate the 15-view registry

**Files:**
- Create: `test/linkedViewRegistry.test.js`
- Modify: `src/schemaRegistry.js`
- Modify: `test/quoteRules.test.js`

- [ ] **Step 1: Write the failing registry tests**

Create `test/linkedViewRegistry.test.js` with assertions that lock the 5/10 page split, exact source databases, exact filters/sorts, visible properties, and Project Stage board grouping:

```js
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
```

Extend `test/quoteRules.test.js` in the same RED step:

```js
import { databaseByKey, systemSchema } from "../src/schemaRegistry.js";

test("linked views display Quote ID without generating or deriving it", () => {
  assert.deepEqual(databaseByKey("quotations").properties["Quote ID"], { type: "title" });
  assert.equal(createQuoteId(), undefined);
  assert.ok(systemSchema.linkedViews.some(({ visibleProperties }) => visibleProperties.includes("Quote ID")));
  assert.ok(systemSchema.linkedViews.every(({ filter, sorts = [] }) =>
    !JSON.stringify({ filter, sorts }).includes('"Quote ID"')));
});
```

- [ ] **Step 2: Run the registry tests and verify RED**

Run: `node --test test/linkedViewRegistry.test.js test/quoteRules.test.js`

Expected: FAIL because `systemSchema.linkedViews` is undefined.

- [ ] **Step 3: Add the complete registry declarations**

In `src/schemaRegistry.js`, add a small `linkedView` helper and a `linkedViews` array. Use the exact definitions from the approved design, including these filter forms:

```js
const linkedView = (key, pageKey, heading, databaseKey, name, options = {}) => ({
  key, pageKey, heading, databaseKey, name, type: "table", ...options,
});

const linkedViews = [
  linkedView("quotation-centre-retail", "quotationCentre", "Retail Quotations", "quotations", "Retail Quotations", {
    filter: { property: "Quote Type", select: { equals: "Retail" } },
    sorts: [{ property: "Quote Date", direction: "descending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Final Approved Amount"],
  }),
  linkedView("quotation-centre-project", "quotationCentre", "Project Quotations", "quotations", "Project Quotations", {
    filter: { property: "Quote Type", select: { equals: "Project" } },
    sorts: [{ property: "Quote Date", direction: "descending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Final Approved Amount"],
  }),
  linkedView("quotation-centre-approval", "quotationCentre", "Need Boss Approval", "quotations", "Need Boss Approval", {
    filter: { property: "Status", select: { equals: "Need Boss Approval" } },
    sorts: [{ property: "Quote Date", direction: "ascending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Final Approved Amount"],
  }),
  linkedView("quotation-centre-approved", "quotationCentre", "Boss Approved", "quotations", "Boss Approved", {
    filter: { property: "Status", select: { equals: "Boss Approved" } },
    sorts: [{ property: "Last Edited", direction: "descending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Final Approved Amount"],
  }),
  linkedView("quotation-centre-follow-up", "quotationCentre", "Follow Up", "quotations", "Follow Up", {
    filter: { property: "Status", select: { equals: "Follow Up" } },
    sorts: [{ property: "Valid Until", direction: "ascending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Final Approved Amount"],
  }),
  linkedView("boss-pending-approval", "bossDashboard", "Pending Boss Approval Quotes", "quotations", "Pending Boss Approval Quotes", {
    filter: { property: "Status", select: { equals: "Need Boss Approval" } },
    sorts: [{ property: "Quote Date", direction: "ascending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Approval Status", "Quote Date", "Valid Until", "PIC", "Prepared By", "Approved By", "Discount Amount", "Requested By", "Final Approved Amount"],
  }),
  linkedView("boss-today-retail-jobs", "bossDashboard", "Today Retail Jobs", "retailJobs", "Today Retail Jobs", {
    filter: { and: [
      { property: "Appointment Date", date: { equals: "today" } },
      { property: "Job Status", select: { does_not_equal: "Cancelled" } },
    ] },
    sorts: [{ property: "Appointment Date", direction: "ascending" }],
    visibleProperties: ["Job ID", "Customer", "Site", "Service Type", "Job Status", "Appointment Date", "Technician / Staff", "Payment Status"],
  }),
  linkedView("boss-active-projects", "bossDashboard", "Active Projects", "projects", "Active Projects", {
    filter: { property: "Project Stage", select: { equals: ["Confirmed", "In Progress"] } },
    sorts: [{ property: "Target Completion Date", direction: "ascending" }],
    visibleProperties: ["Project Name", "Project Code", "Customer", "Site", "Project Stage", "Project Value", "PIC", "Target Completion Date"],
  }),
  linkedView("boss-outstanding-payments", "bossDashboard", "Outstanding Payments", "payments", "Outstanding Payments", {
    filter: { property: "Payment Status", select: { equals: ["Unpaid", "Deposit Paid", "Partial Paid", "Overdue"] } },
    sorts: [{ property: "Due Date", direction: "ascending" }],
    visibleProperties: ["Payment Record", "Customer", "Quote", "Retail Job", "Project", "Payment Type", "Amount", "Payment Status", "Due Date", "Paid Date"],
  }),
  linkedView("boss-quotes-follow-up", "bossDashboard", "Quotes to Follow Up", "quotations", "Quotes to Follow Up", {
    filter: { property: "Status", select: { equals: "Follow Up" } },
    sorts: [{ property: "Valid Until", direction: "ascending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Quote Date", "Valid Until", "PIC", "Final Approved Amount"],
  }),
  linkedView("boss-expiring-quotes", "bossDashboard", "Expiring Quotes", "quotations", "Expiring Quotes", {
    filter: { and: [
      { property: "Valid Until", date: { next_week: {} } },
      { property: "Status", select: { equals: ["Sent", "Follow Up"] } },
    ] },
    sorts: [{ property: "Valid Until", direction: "ascending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Quote Date", "Valid Until", "PIC", "Final Approved Amount"],
  }),
  linkedView("boss-recent-accepted", "bossDashboard", "Recent Accepted Quotes", "quotations", "Recent Accepted Quotes", {
    filter: { property: "Status", select: { equals: "Accepted" } },
    sorts: [{ property: "Last Edited", direction: "descending" }],
    visibleProperties: ["Quote ID", "Quote Type", "Customer", "Site", "Status", "Quote Date", "Valid Until", "PIC", "Final Approved Amount"],
  }),
  linkedView("boss-project-stage-overview", "bossDashboard", "Project Stage Overview", "projects", "Project Stage Overview", {
    type: "board",
    filter: { property: "Project Stage", select: { does_not_equal: ["Completed", "Cancelled"] } },
    sorts: [{ property: "Target Completion Date", direction: "ascending" }],
    visibleProperties: ["Project Name", "Project Code", "Customer", "Site", "Project Stage", "Project Value", "PIC", "Target Completion Date"],
    groupBy: { property: "Project Stage", type: "select", groupBy: "option" },
  }),
  linkedView("boss-variation-approval", "bossDashboard", "Variation Orders Pending Approval", "variationOrders", "Variation Orders Pending Approval", {
    filter: { property: "Status", select: { equals: "Need Boss Approval" } },
    sorts: [{ property: "Created Date", direction: "ascending" }],
    visibleProperties: ["VO ID", "Project", "Description", "Amount", "Status", "Approved By", "Approved Date"],
  }),
  linkedView("boss-import-review", "bossDashboard", "Recent Imported Excel Records Needing Review", "excelImportStaging", "Recent Imported Excel Records Needing Review", {
    filter: { or: [
      { property: "Quote ID Status", select: { equals: ["Missing Quote ID", "Duplicate Quote ID", "Needs Manual Review"] } },
      { property: "Import Status", select: { equals: ["Raw", "Needs Cleaning"] } },
    ] },
    sorts: [{ property: "Created Date", direction: "descending" }],
    visibleProperties: ["Import Row ID", "Original Quote Number", "Original Customer Name", "Original Date", "Original Amount", "Quote ID Status", "Import Status", "Cleaning Notes"],
  }),
];
```

Expose `linkedViews` on `systemSchema`. Extend `validateSchema` to reject duplicate keys, invalid page keys, headings absent from that page's `sections`, invalid database keys, invalid visible/sort/filter/group properties, and a board without `groupBy`.

Use a recursive property collector so nested filters are validated:

```js
function filterProperties(filter) {
  if (!filter) return [];
  if (filter.property) return [filter.property];
  return [...(filter.and ?? []), ...(filter.or ?? [])].flatMap(filterProperties);
}

const linkedKeys = new Set(schema.linkedViews.map(({ key }) => key));
if (linkedKeys.size !== schema.linkedViews.length) errors.push("Duplicate linked view key");
for (const view of schema.linkedViews) {
  const targetPage = schema.pages.find(({ key }) => key === view.pageKey);
  const targetDatabase = schema.databases.find(({ key }) => key === view.databaseKey);
  if (!targetPage) errors.push(`${view.key}: invalid linked view page`);
  if (targetPage && !targetPage.sections.includes(view.heading)) errors.push(`${view.key}: invalid linked view heading`);
  if (!targetDatabase) errors.push(`${view.key}: invalid linked view database`);
  const referenced = [
    ...view.visibleProperties,
    ...view.sorts.map(({ property }) => property),
    ...filterProperties(view.filter),
    ...(view.groupBy ? [view.groupBy.property] : []),
  ];
  for (const name of referenced) {
    if (targetDatabase && !targetDatabase.properties[name]) errors.push(`${view.key}: invalid property ${name}`);
  }
  if (view.type === "board" && !view.groupBy) errors.push(`${view.key}: board requires groupBy`);
}
```

- [ ] **Step 4: Run registry tests and the existing schema tests**

Run: `node --test test/linkedViewRegistry.test.js test/schemaRegistry.test.js test/quoteRules.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the registry contract**

```powershell
git add src/schemaRegistry.js test/linkedViewRegistry.test.js test/quoteRules.test.js
git commit -m "feat: declare dashboard linked views"
```

---

### Task 2: Model the linked Views API in the fake client

**Files:**
- Modify: `test/helpers/fakeNotionClient.js`
- Create: `test/fakeNotionLinkedViews.test.js`

- [ ] **Step 1: Write a failing contract test for the fake API**

```js
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
```

- [ ] **Step 2: Run the fake contract test and verify RED**

Run: `node --test test/fakeNotionLinkedViews.test.js`

Expected: FAIL because page children are not retained and `views.update` is absent.

- [ ] **Step 3: Implement the fake behavior**

Modify `FakeNotionClient` to:

```js
this.children = new Map();
this.failViewUpdate = false;
```

Assign IDs to page children in `pages.create`, return them from `blocks.children.list`, assign stable `id` values to stored data-source properties, create a database object when `views.create` receives `create_database`, set the view's `parent.database_id`, and add:

```js
update: async ({ view_id, ...changes }) => this.#record("views.update", { view_id, ...changes }, () => {
  if (this.failViewUpdate) throw Object.assign(new Error("view update unavailable"), { status: 400 });
  const current = this.viewObjects.get(view_id);
  if (!current) throw Object.assign(new Error("not found"), { status: 404 });
  const updated = { ...current, ...changes, configuration: changes.configuration ?? current.configuration };
  this.viewObjects.set(view_id, updated);
  return updated;
}),
```

Add `seedView(view)` for focused discovery tests. Keep all existing call recording and native-view behavior unchanged.

- [ ] **Step 4: Run fake and existing view tests**

Run: `node --test test/fakeNotionLinkedViews.test.js test/createViews.test.js test/createPages.test.js test/createDatabases.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the test infrastructure**

```powershell
git add test/helpers/fakeNotionClient.js test/fakeNotionLinkedViews.test.js
git commit -m "test: model linked views in fake Notion client"
```

---

### Task 3: Create linked views with exact placement and presentation

**Files:**
- Create: `src/createLinkedViews.js`
- Create: `test/createLinkedViews.test.js`
- Modify: `test/idempotency.test.js`

- [ ] **Step 1: Write failing creation and placement tests**

Build a minimal schema/state fixture with one target page, one heading, one data source with property IDs, and one linked-view definition. Assert that `views.create` receives:

```js
{
  create_database: {
    parent: { type: "page_id", page_id: "dashboard-page" },
    position: { type: "after_block", block_id: "approval-heading" },
  },
  data_source_id: "quotes-ds",
  name: "Need Boss Approval",
  type: "table",
  filter: { property: "Status", select: { equals: "Need Boss Approval" } },
  sorts: [{ property: "Quote Date", direction: "ascending" }],
  configuration: {
    type: "table",
    properties: [
      { property_id: "quote-id", visible: true },
      { property_id: "status", visible: true },
      { property_id: "quote-date", visible: true },
      { property_id: "notes", visible: false },
    ],
  },
}
```

Also assert the created `viewId`, linked parent database ID, target page ID, and data-source ID are persisted immediately under `state.linkedViews[definition.key]`.

In the same RED step, import `createLinkedViews` in `test/idempotency.test.js`, call it after native `createViews` in both passes, and record linked creates separately:

```js
const linkedCreates = () => client.callsFor("views.create").filter(({ args }) => args.create_database).length;
```

The final assertion must require 15 linked creates after the first pass and still exactly 15 after the second pass.
Also assert the fake call log contains no `views.delete`, `blocks.delete`, `pages.update`, or Quote ID property write.

- [ ] **Step 2: Run the creation test and verify RED**

Run: `node --test test/createLinkedViews.test.js test/idempotency.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/createLinkedViews.js`.

- [ ] **Step 3: Implement minimal creation helpers**

Create `src/createLinkedViews.js` exporting `createLinkedViews`. Implement:

```js
function plainText(block) {
  return (block[block.type]?.rich_text ?? []).map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

async function directChildren(client, pageId) {
  const results = [];
  let start_cursor;
  do {
    const page = await withReadRetry(() => client.blocks.children.list({
      block_id: pageId, page_size: 100, ...(start_cursor ? { start_cursor } : {}),
    }));
    results.push(...page.results);
    start_cursor = page.has_more ? page.next_cursor : undefined;
  } while (start_cursor);
  return results;
}

function propertyConfiguration(properties, visibleNames) {
  const visible = new Set(visibleNames);
  const ordered = [
    ...visibleNames.map((name) => [name, properties[name]]),
    ...Object.entries(properties).filter(([name]) => !visible.has(name)),
  ];
  return ordered.map(([name, property]) => {
    if (!property?.id) throw new Error(`Missing property ID for ${name}`);
    return { property_id: property.id, visible: visible.has(name) };
  });
}

function desiredView(definition, dataSource) {
  const configuration = {
    type: definition.type,
    properties: propertyConfiguration(dataSource.properties, definition.visibleProperties),
  };
  if (definition.type === "board") {
    const group = dataSource.properties[definition.groupBy.property];
    configuration.group_by = {
      type: definition.groupBy.type,
      property_id: group.id,
      group_by: definition.groupBy.groupBy,
      sort: { type: "manual" },
      hide_empty_groups: true,
    };
  }
  return {
    name: definition.name,
    type: definition.type,
    ...(definition.filter ? { filter: definition.filter } : {}),
    ...(definition.sorts ? { sorts: definition.sorts } : {}),
    configuration,
  };
}
```

For each definition, require exactly one matching direct `heading_2`, retrieve the source data source, call `views.create` with `create_database`, persist safe IDs immediately, and count the result as created. Wrap each definition independently so errors become manual actions.

The initial creation loop is:

```js
export async function createLinkedViews({ client, schema, state, persist = async () => {} }) {
  state.linkedViews ??= {};
  const result = { created: 0, reused: 0, manualActions: [] };
  for (const definition of schema.linkedViews ?? []) {
    try {
      const targetPageId = state.pages?.[definition.pageKey];
      const source = state.databases?.[definition.databaseKey];
      if (!targetPageId || !source?.dataSourceId) throw new Error("required page or data source ID is unavailable");
      const headings = (await directChildren(client, targetPageId))
        .filter((block) => block.type === "heading_2" && plainText(block) === definition.heading);
      if (headings.length !== 1) {
        result.manualActions.push(`${definition.name}: expected exactly one heading "${definition.heading}"; nothing was appended.`);
        continue;
      }
      const dataSource = await withReadRetry(() => client.dataSources.retrieve({ data_source_id: source.dataSourceId }));
      const desired = desiredView(definition, dataSource);
      const created = await runWrite(() => client.views.create({
        create_database: {
          parent: { type: "page_id", page_id: targetPageId },
          position: { type: "after_block", block_id: headings[0].id },
        },
        data_source_id: source.dataSourceId,
        ...desired,
      }));
      state.linkedViews[definition.key] = {
        viewId: created.id,
        linkedDatabaseId: created.parent.database_id,
        targetPageId,
        dataSourceId: source.dataSourceId,
      };
      await persist(state);
      result.created += 1;
    } catch (error) {
      result.manualActions.push(`${definition.name}: linked view requires manual setup (${error.code ?? error.status ?? "API error"}).`);
    }
  }
  return result;
}
```

- [ ] **Step 4: Add and pass the board configuration test**

Add a RED test that expects `type: "board"` and `group_by.property_id` resolved from `Project Stage`, run it to observe failure, then extend `desiredView` with the board branch shown above.

Run: `node --test test/createLinkedViews.test.js test/idempotency.test.js`

Expected: PASS for table and board creation.

- [ ] **Step 5: Commit linked-view creation**

```powershell
git add src/createLinkedViews.js test/createLinkedViews.test.js test/idempotency.test.js
git commit -m "feat: create linked dashboard views"
```

---

### Task 4: Add idempotent discovery, adoption, reconciliation, and conflict reporting

**Files:**
- Modify: `src/createLinkedViews.js`
- Modify: `test/createLinkedViews.test.js`

- [ ] **Step 1: Write RED tests for builder-managed reuse and update**

Add two tests:

1. A state-tracked live view whose managed configuration matches causes zero `views.create` and zero `views.update` calls and increments `reused`.
2. A state-tracked live view with an outdated filter causes one `views.update`, zero `views.create`, preserves its IDs, and increments `reused`.

Run: `node --test test/createLinkedViews.test.js`

Expected: FAIL because state is not consulted.

- [ ] **Step 2: Implement tracked-view reconciliation**

Add safe retrieval helpers returning `null` only for 404/object-not-found. Confirm a tracked view's `data_source_id`, parent linked database, and linked database parent page. Compare only managed fields using normalized JSON:

```js
function managedShape(view) {
  return {
    name: view.name,
    type: view.type,
    filter: view.filter ?? null,
    sorts: view.sorts ?? [],
    configuration: {
      type: view.configuration?.type,
      properties: (view.configuration?.properties ?? []).map(({ property_id, visible }) => ({ property_id, visible })),
      ...(view.type === "board" ? { group_by: view.configuration?.group_by ?? null } : {}),
    },
  };
}

const matchesManagedShape = (view, desired) =>
  JSON.stringify(managedShape(view)) === JSON.stringify(managedShape(desired));
```

If the tracked view differs, call `runWrite(() => client.views.update({ view_id, ...desired }))`. Never call delete.

- [ ] **Step 3: Write RED tests for manual adoption and conflicts**

Add tests asserting:

- one untracked same-name view on the exact target page/data source with matching managed configuration is adopted and persisted without create/update;
- one conflicting same-name manual view produces a manual action containing the view and page names, with zero create/update calls;
- two same-name candidates produce an ambiguity manual action, with zero create/update calls;
- a same-name view on another page is ignored and the correct linked view is created on the target page.

Run the tests and confirm they fail because discovery is absent.

- [ ] **Step 4: Implement discovery and non-overwrite rules**

List by `data_source_id`, retrieve every reference, retrieve each candidate's `parent.database_id`, and keep only candidates whose parent database has `parent.page_id === targetPageId` and whose name exactly matches. Apply these outcomes:

```js
if (matches.length > 1) return manual(`Multiple linked views named "${definition.name}" exist on ${page.title}.`);
if (matches.length === 1 && !matchesManagedShape(matches[0].view, desired)) {
  return manual(`Manual linked view "${definition.name}" conflicts on ${page.title}; it was not changed.`);
}
if (matches.length === 1) {
  state.linkedViews[definition.key] = safeIds(matches[0]);
  await persist(state);
  return reused();
}
```

Only state-tracked builder-managed views may be updated.

- [ ] **Step 5: Write RED tests for missing/ambiguous headings and API errors**

Assert that missing headings, duplicate headings, create failures, and update failures each add a manual action, create no fallback block, and allow later definitions to continue.

- [ ] **Step 6: Implement best-effort per-definition error handling**

Before any discovery or creation, require exactly one heading. For zero or multiple headings, append a precise manual action and continue. Catch API errors around each definition and append:

```js
`${definition.name}: linked view requires manual setup (${error.code ?? error.status ?? "API error"}).`
```

Do not catch schema/programming errors before they have been converted into a definition-specific manual action.

- [ ] **Step 7: Run all linked-view tests**

Run: `node --test test/createLinkedViews.test.js test/createViews.test.js`

Expected: PASS; native view tests remain unchanged.

- [ ] **Step 8: Commit reconciliation and conflicts**

```powershell
git add src/createLinkedViews.js test/createLinkedViews.test.js
git commit -m "feat: reconcile dashboard linked views safely"
```

---

### Task 5: Sanitize state and wire orchestration/dry-run

**Files:**
- Modify: `src/stateStore.js`
- Modify: `src/index.js`
- Modify: `test/stateStore.test.js`
- Modify: `test/orchestration.test.js`
- Modify: `test/dryRun.test.js`

- [ ] **Step 1: Write the failing state-sanitization test**

Extend the state test input with:

```js
linkedViews: {
  approval: {
    viewId: "view",
    linkedDatabaseId: "linked-db",
    targetPageId: "page",
    dataSourceId: "ds",
    customerName: "must-not-persist",
    filter: { businessData: "must-not-persist" },
  },
},
```

Expect only the four ID fields after load and assert the raw file contains neither forbidden string.

Run: `node --test test/stateStore.test.js`

Expected: FAIL because `linkedViews` is currently dropped entirely.

- [ ] **Step 2: Implement strict linked-view state sanitization**

Add `linkedViews` to allowed state and sanitize each entry:

```js
const LINKED_VIEW_ID_KEYS = ["viewId", "linkedDatabaseId", "targetPageId", "dataSourceId"];

function sanitizeLinkedViews(entries = {}) {
  return Object.fromEntries(Object.entries(entries).map(([key, value]) => [
    key,
    Object.fromEntries(LINKED_VIEW_ID_KEYS
      .filter((idKey) => typeof value?.[idKey] === "string")
      .map((idKey) => [idKey, value[idKey]])),
  ]));
}
```

Have `sanitizeState` use this function only for `linkedViews`; preserve existing page/database/seed handling.

- [ ] **Step 3: Write failing orchestration tests**

Change expected setup order to:

```js
["validate", "pages", "databases", "relations", "views", "linkedViews", "docs", "seed", "report"]
```

Add a test where `linkedViews` returns `manualActions: ["linked manual"]` and assert setup still reaches `docs` and the final summary contains the manual action.

- [ ] **Step 4: Write the failing dry-run tests**

Assert:

```js
assert.equal(first.views, 4);
assert.equal(first.linkedViews, 15);
assert.equal(first.networkCalls, 0);
assert.equal(first.filesystemWrites, 0);
assert.equal(first.actions.filter(({ id }) => id.startsWith("dryrun:linked-view:")).length, 15);
assert.equal(first.seedRecords, 0);
```

Run: `node --test test/orchestration.test.js test/dryRun.test.js`

Expected: FAIL because the new phase/count/actions do not exist.

- [ ] **Step 5: Wire state, setup, and dry-run**

In `src/index.js`:

```js
import { createLinkedViews } from "./createLinkedViews.js";
```

Add `linkedViews: schema.linkedViews.length` and linked-view actions to `createDryRunPlan`. Insert `linkedViews` after native `views` in the setup phase list. Add `linkedViews: () => createLinkedViews(context)` to actions. Initialize `linkedViews: {}` in `freshState`.

- [ ] **Step 6: Run state/orchestration/dry-run tests**

Run: `node --test test/stateStore.test.js test/orchestration.test.js test/dryRun.test.js`

Expected: PASS.

- [ ] **Step 7: Commit orchestration and sanitized state**

```powershell
git add src/stateStore.js src/index.js test/stateStore.test.js test/orchestration.test.js test/dryRun.test.js
git commit -m "feat: orchestrate linked views with safe state"
```

---

### Task 6: Verify whole-builder idempotency and Quote ID safety

**Files:**
- No production or test changes expected; the tests were introduced RED-first in Tasks 1 and 3.

- [ ] **Step 1: Run idempotency and Quote ID safety tests**

Run: `node --test test/idempotency.test.js test/quoteRules.test.js test/schemaRegistry.test.js`

Expected: PASS with 15 total linked creates after two full runs and unchanged Quote ID safeguards.

- [ ] **Step 2: Inspect production source for destructive view operations**

Run:

```powershell
rg -n "views\.delete|blocks\.delete|pages\.update" src/createLinkedViews.js
```

Expected: no matches. The executable call-log assertion was added RED-first to `test/idempotency.test.js` in Task 3.

- [ ] **Step 3: Record the verification in the next feature commit**

No standalone commit is required because the executable regression tests are committed in Tasks 1 and 3. Do not create an empty commit.

---

### Task 7: Update operator documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/setup-guide.md`
- Modify: `docs/manual-dashboard-guide.md`
- Modify: `test/documentation.test.js`

- [ ] **Step 1: Write failing documentation assertions**

Extend `test/documentation.test.js` to require these phrases across the three operator documents:

```js
for (const phrase of [
  "15 automated linked views",
  "Quotation Centre",
  "Boss Dashboard",
  "conflicting manual view",
  "not changed",
  "column widths",
  "visual verification",
  "npm run setup",
]) assert.ok(operatorDocs.includes(phrase), phrase);
```

Run: `node --test test/documentation.test.js`

Expected: FAIL because automation and conflict behavior are not yet documented.

- [ ] **Step 2: Update README and guides**

Document:

- the five automated Quotation Centre views and ten automated Boss Dashboard views;
- the four existing native views remaining in place;
- matching manual views are adopted only when their managed configuration matches;
- conflicting or ambiguous manual views are not changed or duplicated and appear in `manualActions`;
- missing/ambiguous headings never trigger unsafe append behavior;
- filters, sorts, visible properties, and Project Stage board grouping are automated;
- column widths, dashboard columns, spacing, block heights, and aesthetics still need visual verification;
- verification steps: run setup, inspect JSON summary, open both pages, count views, inspect filters/sorts/properties, rerun setup, and confirm no duplicates;
- setup is safe for the test workspace only until production is separately approved;
- seed remains a separate command and must not be run for this verification.

- [ ] **Step 3: Run documentation tests**

Run: `node --test test/documentation.test.js`

Expected: PASS.

- [ ] **Step 4: Commit documentation**

```powershell
git add README.md docs/setup-guide.md docs/manual-dashboard-guide.md test/documentation.test.js
git commit -m "docs: explain automated dashboard views"
```

---

### Task 8: Complete preflight verification and stop before live setup

**Files:**
- No production changes expected.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all tests pass with zero failures. Record the exact test count.

- [ ] **Step 2: Run credential-free dry-run**

Run: `npm run dry-run`

Expected:

- `pages: 13`
- `databases: 13`
- `views: 4`
- `linkedViews: 15`
- `documentationPages: 11`
- `seedRecords: 0`
- `networkCalls: 0`
- `filesystemWrites: 0`

- [ ] **Step 3: Verify CSV reproducibility without changing tracked output**

Run: `npm run csv`

Then run: `git status --short`

Expected: CSV generation succeeds and no CSV file is modified.

- [ ] **Step 4: Run repository hygiene checks**

Run:

```powershell
git diff --check
git status --short
git grep -n -E "<token-or-notion-secret-pattern>" -- . ":(exclude)package-lock.json"
git check-ignore -v .env generated/notion-state.json .worktrees/
```

Expected: no whitespace errors, no uncommitted implementation changes after final commits, no token values, and all runtime-secret/state/worktree paths ignored.

- [ ] **Step 5: Produce the required pre-setup report and stop**

Report to the user before any live command:

1. exact changed files and commits;
2. exact test count and pass/fail result;
3. complete dry-run summary including 4 native and 15 linked views;
4. API limitations: final visual layout, widths, spacing, height, and aesthetics still need manual review;
5. confirmation that no seed, real data, production setup, Quote ID automation, deletion, or silent manual-view overwrite occurred.

Do **not** run `npm run setup` in this task. Wait for explicit confirmation. If later approved, run it only from the existing test workspace/state and never from production credentials.

---

## Plan Self-Review

- Every approved view, filter, sort, visible-property set, and board group is covered in Task 1 and exercised in Tasks 3-4.
- ID-only state is enforced in Task 5.
- Missing headings, ambiguity, conflicts, and API failures are non-fatal manual actions in Task 4.
- Full rerun idempotency and no duplicate views are tested in Task 6.
- Dry-run stays credential/network/filesystem free in Tasks 5 and 8.
- Quote ID safety is explicitly re-tested in Task 6.
- Documentation and manual visual limitations are covered in Task 7.
- The plan stops before `npm run setup`, never runs seed, and never targets the production workspace.
