"""
Fetch 2025 NFL season stats from Sleeper's public API and append to season_finishes.csv.
Sleeper API docs: https://docs.sleeper.com/
"""
import json
import os
import re
import csv
import urllib.request

SEASON = 2025
WEEKS = list(range(1, 19))  # Regular season weeks 1-18
POSITIONS = {"QB", "RB", "WR", "TE"}

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "client", "public", "data")

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "StatChasers/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def normalize_name(name):
    n = str(name).strip()
    n = re.sub(r'\.', '', n)
    n = re.sub(r'\s+', ' ', n)
    return n

def slugify(name):
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', normalize_name(name).lower()))

# Step 1: Fetch Sleeper player database to get names and positions
print("Fetching Sleeper player database...")
players_db = fetch_json("https://api.sleeper.app/v1/players/nfl")
print(f"  {len(players_db)} players in Sleeper DB")

# Build a lookup: sleeper_id -> {name, position, slug}
player_lookup = {}
for sid, info in players_db.items():
    pos = info.get("position")
    if pos not in POSITIONS:
        continue
    first = info.get("first_name", "")
    last = info.get("last_name", "")
    full_name = f"{first} {last}".strip()
    if not full_name:
        continue
    player_lookup[sid] = {
        "name": full_name,
        "pos": pos,
        "slug": slugify(full_name),
    }

print(f"  {len(player_lookup)} QB/RB/WR/TE players indexed")

# Step 2: Fetch weekly stats for 2025 and aggregate
print(f"\nFetching weekly stats for {SEASON}...")
# Accumulate per-player: {sleeper_id: {games, pts_ppr, pts_half_ppr, pts_std}}
totals = {}

for week in WEEKS:
    url = f"https://api.sleeper.app/v1/stats/nfl/regular/{SEASON}/{week}"
    print(f"  Week {week}...", end=" ")
    try:
        week_data = fetch_json(url)
    except Exception as e:
        print(f"SKIP ({e})")
        continue
    
    count = 0
    for sid, stats in week_data.items():
        if sid not in player_lookup:
            continue
        gp = stats.get("gp", 0)
        if not gp or gp == 0:
            continue
        
        ppr = stats.get("pts_ppr", 0) or 0
        hppr = stats.get("pts_half_ppr", 0) or 0
        std = stats.get("pts_std", 0) or 0
        
        if sid not in totals:
            totals[sid] = {"games": 0, "pts_ppr": 0, "pts_half_ppr": 0, "pts_std": 0}
        
        totals[sid]["games"] += 1
        totals[sid]["pts_ppr"] += ppr
        totals[sid]["pts_half_ppr"] += hppr
        totals[sid]["pts_std"] += std
        count += 1
    
    print(f"{count} players")

print(f"\n{len(totals)} players with stats in {SEASON}")

# Step 3: Compute positional ranks
pos_groups = {}
for sid, t in totals.items():
    pos = player_lookup[sid]["pos"]
    if pos not in pos_groups:
        pos_groups[pos] = []
    pos_groups[pos].append((sid, t))

ranked = {}
for pos in POSITIONS:
    group = pos_groups.get(pos, [])
    
    group_ppr = sorted(group, key=lambda x: x[1]["pts_ppr"], reverse=True)
    group_hppr = sorted(group, key=lambda x: x[1]["pts_half_ppr"], reverse=True)
    group_std = sorted(group, key=lambda x: x[1]["pts_std"], reverse=True)
    
    for rank, (sid, _) in enumerate(group_ppr, 1):
        if sid not in ranked:
            ranked[sid] = {}
        ranked[sid]["rank_ppr"] = rank
    
    for rank, (sid, _) in enumerate(group_hppr, 1):
        ranked[sid]["rank_hppr"] = rank
    
    for rank, (sid, _) in enumerate(group_std, 1):
        ranked[sid]["rank_std"] = rank

# Step 4: Build output rows
rows_2025 = []
for sid, t in totals.items():
    info = player_lookup[sid]
    r = ranked[sid]
    rows_2025.append({
        "player_id": info["slug"],
        "player_name": info["name"],
        "season": SEASON,
        "pos": info["pos"],
        "games": t["games"],
        "fantasy_points_ppr": round(t["pts_ppr"], 1),
        "fantasy_points_hppr": round(t["pts_half_ppr"], 1),
        "fantasy_points_std": round(t["pts_std"], 1),
        "rank_ppr": r["rank_ppr"],
        "rank_hppr": r["rank_hppr"],
        "rank_std": r["rank_std"],
    })

# Step 5: Read existing season_finishes.csv, remove any old 2025 rows, append new
csv_path = os.path.join(DATA_DIR, "season_finishes.csv")
existing = []
with open(csv_path, "r") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        if int(row["season"]) != SEASON:
            existing.append(row)

print(f"\nExisting non-2025 rows: {len(existing)}")
print(f"New 2025 rows: {len(rows_2025)}")

all_rows = existing + rows_2025
with open(csv_path, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(all_rows)

print(f"Saved {csv_path} ({len(all_rows)} total rows)")

# Step 6: Print top 5 per position for verification
for pos in ["QB", "RB", "WR", "TE"]:
    pos_rows = [r for r in rows_2025 if r["pos"] == pos]
    pos_rows.sort(key=lambda x: x["rank_ppr"])
    print(f"\nTop 5 {pos} (PPR):")
    for r in pos_rows[:5]:
        print(f"  {r['rank_ppr']:>3}. {r['player_name']:<25} {r['games']:>2}G  {r['fantasy_points_ppr']:>7.1f} pts  (slug: {r['player_id']})")
