import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateCsvTemplates, serializeCsv } from "../src/generateCsvTemplates.js";
import { systemSchema } from "../src/schemaRegistry.js";

test("CSV serialization is BOM-prefixed, CRLF, and RFC 4180-safe", () => {
  const csv = serializeCsv(["A", "B"], [["comma,value", 'quote"line\nnext']]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("\r\n"));
  assert.ok(csv.includes('"comma,value"'));
  assert.ok(csv.includes('"quote""line\nnext"'));
});

test("all 13 templates are generated with quote and phone safeguards", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "double-k-csv-"));
  await generateCsvTemplates({ schema: systemSchema, outputDirectory: directory });
  const names = (await fs.readdir(directory)).sort();
  assert.equal(names.length, 13);
  assert.ok(names.includes("excel_import_staging.csv"));
  const quotations = await fs.readFile(path.join(directory, "quotations.csv"), "utf8");
  assert.match(quotations, /^﻿Quote ID,Original Quote ID/);
  const staging = await fs.readFile(path.join(directory, "excel_import_staging.csv"), "utf8");
  assert.ok(staging.includes("Original Phone"));
  assert.ok(staging.includes("'0123456789"));
});
