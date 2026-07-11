import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeTrends, type TrendPoint } from "@/lib/cohort";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, AlertTriangle, Trophy, Calendar, Sparkles, Gauge } from "lucide-react";
import type { Pos } from "@/lib/types";

const posPillColors: Record<Pos, string> = {
  QB: "bg-red-600 text-white dark:bg-red-500",
  RB: "bg-emerald-600 text-white dark:bg-emerald-500",
  WR: "bg-blue-600 text-white dark:bg-blue-500",
  TE: "bg-[#d4af37] text-[#0a1628] dark:bg-[#d4af37]",
};

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
}

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
  pos: Pos,
  round: number,
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
    body: `${data.length} classes, ${total} players. ${pos} Rd${round} produces a ${outcomeName.toLowerCase()} at this rate.`,
    tone: avg > 0.4 ? "positive" : avg > 0.2 ? "neutral" : "negative",
  });

  const best = data.reduce((a, b) => (b.hitRate > a.hitRate ? b : a));
  if (best.hitRate > 0) {
    insights.push({
      icon: Trophy,
      title: "Best Class",
      stat: `${(best.hitRate * 100).toFixed(0)}% (${best.year})`,
      body: `${best.hits}/${best.n} players hit.${best.n < 5 ? " (Small sample)" : ""}`,
      tone: "positive",
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
      });
    } else {
      insights.push({
        icon: Minus,
        title: "Stable Trend",
        stat: `±${(Math.abs(diff) * 100).toFixed(1)}pts`,
        body: `Recent classes (${(recentAvg * 100).toFixed(1)}%) track close to historical (${(olderAvg * 100).toFixed(1)}%).`,
        tone: "neutral",
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
  });

  const zeroYears = data.filter((d) => d.hitRate === 0);
  if (zeroYears.length > 0 && zeroYears.length < data.length) {
    insights.push({
      icon: Calendar,
      title: "Shutout Classes",
      stat: `${zeroYears.length}/${data.length}`,
      body: `Zero-hit years: ${zeroYears.map((d) => d.year).join(", ")}.${zeroYears.length >= 3 ? " High bust risk." : ""}`,
      tone: "negative",
    });
  }

  return insights;
}

function generateHeadline(data: TrendPoint[], pos: Pos, round: number, outcomeName: string): string | null {
  if (data.length < 3) return null;
  const rates = data.map((d) => d.hitRate);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const best = data.reduce((a, b) => (b.hitRate > a.hitRate ? b : a));
  const worst = data.reduce((a, b) => (b.hitRate < a.hitRate ? b : a));

  if (best.hitRate > 0.8 && best.n < 5) {
    const othersAvg = data.filter((d) => d.year !== best.year);
    const oAvg = othersAvg.reduce((s, d) => s + d.hitRate, 0) / othersAvg.length;
    return `${pos} Round ${round} volatility is driven primarily by ${best.year}'s ${(best.hitRate * 100).toFixed(0)}% spike (N=${best.n}). Outside of ${best.year}, hit rates cluster around ${(oAvg * 100).toFixed(0)}%.`;
  }

  const recentYears = data.slice(-3);
  const recentAvg = recentYears.reduce((a, d) => a + d.hitRate, 0) / recentYears.length;
  const diff = recentAvg - avg;
  if (Math.abs(diff) > 0.1) {
    return `${pos} Rd${round} ${outcomeName.toLowerCase()} rates are ${diff > 0 ? "up" : "down"} ${(Math.abs(diff) * 100).toFixed(1)} points in the last 3 classes vs historical average.`;
  }

  if (worst.hitRate === 0 && worst.n >= 3) {
    return `The ${worst.year} ${pos} Rd${round} class produced zero ${outcomeName.toLowerCase()} finishes from ${worst.n} players.`;
  }

  return `${pos} Rd${round} averages a ${(avg * 100).toFixed(0)}% ${outcomeName.toLowerCase()} rate across ${data.length} draft classes.`;
}

function CustomDot(props: any) {
  const { cx, cy, payload, bestYear, worstYear, dataKey } = props;
  if (dataKey !== "hitRate" || !cx || !cy) return null;

  if (payload.year === bestYear) {
    return <circle cx={cx} cy={cy} r={6} fill="#d4af37" stroke="#fff" strokeWidth={2} />;
  }
  if (payload.year === worstYear) {
    return <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
  }

  if (payload.incomplete) {
    return (
      <circle cx={cx} cy={cy} r={4} fill="none" stroke={props.stroke} strokeWidth={2} strokeDasharray="3 2" />
    );
  }

  return <circle cx={cx} cy={cy} r={4} fill={props.stroke} stroke="#fff" strokeWidth={1.5} />;
}

export function TrendsChart() {
  const { filteredDrafts, rankMap, filters } = useData();
  const [trendPos, setTrendPos] = useState<Pos>("RB");
  const [trendRound, setTrendRound] = useState(1);
  const [showMovingAvg, setShowMovingAvg] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");
  const [compareRound, setCompareRound] = useState<number | null>(null);

  const trendData = useMemo(
    () => computeTrends(filteredDrafts, rankMap, trendPos, trendRound, filters.outcome, filters.minGames),
    [filteredDrafts, rankMap, trendPos, trendRound, filters.outcome, filters.minGames]
  );

  const compareTrendData = useMemo(
    () => compareRound !== null ? computeTrends(filteredDrafts, rankMap, trendPos, compareRound, filters.outcome, filters.minGames) : [],
    [filteredDrafts, rankMap, trendPos, compareRound, filters.outcome, filters.minGames]
  );

  const bestYear = useMemo(() => {
    if (trendData.length === 0) return -1;
    return trendData.reduce((a, b) => (b.hitRate > a.hitRate ? b : a)).year;
  }, [trendData]);

  const worstYear = useMemo(() => {
    if (trendData.length === 0) return -1;
    return trendData.reduce((a, b) => (b.hitRate < a.hitRate ? b : a)).year;
  }, [trendData]);

  const chartData = useMemo(() => {
    const transform = (raw: TrendPoint[]) => {
      if (viewMode === "cumulative") {
        let totalN = 0, totalHits = 0;
        return raw.map((t) => {
          totalN += t.n;
          totalHits += t.hits;
          return { ...t, hitRate: totalN > 0 ? totalHits / totalN : 0 };
        });
      }
      if (viewMode === "rolling3") {
        return raw.map((t, i) => {
          const start = Math.max(0, i - 2);
          const slice = raw.slice(start, i + 1);
          const totalN = slice.reduce((s, d) => s + d.n, 0);
          const totalHits = slice.reduce((s, d) => s + d.hits, 0);
          return { ...t, hitRate: totalN > 0 ? totalHits / totalN : 0 };
        });
      }
      return raw;
    };

    const primary = transform(trendData);
    const compare = compareRound !== null ? transform(compareTrendData) : [];

    const data = primary.map((t) => {
      const entry: any = { ...t, movingAvg: 0, compareRate: undefined, compareN: undefined };
      const cMatch = compare.find((c) => c.year === t.year);
      if (cMatch) {
        entry.compareRate = cMatch.hitRate;
        entry.compareN = cMatch.n;
      }
      return entry;
    });

    for (const c of compare) {
      if (!data.find((d: any) => d.year === c.year)) {
        data.push({ year: c.year, hitRate: undefined, n: 0, hits: 0, eliteHits: 0, starterHits: 0, bustCount: 0, incomplete: c.incomplete, movingAvg: undefined, compareRate: c.hitRate, compareN: c.n });
      }
    }
    data.sort((a: any, b: any) => a.year - b.year);

    if (showMovingAvg) {
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - 2);
        const slice = data.slice(start, i + 1);
        data[i].movingAvg = slice.reduce((sum: number, d: any) => sum + d.hitRate, 0) / slice.length;
      }
    }

    return data;
  }, [trendData, compareTrendData, showMovingAvg, viewMode, compareRound]);

  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";

  const insights = useMemo(
    () => generateInsights(trendData, trendPos, trendRound, outcomeName),
    [trendData, trendPos, trendRound, outcomeName]
  );

  const headline = useMemo(
    () => generateHeadline(trendData, trendPos, trendRound, outcomeName),
    [trendData, trendPos, trendRound, outcomeName]
  );

  const rates = trendData.map((d) => d.hitRate);
  const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const variance = rates.length > 0 ? rates.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rates.length : 0;
  const stdDev = Math.sqrt(variance);
  const stability = getStabilityScore(stdDev);

  const positions: Pos[] = ["QB", "RB", "WR", "TE"];
  const rounds = [1, 2, 3, 4, 5];
  const viewModes: { id: ViewMode; label: string }[] = [
    { id: "yearly", label: "By Year" },
    { id: "rolling3", label: "Rolling 3-Yr" },
    { id: "cumulative", label: "Cumulative" },
  ];

  const primaryColor = posLineColors[trendPos];

  return (
    <div className="space-y-4" data-testid="trends-chart">
      <div>
        <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Hit Rate Trends</h2>
        <div className="scff-accent-bar mt-1.5" />
        <p className="text-sm text-muted-foreground mt-1">
          {outcomeName} hit rate by draft class year
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Position</label>
          <div className="flex gap-1">
            {positions.map((p) => (
              <button
                key={p}
                onClick={() => { setTrendPos(p); setCompareRound(null); }}
                data-testid={`trend-pos-${p.toLowerCase()}`}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${
                  trendPos === p ? posPillColors[p] : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Round</label>
          <div className="flex gap-1">
            {rounds.map((r) => (
              <button
                key={r}
                onClick={() => setTrendRound(r)}
                data-testid={`trend-round-${r}`}
                className={`w-7 h-7 text-xs font-medium rounded-md border transition-colors flex items-center justify-center ${
                  trendRound === r
                    ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                    : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
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
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Compare Rd</label>
          <div className="flex gap-1">
            <button
              onClick={() => setCompareRound(null)}
              data-testid="trend-compare-none"
              className={`px-1.5 py-1 text-[10px] font-medium rounded-md border transition-colors ${
                compareRound === null
                  ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                  : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
              }`}
            >
              Off
            </button>
            {rounds.filter((r) => r !== trendRound).map((r) => (
              <button
                key={r}
                onClick={() => setCompareRound(r)}
                data-testid={`trend-compare-${r}`}
                className={`w-6 h-6 text-[10px] font-medium rounded-md border transition-colors flex items-center justify-center ${
                  compareRound === r
                    ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                    : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
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
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#d4af37] inline-block" /> Best</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Worst</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-dashed border-muted-foreground inline-block" /> Incomplete</span>
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
            <ReferenceLine y={avg} stroke={primaryColor} strokeDasharray="4 4" strokeOpacity={0.3} />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                const main = payload.find((p: any) => p.dataKey === "hitRate");
                const pt = main?.payload;
                const comp = payload.find((p: any) => p.dataKey === "compareRate");
                return (
                  <div className="bg-[#0b3a7a] text-white p-3 rounded-lg text-xs shadow-xl min-w-[160px]">
                    <div className="font-bold text-[#d4af37] text-sm mb-1">
                      {label}
                      {pt?.incomplete && <span className="ml-1 text-[10px] font-normal opacity-70">(Incomplete)</span>}
                    </div>
                    {pt && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span className="opacity-70">Hit Rate:</span>
                          <span className="font-bold">{(pt.hitRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">N:</span>
                          <span>{pt.n}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Hits:</span>
                          <span>{pt.hits} / {pt.n}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Elite:</span>
                          <span>{pt.eliteHits}</span>
                        </div>
                      </div>
                    )}
                    {comp && comp.value != null && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/20 space-y-0.5">
                        <div className="opacity-70 text-[10px]">Rd {compareRound}</div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Hit Rate:</span>
                          <span className="font-bold">{(comp.value * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">N:</span>
                          <span>{comp.payload?.compareN ?? "—"}</span>
                        </div>
                      </div>
                    )}
                    {showMovingAvg && pt?.movingAvg > 0 && (
                      <div className="mt-1 pt-1 border-t border-white/20 flex justify-between">
                        <span className="opacity-70">3-Yr Avg:</span>
                        <span>{(pt.movingAvg * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="hitRate"
              stroke={primaryColor}
              strokeWidth={showMovingAvg ? 1.5 : 2.5}
              strokeOpacity={showMovingAvg ? 0.5 : 1}
              dot={<CustomDot bestYear={bestYear} worstYear={worstYear} dataKey="hitRate" />}
              name={`Rd${trendRound} Hit Rate`}
              activeDot={{ r: 6 }}
              connectNulls
            />
            {showMovingAvg && (
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke={primaryColor}
                strokeWidth={3}
                dot={false}
                name="3-Year Avg"
              />
            )}
            {compareRound !== null && (
              <Line
                type="monotone"
                dataKey="compareRate"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: "#94a3b8" }}
                name={`Rd${compareRound} Hit Rate`}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {headline && (
        <div className="flex items-start gap-3 rounded-xl border border-[#d4af37]/35 bg-accent/60 px-4 py-3.5 shadow-card" data-testid="trends-headline">
          <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-[#0b3a7a] dark:text-[#d4af37]">{headline}</p>
        </div>
      )}

      {insights.length > 0 && (
        <div data-testid="trends-analysis">
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
                <div key={idx} className={`rounded-lg border p-3 ${toneClasses}`} data-testid={`insight-${idx}`}>
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
