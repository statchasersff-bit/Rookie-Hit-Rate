import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeSurvival, type SurvivalGroup } from "@/lib/cohort";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { SnapshotStat } from "@/components/SnapshotStat";
import { Zap, Clock, TrendingUp, ArrowUpRight, Award, Layers, Timer, ShieldCheck } from "lucide-react";
import type { KpiAccent } from "@/lib/kpiCardStyle";
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

interface CohortInsight {
  icon: typeof Zap;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
  accent: KpiAccent;
}

const toneContextColor: Record<CohortInsight["tone"], string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-slate-400",
};

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
      accent: "gold",
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
      accent: "emerald",
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
      accent: "sky",
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
      accent: "rose",
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
      accent: "violet",
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
        accent: "blue",
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

  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";

  const insights = useMemo(
    () => generateCohortInsights(survivalData, outcomeName),
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

  const { sortedRoster, rosterTakeaway } = useMemo(() => {
    const withRem = rosterOdds.map((r) => ({ ...r, remY3: Math.max(0, r.ceiling - r.y3) }));
    const sorted = [...withRem].sort((a, b) => b.remY3 - a.remY3);
    if (sorted.length === 0) return { sortedRoster: [], rosterTakeaway: "" };
    const bottom = sorted[sorted.length - 1];
    const strong = sorted.filter((r) => r.remY3 >= 0.06).map((r) => r.group);
    const lead =
      strong.length >= 2
        ? `${strong.slice(0, 2).join(" and ")} remain more viable late holds`
        : `${sorted[0].group} remains the most viable late hold`;
    return {
      sortedRoster: sorted,
      rosterTakeaway: `${lead}; ${bottom.group}s lose most of their hit odds after Year 3.`,
    };
  }, [rosterOdds]);

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
      {insights.length > 0 && (
        <div data-testid="cohort-analysis">
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
                testId={`cohort-insight-${idx}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Time to Breakout</h2>
          <div className="scff-accent-bar mt-1.5" />
          <p className="text-sm text-muted-foreground mt-1">
            Cumulative % who have achieved first {outcomeName} hit by years after entering the league
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <button
              onClick={() => setGroupBy("pos")}
              data-testid="survival-group-pos"
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                groupBy === "pos"
                  ? "bg-[#d4af37] text-[#0a1628] border-[#d4af37]"
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
                  ? "bg-[#d4af37] text-[#0a1628] border-[#d4af37]"
                  : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
              }`}
            >
              Round
            </button>
          </div>
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
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
              verticalAlign="top"
              align="center"
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
              formatter={(value: string) => {
                const sg = survivalData.find((s) => s.group === value);
                return `${value} (N=${sg?.n ?? "?"})`;
              }}
            />
            {survivalData.map((group) => (
              <Line
                key={group.group}
                type="monotone"
                dataKey={group.group}
                stroke={getColor(group.group)}
                strokeWidth={2.5}
                strokeOpacity={1}
                dot={{ r: 4, fill: getColor(group.group), strokeWidth: 1.5, stroke: "#fff" }}
                name={group.group}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3" data-testid="patience-roster-module">
        <div>
          <h3 className="scff-title text-[clamp(1.05rem,1.8vw,1.3rem)] text-[#0b1634] dark:text-white">Patience &amp; Roster Decision Aid</h3>
          <p className="text-xs text-muted-foreground mt-0.5">How long should dynasty managers wait before moving on?</p>
        </div>

        <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
          <div data-testid="patience-index">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-[#d4af37]" />
              <span className="text-xs font-bold text-[#0b3a7a] dark:text-white">Patience Index</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">
              Share of eventual hits that came after Year 1 · higher = more patience required before declaring a miss
            </p>
            <div className="space-y-2">
              {patienceData.map((p) => (
                <div key={p.group} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getColor(p.group) }} />
                  <span className="text-[10px] font-semibold w-7 text-[#0b1634] dark:text-white">{p.group}</span>
                  <span className="text-xs font-bold tabular-nums w-9 text-right text-[#0b3a7a] dark:text-[#d4af37]">{p.pi}%</span>
                  <div className="flex-1 max-w-[150px] h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-400 dark:bg-slate-500 transition-all"
                      style={{ width: `${p.pi}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div data-testid="roster-decision-aid">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0b3a7a] dark:text-[#d4af37]" />
              <span className="text-xs font-bold text-[#0b3a7a] dark:text-white">Remaining Hit Odds</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">
              Odds of an eventual {outcomeName} hit if a player has not hit by each season checkpoint
            </p>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium uppercase tracking-wider py-1">Pos</th>
                  <th className="text-right font-medium uppercase tracking-wider py-1">After Y1</th>
                  <th className="text-right font-medium uppercase tracking-wider py-1">After Y2</th>
                  <th className="text-right font-medium uppercase tracking-wider py-1">After Y3</th>
                </tr>
              </thead>
              <tbody>
                {sortedRoster.map((r) => {
                  const cell = (v: number) => (r.ceiling <= 0 ? "—" : `${(Math.max(0, v) * 100).toFixed(1)}%`);
                  const cls = (v: number) =>
                    r.ceiling <= 0
                      ? "text-muted-foreground"
                      : v >= 0.15
                        ? "font-bold text-[#0b3a7a] dark:text-[#d4af37]"
                        : v < 0.05
                          ? "text-muted-foreground/50"
                          : "";
                  return (
                    <tr key={r.group} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded font-bold"
                          style={{ color: getColor(r.group), backgroundColor: `${getColor(r.group)}1f` }}
                        >
                          {r.group}
                        </span>
                      </td>
                      <td className={`py-1.5 text-right tabular-nums ${cls(r.ceiling - r.y1)}`}>{cell(r.ceiling - r.y1)}</td>
                      <td className={`py-1.5 text-right tabular-nums ${cls(r.ceiling - r.y2)}`}>{cell(r.ceiling - r.y2)}</td>
                      <td className={`py-1.5 text-right tabular-nums ${cls(r.ceiling - r.y3)}`}>{cell(r.ceiling - r.y3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {rosterTakeaway && (
          <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
            <span className="font-semibold text-[#0b3a7a] dark:text-[#d4af37]">Key Takeaway:</span> {rosterTakeaway}
          </div>
        )}
      </div>

    </div>
  );
}
