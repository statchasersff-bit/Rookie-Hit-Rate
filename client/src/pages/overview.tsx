import { useMemo } from "react";
import { HeatmapTable } from "@/components/heatmap-table";
import { PickLensCard } from "@/components/pick-lens-card";
import { useData } from "@/lib/data-context";
import { Crown, TrendingDown, Zap, Clock, ShieldAlert, BarChart3 } from "lucide-react";
import type { CohortSummary } from "@/lib/types";

interface OverviewInsight {
  icon: typeof Crown;
  title: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function generateOverviewInsights(cohorts: CohortSummary[], outcomeName: string): OverviewInsight[] {
  if (cohorts.length < 2) return [];
  const insights: OverviewInsight[] = [];

  const totalPlayers = cohorts.reduce((s, c) => s + c.total, 0);
  const totalHits = cohorts.reduce((s, c) => s + c.hits, 0);
  const overallRate = totalPlayers > 0 ? totalHits / totalPlayers : 0;
  insights.push({
    icon: BarChart3,
    title: "Overall Hit Rate",
    body: `Across all filtered cohorts, ${totalHits} of ${totalPlayers} rookies (${(overallRate * 100).toFixed(1)}%) achieved a ${outcomeName.toLowerCase()} finish. ${overallRate > 0.3 ? "A solid overall rate." : overallRate > 0.15 ? "Roughly 1 in 5–6 picks connects." : "Most picks at this threshold don't hit."}`,
    tone: overallRate > 0.3 ? "positive" : overallRate > 0.15 ? "neutral" : "negative",
  });

  const withHits = cohorts.filter((c) => c.total >= 5);
  if (withHits.length > 0) {
    const best = withHits.reduce((a, b) => (b.hit_rate > a.hit_rate ? b : a));
    insights.push({
      icon: Crown,
      title: "Best Cohort",
      body: `${best.pos} Round ${best.rookie_round} has the highest hit rate at ${(best.hit_rate * 100).toFixed(1)}% (${best.hits}/${best.total} players).${best.elite_rate > 0.2 ? ` ${(best.elite_rate * 100).toFixed(0)}% reach elite status.` : ""}`,
      tone: "positive",
    });

    const worst = withHits.reduce((a, b) => (b.hit_rate < a.hit_rate ? b : a));
    if (worst.hit_rate < best.hit_rate) {
      insights.push({
        icon: TrendingDown,
        title: "Toughest Cohort",
        body: `${worst.pos} Round ${worst.rookie_round} has the lowest hit rate at ${(worst.hit_rate * 100).toFixed(1)}% (${worst.hits}/${worst.total}).${worst.bust_rate > 0.8 ? ` Over ${(worst.bust_rate * 100).toFixed(0)}% of these picks bust.` : ""}`,
        tone: "negative",
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
      body: `${top.pos} Round ${top.rookie_round} hits contribute immediately — ${(top.hit_by_year.year1 * 100).toFixed(0)}% of their successful players break out in Year 1.${fastBreakers.length > 1 ? ` ${fastBreakers[1].pos} Rd${fastBreakers[1].rookie_round} is close at ${(fastBreakers[1].hit_by_year.year1 * 100).toFixed(0)}%.` : ""}`,
      tone: "positive",
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
      body: `${top.pos} Round ${top.rookie_round} players need patience — ${(top.hit_by_year.year3_plus * 100).toFixed(0)}% of hits don't break out until Year 3 or later. Don't cut these assets too early.`,
      tone: "neutral",
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
      body: `These cohorts have the steepest bust rates: ${names}. Manage expectations when drafting from these slots.`,
      tone: "negative",
    });
  }

  return insights;
}

export default function Overview() {
  const { cohorts, filters } = useData();
  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";

  const insights = useMemo(
    () => generateOverviewInsights(cohorts, outcomeName),
    [cohorts, outcomeName]
  );

  return (
    <div className="space-y-6" data-testid="page-overview">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <HeatmapTable />
        </div>
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-36">
            <PickLensCard />
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div data-testid="overview-analysis">
          <h3 className="text-sm font-bold text-[#0b3a7a] dark:text-white mb-1">Analysis</h3>
          <div className="w-8 h-[2px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 rounded-full mb-3" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              const toneClasses =
                insight.tone === "positive"
                  ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : insight.tone === "negative"
                    ? "border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20"
                    : "border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-card";
              const iconColor =
                insight.tone === "positive"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : insight.tone === "negative"
                    ? "text-red-500 dark:text-red-400"
                    : "text-[#0b3a7a] dark:text-[#d4af37]";

              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${toneClasses}`}
                  data-testid={`overview-insight-${idx}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                    <span className="text-xs font-bold text-foreground">{insight.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
