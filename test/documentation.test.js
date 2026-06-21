import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { markdownToBlocks } from "../src/createDocumentation.js";

const required = [
  "README.md", "docs/schema.md", "docs/setup-guide.md",
  "docs/manual-dashboard-guide.md", "docs/retail-sop.md",
  "docs/project-sop.md", "docs/boss-approval-sop.md",
  "docs/excel-import-guide.md", "docs/ai-future-guide.md",
  "docs/user-role-guide.md", "docs/data-entry-standard-guide.md",
  "docs/quote-id-naming-guide.md",
];

test("all required documentation sources exist", () => {
  for (const filename of required) assert.ok(fs.existsSync(filename), filename);
});

test("README documents current versions, setup, commands, and limitations", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  for (const phrase of ["5.22.0", "2026-03-11", "NOTION_TOKEN", "NOTION_PARENT_PAGE_ID", "npm run dry-run", "npm run setup", "npm run seed", "npm run csv", "npm run docs", "linked database views", "Notion integration"]) {
    assert.ok(readme.includes(phrase), phrase);
  }
});

test("guides state the critical human controls", () => {
  const docs = required.slice(1).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const phrase of ["boss approval", "Original Quote Number", "Excel Import Staging", "manual review", "WhatsApp automation", "Technician / Staff", "existing quotation numbering"]) {
    assert.ok(docs.toLowerCase().includes(phrase.toLowerCase()), phrase);
  }
});

test("documentation markdown converts to bounded Notion blocks", () => {
  const blocks = markdownToBlocks("# Guide\n\n- First\n\nPlain text");
  assert.deepEqual(blocks.map(({ type }) => type), ["heading_1", "bulleted_list_item", "paragraph"]);
});
