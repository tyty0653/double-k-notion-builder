# Setup Guide

1. Create a Notion integration and keep its token in `.env` as `NOTION_TOKEN`.
2. Copy the Double K OS parent ID into `NOTION_PARENT_PAGE_ID`.
3. Share the parent page with the integration through Notion Connections.
4. Run `npm install`, `npm test`, and `npm run dry-run`.
5. Run `npm run setup` and inspect the JSON report. It creates four native views and 15 automated linked views across Quotation Centre and Boss Dashboard.
6. If `manualActions` reports a missing or ambiguous heading or a conflicting manual view, inspect it in Notion. The builder leaves it not changed and never appends a view somewhere unsafe.
7. Perform visual verification: confirm all linked views, filters, sorts, visible properties, Project Stage grouping, column widths, spacing, and block heights.
8. Assign Boss, Manager, Admin/Office staff, PIC, Prepared By, Approved By, and Technician / Staff manually.
9. `npm run seed` is separate and optional; do not use it for an empty production setup.

Do not share `.env` or commit generated state. Re-running setup is non-destructive and reuses builder-managed view IDs.
