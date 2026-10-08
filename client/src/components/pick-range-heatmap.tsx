import { useMemo, useState, type ReactNode } from "react";
import { useData } from "@/lib/data-context";
import { AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getHeatColor } from "@/lib/heatColor";
import { HeatLegend } from "@/components/heat-legend";
import type { Pos, PickRangeCohortSummary } from "@/lib/types";

const allPositions: Pos[] = ["QB", "RB", "WR", "TE"];
const allRounds = [1, 2, 3, 4, 5];
const pickRanges = [
  { start: 1, end: 3 },
  { start: 4, end: 6 },
  { start: 7, end: 9 },
  { start: 10, end: 12 },
];

const posTextColor: Record<Pos, string> = {
  QB: "#dc2626",
  RB: "#059669",
  WR: "#2563eb",
  TE: "#d4af37",
};

function getBorderGlow(rate: number): string {
  if (rate >= 0.7) return "ring-2 ring-[#d4af37]/50";
  if (rate >= 0.5) return "ring-1 ring-[#0b3a7a]/20 dark:ring-[#d4af37]/20";
  return "";
}

function getConfidenceDot(cohort: PickRangeCohortSummary): { color: string; label: string } {
  if (cohort.total >= 20) return { color: "bg-emerald-500", label: "High confidence" };
  if (cohort.total >= 10) return { color: "bg-amber-400", label: "Moderate confidence" };
  return { color: "bg-red-400", label: "Low confidence (small sample)" };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function PickRangeHeatmap({ headerActions }: { headerActions?: ReactNode }) {
  const { pickRangeCohorts, filters } = useData();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const cohortMap = useMemo(() => {
    const map = new Map<string, PickRangeCohortSummary>();
    for (const c of pickRangeCohorts) {
      map.set(`${c.pos}-${c.rookie_round}-${c.pickStart}`, c);
    }
    return map;
  }, [pickRangeCohorts]);

  // Overview-only: always span every position and round (its Position/Round
  // filters are hidden), ignoring any selection carried over from other tabs.
  const positions = allPositions;
  const visibleRounds = allRounds;

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="w-full" data-testid="pick-range-heatmap">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">
            Pick Range Breakdown
          </h2>
          {headerActions}
        </div>
        <div className="scff-accent-bar mt-1.5" />
        <p className="text-sm text-muted-foreground mt-1">
          Hit rates by 3-pick ranges within each round ({filters.yearStart}–{filters.yearEnd})
        </p>
      </div>

      <div className="overflow-x-auto [container-type:inline-size]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0b1634]">
              <th className="text-center px-1.5 py-1 text-[clamp(8px,1.6cqw,11px)] font-semibold uppercase tracking-wider text-white w-12">POS</th>
              {visibleRounds.map((r, ri) => (
                pickRanges.map((pr, pi) => (
                  <th
                    key={`${r}-${pr.start}`}
                    className={`px-1 py-1 text-[clamp(8px,1.6cqw,11px)] font-semibold uppercase tracking-wider text-white text-center ${
                      pi === 0 && ri > 0 ? "border-l-2 border-[#0b3a7a]/10 dark:border-[#d4af37]/10" : ""
                    }`}
                  >
                    <div className="leading-tight">
                      <div className="text-[clamp(6px,1.3cqw,9px)] opacity-50">Rd {r}</div>
                      <div>{pad(pr.start)}–{pad(pr.end)}</div>
                    </div>
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              return (
                <tr key={pos}>
                  <td className="px-1.5 py-1 align-middle text-center">
                    <span className="text-[clamp(8px,1.7cqw,12px)] font-extrabold" style={{ color: posTextColor[pos] }}>
                      {pos}
                    </span>
                  </td>
                  {visibleRounds.map((round, ri) => (
                    pickRanges.map((pr, pi) => {
                      const cohort = cohortMap.get(`${pos}-${round}-${pr.start}`);
                      const rate = cohort?.hit_rate ?? 0;
                      const cellKey = `${pos}-${round}-${pr.start}`;
                      const isHovered = hoveredKey === cellKey;
                      const conf = cohort ? getConfidenceDot(cohort) : null;
                      const lowOpacity = cohort && cohort.total < 5 ? "opacity-70" : "";

                      return (
                        <td
                          key={cellKey}
                          className={`px-1 py-1 align-middle ${pi === 0 && ri > 0 ? "border-l-2 border-[#0b3a7a]/10 dark:border-[#d4af37]/10" : ""}`}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={`relative flex flex-col items-center justify-center w-full min-w-0 h-[clamp(38px,7.5cqw,53px)] px-[5px] rounded-md cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b3a7a]/60 dark:focus-visible:ring-[#d4af37]/60 focus-visible:z-10 ${getHeatColor(rate, isDark)} ${getBorderGlow(rate)} ${lowOpacity} ${
                                  isHovered ? "scale-[1.01] shadow-sm z-10" : "hover:shadow-sm"
                                }`}
                                onMouseEnter={() => setHoveredKey(cellKey)}
                                onMouseLeave={() => setHoveredKey(null)}
                                data-testid={`cell-pr-${pos}-${round}-${pr.start}`}
                              >
                                <div className="text-[clamp(11px,2.3cqw,16px)] font-bold tabular-nums leading-none">
                                  {cohort ? `${(rate * 100).toFixed(0)}%` : "—"}
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  {conf && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${conf.color} inline-block`} title={conf.label} />
                                  )}
                                  <span className="text-[clamp(7px,1.45cqw,10px)] tabular-nums opacity-70">n={cohort?.total ?? 0}</span>
                                  {filters.showConfidence && cohort && cohort.ci_width > 0.4 && (
                                    <AlertCircle className="w-2.5 h-2.5 opacity-50" />
                                  )}
                                </div>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs p-3 bg-[#0b3a7a] text-white dark:bg-[#0f1d33] border-[#d4af37]/30">
                              {cohort ? (
                                <div className="space-y-1.5 text-xs">
                                  <div className="font-bold text-[#d4af37]">{pos} Picks {round}.{pad(pr.start)}–{round}.{pad(pr.end)}</div>
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
                    })
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <HeatLegend />
    </div>
  );
}
