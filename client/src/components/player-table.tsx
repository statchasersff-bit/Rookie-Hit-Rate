import { useState, useMemo } from "react";
import { useData } from "@/lib/data-context";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlayerDrawer } from "./player-drawer";
import type { PlayerSummary } from "@/lib/types";

const hitTypeColors: Record<string, string> = {
  elite: "bg-[#d4af37]/20 text-[#b8960e] dark:bg-[#d4af37]/30 dark:text-[#d4af37]",
  starter: "bg-[#0b3a7a]/10 text-[#0b3a7a] dark:bg-[#0b3a7a]/30 dark:text-[#5a9be6]",
  flex: "bg-[#0b3a7a]/5 text-[#0b3a7a]/70 dark:bg-[#1a3a6a]/30 dark:text-[#8ab4e8]",
  bust: "bg-[#7a3a3a]/10 text-[#7a3a3a] dark:bg-[#7a3a3a]/20 dark:text-[#d4837a]",
  too_early: "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400",
};

const hitTypeLabels: Record<string, string> = {
  elite: "Elite",
  starter: "Starter",
  flex: "Flex",
  bust: "Bust",
  too_early: "Too Early",
};

type SortField = "player_name" | "pos" | "current_nfl_team" | "rookie_year" | "rookie_round" | "best_finish" | "hit_type" | "breakout_time";
type SortDir = "asc" | "desc";

export function PlayerTable() {
  const { playerSummaries, filters } = useData();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rookie_year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);

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
        case "best_finish": cmp = a.best_finish_year - b.best_finish_year; break;
        case "hit_type": {
          const order: Record<string, number> = { elite: 0, starter: 1, flex: 2, bust: 3, too_early: 4 };
          cmp = (order[a.hit_type] ?? 5) - (order[b.hit_type] ?? 5); break;
        }
        case "breakout_time": cmp = (a.breakout_time ?? 99) - (b.breakout_time ?? 99); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [playerSummaries, search, sortField, sortDir, filters]);

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
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="scff-input w-full h-10 pl-9 pr-3 text-sm"
            aria-label="Search players by name"
            data-testid="input-player-search"
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          <span className="font-bold text-foreground">{filtered.length}</span> player{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="scff-card overflow-hidden p-0">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-secondary/80 backdrop-blur-sm border-b border-border">
              {[
                { field: "player_name" as SortField, label: "Player" },
                { field: "pos" as SortField, label: "Pos" },
                { field: "current_nfl_team" as SortField, label: "Team" },
                { field: "rookie_year" as SortField, label: "Year" },
                { field: "rookie_round" as SortField, label: "Pick" },
                { field: "best_finish" as SortField, label: "Best Finish" },
                { field: "breakout_time" as SortField, label: "Breakout" },
                { field: "hit_type" as SortField, label: "Status" },
              ].map((col, i) => (
                <th
                  key={col.field + i}
                  className={`px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-bold cursor-pointer select-none transition-colors hover:text-foreground ${sortField === col.field ? "text-foreground" : "text-muted-foreground"} ${i >= 3 ? "text-center" : ""}`}
                  onClick={() => handleSort(col.field)}
                  aria-sort={sortField === col.field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className={i >= 3 ? "inline-flex items-center justify-center" : "inline-flex items-center"}>
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
                <td colSpan={8} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-foreground">No players match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try widening the season range or clearing position/round filters{search ? " and the search box" : ""}.
                  </p>
                </td>
              </tr>
            )}
            {filtered.slice(0, 100).map((player) => (
              <tr
                key={player.player_id}
                className="border-t border-border/70 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setSelectedPlayer(player)}
                data-testid={`row-player-${player.player_id}`}
              >
                <td className="px-3 py-2.5 font-semibold text-[#0b1634] dark:text-white whitespace-nowrap">{player.player_name}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs font-semibold">{player.pos}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{player.current_nfl_team}</td>
                <td className="px-3 py-2.5 tabular-nums text-center">{player.rookie_year}</td>
                <td className="px-3 py-2.5 tabular-nums text-center">{player.rookie_round}.{String(player.rookie_pick).padStart(2, "0")}</td>
                <td className="px-3 py-2.5 text-xs text-center">{player.best_finish}</td>
                <td className="px-3 py-2.5 tabular-nums text-xs text-center">
                  {player.breakout_time ? `Year ${player.breakout_time}` : "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge variant="secondary" className={`text-[10px] ${hitTypeColors[player.hit_type]}`}>
                    {hitTypeLabels[player.hit_type] || player.hit_type}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-3 py-2.5 text-xs text-muted-foreground bg-secondary/50 border-t border-border text-center">
            Showing first <span className="font-semibold text-foreground tabular-nums">100</span> of <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> — refine filters to narrow the list.
          </div>
        )}
      </div>

      {selectedPlayer && (
        <PlayerDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
