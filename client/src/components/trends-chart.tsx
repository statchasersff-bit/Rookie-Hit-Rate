import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeTrends } from "@/lib/cohort";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Switch } from "@/components/ui/switch";
import type { Pos } from "@/lib/types";

const posColors: Record<Pos, string> = {
  QB: "#1a5ab8",
  RB: "#0b3a7a",
  WR: "#d4af37",
  TE: "#7a9cc7",
};

export function TrendsChart() {
  const { drafts, rankMap, filters } = useData();
  const [trendPos, setTrendPos] = useState<Pos>("RB");
  const [trendRound, setTrendRound] = useState(1);
  const [showMovingAvg, setShowMovingAvg] = useState(false);

  const trendData = useMemo(
    () => computeTrends(drafts, rankMap, trendPos, trendRound, filters.outcome, filters.minGames),
    [drafts, rankMap, trendPos, trendRound, filters.outcome, filters.minGames]
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

  const positions: Pos[] = ["QB", "RB", "WR", "TE"];
  const rounds = [1, 2, 3, 4];

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
    </div>
  );
}
