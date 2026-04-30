#!/usr/bin/env python3
"""
Mirrors Sleeper API endpoints to a local JSON file.
Run once while online to capture a full season snapshot.
sync_sleeper --from-local will then read from this file instead of the live API.

Usage:
  python download_sleeper.py
  python download_sleeper.py --output my_snapshot.json
  python download_sleeper.py --league-ids 1252701932896657408,1252704674759315456

Requires: league_ids.json in this directory, or pass --league-ids.
See league_ids.example.json for format.
"""

import json
import os
import sys
import time
import argparse
import requests

# Default output file
DEFAULT_OUTPUT = "sleeper_snapshot_2025.json"
SLEEPER_BASE = "https://api.sleeper.app/v1"
SLEEPER_STATS_BASE = "https://api.sleeper.com/stats/nfl"


def load_league_ids(args):
    """Load league IDs from config file or CLI."""
    if args.league_ids:
        return [lid.strip() for lid in args.league_ids.split(",") if lid.strip()]
    config_path = os.path.join(os.path.dirname(__file__), "league_ids.json")
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            data = json.load(f)
            return data.get("league_ids", data) if isinstance(data, dict) else data
    return []


def fetch_json(url, session=None):
    """Fetch URL and return JSON. Returns None on failure."""
    sess = session or requests
    try:
        r = sess.get(url, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  Warning: {url} -> {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Mirror Sleeper API to local JSON")
    parser.add_argument(
        "--output",
        "-o",
        default=DEFAULT_OUTPUT,
        help=f"Output file (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--league-ids",
        help="Comma-separated Sleeper league IDs (overrides league_ids.json)",
    )
    parser.add_argument(
        "--skip-stats",
        action="store_true",
        help="Skip per-player stats (reduces API calls significantly)",
    )
    args = parser.parse_args()

    league_ids = load_league_ids(args)
    if not league_ids:
        print("Error: No league IDs found. Create league_ids.json or pass --league-ids")
        print("Example league_ids.json: {\"league_ids\": [\"1252701932896657408\", \"1252704674759315456\"]}")
        sys.exit(1)

    print(f"Downloading Sleeper data for {len(league_ids)} leagues...")
    output_path = os.path.join(os.path.dirname(__file__), args.output)
    session = requests.Session()

    snapshot = {
        "state": None,
        "players": None,
        "leagues": {},
        "player_stats": {},
    }

    # --- 1. Global state ---
    print("1. Fetching NFL state...")
    snapshot["state"] = fetch_json(f"{SLEEPER_BASE}/state/nfl", session)
    if not snapshot["state"]:
        print("  Failed to fetch state. Aborting.")
        sys.exit(1)
    current_season = snapshot["state"].get("season", "2025")
    print(f"  Season: {current_season}")

    # --- 2. Player database ---
    print("2. Fetching player database (this may take a moment)...")
    snapshot["players"] = fetch_json(f"{SLEEPER_BASE}/players/nfl", session)
    if not snapshot["players"]:
        print("  Failed to fetch players. Continuing without player names.")
    else:
        print(f"  Loaded {len(snapshot['players'])} players.")

    # --- 3. Per-league data ---
    roster_player_ids = set()

    for i, lid in enumerate(league_ids, 1):
        print(f"3.{i} League {lid}...")
        league_data = {
            "league": None,
            "users": None,
            "rosters": None,
            "matchups": {},
            "winners_bracket": None,
        }

        # League details
        league_data["league"] = fetch_json(f"{SLEEPER_BASE}/league/{lid}", session)
        time.sleep(0.2)  # Rate limit

        # Users
        league_data["users"] = fetch_json(f"{SLEEPER_BASE}/league/{lid}/users", session) or []
        time.sleep(0.2)

        # Rosters
        league_data["rosters"] = fetch_json(f"{SLEEPER_BASE}/league/{lid}/rosters", session) or []
        for r in league_data["rosters"]:
            roster_player_ids.update(r.get("players", []))
        time.sleep(0.2)

        # Matchups for weeks 1-18
        for week in range(1, 19):
            matchups = fetch_json(f"{SLEEPER_BASE}/league/{lid}/matchups/{week}", session)
            if matchups:
                league_data["matchups"][str(week)] = matchups
            time.sleep(0.2)

        # Winners bracket (playoff)
        league_data["winners_bracket"] = fetch_json(
            f"{SLEEPER_BASE}/league/{lid}/winners_bracket", session
        )
        time.sleep(0.2)

        snapshot["leagues"][lid] = league_data

    print(f"  Found {len(roster_player_ids)} unique rostered players.")

    # --- 4. Per-player stats (optional, many requests) ---
    if not args.skip_stats and roster_player_ids and current_season:
        print("4. Fetching player stats (optional, ~0.5s per player)...")
        for j, pid in enumerate(roster_player_ids):
            if (j + 1) % 50 == 0:
                print(f"  ... {j + 1}/{len(roster_player_ids)}")
            url = f"{SLEEPER_STATS_BASE}/player/{pid}?season_type=regular&season={current_season}&grouping=week"
            data = fetch_json(url, session)
            if data:
                snapshot["player_stats"][pid] = data
            time.sleep(0.3)  # Be nice to the API
        print(f"  Fetched stats for {len(snapshot['player_stats'])} players.")
    elif args.skip_stats:
        print("4. Skipping player stats (--skip-stats).")

    # --- Write output ---
    with open(output_path, "w") as f:
        json.dump(snapshot, f, indent=2)

    print(f"\nDone. Snapshot saved to {output_path}")
    print("Run: python manage.py sync_sleeper --from-local")


if __name__ == "__main__":
    main()
