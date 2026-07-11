import { useMemo, useState } from "react";
import { PickRangeHeatmap } from "@/components/pick-range-heatmap";
import { useData } from "@/lib/data-context";
import { Crown, TrendingDown, Zap, ShieldAlert, BarChart3, Sparkles, Target, ArrowDownRight } from "lucide-react";
import type { PickRangeCohortSummary } from "@/lib/types";

interface PickRangeInsight {
  icon: typeof Crown;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function generateHeadline(cohorts: PickRangeCohortSummary[], yearStart: number, yearEnd: number): string | null {
  if (cohorts.length === 0) return null;

  const rd1Top = cohorts.filter((c) => c.rookie_round === 1 && c.pickStart === 1 && c.total >= 5);
  const rd1Bottom = cohorts.filter((c) => c.rookie_round === 1 && c.pickStart === 10 && c.total >= 5);

  if (rd1Top.length > 0 && rd1Bottom.length > 0) {
    const topAvg = rd1Top.reduce((s, c) => s + c.hit_rate, 0) / rd1Top.length;
    const botAvg = rd1Bottom.reduce((s, c) => s + c.hit_rate, 0) / rd1Bottom.length;
    if (topAvg > botAvg + 0.15) {
      return `Picks 1.01-1.03 hit at ${(topAvg * 100).toFixed(0)}% vs. ${(botAvg * 100).toFixed(0)}% for picks 1.10-1.12 since ${yearStart}. Where you draft in the round matters.`;
    }
  }

  const best = cohorts.filter((c) => c.total >= 5).sort((a, b) => b.hit_rate - a.hit_rate)[0];
  if (best) {
    return `Picks ${best.rangeLabel} have the highest hit rate at ${(best.hit_rate * 100).toFixed(0)}% (${best.hits}/${best.total}) since ${yearStart}.`;
  }

  return null;
}

function generateInsights(cohorts: PickRangeCohortSummary[], outcomeName: string): PickRangeInsight[] {
  if (cohorts.length < 2) return [];
  const insights: PickRangeInsight[] = [];
  const withData = cohorts.filter((c) => c.total >= 3);

  const totalPlayers = withData.reduce((s, c) => s + c.total, 0);
  const totalHits = withData.reduce((s, c) => s + c.hits, 0);
  const overallRate = totalPlayers > 0 ? totalHits / totalPlayers : 0;
  insights.push({
    icon: BarChart3,
    title: "Overall Hit Rate",
    stat: `${(overallRate * 100).toFixed(1)}%`,
    body: `${totalHits} of ${totalPlayers} rookies achieved a ${outcomeName.toLowerCase()} finish across all pick ranges.`,
    tone: overallRate > 0.3 ? "positive" : overallRate > 0.15 ? "neutral" : "negative",
  });

  if (withData.length > 0) {
    const best = withData.reduce((a, b) => (b.hit_rate > a.hit_rate ? b : a));
    insights.push({
      icon: Crown,
      title: "Best Pick Range",
      stat: `${(best.hit_rate * 100).toFixed(1)}%`,
      body: `${best.pos} picks ${best.rangeLabel} (${best.hits}/${best.total}).${best.elite_rate > 0.2 ? ` ${(best.elite_rate * 100).toFixed(0)}% reach elite.` : ""}`,
      tone: "positive",
    });
  }

  for (const round of [1, 2, 3]) {
    const roundCohorts = withData.filter((c) => c.rookie_round === round && c.total >= 3);
    if (roundCohorts.length < 2) continue;
    const top3 = roundCohorts.filter((c) => c.pickStart === 1);
    const late = roundCohorts.filter((c) => c.pickStart === 10);
    if (top3.length > 0 && late.length > 0) {
      const topRate = top3.reduce((s, c) => s + c.hit_rate * c.total, 0) / top3.reduce((s, c) => s + c.total, 0);
      const lateRate = late.reduce((s, c) => s + c.hit_rate * c.total, 0) / late.reduce((s, c) => s + c.total, 0);
      const diff = topRate - lateRate;
      if (Math.abs(diff) > 0.1) {
        insights.push({
          icon: diff > 0 ? Target : ArrowDownRight,
          title: `Rd ${round} Drop-off`,
          stat: `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(0)}pp`,
          body: `Picks ${round}.01-${round}.03 hit at ${(topRate * 100).toFixed(0)}% vs ${(lateRate * 100).toFixed(0)}% for ${round}.10-${round}.12.`,
          tone: diff > 0.2 ? "negative" : "neutral",
        });
        break;
      }
    }
  }

  const fastBreakers = withData
    .filter((c) => c.hit_by_year.year1 > 0.5 && c.hits >= 3)
    .sort((a, b) => b.hit_by_year.year1 - a.hit_by_year.year1);
  if (fastBreakers.length > 0) {
    const top = fastBreakers[0];
    insights.push({
      icon: Zap,
      title: "Instant Impact Range",
      stat: `${(top.hit_by_year.year1 * 100).toFixed(0)}% Year 1`,
      body: `${top.pos} picks ${top.rangeLabel} — most hits break out immediately as rookies.`,
      tone: "positive",
    });
  }

  const highBust = withData
    .filter((c) => c.bust_rate > 0.75 && c.total >= 5)
    .sort((a, b) => b.bust_rate - a.bust_rate);
  if (highBust.length > 0) {
    const names = highBust.slice(0, 3).map((c) => `${c.pos} ${c.rangeLabel} (${(c.bust_rate * 100).toFixed(0)}%)`).join(", ");
    insights.push({
      icon: ShieldAlert,
      title: "High Bust Ranges",
      stat: `${(highBust[0].bust_rate * 100).toFixed(0)}%+`,
      body: `${names}. Pick placement within the round matters.`,
      tone: "negative",
    });
  }

  const worst = withData.filter((c) => c.total >= 5).sort((a, b) => a.hit_rate - b.hit_rate)[0];
  if (worst && worst.hit_rate < 0.15) {
    insights.push({
      icon: TrendingDown,
      title: "Toughest Range",
      stat: `${((1 - worst.hit_rate) * 100).toFixed(0)}% Miss`,
      body: `${worst.pos} picks ${worst.rangeLabel} — only ${worst.hits}/${worst.total} ever hit at ${outcomeName.toLowerCase()} level.`,
      tone: "negative",
    });
  }

  return insights;
}

export default function PickRange() {
  const { pickRangeCohorts, filters } = useData();
  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";
  const [focusRound, setFocusRound] = useState<number | null>(null);

  const validRounds = filters.rounds.length > 0 ? [1, 2, 3, 4, 5].filter((r) => filters.rounds.includes(r)) : [1, 2, 3, 4, 5];
  const effectiveFocusRound = focusRound !== null && validRounds.includes(focusRound) ? focusRound : null;

  const insights = useMemo(
    () => generateInsights(pickRangeCohorts, outcomeName),
    [pickRangeCohorts, outcomeName]
  );

  const headline = useMemo(
    () => generateHeadline(pickRangeCohorts, filters.yearStart, filters.yearEnd),
    [pickRangeCohorts, filters.yearStart, filters.yearEnd]
  );

  return (
    <div className="space-y-6" data-testid="page-pick-range">
      <PickRangeHeatmap focusRound={effectiveFocusRound} onFocusRoundChange={setFocusRound} />

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
        <div data-testid="pick-range-analysis">
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
                  data-testid={`pick-range-insight-${idx}`}
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
