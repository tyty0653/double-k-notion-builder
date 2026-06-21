# Manual Dashboard Setup Guide

The API now creates four database-native views and 15 automated linked views: five in Quotation Centre and ten in Boss Dashboard. Filters, sorts, visible properties, and the Project Stage board grouping are automated.

## Verify automated linked views

1. Run `npm run setup` and inspect `manualActions` in the JSON report.
2. Open Quotation Centre and confirm Retail Quotations, Project Quotations, Need Boss Approval, Boss Approved, and Follow Up.
3. Open Boss Dashboard and confirm all ten operational views, including Project Stage Overview as a board grouped by Project Stage.
4. Open each view's filter, sort, and property menus and compare them with its heading and operating purpose.
5. Run setup a second time and confirm no duplicate linked views appear.

If an exact matching manual view already exists, the builder adopts it. A conflicting manual view is not changed and is not duplicated. Missing or repeated headings also produce a manual action instead of unsafe fallback placement.

## Remaining manual polish

Perform visual verification for column widths, view height, section spacing, dashboard columns, icons, and overall readability. These presentation details can vary between Notion clients and are not guaranteed by the Views API.

Check every relation and the Quote Items formula. Clean Excel Import Staging manually. Pilot with a small staff group, confirm permissions, retain original Excel backups, and then roll out safely.
