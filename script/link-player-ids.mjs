#!/usr/bin/env node
/**
 * Link every rookie in rookie_drafts.csv to all of his rows in
 * season_finishes.csv, using the checked table in script/player-id-links.json.
 *
 *   node script/link-player-ids.mjs           # rewrite the CSVs in place
 *   node script/link-player-ids.mjs --check   # exit 1 if they need rewriting
 *
 * Run it after any data rebuild (build_fantasy_data.py, fetch_sleeper_2025.py,
 * generate-data.cjs); script/build-wp-plugin.sh runs it first. It is
 * idempotent: a second run changes nothing.
 *
 * It also WARNS about season ids that look like an unlinked alias of a rookie
 * (a Jr./Sr./II/III/IV/V suffix, or the same letters without hyphens). Verify
 * each against nflverse before adding it to player-id-links.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "client/public/data");
const links = JSON.parse(readFileSync(join(root, "script/player-id-links.json"), "utf8"));
const check = process.argv.includes("--check");

// The app's parser (client/src/lib/loaders.ts) splits on "," with no quoting,
// so plain split/join round-trips these files exactly.
function read(name) {
  const text = readFileSync(join(dataDir, name), "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.replace(/\s+$/, "").split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((l) => {
    const v = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, v[i] ?? ""]));
  });
  return { header, rows, eol, text };
}
function serialize({ header, rows, eol }) {
  return [header.join(","), ...rows.map((r) => header.map((h) => r[h] ?? "").join(","))].join(eol) + eol;
}

const drafts = read("rookie_drafts.csv");
const finishes = read("season_finishes.csv");
const notes = [];

// 1. Rookie renames (an id shared with another player).
for (const rn of links.rookie_renames) {
  for (const d of drafts.rows) {
    if (d.player_id === rn.from && Number(d.rookie_year) === rn.rookie_year) {
      d.player_id = rn.to;
      if (rn.player_name) d.player_name = rn.player_name;
      notes.push(`rookie ${rn.from} (${rn.rookie_year}) -> ${rn.to}`);
    }
  }
}

// 2. Season aliases.
const key = (r) => `${r.player_id}|${r.season}`;
const have = new Set(finishes.rows.map(key));
for (const r of finishes.rows) {
  const to = links.season_aliases[r.player_id];
  if (!to) continue;
  if (have.has(`${to}|${r.season}`)) {
    throw new Error(`alias ${r.player_id} -> ${to}: ${to} already has a ${r.season} row`);
  }
  have.delete(key(r));
  notes.push(`season ${r.season} ${r.player_id} -> ${to}`);
  r.player_id = to;
  have.add(key(r));
}

// 3. Season additions, ranked in place: a new row takes rank 1 + (rows at that
// season+position with more points) in each scoring, and rows with fewer points
// move down one. No other row's rank changes.
const scorings = [
  ["fantasy_points_ppr", "rank_ppr"],
  ["fantasy_points_hppr", "rank_hppr"],
  ["fantasy_points_std", "rank_std"],
];
for (const add of links.season_additions) {
  if (have.has(`${add.player_id}|${add.season}`)) continue;
  const peers = finishes.rows.filter((r) => Number(r.season) === add.season && r.pos === add.pos);
  const row = {
    player_id: add.player_id,
    player_name: add.player_name,
    season: String(add.season),
    pos: add.pos,
    games: String(add.games),
  };
  for (const [pts, rank] of scorings) {
    const p = add[pts];
    row[pts] = String(p);
    row[rank] = String(1 + peers.filter((r) => Number(r[pts]) > p).length);
    for (const r of peers) if (Number(r[pts]) < p) r[rank] = String(Number(r[rank]) + 1);
  }
  // Keep the file's season order: insert after the last row of that season.
  let at = finishes.rows.length;
  for (let i = finishes.rows.length - 1; i >= 0; i--) {
    if (Number(finishes.rows[i].season) <= add.season) { at = i + 1; break; }
  }
  finishes.rows.splice(at, 0, row);
  have.add(`${add.player_id}|${add.season}`);
  notes.push(`season ${add.season} + ${add.player_id}`);
}

// 4. Warn about likely aliases not in the table.
const rookieIds = new Set(drafts.rows.map((d) => d.player_id));
const squash = (id) => id.replace(/-/g, "");
const bySquash = new Map([...rookieIds].map((id) => [squash(id), id]));
const known = new Set([...Object.keys(links.season_aliases), ...links.rookie_renames.map((r) => r.from)]);
const warned = new Set();
for (const r of finishes.rows) {
  const id = r.player_id;
  if (rookieIds.has(id) || known.has(id) || warned.has(id)) continue;
  const base = id.replace(/-(jr|sr|ii|iii|iv|v)$/, "");
  const target = (base !== id && rookieIds.has(base) && base) || bySquash.get(squash(id));
  if (target && target !== id) {
    warned.add(id);
    console.warn(`WARN possible unlinked alias: ${id} (${r.player_name}) -> ${target}? verify, then add to player-id-links.json`);
  }
}

const out = [
  ["rookie_drafts.csv", drafts],
  ["season_finishes.csv", finishes],
].filter(([, f]) => serialize(f) !== f.text);

if (check) {
  if (out.length) {
    console.error(`NEEDS LINKING: ${out.map(([n]) => n).join(", ")} (run node script/link-player-ids.mjs)`);
    process.exit(1);
  }
  console.log("player ids linked");
} else {
  for (const [name, f] of out) writeFileSync(join(dataDir, name), serialize(f));
  console.log(out.length ? notes.join("\n") + `\nwrote ${out.map(([n]) => n).join(", ")}` : "player ids already linked");
}
