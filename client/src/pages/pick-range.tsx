import { useMemo } from "react";
import { PickRangeHeatmap } from "@/components/pick-range-heatmap";
import { SnapshotStat } from "@/components/SnapshotStat";
import { useData } from "@/lib/data-context";
import { Crown, TrendingDown, Zap, ShieldAlert, Target, ArrowDownRight } from "lucide-react";
import type { KpiAccent } from "@/lib/kpiCardStyle";
import type { PickRangeCohortSummary } from "@/lib/types";

interface PickRangeInsight {
  icon: typeof Crown;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
  accent: KpiAccent;
}

const toneContextColor: Record<PickRangeInsight["tone"], string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-slate-400",
};

function generateInsights(cohorts: PickRangeCohortSummary[], outcomeName: string): PickRangeInsight[] {
  if (cohorts.length < 2) return [];
  const insights: PickRangeInsight[] = [];
  // Sample-size floor: tiny pick-range cohorts would distort the best/worst
  // rankings below. (The Overall Hit Rate headline lives on the Overview card.)
  const withData = cohorts.filter((c) => c.total >= 3);

  if (withData.length > 0) {
    const best = withData.reduce((a, b) => (b.hit_rate > a.hit_rate ? b : a));
    insights.push({
      icon: Crown,
      title: "Best Pick Range",
      stat: `${(best.hit_rate * 100).toFixed(1)}%`,
      body: `${best.pos} picks ${best.rangeLabel} (${best.hits}/${best.total}).${best.elite_rate > 0.2 ? ` ${(best.elite_rate * 100).toFixed(0)}% reach Top-12.` : ""}`,
      tone: "positive",
      accent: "emerald",
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
          accent: "violet",
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
      accent: "gold",
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
      accent: "red",
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
      accent: "rose",
    });
  }

  return insights;
}

export default function PickRange() {
  const { pickRangeCohorts, filters } = useData();
  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";

  const insights = useMemo(
    () => generateInsights(pickRangeCohorts, outcomeName),
    [pickRangeCohorts, outcomeName]
  );

  return (
    <div className="space-y-6" data-testid="page-pick-range">
      {insights.length > 0 && (
        <div data-testid="pick-range-analysis">
          <div className="grid grid-cols-2 gap-2 min-[521px]:gap-3 min-[521px]:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] md:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {insights.map((insight, idx) => (
              <SnapshotStat
                key={idx}
                label={insight.title}
                value={insight.stat}
                context={insight.body}
                contextColor={toneContextColor[insight.tone]}
                icon={insight.icon}
                accent={insight.accent}
                testId={`pick-range-insight-${idx}`}
              />
            ))}
          </div>
        </div>
      )}

      <PickRangeHeatmap />
    </div>
  );
}
