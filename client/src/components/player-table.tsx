import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useData } from "@/lib/data-context";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TeamLogo } from "./team-logo";
import { PlayerAvatar } from "./player-avatar";
import { playerProfileUrl } from "@/lib/playerProfile";

// Position colors — same strong hues used across the heatmaps and cohort tables
// (QB red · RB emerald · WR blue · TE gold). Text-only, no background highlight.
const posTextColor: Record<string, string> = {
  QB: "#dc2626",
  RB: "#059669",
  WR: "#2563eb",
  TE: "#d4af37",
};

type SortField = "player_name" | "pos" | "current_nfl_team" | "rookie_year" | "rookie_round" | "best_finish" | "hit_type" | "breakout_time";

// Numeric position-rank pulled from a "RB3 (2019)" best-finish string (Infinity when N/A).
function parseFinishRank(bestFinish: string): number {
  const m = bestFinish.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Infinity;
}

// Comparator helper: rows whose value is missing ("—") always sort to the bottom,
// regardless of ascending/descending (the caller returns this BEFORE the sortDir
// flip). Returns null when neither is missing, so the caller falls through to its
// normal comparison.
function missingLast(aMissing: boolean, bMissing: boolean): number | null {
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return null;
}

// "Christian McCaffrey" → "C. McCaffrey" — used when the table is too narrow to
// show full names without horizontal scrolling.
function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2 || !parts[0]) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}
type SortDir = "asc" | "desc";

export function PlayerTable() {
  const { playerSummaries, filters, playerSearch: search } = useData();
  const [sortField, setSortField] = useState<SortField>("rookie_year");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  // When the table can't fit without horizontal scrolling, player names collapse
  // from "First Last" to "F. Last". `fullWidthNeeded` records the width the table
  // needs with full names (captured the moment it first overflows) so we only
  // restore full names once there's room again — this avoids the abbreviate→shrink
  // →fits→un-abbreviate→overflow oscillation right at the breakpoint.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [abbreviateNames, setAbbreviateNames] = useState(false);
  const fullWidthNeeded = useRef(0);

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
        case "best_finish": {
          const m = missingLast(a.best_finish === "N/A", b.best_finish === "N/A");
          if (m !== null) return m;
          cmp = parseFinishRank(a.best_finish) - parseFinishRank(b.best_finish); break;
        }
        case "hit_type": {
          const order: Record<string, number> = { elite: 0, starter: 1, flex: 2, bust: 3, too_early: 4 };
          cmp = (order[a.hit_type] ?? 5) - (order[b.hit_type] ?? 5); break;
        }
        case "breakout_time": {
          const m = missingLast(a.breakout_time == null, b.breakout_time == null);
          if (m !== null) return m;
          cmp = (a.breakout_time as number) - (b.breakout_time as number); break;
        }
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

  const measureOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setAbbreviateNames((prev) => {
      if (!prev) {
        // Full names are showing, so scrollWidth is the real width they require.
        fullWidthNeeded.current = el.scrollWidth;
        return el.scrollWidth > el.clientWidth + 1;
      }
      // Already abbreviated: only restore full names once they'd fit again.
      return el.clientWidth < fullWidthNeeded.current;
    });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measureOverflow();
    const ro = new ResizeObserver(measureOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureOverflow]);

  // Column widths can shift when the rendered rows change, so re-check overflow.
  useLayoutEffect(() => {
    measureOverflow();
  }, [pageRows, measureOverflow]);

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

      <div ref={scrollRef} className="overflow-x-auto border border-border rounded-md [container-type:inline-size]">
        <table className="w-full [--rhr-fs:clamp(11.2px,2cqw,14px)] text-[var(--rhr-fs)]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0b1634] backdrop-blur-sm border-b border-border">
              {[
                { field: "player_name" as SortField, label: "Player" },
                { field: "current_nfl_team" as SortField, label: "Team" },
                { field: "rookie_year" as SortField, label: "Drafted" },
                { field: "rookie_round" as SortField, label: "Pick" },
                { field: "best_finish" as SortField, label: "Best Finish" },
                { field: "breakout_time" as SortField, label: "Breakout" },
              ].map((col, i) => (
                <th
                  key={col.field + i}
                  className={`px-[clamp(5px,0.9cqw,12px)] py-px text-left text-[calc(var(--rhr-fs)*0.714)] uppercase tracking-wider font-bold cursor-pointer select-none transition-colors ${sortField === col.field ? "text-[#d4af37]" : "text-white/70 hover:text-white"} ${i >= 2 ? "text-center" : ""}`}
                  onClick={() => handleSort(col.field)}
                  aria-sort={sortField === col.field ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className={i >= 2 ? "inline-flex items-center justify-center" : "inline-flex items-center"}>
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
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
                className="border-t border-border/70 transition-colors hover:bg-accent/50"
                data-testid={`row-player-${player.player_id}`}
              >
                <td className="px-[clamp(5px,0.9cqw,12px)] py-px text-[calc(var(--rhr-fs)*0.857)] font-semibold text-[#0b1634] dark:text-white whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <PlayerAvatar playerId={player.player_id} playerName={player.player_name} />
                    <a
                      href={playerProfileUrl(player.player_name)}
                      target="_top"
                      rel="noopener"
                      className="hover:text-[#0b3a7a] dark:hover:text-[#d4af37] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:underline focus-visible:text-[#0b3a7a] dark:focus-visible:text-[#d4af37] transition-colors"
                      data-testid={`link-player-${player.player_id}`}
                    >
                      {abbreviateNames ? abbreviateName(player.player_name) : player.player_name}
                    </a>
                  </span>
                </td>
                <td className="px-[clamp(5px,0.9cqw,12px)] py-px text-[calc(var(--rhr-fs)*0.857)] text-muted-foreground">
                  <TeamLogo team={player.current_nfl_team} />
                </td>
                <td className="px-[clamp(5px,0.9cqw,12px)] py-px tabular-nums text-[calc(var(--rhr-fs)*0.857)] text-center text-muted-foreground">{player.rookie_year}</td>
                <td className="px-[clamp(5px,0.9cqw,12px)] py-px tabular-nums text-[calc(var(--rhr-fs)*0.857)] text-center text-muted-foreground">{player.rookie_round}.{String(player.rookie_pick).padStart(2, "0")}</td>
                <td className="px-[clamp(5px,0.9cqw,12px)] py-px text-[calc(var(--rhr-fs)*0.857)] text-center">
                  {player.best_finish === "N/A" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="font-extrabold" style={{ color: posTextColor[player.pos] }}>
                      {player.best_finish.split(" (")[0]}
                    </span>
                  )}
                </td>
                <td className="px-[clamp(5px,0.9cqw,12px)] py-px tabular-nums text-[calc(var(--rhr-fs)*0.857)] text-center">
                  {player.breakout_time ? (player.breakout_time === 1 ? "Rookie" : `Year ${player.breakout_time}`) : "—"}
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
    </div>
  );
}
