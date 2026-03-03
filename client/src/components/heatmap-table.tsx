import { useMemo } from "react";
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

function getHeatColor(rate: number, isDark: boolean): string {
  if (rate >= 0.7) return isDark ? "bg-[#d4af37]/30 text-[#d4af37]" : "bg-[#d4af37]/20 text-[#0b3a7a]";
  if (rate >= 0.5) return isDark ? "bg-[#0b3a7a]/60 text-white" : "bg-[#0b3a7a]/20 text-[#0b3a7a]";
  if (rate >= 0.3) return isDark ? "bg-[#0b3a7a]/40 text-blue-200" : "bg-[#0b3a7a]/10 text-[#0b3a7a]";
  if (rate >= 0.15) return isDark ? "bg-[#0b3a7a]/20 text-blue-300" : "bg-[#0b3a7a]/5 text-[#0b3a7a]/70";
  return isDark ? "bg-slate-800/50 text-slate-400" : "bg-slate-50 text-slate-400";
}

function getBorderGlow(rate: number): string {
  if (rate >= 0.7) return "ring-2 ring-[#d4af37]/50";
  if (rate >= 0.5) return "ring-1 ring-[#0b3a7a]/20 dark:ring-[#d4af37]/20";
  return "";
}

function getConfidenceDot(cohort: CohortSummary): { color: string; label: string } {
  if (cohort.total >= 20) return { color: "bg-emerald-500", label: "High confidence" };
  if (cohort.total >= 10) return { color: "bg-amber-400", label: "Moderate confidence" };
  return { color: "bg-red-400", label: "Low confidence (small sample)" };
}

export function HeatmapTable() {
  const { cohorts, filters, setHoveredCell, setSelectedCell, hoveredCell } = useData();

  const cohortMap = useMemo(() => {
    const map = new Map<string, CohortSummary>();
    for (const c of cohorts) {
      map.set(`${c.pos}-${c.rookie_round}`, c);
    }
    return map;
  }, [cohorts]);

  const positions = filters.positions.length > 0 ? allPositions.filter((p) => filters.positions.includes(p)) : allPositions;
  const rounds = filters.rounds.length > 0 ? allRounds.filter((r) => filters.rounds.includes(r)) : allRounds;

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="w-full" data-testid="heatmap-table">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#0b3a7a] dark:text-white">
          Rookie Hit Rates
        </h2>
        <div className="w-12 h-[3px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 mt-1 rounded-full" />
        <p className="text-sm text-muted-foreground mt-1">
          By position x round + time-to-breakout ({filters.yearStart}–{filters.yearEnd})
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Pos</th>
              {rounds.map((r) => (
                <th key={r} className="p-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
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
                  <td className="p-2">
                    <span className={`inline-flex items-center justify-center w-10 h-7 text-xs font-bold rounded-full ${pc.bg} ${pc.text} ${pc.darkBg} ${pc.darkText}`}>
                      {pos}
                    </span>
                  </td>
                  {rounds.map((round) => {
                    const cohort = cohortMap.get(`${pos}-${round}`);
                    const rate = cohort?.hit_rate ?? 0;
                    const isHovered = hoveredCell?.pos === pos && hoveredCell?.round === round;
                    const conf = cohort ? getConfidenceDot(cohort) : null;
                    const lowOpacity = cohort && cohort.total < 10 ? "opacity-75" : "";

                    return (
                      <td key={round} className="p-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={`w-full p-3 rounded-lg cursor-pointer transition-all duration-200 ${getHeatColor(rate, isDark)} ${getBorderGlow(rate)} ${lowOpacity} ${
                                isHovered ? "scale-[1.04] shadow-lg shadow-[#0b3a7a]/15 dark:shadow-[#d4af37]/15 z-10 relative" : "hover:scale-[1.02] hover:shadow-md"
                              }`}
                              onMouseEnter={() => setHoveredCell({ pos, round })}
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => setSelectedCell({ pos, round })}
                              data-testid={`cell-${pos}-${round}`}
                            >
                              <div className="text-center">
                                <div className="text-lg font-bold tabular-nums">
                                  {cohort ? `${(rate * 100).toFixed(0)}%` : "—"}
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  {conf && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${conf.color} inline-block`} title={conf.label} />
                                  )}
                                  <span className="text-[10px] opacity-70">N={cohort?.total ?? 0}</span>
                                </div>
                                {cohort && (
                                  <div className="text-[9px] opacity-60 mt-0.5 leading-tight">
                                    <span className="text-[#d4af37] dark:text-[#d4af37]">{cohort.elite_hits}E</span>
                                    {" · "}
                                    <span>{cohort.starter_hits}S</span>
                                    {" · "}
                                    <span>{cohort.flex_hits}F</span>
                                    {" · "}
                                    <span className="opacity-80">{cohort.bust_count}B</span>
                                  </div>
                                )}
                                {filters.showConfidence && cohort && cohort.ci_width > 0.4 && (
                                  <AlertCircle className="w-3 h-3 mx-auto mt-0.5 opacity-50" />
                                )}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs p-3 bg-[#0b3a7a] text-white dark:bg-[#0f1d33] border-[#d4af37]/30">
                            {cohort ? (
                              <div className="space-y-1.5 text-xs">
                                <div className="font-bold text-[#d4af37]">{pos} Round {round}</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                                  <span className="opacity-70">Elite (1–12):</span>
                                  <span className="font-medium">{(cohort.elite_rate * 100).toFixed(1)}%</span>
                                  <span className="opacity-70">Starter (13–24):</span>
                                  <span className="font-medium">{(cohort.starter_rate * 100).toFixed(1)}%</span>
                                  <span className="opacity-70">Flex (25–36):</span>
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

      <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
        <span className="font-medium">Hit Rate:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-slate-100 dark:bg-slate-800/50" />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-[#0b3a7a]/10 dark:bg-[#0b3a7a]/20" />
          <span>15%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-[#0b3a7a]/20 dark:bg-[#0b3a7a]/40" />
          <span>30%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-[#0b3a7a]/30 dark:bg-[#0b3a7a]/60" />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm bg-[#d4af37]/30 dark:bg-[#d4af37]/30 ring-1 ring-[#d4af37]/50" />
          <span>70%+</span>
        </div>
        <span className="mx-1">|</span>
        <span className="font-medium">Confidence:</span>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span>High</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /><span>Med</span></div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /><span>Low</span></div>
      </div>
    </div>
  );
}
