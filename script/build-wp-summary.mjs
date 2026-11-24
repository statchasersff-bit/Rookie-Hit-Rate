#!/usr/bin/env node
/**
 * Regenerate wordpress-plugin/statchasers-rookie-hit-rates/summary/
 * hit-rates-summary.json from the plugin's own app/data/*.csv with the app's
 * own calculation (script/wp-summary-entry.ts -> client/src/lib).
 *
 *   node script/build-wp-summary.mjs          # write
 *   node script/build-wp-summary.mjs --check  # exit 1 if stale
 *
 * script/build-wp-plugin.sh runs it after copying the CSVs into the plugin, so
 * a data refresh cannot ship with an old summary. The JSON records the sha256 and
 * byte size of the two CSVs it was computed from; --check compares hashes, and
 * the PHP (which must stay cheap on every page view) compares sizes and prints
 * no summary at all when they differ.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const plugin = resolve(here, "../wordpress-plugin/statchasers-rookie-hit-rates");
const dataDir = join(plugin, "app/data");
const outFile = join(plugin, "summary/hit-rates-summary.json");
const CSVS = ["rookie_drafts.csv", "season_finishes.csv"];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// The upstream loaders fetch `${DATA_BASE}<name>.csv`; DATA_BASE is "/data/"
// when there is no window. Serve those two names from the plugin's files.
globalThis.fetch = async (url) => {
  const name = String(url).split("/").pop();
  if (!CSVS.includes(name)) throw new Error(`unexpected fetch ${url}`);
  const text = readFileSync(join(dataDir, name), "utf8");
  return { ok: true, text: async () => text };
};

const bundleDir = join(tmpdir(), `rhr-summary-${process.pid}`);
mkdirSync(bundleDir, { recursive: true });
const bundle = join(bundleDir, "entry.mjs");
await build({
  entryPoints: [join(here, "wp-summary-entry.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundle,
  logLevel: "warning",
});
const { buildSummary } = await import(pathToFileURL(bundle).href);

const summary = await buildSummary();
const out = {
  ...summary,
  sources: Object.fromEntries(
    CSVS.map((n) => {
      const buf = readFileSync(join(dataDir, n));
      return [n, { sha256: sha256(buf), bytes: buf.length }];
    }),
  ),
};
const json = JSON.stringify(out, null, 2) + "\n";

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(outFile, "utf8");
  } catch {}
  if (current !== json) {
    console.error(`STALE ${outFile}\n  run: node script/build-wp-summary.mjs`);
    process.exit(1);
  }
  console.log("summary  ok (matches app/data)");
} else {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, json);
  const t = out.total;
  console.log(
    `summary  wrote ${outFile.replace(plugin + "/", "")}: ${t.hits}/${t.total} ` +
      out.rows.map((r) => `${r.group} ${r.hits}/${r.total}`).join(", "),
  );
}
