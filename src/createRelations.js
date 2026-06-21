import { runWrite, withReadRetry } from "./requestPolicy.js";

export async function createRelations({ client, schema, state }) {
  const required = new Set();
  for (const database of schema.databases) {
    for (const definition of Object.values(database.properties)) {
      if (definition.type === "relation") {
        required.add(database.key);
        required.add(definition.target);
      }
    }
  }
  const missing = [...required].filter((key) => !state.databases?.[key]?.dataSourceId);
  if (missing.length > 0) throw new Error(`missing data source IDs: ${missing.join(", ")}`);

  const result = { created: 0, reused: 0, manualActions: [] };
  for (const database of schema.databases) {
    const relations = Object.entries(database.properties)
      .filter(([, definition]) => definition.type === "relation");
    if (relations.length === 0) continue;
    const dataSourceId = state.databases[database.key].dataSourceId;
    const current = await withReadRetry(() => client.dataSources.retrieve({ data_source_id: dataSourceId }));
    const additions = {};
    for (const [name, definition] of relations) {
      if (current.properties?.[name]) {
        result.reused += 1;
        continue;
      }
      additions[name] = {
        relation: {
          data_source_id: state.databases[definition.target].dataSourceId,
          type: "single_property",
          single_property: {},
        },
      };
      result.created += 1;
    }
    if (Object.keys(additions).length > 0) {
      await runWrite(() => client.dataSources.update({ data_source_id: dataSourceId, properties: additions }));
    }
  }
  return result;
}
