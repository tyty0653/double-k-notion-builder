# Excel Import Guide

Back up every original workbook. Import old rows into **Excel Import Staging**, not into final databases.

1. Preserve Original Quote Number exactly, including spaces, punctuation, and leading zeroes.
2. Preserve Original Phone as text.
3. Mark blank numbers Missing Quote ID.
4. Compare numbers for duplicates without rewriting their display; mark duplicates Duplicate Quote ID.
5. Match or create Customer and Site only after manual review.
6. Map services when the scope is clear.
7. A staff member confirms the original value is the official number before manually copying it into final Quote ID.
8. Keep the staging row and cleaning notes. Do not overwrite or delete source records automatically.

The builder does not convert staged rows into final Customers, Sites, or Quotations in v1.
