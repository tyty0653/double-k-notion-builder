import fs from "node:fs/promises";
import { text, chunk } from "./utils.js";
import { runWrite } from "./requestPolicy.js";

export const DOCUMENTATION_FILES = [
  "docs/schema.md", "docs/setup-guide.md", "docs/manual-dashboard-guide.md",
  "docs/retail-sop.md", "docs/project-sop.md", "docs/boss-approval-sop.md",
  "docs/excel-import-guide.md", "docs/ai-future-guide.md", "docs/user-role-guide.md",
  "docs/data-entry-standard-guide.md", "docs/quote-id-naming-guide.md",
];

export function markdownToBlocks(markdown) {
  return markdown.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    if (line.startsWith("### ")) return { object: "block", type: "heading_3", heading_3: { rich_text: text(line.slice(4)) } };
    if (line.startsWith("## ")) return { object: "block", type: "heading_2", heading_2: { rich_text: text(line.slice(3)) } };
    if (line.startsWith("# ")) return { object: "block", type: "heading_1", heading_1: { rich_text: text(line.slice(2)) } };
    if (line.startsWith("- ")) return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: text(line.slice(2)) } };
    if (/^\d+\. /.test(line)) return { object: "block", type: "numbered_list_item", numbered_list_item: { rich_text: text(line.replace(/^\d+\. /, "")) } };
    return { object: "block", type: "paragraph", paragraph: { rich_text: text(line) } };
  });
}

export async function createDocumentationPages({ client, parentPageId, state, persist = async () => {} }) {
  state.pages ??= {};
  let created = 0;
  let reused = 0;
  for (const filename of DOCUMENTATION_FILES) {
    const key = `doc:${filename}`;
    if (state.pages[key]) { reused += 1; continue; }
    const markdown = await fs.readFile(filename, "utf8");
    const titleLine = markdown.split(/\r?\n/).find((line) => line.startsWith("# "));
    const page = await runWrite(() => client.pages.create({
      parent: { type: "page_id", page_id: parentPageId },
      properties: { title: { type: "title", title: text(titleLine?.slice(2) ?? filename) } },
    }));
    for (const children of chunk(markdownToBlocks(markdown), 100)) {
      await runWrite(() => client.blocks.children.append({ block_id: page.id, children }));
    }
    state.pages[key] = page.id;
    await persist(state);
    created += 1;
  }
  return { created, reused, manualActions: [] };
}
