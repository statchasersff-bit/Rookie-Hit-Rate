import type { SeasonFinish, RankedSeason, Scoring } from "./types";

function getPointsField(scoring: Scoring): keyof SeasonFinish {
  switch (scoring) {
    case "ppr": return "fantasy_points_ppr";
    case "hppr": return "fantasy_points_hppr";
    case "std": return "fantasy_points_std";
  }
}

export function computeRanks(finishes: SeasonFinish[], scoring: Scoring): RankedSeason[] {
  const grouped = new Map<string, SeasonFinish[]>();

  for (const f of finishes) {
    const key = `${f.season}-${f.pos}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(f);
  }

  const field = getPointsField(scoring);
  const ranked: RankedSeason[] = [];

  for (const [, group] of grouped) {
    const sorted = [...group].sort((a, b) => (b[field] as number) - (a[field] as number));
    sorted.forEach((f, idx) => {
      ranked.push({ ...f, pos_rank: idx + 1 });
    });
  }

  return ranked;
}

export function buildRankMap(rankedSeasons: RankedSeason[]): Map<string, RankedSeason[]> {
  const map = new Map<string, RankedSeason[]>();
  for (const rs of rankedSeasons) {
    if (!map.has(rs.player_id)) map.set(rs.player_id, []);
    map.get(rs.player_id)!.push(rs);
  }
  return map;
}
