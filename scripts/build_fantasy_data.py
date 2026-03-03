import nfl_data_py as nfl
import pandas as pd
import os
import re

years = list(range(2017, 2025))

print("Pulling weekly data from nflverse (2017-2024)...")
weekly = nfl.import_weekly_data(years)
print(f"Raw weekly rows: {len(weekly)}")

weekly = weekly[weekly["season_type"] == "REG"].copy()
weekly = weekly[weekly["position"].isin(["QB", "RB", "WR", "TE"])].copy()
print(f"After filtering REG season + QB/RB/WR/TE: {len(weekly)}")

print("Aggregating to seasonal totals...")
seasonal = weekly.groupby(["player_id", "player_display_name", "position", "season"]).agg(
    games=("week", "nunique"),
    passing_yards=("passing_yards", "sum"),
    passing_tds=("passing_tds", "sum"),
    interceptions=("interceptions", "sum"),
    rushing_yards=("rushing_yards", "sum"),
    rushing_tds=("rushing_tds", "sum"),
    receptions=("receptions", "sum"),
    receiving_yards=("receiving_yards", "sum"),
    receiving_tds=("receiving_tds", "sum"),
    passing_2pt_conversions=("passing_2pt_conversions", "sum"),
    rushing_2pt_conversions=("rushing_2pt_conversions", "sum"),
    receiving_2pt_conversions=("receiving_2pt_conversions", "sum"),
    special_teams_tds=("special_teams_tds", "sum"),
    sack_fumbles_lost=("sack_fumbles_lost", "sum"),
    rushing_fumbles_lost=("rushing_fumbles_lost", "sum"),
    receiving_fumbles_lost=("receiving_fumbles_lost", "sum"),
).reset_index()

seasonal = seasonal.rename(columns={"player_display_name": "player_name"})

for col in ["passing_yards", "passing_tds", "interceptions", "rushing_yards",
            "rushing_tds", "receptions", "receiving_yards", "receiving_tds",
            "passing_2pt_conversions", "rushing_2pt_conversions", "receiving_2pt_conversions",
            "special_teams_tds", "sack_fumbles_lost", "rushing_fumbles_lost", "receiving_fumbles_lost"]:
    seasonal[col] = seasonal[col].fillna(0)

fumbles_lost = (
    seasonal["sack_fumbles_lost"] +
    seasonal["rushing_fumbles_lost"] +
    seasonal["receiving_fumbles_lost"]
)

two_pt = (
    seasonal["passing_2pt_conversions"] +
    seasonal["rushing_2pt_conversions"] +
    seasonal["receiving_2pt_conversions"]
)

seasonal["fp_std"] = (
    seasonal["passing_yards"] * 0.04 +
    seasonal["passing_tds"] * 4 -
    seasonal["interceptions"] * 2 +
    seasonal["rushing_yards"] * 0.1 +
    seasonal["rushing_tds"] * 6 +
    seasonal["receiving_yards"] * 0.1 +
    seasonal["receiving_tds"] * 6 +
    seasonal["special_teams_tds"] * 6 +
    two_pt * 2 -
    fumbles_lost * 2
)

seasonal["fp_ppr"] = seasonal["fp_std"] + seasonal["receptions"]
seasonal["fp_half"] = seasonal["fp_std"] + seasonal["receptions"] * 0.5

print(f"Seasonal rows: {len(seasonal)}")

def normalize_name(name):
    n = str(name).strip()
    n = re.sub(r'\.', '', n)
    n = re.sub(r'\s+', ' ', n)
    return n

def slugify(name):
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', normalize_name(name).lower()))

seasonal["player_id_norm"] = seasonal["player_name"].apply(slugify)

print("Computing positional ranks (all players, no games filter)...")
for fmt in ["fp_ppr", "fp_half", "fp_std"]:
    seasonal = seasonal.sort_values(
        ["season", "position", fmt],
        ascending=[True, True, False]
    )
    seasonal[f"rank_{fmt}"] = (
        seasonal.groupby(["season", "position"]).cumcount() + 1
    )

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "client", "public", "data")
os.makedirs(out_dir, exist_ok=True)

output = seasonal[["player_id_norm", "player_name", "season", "position", "games",
                    "fp_ppr", "fp_half", "fp_std",
                    "rank_fp_ppr", "rank_fp_half", "rank_fp_std"]].copy()
output.columns = [
    "player_id", "player_name", "season", "pos", "games",
    "fantasy_points_ppr", "fantasy_points_hppr", "fantasy_points_std",
    "rank_ppr", "rank_hppr", "rank_std"
]

output["fantasy_points_ppr"] = output["fantasy_points_ppr"].round(1)
output["fantasy_points_hppr"] = output["fantasy_points_hppr"].round(1)
output["fantasy_points_std"] = output["fantasy_points_std"].round(1)

out_path = os.path.join(out_dir, "season_finishes.csv")
output.to_csv(out_path, index=False)
print(f"\nSaved {out_path}")
print(f"Total rows: {len(output)}")
print(f"Seasons: {sorted(output['season'].unique())}")
print(f"Positions: {sorted(output['pos'].unique())}")

nflverse_name_map_path = os.path.join(out_dir, "nflverse_names.csv")
name_map = seasonal[["player_id_norm", "player_name", "position"]].drop_duplicates("player_id_norm")
name_map.columns = ["player_id", "display_name", "pos"]
name_map.to_csv(nflverse_name_map_path, index=False)
print(f"Saved name map: {nflverse_name_map_path} ({len(name_map)} entries)")

print("\nSample QB ranks (2024, top 5):")
qb24 = output[(output["pos"] == "QB") & (output["season"] == 2024)].sort_values("rank_ppr").head(5)
print(qb24[["player_name", "games", "fantasy_points_ppr", "rank_ppr"]].to_string(index=False))

print("\nSample RB ranks (2024, top 5):")
rb24 = output[(output["pos"] == "RB") & (output["season"] == 2024)].sort_values("rank_ppr").head(5)
print(rb24[["player_name", "games", "fantasy_points_ppr", "rank_ppr"]].to_string(index=False))
