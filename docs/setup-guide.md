# Setup Guide

1. Create a Notion integration and keep its token in `.env` as `NOTION_TOKEN`.
2. Copy the Double K OS parent ID into `NOTION_PARENT_PAGE_ID`.
3. Share the parent page with the integration through Notion Connections.
4. Run `npm install`, `npm test`, and `npm run dry-run`.
5. Run `npm run setup`, inspect the report, then complete the manual dashboard guide.
6. Assign Boss, Manager, Admin/Office staff, PIC, Prepared By, Approved By, and Technician / Staff manually.
7. Optionally run `npm run seed` in a training workspace or remove sample rows after evaluation.

Do not share `.env` or commit generated state. Re-running setup is non-destructive.
