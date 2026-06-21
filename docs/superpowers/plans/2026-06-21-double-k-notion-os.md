# Double K Notion OS v1 Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe, idempotent Node.js builder that creates the quote-centered Double K OS v1 in Notion using SDK 5.22.0 and API 2026-03-11.

**Architecture:** A readable JavaScript schema registry defines pages, databases/data sources, relations, optional simple views, CSV templates, and stable sample records. A phased orchestrator validates first, then creates/reuses pages, databases, relations, best-effort views, documentation, and optional seeds while persisting only allowed IDs in an atomic local state file.

**Tech Stack:** Node.js 18+, ES modules, `@notionhq/client` 5.22.0, `dotenv`, Node built-in test runner and assertions.

---

## File Map

- `package.json`: pinned runtime dependencies and requested npm scripts.
- `.env.example`: names only for `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID`.
- `.gitignore`: ignores secrets, dependencies, and generated state.
- `src/schemaRegistry.js`: plain-object page, schema, relation, view, CSV, and seed definitions.
- `src/utils.js`: property builders, rich-text helpers, CSV escaping, and chunking.
- `src/quoteRules.js`: imported quote-ID classification without display normalization.
- `src/aiSafetyRules.js`: pure future AI eligibility decision; no sender.
- `src/stateStore.js`: allowlisted atomic state load/save.
- `src/requestPolicy.js`: bounded retry helper for idempotent reads only.
- `src/notionClient.js`: explicit API-version client and injectable gateway.
- `src/createPages.js`: idempotent page creation and dashboard content.
- `src/createDatabases.js`: current database plus initial-data-source creation.
- `src/createRelations.js`: post-creation relation updates.
- `src/createViews.js`: non-fatal simple data-source views.
- `src/createDocumentation.js`: Markdown-source documentation pages.
- `src/seedSampleData.js`: stable-key fictional sample data.
- `src/generateCsvTemplates.js`: BOM/CRLF CSV generation.
- `src/index.js`: CLI parsing, validation, fixed orchestration, and reporting.
- `test/helpers/fakeNotionClient.js`: in-memory SDK-shaped fake.
- `test/*.test.js`: behavioral verification by subsystem.
- `docs/*.md`: maintained system and staff guides.
- `csv_templates/*.csv`: generated Excel-friendly templates.

### Task 1: Bootstrap the Node project and CLI contract

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `test/cliContract.test.js`
- Create: `src/index.js`

- [ ] **Step 1: Write the failing package and CLI contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseArgs } from "../src/index.js";

test("package pins the approved SDK and exposes required scripts", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
  assert.equal(pkg.dependencies["@notionhq/client"], "5.22.0");
  for (const script of ["dry-run", "setup", "seed", "csv", "docs", "test"]) {
    assert.ok(pkg.scripts[script], `missing ${script}`);
  }
});

test("CLI parses dry-run and seed without requiring credentials", () => {
  assert.deepEqual(parseArgs(["setup", "--dry-run", "--seed"]), {
    command: "setup",
    dryRun: true,
    seed: true,
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test test/cliContract.test.js`

Expected: FAIL because `package.json` and `src/index.js` do not exist.

- [ ] **Step 3: Add the minimal project and parser**

Use ES modules, Node `>=18`, exact dependency `@notionhq/client: 5.22.0`, current `dotenv`, and scripts:

```json
{
  "name": "double-k-notion-builder",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test",
    "dry-run": "node src/index.js setup --dry-run",
    "setup": "node src/index.js setup",
    "seed": "node src/index.js seed",
    "csv": "node src/index.js csv",
    "docs": "node src/index.js docs"
  },
  "dependencies": {
    "@notionhq/client": "5.22.0",
    "dotenv": "16.6.1"
  }
}
```

`parseArgs()` accepts `setup`, `seed`, `csv`, and `docs`; rejects unknown commands/flags; and does not execute when imported.

- [ ] **Step 4: Install and confirm GREEN**

Run: `npm install && node --test test/cliContract.test.js`

Expected: 2 passing tests.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json .env.example .gitignore src/index.js test/cliContract.test.js
git commit -m "chore: bootstrap Notion builder CLI"
```

### Task 2: Build the schema registry and validation

**Files:**
- Create: `src/utils.js`
- Create: `src/schemaRegistry.js`
- Create: `test/schemaRegistry.test.js`

- [ ] **Step 1: Write failing registry tests**

Tests assert:

```js
assert.equal(systemSchema.databases.length, 13);
assert.deepEqual(systemSchema.databases.map(({ key }) => key), [
  "customers", "sites", "services", "quotations", "quoteItems",
  "retailJobs", "projects", "projectDocuments", "variationOrders",
  "payments", "sopTemplates", "aiKnowledgeBase", "excelImportStaging",
]);
assert.equal(databaseByKey("quotations").properties["Quote ID"].type, "title");
assert.equal(databaseByKey("quotations").properties["Quote ID"].generated, undefined);
assert.equal(validateSchema(systemSchema).length, 0);
```

Also assert all 13 main pages, all specified select options, formula text, 13 CSV definitions, relation targets, unique stable keys, and required seed counts.

- [ ] **Step 2: Run the registry test and confirm RED**

Run: `node --test test/schemaRegistry.test.js`

Expected: FAIL because registry exports are missing.

- [ ] **Step 3: Implement readable property helpers and the complete registry**

Use helpers with this exact style:

```js
export const title = () => ({ type: "title" });
export const richText = () => ({ type: "rich_text" });
export const select = (...options) => ({ type: "select", options });
export const relation = (target) => ({ type: "relation", target });
export const formula = (expression) => ({ type: "formula", expression });
```

Represent every property and option from the approved design directly in `systemSchema`. Add `validateSchema()` checks for duplicate keys, one title per database, valid relation targets, required Quote ID behavior, unique CSV names, and valid seed references.

- [ ] **Step 4: Run registry tests and confirm GREEN**

Run: `node --test test/schemaRegistry.test.js`

Expected: all registry tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/utils.js src/schemaRegistry.js test/schemaRegistry.test.js
git commit -m "feat: define Double K OS schema registry"
```

### Task 3: Enforce quote-ID and AI safety rules

**Files:**
- Create: `src/quoteRules.js`
- Create: `src/aiSafetyRules.js`
- Create: `test/quoteRules.test.js`
- Create: `test/aiSafetyRules.test.js`

- [ ] **Step 1: Write failing quote-import tests**

```js
assert.deepEqual(classifyQuoteIds([" DK-001 ", "DK-001", ""]), [
  { original: " DK-001 ", status: "Duplicate Quote ID" },
  { original: "DK-001", status: "Duplicate Quote ID" },
  { original: "", status: "Missing Quote ID" },
]);
assert.equal(preserveOriginalQuoteNumber(" 001/A "), " 001/A ");
assert.equal(createQuoteId(), undefined);
```

The comparison helper may trim and case-fold only to detect duplicates; returned originals must be unchanged.

- [ ] **Step 2: Write failing future-AI safety tests**

Test the all-true path and one test per rejection reason. The expected success result is:

```js
{
  decision: "eligible_for_future_final_send",
  reasons: [],
  sendsAnything: false,
}
```

Every failed condition returns `decision: "draft_and_handover"` and `sendsAnything: false`.

- [ ] **Step 3: Run both tests and confirm RED**

Run: `node --test test/quoteRules.test.js test/aiSafetyRules.test.js`

Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement pure rules only**

`classifyQuoteIds()` returns manual-review states without writing Notion. `evaluateFutureAiQuote()` checks fixed price, complete intake, no discount, no site visit, amount ceiling, non-Project type, no boss approval, allowed service, and no unclear request. It contains no SDK import and no send function.

- [ ] **Step 5: Run tests and confirm GREEN**

Run: `node --test test/quoteRules.test.js test/aiSafetyRules.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/quoteRules.js src/aiSafetyRules.js test/quoteRules.test.js test/aiSafetyRules.test.js
git commit -m "feat: enforce quote and future AI safety rules"
```

### Task 4: Implement safe state persistence and read retries

**Files:**
- Create: `src/stateStore.js`
- Create: `src/requestPolicy.js`
- Create: `test/stateStore.test.js`
- Create: `test/requestPolicy.test.js`

- [ ] **Step 1: Write failing state tests**

Create a temporary directory and assert `saveState()` writes only `schemaVersion`, `notionApiVersion`, `parentPageId`, `pages`, `databases`, and `seeds`; excludes `NOTION_TOKEN`, `token`, headers, and arbitrary keys; and round-trips through `loadState()`.

- [ ] **Step 2: Write failing retry tests**

Use a function that fails twice with `{ status: 429 }` then succeeds and assert three calls. Assert `{ status: 400 }` is called once. Assert `runWrite()` is called exactly once on a simulated network failure.

- [ ] **Step 3: Run and confirm RED**

Run: `node --test test/stateStore.test.js test/requestPolicy.test.js`

Expected: FAIL because modules are missing.

- [ ] **Step 4: Implement allowlisted atomic state and bounded read retries**

`saveState()` writes JSON to `<path>.tmp` and renames it. `withReadRetry()` retries 429, 500, 502, 503, 504 and named temporary network errors with injectable sleep/random functions. `runWrite()` performs one call and never generically retries.

- [ ] **Step 5: Run and confirm GREEN**

Run: `node --test test/stateStore.test.js test/requestPolicy.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/stateStore.js src/requestPolicy.js test/stateStore.test.js test/requestPolicy.test.js
git commit -m "feat: add safe state and request policies"
```

### Task 5: Create the explicit-version Notion client and fake gateway

**Files:**
- Create: `src/notionClient.js`
- Create: `test/notionClient.test.js`
- Create: `test/helpers/fakeNotionClient.js`

- [ ] **Step 1: Write the failing client test**

Inject a `ClientClass` spy and assert construction with:

```js
{
  auth: "test-token",
  notionVersion: "2026-03-11",
  retry: {
    maxRetries: 3,
    initialRetryDelayMs: 500,
    maxRetryDelayMs: 10000,
  },
}
```

Assert missing token throws without exposing any supplied token text.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test test/notionClient.test.js`

Expected: FAIL because module is missing.

- [ ] **Step 3: Implement the client factory and SDK-shaped fake**

Export `NOTION_API_VERSION = "2026-03-11"` and `createNotionClient({ token, ClientClass = Client })`. The fake records calls for `pages`, `blocks.children`, `databases`, `dataSources`, `views`, and `search` and returns current-object shapes.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node --test test/notionClient.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/notionClient.js test/notionClient.test.js test/helpers/fakeNotionClient.js
git commit -m "feat: configure current Notion API client"
```

### Task 6: Create/reuse pages and databases/data sources

**Files:**
- Create: `src/createPages.js`
- Create: `src/createDatabases.js`
- Create: `test/createPages.test.js`
- Create: `test/createDatabases.test.js`

- [ ] **Step 1: Write failing page idempotency tests**

Assert a known state ID is retrieved and reused; an exact unique child title is reused when state is stale; zero matches creates once; multiple matches return a manual-action error and create nothing. Assert dashboard children contain headings and database-link placeholders.

- [ ] **Step 2: Write failing current database-creation tests**

Assert `databases.create()` receives `parent`, `title`, and `initial_data_source.properties`; relation properties are omitted; the response stores both `databaseId` and `dataSourceId`; and a rerun with valid state creates nothing.

- [ ] **Step 3: Run and confirm RED**

Run: `node --test test/createPages.test.js test/createDatabases.test.js`

Expected: FAIL because creation modules are missing.

- [ ] **Step 4: Implement page and database phases**

Map registry property helpers to current Notion request shapes. Use state first, then safe read discovery, then one write. Persist state after each successful creation. Return `{ created, reused, manualActions }` summaries.

- [ ] **Step 5: Run and confirm GREEN**

Run: `node --test test/createPages.test.js test/createDatabases.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/createPages.js src/createDatabases.js test/createPages.test.js test/createDatabases.test.js
git commit -m "feat: create idempotent pages and databases"
```

### Task 7: Add relations and best-effort simple views

**Files:**
- Create: `src/createRelations.js`
- Create: `src/createViews.js`
- Create: `test/createRelations.test.js`
- Create: `test/createViews.test.js`

- [ ] **Step 1: Write failing relation tests**

Assert all target data-source IDs are resolved before calls, existing same-name relations are skipped, missing relations are added through `dataSources.update()`, and missing targets stop relation writes with a precise error.

- [ ] **Step 2: Write failing non-fatal view tests**

Assert `views.create()` receives `data_source_id`, `database_id`, a registry name, `type: "table"`, filters/sorts, and `position: { type: "end" }`. Force the fake to reject and assert the result contains a manual action without throwing.

- [ ] **Step 3: Run and confirm RED**

Run: `node --test test/createRelations.test.js test/createViews.test.js`

Expected: FAIL because modules are missing.

- [ ] **Step 4: Implement relation updates and conservative views**

Create only registry-defined simple views. Do not create embedded linked views or advanced dashboard widgets. View failures log sanitized details and leave core setup successful.

- [ ] **Step 5: Run and confirm GREEN**

Run: `node --test test/createRelations.test.js test/createViews.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/createRelations.js src/createViews.js test/createRelations.test.js test/createViews.test.js
git commit -m "feat: connect data sources and add optional views"
```

### Task 8: Generate Excel-safe CSV templates

**Files:**
- Create: `src/generateCsvTemplates.js`
- Create: `test/csvTemplates.test.js`
- Generate: `csv_templates/*.csv`

- [ ] **Step 1: Write failing CSV tests**

Generate into a temporary directory and assert 13 exact filenames, bytes start `EF BB BF`, line endings are CRLF, embedded comma/quote/newline escaping is RFC 4180-compatible, `Original Phone` remains textual, and quotation headers include both `Quote ID` and `Original Quote ID`.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test test/csvTemplates.test.js`

Expected: FAIL because generator is missing.

- [ ] **Step 3: Implement and run the generator**

Export pure `serializeCsv()` and filesystem `generateCsvTemplates()`. Write BOM plus headers and one explicitly fictional example row per registry definition. Do not read Excel files or create final Notion records.

- [ ] **Step 4: Confirm GREEN and generate tracked artifacts**

Run: `node --test test/csvTemplates.test.js && npm run csv`

Expected: tests pass and all 13 files exist under `csv_templates/`.

- [ ] **Step 5: Commit**

```powershell
git add src/generateCsvTemplates.js test/csvTemplates.test.js csv_templates
git commit -m "feat: generate Excel-safe CSV templates"
```

### Task 9: Write repository and Notion documentation

**Files:**
- Create: `README.md`
- Create: `docs/schema.md`
- Create: `docs/setup-guide.md`
- Create: `docs/manual-dashboard-guide.md`
- Create: `docs/retail-sop.md`
- Create: `docs/project-sop.md`
- Create: `docs/boss-approval-sop.md`
- Create: `docs/excel-import-guide.md`
- Create: `docs/ai-future-guide.md`
- Create: `docs/user-role-guide.md`
- Create: `docs/data-entry-standard-guide.md`
- Create: `docs/quote-id-naming-guide.md`
- Create: `src/createDocumentation.js`
- Create: `test/documentation.test.js`

- [ ] **Step 1: Write failing documentation coverage tests**

Assert every required file exists and contains its mandated headings/phrases: SDK 5.22.0, API 2026-03-11, integration sharing, all npm commands, linked views, boss approval, exact Quote ID preservation, staging-only import, manual people assignments, no WhatsApp automation, and known API limitations.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test test/documentation.test.js`

Expected: FAIL because guides are absent.

- [ ] **Step 3: Write complete guides and documentation-page conversion**

Create concise operational Markdown. `createDocumentationPages()` converts headings, paragraphs, bullets, numbered steps, callouts, and links into bounded Notion blocks, reuses state IDs, and never replaces a page lacking a builder-managed marker.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node --test test/documentation.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add README.md docs/*.md src/createDocumentation.js test/documentation.test.js
git commit -m "docs: add Double K setup and operating guides"
```

### Task 10: Seed stable fictional sample records

**Files:**
- Create: `src/seedSampleData.js`
- Create: `test/seedSampleData.test.js`

- [ ] **Step 1: Write failing seed tests**

Assert exact target counts, dependency order, related pages resolved by stable keys, state reuse on a second run, all people properties omitted, sample notes contain `[Sample]`, and quotation values are explicitly labeled fictional rather than a Double K numbering recommendation.

- [ ] **Step 2: Run and confirm RED**

Run: `node --test test/seedSampleData.test.js`

Expected: FAIL because the seed module is missing.

- [ ] **Step 3: Implement stable-key seed orchestration**

Create services, customers, sites, quotations, quote items, retail jobs, projects, documents, VO, payments, SOPs, and AI knowledge in dependency order. Save each created page ID immediately. Never seed Excel staging into final records and never populate people fields.

- [ ] **Step 4: Run and confirm GREEN**

Run: `node --test test/seedSampleData.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/seedSampleData.js test/seedSampleData.test.js
git commit -m "feat: seed fictional Double K sample data"
```

### Task 11: Complete phased orchestration and dry-run

**Files:**
- Modify: `src/index.js`
- Create: `test/orchestration.test.js`
- Create: `test/dryRun.test.js`
- Create: `test/idempotency.test.js`

- [ ] **Step 1: Write failing orchestration tests**

Inject phase functions and assert exact order:

```js
[
  "validate", "pages", "databases", "relations", "views", "docs", "seed", "report",
]
```

Assert `seed` is omitted without opt-in and view failure remains in `manualActions` while report succeeds.

- [ ] **Step 2: Write failing dry-run and rerun tests**

Assert dry-run makes zero fake SDK calls, does not create state or output directories, prints deterministic symbolic actions, and can preview seed counts. Run setup twice against the fake and assert create-call counts do not increase on the second run.

- [ ] **Step 3: Run and confirm RED**

Run: `node --test test/orchestration.test.js test/dryRun.test.js test/idempotency.test.js`

Expected: FAIL because orchestration is incomplete.

- [ ] **Step 4: Implement commands and reports**

Load `.env` only for live Notion commands. `csv` remains local. `setup --dry-run` uses a planner with symbolic IDs. `setup` executes all core phases; `docs` executes validation/load/page/docs; `seed` requires valid configured state. Print created/reused/skipped/manual-action totals without secrets.

- [ ] **Step 5: Run and confirm GREEN**

Run: `node --test test/orchestration.test.js test/dryRun.test.js test/idempotency.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/index.js test/orchestration.test.js test/dryRun.test.js test/idempotency.test.js
git commit -m "feat: orchestrate safe idempotent setup"
```

### Task 12: Full verification and handoff

**Files:**
- Modify only if verification finds a tested defect.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: every test passes with zero failures.

- [ ] **Step 2: Verify dry-run without credentials**

Run in a shell with both Notion variables removed: `npm run dry-run`

Expected: exit 0, all phases previewed, zero network calls, no generated state.

- [ ] **Step 3: Regenerate and validate CSV artifacts**

Run: `npm run csv` then `git diff --exit-code -- csv_templates`

Expected: exit 0 and reproducible CSV output.

- [ ] **Step 4: Run repository safety checks**

Run:

```powershell
git diff --check
git grep -n -E 'NOTION_TOKEN\s*=\s*[^<[:space:]]|secret_[A-Za-z0-9]{10,}|ntn_[A-Za-z0-9]{10,}' -- . ':!package-lock.json'
git status --short
```

Expected: no whitespace errors, no committed secret values, and only intended changes.

- [ ] **Step 5: Confirm runtime dependency versions**

Run: `npm ls @notionhq/client dotenv`

Expected: `@notionhq/client@5.22.0` and the package-pinned dotenv version.

- [ ] **Step 6: Commit any final verified corrections**

If verification required a test-first correction, commit only those related files with a descriptive message. Otherwise leave the existing task commits unchanged.
