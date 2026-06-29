# Double K Notion OS v1 Builder

This Node.js project creates the quote-centered foundation of Double K OS beneath an existing Notion parent page. It creates pages, 13 databases/data sources, relations, best-effort simple database views, documentation, optional fictional sample data, and Excel-friendly CSV templates. It never deletes Notion data and never generates Double K quotation numbers.

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
NOTION_TOKEN=your_internal_integration_secret
NOTION_PARENT_PAGE_ID=your_parent_page_id
```

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
- `npm run setup` creates or reuses pages, databases/data sources, relations, optional simple views, and documentation.
- `npm run seed` adds fictional Malaysian contractor examples. People fields remain empty.
- `npm run csv` regenerates the 13 UTF-8-BOM/CRLF templates in `csv_templates/`.
- `npm run docs` creates or reuses documentation pages.

Created IDs are stored in ignored file `generated/notion-state.json`. It contains page IDs, database IDs, data-source IDs, and sample seed mappings only. It never stores `NOTION_TOKEN`.

## Quote ID and Excel safety

Quote ID stays manually editable and follows Double K's existing quotation numbering process. The builder does not infer, increment, normalize for display, replace, or generate quotation numbers. Old Excel data goes into **Excel Import Staging** only. Staff preserve Original Quote Number exactly, flag missing or duplicate IDs, and manually review before creating final Customers, Sites, or Quotations.

## Manual Notion work

The builder creates dashboard headings and database links. Configure embedded linked database views, detailed filters, boards, calendars, groups, and layouts in the Notion UI using `docs/manual-dashboard-guide.md`. Assign Boss, Manager, Admin/Office staff, PIC, Prepared By, Approved By, and Technician / Staff after setup.

The current API supports simple database-native view creation; the builder treats it as best effort. A view error does not block the core operating system.

## Known Notion API limitations

- Embedded linked database views and polished dashboard layouts are safer to configure manually.
- Workspace people cannot be guessed safely.
- User-edited page content is not overwritten without a builder marker.
- A network failure after a create request has an ambiguous outcome, so writes are not blindly retried. Re-run setup to recover through state and discovery.
- Files cannot be sourced from private local paths without a separate upload flow.

This is not accounting, inventory, payroll, a technician mobile app, or WhatsApp automation.
