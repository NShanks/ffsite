import requests
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import League, MemberProfile, Team, WeeklyScore

class Command(BaseCommand):
    help = "Syncs all league data from the Sleeper API"

    def handle(self, *args, **options):
        
        self.stdout.write(self.style.SUCCESS('Starting the Sleeper API sync...'))
        leagues = League.objects.all()

        if not leagues:
            self.stdout.write(self.style.WARNING('No leagues found. Add some in the admin!'))
            return

        for league in leagues:
            self.stdout.write(f'--- Syncing League: {league.name} (ID: {league.sleeper_league_id}) ---')

            league_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}"
            rosters_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/rosters"
            users_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/users"
            # --- The 'standings_url' is GONE ---

            try:
                league_response = requests.get(league_url)
                league_response.raise_for_status()
                league_data = league_response.json()
                current_season = league_data.get('season')

                if not current_season:
                    self.stdout.write(self.style.ERROR(f'  Could not determine season for league {league.name}. Skipping.'))
                    continue

                # ----------------------------------------------------
                # STEP 1: SYNC USERS (No Changes)
                # ----------------------------------------------------
                self.stdout.write('Syncing users...')
                users_response = requests.get(users_url)
                users_response.raise_for_status()
                sleeper_users = users_response.json()

                for user_data in sleeper_users:
                    sleeper_id = user_data.get('user_id')
                    display_name = user_data.get('display_name', 'SleeperUser')

                    if not sleeper_id:
                        continue 
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
                        profile = MemberProfile.objects.create(
                            user=user,
                            sleeper_id=sleeper_id,
                            full_name=display_name
                        )
                self.stdout.write(self.style.SUCCESS('  Users synced successfully.'))

                # ----------------------------------------------------
                # STEP 2: SYNC TEAMS & STANDINGS (*** NEW COMBINED LOGIC ***)
                # ----------------------------------------------------
                self.stdout.write('Syncing teams, rosters, and standings...')
                rosters_response = requests.get(rosters_url)
                rosters_response.raise_for_status()
                sleeper_rosters = rosters_response.json()

                for roster_data in sleeper_rosters:
                    sleeper_roster_id = roster_data.get('roster_id')
                    owner_sleeper_id = roster_data.get('owner_id')
                    
                    # --- Get Owner Profile ---
                    owner_profile = None
                    if owner_sleeper_id:
                        try:
                            owner_profile = MemberProfile.objects.get(sleeper_id=owner_sleeper_id)
                        except MemberProfile.DoesNotExist:
                            self.stdout.write(self.style.ERROR(f'  Could not find member profile for sleeper ID {owner_sleeper_id}'))

                    # --- Get Team Name ---
                    team_name = None
                    if roster_data.get('metadata') and roster_data['metadata'].get('team_name'):
                        team_name = roster_data['metadata']['team_name']
                    elif owner_profile:
                        team_name = f"Team {owner_profile.full_name}"
                    if not team_name:
                        team_name = "Team Name Not Set"
                    
                    # --- GET STANDINGS DATA (W-L-T) ---
                    # This data lives inside the 'settings' object of the roster
                    settings = roster_data.get('settings', {})
                    wins = settings.get('wins', 0)
                    losses = settings.get('losses', 0)
                    ties = settings.get('ties', 0)
                    
                    # 'fpts' is Sleeper's field for 'Fantasy Points For'
                    # We use .get('fpts', 0.00) for safety
                    points_for = settings.get('fpts', 0.00)

                    # --- Create or Update the Team with ALL data ---
                    if sleeper_roster_id:
                        team, team_created = Team.objects.update_or_create(
                            league=league,
                            sleeper_roster_id=sleeper_roster_id,
                            defaults={
                                'owner': owner_profile, 
                                'team_name': team_name,
                                'wins': wins,
                                'losses': losses,
                                'ties': ties,
                                'points_for': points_for or 0.00
                            }
                        )
                        if team_created:
                            self.stdout.write(f'  Created new team: {team_name}')
                    
                self.stdout.write(self.style.SUCCESS('  Teams & standings synced successfully.'))

                # ----------------------------------------------------
                # STEP 3: SYNC WEEKLY SCORES (No Changes)
                # ----------------------------------------------------
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
                        
                        if not roster_id:
                            continue
                        try:
                            team = Team.objects.get(league=league, sleeper_roster_id=roster_id)
                            WeeklyScore.objects.update_or_create(
                                team=team,
                                week=week,
                                season=current_season,
                                defaults={'points_scored': points or 0.00}
                            )
                        except Team.DoesNotExist:
                            self.stdout.write(self.style.ERROR(f'  Could not find Team with roster_id {roster_id} in our DB for Week {week} score.'))
                
                self.stdout.write(self.style.SUCCESS('  Weekly scores synced successfully.'))

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f'Error fetching data for league {league.name}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            '--- Full Sleeper API sync complete! ---'
        ))