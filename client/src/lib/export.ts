import type { CohortSummary, Filters } from "./types";

export function exportCohortCSV(cohorts: CohortSummary[], filters: Filters): string {
  const headers = [
    "Position", "Round", "Years", "Total_Players", "Hits", "Hit_Rate",
    "Elite_Rate", "Starter_Rate", "Flex_Rate", "Bust_Rate",
    "Median_Breakout", "Year1_Hit_Pct", "Year2_Hit_Pct", "Year3Plus_Hit_Pct",
    "CI_Lower", "CI_Upper", "Format", "Scoring", "Outcome", "Min_Games"
  ];

  const rows = cohorts.map((c) => [
    c.pos,
    c.rookie_round,
    `${filters.yearStart}-${filters.yearEnd}`,
    c.total,
    c.hits,
    (c.hit_rate * 100).toFixed(1),
    (c.elite_rate * 100).toFixed(1),
    (c.starter_rate * 100).toFixed(1),
    (c.flex_rate * 100).toFixed(1),
    (c.bust_rate * 100).toFixed(1),
    c.median_breakout ?? "N/A",
    (c.hit_by_year.year1 * 100).toFixed(1),
    (c.hit_by_year.year2 * 100).toFixed(1),
    (c.hit_by_year.year3_plus * 100).toFixed(1),
    (c.ci_lower * 100).toFixed(1),
    (c.ci_upper * 100).toFixed(1),
    filters.format,
    filters.scoring,
    filters.outcome,
    filters.minGames,
  ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
