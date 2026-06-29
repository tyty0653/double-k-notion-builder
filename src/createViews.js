import { runWrite, withReadRetry } from "./requestPolicy.js";

async function existingViewNames(client, databaseId, dataSourceId) {
  const listed = await withReadRetry(() => client.views.list({
    database_id: databaseId,
    data_source_id: dataSourceId,
    page_size: 100,
  }));
  const names = new Set();
  for (const reference of listed.results) {
    const view = await withReadRetry(() => client.views.retrieve({ view_id: reference.id }));
    if (view.name) names.add(view.name);
  }
  return names;
}

export async function createViews({ client, schema, state }) {
  const result = { created: 0, reused: 0, manualActions: [] };
  const namesByDatabase = new Map();
  for (const definition of schema.views ?? []) {
    const ids = state.databases?.[definition.databaseKey];
    if (!ids?.databaseId || !ids?.dataSourceId) {
      result.manualActions.push(`${definition.name}: database IDs are unavailable.`);
      continue;
    }
    try {
      if (!namesByDatabase.has(definition.databaseKey)) {
        namesByDatabase.set(definition.databaseKey, await existingViewNames(client, ids.databaseId, ids.dataSourceId));
      }
      const names = namesByDatabase.get(definition.databaseKey);
      if (names.has(definition.name)) {
        result.reused += 1;
        continue;
      }
      const args = {
        data_source_id: ids.dataSourceId,
        database_id: ids.databaseId,
        name: definition.name,
        type: definition.type ?? "table",
        ...(definition.filter ? { filter: definition.filter } : {}),
        ...(definition.sorts ? { sorts: definition.sorts } : {}),
        position: { type: "end" },
      };
      await runWrite(() => client.views.create(args));
      names.add(definition.name);
      result.created += 1;
    } catch (error) {
      result.manualActions.push(`${definition.name}: create manually (${error.code ?? error.status ?? "API error"}).`);
    }
  }
  return result;
}
