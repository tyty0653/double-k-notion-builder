# Automated Dashboard Linked Views Design

## Purpose

Extend the Double K Notion OS builder so `npm run setup` creates the requested linked database views inside the existing Quotation Centre and Boss Dashboard pages. The change preserves the current schema-registry architecture, the four existing database-native views, the existing pages and databases, and every quote and AI safety rule.

The implementation targets `@notionhq/client` 5.22.0 with the explicitly configured Notion API version `2026-03-11`.

## Supported API Surface

Notion API `2026-03-11` supports this design through the Views API:

- `views.create({ create_database: ... })` creates a linked database container on an existing page.
- `create_database.position.after_block` places that container after a direct child heading block.
- View filters support compound `and` and `or` groups, multiple select values, `date.equals: "today"`, and `date.next_week`.
- View configuration accepts visible property IDs.
- Board configuration supports grouping by the Projects `Project Stage` select property.
- Views can be listed, retrieved, and updated for safe idempotency.

The API does not guarantee polished dashboard column layouts, ideal block heights, spacing, or column widths across every Notion client. Those details remain manual verification items.

## Architecture

Add a readable `linkedViews` collection to the central schema registry. Each definition contains:

- stable registry key;
- target dashboard page key and heading text;
- source database key;
- visible view name and layout type;
- filter and sort declarations using schema property names;
- ordered visible property names;
- optional board grouping declaration.

Add a focused `createLinkedViews.js` module. It will resolve page, database, data-source, heading-block, and property IDs before creating or reconciling linked views. The existing `createViews.js` continues managing the four database-native views.

The setup orchestration becomes:

`validate -> pages -> databases -> relations -> views -> linkedViews -> docs -> optional seed -> report`

Seed remains opt-in and will not be run during this feature's development or verification.

## Quotation Centre Views

All five views use the Quotations data source and a table layout. Their visible properties are:

`Quote ID`, `Quote Type`, `Customer`, `Site`, `Status`, `Approval Status`, `Quote Date`, `Valid Until`, `PIC`, `Prepared By`, `Approved By`, and `Final Approved Amount`.

| View | Filter | Sort |
| --- | --- | --- |
| Retail Quotations | `Quote Type = Retail` | `Quote Date` descending |
| Project Quotations | `Quote Type = Project` | `Quote Date` descending |
| Need Boss Approval | `Status = Need Boss Approval` | `Quote Date` ascending |
| Boss Approved | `Status = Boss Approved` | `Last Edited` descending |
| Follow Up | `Status = Follow Up` | `Valid Until` ascending |

## Boss Dashboard Views

| View | Source and layout | Filter | Sort |
| --- | --- | --- | --- |
| Pending Boss Approval Quotes | Quotations table | `Status = Need Boss Approval` | `Quote Date` ascending |
| Today Retail Jobs | Retail Jobs table | `Appointment Date = today` AND `Job Status != Cancelled` | `Appointment Date` ascending |
| Active Projects | Projects table | `Project Stage` is `Confirmed` or `In Progress` | `Target Completion Date` ascending |
| Outstanding Payments | Payments table | `Payment Status` is `Unpaid`, `Deposit Paid`, `Partial Paid`, or `Overdue` | `Due Date` ascending |
| Quotes to Follow Up | Quotations table | `Status = Follow Up` | `Valid Until` ascending |
| Expiring Quotes | Quotations table | `Valid Until` is within the next week AND `Status` is `Sent` or `Follow Up` | `Valid Until` ascending |
| Recent Accepted Quotes | Quotations table | `Status = Accepted` | `Last Edited` descending |
| Project Stage Overview | Projects board | excludes `Completed` and `Cancelled`; grouped by `Project Stage` | `Target Completion Date` ascending |
| Variation Orders Pending Approval | Variation Orders table | `Status = Need Boss Approval` | `Created Date` ascending |
| Recent Imported Excel Records Needing Review | Excel Import Staging table | review-worthy Quote ID status OR raw/unclean import status | `Created Date` descending |

The import-review filter matches any of:

- `Quote ID Status` = `Missing Quote ID`, `Duplicate Quote ID`, or `Needs Manual Review`;
- `Import Status` = `Raw` or `Needs Cleaning`.

Visible properties follow the manual guide's operational intent:

- Approval quotes: Quote ID, Quote Type, Customer, Site, Status, Approval Status, Quote Date, Valid Until, PIC, Prepared By, Approved By, Discount Amount, Requested By, and Final Approved Amount.
- Retail jobs: Job ID, Customer, Site, Service Type, Job Status, Appointment Date, Technician / Staff, and Payment Status.
- Projects: Project Name, Project Code, Customer, Site, Project Stage, Project Value, PIC, and Target Completion Date.
- Payments: Payment Record, Customer, Quote, Retail Job, Project, Payment Type, Amount, Payment Status, Due Date, and Paid Date.
- Follow-up, expiring, and accepted quotes: Quote ID, Quote Type, Customer, Site, Status, Quote Date, Valid Until, PIC, and Final Approved Amount.
- Variation orders: VO ID, Project, Description, Amount, Status, Approved By, and Approved Date.
- Import review: Import Row ID, Original Quote Number, Original Customer Name, Original Date, Original Amount, Quote ID Status, Import Status, and Cleaning Notes.

## Placement

For every definition, list direct children of the target dashboard page and find exactly one `heading_2` block with the configured heading text. Create the linked database container immediately after that heading using `create_database.position.after_block`.

If the heading is missing or ambiguous, do not append the view elsewhere. Report a manual action and continue setup. Existing placeholder instruction paragraphs are never deleted.

## Idempotency and Conflict Handling

Add an allowed `linkedViews` object to `generated/notion-state.json`. Each builder-managed entry may store only:

- `viewId`;
- `linkedDatabaseId`;
- `targetPageId`;
- `dataSourceId`.

No token, environment value, customer data, filter data, or other secret is stored.

For each linked-view definition:

1. If state identifies a live view on the expected page and data source, treat it as builder-managed and reconcile its name, filter, sorts, and configuration with `views.update`.
2. If state is stale, list views for the source data source, retrieve candidates, retrieve each candidate's parent database, and match exact target page plus exact view name.
3. If no candidate exists, create the linked database view and persist its IDs immediately.
4. If exactly one untracked candidate exists and its managed configuration matches, adopt it and persist its IDs.
5. If an untracked candidate has conflicting managed configuration, do not update it and do not create a duplicate. Report a manual action.
6. If multiple candidates match, do not update or create. Report a manual action.

The builder never calls the Views delete endpoint and never trashes a linked database container.

Configuration comparison covers the view name, type, normalized filter, normalized sorts, ordered visible-property IDs, and board grouping. Presentation fields outside the registry remain user-controlled.

## Failure Handling

Linked views are best-effort additions after the core databases and relations exist. A permission error, unsupported workspace condition, missing heading, or conflicting manual view produces a clear `manualActions` entry without failing the core setup.

Reads use the existing transient-read retry policy. Create and update writes are not blindly retried, preserving the current protection against ambiguous duplicate writes.

## Dry Run

Dry-run remains credential-free, network-free, and filesystem-write-free. Its deterministic output adds:

- `linkedViews: 15`;
- one action per linked-view registry key describing a create-or-reuse linked dashboard view.

The existing `views: 4` count remains unchanged for database-native views. Dry-run never creates state or Notion content.

## Testing

Tests will cover:

- all 15 registry declarations and exact target pages, sources, names, filters, sorts, visible properties, and board grouping;
- conversion from property names to Notion property IDs;
- heading-based placement;
- creation and immediate state persistence;
- reuse and update of builder-managed views;
- adoption of matching manual views;
- conflicting manual views producing a manual action without an update or duplicate;
- multiple matches producing a manual action;
- stale-state recovery;
- missing headings and Views API failures remaining non-fatal;
- deterministic dry-run counts and actions;
- complete setup reruns creating no duplicate linked views;
- state sanitization excluding secrets;
- Quote ID remaining a manually editable title with no generator, formula, or automation.

The fake Notion client will model view updates, linked database containers, parent-page discovery, block children, and property IDs closely enough to exercise real orchestration behavior.

## Documentation

Update README, Setup Guide, and Manual Dashboard Setup Guide to identify the 15 automated linked views, explain conflict reporting, list the remaining visual checks, and give beginner-friendly verification steps in Notion.

## Safety and Scope

This feature does not:

- generate, infer, increment, normalize, replace, or automate Quote ID;
- transform staged Excel rows into final quotations;
- run sample seed data;
- use real customer data;
- allow AI to send final quotations;
- add WhatsApp automation, accounting, inventory, payroll, or a technician mobile app;
- delete user-created content or silently overwrite conflicting manual views;
- run against the real company workspace.
