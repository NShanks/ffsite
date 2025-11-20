import requests
from collections import Counter
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import League, MemberProfile, Team, WeeklyScore, UltimatePlayoffEntry, CommonPlayer

class Command(BaseCommand):
    help = "Syncs all league data from the Sleeper API"

    def handle(self, *args, **options):
        
        self.stdout.write(self.style.SUCCESS('Starting the Sleeper API sync...'))

        PLAYOFF_START_WEEK = 15
        current_nfl_season = None

        self.stdout.write('Fetching global NFL state from Sleeper...')
        try:
            state_response = requests.get("https://api.sleeper.app/v1/state/nfl")
            state_response.raise_for_status()
            state_data = state_response.json()
            
            current_league_week = state_data.get('week', 0)
            if current_league_week == 0:
                current_league_week = state_data.get('display_week', 0)
            
            current_nfl_season = state_data.get('season') # Capture the season!

            self.stdout.write(self.style.SUCCESS(f'Successfully fetched global state. NFL Week: {current_league_week}, Season: {current_nfl_season}'))
        
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Fatal Error: Could not fetch global NFL state. Aborting sync. Error: {e}'))
            return

        leagues = League.objects.all()
        if not leagues:
            self.stdout.write(self.style.WARNING('No leagues found. Add some in the admin!'))
            return

        all_playoff_player_ids = []

        for league in leagues:
            self.stdout.write(f'--- Syncing League: {league.name} (ID: {league.sleeper_league_id}) ---')

            rosters_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/rosters"
            users_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/users"
            playoff_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/winners_bracket"

            try:
                league_response = requests.get(f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}")
                league_response.raise_for_status()
                league_data = league_response.json()
                current_season = league_data.get('season')

                # --- STEP 1: SYNC USERS ---
                self.stdout.write('Syncing users...')
                users_response = requests.get(users_url)
                users_response.raise_for_status()
                sleeper_users = users_response.json()
                
                team_name_map = {}
                for user_data in sleeper_users:
                    user_id = user_data.get('user_id')
                    if user_id:
                        team_name = user_data.get('metadata', {}).get('team_name')
                        team_name_map[user_id] = team_name

                for user_data in sleeper_users:
                    sleeper_id = user_data.get('user_id')
                    display_name = user_data.get('display_name', 'SleeperUser')
                    if not sleeper_id: continue
                    try:
                        profile = MemberProfile.objects.get(sleeper_id=sleeper_id)
                        profile.full_name = display_name
                        profile.save()
                        user = profile.user
                        if user.username != display_name and not User.objects.filter(username=display_name).exists():
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
                        profile = MemberProfile.objects.create(user=user, sleeper_id=sleeper_id, full_name=display_name)
                self.stdout.write(self.style.SUCCESS('  Users synced successfully.'))

                # --- STEP 2: SYNC TEAMS ---
                self.stdout.write('Syncing teams, rosters, and standings...')
                rosters_response = requests.get(rosters_url)
                rosters_response.raise_for_status()
                sleeper_rosters = rosters_response.json()
                
                for roster_data in sleeper_rosters:
                    sleeper_roster_id = roster_data.get('roster_id')
                    owner_sleeper_id = roster_data.get('owner_id')
                    owner_profile = None
                    if owner_sleeper_id:
                        try:
                            owner_profile = MemberProfile.objects.get(sleeper_id=owner_sleeper_id)
                        except MemberProfile.DoesNotExist:
                            self.stdout.write(self.style.ERROR(f'  Could not find member profile for sleeper ID {owner_sleeper_id}'))

                    team_name = None
                    if owner_sleeper_id: team_name = team_name_map.get(owner_sleeper_id)
                    if not team_name and roster_data.get('metadata') and roster_data['metadata'].get('team_name'):
                        team_name = roster_data['metadata']['team_name']
                    elif not team_name and owner_profile:
                        team_name = f"Team {owner_profile.full_name}"
                    if not team_name: team_name = "Team Name Not Set"
                    
                    settings = roster_data.get('settings', {})
                    wins = settings.get('wins', 0)
                    losses = settings.get('losses', 0)
                    ties = settings.get('ties', 0)
                    points_for = settings.get('fpts', 0.00)

                    if sleeper_roster_id:
                        Team.objects.update_or_create(
                            league=league,
                            sleeper_roster_id=sleeper_roster_id,
                            defaults={
                                'owner': owner_profile, 'team_name': team_name,
                                'wins': wins, 'losses': losses, 'ties': ties, 'points_for': points_for or 0.00
                            }
                        )
                self.stdout.write(self.style.SUCCESS('  Teams & standings synced successfully.'))
                
                # --- STEP 3: SYNC SCORES ---
                self.stdout.write('Syncing weekly scores...')
                for week in range(1, 19):
                    matchups_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/matchups/{week}"
                    matchups_response = requests.get(matchups_url)
                    matchups_response.raise_for_status()
                    matchups_data = matchups_response.json()
                    if not matchups_data:
                        self.stdout.write(f'  Week {week}: No data found, stopping score sync.')
                        break 
                    for matchup in matchups_data:
                        roster_id = matchup.get('roster_id')
                        points = matchup.get('points', 0.00)
                        if not roster_id: continue
                        try:
                            team = Team.objects.get(league=league, sleeper_roster_id=roster_id)
                            WeeklyScore.objects.update_or_create(
                                team=team, week=week, season=current_season,
                                defaults={'points_scored': points or 0.00}
                            )
                        except Team.DoesNotExist:
                            pass
                self.stdout.write(self.style.SUCCESS('  Weekly scores synced successfully.'))
                
                # --- STEP 4: SYNC PLAYOFFS ---
                self.stdout.write('Syncing playoff bracket...')
                if current_league_week >= PLAYOFF_START_WEEK:
                    has_playoff_started = UltimatePlayoffEntry.objects.filter(team__league=league, season=current_season).exists()
                    if has_playoff_started:
                        self.stdout.write(self.style.WARNING(f'  BIG Playoff has already been started. Skipping bracket sync.'))
                    else:
                        try:
                            playoff_response = requests.get(playoff_url)
                            playoff_response.raise_for_status()
                            playoff_data = playoff_response.json()
                            if not playoff_data:
                                self.stdout.write(self.style.WARNING('  No playoff data found.'))
                            else:
                                Team.objects.filter(league=league).update(made_league_playoffs=False)
                                playoff_roster_ids = set()
                                for matchup in playoff_data:
                                    if matchup.get('t1'): playoff_roster_ids.add(matchup['t1'])
                                    if matchup.get('t2'): playoff_roster_ids.add(matchup['t2'])
                                Team.objects.filter(league=league, sleeper_roster_id__in=playoff_roster_ids).update(made_league_playoffs=True)
                                self.stdout.write(self.style.SUCCESS(f'  Marked {len(playoff_roster_ids)} teams for Big Playoff.'))
                        except requests.exceptions.HTTPError as e:
                            if e.response.status_code == 404: self.stdout.write(self.style.WARNING('  Playoff bracket not found (404).'))
                            else: raise e
                else:
                    self.stdout.write(self.style.WARNING(f'  League is in Week {current_league_week}. Playoffs start Week {PLAYOFF_START_WEEK}. Skipping sync.'))
                    Team.objects.filter(league=league).update(made_league_playoffs=False)


                # --- GATHER PLAYOFF ROSTER IDs ---
                target_roster_ids = set()
                if current_league_week < PLAYOFF_START_WEEK:
                    try:
                        p_response = requests.get(playoff_url)
                        p_response.raise_for_status()
                        p_data = p_response.json()
                        for m in p_data:
                            if m.get('t1'): target_roster_ids.add(m['t1'])
                            if m.get('t2'): target_roster_ids.add(m['t2'])
                    except: pass 
                else:
                    db_teams = Team.objects.filter(league=league, made_league_playoffs=True).values_list('sleeper_roster_id', flat=True)
                    for tid in db_teams: target_roster_ids.add(int(tid))

                for roster in sleeper_rosters:
                    rid = roster.get('roster_id')
                    if rid in target_roster_ids:
                        players = roster.get('players', [])
                        all_playoff_player_ids.extend(players)

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f'Error processing league {league.name}: {e}'))

        # ====================================================
        # --- STEP 5: CALCULATE AND SAVE (BULLETPROOF FIX) ---
        # ====================================================
        self.stdout.write('\n--- Step 5: Calculating Most Common Playoff Players ---')
        
        if not all_playoff_player_ids:
            self.stdout.write(self.style.WARNING("No playoff player data found to analyze."))
        else:
            player_counts = Counter(all_playoff_player_ids)
            top_ids_tuples = player_counts.most_common(15)
            
            if top_ids_tuples:
                self.stdout.write("Downloading Sleeper Player Database...")
                try:
                    player_db_res = requests.get("https://api.sleeper.app/v1/players/nfl")
                    player_db = player_db_res.json()
                    
                    processed_players = []
                    
                    for pid, count in top_ids_tuples:
                        player_info = player_db.get(pid)
                        if not player_info: continue
                        
                        position = player_info.get('position')
                        if position == 'DEF': continue 

                        # --- FETCH STATS (FIXED) ---
                        avg_score = 0.0
                        try:
                            # Use the global 'current_nfl_season' we fetched securely at the top
                            if current_nfl_season:
                                stats_url = f"https://api.sleeper.com/stats/nfl/player/{pid}?season_type=regular&season={current_nfl_season}&grouping=week"
                                stats_res = requests.get(stats_url)
                                if stats_res.status_code == 200:
                                    stats_data = stats_res.json()
                                    
                                    total_points = 0.0
                                    weeks_played = 0
                                    
                                    # Iterate safely
                                    for week_key, week_data in stats_data.items():
                                        # SAFETY CHECK: Ensure week_data exists and has 'stats'
                                        if not week_data: continue
                                        stats = week_data.get('stats')
                                        if not stats: continue
                                        
                                        # Now safe to get points
                                        week_points = stats.get('pts_ppr', 0.0)
                                        if week_points > 0: 
                                            total_points += float(week_points)
                                            weeks_played += 1
                                    
                                    if weeks_played > 0:
                                        avg_score = total_points / weeks_played
                                        
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f"Could not fetch stats for {player_info.get('last_name')}: {e}"))

                        processed_players.append({
                            'player_name': f"{player_info.get('first_name')} {player_info.get('last_name')}",
                            'position': position,
                            'nfl_team': player_info.get('team'),
                            'count': count,
                            'average_score': avg_score
                        })

                    processed_players.sort(key=lambda x: (-x['count'], -x['average_score']))

                    CommonPlayer.objects.all().delete()
                    
                    for i, p_data in enumerate(processed_players[:10]):
                        CommonPlayer.objects.create(
                            rank=i+1,
                            player_name=p_data['player_name'],
                            position=p_data['position'],
                            nfl_team=p_data['nfl_team'],
                            count=p_data['count'],
                            average_score=p_data['average_score']
                        )
                        self.stdout.write(f"  #{i+1}: {p_data['player_name']} ({p_data['count']} rosters, {p_data['average_score']:.1f} avg)")
                            
                    self.stdout.write(self.style.SUCCESS("Common Players table updated successfully!"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing player database: {e}"))

        self.stdout.write(self.style.SUCCESS(
            '--- Full Sleeper API sync complete! ---'
        ))