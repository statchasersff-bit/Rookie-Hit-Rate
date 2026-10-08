import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MousePointerClick } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip as RechartsTooltip } from "recharts";
import type { CohortSummary } from "@/lib/types";

export function PickLensCard() {
  const { cohorts, hoveredCell, selectedCell, filters } = useData();

  const activeCell = hoveredCell || selectedCell;

  const cohort = useMemo<CohortSummary | null>(() => {
    if (!activeCell) return cohorts[0] || null;
    return cohorts.find((c) => c.pos === activeCell.pos && c.rookie_round === activeCell.round) || null;
  }, [cohorts, activeCell]);

  if (!cohort) {
    return (
      <Card className="shadow-card h-full w-full flex flex-col" data-testid="pick-lens-empty">
        <CardContent className="p-6 text-center flex-1 flex flex-col items-center justify-center">
          <div className="grid place-items-center h-10 w-10 rounded-full bg-accent text-[#b99120] dark:text-[#d4af37] mb-2">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Best Finish</p>
          <p className="text-xs text-muted-foreground mt-1">
            Hover or tap any cell in the grid to break down that cohort's outcomes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hitByYearData = [
    { name: "Year 1", value: cohort.hit_by_year.year1, fill: "#0b3a7a" },
    { name: "Year 2", value: cohort.hit_by_year.year2, fill: "#1a5ab8" },
    { name: "Year 3+", value: cohort.hit_by_year.year3_plus, fill: "#d4af37" },
  ];

  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";
  const lowSample = cohort.total < 10;

  return (
    <div className="flex flex-row min-[500px]:flex-col gap-2 h-full w-full" data-testid="pick-lens-card">
      <Card className="shadow-card flex-1 min-w-0 min-[500px]:flex-none">
        <CardHeader className="pb-1 px-1 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="scff-eyebrow ml-1">Best Finish</span>
            <div className="flex items-center gap-2">
              {lowSample && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  Low sample
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-1 pb-2">
          <div className="grid grid-cols-2 gap-1.5">
            <StatBlock label="Top-12" value={`${(cohort.elite_rate * 100).toFixed(1)}%`} accent />
            <StatBlock label="13-24" value={`${(cohort.starter_rate * 100).toFixed(1)}%`} />
            <StatBlock label="25-36" value={`${(cohort.flex_rate * 100).toFixed(1)}%`} />
            <StatBlock label="Bust" value={`${(cohort.bust_rate * 100).toFixed(1)}%`} negative />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card flex-1 min-w-0 flex flex-col">
        <CardContent className="px-1 py-2 space-y-1.5 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 ml-1">
              {outcomeName} Hit by Year
            </h4>
            {/* On mobile the aside stacks (flex-col) with no definite-height
                ancestor, so ResponsiveContainer's height="100%" is circular and
                the chart inflates on first paint — a huge blank gap under the
                Overview tab inside the auto-resizing WP iframe that only settles
                on a re-measure (e.g. a tab switch). Pin a fixed height on mobile;
                keep the flex-fill on desktop where the aside stretches to the
                table height and gives a real definite height. */}
            <div className="h-24 min-h-[40px] min-[500px]:h-auto min-[500px]:flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hitByYearData} barCategoryGap="12%" margin={{ top: 14, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 1]} hide />
                  <RechartsTooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} labelFormatter={(l: string) => l} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                    {hitByYearData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="value" position="top" formatter={(v: number) => `${(v * 100).toFixed(0)}%`} style={{ fontSize: 9, fontWeight: 700, fill: "var(--foreground)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {filters.showConfidence && (
            <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-md p-2">
              <span className="font-medium">95% CI:</span>{" "}
              {(cohort.ci_lower * 100).toFixed(1)}% – {(cohort.ci_upper * 100).toFixed(1)}%
              {cohort.ci_width > 0.4 && (
                <span className="ml-1 text-amber-500 dark:text-amber-400">(low confidence)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className="bg-muted/30 dark:bg-muted/20 rounded-md px-1 py-0.5 text-center">
      <div
        className={`text-[clamp(11px,2.3cqw,16px)] font-bold tabular-nums leading-none ${
          accent
            ? "text-[#d4af37]"
            : negative
              ? "text-red-500 dark:text-red-400"
              : "text-[#0b3a7a] dark:text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-[clamp(7px,1.45cqw,10px)] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">{label}</div>
    </div>
  );
}
