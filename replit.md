# StatChasers - Rookie Hit Rate Tool

## Overview
A premium dynasty fantasy football analytics tool that analyzes rookie draft hit rates by position, round, and year. Shows breakout timing, survival curves, and individual player drill-downs.

## Architecture
- **Frontend-only computation** - No database. Data loaded from CSV files in `/client/public/data/`
- **Vite + React + TypeScript** with Tailwind CSS
- **Tab-based navigation** (not route-based): Overview, Trends, Cohorts, Player Explorer
- **Express server** serves static files only

## Key Files
- `client/src/App.tsx` - Main app with tab navigation and provider wiring
- `client/src/lib/data-context.tsx` - Global data context (loads CSVs, computes ranks/cohorts)
- `client/src/lib/types.ts` - All TypeScript types
- `client/src/lib/loaders.ts` - CSV parsing/loading
- `client/src/lib/ranks.ts` - Positional rank computation
- `client/src/lib/cohort.ts` - Cohort aggregation, trends, survival, player summaries
- `client/src/lib/export.ts` - CSV export utility

## Components
- `navbar.tsx` - Sticky top nav with logo, tabs, theme toggle, export button
- `filter-bar.tsx` - Sticky filter bar (seasons, format, scoring, outcome, position, round, min games, confidence toggle)
- `heatmap-table.tsx` - Main heatmap visualization (position x round matrix)
- `pick-lens-card.tsx` - Side card showing cohort details on hover/click
- `trends-chart.tsx` - Line chart of hit rates by draft class year
- `cohort-survival-chart.tsx` - Survival-style chart (time to breakout)
- `player-table.tsx` - Searchable/sortable player explorer table
- `player-drawer.tsx` - Slide-in drawer with player detail and season history
- `theme-provider.tsx` - Dark/light mode management

## Data
- `client/public/data/rookie_drafts.csv` - ~260 players (2015-2025 dynasty rookie drafts)
- `client/public/data/season_finishes.csv` - ~1120 season finish records with fantasy points

## Brand
- Primary: #0b3a7a (navy)
- Accent: #d4af37 (gold)
- Gold underline motif under section titles
- Dark mode: near-black navy background

## Computation
- Hit = player achieved positional rank <= threshold (12/24/36) in at least one season with >= minGames
- Breakout time = first qualifying season - rookie year + 1
- Wilson confidence intervals for hit rates
- Cohort aggregation by position x round with year-by-year breakout distribution
