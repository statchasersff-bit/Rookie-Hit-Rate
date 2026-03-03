import type { RookieDraft, RankedSeason, CohortSummary, Pos, Outcome, Filters } from "./types";

function getThreshold(outcome: Outcome, pos: Pos): number {
  switch (outcome) {
    case "elite": return 12;
    case "starter": return 24;
    case "flex": return (pos === "QB" || pos === "TE") ? 24 : 36;
  }
}

function wilsonCI(hits: number, total: number): { lower: number; upper: number; width: number } {
  if (total === 0) return { lower: 0, upper: 0, width: 0 };
  const z = 1.96;
  const p = hits / total;
  const denom = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p)) / total + z * z / (4 * total * total));
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    width: Math.min(1, center + margin) - Math.max(0, center - margin),
  };
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeCohorts(
  drafts: RookieDraft[],
  rankMap: Map<string, RankedSeason[]>,
  filters: Filters
): CohortSummary[] {
  const filtered = drafts.filter((d) => {
    if (d.dynasty_year < filters.yearStart || d.dynasty_year > filters.yearEnd) return false;
    if (filters.positions.length > 0 && !filters.positions.includes(d.pos)) return false;
    if (filters.rounds.length > 0 && !filters.rounds.includes(d.rookie_round)) return false;
    return true;
  });

  const groups = new Map<string, RookieDraft[]>();
  for (const d of filtered) {
    const key = `${d.pos}-${d.rookie_round}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const results: CohortSummary[] = [];

  for (const [key, group] of groups) {
    const [pos, roundStr] = key.split("-");
    const round = parseInt(roundStr);
    const position = pos as Pos;

    let hits = 0, eliteHits = 0, starterHits = 0, flexHits = 0, bustCount = 0;
    const breakouts: number[] = [];
    let year1Hits = 0, year2Hits = 0, year3PlusHits = 0;
    const years = new Set<number>();

    for (const draft of group) {
      years.add(draft.dynasty_year);
      const seasons = rankMap.get(draft.player_id) || [];
      const validSeasons = seasons.filter((s) => s.games >= filters.minGames && s.season >= draft.rookie_year);

      let isHit = false;
      let firstHitSeason: number | null = null;
      let isElite = false, isStarter = false, isFlex = false;

      for (const s of validSeasons.sort((a, b) => a.season - b.season)) {
        const eliteT = getThreshold("elite", position);
        const starterT = getThreshold("starter", position);
        const flexT = getThreshold("flex", position);

        if (s.pos_rank <= eliteT) isElite = true;
        if (s.pos_rank <= starterT) isStarter = true;
        if (s.pos_rank <= flexT) isFlex = true;

        const threshold = getThreshold(filters.outcome, position);
        if (!isHit && s.pos_rank <= threshold) {
          isHit = true;
          firstHitSeason = s.season;
        }
      }

      if (isHit) {
        hits++;
        if (isElite) eliteHits++;
        if (isStarter) starterHits++;
        if (isFlex) flexHits++;

        if (firstHitSeason !== null) {
          const bt = firstHitSeason - draft.rookie_year + 1;
          breakouts.push(bt);
          if (bt === 1) year1Hits++;
          else if (bt === 2) year2Hits++;
          else year3PlusHits++;
        }
      } else {
        bustCount++;
      }
    }

    const total = group.length;
    const ci = wilsonCI(hits, total);

    results.push({
      pos: position,
      rookie_round: round,
      dynasty_years: Array.from(years).sort(),
      total,
      hits,
      hit_rate: total > 0 ? hits / total : 0,
      elite_hits: eliteHits,
      elite_rate: total > 0 ? eliteHits / total : 0,
      starter_hits: starterHits,
      starter_rate: total > 0 ? starterHits / total : 0,
      flex_hits: flexHits,
      flex_rate: total > 0 ? flexHits / total : 0,
      bust_count: bustCount,
      bust_rate: total > 0 ? bustCount / total : 0,
      median_breakout: median(breakouts),
      hit_by_year: {
        year1: hits > 0 ? year1Hits / hits : 0,
        year2: hits > 0 ? year2Hits / hits : 0,
        year3_plus: hits > 0 ? year3PlusHits / hits : 0,
      },
      ci_lower: ci.lower,
      ci_upper: ci.upper,
      ci_width: ci.width,
    });
  }

  return results.sort((a, b) => {
    const posOrder = ["QB", "RB", "WR", "TE"];
    const pi = posOrder.indexOf(a.pos) - posOrder.indexOf(b.pos);
    return pi !== 0 ? pi : a.rookie_round - b.rookie_round;
  });
}

export function computeTrends(
  drafts: RookieDraft[],
  rankMap: Map<string, RankedSeason[]>,
  pos: Pos,
  round: number,
  outcome: Outcome,
  minGames: number
): { year: number; hitRate: number; n: number }[] {
  const yearGroups = new Map<number, RookieDraft[]>();
  for (const d of drafts) {
    if (d.pos !== pos || d.rookie_round !== round) continue;
    if (!yearGroups.has(d.dynasty_year)) yearGroups.set(d.dynasty_year, []);
    yearGroups.get(d.dynasty_year)!.push(d);
  }

  const results: { year: number; hitRate: number; n: number }[] = [];
  for (const [year, group] of yearGroups) {
    let hits = 0;
    for (const d of group) {
      const seasons = rankMap.get(d.player_id) || [];
      const threshold = getThreshold(outcome, pos);
      const isHit = seasons.some((s) => s.games >= minGames && s.season >= d.rookie_year && s.pos_rank <= threshold);
      if (isHit) hits++;
    }
    results.push({ year, hitRate: group.length > 0 ? hits / group.length : 0, n: group.length });
  }

  return results.sort((a, b) => a.year - b.year);
}

export function computeSurvival(
  drafts: RookieDraft[],
  rankMap: Map<string, RankedSeason[]>,
  groupBy: "pos" | "round",
  outcome: Outcome,
  minGames: number,
  filterPos?: Pos[],
  filterRounds?: number[]
): { group: string; data: { year: number; pct: number }[] }[] {
  const groups = new Map<string, RookieDraft[]>();

  for (const d of drafts) {
    if (filterPos && filterPos.length > 0 && !filterPos.includes(d.pos)) continue;
    if (filterRounds && filterRounds.length > 0 && !filterRounds.includes(d.rookie_round)) continue;
    const key = groupBy === "pos" ? d.pos : `Round ${d.rookie_round}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  const results: { group: string; data: { year: number; pct: number }[] }[] = [];

  for (const [group, gDrafts] of groups) {
    const total = gDrafts.length;
    const data: { year: number; pct: number }[] = [];

    for (let yr = 1; yr <= 6; yr++) {
      let hitsByYear = 0;
      for (const d of gDrafts) {
        const seasons = rankMap.get(d.player_id) || [];
        const threshold = getThreshold(outcome, d.pos);
        const hasHit = seasons.some(
          (s) => s.games >= minGames && s.season >= d.rookie_year && s.season <= d.rookie_year + yr - 1 && s.pos_rank <= threshold
        );
        if (hasHit) hitsByYear++;
      }
      data.push({ year: yr, pct: total > 0 ? hitsByYear / total : 0 });
    }

    results.push({ group, data });
  }

  return results.sort((a, b) => a.group.localeCompare(b.group));
}

export function computePlayerSummaries(
  drafts: RookieDraft[],
  rankMap: Map<string, RankedSeason[]>,
  outcome: Outcome,
  minGames: number
): import("./types").PlayerSummary[] {
  return drafts.map((d) => {
    const seasons = (rankMap.get(d.player_id) || []).sort((a, b) => a.season - b.season);
    const threshold = getThreshold(outcome, d.pos);

    let bestRank = Infinity;
    let bestYear = d.rookie_year;
    let firstHitSeason: number | null = null;

    for (const s of seasons) {
      if (s.pos_rank < bestRank) {
        bestRank = s.pos_rank;
        bestYear = s.season;
      }
      if (firstHitSeason === null && s.games >= minGames && s.pos_rank <= threshold) {
        firstHitSeason = s.season;
      }
    }

    const isElite = seasons.some((s) => s.games >= minGames && s.pos_rank <= 12);
    const isStarter = seasons.some((s) => s.games >= minGames && s.pos_rank <= 24);
    const isFlex = seasons.some((s) => s.games >= minGames && s.pos_rank <= 36);

    let hitType: "elite" | "starter" | "flex" | "bust" = "bust";
    if (isElite) hitType = "elite";
    else if (isStarter) hitType = "starter";
    else if (isFlex) hitType = "flex";

    return {
      player_id: d.player_id,
      player_name: d.player_name,
      pos: d.pos,
      rookie_year: d.rookie_year,
      rookie_round: d.rookie_round,
      rookie_pick: d.rookie_pick,
      best_finish: bestRank <= 999 ? `${d.pos}${bestRank} (${bestYear})` : "N/A",
      best_finish_year: bestYear,
      breakout_year: firstHitSeason !== null ? firstHitSeason - d.rookie_year + 1 : null,
      breakout_time: firstHitSeason !== null ? firstHitSeason - d.rookie_year + 1 : null,
      hit_type: hitType,
      seasons,
    };
  });
}
