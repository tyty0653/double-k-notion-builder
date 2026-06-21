import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_KEYS = [
  "schemaVersion",
  "notionApiVersion",
  "parentPageId",
  "pages",
  "databases",
  "seeds",
];

export function sanitizeState(state) {
  return Object.fromEntries(
    ALLOWED_KEYS.filter((key) => state[key] !== undefined).map((key) => [key, state[key]]),
  );
}

export async function loadState(filename) {
  try {
    return sanitizeState(JSON.parse(await fs.readFile(filename, "utf8")));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveState(filename, state) {
  const directory = path.dirname(filename);
  const temporary = `${filename}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(sanitizeState(state), null, 2)}\n`, "utf8");
  await fs.rename(temporary, filename);
}
