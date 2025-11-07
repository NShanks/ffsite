import requests
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
# We now import ALL our models, including UltimatePlayoffEntry
from api.models import League, MemberProfile, Team, WeeklyScore, UltimatePlayoffEntry

class Command(BaseCommand):
    help = "Syncs all league data from the Sleeper API"

    def handle(self, *args, **options):
        
        self.stdout.write(self.style.SUCCESS('Starting the Sleeper API sync...'))

        # --- This is our global state logic ---
        PLAYOFF_START_WEEK = 15
        self.stdout.write('Fetching global NFL state from Sleeper...')
        try:
            state_response = requests.get("https://api.sleeper.app/v1/state/nfl")
            state_response.raise_for_status()
            state_data = state_response.json()
            
            current_league_week = state_data.get('week', 0)
            if current_league_week == 0:
                current_league_week = state_data.get('display_week', 0)

            self.stdout.write(self.style.SUCCESS(f'Successfully fetched global state. Current NFL Week: {current_league_week}'))
        
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Fatal Error: Could not fetch global NFL state. Aborting sync. Error: {e}'))
            return
        # --- End of global state logic ---


        leagues = League.objects.all()
        if not leagues:
            self.stdout.write(self.style.WARNING('No leagues found. Add some in the admin!'))
            return

        for league in leagues:
            self.stdout.write(f'--- Syncing League: {league.name} (ID: {league.sleeper_league_id}) ---')

            rosters_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/rosters"
            users_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/users"
            playoff_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/winners_bracket"

            try:
                # We still need league_data to find the season
                league_response = requests.get(f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}")
                league_response.raise_for_status()
                league_data = league_response.json()
                current_season = league_data.get('season')

                # --- STEP 1: SYNC USERS (No Changes) ---
                self.stdout.write('Syncing users...')
                # ... (This logic is identical to your current file) ...
                users_response = requests.get(users_url)
                users_response.raise_for_status()
                sleeper_users = users_response.json()
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

                # --- STEP 2: SYNC TEAMS & STANDINGS (No Changes) ---
                self.stdout.write('Syncing teams, rosters, and standings...')
                # ... (This logic is identical to your current file) ...
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
                    if roster_data.get('metadata') and roster_data['metadata'].get('team_name'):
                        team_name = roster_data['metadata']['team_name']
                    elif owner_profile:
                        team_name = f"Team {owner_profile.full_name}"
                    if not team_name:
                        team_name = "Team Name Not Set"
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
                                'owner': owner_profile, 
                                'team_name': team_name,
                                'wins': wins, 'losses': losses, 'ties': ties,
                                'points_for': points_for or 0.00
                            }
                        )
                self.stdout.write(self.style.SUCCESS('  Teams & standings synced successfully.'))
                
                # --- STEP 3: SYNC WEEKLY SCORES (No Changes) ---
                self.stdout.write('Syncing weekly scores...')
                # ... (This logic is identical to your current file) ...
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
                            self.stdout.write(self.style.ERROR(f'  Could not find Team with roster_id {roster_id} in our DB for Week {week} score.'))
                self.stdout.write(self.style.SUCCESS('  Weekly scores synced successfully.'))
                
                
                # ----------------------------------------------------
                # --- STEP 4: SYNC PLAYOFF TEAMS (THE "LATCH" LOGIC) ---
                # ----------------------------------------------------
                self.stdout.write('Syncing playoff bracket...')

                if current_league_week >= PLAYOFF_START_WEEK:
                    self.stdout.write(self.style.SUCCESS(f'  League is in Week {current_league_week} (Playoffs: Week {PLAYOFF_START_WEEK}). Checking status...'))
                    
                    # --- THIS IS THE LATCH ---
                    # Check if the "BIG Playoff" has already been started for this league
                    has_playoff_started = UltimatePlayoffEntry.objects.filter(
                        team__league=league, 
                        season=current_season
                    ).exists()

                    if has_playoff_started:
                        # If it has started, we DO NOT sync the bracket.
                        # This "latches" the original set of teams.
                        self.stdout.write(self.style.WARNING(f'  BIG Playoff has already been started for this league. Skipping bracket sync to preserve qualifiers.'))
                    else:
                        # The BIG Playoff has NOT started. This is the one time
                        # we will run this to get the final, locked-in teams.
                        self.stdout.write(self.style.SUCCESS(f'  Fetching FINAL bracket...'))
                        try:
                            playoff_response = requests.get(playoff_url)
                            playoff_response.raise_for_status()
                            playoff_data = playoff_response.json()

                            if not playoff_data:
                                self.stdout.write(self.style.WARNING('  No playoff data found (this is unusual if playoffs have started).'))
                            else:
                                # First, reset all teams to False, just in case
                                Team.objects.filter(league=league).update(made_league_playoffs=False)
                                
                                # Now, get the set of teams in the bracket
                                playoff_roster_ids = set()
                                for matchup in playoff_data:
                                    if matchup.get('t1'): playoff_roster_ids.add(matchup['t1'])
                                    if matchup.get('t2'): playoff_roster_ids.add(matchup['t2'])
                                
                                # Finally, update only the teams that are in that set
                                Team.objects.filter(
                                    league=league,
                                    sleeper_roster_id__in=playoff_roster_ids
                                ).update(made_league_playoffs=True)
                                
                                self.stdout.write(self.style.SUCCESS(f'  Successfully marked {len(playoff_roster_ids)} teams for the Big Playoff.'))
                        
                        except requests.exceptions.HTTPError as e:
                            if e.response.status_code == 404:
                                self.stdout.write(self.style.WARNING('  Playoff bracket not found (404).'))
                            else:
                                raise e # Re-raise other errors
                
                else:
                    # This is the normal, regular-season logic
                    self.stdout.write(self.style.WARNING(f'  League is in Week {current_league_week}. Playoffs start Week {PLAYOFF_START_WEEK}. Skipping playoff sync.'))
                    # We also reset the flags, just in case (e.g., for a new season)
                    Team.objects.filter(league=league).update(made_league_playoffs=False)

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f'Error fetching data for league {league.name}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            '--- Full Sleeper API sync complete! ---'
        ))