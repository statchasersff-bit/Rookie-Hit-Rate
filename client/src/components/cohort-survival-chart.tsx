import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeSurvival, type SurvivalGroup } from "@/lib/cohort";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { SnapshotStat } from "@/components/SnapshotStat";
import { Zap, Clock, ArrowUpRight, Award } from "lucide-react";
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

// Conditional hit odds: given a player has NOT hit by a checkpoint, the chance
// they still record a first hit at some later point in their career.
//   P(eventually hits | not hit by checkpoint) = (ceiling - Hk) / (1 - Hk)
// where Hk is the cumulative hit share by that checkpoint and `ceiling` is the
// eventual (career) hit rate. Returns a 0–1 fraction; 0 when everyone in the
// group has already hit (denominator 0), so there's no "hasn't hit yet" cohort.
function conditionalHitOdds(ceiling: number, hitByCheckpoint: number): number {
  const notYetHit = 1 - hitByCheckpoint;
  if (notYetHit <= 0) return 0;
  return Math.max(0, (ceiling - hitByCheckpoint) / notYetHit);
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
      stat: fastest.group,
      body: `${(fastest.y1 * 100).toFixed(1)}% by Year 1 (N=${fastest.n}). Breaks out fastest.${withY1.length > 1 ? ` ${withY1[withY1.length - 1].group}: just ${(withY1[withY1.length - 1].y1 * 100).toFixed(1)}%.` : ""}`,
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
      title: "Highest Chance to Hit",
      stat: highest.group,
      body: `${(highest.ceiling * 100).toFixed(1)}% long-term (N=${highest.n}). Leads the field.${withCeiling.length > 1 && lowest.ceiling < highest.ceiling ? ` ${lowest.group} caps at ${(lowest.ceiling * 100).toFixed(1)}%.` : ""}`,
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

  const earlyPlateau = deltaAfter3.filter((g) => g.delta < 0.03 && g.y3 > 0.1);
  if (earlyPlateau.length > 0) {
    insights.push({
      icon: Clock,
      title: "Early Plateau",
      stat: earlyPlateau.map((g) => g.group).join(", "),
      body: `Plateau by Year 3. If they haven't hit, they likely won't.`,
      tone: "negative",
      accent: "rose",
    });
  }

  const lateBloomers = deltaAfter3.filter((g) => g.delta >= 0.08);
  if (lateBloomers.length > 0) {
    insights.push({
      icon: ArrowUpRight,
      title: "Late Bloomers",
      stat: lateBloomers.map((g) => g.group).join(", "),
      body: `+${lateBloomers.map((g) => `${(g.delta * 100).toFixed(1)}`).join(", ")}pts past Year 3, so they develop late. Hold longer before cutting.`,
      tone: "neutral",
      accent: "violet",
    });
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


  // "Doesn't hit as a rookie" = has not hit by year 1, so the conditional odds
  // use the year-1 cumulative share as the checkpoint.
  const patienceData = useMemo(
    () =>
      survivalData
        .map((g) => {
          const y1 = g.data.find((d) => d.year === 1)?.pct ?? 0;
          const ceiling = Math.max(...g.data.map((d) => d.pct), 0);
          return { group: g.group, n: g.n, odds: conditionalHitOdds(ceiling, y1) * 100 };
        })
        .sort((a, b) => b.odds - a.odds),
    [survivalData]
  );

  const rosterOdds = useMemo(() => {
    return survivalData.map((g) => {
      const y1 = g.data.find((d) => d.year === 1)?.pct ?? 0;
      const y2 = g.data.find((d) => d.year === 2)?.pct ?? 0;
      const y3 = g.data.find((d) => d.year === 3)?.pct ?? 0;
      const ceiling = Math.max(...g.data.map((d) => d.pct), 0);
      return { group: g.group, n: g.n, y1, y2, y3, ceiling };
    });
  }, [survivalData]);

  const { sortedRoster, rosterTakeaway } = useMemo(() => {
    // Rank by the conditional odds a player who hasn't hit by Year 3 ever will.
    const withRem = rosterOdds.map((r) => ({ ...r, remY3: conditionalHitOdds(r.ceiling, r.y3) }));
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

  // Start the Y axis just below the lowest plotted point (5 percentage points
  // under it, floored at 0) rather than always at 0, so the lines fill the plot.
  const yMin = useMemo(() => {
    let min = Infinity;
    for (const row of chartData) {
      for (const key in row) {
        if (key === "year") continue;
        const v = row[key];
        if (typeof v === "number" && v < min) min = v;
      }
    }
    return Number.isFinite(min) ? Math.max(0, min - 0.05) : 0;
  }, [chartData]);

  const getColor = (group: string) => {
    if (groupBy === "pos") return posGroupColors[group] || "#0b3a7a";
    return roundGroupColors[group] || "#0b3a7a";
  };

  // In round mode the group is "Round 1", "Round 2", … — show just the number.
  const groupLabel = (group: string) => (groupBy === "round" ? group.replace(/^Round\s+/, "") : group);

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
              domain={[yMin, "auto"]}
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

      <div className="space-y-4" data-testid="patience-roster-module">
        <div>
          <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Patience &amp; Roster Decision Aid</h2>
          <div className="scff-accent-bar mt-1.5" />
          <p className="text-xs text-muted-foreground mt-2">How long should dynasty managers wait before moving on?</p>
        </div>

        <div className="grid gap-x-3 gap-y-5 [grid-template-columns:1fr] min-[420px]:[grid-template-columns:minmax(140px,0.85fr)_minmax(190px,1.35fr)]">
          <div data-testid="patience-index" className="flex flex-col [container-type:inline-size]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0b3a7a] dark:text-white">Hit Rates After Year 1</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">
              Odds of an eventual {outcomeName} hit if a player doesn't hit in his rookie season
            </p>
            <table className="w-full text-[10px] border border-border mt-auto">
              <thead>
                <tr className="bg-[#0b1634] border-b border-border">
                  <th className="text-left text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)]">{groupBy === "round" ? "Round" : "Pos"}</th>
                  <th className="text-right text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)]">Hit %</th>
                  <th className="text-left text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)] w-1/2"><span className="sr-only">Hit odds gauge</span></th>
                </tr>
              </thead>
              <tbody>
                {patienceData.map((p) => (
                  <tr key={p.group} className="border-b border-border/40 last:border-0">
                    <td className="py-1.5 px-[clamp(5px,1.4cqw,7px)] text-xs font-extrabold" style={{ color: getColor(p.group) }}>{groupLabel(p.group)}</td>
                    <td className="py-1.5 px-[clamp(5px,1.4cqw,7px)] text-right tabular-nums font-bold text-[#0b3a7a] dark:text-[#d4af37]">{p.odds.toFixed(1)}%</td>
                    <td className="py-1.5 px-[clamp(5px,1.4cqw,7px)]">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-400 dark:bg-slate-500 transition-all"
                          style={{ width: `${Math.min(100, p.odds)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div data-testid="roster-decision-aid" className="flex flex-col [container-type:inline-size]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0b3a7a] dark:text-white">Remaining Hit Odds</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2.5">
              Odds of an eventual {outcomeName} hit if a player has not hit by each season checkpoint
            </p>
            <table className="w-full text-[10px] border border-border mt-auto">
              <thead>
                <tr className="bg-[#0b1634] border-b border-border">
                  <th className="text-left text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)]">{groupBy === "round" ? "Round" : "Pos"}</th>
                  <th className="text-right text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)]">After Y1</th>
                  <th className="text-right text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)]">After Y2</th>
                  <th className="text-right text-white/70 uppercase tracking-wider font-bold text-[clamp(7px,1.6vw,10px)] py-1.5 px-[clamp(5px,1.4cqw,7px)]">After Y3</th>
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
                      <td className="py-1.5 px-[clamp(5px,1.4cqw,7px)] text-xs font-extrabold" style={{ color: getColor(r.group) }}>{groupLabel(r.group)}</td>
                      <td className={`py-1.5 px-[clamp(5px,1.4cqw,7px)] text-right tabular-nums ${cls(conditionalHitOdds(r.ceiling, r.y1))}`}>{cell(conditionalHitOdds(r.ceiling, r.y1))}</td>
                      <td className={`py-1.5 px-[clamp(5px,1.4cqw,7px)] text-right tabular-nums ${cls(conditionalHitOdds(r.ceiling, r.y2))}`}>{cell(conditionalHitOdds(r.ceiling, r.y2))}</td>
                      <td className={`py-1.5 px-[clamp(5px,1.4cqw,7px)] text-right tabular-nums ${cls(conditionalHitOdds(r.ceiling, r.y3))}`}>{cell(conditionalHitOdds(r.ceiling, r.y3))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {rosterTakeaway && (
          <div className="rounded-lg border-l-[3px] border-[#d4af37] bg-[#0b3a7a]/[0.04] dark:bg-[#d4af37]/[0.06] px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">Key Takeaway</div>
            <p className="text-xs text-[#0b1634] dark:text-slate-200 mt-0.5">{rosterTakeaway}</p>
          </div>
        )}
      </div>

    </div>
  );
}
