import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type { RookieDraft, SeasonFinish, RankedSeason, Filters, CohortSummary, PlayerSummary, Pos, HoveredCell } from "./types";
import { loadRookieDrafts, loadSeasonFinishes } from "./loaders";
import { computeRanks, buildRankMap } from "./ranks";
import { computeCohorts, computePlayerSummaries } from "./cohort";

interface DataContextType {
  drafts: RookieDraft[];
  finishes: SeasonFinish[];
  rankedSeasons: RankedSeason[];
  rankMap: Map<string, RankedSeason[]>;
  cohorts: CohortSummary[];
  playerSummaries: PlayerSummary[];
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  hoveredCell: HoveredCell | null;
  setHoveredCell: (cell: HoveredCell | null) => void;
  selectedCell: HoveredCell | null;
  setSelectedCell: (cell: HoveredCell | null) => void;
  loading: boolean;
}

const defaultFilters: Filters = {
  yearStart: 2015,
  yearEnd: 2025,
  format: "sf",
  scoring: "ppr",
  outcome: "elite",
  positions: [],
  rounds: [],
  minGames: 8,
  showConfidence: true,
};

const DataContext = createContext<DataContextType>({
  drafts: [],
  finishes: [],
  rankedSeasons: [],
  rankMap: new Map(),
  cohorts: [],
  playerSummaries: [],
  filters: defaultFilters,
  setFilters: () => {},
  hoveredCell: null,
  setHoveredCell: () => {},
  selectedCell: null,
  setSelectedCell: () => {},
  loading: true,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<RookieDraft[]>([]);
  const [finishes, setFinishes] = useState<SeasonFinish[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<HoveredCell | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadRookieDrafts(), loadSeasonFinishes()]).then(([d, f]) => {
      setDrafts(d);
      setFinishes(f);
      setLoading(false);
    });
  }, []);

  const rankedSeasons = useMemo(() => computeRanks(finishes, filters.scoring), [finishes, filters.scoring]);
  const rankMap = useMemo(() => buildRankMap(rankedSeasons), [rankedSeasons]);
  const cohorts = useMemo(() => computeCohorts(drafts, rankMap, filters), [drafts, rankMap, filters]);
  const playerSummaries = useMemo(
    () => computePlayerSummaries(drafts, rankMap, filters.outcome, filters.minGames),
    [drafts, rankMap, filters.outcome, filters.minGames]
  );

  return (
    <DataContext.Provider
      value={{
        drafts, finishes, rankedSeasons, rankMap, cohorts, playerSummaries,
        filters, setFilters, hoveredCell, setHoveredCell,
        selectedCell, setSelectedCell, loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

export { defaultFilters };
