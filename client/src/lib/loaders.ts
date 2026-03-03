import type { RookieDraft, SeasonFinish, Pos } from "./types";

function parseCSV<T>(text: string, transform: (row: Record<string, string>) => T): T[] {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] || "").trim();
    });
    return transform(obj);
  });
}

export async function loadRookieDrafts(): Promise<RookieDraft[]> {
  const res = await fetch("/data/rookie_drafts.csv");
  const text = await res.text();
  return parseCSV(text, (row) => ({
    player_id: row.player_id,
    player_name: row.player_name,
    pos: row.pos as Pos,
    rookie_year: parseInt(row.rookie_year),
    dynasty_year: parseInt(row.dynasty_year),
    rookie_round: parseInt(row.rookie_round),
    rookie_pick: parseInt(row.rookie_pick),
    nfl_draft_round: parseInt(row.nfl_draft_round),
    nfl_draft_pick: parseInt(row.nfl_draft_pick),
  }));
}

export async function loadSeasonFinishes(): Promise<SeasonFinish[]> {
  const res = await fetch("/data/season_finishes.csv");
  const text = await res.text();
  return parseCSV(text, (row) => ({
    player_id: row.player_id,
    season: parseInt(row.season),
    pos: row.pos as Pos,
    games: parseInt(row.games),
    fantasy_points_ppr: parseFloat(row.fantasy_points_ppr),
    fantasy_points_hppr: parseFloat(row.fantasy_points_hppr),
    fantasy_points_std: parseFloat(row.fantasy_points_std),
  }));
}
