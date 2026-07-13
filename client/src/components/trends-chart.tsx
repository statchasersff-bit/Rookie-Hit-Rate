import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeTrends, type TrendPoint } from "@/lib/cohort";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { SnapshotStat } from "@/components/SnapshotStat";
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, AlertTriangle, Trophy, Calendar, Gauge } from "lucide-react";
import type { KpiAccent } from "@/lib/kpiCardStyle";
import type { Pos } from "@/lib/types";

const posLineColors: Record<Pos, string> = {
  QB: "#dc2626",
  RB: "#059669",
  WR: "#2563eb",
  TE: "#d4af37",
};

type ViewMode = "yearly" | "rolling3" | "cumulative";

interface Insight {
  icon: typeof TrendingUp;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
  accent: KpiAccent;
}

const toneContextColor: Record<Insight["tone"], string> = {
  positive: "text-emerald-400",
  negative: "text-rose-400",
  neutral: "text-slate-400",
};

function getStabilityScore(stdDev: number): { score: number; label: string; color: string } {
  const score = Math.max(0, Math.min(100, Math.round((1 - stdDev / 0.5) * 100)));
  if (score >= 70) return { score, label: "Stable", color: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 40) return { score, label: "Moderate", color: "text-amber-500 dark:text-amber-400" };
  return { score, label: "Volatile", color: "text-red-500 dark:text-red-400" };
}

function getStabilityBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-500";
}

function generateInsights(
  data: TrendPoint[],
  label: string,
  outcomeName: string
): Insight[] {
  if (data.length < 2) return [];
  const insights: Insight[] = [];
  const rates = data.map((d) => d.hitRate);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const total = data.reduce((a, d) => a + d.n, 0);

  insights.push({
    icon: BarChart3,
    title: "Overall Average",
    stat: `${(avg * 100).toFixed(1)}%`,
    body: `${data.length} classes, ${total} players. ${label} produce a ${outcomeName.toLowerCase()} at this rate.`,
    tone: avg > 0.4 ? "positive" : avg > 0.2 ? "neutral" : "negative",
    accent: "blue",
  });

  const best = data.reduce((a, b) => (b.hitRate > a.hitRate ? b : a));
  if (best.hitRate > 0) {
    insights.push({
      icon: Trophy,
      title: "Best Class",
      stat: `${(best.hitRate * 100).toFixed(0)}% (${best.year})`,
      body: `${best.hits}/${best.n} players hit.${best.n < 5 ? " (Small sample)" : ""}`,
      tone: "positive",
      accent: "emerald",
    });
  }

  const worst = data.reduce((a, b) => (b.hitRate < a.hitRate ? b : a));
  if (worst.hitRate < best.hitRate) {
    insights.push({
      icon: AlertTriangle,
      title: "Weakest Class",
      stat: `${(worst.hitRate * 100).toFixed(0)}% (${worst.year})`,
      body: `${worst.hits}/${worst.n} players.${worst.hitRate === 0 ? " Complete shutout." : ""}`,
      tone: "negative",
      accent: "rose",
    });
  }

  const recentYears = data.slice(-3);
  const olderYears = data.slice(0, Math.max(1, data.length - 3));
  if (recentYears.length >= 2 && olderYears.length >= 1) {
    const recentAvg = recentYears.reduce((a, d) => a + d.hitRate, 0) / recentYears.length;
    const olderAvg = olderYears.reduce((a, d) => a + d.hitRate, 0) / olderYears.length;
    const diff = recentAvg - olderAvg;

    if (Math.abs(diff) > 0.05) {
      insights.push({
        icon: diff > 0 ? TrendingUp : TrendingDown,
        title: "Recent Trend",
        stat: `${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)}pts`,
        body: `Last 3 classes: ${(recentAvg * 100).toFixed(1)}% vs earlier ${(olderAvg * 100).toFixed(1)}%.`,
        tone: diff > 0 ? "positive" : "negative",
        accent: diff > 0 ? "emerald" : "red",
      });
    } else {
      insights.push({
        icon: Minus,
        title: "Stable Trend",
        stat: `±${(Math.abs(diff) * 100).toFixed(1)}pts`,
        body: `Recent classes (${(recentAvg * 100).toFixed(1)}%) track close to historical (${(olderAvg * 100).toFixed(1)}%).`,
        tone: "neutral",
        accent: "slate",
      });
    }
  }

  const variance = rates.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rates.length;
  const stdDev = Math.sqrt(variance);
  const stability = getStabilityScore(stdDev);
  insights.push({
    icon: stdDev > 0.15 ? Target : stdDev < 0.08 ? Target : Gauge,
    title: "Stability Score",
    stat: `${stability.score}/100`,
    body: `${stability.label} (±${(stdDev * 100).toFixed(1)}% volatility). ${stdDev > 0.15 ? "Outcomes vary heavily by class." : stdDev < 0.08 ? "Consistent, predictable slot." : "Moderate year-to-year variation."}`,
    tone: stdDev > 0.15 ? "negative" : stdDev < 0.08 ? "positive" : "neutral",
    accent: "gold",
  });

  const zeroYears = data.filter((d) => d.hitRate === 0);
  if (zeroYears.length > 0 && zeroYears.length < data.length) {
    insights.push({
      icon: Calendar,
      title: "Shutout Classes",
      stat: `${zeroYears.length}/${data.length}`,
      body: `Zero-hit years: ${zeroYears.map((d) => d.year).join(", ")}.${zeroYears.length >= 3 ? " High bust risk." : ""}`,
      tone: "negative",
      accent: "red",
    });
  }

  return insights;
}

// Dash pattern per round so overlapping same-position lines stay distinguishable.
const roundDash: Record<number, string> = {
  1: "",
  2: "6 3",
  3: "2 3",
  4: "8 3 2 3",
  5: "10 4",
};

const allPositions: Pos[] = ["QB", "RB", "WR", "TE"];
const allRounds = [1, 2, 3, 4, 5];

export function TrendsChart() {
  const { filteredDrafts, rankMap, filters } = useData();
  const [showMovingAvg, setShowMovingAvg] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");

  // Position + round come from the header filter bar (multi-select).
  const positions = filters.positions.length > 0 ? allPositions.filter((p) => filters.positions.includes(p)) : allPositions;
  const rounds = filters.rounds.length > 0 ? allRounds.filter((r) => filters.rounds.includes(r)) : allRounds;

  // One raw series per selected position × round combination.
  const series = useMemo(() => {
    const list: { pos: Pos; round: number; key: string; name: string; raw: TrendPoint[] }[] = [];
    for (const pos of positions) {
      for (const round of rounds) {
        list.push({
          pos,
          round,
          key: `${pos}_${round}`,
          name: `${pos} Rd${round}`,
          raw: computeTrends(filteredDrafts, rankMap, pos, round, filters.outcome, filters.minGames),
        });
      }
    }
    return list;
    // filters.positions / filters.rounds are the stable inputs behind `positions`/`rounds`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDrafts, rankMap, filters.positions, filters.rounds, filters.outcome, filters.minGames]);

  const transform = (raw: TrendPoint[]): TrendPoint[] => {
    let out = raw;
    if (viewMode === "cumulative") {
      let totalN = 0, totalHits = 0;
      out = raw.map((t) => {
        totalN += t.n;
        totalHits += t.hits;
        return { ...t, hitRate: totalN > 0 ? totalHits / totalN : 0 };
      });
    } else if (viewMode === "rolling3") {
      out = raw.map((t, i) => {
        const slice = raw.slice(Math.max(0, i - 2), i + 1);
        const totalN = slice.reduce((s, d) => s + d.n, 0);
        const totalHits = slice.reduce((s, d) => s + d.hits, 0);
        return { ...t, hitRate: totalN > 0 ? totalHits / totalN : 0 };
      });
    }
    if (showMovingAvg) {
      out = out.map((t, i) => {
        const slice = out.slice(Math.max(0, i - 2), i + 1);
        return { ...t, hitRate: slice.reduce((s, d) => s + d.hitRate, 0) / slice.length };
      });
    }
    return out;
  };

  // Merge every transformed series into one row per year keyed by series id.
  const chartData = useMemo(() => {
    const byYear = new Map<number, any>();
    for (const s of series) {
      for (const t of transform(s.raw)) {
        if (!byYear.has(t.year)) byYear.set(t.year, { year: t.year });
        const row = byYear.get(t.year);
        row[s.key] = t.hitRate;
        row[`${s.key}_n`] = t.n;
        row[`${s.key}_hits`] = t.hits;
      }
    }
    return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, viewMode, showMovingAvg]);

  // Pool all selected cohorts by year for the summary insights / stability / avg line.
  const pooled = useMemo(() => {
    const byYear = new Map<number, TrendPoint>();
    for (const s of series) {
      for (const t of s.raw) {
        const cur = byYear.get(t.year) ?? { year: t.year, hitRate: 0, n: 0, hits: 0, eliteHits: 0, starterHits: 0, bustCount: 0, incomplete: t.incomplete };
        cur.n += t.n;
        cur.hits += t.hits;
        cur.eliteHits += t.eliteHits;
        cur.starterHits += t.starterHits;
        cur.bustCount += t.bustCount;
        cur.incomplete = cur.incomplete || t.incomplete;
        byYear.set(t.year, cur);
      }
    }
    const rows = Array.from(byYear.values()).sort((a, b) => a.year - b.year);
    for (const r of rows) r.hitRate = r.n > 0 ? r.hits / r.n : 0;
    return rows;
  }, [series]);

  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";
  const selectionLabel = `${positions.join("/")} Rd ${rounds.join("/")}`;

  const insights = useMemo(
    () => generateInsights(pooled, selectionLabel, outcomeName),
    [pooled, selectionLabel, outcomeName]
  );

  const rates = pooled.map((d) => d.hitRate);
  const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const variance = rates.length > 0 ? rates.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rates.length : 0;
  const stdDev = Math.sqrt(variance);
  const stability = getStabilityScore(stdDev);

  const viewModes: { id: ViewMode; label: string }[] = [
    { id: "yearly", label: "By Year" },
    { id: "rolling3", label: "Rolling 3-Yr" },
    { id: "cumulative", label: "Cumulative" },
  ];

  return (
    <div className="space-y-4" data-testid="trends-chart">
      {insights.length > 0 && (
        <div data-testid="trends-analysis">
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
                testId={`insight-${idx}`}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Hit Rate Trends</h2>
        <div className="scff-accent-bar mt-1.5" />
        <p className="text-sm text-muted-foreground mt-1">
          {outcomeName} hit rate by draft class year — one line per selected position &amp; round
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">View Mode</label>
          <div className="flex gap-1">
            {viewModes.map((vm) => (
              <button
                key={vm.id}
                onClick={() => setViewMode(vm.id)}
                data-testid={`trend-view-${vm.id}`}
                className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                  viewMode === vm.id
                    ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                    : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">3-Yr Avg</label>
          <Switch checked={showMovingAvg} onCheckedChange={setShowMovingAvg} data-testid="switch-moving-avg" />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30 dark:bg-muted/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Stability</span>
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${getStabilityBarColor(stability.score)}`} style={{ width: `${stability.score}%` }} />
          </div>
          <span className={`text-xs font-bold ${stability.color}`}>{stability.score}/100</span>
          <span className="text-[10px] text-muted-foreground">({stability.label})</span>
        </div>
      </div>

      <div className="h-[320px] bg-card rounded-lg p-4 border border-[#0b3a7a]/5 dark:border-[#d4af37]/10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              domain={[0, 1]}
            />
            <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#0b3a7a] text-white p-3 rounded-lg text-xs shadow-xl min-w-[160px]">
                    <div className="font-bold text-[#d4af37] text-sm mb-1.5">{label}</div>
                    <div className="space-y-1">
                      {payload
                        .filter((p: any) => p.value != null)
                        .map((p: any) => {
                          const n = p.payload?.[`${p.dataKey}_n`];
                          const hits = p.payload?.[`${p.dataKey}_hits`];
                          return (
                            <div key={p.dataKey} className="flex justify-between gap-3">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.stroke }} />
                                {p.name}
                              </span>
                              <span className="font-bold tabular-nums">
                                {(p.value * 100).toFixed(1)}%
                                {n != null && <span className="ml-1 font-normal opacity-60">({hits}/{n})</span>}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={posLineColors[s.pos]}
                strokeWidth={2}
                strokeDasharray={roundDash[s.round]}
                dot={{ r: 2.5, fill: posLineColors[s.pos] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
