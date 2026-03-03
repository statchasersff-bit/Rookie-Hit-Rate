import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useData, defaultFilters } from "@/lib/data-context";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { Pos, Format, Scoring, Outcome } from "@/lib/types";

const positions: Pos[] = ["QB", "RB", "WR", "TE"];
const rounds = [1, 2, 3, 4, 5];
const formats: { value: Format; label: string }[] = [
  { value: "1qb", label: "1QB" },
  { value: "sf", label: "Superflex" },
];
const scorings: { value: Scoring; label: string }[] = [
  { value: "ppr", label: "PPR" },
  { value: "hppr", label: "Half PPR" },
];
const outcomes: { value: Outcome; label: string }[] = [
  { value: "elite", label: "Elite (Top 12)" },
  { value: "starter", label: "Starter (Top 24)" },
  { value: "flex", label: "Flex (Top 36)" },
];

export function FilterBar() {
  const { filters, setFilters } = useData();
  const [expanded, setExpanded] = useState(true);

  const activePills: { label: string; onRemove: () => void }[] = [];

  if (filters.yearStart !== 2017 || filters.yearEnd !== 2025) {
    activePills.push({
      label: `${filters.yearStart}–${filters.yearEnd}`,
      onRemove: () => setFilters((f) => ({ ...f, yearStart: 2017, yearEnd: 2025 })),
    });
  }
  if (filters.format !== "sf") {
    activePills.push({
      label: "1QB",
      onRemove: () => setFilters((f) => ({ ...f, format: "sf" })),
    });
  }
  if (filters.scoring !== "ppr") {
    activePills.push({
      label: "Half PPR",
      onRemove: () => setFilters((f) => ({ ...f, scoring: "ppr" })),
    });
  }
  if (filters.outcome !== "elite") {
    activePills.push({
      label: outcomes.find((o) => o.value === filters.outcome)?.label || "",
      onRemove: () => setFilters((f) => ({ ...f, outcome: "elite" })),
    });
  }
  for (const pos of filters.positions) {
    activePills.push({
      label: pos,
      onRemove: () => setFilters((f) => ({ ...f, positions: f.positions.filter((p) => p !== pos) })),
    });
  }
  for (const rd of filters.rounds) {
    activePills.push({
      label: `Round ${rd}`,
      onRemove: () => setFilters((f) => ({ ...f, rounds: f.rounds.filter((r) => r !== rd) })),
    });
  }
  if (filters.minGames !== 8) {
    activePills.push({
      label: `Min ${filters.minGames} games`,
      onRemove: () => setFilters((f) => ({ ...f, minGames: 8 })),
    });
  }

  return (
    <div className="sticky top-14 z-40 bg-white/95 dark:bg-[#0a1628]/95 backdrop-blur-md border-b border-[#0b3a7a]/10 dark:border-[#d4af37]/10" data-testid="filter-bar">
      <div className="max-w-[1280px] mx-auto px-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2 sm:hidden text-sm font-medium text-[#0b3a7a] dark:text-[#d4af37]"
          data-testid="button-filter-toggle"
        >
          <span>Filters</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className={`${expanded ? "block" : "hidden sm:block"} py-3 space-y-3`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Seasons</label>
              <div className="flex items-center gap-2 min-w-[200px]">
                <span className="text-xs font-medium text-[#0b3a7a] dark:text-[#d4af37] w-8">{filters.yearStart}</span>
                <Slider
                  data-testid="slider-years"
                  min={2017}
                  max={2025}
                  step={1}
                  value={[filters.yearStart, filters.yearEnd]}
                  onValueChange={([s, e]) => setFilters((f) => ({ ...f, yearStart: s, yearEnd: e }))}
                  className="flex-1"
                />
                <span className="text-xs font-medium text-[#0b3a7a] dark:text-[#d4af37] w-8">{filters.yearEnd}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Format</label>
              <div className="flex gap-1">
                {formats.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFilters((prev) => ({ ...prev, format: f.value }))}
                    data-testid={`button-format-${f.label.toLowerCase()}`}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      filters.format === f.value
                        ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                        : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Scoring</label>
              <div className="flex gap-1">
                {scorings.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setFilters((prev) => ({ ...prev, scoring: s.value }))}
                    data-testid={`button-scoring-${s.label.toLowerCase()}`}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      filters.scoring === s.value
                        ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                        : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Outcome</label>
              <div className="flex gap-1">
                {outcomes.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setFilters((prev) => ({ ...prev, outcome: o.value }))}
                    data-testid={`button-outcome-${o.value}`}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      filters.outcome === o.value
                        ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628] dark:border-[#d4af37]"
                        : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Position</label>
              <div className="flex gap-1">
                {positions.map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        positions: prev.positions.includes(p)
                          ? prev.positions.filter((x) => x !== p)
                          : [...prev.positions, p],
                      }))
                    }
                    data-testid={`button-pos-${p.toLowerCase()}`}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      filters.positions.includes(p)
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
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        rounds: prev.rounds.includes(r)
                          ? prev.rounds.filter((x) => x !== r)
                          : [...prev.rounds, r],
                      }))
                    }
                    data-testid={`button-round-${r}`}
                    className={`w-7 h-7 text-xs font-medium rounded-md border transition-colors flex items-center justify-center ${
                      filters.rounds.includes(r)
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
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Min Games</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={filters.minGames}
                  onChange={(e) => setFilters((f) => ({ ...f, minGames: parseInt(e.target.value) || 1 }))}
                  className="w-14 h-7 px-2 text-xs rounded-md border border-[#0b3a7a]/20 dark:border-[#d4af37]/20 bg-transparent text-foreground"
                  min={1}
                  max={17}
                  data-testid="input-min-games"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Confidence</label>
              <Switch
                checked={filters.showConfidence}
                onCheckedChange={(v) => setFilters((f) => ({ ...f, showConfidence: v }))}
                data-testid="switch-confidence"
              />
            </div>
          </div>

          {activePills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5" data-testid="filter-pills">
              {activePills.map((pill, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs gap-1 cursor-pointer bg-[#0b3a7a]/10 text-[#0b3a7a] dark:bg-[#d4af37]/10 dark:text-[#d4af37]"
                  onClick={pill.onRemove}
                  data-testid={`pill-${pill.label}`}
                >
                  {pill.label}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
              <button
                onClick={() => setFilters(defaultFilters)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-clear-filters"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
