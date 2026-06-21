import { text } from "./utils.js";
import { withReadRetry, runWrite } from "./requestPolicy.js";

function pageTitle(page) {
  const values = page.properties?.title?.title ?? page.properties?.Name?.title ?? [];
  return values.map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

function pageChildren(definition) {
  const children = [{
    object: "block",
    type: "callout",
    callout: {
      rich_text: text("Double K OS builder-managed page. Configure linked database views using the manual guide."),
      icon: { type: "emoji", emoji: "🛠️" },
    },
  }];
  for (const section of definition.sections ?? []) {
    children.push({ object: "block", type: "heading_2", heading_2: { rich_text: text(section) } });
    children.push({ object: "block", type: "paragraph", paragraph: { rich_text: text("Add the linked database view and filters described in the manual dashboard guide.") } });
  }
  return children;
}

async function retrievePage(client, id) {
  try {
    const page = await withReadRetry(() => client.pages.retrieve({ page_id: id }));
    return page.in_trash ? null : page;
  } catch (error) {
    if (error.status === 404 || error.code === "object_not_found") return null;
    throw error;
  }
}

export async function createPages({ client, schema, parentPageId, state, persist = async () => {} }) {
  state.pages ??= {};
  const result = { created: 0, reused: 0, manualActions: [] };

  for (const definition of schema.pages) {
    const existingId = state.pages[definition.key];
    if (existingId && await retrievePage(client, existingId)) {
      result.reused += 1;
      continue;
    }

    const found = await withReadRetry(() => client.search({
      query: definition.title,
      filter: { property: "object", value: "page" },
      page_size: 100,
    }));
    const matches = found.results.filter((candidate) =>
      pageTitle(candidate) === definition.title
      && candidate.parent?.page_id === parentPageId
      && !candidate.in_trash);

    if (matches.length > 1) {
      result.manualActions.push(`Multiple pages named "${definition.title}" exist under the parent.`);
      continue;
    }
    if (matches.length === 1) {
      state.pages[definition.key] = matches[0].id;
      await persist(state);
      result.reused += 1;
      continue;
    }

    const created = await runWrite(() => client.pages.create({
      parent: { type: "page_id", page_id: parentPageId },
      properties: { title: { type: "title", title: text(definition.title) } },
      children: pageChildren(definition),
    }));
    state.pages[definition.key] = created.id;
    await persist(state);
    result.created += 1;
  }
  return result;
}
