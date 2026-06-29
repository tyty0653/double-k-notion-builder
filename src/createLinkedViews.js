import { runWrite, withReadRetry } from "./requestPolicy.js";

function plainText(block) {
  return (block[block.type]?.rich_text ?? [])
    .map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

async function directChildren(client, pageId) {
  const results = [];
  let startCursor;
  do {
    const page = await withReadRetry(() => client.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    }));
    results.push(...page.results);
    startCursor = page.has_more ? page.next_cursor : undefined;
  } while (startCursor);
  return results;
}

function propertyConfiguration(properties, visibleNames) {
  const visible = new Set(visibleNames);
  const ordered = [
    ...visibleNames.map((name) => [name, properties[name]]),
    ...Object.entries(properties).filter(([name]) => !visible.has(name)),
  ];
  return ordered.map(([name, property]) => {
    if (!property?.id) throw new Error(`Missing property ID for ${name}`);
    return { property_id: property.id, visible: visible.has(name) };
  });
}

function desiredView(definition, dataSource) {
  const configuration = {
    type: definition.type,
    properties: propertyConfiguration(dataSource.properties, definition.visibleProperties),
  };
  if (definition.type === "board") {
    const group = dataSource.properties[definition.groupBy.property];
    if (!group?.id) throw new Error(`Missing property ID for ${definition.groupBy.property}`);
    configuration.group_by = {
      type: definition.groupBy.type,
      property_id: group.id,
      group_by: definition.groupBy.groupBy,
      sort: { type: "manual" },
      hide_empty_groups: true,
    };
  }
  return {
    name: definition.name,
    type: definition.type,
    ...(definition.filter ? { filter: definition.filter } : {}),
    ...(definition.sorts ? { sorts: definition.sorts } : {}),
    configuration,
  };
}

async function retrieveView(client, viewId) {
  try {
    return await withReadRetry(() => client.views.retrieve({ view_id: viewId }));
  } catch (error) {
    if (error.status === 404 || error.code === "object_not_found") return null;
    throw error;
  }
}

async function retrieveDatabase(client, databaseId) {
  try {
    return await withReadRetry(() => client.databases.retrieve({ database_id: databaseId }));
  } catch (error) {
    if (error.status === 404 || error.code === "object_not_found") return null;
    throw error;
  }
}

function managedShape(view) {
  const configuration = {
    type: view.configuration?.type,
    properties: (view.configuration?.properties ?? [])
      .map(({ property_id, visible }) => ({ property_id, visible })),
  };
  if (view.type === "board") configuration.group_by = view.configuration?.group_by ?? null;
  return {
    name: view.name,
    type: view.type,
    filter: view.filter ?? null,
    sorts: view.sorts ?? [],
    configuration,
  };
}

const matchesManagedShape = (view, desired) =>
  JSON.stringify(managedShape(view)) === JSON.stringify(managedShape(desired));

function safeIds(view, targetPageId, dataSourceId) {
  return {
    viewId: view.id,
    linkedDatabaseId: view.parent.database_id,
    targetPageId,
    dataSourceId,
  };
}

async function viewIsOnPage(client, view, targetPageId) {
  const databaseId = view?.parent?.database_id;
  if (!databaseId) return false;
  const database = await retrieveDatabase(client, databaseId);
  return database?.parent?.page_id === targetPageId && !database.in_trash;
}

async function discoverMatches(client, definition, source, targetPageId) {
  const listed = await withReadRetry(() => client.views.list({
    data_source_id: source.dataSourceId,
    page_size: 100,
  }));
  const matches = [];
  for (const reference of listed.results) {
    const view = await retrieveView(client, reference.id);
    if (!view || view.name !== definition.name) continue;
    if (view.parent?.database_id === source.databaseId) continue;
    if (await viewIsOnPage(client, view, targetPageId)) matches.push(view);
  }
  return matches;
}

export async function createLinkedViews({ client, schema, state, persist = async () => {} }) {
  state.linkedViews ??= {};
  const result = { created: 0, reused: 0, manualActions: [] };
  for (const definition of schema.linkedViews ?? []) {
    try {
      const targetPageId = state.pages?.[definition.pageKey];
      const source = state.databases?.[definition.databaseKey];
      if (!targetPageId || !source?.dataSourceId) throw new Error("required page or data source ID is unavailable");
      const headings = (await directChildren(client, targetPageId))
        .filter((block) => block.type === "heading_2" && plainText(block) === definition.heading);
      if (headings.length !== 1) {
        result.manualActions.push(`${definition.name}: expected exactly one heading "${definition.heading}"; nothing was appended.`);
        continue;
      }
      const dataSource = await withReadRetry(() => client.dataSources.retrieve({ data_source_id: source.dataSourceId }));
      const desired = desiredView(definition, dataSource);
      const tracked = state.linkedViews[definition.key];
      if (tracked?.viewId) {
        const view = await retrieveView(client, tracked.viewId);
        if (view?.data_source_id === source.dataSourceId && await viewIsOnPage(client, view, targetPageId)) {
          if (!matchesManagedShape(view, desired)) {
            await runWrite(() => client.views.update({ view_id: view.id, ...desired }));
          }
          state.linkedViews[definition.key] = safeIds(view, targetPageId, source.dataSourceId);
          await persist(state);
          result.reused += 1;
          continue;
        }
      }

      const matches = await discoverMatches(client, definition, source, targetPageId);
      if (matches.length > 1) {
        result.manualActions.push(`Multiple linked views named "${definition.name}" exist on ${definition.pageKey}; nothing was changed.`);
        continue;
      }
      if (matches.length === 1) {
        if (!matchesManagedShape(matches[0], desired)) {
          result.manualActions.push(`Manual linked view "${definition.name}" conflicts on ${definition.pageKey}; it was not changed.`);
          continue;
        }
        state.linkedViews[definition.key] = safeIds(matches[0], targetPageId, source.dataSourceId);
        await persist(state);
        result.reused += 1;
        continue;
      }

      const created = await runWrite(() => client.views.create({
        create_database: {
          parent: { type: "page_id", page_id: targetPageId },
          position: { type: "after_block", block_id: headings[0].id },
        },
        data_source_id: source.dataSourceId,
        ...desired,
      }));
      state.linkedViews[definition.key] = safeIds(created, targetPageId, source.dataSourceId);
      await persist(state);
      result.created += 1;
    } catch (error) {
      result.manualActions.push(`${definition.name}: linked view requires manual setup (${error.code ?? error.status ?? "API error"}).`);
    }
  }
  return result;
}
