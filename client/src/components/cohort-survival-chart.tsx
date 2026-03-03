import { useMemo, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeSurvival } from "@/lib/cohort";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const groupColors = [
  "#0b3a7a", "#d4af37", "#1a5ab8", "#7a9cc7",
  "#b8960e", "#4a7ab8", "#c4a040",
];

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
    </div>
  );
}
