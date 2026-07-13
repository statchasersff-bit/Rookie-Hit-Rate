import { SlidersHorizontal, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Slider } from "@/components/ui/slider";
import { FilterGroup, pillClass, pillBaseClass } from "@/components/FilterGroup";
import { cn } from "@/lib/utils";
import type { Pos, Format, Scoring, Outcome } from "@/lib/types";

const positions: Pos[] = ["QB", "RB", "WR", "TE"];
// Position color coding — same hue language as the heatmap
// (QB red · RB emerald · WR blue · TE gold).
const posStyles: Record<Pos, { active: string; idle: string }> = {
  QB: { active: "bg-red-600 text-white dark:bg-red-500", idle: "text-red-600 dark:text-red-400 hover:text-red-500" },
  RB: { active: "bg-emerald-600 text-white dark:bg-emerald-500", idle: "text-emerald-600 dark:text-emerald-400 hover:text-emerald-500" },
  WR: { active: "bg-blue-600 text-white dark:bg-blue-500", idle: "text-blue-600 dark:text-blue-400 hover:text-blue-500" },
  TE: { active: "bg-[#d4af37] text-[#0a1628]", idle: "text-[#b99120] dark:text-[#d4af37] hover:opacity-80" },
};
const rounds = [1, 2, 3, 4, 5];
const formats: { value: Format; label: string; short: string }[] = [
  { value: "sf", label: "Superflex", short: "SF" },
  { value: "1qb", label: "1QB", short: "1QB" },
];
const scorings: { value: Scoring; label: string; short: string }[] = [
  { value: "ppr", label: "PPR", short: "PPR" },
  { value: "hppr", label: ".5PPR", short: ".5PPR" },
];
const outcomes: { value: Outcome; label: string }[] = [
  { value: "elite", label: "Top-12" },
  { value: "starter", label: "Top-24" },
  { value: "flex", label: "Top-36" },
];

export function FilterBar({ activeTab }: { activeTab: string }) {
  const { filters, setFilters, playerSearch, setPlayerSearch } = useData();
  const [expanded, setExpanded] = useState(true);

  // The Overview tab always spans every position and round, so those filters are hidden.
  const isOverview = activeTab === "overview";
  const showPositionFilter = !isOverview;
  const showRoundFilter = !isOverview;
  // The player search lives here (in the shared filter header) only on the Players tab.
  const isPlayers = activeTab === "players";

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
      label: ".5PPR",
      onRemove: () => setFilters((f) => ({ ...f, scoring: "ppr" })),
    });
  }
  if (filters.outcome !== "elite") {
    activePills.push({
      label: outcomes.find((o) => o.value === filters.outcome)?.label || "",
      onRemove: () => setFilters((f) => ({ ...f, outcome: "elite" })),
    });
  }
  if (showPositionFilter && filters.positions.length < positions.length) {
    for (const pos of filters.positions) {
      activePills.push({
        label: pos,
        onRemove: () => setFilters((f) => ({ ...f, positions: f.positions.filter((p) => p !== pos) })),
      });
    }
  }
  if (showRoundFilter && filters.rounds.length < rounds.length) {
    for (const rd of filters.rounds) {
      activePills.push({
        label: `Round ${rd}`,
        onRemove: () => setFilters((f) => ({ ...f, rounds: f.rounds.filter((r) => r !== rd) })),
      });
    }
  }
  if (filters.minGames !== 8) {
    activePills.push({
      label: `Min ${filters.minGames} games`,
      onRemove: () => setFilters((f) => ({ ...f, minGames: 8 })),
    });
  }

  return (
    <div className="bg-card/95 backdrop-blur-md border-b border-border" data-testid="filter-bar">
      <div className="max-w-[1380px] mx-auto px-px">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2.5 sm:hidden text-sm font-semibold text-foreground focus-visible:outline-none"
          aria-expanded={expanded}
          aria-controls="scff-filter-panel"
          data-testid="button-filter-toggle"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#b99120] dark:text-[#d4af37]" />
            Filters
            {activePills.length > 0 && (
              <span className="grid place-items-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold tabular-nums">
                {activePills.length}
              </span>
            )}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div id="scff-filter-panel" className={`${expanded ? "block" : "hidden sm:block"} py-3.5`}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Player search — only on the Players tab, sharing this header strip */}
            {isPlayers && (
              <div className="relative flex-1 sm:flex-none sm:w-[248px] min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search players…"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--sc-card-soft)] border border-[var(--sc-border)] text-[13px] font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
                  aria-label="Search players by name"
                  data-testid="input-player-search"
                />
              </div>
            )}

            {/* Seasons — dual-range slider inside a matching strip */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none sm:w-auto min-w-0">
              <span className="hidden sm:inline text-xs font-bold tracking-[0.02em] text-slate-400/90 flex-shrink-0">Seasons</span>
              <div className="flex items-center gap-2.5 px-3 h-10 rounded-xl bg-[var(--sc-card-soft)] border border-[var(--sc-border)] w-full sm:w-[248px]">
                <span className="text-[11px] font-semibold tabular-nums text-foreground w-9 flex-shrink-0">{filters.yearStart}</span>
                <Slider
                  data-testid="slider-years"
                  min={2017}
                  max={2025}
                  step={1}
                  value={[filters.yearStart, filters.yearEnd]}
                  onValueChange={([s, e]) => setFilters((f) => ({ ...f, yearStart: s, yearEnd: e }))}
                  className="flex-1"
                  aria-label="Season range"
                />
                <span className="text-[11px] font-semibold tabular-nums text-foreground w-9 flex-shrink-0 text-right">{filters.yearEnd}</span>
              </div>
            </div>

            {/* Format: Superflex / 1QB */}
            <FilterGroup label="Format">
              {formats.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilters((prev) => ({ ...prev, format: f.value }))}
                  data-testid={`button-format-${f.value}`}
                  aria-pressed={filters.format === f.value}
                  className={pillClass(filters.format === f.value)}
                >
                  <span className="sm:hidden">{f.short}</span>
                  <span className="hidden sm:inline">{f.label}</span>
                </button>
              ))}
            </FilterGroup>

            {/* Scoring: PPR / Half PPR */}
            <FilterGroup label="Scoring">
              {scorings.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setFilters((prev) => ({ ...prev, scoring: s.value }))}
                  data-testid={`button-scoring-${s.value}`}
                  aria-pressed={filters.scoring === s.value}
                  className={pillClass(filters.scoring === s.value)}
                >
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </FilterGroup>

            {/* Outcome: Top 12 / Top 24 / Top 36 */}
            <FilterGroup label="Outcome">
              {outcomes.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFilters((prev) => ({ ...prev, outcome: o.value }))}
                  data-testid={`button-outcome-${o.value}`}
                  aria-pressed={filters.outcome === o.value}
                  className={pillClass(filters.outcome === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </FilterGroup>

            {/* Position: QB / RB / WR / TE (multi-select, color-coded; all on by default).
                Hidden on Overview, which always spans every position. */}
            {showPositionFilter && (
              <FilterGroup label="Position">
                {positions.map((p) => {
                  const active = filters.positions.includes(p);
                  return (
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
                      aria-pressed={active}
                      className={cn(
                        pillBaseClass,
                        active
                          ? cn(posStyles[p].active, "border border-[#d4af37]/25")
                          : posStyles[p].idle,
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </FilterGroup>
            )}

            {/* Round: 1–5 (multi-select; all on by default).
                Hidden on Overview, which always spans every round. */}
            {showRoundFilter && (
              <FilterGroup label="Round">
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
                    aria-pressed={filters.rounds.includes(r)}
                    aria-label={`Round ${r}`}
                    className={pillClass(filters.rounds.includes(r), "sm:w-8 sm:px-0")}
                  >
                    {r}
                  </button>
                ))}
              </FilterGroup>
            )}

            {/* Min Games: numeric input inside a matching strip */}
            <FilterGroup label="Min Games" className="sm:flex-none">
              <input
                type="number"
                inputMode="numeric"
                value={filters.minGames}
                onChange={(e) => setFilters((f) => ({ ...f, minGames: parseInt(e.target.value) || 1 }))}
                min={1}
                max={17}
                aria-label="Minimum games played"
                data-testid="input-min-games"
                className="w-full min-w-0 flex-1 sm:flex-none sm:w-[52px] h-full bg-transparent px-2 text-[11px] font-semibold tabular-nums text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <span className="pr-2 text-[11px] font-semibold text-muted-foreground/60 select-none">games</span>
            </FilterGroup>

          </div>
        </div>
      </div>
    </div>
  );
}
