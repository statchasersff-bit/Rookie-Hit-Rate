import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/data-context";
import { computeTrends, type TrendPoint, LATEST_SEASON_WITH_DATA } from "@/lib/cohort";
import { SnapshotStat } from "@/components/SnapshotStat";
import { PlayerAvatar } from "@/components/player-avatar";
import { TrendingUp, TrendingDown, Target, AlertTriangle, Trophy, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiAccent } from "@/lib/kpiCardStyle";
import type { Outcome, Pos } from "@/lib/types";
import {
  AVATAR_GAP,
  PAD_LEFT,
  PAD_RIGHT_NORMAL,
  PAD_RIGHT_TIGHT,
  buildLadder,
  chooseLayout,
  sameLayout,
  type BoardLayout,
  type RoundWidth,
} from "@/lib/draftBoardLayout";

const posLineColors: Record<Pos, string> = {
  QB: "#dc2626",
  RB: "#059669",
  WR: "#2563eb",
  TE: "#d4af37",
};


interface Insight {
  icon: typeof TrendingUp;
  title: string;
  stat: string;
  body: string;
  tone: "positive" | "negative" | "neutral";
  accent: KpiAccent;
}

// All featured-card bodies use the same light gray as the card titles
// (matches SnapshotStat's label color), regardless of the insight's tone.
const toneContextColor: Record<Insight["tone"], string> = {
  positive: "text-slate-500 dark:text-slate-400",
  negative: "text-slate-500 dark:text-slate-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

type PosAgg = { pos: Pos; hits: number; n: number; hitRate: number };

function generateInsights(
  data: TrendPoint[],
  byPosition: PosAgg[],
  outcomeName: string
): Insight[] {
  if (data.length < 1) return [];
  const insights: Insight[] = [];

  // Best / worst draft class (by year, pooled across the selected positions & rounds).
  const best = data.reduce((a, b) => (b.hitRate > a.hitRate ? b : a));
  insights.push({
    icon: Trophy,
    title: "Best Overall Class",
    stat: `${(best.hitRate * 100).toFixed(0)}% (${best.year})`,
    body: `${best.hits}/${best.n} players hit ${outcomeName.toLowerCase()}.${best.n < 5 ? " (Small sample)" : ""}`,
    tone: "positive",
    accent: "emerald",
  });

  const worst = data.reduce((a, b) => (b.hitRate < a.hitRate ? b : a));
  if (worst.year !== best.year) {
    insights.push({
      icon: AlertTriangle,
      title: "Worst Overall Class",
      stat: `${(worst.hitRate * 100).toFixed(0)}% (${worst.year})`,
      body: `${worst.hits}/${worst.n} players hit ${outcomeName.toLowerCase()}.${worst.hitRate === 0 ? " Complete shutout." : ""}`,
      tone: "negative",
      accent: "rose",
    });
  }

  // Best / worst position (aggregated across every selected class & round).
  const posWithData = byPosition.filter((p) => p.n > 0);
  if (posWithData.length > 0) {
    const bestPos = posWithData.reduce((a, b) => (b.hitRate > a.hitRate ? b : a));
    insights.push({
      icon: Target,
      title: "Best Overall Position",
      stat: `${(bestPos.hitRate * 100).toFixed(0)}% (${bestPos.pos})`,
      body: `${bestPos.hits}/${bestPos.n} hit ${outcomeName.toLowerCase()} across ${data.length} classes.`,
      tone: "positive",
      accent: "emerald",
    });

    if (posWithData.length > 1) {
      const worstPos = posWithData.reduce((a, b) => (b.hitRate < a.hitRate ? b : a));
      if (worstPos.pos !== bestPos.pos) {
        insights.push({
          icon: TrendingDown,
          title: "Worst Overall Position",
          stat: `${(worstPos.hitRate * 100).toFixed(0)}% (${worstPos.pos})`,
          body: `${worstPos.hits}/${worstPos.n} hit ${outcomeName.toLowerCase()} across ${data.length} classes.`,
          tone: "negative",
          accent: "rose",
        });
      }
    }
  }

  return insights;
}

const allPositions: Pos[] = ["QB", "RB", "WR", "TE"];
const allRounds = [1, 2, 3, 4, 5];

// Position-rank cutoff for a "hit" at the selected outcome (matches computeTrends).
const hitThreshold = (o: Outcome) => (o === "elite" ? 12 : o === "starter" ? 24 : 36);

// One row per draft class (season): number of players who hit at each position
// (pooled across all rookie rounds), plus the row total.
interface ClassRow {
  year: number;
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  total: number;
}

// A single drafted rookie, used to render the expandable per-class draft board.
interface BoardPlayer {
  id: string;
  name: string;
  pos: Pos;
  round: number;
  pick: number;
  hit: boolean;
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

// "Ja'Marr Chase" -> "J. Chase" (keeps any multi-word surname / suffix).
function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

// Text measurement for the board's layout ladder. The maths lives in
// lib/draftBoardLayout; this half is the DOM-dependent bit.

const measureCanvas =
  typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

function textWidth(text: string, font: string): number {
  if (!measureCanvas) return text.length * 6; // SSR / no canvas: rough fallback
  measureCanvas.font = font;
  return measureCanvas.measureText(text).width;
}

function fontOf(el: HTMLElement | null): string {
  if (!el) return "normal 500 11px sans-serif";
  const cs = getComputedStyle(el);
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
}

/** Widest name (and widest pick/POS line) in each round, at both name formats. */
function measureRounds(
  byRound: Map<number, BoardPlayer[]>,
  nameFont: string,
  metaFont: string,
): Map<number, RoundWidth> {
  const out = new Map<number, RoundWidth>();
  byRound.forEach((players, rd) => {
    let full = 0;
    let abbrev = 0;
    for (const p of players) {
      full = Math.max(full, textWidth(p.name, nameFont));
      abbrev = Math.max(abbrev, textWidth(abbreviateName(p.name), nameFont));
      // The "1.05 WR" line sits under the name and can out-width a short one.
      const meta = textWidth(`${p.round}.${pad2(p.pick)} ${p.pos}`, metaFont) + 4;
      full = Math.max(full, meta);
      abbrev = Math.max(abbrev, meta);
    }
    out.set(rd, { full, abbrev });
  });
  return out;
}

// The expanded draft board for one class: every rookie drafted that year, laid
// out with one column per round and ordered by pick. Players who hit are shown
// at full strength (headshot + pos color + accent); misses are faded/shaded.
function DraftBoard({ players }: { players: BoardPlayer[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const nameProbeRef = useRef<HTMLSpanElement>(null);
  const metaProbeRef = useRef<HTMLSpanElement>(null);

  const { byRound, roundsSorted } = useMemo(() => {
    const m = new Map<number, BoardPlayer[]>();
    for (const p of players) {
      if (!m.has(p.round)) m.set(p.round, []);
      m.get(p.round)!.push(p);
    }
    return { byRound: m, roundsSorted: Array.from(m.keys()).sort((a, b) => a - b) };
  }, [players]);

  const ladder = useMemo(() => buildLadder(roundsSorted.length), [roundsSorted.length]);
  const [layout, setLayout] = useState<BoardLayout>(() => ladder[0]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const choose = () => {
      const cs = getComputedStyle(grid);
      const gap = parseFloat(cs.columnGap) || 8;
      // clientWidth includes padding, so take the board's px-3 back off.
      const avail =
        grid.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      if (avail <= 0) return;
      const widths = measureRounds(byRound, fontOf(nameProbeRef.current), fontOf(metaProbeRef.current));
      const pick = chooseLayout(ladder, roundsSorted, widths, avail, gap);
      // Compare by value: rebuilding the ladder must not force a re-render.
      setLayout((prev) => (sameLayout(prev, pick) ? prev : pick));
    };

    choose();
    const ro = new ResizeObserver(choose);
    ro.observe(grid);
    // Text measurement is only trustworthy once the real font is in.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) choose();
    });
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [byRound, roundsSorted, ladder]);

  const bare = layout.chrome === "none";
  const padLeft = bare ? 0 : PAD_LEFT;
  const padRight = bare ? 0 : layout.chrome === "tight" ? PAD_RIGHT_TIGHT : PAD_RIGHT_NORMAL;

  return (
    <div
      ref={gridRef}
      className="grid gap-2 sm:gap-3 px-3 py-3 bg-[var(--sc-card-soft)]/40"
      style={{
        gridTemplateColumns: layout.fill
          ? `repeat(${layout.cols}, minmax(0, 1fr))`
          : `repeat(${layout.cols}, max-content)`,
      }}
    >
      {/* Off-screen probes: canvas text measurement needs the resolved font. */}
      <span ref={nameProbeRef} aria-hidden="true" className="invisible absolute text-[11px] font-medium" />
      <span ref={metaProbeRef} aria-hidden="true" className="invisible absolute text-[10px] font-bold" />

      {roundsSorted.map((rd) => (
        <div key={rd} className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
            Round {rd}
          </div>
          <div className="space-y-1.5">
            {byRound.get(rd)!.map((p) => (
              <div
                key={p.id}
                data-testid={`board-player-${p.id}`}
                className={cn(
                  "flex items-center py-1 transition-colors",
                  !bare && "rounded-md border",
                  !bare && (p.hit ? "bg-card border-border shadow-sm" : "border-transparent bg-transparent"),
                  !p.hit && "opacity-45 saturate-[.6]",
                )}
                style={{
                  paddingLeft: padLeft,
                  paddingRight: padRight,
                  columnGap: AVATAR_GAP,
                  ...(p.hit && !bare
                    ? { borderLeftColor: posLineColors[p.pos], borderLeftWidth: 3 }
                    : null),
                }}
              >
                <PlayerAvatar
                  playerId={p.id}
                  playerName={p.name}
                  className={cn("flex-shrink-0", !p.hit && "grayscale")}
                />
                <div className="min-w-0 flex-1 leading-tight">
                  <div
                    className={cn(
                      "truncate text-[11px] font-medium",
                      p.hit ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {layout.abbrev ? abbreviateName(p.name) : p.name}
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="tabular-nums font-semibold text-muted-foreground">
                      {p.round}.{pad2(p.pick)}
                    </span>
                    <span className="font-bold" style={{ color: p.hit ? posLineColors[p.pos] : undefined }}>
                      {p.pos}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type SortKey = "year" | Pos | "total";
type SortDir = "asc" | "desc";

// Header columns for the class-hit table, in render order.
const classColumns: { key: SortKey; label: string; align: "left" | "right"; className?: string; color?: string }[] = [
  { key: "year", label: "Draft Class", align: "left", className: "text-white/70" },
  ...allPositions.map((pos) => ({ key: pos as SortKey, label: pos, align: "right" as const, color: posLineColors[pos] })),
  { key: "total", label: "Total", align: "right", className: "text-white" },
];

// A single table of players who hit by position across the selected seasons.
// Column headers are sortable; each row expands to reveal that class's draft board.
function ClassTable({
  rows,
  boardsByYear,
  expanded,
  onToggle,
}: {
  rows: ClassRow[];
  boardsByYear: Map<number, BoardPlayer[]>;
  expanded: Set<number>;
  onToggle: (year: number) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "year", dir: "asc" });

  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "year" ? "asc" : "desc" },
    );

  const sortedRows = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const diff = a[sort.key] - b[sort.key];
      // Stable tiebreak by year (ascending) so equal counts keep a sensible order.
      return (diff !== 0 ? diff * dir : a.year - b.year);
    });
  }, [rows, sort]);

  return (
    <div className="mt-1.5 overflow-x-auto">
      <table className="w-full text-sm border border-border" data-testid="class-hits-table">
        <thead>
          <tr className="bg-[#0b1634] border-b border-border">
            {classColumns.map((col) => {
              const active = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={cn(
                    "uppercase tracking-wider font-bold text-[11px] py-2 px-3",
                    col.align === "left" ? "text-left" : "text-right",
                    col.className,
                  )}
                  // Active sort column is highlighted gold (overrides the column's default color).
                  style={{ color: active ? "#d4af37" : col.color }}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    data-testid={`sort-${col.key}`}
                    className={cn(
                      "inline-flex items-center gap-1 select-none hover:opacity-80 focus:outline-none uppercase tracking-wider font-bold",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    <span>{col.label}</span>
                    {active ? (
                      sort.dir === "asc" ? (
                        <ChevronUp className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3 h-3" aria-hidden="true" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-40" aria-hidden="true" />
                    )}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => {
            const isOpen = expanded.has(r.year);
            const board = boardsByYear.get(r.year) ?? [];
            return (
              <Fragment key={r.year}>
                <tr
                  className="border-b border-border/40 last:border-0 cursor-pointer hover:bg-[var(--sc-card-soft)]/60"
                  onClick={() => onToggle(r.year)}
                  data-testid={`class-row-${r.year}`}
                  aria-expanded={isOpen}
                >
                  <td className="py-1.5 px-3 font-semibold text-[#0b1634] dark:text-white tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronRight
                        className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                        aria-hidden="true"
                      />
                      {r.year}
                    </span>
                  </td>
                  {allPositions.map((pos) => (
                    <td key={pos} className="py-1.5 px-3 text-right tabular-nums">{r[pos]}</td>
                  ))}
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-[#0b3a7a] dark:text-[#d4af37]">{r.total}</td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border/40 last:border-0">
                    <td colSpan={allPositions.length + 2} className="p-0">
                      {board.length > 0 ? (
                        <DraftBoard players={board} />
                      ) : (
                        <p className="text-xs text-muted-foreground px-3 py-3">No draft board available for this class.</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TrendsChart() {
  const { filteredDrafts, rankMap, filters } = useData();

  // Position + round come from the header filter bar (multi-select).
  const positions = filters.positions.length > 0 ? allPositions.filter((p) => filters.positions.includes(p)) : allPositions;
  const rounds = filters.rounds.length > 0 ? allRounds.filter((r) => filters.rounds.includes(r)) : allRounds;

  // One raw series per selected position × round combination.
  const series = useMemo(() => {
    const list: { pos: Pos; round: number; key: string; name: string; raw: TrendPoint[] }[] = [];
    for (const pos of positions) {
      for (const round of rounds) {
        list.push({
          pos,
          round,
          key: `${pos}_${round}`,
          name: `${pos} Rd${round}`,
          raw: computeTrends(filteredDrafts, rankMap, pos, round, filters.outcome, filters.minGames),
        });
      }
    }
    return list;
    // filters.positions / filters.rounds are the stable inputs behind `positions`/`rounds`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDrafts, rankMap, filters.positions, filters.rounds, filters.outcome, filters.minGames]);

  // Pool all selected cohorts by year for the summary insights.
  const pooled = useMemo(() => {
    const byYear = new Map<number, TrendPoint>();
    for (const s of series) {
      for (const t of s.raw) {
        const cur = byYear.get(t.year) ?? { year: t.year, hitRate: 0, n: 0, hits: 0, eliteHits: 0, starterHits: 0, bustCount: 0, incomplete: t.incomplete };
        cur.n += t.n;
        cur.hits += t.hits;
        cur.eliteHits += t.eliteHits;
        cur.starterHits += t.starterHits;
        cur.bustCount += t.bustCount;
        cur.incomplete = cur.incomplete || t.incomplete;
        byYear.set(t.year, cur);
      }
    }
    const rows = Array.from(byYear.values()).sort((a, b) => a.year - b.year);
    for (const r of rows) r.hitRate = r.n > 0 ? r.hits / r.n : 0;
    return rows;
  }, [series]);

  const outcomeName = filters.outcome === "elite" ? "Top-12" : filters.outcome === "starter" ? "Top-24" : "Top-36";

  // Aggregate every selected series down to one row per position (pooled across
  // rounds and classes) for the "Best/Worst Overall Position" cards.
  const byPosition = useMemo(() => {
    const map = new Map<Pos, PosAgg>();
    for (const s of series) {
      const cur = map.get(s.pos) ?? { pos: s.pos, hits: 0, n: 0, hitRate: 0 };
      for (const t of s.raw) {
        cur.hits += t.hits;
        cur.n += t.n;
      }
      map.set(s.pos, cur);
    }
    const rows = Array.from(map.values());
    for (const r of rows) r.hitRate = r.n > 0 ? r.hits / r.n : 0;
    return rows;
  }, [series]);

  const insights = useMemo(
    () => generateInsights(pooled, byPosition, outcomeName),
    [pooled, byPosition, outcomeName]
  );

  // Single draft-class table: for each selected season, the number of players
  // who hit at each position, pooled across every rookie round. Always spans
  // every round & position regardless of the position/round filter; respects
  // the year range, outcome, and min-games filters.
  const classRows = useMemo(() => {
    const yStart = filters.yearStart;
    const yEnd = Math.min(filters.yearEnd, LATEST_SEASON_WITH_DATA);

    // hits[pos] = Map<year, hits summed across all rounds>. `drafted` tracks the
    // total players drafted per year so we can keep real classes that hit zero
    // while dropping years with no draft class at all.
    const hitsByPos: Record<string, Map<number, number>> = {};
    const drafted = new Map<number, number>();
    for (const pos of allPositions) {
      const m = new Map<number, number>();
      for (const round of allRounds) {
        const raw = computeTrends(filteredDrafts, rankMap, pos, round, filters.outcome, filters.minGames);
        for (const t of raw) {
          m.set(t.year, (m.get(t.year) ?? 0) + t.hits);
          drafted.set(t.year, (drafted.get(t.year) ?? 0) + t.n);
        }
      }
      hitsByPos[pos] = m;
    }

    const rows: ClassRow[] = [];
    for (let y = yStart; y <= yEnd; y++) {
      if ((drafted.get(y) ?? 0) === 0) continue;
      const counts = allPositions.map((p) => hitsByPos[p].get(y) ?? 0);
      const total = counts.reduce((a, b) => a + b, 0);
      rows.push({
        year: y,
        QB: counts[0],
        RB: counts[1],
        WR: counts[2],
        TE: counts[3],
        total,
      });
    }
    return rows;
  }, [filteredDrafts, rankMap, filters.yearStart, filters.yearEnd, filters.outcome, filters.minGames]);

  // Full draft board per class (year → every rookie drafted, rounds 1–5), with a
  // per-player hit flag using the same rule as the class-hit counts above.
  const boardsByYear = useMemo(() => {
    const threshold = hitThreshold(filters.outcome);
    const map = new Map<number, BoardPlayer[]>();
    for (const d of filteredDrafts) {
      if (d.rookie_year > LATEST_SEASON_WITH_DATA) continue;
      if (!allRounds.includes(d.rookie_round)) continue;
      const seasons = rankMap.get(d.player_id) || [];
      const hit = seasons.some(
        (s) => s.games >= filters.minGames && s.season >= d.rookie_year && s.pos_rank <= threshold,
      );
      if (!map.has(d.rookie_year)) map.set(d.rookie_year, []);
      map.get(d.rookie_year)!.push({
        id: d.player_id,
        name: d.player_name,
        pos: d.pos,
        round: d.rookie_round,
        pick: d.rookie_pick,
        hit,
      });
    }
    Array.from(map.values()).forEach((arr) => arr.sort((a, b) => a.round - b.round || a.pick - b.pick));
    return map;
  }, [filteredDrafts, rankMap, filters.outcome, filters.minGames]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const toggleYear = (year: number) =>
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });

  return (
    <div className="space-y-4" data-testid="trends-chart">
      {insights.length > 0 && (
        <div data-testid="trends-analysis">
          <div className="grid grid-cols-2 gap-2 min-[521px]:gap-3 min-[521px]:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] md:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {insights.map((insight, idx) => (
              <SnapshotStat
                key={idx}
                label={insight.title}
                value={insight.stat}
                context={insight.body}
                contextColor={toneContextColor[insight.tone]}
                icon={insight.icon}
                accent={insight.accent}
                testId={`insight-${idx}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3" data-testid="class-hits-section">
        <div>
          <h2 className="scff-title text-[clamp(1.25rem,2.4vw,1.6rem)] text-[#0b1634] dark:text-white">Players Who Hit by Class</h2>
          <div className="scff-accent-bar mt-1.5" />
          <p className="text-sm text-muted-foreground mt-1">
            Number of players who hit {outcomeName.toLowerCase()} at each position per draft class, pooled across every rookie round. Click a class to see its full draft board.
          </p>
        </div>

        {classRows.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-2">No draft classes in the selected range.</p>
        ) : (
          <ClassTable
            rows={classRows}
            boardsByYear={boardsByYear}
            expanded={expandedYears}
            onToggle={toggleYear}
          />
        )}
      </div>
    </div>
  );
}
