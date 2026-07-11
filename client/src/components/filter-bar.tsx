import { X, SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useData, defaultFilters } from "@/lib/data-context";
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
  { value: "elite", label: "Top 12" },
  { value: "starter", label: "Top 24" },
  { value: "flex", label: "Top 36" },
];

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="scff-eyebrow">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

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
    <div className="bg-card/95 backdrop-blur-md border-b border-border" data-testid="filter-bar">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
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

        <div id="scff-filter-panel" className={`${expanded ? "block" : "hidden sm:block"} py-3.5 space-y-3`}>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <FieldGroup label="Seasons">
              <div className="flex items-center gap-2.5 min-w-[200px] pb-1">
                <span className="text-xs font-semibold tabular-nums text-foreground w-9">{filters.yearStart}</span>
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
                <span className="text-xs font-semibold tabular-nums text-foreground w-9">{filters.yearEnd}</span>
              </div>
            </FieldGroup>

            <FieldGroup label="Format">
              {formats.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilters((prev) => ({ ...prev, format: f.value }))}
                  data-testid={`button-format-${f.label.toLowerCase()}`}
                  data-selected={filters.format === f.value}
                  aria-pressed={filters.format === f.value}
                  className="scff-chip px-2.5 h-8 text-xs"
                >
                  {f.label}
                </button>
              ))}
            </FieldGroup>

            <FieldGroup label="Scoring">
              {scorings.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setFilters((prev) => ({ ...prev, scoring: s.value }))}
                  data-testid={`button-scoring-${s.label.toLowerCase()}`}
                  data-selected={filters.scoring === s.value}
                  aria-pressed={filters.scoring === s.value}
                  className="scff-chip px-2.5 h-8 text-xs"
                >
                  {s.label}
                </button>
              ))}
            </FieldGroup>

            <FieldGroup label="Outcome">
              {outcomes.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFilters((prev) => ({ ...prev, outcome: o.value }))}
                  data-testid={`button-outcome-${o.value}`}
                  data-selected={filters.outcome === o.value}
                  aria-pressed={filters.outcome === o.value}
                  className="scff-chip px-2.5 h-8 text-xs"
                >
                  {o.label}
                </button>
              ))}
            </FieldGroup>

            <FieldGroup label="Position">
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
                  data-selected={filters.positions.includes(p)}
                  aria-pressed={filters.positions.includes(p)}
                  className="scff-chip px-2.5 h-8 text-xs"
                >
                  {p}
                </button>
              ))}
            </FieldGroup>

            <FieldGroup label="Round">
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
                  data-selected={filters.rounds.includes(r)}
                  aria-pressed={filters.rounds.includes(r)}
                  aria-label={`Round ${r}`}
                  className="scff-chip w-8 h-8 text-xs"
                >
                  {r}
                </button>
              ))}
            </FieldGroup>

            <FieldGroup label="Min Games">
              <input
                type="number"
                value={filters.minGames}
                onChange={(e) => setFilters((f) => ({ ...f, minGames: parseInt(e.target.value) || 1 }))}
                className="scff-input w-16 h-8 px-2.5 text-xs tabular-nums"
                min={1}
                max={17}
                aria-label="Minimum games played"
                data-testid="input-min-games"
              />
            </FieldGroup>
          </div>

          {activePills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1" data-testid="filter-pills">
              <span className="scff-eyebrow mr-0.5">Active</span>
              {activePills.map((pill, i) => (
                <button
                  key={i}
                  onClick={pill.onRemove}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-md text-xs font-semibold bg-accent text-accent-foreground border border-[#d4af37]/30 hover-elevate transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/50"
                  aria-label={`Remove ${pill.label} filter`}
                  data-testid={`pill-${pill.label}`}
                >
                  {pill.label}
                  <X className="w-3 h-3 opacity-70" />
                </button>
              ))}
              <button
                onClick={() => setFilters(defaultFilters)}
                className="inline-flex items-center gap-1 ml-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                data-testid="button-clear-filters"
              >
                <RotateCcw className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
