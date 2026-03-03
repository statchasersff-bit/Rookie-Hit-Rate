import { useState, useMemo } from "react";
import { useData } from "@/lib/data-context";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlayerDrawer } from "./player-drawer";
import type { PlayerSummary, Pos } from "@/lib/types";

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

type SortField = "player_name" | "pos" | "current_nfl_team" | "rookie_year" | "rookie_round" | "hit_type" | "breakout_time";
type SortDir = "asc" | "desc";

export function PlayerTable() {
  const { playerSummaries, filters } = useData();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rookie_year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterPos, setFilterPos] = useState<Pos | "">("");
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

    if (filters.yearStart || filters.yearEnd) {
      result = result.filter((p) => p.rookie_year >= filters.yearStart && p.rookie_year <= filters.yearEnd);
    }

    if (filterPos) {
      result = result.filter((p) => p.pos === filterPos);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p) => p.player_name.toLowerCase().includes(s));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "player_name": cmp = a.player_name.localeCompare(b.player_name); break;
        case "pos": cmp = a.pos.localeCompare(b.pos); break;
        case "current_nfl_team": cmp = a.current_nfl_team.localeCompare(b.current_nfl_team); break;
        case "rookie_year": cmp = a.rookie_year - b.rookie_year; break;
        case "rookie_round": cmp = a.rookie_round - b.rookie_round || a.rookie_pick - b.rookie_pick; break;
        case "hit_type": {
          const order: Record<string, number> = { elite: 0, starter: 1, flex: 2, bust: 3, too_early: 4 };
          cmp = order[a.hit_type] - order[b.hit_type]; break;
        }
        case "breakout_time": cmp = (a.breakout_time ?? 99) - (b.breakout_time ?? 99); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [playerSummaries, search, sortField, sortDir, filterPos, filters]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const positions: Pos[] = ["QB", "RB", "WR", "TE"];

  return (
    <div className="space-y-4" data-testid="player-table">
      <div>
        <h2 className="text-xl font-bold text-[#0b3a7a] dark:text-white">Player Explorer</h2>
        <div className="w-12 h-[3px] bg-gradient-to-r from-[#d4af37] to-[#d4af37]/50 mt-1 rounded-full" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-[#0b3a7a]/20 dark:border-[#d4af37]/20 bg-transparent focus:outline-none focus:ring-1 focus:ring-[#0b3a7a] dark:focus:ring-[#d4af37]"
            data-testid="input-player-search"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterPos("")}
            className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
              !filterPos
                ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628]"
                : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
            }`}
            data-testid="button-player-all"
          >
            All
          </button>
          {positions.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPos(p)}
              className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
                filterPos === p
                  ? "bg-[#0b3a7a] text-white border-[#0b3a7a] dark:bg-[#d4af37] dark:text-[#0a1628]"
                  : "border-[#0b3a7a]/20 text-[#0b3a7a]/60 dark:border-[#d4af37]/20 dark:text-[#d4af37]/60"
              }`}
              data-testid={`button-player-pos-${p.toLowerCase()}`}
            >
              {p}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} players</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#0b3a7a]/5 dark:border-[#d4af37]/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0b3a7a]/5 dark:bg-[#d4af37]/5">
              {[
                { field: "player_name" as SortField, label: "Player" },
                { field: "pos" as SortField, label: "Pos" },
                { field: "current_nfl_team" as SortField, label: "Team" },
                { field: "rookie_year" as SortField, label: "Year" },
                { field: "rookie_round" as SortField, label: "Pick" },
                { field: "hit_type" as SortField, label: "Best Finish" },
                { field: "breakout_time" as SortField, label: "Breakout" },
                { field: "hit_type" as SortField, label: "Status" },
              ].map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer select-none"
                  onClick={() => handleSort(col.field)}
                >
                  {col.label}
                  <SortIcon field={col.field} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((player) => (
              <tr
                key={player.player_id}
                className="border-t border-[#0b3a7a]/5 dark:border-[#d4af37]/5 cursor-pointer transition-colors hover:bg-[#0b3a7a]/3 dark:hover:bg-[#d4af37]/5"
                onClick={() => setSelectedPlayer(player)}
                data-testid={`row-player-${player.player_id}`}
              >
                <td className="px-3 py-2 font-medium text-[#0b3a7a] dark:text-white">{player.player_name}</td>
                <td className="px-3 py-2">
                  <span className="text-xs font-medium">{player.pos}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{player.current_nfl_team}</td>
                <td className="px-3 py-2 tabular-nums">{player.rookie_year}</td>
                <td className="px-3 py-2 tabular-nums">{player.rookie_round}.{String(player.rookie_pick).padStart(2, "0")}</td>
                <td className="px-3 py-2 text-xs">{player.best_finish}</td>
                <td className="px-3 py-2 tabular-nums text-xs">
                  {player.breakout_time ? `Year ${player.breakout_time}` : "—"}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary" className={`text-[10px] ${hitTypeColors[player.hit_type]}`}>
                    {hitTypeLabels[player.hit_type] || player.hit_type}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 text-center">
            Showing 100 of {filtered.length} players
          </div>
        )}
      </div>

      {selectedPlayer && (
        <PlayerDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
