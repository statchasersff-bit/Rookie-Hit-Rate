import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type { RookieDraft, SeasonFinish, RankedSeason, Filters, CohortSummary, PickRangeCohortSummary, PlayerSummary, Pos, HoveredCell } from "./types";
import { loadRookieDrafts, loadSeasonFinishes } from "./loaders";
import { computeRanks, buildRankMap } from "./ranks";
import { computeCohorts, computePickRangeCohorts, computePlayerSummaries } from "./cohort";

interface DataContextType {
  drafts: RookieDraft[];
  filteredDrafts: RookieDraft[];
  finishes: SeasonFinish[];
  rankedSeasons: RankedSeason[];
  rankMap: Map<string, RankedSeason[]>;
  cohorts: CohortSummary[];
  pickRangeCohorts: PickRangeCohortSummary[];
  playerSummaries: PlayerSummary[];
  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  playerSearch: string;
  setPlayerSearch: (s: string) => void;
  hoveredCell: HoveredCell | null;
  setHoveredCell: (cell: HoveredCell | null) => void;
  selectedCell: HoveredCell | null;
  setSelectedCell: (cell: HoveredCell | null) => void;
  loading: boolean;
}

const defaultFilters: Filters = {
  yearStart: 2017,
  yearEnd: 2025,
  format: "sf",
  scoring: "ppr",
  outcome: "elite",
  positions: ["QB", "RB", "WR", "TE"],
  rounds: [1, 2, 3, 4, 5],
  minGames: 8,
  showConfidence: false,
};

const DataContext = createContext<DataContextType>({
  drafts: [],
  filteredDrafts: [],
  finishes: [],
  rankedSeasons: [],
  rankMap: new Map(),
  cohorts: [],
  pickRangeCohorts: [],
  playerSummaries: [],
  filters: defaultFilters,
  setFilters: () => {},
  playerSearch: "",
  setPlayerSearch: () => {},
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
  const [playerSearch, setPlayerSearch] = useState("");
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

  const filteredDrafts = useMemo(() =>
    drafts.filter(d => d.adp_format === filters.format && d.scoring_format === filters.scoring),
    [drafts, filters.format, filters.scoring]
  );

  const rankedSeasons = useMemo(() => computeRanks(finishes, filters.scoring), [finishes, filters.scoring]);
  const rankMap = useMemo(() => buildRankMap(rankedSeasons), [rankedSeasons]);
  // Overview-only data (heatmap, pick-lens, pick-range) always spans every
  // position and round — the Overview tab hides those filters, so ignore any
  // position/round selection carried over from other tabs.
  const overviewFilters = useMemo(() => ({ ...filters, positions: [] as Pos[], rounds: [] as number[] }), [filters]);
  const cohorts = useMemo(() => computeCohorts(filteredDrafts, rankMap, overviewFilters), [filteredDrafts, rankMap, overviewFilters]);
  const pickRangeCohorts = useMemo(() => computePickRangeCohorts(filteredDrafts, rankMap, overviewFilters), [filteredDrafts, rankMap, overviewFilters]);
  const playerSummaries = useMemo(
    () => computePlayerSummaries(filteredDrafts, rankMap, filters.outcome, filters.minGames),
    [filteredDrafts, rankMap, filters.outcome, filters.minGames]
  );

  return (
    <DataContext.Provider
      value={{
        drafts, filteredDrafts, finishes, rankedSeasons, rankMap, cohorts, pickRangeCohorts, playerSummaries,
        filters, setFilters, playerSearch, setPlayerSearch, hoveredCell, setHoveredCell,
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
