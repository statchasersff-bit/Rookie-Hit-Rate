import { useMemo, useState } from "react";
import { HeatmapTable } from "@/components/heatmap-table";
import { PickLensCard } from "@/components/pick-lens-card";
import { PickRangeHeatmap } from "@/components/pick-range-heatmap";
import { SnapshotStat } from "@/components/SnapshotStat";
import { useData } from "@/lib/data-context";
import { Crown, Zap, BarChart3, Trophy, ArrowDownWideNarrow } from "lucide-react";
import type { KpiAccent } from "@/lib/kpiCardStyle";
import type { CohortSummary } from "@/lib/types";

interface OverviewInsight {
  icon: typeof Crown;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
  accent: KpiAccent;
}

const toneContextColor: Record<OverviewInsight["tone"], string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

function generateOverviewInsights(cohorts: CohortSummary[], outcomeName: string): OverviewInsight[] {
  if (cohorts.length < 2) return [];
  const insights: OverviewInsight[] = [];

  const totalPlayers = cohorts.reduce((s, c) => s + c.total, 0);
  const totalHits = cohorts.reduce((s, c) => s + c.hits, 0);
  const overallRate = totalPlayers > 0 ? totalHits / totalPlayers : 0;
  insights.push({
    icon: BarChart3,
    title: "Overall Hit Rate",
    stat: `${(overallRate * 100).toFixed(1)}%`,
    body: `${totalHits} of ${totalPlayers} rookies reached the ${outcomeName.toLowerCase()} threshold.`,
    tone: "neutral",
    accent: "slate",
  });

  const byPosition = new Map<string, { hits: number; total: number }>();
  for (const c of cohorts) {
    const agg = byPosition.get(c.pos) ?? { hits: 0, total: 0 };
    agg.hits += c.hits;
    agg.total += c.total;
    byPosition.set(c.pos, agg);
  }
  const positionRates = Array.from(byPosition.entries())
    .filter(([, v]) => v.total > 0)
    .map(([pos, v]) => ({ pos, hits: v.hits, total: v.total, rate: v.hits / v.total }));
  if (positionRates.length > 1) {
    const bestPos = positionRates.reduce((a, b) => (b.rate > a.rate ? b : a));
    insights.push({
      icon: Trophy,
      title: "Highest Position Hit Rate",
      stat: `${(bestPos.rate * 100).toFixed(1)}%`,
      body: `${bestPos.pos} hits most often: ${bestPos.hits}/${bestPos.total} rookies reached the ${outcomeName.toLowerCase()} threshold.`,
      tone: "neutral",
      accent: "gold",
    });

    const worstPos = positionRates.reduce((a, b) => (b.rate < a.rate ? b : a));
    if (worstPos.pos !== bestPos.pos) {
      insights.push({
        icon: ArrowDownWideNarrow,
        title: "Lowest Position Hit Rate",
        stat: `${(worstPos.rate * 100).toFixed(1)}%`,
        body: `${worstPos.pos} hits least often: ${worstPos.hits}/${worstPos.total} rookies reached the ${outcomeName.toLowerCase()} threshold.`,
        tone: "neutral",
        accent: "red",
      });
    }
  }

  const withHits = cohorts.filter((c) => c.total >= 5);

  const fastBreakers = withHits
    .filter((c) => c.hit_by_year.year1 > 0.4 && c.hits >= 3)
    .sort((a, b) => b.hit_by_year.year1 - a.hit_by_year.year1);
  if (fastBreakers.length > 0) {
    const top = fastBreakers[0];
    insights.push({
      icon: Zap,
      title: "Rookie-Year Impact",
      stat: `${(top.hit_by_year.year1 * 100).toFixed(0)}% Year 1`,
      body: `${top.pos} Rd${top.rookie_round} hits break out immediately.${fastBreakers.length > 1 ? ` ${fastBreakers[1].pos} Rd${fastBreakers[1].rookie_round}: ${(fastBreakers[1].hit_by_year.year1 * 100).toFixed(0)}%.` : ""}`,
      tone: "neutral",
      accent: "slate",
    });
  }

  return insights;
}

export default function Overview() {
  const { cohorts, filters } = useData();
  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";

  const insights = useMemo(
    () => generateOverviewInsights(cohorts, outcomeName),
    [cohorts, outcomeName]
  );

  const [tableView, setTableView] = useState<"hitRates" | "pickRange">("hitRates");

  const viewToggle = (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-[var(--sc-card-soft)] border border-[var(--sc-border)] p-1 shrink-0"
      role="tablist"
      aria-label="Table view"
    >
      {([["hitRates", "Simple"], ["pickRange", "Detailed"]] as const).map(([val, label]) => {
        const active = tableView === val;
        return (
          <button
            key={val}
            role="tab"
            aria-selected={active}
            onClick={() => setTableView(val)}
            data-testid={`toggle-${val}`}
            className={`whitespace-nowrap px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70 ${
              active
                ? "bg-[#d4af37] text-[#0b1634] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5" data-testid="page-overview">
      {insights.length > 0 && (
        <div data-testid="overview-analysis" className="-mt-5">
          <div className="mt-2 grid grid-cols-2 gap-2 min-[521px]:gap-2.5 min-[521px]:[grid-template-columns:repeat(auto-fit,minmax(175px,1fr))] md:[grid-template-columns:repeat(auto-fit,minmax(195px,1fr))]">
            {insights.slice(0, 6).map((insight, idx) => (
              <SnapshotStat
                key={idx}
                label={insight.title}
                value={insight.stat}
                context={insight.body}
                contextColor={toneContextColor[insight.tone]}
                icon={insight.icon}
                accent={insight.accent}
                testId={`overview-insight-${idx}`}
              />
            ))}
          </div>
        </div>
      )}

      {tableView === "hitRates" ? (
        <HeatmapTable aside={<PickLensCard />} headerActions={viewToggle} />
      ) : (
        <PickRangeHeatmap headerActions={viewToggle} />
      )}
    </div>
  );
}
