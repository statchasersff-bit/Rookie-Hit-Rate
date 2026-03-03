import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeSurvival } from "@/lib/cohort";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Zap, Clock, TrendingUp, ArrowUpRight, Award, Layers } from "lucide-react";

const groupColors = [
  "#0b3a7a", "#d4af37", "#1a5ab8", "#7a9cc7",
  "#b8960e", "#4a7ab8", "#c4a040",
];

interface CohortInsight {
  icon: typeof Zap;
  title: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function generateCohortInsights(
  survivalData: { group: string; data: { year: number; pct: number }[] }[],
  outcomeName: string
): CohortInsight[] {
  if (survivalData.length === 0) return [];

  const insights: CohortInsight[] = [];

  const withY1 = survivalData
    .map((g) => ({ group: g.group, y1: g.data.find((d) => d.year === 1)?.pct ?? 0 }))
    .filter((g) => g.y1 > 0)
    .sort((a, b) => b.y1 - a.y1);

  if (withY1.length > 0) {
    const fastest = withY1[0];
    insights.push({
      icon: Zap,
      title: "Fastest to Hit",
      body: `${fastest.group} players break out the quickest — ${(fastest.y1 * 100).toFixed(1)}% achieve a ${outcomeName.toLowerCase()} finish in their rookie season.${withY1.length > 1 ? ` Compare to ${withY1[withY1.length - 1].group} at just ${(withY1[withY1.length - 1].y1 * 100).toFixed(1)}%.` : ""}`,
      tone: "positive",
    });
  }

  const withCeiling = survivalData
    .map((g) => {
      const maxPct = Math.max(...g.data.map((d) => d.pct));
      return { group: g.group, ceiling: maxPct };
    })
    .sort((a, b) => b.ceiling - a.ceiling);

  if (withCeiling.length > 0) {
    const highest = withCeiling[0];
    const lowest = withCeiling[withCeiling.length - 1];
    insights.push({
      icon: Award,
      title: "Highest Ceiling",
      body: `${highest.group} reaches the highest eventual hit rate of ${(highest.ceiling * 100).toFixed(1)}%.${withCeiling.length > 1 && lowest.ceiling < highest.ceiling ? ` ${lowest.group} tops out at only ${(lowest.ceiling * 100).toFixed(1)}%.` : ""}`,
      tone: "positive",
    });
  }

  const steepestGrowth = survivalData
    .map((g) => {
      const y1 = g.data.find((d) => d.year === 1)?.pct ?? 0;
      const y3 = g.data.find((d) => d.year === 3)?.pct ?? 0;
      return { group: g.group, y1, y3, growth: y3 - y1 };
    })
    .filter((g) => g.growth > 0)
    .sort((a, b) => b.growth - a.growth);

  if (steepestGrowth.length > 0 && steepestGrowth[0].growth > 0.05) {
    const top = steepestGrowth[0];
    insights.push({
      icon: TrendingUp,
      title: "Biggest Year 1–3 Jump",
      body: `${top.group} sees the most development after rookie year — going from ${(top.y1 * 100).toFixed(1)}% in Year 1 to ${(top.y3 * 100).toFixed(1)}% by Year 3, a +${(top.growth * 100).toFixed(1)} point gain. Patience pays off here.`,
      tone: "neutral",
    });
  }

  const plateauGroups = survivalData
    .map((g) => {
      const y3 = g.data.find((d) => d.year === 3)?.pct ?? 0;
      const y6 = g.data.find((d) => d.year === 6)?.pct ?? 0;
      return { group: g.group, y3, y6, lateGrowth: y6 - y3 };
    })
    .filter((g) => g.y3 > 0);

  const earlyPlateau = plateauGroups.filter((g) => g.lateGrowth < 0.03 && g.y3 > 0.1);
  if (earlyPlateau.length > 0) {
    const names = earlyPlateau.map((g) => g.group).join(", ");
    insights.push({
      icon: Clock,
      title: "Early Plateau",
      body: `${names} essentially plateau${earlyPlateau.length === 1 ? "s" : ""} by Year 3 — very little additional breakout happens after that. If they haven't hit by then, they likely won't.`,
      tone: "negative",
    });
  }

  const lateBloomers = plateauGroups.filter((g) => g.lateGrowth >= 0.08);
  if (lateBloomers.length > 0) {
    const names = lateBloomers.map((g) => g.group).join(", ");
    insights.push({
      icon: ArrowUpRight,
      title: "Late Bloomers",
      body: `${names} continue${lateBloomers.length === 1 ? "s" : ""} to develop well past Year 3 — gaining ${lateBloomers.map((g) => `+${(g.lateGrowth * 100).toFixed(1)}`).join(", ")} points between Years 3 and 6. Hold these assets longer before cutting.`,
      tone: "neutral",
    });
  }

  if (survivalData.length >= 3) {
    const y6Sorted = survivalData
      .map((g) => ({ group: g.group, y6: g.data.find((d) => d.year === 6)?.pct ?? 0 }))
      .sort((a, b) => b.y6 - a.y6);
    const spread = y6Sorted[0].y6 - y6Sorted[y6Sorted.length - 1].y6;
    if (spread > 0.15) {
      insights.push({
        icon: Layers,
        title: "Wide Separation",
        body: `There's a ${(spread * 100).toFixed(1)} percentage point gap between the best group (${y6Sorted[0].group}, ${(y6Sorted[0].y6 * 100).toFixed(1)}%) and worst (${y6Sorted[y6Sorted.length - 1].group}, ${(y6Sorted[y6Sorted.length - 1].y6 * 100).toFixed(1)}%). Draft capital matters significantly here.`,
        tone: "neutral",
      });
    }
  }

  return insights;
}

export function CohortSurvivalChart() {
  const { filteredDrafts, rankMap, filters } = useData();
  const [groupBy, setGroupBy] = useState<"pos" | "round">("pos");

  const survivalData = useMemo(
    () =>
      computeSurvival(
        filteredDrafts,
        rankMap,
        groupBy,
        filters.outcome,
        filters.minGames,
        filters.positions.length > 0 ? filters.positions : undefined,
        filters.rounds.length > 0 ? filters.rounds : undefined
      ),
    [filteredDrafts, rankMap, groupBy, filters]
  );

  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";

  const insights = useMemo(
    () => generateCohortInsights(survivalData, outcomeName),
    [survivalData, outcomeName]
  );

  const chartData = useMemo(() => {
    if (survivalData.length === 0) return [];
    const years = [1, 2, 3, 4, 5, 6];
    return years.map((yr) => {
      const entry: Record<string, number> = { year: yr };
      for (const group of survivalData) {
        const d = group.data.find((d) => d.year === yr);
        entry[group.group] = d?.pct ?? 0;
      }
      return entry;
    });
  }, [survivalData]);

  return (
    <div className="space-y-4" data-testid="cohort-survival-chart">
      <div>
        <h2 className="text-xl font-bold text-[#0b3a7a] dark:text-white">Time to Breakout</h2>
        <div className="w-12 h-[3px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 mt-1 rounded-full" />
        <p className="text-sm text-muted-foreground mt-1">
          Cumulative % who have achieved first{" "}
          {filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex"} hit by years after entering the league
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Group By</label>
          <div className="flex gap-1">
            <button
              onClick={() => setGroupBy("pos")}
              data-testid="survival-group-pos"
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                groupBy === "pos"
                  ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                  : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
              }`}
            >
              Position
            </button>
            <button
              onClick={() => setGroupBy("round")}
              data-testid="survival-group-round"
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                groupBy === "round"
                  ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                  : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
              }`}
            >
              Round
            </button>
          </div>
        </div>
      </div>

      <div className="h-[350px] bg-card rounded-lg p-4 border border-[#0b3a7a]/5 dark:border-[#d4af37]/10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{ value: "Years After Entry", position: "insideBottom", offset: -5, fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              domain={[0, "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#0b3a7a] text-white p-2 rounded-md text-xs shadow-lg">
                    <div className="font-bold text-[#d4af37]">Year {label}</div>
                    {payload.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span>{p.name}: {(p.value * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {survivalData.map((group, idx) => (
              <Line
                key={group.group}
                type="monotone"
                dataKey={group.group}
                stroke={groupColors[idx % groupColors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={group.group}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {insights.length > 0 && (
        <div data-testid="cohort-analysis">
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
                  data-testid={`cohort-insight-${idx}`}
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
