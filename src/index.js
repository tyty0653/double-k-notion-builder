import path from "node:path";
import { pathToFileURL } from "node:url";
import { systemSchema, validateSchema } from "./schemaRegistry.js";
import { createNotionClient, NOTION_API_VERSION } from "./notionClient.js";
import { createPages } from "./createPages.js";
import { createDatabases } from "./createDatabases.js";
import { createRelations } from "./createRelations.js";
import { createViews } from "./createViews.js";
import { createDocumentationPages } from "./createDocumentation.js";
import { seedSampleData } from "./seedSampleData.js";
import { generateCsvTemplates } from "./generateCsvTemplates.js";
import { loadState, saveState } from "./stateStore.js";

const COMMANDS = new Set(["setup", "seed", "csv", "docs"]);

export function parseArgs(argv) {
  const [command, ...flags] = argv;
  if (!COMMANDS.has(command)) throw new Error(`Unknown command: ${command ?? "(missing)"}`);
  const unknown = flags.filter((flag) => !["--dry-run", "--seed"].includes(flag));
  if (unknown.length > 0) throw new Error(`Unknown flag: ${unknown[0]}`);
  return { command, dryRun: flags.includes("--dry-run"), seed: command === "seed" || flags.includes("--seed") };
}

export function createDryRunPlan(schema, { includeSeed = false } = {}) {
  const relations = schema.databases.flatMap((database) =>
    Object.values(database.properties).filter(({ type }) => type === "relation")).length;
  const seedRecords = includeSeed
    ? Object.values(schema.seeds).reduce((sum, rows) => sum + rows.length, 0)
    : 0;
  return {
    mode: "dry-run",
    networkCalls: 0,
    filesystemWrites: 0,
    pages: schema.pages.length,
    databases: schema.databases.length,
    relations,
    views: schema.views.length,
    documentationPages: 11,
    seedRecords,
    actions: [
      ...schema.pages.map(({ key }) => ({ id: `dryrun:page:${key}`, action: "create-or-reuse page" })),
      ...schema.databases.map(({ key }) => ({ id: `dryrun:database:${key}`, action: "create-or-reuse database/data source" })),
      ...schema.views.map(({ key }) => ({ id: `dryrun:view:${key}`, action: "best-effort simple view" })),
    ],
  };
}

function mergeSummary(summary, phase, result = {}) {
  summary.phases.push(phase);
  summary.created += result.created ?? 0;
  summary.reused += result.reused ?? 0;
  summary.manualActions.push(...(result.manualActions ?? []));
}

export async function orchestrate({ options, context, actions }) {
  const summary = { phases: [], created: 0, reused: 0, manualActions: [] };
  const run = async (name) => {
    const result = await actions[name]({ ...context, summary });
    mergeSummary(summary, name, result);
  };

  await run("validate");
  if (options.command === "setup") {
    for (const name of ["pages", "databases", "relations", "views", "docs"]) await run(name);
    if (options.seed) await run("seed");
  } else if (options.command === "seed") {
    await run("seed");
  } else if (options.command === "docs") {
    await run("docs");
  }
  await run("report");
  return summary;
}

function createActions(context, output) {
  return {
    validate: async () => {
      const errors = validateSchema(context.schema);
      if (errors.length > 0) throw new Error(`Schema validation failed:\n${errors.join("\n")}`);
      if (context.state.parentPageId !== context.parentPageId) throw new Error("Generated state belongs to a different Notion parent page");
      return {};
    },
    pages: () => createPages(context),
    databases: () => createDatabases(context),
    relations: () => createRelations(context),
    views: () => createViews(context),
    docs: () => createDocumentationPages({
      ...context,
      parentPageId: context.state.pages.setupGuide ?? context.parentPageId,
    }),
    seed: () => seedSampleData(context),
    report: async ({ summary }) => {
      output.write(`${JSON.stringify(summary, null, 2)}\n`);
      return {};
    },
  };
}

function freshState(parentPageId) {
  return {
    schemaVersion: 1,
    notionApiVersion: NOTION_API_VERSION,
    parentPageId,
    pages: {},
    databases: {},
    seeds: {},
  };
}

export async function main(argv = process.argv.slice(2), {
  output = process.stdout,
  environment = process.env,
  stateFile = path.resolve("generated/notion-state.json"),
  schema = systemSchema,
} = {}) {
  const options = parseArgs(argv);
  const schemaErrors = validateSchema(schema);
  if (schemaErrors.length > 0) throw new Error(`Schema validation failed:\n${schemaErrors.join("\n")}`);

  if (options.dryRun) {
    const plan = createDryRunPlan(schema, { includeSeed: options.seed });
    output.write(`${JSON.stringify(plan, null, 2)}\n`);
    return plan;
  }
  if (options.command === "csv") {
    const files = await generateCsvTemplates({ schema });
    output.write(`Generated ${files.length} CSV templates.\n`);
    return { generated: files.length };
  }

  const { config } = await import("dotenv");
  config();
  const token = environment.NOTION_TOKEN ?? process.env.NOTION_TOKEN;
  const parentPageId = environment.NOTION_PARENT_PAGE_ID ?? process.env.NOTION_PARENT_PAGE_ID;
  if (!token) throw new Error("NOTION_TOKEN is required for live Notion commands");
  if (!parentPageId) throw new Error("NOTION_PARENT_PAGE_ID is required for live Notion commands");

  const state = await loadState(stateFile) ?? freshState(parentPageId);
  const persist = (nextState) => saveState(stateFile, nextState);
  const context = {
    client: createNotionClient({ token }),
    schema,
    parentPageId,
    state,
    persist,
  };
  return orchestrate({ options, context, actions: createActions(context, output) });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
