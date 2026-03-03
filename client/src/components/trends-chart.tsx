import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeTrends } from "@/lib/cohort";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, AlertTriangle, Trophy, Calendar } from "lucide-react";
import type { Pos } from "@/lib/types";

interface Insight {
  icon: typeof TrendingUp;
  title: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
}

function generateInsights(
  data: { year: number; hitRate: number; n: number }[],
  pos: Pos,
  round: number,
  outcomeName: string
): Insight[] {
  if (data.length < 2) return [];

  const insights: Insight[] = [];
  const rates = data.map((d) => d.hitRate);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const total = data.reduce((a, d) => a + d.n, 0);

  const best = data.reduce((a, b) => (b.hitRate > a.hitRate ? b : a));
  const worst = data.reduce((a, b) => (b.hitRate < a.hitRate ? b : a));

  insights.push({
    icon: BarChart3,
    title: "Overall Average",
    body: `Across ${data.length} draft classes (${total} players), ${pos} Round ${round} picks produce a ${outcomeName.toLowerCase()} at a ${(avg * 100).toFixed(1)}% rate.`,
    tone: avg > 0.4 ? "positive" : avg > 0.2 ? "neutral" : "negative",
  });

  if (best.hitRate > 0) {
    insights.push({
      icon: Trophy,
      title: "Best Class",
      body: `The ${best.year} class had the highest hit rate at ${(best.hitRate * 100).toFixed(1)}% (${best.n} players).${best.hitRate >= 0.5 ? " More than half of that class hit." : ""}`,
      tone: "positive",
    });
  }

  if (worst.hitRate < best.hitRate) {
    insights.push({
      icon: AlertTriangle,
      title: "Weakest Class",
      body: `The ${worst.year} class had the lowest hit rate at ${(worst.hitRate * 100).toFixed(1)}% (${worst.n} players).${worst.hitRate === 0 ? " No player from that class reached the threshold." : ""}`,
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
      const direction = diff > 0 ? "improving" : "declining";
      insights.push({
        icon: diff > 0 ? TrendingUp : TrendingDown,
        title: "Recent Trend",
        body: `Hit rates have been ${direction} recently. The last 3 classes average ${(recentAvg * 100).toFixed(1)}% vs ${(olderAvg * 100).toFixed(1)}% for earlier classes — a ${diff > 0 ? "+" : ""}${(diff * 100).toFixed(1)} percentage point shift.`,
        tone: diff > 0 ? "positive" : "negative",
      });
    } else {
      insights.push({
        icon: Minus,
        title: "Stable Trend",
        body: `Hit rates have been relatively stable. Recent classes average ${(recentAvg * 100).toFixed(1)}% compared to ${(olderAvg * 100).toFixed(1)}% for earlier ones.`,
        tone: "neutral",
      });
    }
  }

  const variance = rates.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rates.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev > 0.15) {
    insights.push({
      icon: Target,
      title: "High Volatility",
      body: `This cohort shows significant year-to-year volatility (±${(stdDev * 100).toFixed(1)}%). Hit rates swing widely between classes, suggesting outcomes are heavily dependent on individual talent rather than draft position alone.`,
      tone: "neutral",
    });
  } else if (stdDev < 0.08 && data.length >= 4) {
    insights.push({
      icon: Target,
      title: "Consistent Results",
      body: `This cohort shows low volatility (±${(stdDev * 100).toFixed(1)}%). Hit rates are relatively consistent across classes, making this a more predictable draft slot.`,
      tone: "positive",
    });
  }

  const zeroYears = data.filter((d) => d.hitRate === 0);
  if (zeroYears.length > 0 && zeroYears.length < data.length) {
    insights.push({
      icon: Calendar,
      title: "Shutout Classes",
      body: `${zeroYears.length} of ${data.length} draft classes produced zero hits: ${zeroYears.map((d) => d.year).join(", ")}. ${zeroYears.length >= 3 ? "This slot carries substantial bust risk." : ""}`,
      tone: "negative",
    });
  }

  return insights;
}

const posColors: Record<Pos, string> = {
  QB: "#1a5ab8",
  RB: "#0b3a7a",
  WR: "#d4af37",
  TE: "#7a9cc7",
};

export function TrendsChart() {
  const { filteredDrafts, rankMap, filters } = useData();
  const [trendPos, setTrendPos] = useState<Pos>("RB");
  const [trendRound, setTrendRound] = useState(1);
  const [showMovingAvg, setShowMovingAvg] = useState(false);

  const trendData = useMemo(
    () => computeTrends(filteredDrafts, rankMap, trendPos, trendRound, filters.outcome, filters.minGames),
    [filteredDrafts, rankMap, trendPos, trendRound, filters.outcome, filters.minGames]
  );

  const chartData = useMemo(() => {
    const data = trendData.map((t) => ({
      year: t.year,
      hitRate: t.hitRate,
      n: t.n,
      movingAvg: 0,
    }));

    if (showMovingAvg) {
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - 2);
        const slice = data.slice(start, i + 1);
        data[i].movingAvg = slice.reduce((sum, d) => sum + d.hitRate, 0) / slice.length;
      }
    }

    return data;
  }, [trendData, showMovingAvg]);

  const outcomeName = filters.outcome === "elite" ? "Elite" : filters.outcome === "starter" ? "Starter" : "Flex";

  const insights = useMemo(
    () => generateInsights(trendData, trendPos, trendRound, outcomeName),
    [trendData, trendPos, trendRound, outcomeName]
  );

  const positions: Pos[] = ["QB", "RB", "WR", "TE"];
  const rounds = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-4" data-testid="trends-chart">
      <div>
        <h2 className="text-xl font-bold text-[#0b3a7a] dark:text-white">Hit Rate Trends</h2>
        <div className="w-12 h-[3px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 mt-1 rounded-full" />
        <p className="text-sm text-muted-foreground mt-1">
          {filters.outcome === "elite" ? "Elite (Top 12)" : filters.outcome === "starter" ? "Starter (Top 24)" : "Flex (Top 36)"} hit rate by draft class year
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Position</label>
          <div className="flex gap-1">
            {positions.map((p) => (
              <button
                key={p}
                onClick={() => setTrendPos(p)}
                data-testid={`trend-pos-${p.toLowerCase()}`}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  trendPos === p
                    ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                    : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
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
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">3-Year Avg</label>
          <Switch
            checked={showMovingAvg}
            onCheckedChange={setShowMovingAvg}
            data-testid="switch-moving-avg"
          />
        </div>
      </div>

      <div className="h-[300px] bg-card rounded-lg p-4 border border-[#0b3a7a]/5 dark:border-[#d4af37]/10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              domain={[0, 1]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-[#0b3a7a] text-white p-2 rounded-md text-xs shadow-lg">
                    <div className="font-bold text-[#d4af37]">{label}</div>
                    {payload.map((p: any, i: number) => (
                      <div key={i}>
                        {p.name}: {(p.value * 100).toFixed(1)}%
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="hitRate"
              stroke={posColors[trendPos]}
              strokeWidth={2}
              dot={{ r: 4, fill: posColors[trendPos] }}
              name="Hit Rate"
            />
            {showMovingAvg && (
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke="#d4af37"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="3-Year Avg"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {insights.length > 0 && (
        <div data-testid="trends-analysis">
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
                  data-testid={`insight-${idx}`}
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
