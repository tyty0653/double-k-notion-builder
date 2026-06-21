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
      const created = await runWrite(() => client.views.create({
        create_database: {
          parent: { type: "page_id", page_id: targetPageId },
          position: { type: "after_block", block_id: headings[0].id },
        },
        data_source_id: source.dataSourceId,
        ...desired,
      }));
      state.linkedViews[definition.key] = {
        viewId: created.id,
        linkedDatabaseId: created.parent.database_id,
        targetPageId,
        dataSourceId: source.dataSourceId,
      };
      await persist(state);
      result.created += 1;
    } catch (error) {
      result.manualActions.push(`${definition.name}: linked view requires manual setup (${error.code ?? error.status ?? "API error"}).`);
    }
  }
  return result;
}
