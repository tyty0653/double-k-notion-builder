import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseArgs } from "../src/index.js";

test("package pins the approved SDK and exposes required scripts", () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(pkg.dependencies["@notionhq/client"], "5.22.0");
  for (const script of ["dry-run", "setup", "seed", "csv", "docs", "test"]) {
    assert.ok(pkg.scripts[script], `missing ${script}`);
  }
});

test("CLI parses dry-run and seed without requiring credentials", () => {
  assert.deepEqual(parseArgs(["setup", "--dry-run", "--seed"]), {
    command: "setup",
    dryRun: true,
    seed: true,
  });
});
