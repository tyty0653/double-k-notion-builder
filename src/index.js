import { pathToFileURL } from "node:url";

const COMMANDS = new Set(["setup", "seed", "csv", "docs"]);

export function parseArgs(argv) {
  const [command, ...flags] = argv;
  if (!COMMANDS.has(command)) {
    throw new Error(`Unknown command: ${command ?? "(missing)"}`);
  }

  const unknown = flags.filter((flag) => !["--dry-run", "--seed"].includes(flag));
  if (unknown.length > 0) {
    throw new Error(`Unknown flag: ${unknown[0]}`);
  }

  return {
    command,
    dryRun: flags.includes("--dry-run"),
    seed: command === "seed" || flags.includes("--seed"),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  process.stdout.write(`${JSON.stringify(options)}\n`);
  return options;
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
