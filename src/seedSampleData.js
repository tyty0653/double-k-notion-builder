import { text } from "./utils.js";
import { runWrite } from "./requestPolicy.js";

const SEED_ORDER = [
  "services", "customers", "sites", "quotations", "quoteItems", "retailJobs",
  "projects", "projectDocuments", "variationOrders", "payments", "sopTemplates",
  "aiKnowledgeBase",
];

function propertyValue(definition, value) {
  if (value === undefined || value === null || definition.type === "people") return undefined;
  switch (definition.type) {
    case "title": return { type: "title", title: text(value) };
    case "rich_text": return { type: "rich_text", rich_text: text(value) };
    case "select": return { type: "select", select: { name: String(value) } };
    case "multi_select": return { type: "multi_select", multi_select: (Array.isArray(value) ? value : [value]).map((name) => ({ name })) };
    case "number": return { type: "number", number: Number(value) };
    case "checkbox": return { type: "checkbox", checkbox: Boolean(value) };
    case "date": return { type: "date", date: { start: String(value) } };
    case "email": return { type: "email", email: String(value) };
    case "phone_number": return { type: "phone_number", phone_number: String(value) };
    default: return undefined;
  }
}

function resolveSeedId(state, stableKey) {
  for (const entries of Object.values(state.seeds ?? {})) {
    if (entries[stableKey]) return entries[stableKey];
  }
  throw new Error(`missing related seed key: ${stableKey}`);
}

function buildProperties(database, row, state) {
  const values = {};
  const titleName = Object.entries(database.properties).find(([, definition]) => definition.type === "title")?.[0];
  values[titleName] = propertyValue({ type: "title" }, row.title);
  for (const [name, value] of Object.entries(row.properties ?? {})) {
    const definition = database.properties[name];
    if (!definition || definition.type === "title") continue;
    const mapped = propertyValue(definition, value);
    if (mapped) values[name] = mapped;
  }
  for (const [name, stableKey] of Object.entries(row.relations ?? {})) {
    if (!database.properties[name] || database.properties[name].type !== "relation") continue;
    values[name] = { type: "relation", relation: [{ id: resolveSeedId(state, stableKey) }] };
  }
  return values;
}

export async function seedSampleData({ client, schema, state, persist = async () => {} }) {
  state.seeds ??= {};
  const result = { created: 0, reused: 0, manualActions: [] };
  const databases = new Map(schema.databases.map((entry) => [entry.key, entry]));

  for (const databaseKey of SEED_ORDER) {
    const database = databases.get(databaseKey);
    const ids = state.databases?.[databaseKey];
    if (!database || !ids?.dataSourceId) throw new Error(`${databaseKey}: setup must create the data source before seeding`);
    state.seeds[databaseKey] ??= {};
    for (const row of schema.seeds[databaseKey] ?? []) {
      if (state.seeds[databaseKey][row.key]) {
        result.reused += 1;
        continue;
      }
      const created = await runWrite(() => client.pages.create({
        parent: { type: "data_source_id", data_source_id: ids.dataSourceId },
        properties: buildProperties(database, row, state),
        children: [{
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: text("[Sample] Fictional training record. Not real customer data or a numbering recommendation.") },
        }],
      }));
      state.seeds[databaseKey][row.key] = created.id;
      await persist(state);
      result.created += 1;
    }
  }
  return result;
}
