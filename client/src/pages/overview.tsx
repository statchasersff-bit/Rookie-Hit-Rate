import { useMemo } from "react";
import { HeatmapTable } from "@/components/heatmap-table";
import { PickLensCard } from "@/components/pick-lens-card";
import { useData } from "@/lib/data-context";
import { Crown, TrendingDown, Zap, Clock, ShieldAlert, BarChart3, Sparkles } from "lucide-react";
import type { CohortSummary } from "@/lib/types";

interface OverviewInsight {
  icon: typeof Crown;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function generateHeadline(cohorts: CohortSummary[], yearStart: number, yearEnd: number, outcomeName: string): string | null {
  if (cohorts.length === 0) return null;

  const candidates: string[] = [];

  const highBust = cohorts
    .filter((c) => c.total >= 10 && c.bust_rate >= 0.85)
    .sort((a, b) => b.bust_rate - a.bust_rate);
  for (const c of highBust.slice(0, 2)) {
    candidates.push(`Since ${yearStart}, only ${(c.hit_rate * 100).toFixed(0)}% of Round ${c.rookie_round} ${c.pos}s ever produce a ${c.pos}${c.pos === "QB" ? "12" : "24"} season.`);
  }

  const highHit = cohorts
    .filter((c) => c.total >= 8 && c.elite_rate >= 0.3)
    .sort((a, b) => b.elite_rate - a.elite_rate);
  for (const c of highHit.slice(0, 1)) {
    candidates.push(`${(c.elite_rate * 100).toFixed(0)}% of Round ${c.rookie_round} ${c.pos}s drafted since ${yearStart} have produced a top-12 positional season.`);
  }

  const y1Dominators = cohorts
    .filter((c) => c.hits >= 5 && c.hit_by_year.year1 >= 0.6)
    .sort((a, b) => b.hit_by_year.year1 - a.hit_by_year.year1);
  for (const c of y1Dominators.slice(0, 1)) {
    candidates.push(`${(c.hit_by_year.year1 * 100).toFixed(0)}% of Round ${c.rookie_round} ${c.pos} hits break out in their rookie season — immediate impact is the norm.`);
  }

  const totalPlayers = cohorts.reduce((s, c) => s + c.total, 0);
  const totalHits = cohorts.reduce((s, c) => s + c.hits, 0);
  const overallRate = totalPlayers > 0 ? totalHits / totalPlayers : 0;
  if (overallRate > 0 && overallRate < 0.25) {
    candidates.push(`Only ${(overallRate * 100).toFixed(0)}% of all rookies drafted from ${yearStart}–${yearEnd} ever produce a ${outcomeName.toLowerCase()} season. Most picks don't hit.`);
  }

  return candidates.length > 0 ? candidates[0] : null;
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
    stat: `${(overallRate * 100).toFixed(1)}%`,
    body: `${totalHits} of ${totalPlayers} rookies achieved a ${outcomeName.toLowerCase()} finish.`,
    tone: overallRate > 0.3 ? "positive" : overallRate > 0.15 ? "neutral" : "negative",
  });

  const withHits = cohorts.filter((c) => c.total >= 5);
  if (withHits.length > 0) {
    const best = withHits.reduce((a, b) => (b.hit_rate > a.hit_rate ? b : a));
    insights.push({
      icon: Crown,
      title: "Best Cohort",
      stat: `${(best.hit_rate * 100).toFixed(1)}%`,
      body: `${best.pos} Round ${best.rookie_round} (${best.hits}/${best.total} players).${best.elite_rate > 0.2 ? ` ${(best.elite_rate * 100).toFixed(0)}% reach elite.` : ""}`,
      tone: "positive",
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

  const headline = useMemo(
    () => generateHeadline(cohorts, filters.yearStart, filters.yearEnd, outcomeName),
    [cohorts, filters.yearStart, filters.yearEnd, outcomeName]
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

      {headline && (
        <div
          className="flex items-start gap-3 rounded-xl border border-[#d4af37]/35 bg-accent/60 px-4 py-3.5 shadow-card"
          data-testid="headline-banner"
          aria-live="polite"
        >
          <span className="grid place-items-center h-7 w-7 shrink-0 rounded-lg bg-[#d4af37]/20 text-[#b99120] dark:text-[#d4af37]">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <span className="scff-eyebrow text-[#b99120] dark:text-[#d4af37]">Key takeaway</span>
            <p className="text-sm font-semibold text-[#0b1634] dark:text-white leading-snug mt-0.5">
              {headline}
            </p>
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div data-testid="overview-analysis">
          <span className="scff-eyebrow">Breakdown</span>
          <h3 className="scff-title text-lg text-[#0b1634] dark:text-white mt-0.5">Analysis</h3>
          <div className="scff-accent-bar scff-accent-bar--sm mt-1.5 mb-3" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              const toneClasses =
                insight.tone === "positive"
                  ? "border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-card"
                  : insight.tone === "negative"
                    ? "border border-red-200 dark:border-red-800/40 bg-red-50/60 dark:bg-red-950/20 shadow-card"
                    : "scff-card";
              const iconColor =
                insight.tone === "positive"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : insight.tone === "negative"
                    ? "text-red-500 dark:text-red-400"
                    : "text-[#0b3a7a] dark:text-[#d4af37]";
              const statColor =
                insight.tone === "positive"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : insight.tone === "negative"
                    ? "text-red-600 dark:text-red-400"
                    : "text-[#0b3a7a] dark:text-[#d4af37]";

              return (
                <div
                  key={idx}
                  className={`rounded-xl p-3.5 ${toneClasses}`}
                  data-testid={`overview-insight-${idx}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
                    <span className="scff-eyebrow">{insight.title}</span>
                  </div>
                  <div className={`text-2xl font-[850] tracking-tight tabular-nums ${statColor}`}>{insight.stat}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{insight.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
