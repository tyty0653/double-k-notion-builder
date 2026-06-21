# Double K Notion OS v1 Builder Design Specification

**Status:** Approved design, awaiting written-spec review

**Date:** 2026-06-21

**Target runtime:** Node.js 18 or newer

**Notion SDK:** `@notionhq/client` 5.22.0

**Notion API version:** `2026-03-11`

## 1. Purpose and Scope

This project builds the foundation of Double K OS v1 beneath a user-provided Notion parent page. It is a quote-centered operating system for an air-conditioning and engineering contractor with Retail and Project departments.

The builder creates pages, databases and data sources, database relations, documentation pages, CSV templates, and optional sample records. It supports safe re-runs, a no-write dry-run mode, and a generated local state file that records created Notion object IDs.

The central business flow is:

`Customer -> Site / Location -> Quotation -> Quote Items -> Boss Approval -> Final Quote Sent -> Retail Job or Project -> Payment -> Service History / Project Record`

Quote ID is the primary human-readable reference. The builder must never generate, infer, renumber, or replace Double K quotation numbers.

### Included in v1

- Customer and site records
- Service and price-list records
- Retail and project quotations
- Quote line items and discount records
- Boss approval workflow support
- Retail jobs and project tracking
- Project documents and variation orders
- Simple payment tracking
- SOPs, templates, and internal guides
- Excel-import staging and review flags
- AI-ready knowledge and safety-rule fields
- Dashboard page shells and manual linked-view instructions
- CSV templates and realistic fictional sample data

### Explicitly excluded from v1

- Full accounting
- Inventory
- Payroll
- Technician mobile application
- WhatsApp integration or automation
- Automatic final-quotation sending
- Automatic quotation-number generation
- Deletion or destructive migration of existing Notion data

## 2. Architecture Decision

The implementation uses a readable JavaScript schema registry as its single source of truth. The registry contains plain objects for page definitions, database definitions, properties, relations, dashboard sections, CSV columns, documentation sources, and sample seed records.

The schema registry is declarative but deliberately modest. It does not introduce a custom schema language, plugin framework, code generator, inheritance hierarchy, or YAML parsing layer. A developer updates normal JavaScript arrays and objects with descriptive helper constructors such as `selectProperty(options)` and `relationProperty(targetKey)`.

Focused modules consume the registry:

- Page creation consumes page and dashboard definitions.
- Database creation creates each Notion database and its initial data source with non-relation properties.
- Relation creation updates data sources after every target data source exists.
- Documentation creation publishes local Markdown guides as readable Notion pages.
- CSV generation creates Excel-friendly templates locally.
- Sample seeding creates related fictional records using stable seed keys.
- Orchestration runs these phases in a fixed, testable order.

## 3. Folder Structure

```text
double-k-notion-builder/
|-- .env.example
|-- .gitignore
|-- README.md
|-- package.json
|-- src/
|   |-- index.js
|   |-- notionClient.js
|   |-- schemaRegistry.js
|   |-- createPages.js
|   |-- createDatabases.js
|   |-- createRelations.js
|   |-- createDocumentation.js
|   |-- seedSampleData.js
|   |-- generateCsvTemplates.js
|   |-- stateStore.js
|   |-- quoteRules.js
|   |-- aiSafetyRules.js
|   `-- utils.js
|-- test/
|   |-- schemaRegistry.test.js
|   |-- orchestration.test.js
|   |-- idempotency.test.js
|   |-- dryRun.test.js
|   |-- quoteRules.test.js
|   |-- aiSafetyRules.test.js
|   |-- csvTemplates.test.js
|   `-- helpers/
|       `-- fakeNotionClient.js
|-- docs/
|   |-- superpowers/
|   |   |-- specs/
|   |   |   `-- 2026-06-21-double-k-notion-os-design.md
|   |   `-- plans/
|   |       `-- 2026-06-21-double-k-notion-os.md
|   |-- schema.md
|   |-- setup-guide.md
|   |-- manual-dashboard-guide.md
|   |-- retail-sop.md
|   |-- project-sop.md
|   |-- boss-approval-sop.md
|   |-- excel-import-guide.md
|   |-- ai-future-guide.md
|   |-- user-role-guide.md
|   |-- data-entry-standard-guide.md
|   `-- quote-id-naming-guide.md
|-- csv_templates/
|   |-- customers.csv
|   |-- sites.csv
|   |-- services_price_list.csv
|   |-- quotations.csv
|   |-- quote_items.csv
|   |-- retail_jobs.csv
|   |-- projects.csv
|   |-- project_documents.csv
|   |-- variation_orders.csv
|   |-- payments.csv
|   |-- sop_templates.csv
|   |-- ai_knowledge_base.csv
|   `-- excel_import_staging.csv
`-- generated/
    `-- notion-state.json
```

`generated/notion-state.json` is runtime output and is ignored by Git. The `generated/` directory may be absent before the first real setup run.

## 4. Schema Registry Design

`src/schemaRegistry.js` exports stable keys rather than Notion IDs. A representative shape is:

```js
export const systemSchema = {
  version: 1,
  root: { key: "doubleKOs", title: "Double K OS" },
  pages: [
    { key: "bossDashboard", title: "Boss Dashboard", sections: [] },
  ],
  databases: [
    {
      key: "customers",
      title: "Customers",
      parentPageKey: "customerCrm",
      purpose: "Store customer and company information.",
      properties: {
        "Customer Name": { type: "title" },
        "Customer Type": {
          type: "select",
          options: ["Individual", "Company", "Contractor", "Management", "Other"],
        },
        "Related Sites": { type: "relation", target: "sites" },
      },
    },
  ],
  csvTemplates: [],
  seeds: {},
};
```

Registry rules:

1. `key` values are immutable machine identifiers used in state and tests.
2. `title` values are editable Notion-facing labels.
3. Every database has exactly one title property.
4. Relation definitions name a target registry key, never a hardcoded Notion ID.
5. Relation properties are excluded from initial database creation and applied in the relation phase.
6. Select and multi-select options are literal arrays kept adjacent to their property.
7. Formula expressions are stored with the formula property.
8. No token, environment variable value, or secret appears in the registry.
9. CSV definitions reuse database property names where practical but may add import-only helper columns such as `Seed Key`.
10. Sample data refers to related records by stable seed keys, not created page IDs.

## 5. Main Page List

The builder creates or reuses these child pages beneath the page identified by `NOTION_PARENT_PAGE_ID`:

1. Boss Dashboard
2. Retail Dashboard
3. Project Dashboard
4. Quotation Centre
5. Customer CRM
6. Service & Price List
7. Retail Jobs
8. Project Management
9. Payments
10. SOP & Templates
11. AI Knowledge Base
12. Excel Import Staging
13. Setup & User Guide

The provided parent is treated as the Double K OS root. The builder does not rename it and does not create a second wrapper page.

## 6. Database and Property Specification

All databases include the purpose stated below. `Created Date` and `Last Edited` use Notion-managed timestamps.

### A. Customers (`customers`)

Purpose: Store customer and company information.

| Property | Type | Configuration |
|---|---|---|
| Customer Name | title | Primary title |
| Customer Type | select | Individual, Company, Contractor, Management, Other |
| Phone / WhatsApp | phone_number | Customer contact number |
| Email | email | Customer email |
| Company Name | rich_text | Company or trading name |
| Source | select | Walk-in, WhatsApp, Facebook, Instagram, Referral, Existing Customer, Website, Other |
| Department | multi_select | Retail, Project, Both |
| Status | select | New, Active, Inactive, Blacklist |
| PIC | people | Internal owner |
| Notes | rich_text | Internal notes |
| Related Sites | relation | Sites |
| Related Quotations | relation | Quotations |
| Related Jobs | relation | Retail Jobs |
| Related Projects | relation | Projects |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### B. Sites / Locations (`sites`)

Purpose: Store service locations because one customer may have multiple sites.

| Property | Type | Configuration |
|---|---|---|
| Site Name | title | Primary title |
| Customer | relation | Customers |
| Address | rich_text | Full address |
| Area | select | JB, Skudai, Kulai, Senai, Tampoi, Masai, Pasir Gudang, Ulu Tiram, Other |
| Property Type | select | House, Condo, Shop, Office, Factory, Site, Other |
| Access Notes | rich_text | Entry details |
| Parking / Guardhouse Notes | rich_text | Arrival details |
| Aircond Count | number | Whole-number count |
| Site Photos | files | Photos |
| Related Quotations | relation | Quotations |
| Related Retail Jobs | relation | Retail Jobs |
| Related Projects | relation | Projects |
| Notes | rich_text | Internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### C. Services & Price List (`services`)

Purpose: Store services, fixed prices, price rules, and AI-ready controls.

| Property | Type | Configuration |
|---|---|---|
| Service Name | title | Primary title |
| Department | select | Retail, Project, Both |
| Category | select | Cleaning, Chemical Wash, Installation, Dismantle, Relocation, Repair, Inspection, Maintenance, Project, Other |
| Base Price | number | Malaysian Ringgit |
| Min Price | number | Malaysian Ringgit |
| Price Type | select | Fixed, Variable, Site Visit Required, Project Costing Required |
| Unit | select | Per Unit, Per Job, Per Project, Per Visit, Per Month, Other |
| Active | checkbox | Availability |
| Need Boss Approval | checkbox | Approval rule |
| AI Quotable | checkbox | Future draft eligibility |
| AI Can Send Final Quote | checkbox | Future final-send eligibility gate |
| Max Auto Quote Amount | number | Malaysian Ringgit ceiling |
| Required Questions | rich_text | Intake requirements |
| AI Handover Rule | rich_text | Future handover rule |
| Customer Description | rich_text | Customer-facing explanation |
| Internal Notes | rich_text | Internal pricing notes |
| Related Quote Items | relation | Quote Items |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### D. Quotations (`quotations`)

Purpose: Main quote-centered table for Retail and Project work.

| Property | Type | Configuration |
|---|---|---|
| Quote ID | title | Double K official existing number; manually editable; never generated |
| Original Quote ID | rich_text | Original Excel quote number |
| Quote Type | select | Retail, Project |
| Customer | relation | Customers |
| Site | relation | Sites |
| Status | select | Draft, Waiting Info, Manager Check, Need Boss Approval, Boss Approved, Sent, Follow Up, Accepted, Rejected, Expired, Cancelled |
| Quote Date | date | Quote date |
| Valid Until | date | Expiry date |
| PIC | people | Internal owner |
| Prepared By | people | Staff preparer |
| Approved By | people | Final boss approver |
| Approval Status | select | Not Submitted, Pending Boss Approval, Approved, Rejected, Revision Needed |
| Quote Version | number | Revision number |
| Source | select | Manual, Excel Import, WhatsApp AI Draft, Other |
| Import Status | select | Not Imported, Raw Import, Needs Cleaning, Cleaned, Imported, Duplicate Quote ID, Missing Quote ID |
| Quote Year | number | Helper only |
| Sequence No. | number | Helper only |
| Duplicate Check Notes | rich_text | Manual-review evidence |
| Created By AI | checkbox | Future draft provenance |
| AI Confidence | number | Future draft confidence |
| Discount Amount | number | Malaysian Ringgit |
| Discount Reason | rich_text | Required when discount exists |
| Requested By | people | Discount requester |
| Final Approved Amount | number | Malaysian Ringgit |
| Rejected Reason | select | Too Expensive, Customer No Reply, Competitor Cheaper, Scope Changed, Customer Postponed, Wrong Enquiry, Out of Service Area, Other |
| Related Quote Items | relation | Quote Items |
| Related Retail Job | relation | Retail Jobs |
| Related Project | relation | Projects |
| Related Payment | relation | Payments |
| Notes | rich_text | Internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### E. Quote Items (`quoteItems`)

Purpose: Store quotation line items.

| Property | Type | Configuration |
|---|---|---|
| Item Name | title | Primary title |
| Quote | relation | Quotations |
| Service | relation | Services & Price List |
| Description | rich_text | Quoted scope |
| Quantity | number | Quantity |
| Unit Price | number | Malaysian Ringgit |
| Discount Amount | number | Malaysian Ringgit |
| Subtotal | formula | `prop("Quantity") * prop("Unit Price") - prop("Discount Amount")` |
| Internal Cost | number | Malaysian Ringgit |
| Costing Notes | rich_text | Internal costing |
| Notes | rich_text | Internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### F. Retail Jobs (`retailJobs`)

Purpose: Track accepted retail quotes and daily jobs.

| Property | Type | Configuration |
|---|---|---|
| Job ID | title | Human-readable job reference |
| Customer | relation | Customers |
| Site | relation | Sites |
| Quote | relation | Quotations |
| Service Type | select | Cleaning, Chemical Wash, Installation, Repair, Inspection, Maintenance, Other |
| Job Status | select | To Schedule, Scheduled, In Progress, Completed, Cancelled, Follow Up Needed |
| Appointment Date | date | Scheduled date/time |
| Technician / Staff | people | Assigned team |
| Payment Status | select | Unpaid, Deposit Paid, Partial Paid, Fully Paid, Overdue |
| Before Photos | files | Before-work photos |
| After Photos | files | After-work photos |
| Completion Notes | rich_text | Completion details |
| Customer Feedback | rich_text | Feedback |
| Next Follow Up Date | date | Follow-up date |
| Related Payment | relation | Payments |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### G. Projects (`projects`)

Purpose: Track engineering and project enquiries through completion and warranty.

| Property | Type | Configuration |
|---|---|---|
| Project Name | title | Primary title |
| Project Code | rich_text | Existing project reference if used |
| Customer | relation | Customers |
| Site | relation | Sites |
| Quote | relation | Quotations |
| Project Stage | select | Enquiry, Site Visit, Costing, Quoted, Negotiation, Confirmed, In Progress, Completed, Warranty, Cancelled |
| Project Value | number | Malaysian Ringgit |
| Start Date | date | Project start |
| Target Completion Date | date | Target completion |
| PIC | people | Internal owner |
| Site Supervisor | people | Site lead |
| Payment Terms | select | Deposit, Progress Claim, Completion Payment, Retention, Other |
| Documents | relation | Project Documents |
| Variation Orders | relation | Variation Orders |
| Payments | relation | Payments |
| Issues / Notes | rich_text | Issues and internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### H. Project Documents (`projectDocuments`)

Purpose: Store BOQ, costing, drawing, PO, DO, invoice, site-photo, and project files.

| Property | Type | Configuration |
|---|---|---|
| Document Name | title | Primary title |
| Project | relation | Projects |
| Document Type | select | BOQ, Costing, Drawing, PO, DO, Invoice, Site Photo, Handover, Contract, Other |
| File | files | Uploaded or external file |
| Status | select | Draft, Submitted, Approved, Rejected, Archived |
| Uploaded By | people | Staff uploader |
| Notes | rich_text | Document notes |
| Date | date | Document date |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### I. Variation Orders (`variationOrders`)

Purpose: Track project scope changes and additional work; every VO requires boss approval.

| Property | Type | Configuration |
|---|---|---|
| VO ID | title | Human-readable variation reference |
| Project | relation | Projects |
| Description | rich_text | Scope change |
| Amount | number | Malaysian Ringgit |
| Status | select | Draft, Need Boss Approval, Sent, Approved, Rejected, Cancelled |
| Approved By | people | Boss approver |
| Approved Date | date | Approval date |
| Related Documents | relation | Project Documents |
| Notes | rich_text | Internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### J. Payments (`payments`)

Purpose: Provide simple operational payment tracking, not accounting.

| Property | Type | Configuration |
|---|---|---|
| Payment Record | title | Primary title |
| Customer | relation | Customers |
| Quote | relation | Quotations |
| Retail Job | relation | Retail Jobs |
| Project | relation | Projects |
| Payment Type | select | Deposit, Partial Payment, Full Payment, Progress Claim, Retention, Refund, Other |
| Amount | number | Malaysian Ringgit |
| Payment Status | select | Unpaid, Deposit Paid, Partial Paid, Fully Paid, Overdue |
| Due Date | date | Due date |
| Paid Date | date | Paid date |
| Payment Method | select | Cash, Bank Transfer, Cheque, Card, Other |
| Proof | files | Payment proof |
| Notes | rich_text | Internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### K. SOP & Templates (`sopTemplates`)

Purpose: Store SOPs, WhatsApp reply templates, approval rules, and internal guides.

| Property | Type | Configuration |
|---|---|---|
| Title | title | Primary title |
| Type | select | SOP, WhatsApp Template, Quote Template, Policy, FAQ, Internal Guide |
| Department | select | Retail, Project, Admin, Boss, AI, All |
| Status | select | Draft, Active, Needs Review, Archived |
| Owner | people | Document owner |
| Last Reviewed | date | Review date |
| Content | rich_text | Record summary; longer material may live in page body |
| Related Service | relation | Services & Price List |
| Notes | rich_text | Internal notes |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### L. AI Knowledge Base (`aiKnowledgeBase`)

Purpose: Prepare structured future WhatsApp AI knowledge without implementing automation.

| Property | Type | Configuration |
|---|---|---|
| Knowledge Title | title | Primary title |
| AI Category | select | FAQ, Service Rule, Price Rule, Handover Rule, Customer Intake Question, Quote Rule, Project Rule |
| Department | select | Retail, Project, Both |
| Related Service | relation | Services & Price List |
| Customer-Facing Answer | rich_text | Approved answer text |
| Internal Rule | rich_text | Internal decision rule |
| Required Questions | rich_text | Required intake questions |
| Handover Trigger | rich_text | Human-handover condition |
| Can AI Answer Directly | checkbox | Future answer permission |
| Can AI Create Quote Draft | checkbox | Future draft permission |
| Can AI Send Final Quote | checkbox | Future restricted final-send permission |
| Need Boss Approval | checkbox | Approval gate |
| Status | select | Draft, Active, Needs Review, Archived |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

### M. Excel Import Staging (`excelImportStaging`)

Purpose: Hold old Excel quote rows during non-destructive cleaning and mapping.

| Property | Type | Configuration |
|---|---|---|
| Import Row ID | title | Stable staging-row reference |
| Original Quote Number | rich_text | Preserved exactly from source Excel |
| Original Customer Name | rich_text | Source value |
| Original Phone | rich_text | Text to preserve leading zeroes |
| Original Date | date | Source date |
| Original Service Description | rich_text | Source description |
| Original Amount | number | Source amount |
| Original Status | rich_text | Source status |
| Mapped Customer | relation | Customers |
| Mapped Site | relation | Sites |
| Mapped Quote | relation | Quotations |
| Quote ID Status | select | Valid, Missing Quote ID, Duplicate Quote ID, Needs Manual Review |
| Import Status | select | Raw, Needs Cleaning, Mapped, Imported, Skipped |
| Cleaning Notes | rich_text | Review notes |
| Source File | files | Original source file |
| Created Date | created_time | Notion managed |
| Last Edited | last_edited_time | Notion managed |

## 7. Relation Map

Relations are created after all database data sources exist. They default to single-property relations unless the current API requires an explicit dual-property configuration. Reciprocal fields listed in the schema remain independently named and are checked during setup verification.

| Source database.property | Target database |
|---|---|
| Customers.Related Sites | Sites |
| Customers.Related Quotations | Quotations |
| Customers.Related Jobs | Retail Jobs |
| Customers.Related Projects | Projects |
| Sites.Customer | Customers |
| Sites.Related Quotations | Quotations |
| Sites.Related Retail Jobs | Retail Jobs |
| Sites.Related Projects | Projects |
| Services & Price List.Related Quote Items | Quote Items |
| Quotations.Customer | Customers |
| Quotations.Site | Sites |
| Quotations.Related Quote Items | Quote Items |
| Quotations.Related Retail Job | Retail Jobs |
| Quotations.Related Project | Projects |
| Quotations.Related Payment | Payments |
| Quote Items.Quote | Quotations |
| Quote Items.Service | Services & Price List |
| Retail Jobs.Customer | Customers |
| Retail Jobs.Site | Sites |
| Retail Jobs.Quote | Quotations |
| Retail Jobs.Related Payment | Payments |
| Projects.Customer | Customers |
| Projects.Site | Sites |
| Projects.Quote | Quotations |
| Projects.Documents | Project Documents |
| Projects.Variation Orders | Variation Orders |
| Projects.Payments | Payments |
| Project Documents.Project | Projects |
| Variation Orders.Project | Projects |
| Variation Orders.Related Documents | Project Documents |
| Payments.Customer | Customers |
| Payments.Quote | Quotations |
| Payments.Retail Job | Retail Jobs |
| Payments.Project | Projects |
| SOP & Templates.Related Service | Services & Price List |
| AI Knowledge Base.Related Service | Services & Price List |
| Excel Import Staging.Mapped Customer | Customers |
| Excel Import Staging.Mapped Site | Sites |
| Excel Import Staging.Mapped Quote | Quotations |

## 8. Dashboard Page Design

The API-created dashboards contain a title, purpose callout, section headings, direct database links, and concise manual filter instructions. They do not pretend to create UI-only linked database views when the API cannot reproduce them reliably.

### Boss Dashboard sections

- Pending Boss Approval Quotes
- Today Retail Jobs
- Active Projects
- Outstanding Payments
- Quotes to Follow Up
- Expiring Quotes
- Recent Accepted Quotes
- Project Stage Overview
- Variation Orders Pending Approval
- Recent Imported Excel Records Needing Review
- Quick links
- Boss approval quick guide

### Retail Dashboard sections

- New Retail Quotes
- Waiting Info
- Need Boss Approval
- Boss Approved but Not Sent
- Sent / Follow Up
- Accepted Quotes to Create Jobs
- Today / Upcoming Jobs
- Completed Jobs Pending Payment
- WhatsApp Templates
- Retail SOP

### Project Dashboard sections

- New Project Enquiries
- Site Visit Required
- Costing in Progress
- Project Quotes Waiting Boss Approval
- Active Projects
- Project Documents
- Variation Orders
- Project Payments / Claims
- Project SOP

### Quotation Centre sections

- All, Retail, and Project quotations
- Need Boss Approval
- Boss Approved
- Sent
- Follow Up
- Accepted
- Rejected
- Expired
- Imported Excel records
- Missing Quote ID
- Duplicate Quote ID

## 9. Orchestration Flow

`src/index.js` parses one command and runs a deterministic phase list:

1. **Validate**
   - Validate Node runtime and supported command.
   - Load `.env` for live commands.
   - Require `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID` for live Notion writes.
   - Validate registry keys, title properties, relation targets, formula references, CSV definitions, and seed references before any write.
2. **Load state**
   - Read `generated/notion-state.json` if present.
   - Reject unsupported state schema versions with a clear recovery instruction; never silently discard state.
3. **Create or reuse pages**
   - Reuse valid IDs in state.
   - When state is missing or stale, search children under the configured parent by exact managed title where the API permits.
   - Create only missing pages.
4. **Create or reuse databases/data sources**
   - Create each database beneath its assigned page with all non-relation properties.
   - Capture both database ID and initial data-source ID returned by the current API.
   - Persist state atomically after each successful creation.
5. **Create relations**
   - Resolve target data-source IDs from state.
   - Add only missing relation properties.
   - Never delete or replace unrelated user-created properties.
6. **Create documentation pages**
   - Convert supported Markdown structures to Notion blocks.
   - Update only builder-managed page content when a safe marker is present; otherwise preserve the page and report a manual action.
7. **Optional seed**
   - Run only for the `seed` command or `setup --seed`.
   - Create records in dependency order and resolve relations through seed keys.
8. **Report**
   - Print created, reused, skipped, and manual-action counts.
   - Print the state-file location and manual dashboard guide location.

Commands and package scripts:

| Script | Behavior |
|---|---|
| `npm run dry-run` | Simulate full setup without network calls or file writes |
| `npm run setup` | Create/reuse pages, databases/data sources, relations, and documentation |
| `npm run seed` | Seed sample data into an already configured system |
| `npm run csv` | Generate local CSV templates |
| `npm run docs` | Create/reuse documentation pages in Notion |
| `npm test` | Run the Node test suite |

## 10. Generated State File

The state file contains identifiers and stable seed mappings only:

```json
{
  "schemaVersion": 1,
  "notionApiVersion": "2026-03-11",
  "parentPageId": "notion-page-id",
  "pages": {
    "bossDashboard": "notion-page-id"
  },
  "databases": {
    "customers": {
      "databaseId": "notion-database-id",
      "dataSourceId": "notion-data-source-id"
    }
  },
  "seeds": {
    "customers": {
      "customer-horizon-facilities": "notion-page-id"
    }
  }
}
```

State constraints:

- The state file must never contain `NOTION_TOKEN`, credentials, environment snapshots, request headers, customer secrets, or source Excel data.
- `parentPageId` prevents accidental reuse against a different parent.
- Writes use a temporary file followed by an atomic rename.
- A failed operation leaves the last valid state intact.
- The file is ignored by Git.
- State does not grant authority to delete any Notion object.

## 11. Idempotency Strategy

Idempotency is practical rather than absolute because users can rename, move, archive, or manually modify Notion objects.

- Prefer state IDs and retrieve the referenced object before reuse.
- If an ID is invalid, search the expected parent for an exact managed title.
- Create only when neither state nor discovery identifies an existing object.
- Compare property names before database updates; add missing properties but never remove extras.
- Apply relation properties only when absent.
- Use stable seed keys stored in state and a visible `[Sample]` marker in sample record notes.
- Never use a quotation number as the sole seed-idempotency key.
- Report ambiguity instead of selecting between multiple exact-title matches.
- Never delete, archive, overwrite, or truncate user data.

## 12. Dry-Run Behavior

Dry-run is a pure planning mode:

- It validates the complete schema registry.
- It does not require `NOTION_TOKEN`.
- It does not construct or call a live Notion client.
- It does not read or write `generated/notion-state.json` as authoritative live state.
- It does not create directories, documentation, or CSV output.
- It prints ordered actions with deterministic symbolic IDs such as `dryrun:database:customers`.
- It reports all pages, databases, properties, relation updates, docs, and optional seed counts.
- It flags registry errors exactly as live mode would.

`npm run dry-run` simulates setup without seed data. `node src/index.js setup --dry-run --seed` may additionally preview sample seeding.

## 13. Quote ID Safeguards

Quote-number behavior is enforced both in code helpers and documentation:

1. `Quote ID` is a Notion title field and remains manually editable.
2. No builder function calculates, increments, prefixes, or generates a Quote ID.
3. New sample quotations use clearly fictional placeholders such as `SAMPLE-EXISTING-QUOTE-001`, documented as samples rather than a recommended format.
4. Excel import preserves the source value byte-for-byte after CSV parsing in `Original Quote Number` and maps it to `Original Quote ID` when a quotation is created.
5. A cleaned import may copy the original value to `Quote ID` only after staff confirms it is the official number.
6. Blank source numbers receive `Missing Quote ID` and require manual review.
7. Repeated normalized source numbers receive `Duplicate Quote ID` and require manual review. Normalization is used only for comparison; the original displayed value is never rewritten.
8. Duplicate detection does not merge, delete, or overwrite records.
9. `Quote Year` and `Sequence No.` are optional helper fields and never replace Quote ID.
10. Final-quote workflows require boss approval in v1 regardless of future AI fields.

## 14. AI Safety Rules

No WhatsApp client, webhook, message sender, scheduled job, AI model call, or automatic quotation delivery is implemented.

The pure safety evaluator is included so future integrations have one documented rule boundary. Future final sending is eligible only when all conditions are true:

- Service `AI Can Send Final Quote` is true.
- Service `Price Type` is `Fixed`.
- Required customer information is complete.
- No discount is requested.
- No site visit is required.
- Quote amount is less than or equal to `Max Auto Quote Amount`.
- Quote type is not `Project`.
- `Need Boss Approval` is false.
- No unclear customer request exists.

If any condition fails, the only permitted outcome is `draft_and_handover`, accompanied by machine-readable reasons. In Double K OS v1, the operational SOP still requires boss approval for every final quote; therefore the builder never calls a send action even if a hypothetical record passes the future evaluator.

## 15. Seed Data Strategy

Seeding is opt-in and uses fictional Malaysian contractor examples with no real personal data.

Target counts:

| Database | Count |
|---|---:|
| Customers | 3 |
| Sites | 3 |
| Services & Price List | 8 |
| Quotations | 5: 3 Retail, 2 Project |
| Quote Items | Enough to demonstrate every quotation |
| Retail Jobs | 2 |
| Projects | 2 |
| Project Documents | 2 |
| Variation Orders | 1 |
| Payments | 3 |
| SOP & Templates | 5 |
| AI Knowledge Base | 5 |

Seed dependency order is services, customers, sites, quotations, quote items, retail jobs, projects, project documents, variation orders, payments, SOP/templates, then AI knowledge.

Each record has a registry-only stable seed key such as `service-wall-normal-cleaning`. Created Notion page IDs are recorded under that key in state. Relation values refer to seed keys and are resolved immediately before page creation. If state points to a missing record, seeding searches for a unique exact sample title plus the `[Sample]` marker; ambiguity is reported for manual review.

People properties are left empty in sample data because the builder cannot safely assume workspace user identities.

## 16. CSV Generation Strategy

`src/generateCsvTemplates.js` derives ordered headers from explicit registry template definitions. Explicit definitions allow friendly import column order and staging-specific columns without coupling CSVs to every Notion-managed property.

Generation rules:

- UTF-8 with BOM (`EF BB BF`) for Excel compatibility and Chinese text.
- RFC 4180-style quoting: values containing commas, quotes, or line breaks are quoted; embedded quotes are doubled.
- CRLF line endings for Excel compatibility.
- Phone columns are documented and represented as text; example values use a leading apostrophe where needed for Excel, while import guidance explains removal/normalization before Notion mapping.
- Relation columns contain human-readable matching keys, not Notion IDs.
- Empty templates contain a header and one clearly labeled example row.
- Existing files are overwritten only by the explicit `csv` command because they are reproducible project artifacts, not business data.

Generated templates:

1. `customers.csv`
2. `sites.csv`
3. `services_price_list.csv`
4. `quotations.csv`
5. `quote_items.csv`
6. `retail_jobs.csv`
7. `projects.csv`
8. `project_documents.csv`
9. `variation_orders.csv`
10. `payments.csv`
11. `sop_templates.csv`
12. `ai_knowledge_base.csv`
13. `excel_import_staging.csv`

## 17. Documentation Strategy

The repository includes these maintained Markdown sources:

- `schema.md`: database purposes, fields, relations, and business flow
- `setup-guide.md`: integration, environment, sharing, and commands
- `manual-dashboard-guide.md`: linked views, filters, sorts, groups, view types, and rollout checks
- `retail-sop.md`: enquiry through job and payment
- `project-sop.md`: enquiry through documents, quote, project, VO, and payment
- `boss-approval-sop.md`: quote and VO review decisions
- `excel-import-guide.md`: non-destructive staging and Quote ID review
- `ai-future-guide.md`: future architecture and strict handover safety
- `user-role-guide.md`: Boss, Manager, and Admin/Office responsibilities
- `data-entry-standard-guide.md`: naming, required fields, deduplication, and clean data
- `quote-id-naming-guide.md`: preservation of the company’s existing sequence

The Setup & User Guide Notion page links to each generated documentation page. Retail, Project, Boss, AI, and import pages also receive contextual links.

## 18. Manual Notion Setup and API Limitations

The builder creates the data model and dashboard shells. The manual guide explains UI work that may not be faithfully reproducible by the current API or may be safer for an administrator to configure visibly:

- Add linked database/data-source views to dashboards.
- Configure filters for statuses, departments, dates, payments, missing IDs, and duplicates.
- Configure sorts and groups.
- Add board, calendar, table, and useful gallery views.
- Confirm relation display names and reciprocal behavior.
- Confirm the Quote Items subtotal formula in the Notion UI.
- Configure people assignments after workspace users are known.
- Review sharing and access permissions by role.
- Clean and map staged Excel rows manually before creating final records.
- Review duplicate and missing quotation IDs.
- Pilot with a small staff group before general rollout.
- Back up the original Excel files and retain staging records.

The builder must report manual steps without treating them as setup failures.

## 19. Error Handling and Safety

- Validate all registry content before live writes.
- Use official SDK error types and surface actionable Notion error codes.
- Let SDK 5.22.0 handle its supported rate-limit and transient retries.
- Persist state after each successful create so partial runs can resume.
- Stop relation creation when a target data-source ID is missing.
- Continue independent documentation or seed records only when doing so cannot corrupt dependencies.
- Summarize partial success and failed keys at command end.
- Never log the token or complete request headers.
- Redact token-like values in unexpected error serialization.
- Never delete or archive Notion objects.

## 20. Testing Strategy

Tests use Node’s built-in `node:test` and `node:assert/strict`. A small in-memory fake implements only the Notion client methods exercised by the builder.

Required coverage:

- Registry contains all 13 databases and required properties/options.
- Every relation target resolves to a registered database.
- Quote ID is a title property with no generator or automatic-number configuration.
- Missing and duplicate imported quote IDs receive the required review statuses.
- AI eligibility returns final-send eligibility only when every strict condition passes.
- v1 orchestration never invokes a sender.
- Orchestration order is validate, pages, databases, relations, docs, optional seed.
- Dry-run makes zero Notion calls and zero filesystem writes.
- Re-running setup reuses known IDs and does not duplicate objects.
- Stale and ambiguous state paths produce explicit manual-review results.
- State serialization excludes secrets and writes only allowed keys.
- CSV templates include a UTF-8 BOM, CRLF records, correct escaping, and required headers.
- Seed counts and relation references match this specification.

Integration with a real Notion workspace is intentionally not part of automated tests because it would mutate user data. README provides a controlled first-run checklist.

## 21. Acceptance Criteria

The design is successfully implemented when:

1. A clean install on Node.js 18+ uses exactly `@notionhq/client` 5.22.0 and API `2026-03-11`.
2. `npm test` passes without live credentials.
3. `npm run dry-run` validates and reports the complete setup without network or filesystem mutation.
4. `npm run setup` creates or safely reuses all pages, databases/data sources, relations, and documentation under the provided parent.
5. `npm run seed` creates the specified fictional sample records without duplicating them on re-run.
6. `npm run csv` produces all 13 BOM-prefixed CSV templates.
7. The generated state contains only the allowed IDs, version metadata, parent ID, and seed mappings.
8. Quote IDs are never generated, replaced, or normalized for display.
9. Excel imports preserve original quote values and flag missing or duplicate IDs.
10. No excluded v1 subsystem or WhatsApp automation exists.
11. Manual dashboard and rollout steps are fully documented.
12. No builder operation deletes existing Notion data.

## 22. Implementation Boundary

This specification authorizes the subsequent implementation plan but not implementation itself. Full implementation begins only after the user reviews and approves this written specification.
