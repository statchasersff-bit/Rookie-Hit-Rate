# StatChasers - Rookie Hit Rate Tool

## Overview
A premium dynasty fantasy football analytics tool that analyzes rookie draft hit rates by position, round, and year (2017–2025). Shows breakout timing, survival curves, and individual player drill-downs. Uses real ADP data across four format/scoring combinations.

## Architecture
- **Frontend-only computation** - No database. Data loaded from CSV files in `/client/public/data/`
- **Vite + React + TypeScript** with Tailwind CSS
- **Tab-based navigation** (not route-based): Overview, Trends, Cohorts, Player Explorer
- **Express server** serves static files only

## Key Files
- `client/src/App.tsx` - Main app with tab navigation and provider wiring
- `client/src/lib/data-context.tsx` - Global data context (loads CSVs, filters by format+scoring, computes ranks/cohorts)
- `client/src/lib/types.ts` - All TypeScript types
- `client/src/lib/loaders.ts` - CSV parsing/loading
- `client/src/lib/ranks.ts` - Positional rank computation by scoring format
- `client/src/lib/cohort.ts` - Cohort aggregation, trends, survival, player summaries
- `client/src/lib/export.ts` - CSV export utility
- `scripts/generate-data.cjs` - Data generator: parses ADP CSV, generates rookie_drafts.csv and season_finishes.csv

## Components
- `navbar.tsx` - Sticky top nav with logo, tabs, theme toggle, export button
- `filter-bar.tsx` - Sticky filter bar (seasons 2017-2025, format, scoring, outcome, position, rounds 1-7, min games, confidence toggle)
- `heatmap-table.tsx` - Main heatmap visualization (position x round matrix)
- `pick-lens-card.tsx` - Side card showing cohort details on hover/click
- `trends-chart.tsx` - Line chart of hit rates by draft class year (rounds 1-7)
- `cohort-survival-chart.tsx` - Survival-style chart (time to breakout)
- `player-table.tsx` - Searchable/sortable player explorer table with Team column
- `player-drawer.tsx` - Slide-in drawer with player detail, physical info, and season history
- `theme-provider.tsx` - Dark/light mode management

## Data
- `client/public/data/rookie_drafts.csv` - ~2150 rows (2017-2025 dynasty rookie drafts across 4 format/scoring combos)
- `client/public/data/season_finishes.csv` - ~1589 season finish records with fantasy points (ppr/hppr/std)
- Source ADP: `attached_assets/rookie_adp_master_1772564074914.csv` (user-provided real ADP data)
- Draft CSV schema: player_id, player_name, pos, pos_rank, rookie_year, adp_format, scoring_format, rookie_round, rookie_pick, current_nfl_team, current_age, height, weight
- Format values: `1qb`, `sf`
- Scoring values: `ppr`, `hppr`
- Data is filtered by adp_format + scoring_format in data-context before computation

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
- Ranks computed per scoring format (ppr/hppr/std points)
