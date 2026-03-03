import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
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
      <Card className="border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-card" data-testid="pick-lens-empty">
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Hover or click a cell to explore cohort details
        </CardContent>
      </Card>
    );
  }

  const hitByYearData = [
    { name: "Year 1", value: cohort.hit_by_year.year1, fill: "#0b3a7a" },
    { name: "Year 2", value: cohort.hit_by_year.year2, fill: "#1a5ab8" },
    { name: "Year 3+", value: cohort.hit_by_year.year3_plus, fill: "#d4af37" },
  ];

  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";

  return (
    <Card className="border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-card" data-testid="pick-lens-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div>
          <h3 className="text-sm font-bold text-[#0b3a7a] dark:text-[#d4af37]">
            {cohort.pos} Round {cohort.rookie_round}
          </h3>
          <div className="w-8 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 mt-0.5 rounded-full" />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {filters.yearStart}–{filters.yearEnd} ({cohort.total} players)
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <StatBlock label="Elite Rate" value={`${(cohort.elite_rate * 100).toFixed(1)}%`} accent />
          <StatBlock label="Starter Rate" value={`${(cohort.starter_rate * 100).toFixed(1)}%`} />
          <StatBlock label="Flex Rate" value={`${(cohort.flex_rate * 100).toFixed(1)}%`} />
          <StatBlock label="Bust Rate" value={`${(cohort.bust_rate * 100).toFixed(1)}%`} negative />
          <StatBlock label="Med. Breakout" value={cohort.median_breakout ? `Yr ${cohort.median_breakout.toFixed(1)}` : "N/A"} />
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            {outcomeName} Hit by Year
          </h4>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitByYearData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {hitByYearData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
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
  );
}

function StatBlock({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className="bg-muted/30 dark:bg-muted/20 rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div
        className={`text-lg font-bold tabular-nums ${
          accent
            ? "text-[#d4af37]"
            : negative
              ? "text-red-500 dark:text-red-400"
              : "text-[#0b3a7a] dark:text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
