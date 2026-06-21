import { text } from "./utils.js";
import { runWrite, withReadRetry } from "./requestPolicy.js";

export function toNotionProperty(definition) {
  switch (definition.type) {
    case "title": return { title: {} };
    case "rich_text": return { rich_text: {} };
    case "select": return { select: { options: definition.options.map((name) => ({ name })) } };
    case "multi_select": return { multi_select: { options: definition.options.map((name) => ({ name })) } };
    case "number": return { number: { format: "number" } };
    case "formula": return { formula: { expression: definition.expression } };
    case "created_time": return { created_time: {} };
    case "last_edited_time": return { last_edited_time: {} };
    default: return { [definition.type]: {} };
  }
}

function databaseTitle(database) {
  return (database.title ?? []).map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

async function retrieveDatabase(client, id) {
  try {
    const value = await withReadRetry(() => client.databases.retrieve({ database_id: id }));
    return value.in_trash ? null : value;
  } catch (error) {
    if (error.status === 404 || error.code === "object_not_found") return null;
    throw error;
  }
}

export async function createDatabases({ client, schema, state, persist = async () => {} }) {
  state.databases ??= {};
  const result = { created: 0, reused: 0, manualActions: [] };
  for (const definition of schema.databases) {
    const known = state.databases[definition.key];
    if (known?.databaseId && await retrieveDatabase(client, known.databaseId)) {
      result.reused += 1;
      continue;
    }

    const parentPageId = state.pages?.[definition.parentPageKey];
    if (!parentPageId) throw new Error(`${definition.key}: missing parent page state`);
    const search = await withReadRetry(() => client.search({
      query: definition.title,
      filter: { property: "object", value: "data_source" },
      page_size: 100,
    }));
    const matches = [];
    for (const candidate of search.results) {
      if (databaseTitle(candidate) !== definition.title || candidate.in_trash) continue;
      const databaseId = candidate.parent?.database_id;
      if (!databaseId) continue;
      const container = await retrieveDatabase(client, databaseId);
      if (container?.parent?.page_id === parentPageId) {
        matches.push({ database: container, dataSource: candidate });
      }
    }
    if (matches.length > 1) {
      result.manualActions.push(`Multiple databases named "${definition.title}" exist under the expected page.`);
      continue;
    }
    if (matches.length === 1) {
      state.databases[definition.key] = {
        databaseId: matches[0].database.id,
        dataSourceId: matches[0].dataSource.id,
      };
      await persist(state);
      result.reused += 1;
      continue;
    }

    const properties = Object.fromEntries(
      Object.entries(definition.properties)
        .filter(([, propertyDefinition]) => propertyDefinition.type !== "relation")
        .map(([name, propertyDefinition]) => [name, toNotionProperty(propertyDefinition)]),
    );
    const created = await runWrite(() => client.databases.create({
      parent: { type: "page_id", page_id: parentPageId },
      title: text(definition.title),
      description: text(definition.purpose),
      is_inline: false,
      initial_data_source: { properties },
    }));
    const dataSourceId = created.data_sources?.[0]?.id;
    if (!dataSourceId) throw new Error(`${definition.key}: create response omitted data source ID`);
    state.databases[definition.key] = { databaseId: created.id, dataSourceId };
    await persist(state);
    result.created += 1;
  }
  return result;
}
