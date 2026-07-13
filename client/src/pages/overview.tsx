import { useMemo } from "react";
import { HeatmapTable } from "@/components/heatmap-table";
import { PickLensCard } from "@/components/pick-lens-card";
import PickRange from "@/pages/pick-range";
import { SnapshotStat } from "@/components/SnapshotStat";
import { useData } from "@/lib/data-context";
import { Crown, TrendingDown, Zap, Clock, ShieldAlert, BarChart3 } from "lucide-react";
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
    tone: overallRate > 0.3 ? "positive" : overallRate > 0.15 ? "neutral" : "negative",
    accent: "slate",
  });

  const withHits = cohorts.filter((c) => c.total >= 5);
  if (withHits.length > 0) {
    const best = withHits.reduce((a, b) => (b.hit_rate > a.hit_rate ? b : a));
    insights.push({
      icon: Crown,
      title: "Best Cohort",
      stat: `${(best.hit_rate * 100).toFixed(1)}%`,
      body: `${best.pos} Round ${best.rookie_round} (${best.hits}/${best.total} players).${best.elite_rate > 0.2 ? ` ${(best.elite_rate * 100).toFixed(0)}% reach Top-12.` : ""}`,
      tone: "positive",
      accent: "gold",
    });

    const worst = withHits.reduce((a, b) => (b.hit_rate < a.hit_rate ? b : a));
    if (worst.hit_rate < best.hit_rate) {
      const missRate = 1 - worst.hit_rate;
      insights.push({
        icon: TrendingDown,
        title: "Toughest Cohort",
        stat: `${(missRate * 100).toFixed(0)}% Miss`,
        body: `${worst.pos} Round ${worst.rookie_round} — only ${worst.hits}/${worst.total} players hit at the ${outcomeName.toLowerCase()} threshold.`,
        tone: "negative",
        accent: "red",
      });
    }
  }

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
      tone: "positive",
      accent: "slate",
    });
  }

  const slowBreakers = withHits
    .filter((c) => c.hit_by_year.year3_plus > 0.4 && c.hits >= 3)
    .sort((a, b) => b.hit_by_year.year3_plus - a.hit_by_year.year3_plus);
  if (slowBreakers.length > 0) {
    const top = slowBreakers[0];
    insights.push({
      icon: Clock,
      title: "Slow Developers",
      stat: `Year 3+`,
      body: `${top.pos} Rd${top.rookie_round} — ${(top.hit_by_year.year3_plus * 100).toFixed(0)}% of hits don't break out until Year 3 or later.`,
      tone: "neutral",
      accent: "slate",
    });
  }

  const highBust = withHits
    .filter((c) => c.bust_rate > 0.7 && c.total >= 10)
    .sort((a, b) => b.bust_rate - a.bust_rate);
  if (highBust.length > 0) {
    const names = highBust.slice(0, 3).map((c) => `${c.pos} Rd${c.rookie_round} (${(c.bust_rate * 100).toFixed(0)}%)`).join(", ");
    insights.push({
      icon: ShieldAlert,
      title: "High Bust Zones",
      stat: `${(highBust[0].bust_rate * 100).toFixed(0)}%+`,
      body: `${names}. Manage expectations from these slots.`,
      tone: "negative",
      accent: "red",
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

  return (
    <div className="space-y-5" data-testid="page-overview">
      {insights.length > 0 && (
        <div data-testid="overview-analysis">
          <div className="mt-2 grid grid-cols-2 gap-2 min-[521px]:gap-2.5 min-[521px]:[grid-template-columns:repeat(auto-fit,minmax(175px,1fr))] md:[grid-template-columns:repeat(auto-fit,minmax(195px,1fr))]">
            {insights.slice(0, 4).map((insight, idx) => (
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

      <HeatmapTable aside={<PickLensCard />} />

      <PickRange />
    </div>
  );
}
