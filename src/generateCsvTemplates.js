import fs from "node:fs/promises";
import path from "node:path";

function escapeCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsv(headers, rows) {
  const records = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return `\ufeff${records.join("\r\n")}\r\n`;
}

function exampleFor(column, template) {
  const values = {
    "Quote ID": "SAMPLE-EXISTING-QUOTE-001",
    "Original Quote ID": "SAMPLE-ORIGINAL-001",
    "Original Quote Number": "SAMPLE-ORIGINAL-001",
    "Phone / WhatsApp": "'0123456789",
    "Original Phone": "'0123456789",
    "Customer Name": "Sample Customer",
    "Original Customer Name": "Sample Customer",
    "Site Name": "Sample Site",
    "Service Name": "Sample Service",
    "Import Row ID": "SAMPLE-IMPORT-001",
    "Quote ID Status": "Needs Manual Review",
    "Import Status": "Raw",
    Status: "Draft",
    Active: "TRUE",
    Notes: "Example only; replace with reviewed business data.",
  };
  if (values[column] !== undefined) return values[column];
  if (/Name|Title|Record|ID$/.test(column)) return `Sample ${column}`;
  if (/Amount|Price|Quantity|Count|Value/.test(column)) return "0";
  if (/Date|Until/.test(column)) return "2026-01-01";
  if (/Can |Need |Quotable/.test(column)) return "FALSE";
  if (column === template.columns[0]) return `Sample ${template.databaseKey}`;
  return "";
}

export async function generateCsvTemplates({ schema, outputDirectory = "csv_templates" }) {
  await fs.mkdir(outputDirectory, { recursive: true });
  const generated = [];
  for (const template of schema.csvTemplates) {
    const example = template.columns.map((column) => exampleFor(column, template));
    const filename = path.join(outputDirectory, template.filename);
    await fs.writeFile(filename, serializeCsv(template.columns, [example]), "utf8");
    generated.push(filename);
  }
  return generated;
}
