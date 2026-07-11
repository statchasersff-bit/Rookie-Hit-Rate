import { useMemo } from "react";
import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MousePointerClick } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip as RechartsTooltip } from "recharts";
import type { CohortSummary, Pos } from "@/lib/types";

const posColors: Record<Pos, string> = {
  QB: "bg-red-600 text-white dark:bg-red-500",
  RB: "bg-emerald-600 text-white dark:bg-emerald-500",
  WR: "bg-blue-600 text-white dark:bg-blue-500",
  TE: "bg-[#d4af37] text-[#0a1628] dark:bg-[#d4af37]",
};

export function PickLensCard() {
  const { cohorts, hoveredCell, selectedCell, filters } = useData();

  const activeCell = hoveredCell || selectedCell;

  const cohort = useMemo<CohortSummary | null>(() => {
    if (!activeCell) return cohorts[0] || null;
    return cohorts.find((c) => c.pos === activeCell.pos && c.rookie_round === activeCell.round) || null;
  }, [cohorts, activeCell]);

  if (!cohort) {
    return (
      <Card className="shadow-card" data-testid="pick-lens-empty">
        <CardContent className="p-6 text-center">
          <div className="mx-auto grid place-items-center h-10 w-10 rounded-full bg-accent text-[#b99120] dark:text-[#d4af37] mb-2">
            <MousePointerClick className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Pick Lens</p>
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

  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";

  return (
    <Card className="shadow-card" data-testid="pick-lens-card">
      <CardHeader className="pb-2 px-4 pt-4">
        <div>
          <span className="scff-eyebrow">Pick Lens</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full ${posColors[cohort.pos as Pos] || ""}`}>
              {cohort.pos}
            </span>
            <h3 className="text-base font-bold text-[#0b1634] dark:text-white">
              Round {cohort.rookie_round}
            </h3>
          </div>
          <div className="scff-accent-bar scff-accent-bar--sm mt-1.5" />
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            {filters.yearStart}–{filters.yearEnd} · {cohort.total} players
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
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hitByYearData} barCategoryGap="15%">
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
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
