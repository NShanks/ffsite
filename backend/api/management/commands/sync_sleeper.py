import json
import os
import requests
from collections import Counter, defaultdict
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import League, MemberProfile, Team, WeeklyScore, UltimatePlayoffEntry, CommonPlayer

DEFAULT_SNAPSHOT_PATH = "sleeper_snapshot_2025.json"


class Command(BaseCommand):
    help = "Syncs league data from Sleeper API (or from local JSON snapshot with --from-local)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--from-local",
            action="store_true",
            help="Read from local JSON snapshot instead of live Sleeper API",
        )
        parser.add_argument(
            "--snapshot",
            default=DEFAULT_SNAPSHOT_PATH,
            help=f"Path to snapshot file when using --from-local (default: {DEFAULT_SNAPSHOT_PATH})",
        )

    def load_snapshot(self, path):
        """Load snapshot from JSON file."""
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        full_path = os.path.join(base, path)
        if not os.path.exists(full_path):
            self.stdout.write(self.style.ERROR(f"Snapshot not found: {full_path}"))
            self.stdout.write("Run: python download_sleeper.py (while online) to create it.")
            return None
        with open(full_path, "r") as f:
            return json.load(f)

    def handle(self, *args, **options):
        from_local = options.get("from_local", False)
        snapshot_path = options.get("snapshot", DEFAULT_SNAPSHOT_PATH)

        if from_local:
            self.stdout.write(self.style.SUCCESS("Starting sync from local snapshot..."))
            snapshot = self.load_snapshot(snapshot_path)
            if not snapshot:
                return
        else:
            self.stdout.write(self.style.SUCCESS("Starting Sleeper API sync..."))
            snapshot = None

        PLAYOFF_START_WEEK = 15
        current_nfl_season = None
        current_league_week = 0

        # --- 1. GLOBAL STATE ---
        if from_local and snapshot:
            state_data = snapshot.get("state") or {}
            current_league_week = state_data.get("week", 0) or state_data.get("display_week", 0)
            current_nfl_season = state_data.get("season", "2025")
            self.stdout.write(f"Loaded state from snapshot. Week: {current_league_week}, Season: {current_nfl_season}")
        else:
            self.stdout.write("Fetching global NFL state from Sleeper...")
            try:
                state_res = requests.get("https://api.sleeper.app/v1/state/nfl")
                state_res.raise_for_status()
                state_data = state_res.json()
                current_league_week = state_data.get("week", 0) or state_data.get("display_week", 0)
                current_nfl_season = state_data.get("season")
                self.stdout.write(f"Fetched state. Week: {current_league_week}, Season: {current_nfl_season}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Fatal Error fetching state: {e}"))
                return

        # --- 2. PLAYER DB ---
        player_lookup = {}
        if from_local and snapshot and snapshot.get("players"):
            p_data = snapshot["players"]
            for pid, details in p_data.items():
                player_lookup[str(pid)] = {
                    "name": f"{details.get('first_name', '')} {details.get('last_name', '')}".strip(),
                    "position": details.get("position", "N/A"),
                    "team": details.get("team", "N/A"),
                }
            self.stdout.write(f"Loaded {len(player_lookup)} players from snapshot.")
        elif not from_local:
            self.stdout.write("Downloading Sleeper Player Database...")
            try:
                p_res = requests.get("https://api.sleeper.app/v1/players/nfl")
                p_data = p_res.json()
                for pid, details in p_data.items():
                    player_lookup[pid] = {
                        "name": f"{details.get('first_name', '')} {details.get('last_name', '')}".strip(),
                        "position": details.get("position", "N/A"),
                        "team": details.get("team", "N/A"),
                    }
                self.stdout.write(f"Player database built ({len(player_lookup)} players).")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error fetching player DB: {e}"))

        # --- 3. LEAGUES ---
        if from_local and snapshot:
            leagues_data = snapshot.get("leagues", {})
            leagues_to_sync = []
            for sleeper_league_id, league_raw in leagues_data.items():
                ld = league_raw.get("league")
                if not ld:
                    continue
                league, _ = League.objects.update_or_create(
                    sleeper_league_id=sleeper_league_id,
                    defaults={"name": ld.get("name", "League"), "season": ld.get("season", 2025)},
                )
                leagues_to_sync.append((league, league_raw))
            if not leagues_to_sync:
                self.stdout.write(self.style.WARNING("No league data in snapshot."))
                return
        else:
            leagues = list(League.objects.all())
            if not leagues:
                self.stdout.write(self.style.WARNING("No leagues found. Add some in the admin!"))
                return
            leagues_to_sync = [(league, None) for league in leagues]

        all_playoff_player_ids = []
        player_stats = snapshot.get("player_stats", {}) if (from_local and snapshot) else {}

        for league, league_raw in leagues_to_sync:
            sleeper_league_id = league.sleeper_league_id
            self.stdout.write(f"--- Syncing League: {league.name} (ID: {sleeper_league_id}) ---")

            if from_local and league_raw:
                sleeper_users = league_raw.get("users") or []
                sleeper_rosters = league_raw.get("rosters") or []
                league_data = league_raw.get("league") or {}
                current_season = league_data.get("season", 2025)
                matchups_by_week = league_raw.get("matchups") or {}
                playoff_data = league_raw.get("winners_bracket") or []
            else:
                try:
                    league_res = requests.get(f"https://api.sleeper.app/v1/league/{sleeper_league_id}")
                    league_res.raise_for_status()
                    league_data = league_res.json()
                    current_season = league_data.get("season")

                    users_res = requests.get(f"https://api.sleeper.app/v1/league/{sleeper_league_id}/users")
                    users_res.raise_for_status()
                    sleeper_users = users_res.json()

                    rosters_res = requests.get(f"https://api.sleeper.app/v1/league/{sleeper_league_id}/rosters")
                    rosters_res.raise_for_status()
                    sleeper_rosters = rosters_res.json()
                except requests.exceptions.RequestException as e:
                    self.stdout.write(self.style.ERROR(f"Error fetching league data: {e}"))
                    continue

                matchups_by_week = {}
                for week in range(1, 19):
                    m_res = requests.get(
                        f"https://api.sleeper.app/v1/league/{sleeper_league_id}/matchups/{week}"
                    )
                    data = m_res.json() if m_res.status_code == 200 else None
                    if data:
                        matchups_by_week[str(week)] = data

                playoff_res = requests.get(
                    f"https://api.sleeper.app/v1/league/{sleeper_league_id}/winners_bracket"
                )
                playoff_data = playoff_res.json() if playoff_res.status_code == 200 else []

            # --- STEP 1: SYNC USERS ---
            self.stdout.write("Syncing users...")
            team_name_map = {}
            for user_data in sleeper_users:
                uid = user_data.get("user_id")
                if uid:
                    team_name_map[uid] = user_data.get("metadata", {}).get("team_name")

            for user_data in sleeper_users:
                sleeper_id = user_data.get("user_id")
                display_name = user_data.get("display_name", "SleeperUser")
                if not sleeper_id:
                    continue
                try:
                    profile = MemberProfile.objects.get(sleeper_id=sleeper_id)
                    profile.full_name = display_name
                    profile.save()
                    user = profile.user
                    if (
                        user.username != display_name
                        and not User.objects.filter(username=display_name).exists()
                    ):
                        user.username = display_name
                        user.save()
                except MemberProfile.DoesNotExist:
                    base_username = display_name
                    username = base_username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}_{counter}"
                        counter += 1
                    user = User.objects.create(username=username)
                    user.set_unusable_password()
                    user.save()
                    profile = MemberProfile.objects.create(
                        user=user, sleeper_id=sleeper_id, full_name=display_name
                    )
            self.stdout.write(self.style.SUCCESS("  Users synced."))

            # --- STEP 2: SYNC TEAMS ---
            self.stdout.write("Syncing teams...")
            for roster_data in sleeper_rosters:
                sleeper_roster_id = roster_data.get("roster_id")
                owner_sleeper_id = roster_data.get("owner_id")

                owner_profile = None
                if owner_sleeper_id:
                    try:
                        owner_profile = MemberProfile.objects.get(sleeper_id=owner_sleeper_id)
                    except MemberProfile.DoesNotExist:
                        pass

                team_name = team_name_map.get(owner_sleeper_id) if owner_sleeper_id else None
                if not team_name and roster_data.get("metadata", {}).get("team_name"):
                    team_name = roster_data["metadata"]["team_name"]
                elif not team_name and owner_profile:
                    team_name = f"Team {owner_profile.full_name}"
                if not team_name:
                    team_name = "Team Name Not Set"

                settings = roster_data.get("settings", {})
                wins = settings.get("wins", 0)
                losses = settings.get("losses", 0)
                ties = settings.get("ties", 0)
                points_for = settings.get("fpts", 0.00)

                if sleeper_roster_id:
                    Team.objects.update_or_create(
                        league=league,
                        sleeper_roster_id=sleeper_roster_id,
                        defaults={
                            "owner": owner_profile,
                            "team_name": team_name,
                            "wins": wins,
                            "losses": losses,
                            "ties": ties,
                            "points_for": points_for or 0.00,
                        },
                    )
            self.stdout.write(self.style.SUCCESS("  Teams synced."))

            # --- STEP 3: SYNC SCORES & TOP 3 ---
            self.stdout.write("Syncing scores and top players...")
            roster_player_points = defaultdict(lambda: defaultdict(float))

            for week in range(1, 19):
                matchups = matchups_by_week.get(str(week))
                if not matchups:
                    break

                for m in matchups:
                    rid = m.get("roster_id")
                    if not rid:
                        continue

                    pts = m.get("points") or 0.00
                    try:
                        team = Team.objects.get(league=league, sleeper_roster_id=rid)
                        WeeklyScore.objects.update_or_create(
                            team=team,
                            week=week,
                            season=current_season,
                            defaults={"points_scored": pts},
                        )
                    except Team.DoesNotExist:
                        continue

                    p_points = m.get("players_points") or {}
                    for pid, score in p_points.items():
                        roster_player_points[rid][pid] += score

            for rid, players_dict in roster_player_points.items():
                try:
                    team = Team.objects.get(league=league, sleeper_roster_id=rid)
                    sorted_players = sorted(
                        players_dict.items(), key=lambda x: x[1], reverse=True
                    )
                    top_3 = []
                    for pid, score in sorted_players[:3]:
                        p_info = player_lookup.get(str(pid), player_lookup.get(pid, {"name": "Unknown", "position": "?"}))
                        top_3.append({
                            "id": str(pid),
                            "name": p_info.get("name", "Unknown"),
                            "position": p_info.get("position", "?"),
                            "total_points": score,
                            "avatar_url": f"https://sleepercdn.com/content/nfl/players/{pid}.jpg",
                        })
                    team.top_three_players = top_3
                    team.save()
                except Team.DoesNotExist:
                    pass

            self.stdout.write(self.style.SUCCESS("  Scores synced."))

            # --- STEP 4: PLAYOFF LATCH ---
            self.stdout.write("Syncing playoff bracket...")
            if current_league_week >= PLAYOFF_START_WEEK:
                has_playoff_started = UltimatePlayoffEntry.objects.filter(
                    team__league=league, season=current_season
                ).exists()
                if has_playoff_started:
                    self.stdout.write(
                        self.style.WARNING("  BIG Playoff already started. Skipping bracket sync.")
                    )
                elif playoff_data:
                    Team.objects.filter(league=league).update(made_league_playoffs=False)
                    playoff_roster_ids = set()
                    for matchup in playoff_data:
                        if matchup.get("t1"):
                            playoff_roster_ids.add(matchup["t1"])
                        if matchup.get("t2"):
                            playoff_roster_ids.add(matchup["t2"])
                    Team.objects.filter(
                        league=league, sleeper_roster_id__in=playoff_roster_ids
                    ).update(made_league_playoffs=True)
                    self.stdout.write(f"  Marked {len(playoff_roster_ids)} teams for Big Playoff.")
                else:
                    self.stdout.write(self.style.WARNING("  No playoff data."))
            else:
                Team.objects.filter(league=league).update(made_league_playoffs=False)
                self.stdout.write(
                    f"  Week {current_league_week}. Playoffs start Week {PLAYOFF_START_WEEK}."
                )

            # --- GATHER PLAYOFF PLAYERS FOR STEP 5 ---
            target_roster_ids = set()
            if current_league_week < PLAYOFF_START_WEEK and playoff_data:
                for m in playoff_data:
                    if m.get("t1"):
                        target_roster_ids.add(m["t1"])
                    if m.get("t2"):
                        target_roster_ids.add(m["t2"])
            else:
                for tid in Team.objects.filter(
                    league=league, made_league_playoffs=True
                ).values_list("sleeper_roster_id", flat=True):
                    target_roster_ids.add(int(tid))

            for roster in sleeper_rosters:
                rid = roster.get("roster_id")
                if rid in target_roster_ids:
                    all_playoff_player_ids.extend(roster.get("players", []))

        # --- STEP 5: COMMON PLAYERS ---
        self.stdout.write("\n--- Step 5: Common Playoff Players ---")
        if not all_playoff_player_ids:
            self.stdout.write(self.style.WARNING("No playoff player data."))
        else:
            player_counts = Counter(all_playoff_player_ids)
            top_ids_tuples = player_counts.most_common(15)

            if top_ids_tuples:
                player_db = snapshot.get("players", {}) if (from_local and snapshot) else {}
                if not from_local and not player_db:
                    try:
                        p_res = requests.get("https://api.sleeper.app/v1/players/nfl")
                        player_db = p_res.json()
                    except Exception:
                        player_db = {}

                processed_players = []
                for pid, count in top_ids_tuples:
                    pid_str = str(pid)
                    player_info = player_db.get(pid_str) or player_db.get(pid)
                    if not player_info:
                        continue
                    position = player_info.get("position")
                    if position == "DEF":
                        continue

                    avg_score = 0.0
                    if from_local and pid_str in player_stats:
                        stats_data = player_stats[pid_str]
                        total_points = 0.0
                        weeks_played = 0
                        for week_data in (stats_data or {}).values():
                            if not week_data:
                                continue
                            stats = week_data.get("stats", {})
                            week_points = stats.get("pts_ppr", 0.0)
                            if week_points and float(week_points) > 0:
                                total_points += float(week_points)
                                weeks_played += 1
                        if weeks_played > 0:
                            avg_score = total_points / weeks_played
                    elif not from_local and current_nfl_season:
                        try:
                            stats_res = requests.get(
                                f"https://api.sleeper.com/stats/nfl/player/{pid}"
                                f"?season_type=regular&season={current_nfl_season}&grouping=week"
                            )
                            if stats_res.status_code == 200:
                                stats_data = stats_res.json()
                                total_points = 0.0
                                weeks_played = 0
                                for week_data in (stats_data or {}).values():
                                    if not week_data:
                                        continue
                                    stats = week_data.get("stats", {})
                                    week_points = stats.get("pts_ppr", 0.0)
                                    if week_points and float(week_points) > 0:
                                        total_points += float(week_points)
                                        weeks_played += 1
                                if weeks_played > 0:
                                    avg_score = total_points / weeks_played
                        except Exception:
                            pass

                    processed_players.append({
                        "id": pid_str,
                        "player_name": f"{player_info.get('first_name', '')} {player_info.get('last_name', '')}".strip(),
                        "position": position,
                        "nfl_team": player_info.get("team"),
                        "count": count,
                        "average_score": avg_score,
                    })

                processed_players.sort(key=lambda x: (-x["count"], -x["average_score"]))
                CommonPlayer.objects.all().delete()
                for i, p_data in enumerate(processed_players[:10]):
                    CommonPlayer.objects.create(
                        rank=i + 1,
                        player_id=p_data["id"],
                        player_name=p_data["player_name"],
                        position=p_data["position"],
                        nfl_team=p_data["nfl_team"],
                        count=p_data["count"],
                        average_score=p_data["average_score"],
                    )
                    self.stdout.write(
                        f"  #{i + 1}: {p_data['player_name']} "
                        f"({p_data['count']} rosters, {p_data['average_score']:.1f} avg)"
                    )
                self.stdout.write(self.style.SUCCESS("Common Players updated."))

        self.stdout.write(self.style.SUCCESS("--- Sync complete! ---"))
