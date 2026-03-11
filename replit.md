# StatChasers - Rookie Hit Rate Tool

## Overview
A premium dynasty fantasy football analytics tool that analyzes rookie draft hit rates by position, round, and year (2017–2025). Shows breakout timing, survival curves, and individual player drill-downs. Uses real ADP data and real NFL performance data from nflverse.

## Architecture
- **Frontend-only computation** - No database. Data loaded from CSV files in `/client/public/data/`
- **Vite + React + TypeScript** with Tailwind CSS
- **Tab-based navigation** (not route-based): Overview, Pick Range, Trends, Cohorts, Player Explorer
- **Express server** serves static files only

## Data Pipeline
Three data generation scripts:
1. `scripts/generate-data.cjs` — Parses user-provided ADP CSV, generates `rookie_drafts.csv` with nflverse-compatible player IDs
2. `scripts/build_fantasy_data.py` — Pulls real seasonal stats from nflverse (2017-2024), computes PPR/Half PPR/Standard fantasy points, positional ranks, outputs `season_finishes.csv`
3. `scripts/fetch_sleeper_2025.py` — Fetches 2025 season stats from Sleeper's public API (weeks 1-18), computes seasonal totals and positional ranks, appends to `season_finishes.csv`

Player IDs are nflverse-compatible slugs (e.g., `bijan-robinson`, `patrick-mahomes`) — Jr/Sr suffixes stripped for matching.
`LATEST_SEASON_WITH_DATA` in `cohort.ts` controls which rookie classes get evaluated vs marked "too_early".

## Key Files
- `client/src/App.tsx` - Main app with tab navigation and provider wiring
- `client/src/lib/data-context.tsx` - Global data context (loads CSVs, filters by format+scoring, computes ranks/cohorts)
- `client/src/lib/types.ts` - All TypeScript types
- `client/src/lib/loaders.ts` - CSV parsing/loading
- `client/src/lib/ranks.ts` - Uses pre-computed positional ranks from CSV, selects by scoring format
- `client/src/lib/cohort.ts` - Cohort aggregation, pick range cohorts, trends, survival, player summaries
- `client/src/lib/export.ts` - CSV export utility

## Components
- `navbar.tsx` - Sticky top nav with logo, tabs, theme toggle
- `filter-bar.tsx` - Sticky filter bar (seasons 2017-2025, format, scoring, outcome, position, rounds 1-7, min games, confidence toggle)
- `heatmap-table.tsx` - Heatmap (position x round) with positional pill badges (QB=red, RB=green, WR=blue, TE=gold), confidence dots, E/S/F/B cell density, hover micro-interactions
- `pick-range-heatmap.tsx` - Detailed heatmap by 3-pick ranges (1.01-1.03, 1.04-1.06, etc.) within each round, round focus buttons, visual round separators
- `pick-lens-card.tsx` - Side card with positional pill badge, thicker bar chart with % labels, hover tooltip
- `trends-chart.tsx` - Hit rate trends with: view modes (yearly/rolling3yr/cumulative), compare round overlay, stability gauge, incomplete cohort markers, best/worst gold/red dots, 3-yr avg smoothing, auto-generated headline, stat-first analysis cards
- `cohort-survival-chart.tsx` - Survival chart with: position-consistent colors, focus/highlight mode, N in legend+tooltip, Year 3 reference line, Patience Index panel, Roster Decision Aid table, delta after Year 3 summary, headline banner, stat-first analysis cards
- `player-table.tsx` - Searchable/sortable player explorer table with Team column
- `player-drawer.tsx` - Slide-in drawer with player detail, physical info, and season history
- `theme-provider.tsx` - Dark/light mode management

## Data Files
- `client/public/data/rookie_drafts.csv` - ~2150 rows (2017-2025 dynasty rookie drafts across 4 format/scoring combos)
- `client/public/data/season_finishes.csv` - ~5117 real season records (2017-2024 from nflverse, 2025 from Sleeper API) with pre-computed ranks
- `client/public/data/rookie_adp.csv` - Source ADP data (user-provided)
- Draft CSV schema: player_id, player_name, pos, pos_rank, rookie_year, adp_format, scoring_format, rookie_round, rookie_pick, current_nfl_team, current_age, height, weight
- Season CSV schema: player_id, player_name, season, pos, games, fantasy_points_ppr, fantasy_points_hppr, fantasy_points_std, rank_ppr, rank_hppr, rank_std
- Format values: `1qb`, `sf`; Scoring values: `ppr`, `hppr`
- Data filtered by adp_format + scoring_format in data-context before computation

## Brand
- Primary: #0b3a7a (navy)
- Accent: #d4af37 (gold)
- Gold underline motif under section titles
- Dark mode background: #0a1628

## Computation
- Hit = player achieved positional rank <= threshold (12/24/36) in at least one season with >= minGames
- Breakout time = first qualifying season - rookie year + 1
- Wilson confidence intervals for hit rates
- Cohort aggregation by position x round with year-by-year breakout distribution
- Pick range cohorts: groups by 3-pick ranges (1-3, 4-6, 7-9, 10-12) within each round
- Positional ranks pre-computed in Python from nflverse data (all players ranked, no games filter)
- Fantasy points: PPR = base + receptions, Half PPR = base + 0.5*receptions, Std = base only
- Base = pass_yds*0.04 + pass_td*4 - int*2 + rush_yds*0.1 + rush_td*6 + rec_yds*0.1 + rec_td*6 + st_td*6 + 2pt*2 - fumbles_lost*2
