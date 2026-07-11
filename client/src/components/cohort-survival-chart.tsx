import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeSurvival, type SurvivalGroup } from "@/lib/cohort";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { Zap, Clock, TrendingUp, ArrowUpRight, Award, Layers, Sparkles, Timer, ShieldCheck } from "lucide-react";
import type { Pos } from "@/lib/types";

const posGroupColors: Record<string, string> = {
  QB: "#dc2626",
  RB: "#059669",
  WR: "#2563eb",
  TE: "#d4af37",
};

const roundGroupColors: Record<string, string> = {
  "Round 1": "#0b3a7a",
  "Round 2": "#2563eb",
  "Round 3": "#d4af37",
  "Round 4": "#9333ea",
  "Round 5": "#059669",
};

const posPillColors: Record<string, string> = {
  QB: "bg-red-600 text-white dark:bg-red-500",
  RB: "bg-emerald-600 text-white dark:bg-emerald-500",
  WR: "bg-blue-600 text-white dark:bg-blue-500",
  TE: "bg-[#d4af37] text-[#0a1628] dark:bg-[#d4af37]",
};

interface CohortInsight {
  icon: typeof Zap;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function computePatienceIndex(group: SurvivalGroup): number {
  const y1 = group.data.find((d) => d.year === 1)?.pct ?? 0;
  const ceiling = Math.max(...group.data.map((d) => d.pct), 0.001);
  if (ceiling === 0) return 100;
  const y1Share = y1 / ceiling;
  return Math.round((1 - y1Share) * 100);
}

function generateCohortInsights(
  survivalData: SurvivalGroup[],
  outcomeName: string
): CohortInsight[] {
  if (survivalData.length === 0) return [];
  const insights: CohortInsight[] = [];

  const withY1 = survivalData
    .map((g) => ({ group: g.group, n: g.n, y1: g.data.find((d) => d.year === 1)?.pct ?? 0 }))
    .filter((g) => g.y1 > 0)
    .sort((a, b) => b.y1 - a.y1);

  if (withY1.length > 0) {
    const fastest = withY1[0];
    insights.push({
      icon: Zap,
      title: "Fastest to Hit",
      stat: `${(fastest.y1 * 100).toFixed(1)}% Year 1`,
      body: `${fastest.group} (N=${fastest.n}) breaks out fastest.${withY1.length > 1 ? ` ${withY1[withY1.length - 1].group}: just ${(withY1[withY1.length - 1].y1 * 100).toFixed(1)}%.` : ""}`,
      tone: "positive",
    });
  }

  const withCeiling = survivalData
    .map((g) => ({ group: g.group, n: g.n, ceiling: Math.max(...g.data.map((d) => d.pct)) }))
    .sort((a, b) => b.ceiling - a.ceiling);

  if (withCeiling.length > 0) {
    const highest = withCeiling[0];
    const lowest = withCeiling[withCeiling.length - 1];
    insights.push({
      icon: Award,
      title: "Highest Ceiling",
      stat: `${(highest.ceiling * 100).toFixed(1)}%`,
      body: `${highest.group} leads long-term (N=${highest.n}).${withCeiling.length > 1 && lowest.ceiling < highest.ceiling ? ` ${lowest.group} caps at ${(lowest.ceiling * 100).toFixed(1)}%.` : ""}`,
      tone: "positive",
    });
  }

  const deltaAfter3 = survivalData
    .map((g) => {
      const y3 = g.data.find((d) => d.year === 3)?.pct ?? 0;
      const y6 = g.data.find((d) => d.year === 6)?.pct ?? 0;
      return { group: g.group, y3, y6, delta: y6 - y3 };
    })
    .filter((g) => g.y3 > 0)
    .sort((a, b) => b.delta - a.delta);

  if (deltaAfter3.length > 0 && deltaAfter3[0].delta > 0.02) {
    const top = deltaAfter3[0];
    insights.push({
      icon: TrendingUp,
      title: "Post-Year 3 Growth",
      stat: `+${(top.delta * 100).toFixed(1)}pts`,
      body: `${top.group}: ${(top.y3 * 100).toFixed(1)}% → ${(top.y6 * 100).toFixed(1)}% between Years 3–6. Patience rewarded.`,
      tone: "neutral",
    });
  }

  const earlyPlateau = deltaAfter3.filter((g) => g.delta < 0.03 && g.y3 > 0.1);
  if (earlyPlateau.length > 0) {
    insights.push({
      icon: Clock,
      title: "Early Plateau",
      stat: `Year 3`,
      body: `${earlyPlateau.map((g) => g.group).join(", ")} plateau by Year 3. If they haven't hit, they likely won't.`,
      tone: "negative",
    });
  }

  const lateBloomers = deltaAfter3.filter((g) => g.delta >= 0.08);
  if (lateBloomers.length > 0) {
    insights.push({
      icon: ArrowUpRight,
      title: "Late Bloomers",
      stat: `+${lateBloomers.map((g) => `${(g.delta * 100).toFixed(1)}`).join(", ")}pts`,
      body: `${lateBloomers.map((g) => g.group).join(", ")} develop well past Year 3. Hold longer before cutting.`,
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
        stat: `${(spread * 100).toFixed(1)}pt gap`,
        body: `${y6Sorted[0].group} (${(y6Sorted[0].y6 * 100).toFixed(1)}%) vs ${y6Sorted[y6Sorted.length - 1].group} (${(y6Sorted[y6Sorted.length - 1].y6 * 100).toFixed(1)}%). Draft capital matters.`,
        tone: "neutral",
      });
    }
  }

  return insights;
}

function generateHeadline(survivalData: SurvivalGroup[], outcomeName: string): string | null {
  if (survivalData.length < 2) return null;

  const withCeiling = survivalData
    .map((g) => ({ group: g.group, n: g.n, ceiling: Math.max(...g.data.map((d) => d.pct)) }))
    .sort((a, b) => b.ceiling - a.ceiling);

  const highest = withCeiling[0];
  const lowest = withCeiling[withCeiling.length - 1];
  const diff = highest.ceiling - lowest.ceiling;

  if (diff > 0.15) {
    return `${highest.group} eventually hits at ${(highest.ceiling * 100).toFixed(0)}% — ${(diff * 100).toFixed(0)} points higher than ${lowest.group}. Draft capital creates meaningful separation.`;
  }

  const patience = survivalData.map((g) => ({ group: g.group, pi: computePatienceIndex(g) })).sort((a, b) => b.pi - a.pi);
  if (patience[0].pi > 70) {
    return `${patience[0].group} has a Patience Index of ${patience[0].pi} — most hits come after Year 1. Hold these assets.`;
  }

  return null;
}

export function CohortSurvivalChart() {
  const { filteredDrafts, rankMap, filters } = useData();
  const [groupBy, setGroupBy] = useState<"pos" | "round">("pos");
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null);

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

  const headline = useMemo(
    () => generateHeadline(survivalData, outcomeName),
    [survivalData, outcomeName]
  );

  const patienceData = useMemo(
    () => survivalData.map((g) => ({ group: g.group, n: g.n, pi: computePatienceIndex(g) })).sort((a, b) => b.pi - a.pi),
    [survivalData]
  );

  const rosterOdds = useMemo(() => {
    return survivalData.map((g) => {
      const y1 = g.data.find((d) => d.year === 1)?.pct ?? 0;
      const y2 = g.data.find((d) => d.year === 2)?.pct ?? 0;
      const y3 = g.data.find((d) => d.year === 3)?.pct ?? 0;
      const ceiling = Math.max(...g.data.map((d) => d.pct), 0.001);
      return {
        group: g.group,
        n: g.n,
        afterY1: ceiling > 0 ? Math.max(0, ((ceiling - y1) / ceiling) * ceiling * 100) : 0,
        afterY2: ceiling > 0 ? Math.max(0, ((ceiling - y2) / ceiling) * ceiling * 100) : 0,
        afterY3: ceiling > 0 ? Math.max(0, ((ceiling - y3) / ceiling) * ceiling * 100) : 0,
        y1, y2, y3, ceiling,
      };
    });
  }, [survivalData]);

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

  const getColor = (group: string) => {
    if (groupBy === "pos") return posGroupColors[group] || "#0b3a7a";
    return roundGroupColors[group] || "#0b3a7a";
  };

  return (
    <div className="space-y-4" data-testid="cohort-survival-chart">
      <div>
        <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Time to Breakout</h2>
        <div className="scff-accent-bar mt-1.5" />
        <p className="text-sm text-muted-foreground mt-1">
          Cumulative % who have achieved first {outcomeName} hit by years after entering the league
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Group By</label>
          <div className="flex gap-1">
            <button
              onClick={() => { setGroupBy("pos"); setHighlightGroup(null); }}
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
              onClick={() => { setGroupBy("round"); setHighlightGroup(null); }}
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
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Focus</label>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setHighlightGroup(null)}
              className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                highlightGroup === null
                  ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                  : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
              }`}
              data-testid="survival-focus-all"
            >
              All
            </button>
            {survivalData.map((g) => (
              <button
                key={g.group}
                onClick={() => setHighlightGroup(highlightGroup === g.group ? null : g.group)}
                data-testid={`survival-focus-${g.group.toLowerCase().replace(/\s/g, "-")}`}
                className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                  highlightGroup === g.group
                    ? (groupBy === "pos" && posPillColors[g.group]
                      ? posPillColors[g.group] + " border-transparent"
                      : "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]")
                    : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                }`}
              >
                {g.group} <span className="opacity-60">(N={g.n})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[350px] bg-card rounded-lg p-4 border border-[#0b3a7a]/5 dark:border-[#d4af37]/10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
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
            <ReferenceLine x={3} stroke="#d4af37" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "Year 3", position: "top", fontSize: 9, fill: "#d4af37" }} />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#0b3a7a] text-white p-3 rounded-lg text-xs shadow-xl min-w-[140px]">
                    <div className="font-bold text-[#d4af37] text-sm mb-1">Year {label}</div>
                    {payload
                      .filter((p: any) => p.value != null)
                      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
                      .map((p: any, i: number) => {
                        const sg = survivalData.find((s) => s.group === p.name);
                        const yd = sg?.data.find((d: any) => d.year === label);
                        return (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                              <span>{p.name}</span>
                              <span className="opacity-50 text-[10px]">(N={sg?.n ?? "?"})</span>
                            </span>
                            <span className="font-bold">{(p.value * 100).toFixed(1)}%</span>
                          </div>
                        );
                      })}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => {
                const sg = survivalData.find((s) => s.group === value);
                return `${value} (N=${sg?.n ?? "?"})`;
              }}
            />
            {survivalData.map((group) => {
              const isHighlighted = highlightGroup === null || highlightGroup === group.group;
              return (
                <Line
                  key={group.group}
                  type="monotone"
                  dataKey={group.group}
                  stroke={getColor(group.group)}
                  strokeWidth={isHighlighted ? (highlightGroup === group.group ? 3.5 : 2.5) : 1}
                  strokeOpacity={isHighlighted ? 1 : 0.2}
                  dot={{ r: isHighlighted ? 4 : 2, fill: getColor(group.group), strokeWidth: isHighlighted ? 1.5 : 0, stroke: "#fff" }}
                  name={group.group}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {headline && (
        <div className="flex items-start gap-3 rounded-xl border border-[#d4af37]/35 bg-accent/60 px-4 py-3.5 shadow-card" data-testid="cohort-headline">
          <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-[#0b3a7a] dark:text-[#d4af37]">{headline}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-card p-3" data-testid="patience-index">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-[#d4af37]" />
            <span className="text-xs font-bold text-[#0b3a7a] dark:text-white">Patience Index</span>
            <span className="text-[9px] text-muted-foreground ml-auto">% of hits after Year 1</span>
          </div>
          <div className="space-y-1.5">
            {patienceData.map((p) => (
              <div key={p.group} className="flex items-center gap-2">
                <span className="text-[10px] font-medium w-16 text-muted-foreground">{p.group}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${p.pi}%`,
                      backgroundColor: getColor(p.group),
                      opacity: p.pi > 70 ? 1 : p.pi > 40 ? 0.7 : 0.4,
                    }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: getColor(p.group) }}>{p.pi}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#0b3a7a]/10 dark:border-[#d4af37]/10 bg-card p-3" data-testid="roster-decision-aid">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#0b3a7a] dark:text-[#d4af37]" />
            <span className="text-xs font-bold text-[#0b3a7a] dark:text-white">Roster Decision Aid</span>
          </div>
          <div className="text-[10px] text-muted-foreground mb-1.5">If player hasn't hit by end of...</div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-semibold py-0.5">Group</th>
                <th className="text-right font-semibold py-0.5">After Y1</th>
                <th className="text-right font-semibold py-0.5">After Y2</th>
                <th className="text-right font-semibold py-0.5">After Y3</th>
              </tr>
            </thead>
            <tbody>
              {rosterOdds.map((r) => (
                <tr key={r.group} className="border-t border-muted/30">
                  <td className="py-1 font-medium" style={{ color: getColor(r.group) }}>{r.group}</td>
                  <td className="py-1 text-right tabular-nums">{r.ceiling > 0 ? `${((r.ceiling - r.y1) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-1 text-right tabular-nums">{r.ceiling > 0 ? `${((r.ceiling - r.y2) * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-1 text-right tabular-nums">{r.ceiling > 0 ? `${((r.ceiling - r.y3) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[9px] text-muted-foreground mt-1 opacity-70">
            % = remaining odds of eventual hit given no hit by that year
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span className="font-semibold">Delta After Year 3:</span>
        {survivalData.map((g) => {
          const y3 = g.data.find((d) => d.year === 3)?.pct ?? 0;
          const y6 = g.data.find((d) => d.year === 6)?.pct ?? 0;
          const delta = y6 - y3;
          return (
            <span key={g.group} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(g.group) }} />
              <span className="font-medium" style={{ color: getColor(g.group) }}>{g.group}:</span>
              <span className={delta > 0.02 ? "text-emerald-600 dark:text-emerald-400" : ""}>{delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}%</span>
            </span>
          );
        })}
      </div>

      {insights.length > 0 && (
        <div data-testid="cohort-analysis">
          <h3 className="scff-title text-base text-[#0b1634] dark:text-white mb-1.5">Analysis</h3>
          <div className="scff-accent-bar scff-accent-bar--sm mb-3" />
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
              const statColor =
                insight.tone === "positive"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : insight.tone === "negative"
                    ? "text-red-600 dark:text-red-400"
                    : "text-[#0b3a7a] dark:text-[#d4af37]";

              return (
                <div key={idx} className={`rounded-lg border p-3 ${toneClasses}`} data-testid={`cohort-insight-${idx}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{insight.title}</span>
                  </div>
                  <div className={`text-2xl font-[850] tracking-tight tabular-nums ${statColor}`}>{insight.stat}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{insight.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
