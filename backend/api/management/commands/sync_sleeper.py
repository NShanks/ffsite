import requests
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import League, MemberProfile, Team

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

            rosters_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/rosters"
            users_url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/users"

            try:
                # ----------------------------------------------------
                # STEP 1: SYNC USERS (NEW, EXPLICIT LOGIC)
                # ----------------------------------------------------
                self.stdout.write('Syncing users...')
                users_response = requests.get(users_url)
                users_response.raise_for_status()
                sleeper_users = users_response.json()

                for user_data in sleeper_users:
                    sleeper_id = user_data.get('user_id')
                    display_name = user_data.get('display_name', 'SleeperUser')

                    if not sleeper_id:
                        continue # Skip if no sleeper_id

                    try:
                        # --- UPDATE PATH ---
                        # Try to find the profile by its unique sleeper_id
                        profile = MemberProfile.objects.get(sleeper_id=sleeper_id)
                        
                        # Profile exists! Just update its fields.
                        profile.full_name = display_name
                        profile.save()

                        # Also update the linked user's username if it's different
                        user = profile.user
                        if user.username != display_name:
                            # Check if new name is already taken
                            if not User.objects.filter(username=display_name).exists():
                                user.username = display_name
                                user.save()
                                self.stdout.write(f'  Updated username for: {display_name}')

                    except MemberProfile.DoesNotExist:
                        # --- CREATE PATH ---
                        # Profile does not exist. We must create it.
                        # But first, we must create a User for it.
                        
                        base_username = display_name
                        username = base_username
                        counter = 1
                        # Find a unique username
                        while User.objects.filter(username=username).exists():
                            username = f"{base_username}_{counter}"
                            counter += 1
                        
                        # Create the User
                        user = User.objects.create(username=username)
                        user.set_unusable_password() # Not a real login
                        user.save()
                        
                        # NOW we can create the profile and link it
                        profile = MemberProfile.objects.create(
                            user=user,
                            sleeper_id=sleeper_id,
                            full_name=display_name
                        )
                        self.stdout.write(f'  Created new member: {username} (Profile: {profile.id})')

                self.stdout.write(self.style.SUCCESS('  Users synced successfully.'))

                # ----------------------------------------------------
                # STEP 2: SYNC TEAMS (ROSTERS)
                # ----------------------------------------------------
                self.stdout.write('Syncing teams (rosters)...')
                rosters_response = requests.get(rosters_url)
                rosters_response.raise_for_status()
                sleeper_rosters = rosters_response.json()

                for roster_data in sleeper_rosters:
                    sleeper_roster_id = roster_data.get('roster_id')
                    owner_sleeper_id = roster_data.get('owner_id')
                    
                    team_name = "Team Name Not Set"
                    if roster_data.get('metadata') and roster_data['metadata'].get('team_name'):
                        team_name = roster_data['metadata']['team_name']

                    owner_profile = None
                    if owner_sleeper_id:
                        try:
                            # This .get() will now work because sleeper_id is unique!
                            owner_profile = MemberProfile.objects.get(sleeper_id=owner_sleeper_id)
                        except MemberProfile.DoesNotExist:
                            self.stdout.write(self.style.ERROR(f'  Could not find member profile for sleeper ID {owner_sleeper_id} (This should not happen if user sync worked)'))

                    if sleeper_roster_id:
                        team, team_created = Team.objects.update_or_create(
                            league=league,
                            sleeper_roster_id=sleeper_roster_id,
                            defaults={
                                'owner': owner_profile, # This can be None if league is not full
                                'team_name': team_name
                            }
                        )
                        if team_created:
                            self.stdout.write(f'  Created new team: {team_name}')
                    
                self.stdout.write(self.style.SUCCESS('  Teams synced successfully.'))

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f'Error fetching data for league {league.name}: {e}'))
        
        self.stdout.write(self.style.SUCCESS(
            '--- Full Sleeper API sync complete! ---'
        ))