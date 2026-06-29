# Double K Notion OS v1 Builder

This Node.js project creates the quote-centered foundation of Double K OS beneath an existing Notion parent page. It creates pages, 13 databases/data sources, relations, four database-native views, 15 automated linked views, documentation, optional fictional sample data, and Excel-friendly CSV templates. It never deletes Notion data and never generates Double K quotation numbers.

## Required versions

- Node.js 18 or newer
- `@notionhq/client` 5.22.0
- Notion API `2026-03-11`, explicitly configured in the client

## Create and connect a Notion integration

1. Open Notion's integration settings and create an internal Notion integration.
2. Copy its internal integration secret. This becomes `NOTION_TOKEN` and must remain in `.env` only.
3. Open the parent page named **Double K OS** and copy its ID from the page URL. This becomes `NOTION_PARENT_PAGE_ID`.
4. On the parent page, use **Connections** to share it with the integration. The integration needs permission to insert and update content.
5. Copy `.env.example` to `.env` and fill both values. Never commit `.env`.

```env
NOTION_TOKEN=
NOTION_PARENT_PAGE_ID=
```

Paste the token and parent page ID after the `=` signs only in your local `.env` file.

## Install and run

```powershell
npm install
npm test
npm run dry-run
npm run setup
npm run seed
npm run csv
npm run docs
```

- `npm run dry-run` validates and previews the full setup without credentials, network requests, state writes, or Notion changes.
- `npm run setup` creates or reuses pages, databases/data sources, relations, four native views, linked dashboard views, and documentation.
- `npm run seed` adds fictional Malaysian contractor examples. People fields remain empty.
- `npm run csv` regenerates the 13 UTF-8-BOM/CRLF templates in `csv_templates/`.
- `npm run docs` creates or reuses documentation pages.

Created IDs are stored in ignored file `generated/notion-state.json`. It contains page IDs, database IDs, data-source IDs, linked-view IDs, linked-container IDs, and sample seed mappings only. It never stores `NOTION_TOKEN`, customer data, filters, or business data.

## Quote ID and Excel safety

Quote ID stays manually editable and follows Double K's existing quotation numbering process. The builder does not infer, increment, normalize for display, replace, or generate quotation numbers. Old Excel data goes into **Excel Import Staging** only. Staff preserve Original Quote Number exactly, flag missing or duplicate IDs, and manually review before creating final Customers, Sites, or Quotations.

## Automated dashboard views

The builder creates five filtered linked database views in **Quotation Centre** and ten in **Boss Dashboard**. It automates their filters, sorts, visible properties, and the Project Stage board grouping. Matching manual views are adopted only when their managed configuration matches. A conflicting manual view is not changed or duplicated; setup reports it in `manualActions`.

After `npm run setup`, perform visual verification in Notion. Check view counts, filters, sorts, visible properties, board grouping, column widths, block heights, spacing, and dashboard arrangement. Assign Boss, Manager, Admin/Office staff, PIC, Prepared By, Approved By, and Technician / Staff manually.

Linked views remain best effort. Missing or ambiguous headings, permission failures, and manual conflicts do not block core pages, databases, or relations.

## Known Notion API limitations

- The API creates linked views but cannot guarantee polished column widths, block heights, spacing, or dashboard columns across every Notion client.
- Workspace people cannot be guessed safely.
- User-edited page content is not overwritten without a builder marker.
- A network failure after a create request has an ambiguous outcome, so writes are not blindly retried. Re-run setup to recover through state and discovery.
- Files cannot be sourced from private local paths without a separate upload flow.

This is not accounting, inventory, payroll, a technician mobile app, or WhatsApp automation.
