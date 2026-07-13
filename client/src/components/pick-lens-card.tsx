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
      <Card className="shadow-card h-full w-full flex flex-col" data-testid="pick-lens-empty">
        <CardContent className="p-6 text-center flex-1 flex flex-col items-center justify-center">
          <div className="grid place-items-center h-10 w-10 rounded-full bg-accent text-[#b99120] dark:text-[#d4af37] mb-2">
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

  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";
  const lowSample = cohort.total < 10;

  return (
    <Card className="shadow-card h-full w-full flex flex-col" data-testid="pick-lens-card">
      <CardHeader className="pb-1.5 px-3.5 pt-3.5">
        <div>
          <span className="scff-eyebrow">Pick Lens</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-md ${posColors[cohort.pos as Pos] || ""}`}>
              {cohort.pos}
            </span>
            <h3 className="text-sm font-bold text-[#0b1634] dark:text-white">
              {cohort.pos} · Round {cohort.rookie_round}
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
            {filters.yearStart}–{filters.yearEnd} · {cohort.total} players
          </p>
          {lowSample && (
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/40">
              Low sample · Directional only
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3.5 pb-3.5 space-y-2.5 flex-1 flex flex-col">
        <div className="grid grid-cols-2 gap-1.5">
          <StatBlock label="Top-12" value={`${(cohort.elite_rate * 100).toFixed(1)}%`} accent />
          <StatBlock label="Top-24" value={`${(cohort.starter_rate * 100).toFixed(1)}%`} />
          <StatBlock label="Top-36" value={`${(cohort.flex_rate * 100).toFixed(1)}%`} />
          <StatBlock label="Bust" value={`${(cohort.bust_rate * 100).toFixed(1)}%`} negative />
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted/30 dark:bg-muted/20 px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Med. Breakout</span>
          <span className="text-sm font-bold tabular-nums text-[#0b3a7a] dark:text-white">
            {cohort.median_breakout ? `Yr ${cohort.median_breakout.toFixed(1)}` : "N/A"}
          </span>
        </div>

        <div className="text-[11px] text-muted-foreground text-center tabular-nums">
          <span className="text-[#b99120] dark:text-[#d4af37] font-semibold">{cohort.elite_hits} Top-12</span>
          {" · "}{cohort.starter_hits} Top-24{" · "}{cohort.flex_hits} Top-36{" · "}
          <span className="text-red-500 dark:text-red-400">{cohort.bust_count} bust</span>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
            {outcomeName} Hit by Year
          </h4>
          <div className="flex-1 min-h-[96px]">
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
    <div className="bg-muted/30 dark:bg-muted/20 rounded-md px-2 py-1.5 text-center">
      <div
        className={`text-lg font-bold tabular-nums leading-none ${
          accent
            ? "text-[#d4af37]"
            : negative
              ? "text-red-500 dark:text-red-400"
              : "text-[#0b3a7a] dark:text-white"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">{label}</div>
    </div>
  );
}
