import { useMemo, type ReactNode } from "react";
import { useData } from "@/lib/data-context";
import { AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Pos, CohortSummary } from "@/lib/types";

const allPositions: Pos[] = ["QB", "RB", "WR", "TE"];
const allRounds = [1, 2, 3, 4, 5];

const posColors: Record<Pos, { bg: string; text: string; darkBg: string; darkText: string }> = {
  QB: { bg: "bg-red-600", text: "text-white", darkBg: "dark:bg-red-500", darkText: "dark:text-white" },
  RB: { bg: "bg-emerald-600", text: "text-white", darkBg: "dark:bg-emerald-500", darkText: "dark:text-white" },
  WR: { bg: "bg-blue-600", text: "text-white", darkBg: "dark:bg-blue-500", darkText: "dark:text-white" },
  TE: { bg: "bg-[#d4af37]", text: "text-[#0a1628]", darkBg: "dark:bg-[#d4af37]", darkText: "dark:text-[#0a1628]" },
};

// Color scale with clearly stepped tiers:
// 0–14% very pale gray · 15–29% pale blue · 30–49% medium blue · 50–69% strong blue · 70%+ soft gold
function getHeatColor(rate: number, isDark: boolean): string {
  if (rate >= 0.7) return isDark ? "bg-[#d4af37]/30 text-[#d4af37]" : "bg-[#d4af37]/25 text-[#0b3a7a]";
  if (rate >= 0.5) return isDark ? "bg-[#0b3a7a]/75 text-white" : "bg-[#0b3a7a]/35 text-[#0b3a7a]";
  if (rate >= 0.3) return isDark ? "bg-[#0b3a7a]/45 text-blue-100" : "bg-[#0b3a7a]/18 text-[#0b3a7a]";
  if (rate >= 0.15) return isDark ? "bg-[#0b3a7a]/22 text-blue-300" : "bg-[#0b3a7a]/8 text-[#0b3a7a]/70";
  return isDark ? "bg-slate-800/40 text-slate-400" : "bg-slate-100 text-slate-400";
}

function isLowConfidence(cohort: CohortSummary): boolean {
  return cohort.total < 10;
}

// Border treatment communicates reliability, not just magnitude:
// low-sample cells get a dashed amber border so a high % can't masquerade as the strongest data point.
function getCellBorder(rate: number, cohort: CohortSummary): string {
  if (isLowConfidence(cohort)) return "border-2 border-dashed border-amber-400/70 dark:border-amber-400/60";
  if (rate >= 0.7) return "ring-2 ring-[#d4af37]/50";
  if (rate >= 0.5) return "ring-1 ring-[#0b3a7a]/20 dark:ring-[#d4af37]/20";
  return "";
}

function getConfidenceDot(cohort: CohortSummary): { color: string; label: string } {
  if (cohort.total >= 20) return { color: "bg-emerald-500", label: "High confidence" };
  if (cohort.total >= 10) return { color: "bg-amber-400", label: "Moderate confidence" };
  return { color: "bg-red-400", label: "Low confidence (small sample)" };
}

export function HeatmapTable({ aside }: { aside?: ReactNode }) {
  const { cohorts, filters, setHoveredCell, setSelectedCell, hoveredCell, selectedCell } = useData();

  const cohortMap = useMemo(() => {
    const map = new Map<string, CohortSummary>();
    for (const c of cohorts) {
      map.set(`${c.pos}-${c.rookie_round}`, c);
    }
    return map;
  }, [cohorts]);

  // The Pick Lens panel falls back to the first cohort when nothing is explicitly
  // selected, so mirror that here to keep the highlighted cell and the panel in sync.
  const effectiveSelected = selectedCell ?? (cohorts[0]
    ? { pos: cohorts[0].pos as Pos, round: cohorts[0].rookie_round }
    : null);

  // The Overview tab always spans every position and round (those filters are
  // hidden), so the heatmap ignores any selection carried over from other tabs.
  const positions = allPositions;
  const rounds = allRounds;

  const isDark = document.documentElement.classList.contains("dark");

  // Mirror the outcome threshold used in cohort.ts (Top-12, Top-24, Top-36) so the
  // subtitle can state what the % actually measures.
  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";
  const outcomeThreshold = filters.outcome === "elite" ? 12 : filters.outcome === "starter" ? 24 : 36;

  return (
    <div className="w-full lg:w-fit" data-testid="heatmap-table">
      <div className="mb-3.5">
        <h2 className="scff-title text-[clamp(1.15rem,2.2vw,1.45rem)] text-[#0b1634] dark:text-white">
          Rookie Hit Rates
        </h2>
        <div className="scff-accent-bar mt-1.5" />
        <p className="text-[13px] text-muted-foreground mt-2 max-w-2xl">
          <span className="font-semibold text-foreground">Hit Rate</span> = share of rookies who reached a{" "}
          {outcomeName}-or-better finish (top {outcomeThreshold} at their position), by rookie draft round · {filters.yearStart}–{filters.yearEnd}.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-6">
        <div className="overflow-x-auto lg:flex-none">
        <table className="border-collapse border border-border">
          <thead>
            <tr className="bg-[#0b1634]">
              <th className="text-left px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white w-12" />
              {rounds.map((r) => (
                <th key={r} className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-white text-center">
                  Rd {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const pc = posColors[pos];
              return (
                <tr key={pos}>
                  <td className="px-1.5 py-1 align-middle">
                    <span className={`inline-flex items-center justify-center w-9 h-8 text-xs font-bold rounded-lg shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${pc.bg} ${pc.text} ${pc.darkBg} ${pc.darkText}`}>
                      {pos}
                    </span>
                  </td>
                  {rounds.map((round) => {
                    const cohort = cohortMap.get(`${pos}-${round}`);
                    const rate = cohort?.hit_rate ?? 0;
                    const isHovered = hoveredCell?.pos === pos && hoveredCell?.round === round;
                    const isSelected = cohort != null && effectiveSelected?.pos === pos && effectiveSelected?.round === round;
                    const conf = cohort ? getConfidenceDot(cohort) : null;
                    const lowConf = cohort ? isLowConfidence(cohort) : false;
                    // Dampen the fill on low-sample cells so a high % doesn't read as the strongest signal.
                    const lowOpacity = lowConf ? "opacity-60" : "";
                    // A selected cell reads from its border + inner shadow + corner dot (no in-cell
                    // "Selected" text), so it's obvious which cell the Pick Lens panel reflects
                    // without adding height. This overrides the rate-based border.
                    const selectedRing = isSelected
                      ? "ring-2 ring-[#0b3a7a] dark:ring-[#d4af37] shadow-[0_2px_8px_rgba(11,59,120,0.14)] dark:shadow-[0_2px_8px_rgba(212,175,55,0.14)] z-10"
                      : "";

                    return (
                      <td key={round} className="px-1 py-1 align-middle">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`relative flex flex-col items-center justify-center w-full min-w-[128px] h-[62px] px-2 rounded-md cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b3a7a]/60 dark:focus-visible:ring-[#d4af37]/60 focus-visible:z-10 ${getHeatColor(rate, isDark)} ${cohort && !isSelected ? getCellBorder(rate, cohort) : ""} ${selectedRing} ${lowOpacity} ${
                                isHovered ? "scale-[1.01] shadow-sm z-10" : "hover:shadow-sm"
                              }`}
                              onMouseEnter={() => setHoveredCell({ pos, round })}
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => setSelectedCell({ pos, round })}
                              data-testid={`cell-${pos}-${round}`}
                              aria-pressed={isSelected}
                            >
                              {isSelected && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0b3a7a] dark:bg-[#d4af37]" aria-hidden="true" />
                              )}
                              <div className="text-base font-bold tabular-nums leading-none">
                                {cohort ? `${(rate * 100).toFixed(0)}%` : "—"}
                              </div>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                {conf && (
                                  <span className={`w-1.5 h-1.5 rounded-full ${conf.color} inline-block`} title={conf.label} />
                                )}
                                <span className={`text-[10px] tabular-nums ${lowConf ? "font-semibold text-amber-600 dark:text-amber-400" : "opacity-70"}`}>
                                  n={cohort?.total ?? 0}
                                </span>
                                {filters.showConfidence && cohort && cohort.ci_width > 0.4 && (
                                  <AlertCircle className="w-2.5 h-2.5 opacity-50" />
                                )}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs p-3 bg-[#0b3a7a] text-white dark:bg-[#0f1d33] border-[#d4af37]/30">
                            {cohort ? (
                              <div className="space-y-1.5 text-xs">
                                <div className="font-bold text-[#d4af37]">{pos} Round {round}</div>
                                <div className="text-[10px] opacity-80 -mt-0.5">
                                  {cohort.elite_hits} Top-12 · {cohort.starter_hits} Top-24 · {cohort.flex_hits} Top-36 · {cohort.bust_count} bust
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                  <span className="opacity-70">Top-12 (1–12):</span>
                                  <span className="font-medium">{(cohort.elite_rate * 100).toFixed(1)}%</span>
                                  <span className="opacity-70">Top-24 (13–24):</span>
                                  <span className="font-medium">{(cohort.starter_rate * 100).toFixed(1)}%</span>
                                  <span className="opacity-70">Top-36 (25–36):</span>
                                  <span className="font-medium">{(cohort.flex_rate * 100).toFixed(1)}%</span>
                                  <span className="opacity-70">Bust (37+):</span>
                                  <span className="font-medium">{(cohort.bust_rate * 100).toFixed(1)}%</span>
                                  <span className="opacity-70">Sample:</span>
                                  <span className="font-medium flex items-center gap-1">
                                    N={cohort.total}
                                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${getConfidenceDot(cohort).color}`} />
                                  </span>
                                  <span className="opacity-70">Median Breakout:</span>
                                  <span className="font-medium">Year {cohort.median_breakout?.toFixed(1) ?? "—"}</span>
                                </div>
                                {cohort.ci_width > 0 && (
                                  <div className="text-[10px] opacity-60 pt-0.5">
                                    95% CI: {(cohort.ci_lower * 100).toFixed(1)}%–{(cohort.ci_upper * 100).toFixed(1)}%
                                  </div>
                                )}
                                {isLowConfidence(cohort) && (
                                  <div className="flex items-start gap-1.5 mt-1 pt-1.5 border-t border-amber-400/30 text-[10px] text-amber-300">
                                    <AlertCircle className="w-3 h-3 mt-px shrink-0" />
                                    <span>
                                      High hit rate but a small sample (N={cohort.total}). Treat this as directional, not predictive.
                                    </span>
                                  </div>
                                )}
                                <div className="pt-1 border-t border-white/20">
                                  <div className="opacity-70 mb-0.5">Hit by Year:</div>
                                  <div className="flex gap-2">
                                    <span>Y1: {(cohort.hit_by_year.year1 * 100).toFixed(0)}%</span>
                                    <span>Y2: {(cohort.hit_by_year.year2 * 100).toFixed(0)}%</span>
                                    <span>Y3+: {(cohort.hit_by_year.year3_plus * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span>No data</span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        {aside && (
          <div className="w-full lg:w-[300px] shrink-0 flex">
            {aside}
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-muted-foreground/90">Scale</span>
          <div className="flex items-center gap-0.5">
            <span className="w-3.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800/40" title="0%" />
            <span className="w-3.5 h-2.5 rounded-sm bg-[#0b3a7a]/8 dark:bg-[#0b3a7a]/22" title="15%" />
            <span className="w-3.5 h-2.5 rounded-sm bg-[#0b3a7a]/18 dark:bg-[#0b3a7a]/45" title="30%" />
            <span className="w-3.5 h-2.5 rounded-sm bg-[#0b3a7a]/35 dark:bg-[#0b3a7a]/75" title="50%" />
            <span className="w-3.5 h-2.5 rounded-sm bg-[#d4af37]/25 dark:bg-[#d4af37]/30 ring-1 ring-[#d4af37]/50" title="70%+" />
          </div>
          <span className="tabular-nums opacity-80">0 · 15 · 30 · 50 · 70%+</span>
        </div>
        <span className="hidden sm:inline opacity-30">|</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground/90">Confidence</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />High</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Med</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Low</span>
          <span className="inline-flex items-center gap-1"><span className="w-3.5 h-2.5 rounded-sm border border-dashed border-amber-400/70" />Low sample</span>
        </div>
      </div>

      <p className="flex items-start gap-1.5 mt-1.5 text-[11px] text-muted-foreground/70 max-w-2xl">
        <AlertCircle className="w-3 h-3 mt-px shrink-0 text-amber-500" />
        <span>Low-confidence cells (dashed border) use smaller samples — treat them as directional, not predictive.</span>
      </p>
    </div>
  );
}
