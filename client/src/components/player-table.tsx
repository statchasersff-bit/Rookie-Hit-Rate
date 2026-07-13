import { useState, useMemo, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { PlayerDrawer } from "./player-drawer";
import { TeamLogo } from "./team-logo";
import { PlayerAvatar } from "./player-avatar";
import type { PlayerSummary } from "@/lib/types";

// Position colors — same hue language as the heatmap (QB red · RB emerald ·
// WR blue · TE gold). Text-only, no background highlight.
const posColors: Record<string, string> = {
  QB: "text-red-600 dark:text-red-400",
  RB: "text-emerald-600 dark:text-emerald-400",
  WR: "text-blue-600 dark:text-blue-400",
  TE: "text-[#8a6d12] dark:text-[#d4af37]",
};

type SortField = "player_name" | "pos" | "current_nfl_team" | "rookie_year" | "rookie_round" | "best_finish" | "best_finish_year" | "hit_type" | "breakout_time";

// Numeric position-rank pulled from a "RB3 (2019)" best-finish string (Infinity when N/A).
function parseFinishRank(bestFinish: string): number {
  const m = bestFinish.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}
type SortDir = "asc" | "desc";

export function PlayerTable() {
  const { playerSummaries, filters, playerSearch: search } = useData();
  const [sortField, setSortField] = useState<SortField>("rookie_year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = playerSummaries;

    result = result.filter((p) => p.rookie_year >= filters.yearStart && p.rookie_year <= filters.yearEnd);

    if (filters.positions.length > 0) {
      result = result.filter((p) => filters.positions.includes(p.pos));
    }

    if (filters.rounds.length > 0) {
      result = result.filter((p) => filters.rounds.includes(p.rookie_round));
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p) => p.player_name.toLowerCase().includes(s));
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "player_name": cmp = a.player_name.localeCompare(b.player_name); break;
        case "pos": cmp = a.pos.localeCompare(b.pos); break;
        case "current_nfl_team": cmp = a.current_nfl_team.localeCompare(b.current_nfl_team); break;
        case "rookie_year": cmp = a.rookie_year - b.rookie_year; break;
        case "rookie_round": cmp = a.rookie_round - b.rookie_round || a.rookie_pick - b.rookie_pick; break;
        case "best_finish": cmp = parseFinishRank(a.best_finish) - parseFinishRank(b.best_finish); break;
        case "best_finish_year": cmp = a.best_finish_year - b.best_finish_year; break;
        case "hit_type": {
          const order: Record<string, number> = { elite: 0, starter: 1, flex: 2, bust: 3, too_early: 4 };
          cmp = (order[a.hit_type] ?? 5) - (order[b.hit_type] ?? 5); break;
        }
        case "breakout_time": cmp = (a.breakout_time ?? 99) - (b.breakout_time ?? 99); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [playerSummaries, search, sortField, sortDir, filters]);

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(0);
  }, [search, sortField, sortDir, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageStart = clampedPage * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  return (
    <div className="space-y-4" data-testid="player-table">
      <div>
        <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Player Explorer</h2>
        <div className="scff-accent-bar mt-1.5" />
        <p className="text-sm text-muted-foreground mt-2">
          Every drafted rookie in range with their best positional finish, breakout timing, and outcome.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          <span className="font-bold text-foreground">{filtered.length}</span> player{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0b1634] backdrop-blur-sm border-b border-border">
              {[
                { field: "player_name" as SortField, label: "Player" },
                { field: "current_nfl_team" as SortField, label: "Team" },
                { field: "rookie_year" as SortField, label: "Drafted" },
                { field: "rookie_round" as SortField, label: "Pick" },
                { field: "best_finish" as SortField, label: "Best Finish" },
                { field: "best_finish_year" as SortField, label: "Finish Yr" },
                { field: "breakout_time" as SortField, label: "Breakout" },
              ].map((col, i) => (
                <th
                  key={col.field + i}
                  className={`px-3 py-px text-left text-[10px] uppercase tracking-wider font-bold cursor-pointer select-none transition-colors ${sortField === col.field ? "text-[#d4af37]" : "text-white/70 hover:text-white"} ${i >= 2 ? "text-center" : ""}`}
                  onClick={() => handleSort(col.field)}
                  aria-sort={sortField === col.field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className={i >= 2 ? "inline-flex items-center justify-center" : "inline-flex items-center"}>
                    {col.label}
                    <SortIcon field={col.field} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-foreground">No players match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try widening the season range or clearing position/round filters{search ? " and the search box" : ""}.
                  </p>
                </td>
              </tr>
            )}
            {pageRows.map((player) => (
              <tr
                key={player.player_id}
                className="border-t border-border/70 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setSelectedPlayer(player)}
                data-testid={`row-player-${player.player_id}`}
              >
                <td className="px-3 py-px font-semibold text-[#0b1634] dark:text-white whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <PlayerAvatar playerId={player.player_id} playerName={player.player_name} />
                    {player.player_name}
                  </span>
                </td>
                <td className="px-3 py-px text-xs text-muted-foreground">
                  <TeamLogo team={player.current_nfl_team} />
                </td>
                <td className="px-3 py-px tabular-nums text-xs text-center text-muted-foreground">{player.rookie_year}</td>
                <td className="px-3 py-px tabular-nums text-xs text-center text-muted-foreground">{player.rookie_round}.{String(player.rookie_pick).padStart(2, "0")}</td>
                <td className="px-3 py-px text-xs text-center">
                  {player.best_finish === "N/A" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={`font-semibold ${posColors[player.pos] || "text-foreground"}`}>
                      {player.best_finish.split(" (")[0]}
                    </span>
                  )}
                </td>
                <td className="px-3 py-px tabular-nums text-xs text-center text-muted-foreground">
                  {player.best_finish === "N/A" ? "—" : player.best_finish_year}
                </td>
                <td className="px-3 py-px tabular-nums text-xs text-center">
                  {player.breakout_time ? `Year ${player.breakout_time}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-foreground bg-secondary/50 border-t border-border">
            <span>
              Showing{" "}
              <span className="font-semibold text-foreground tabular-nums">{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span>{" "}
              of <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border font-medium transition-colors hover:bg-accent disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none"
                data-testid="button-page-prev"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <span className="px-2 tabular-nums">
                Page <span className="font-semibold text-foreground">{clampedPage + 1}</span> / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={clampedPage >= totalPages - 1}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border font-medium transition-colors hover:bg-accent disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none"
                data-testid="button-page-next"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      {selectedPlayer && (
        <PlayerDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
