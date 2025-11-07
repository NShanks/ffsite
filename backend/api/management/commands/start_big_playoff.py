from django.core.management.base import BaseCommand
from api.models import League, Team, UltimatePlayoffEntry

class Command(BaseCommand):
    help = 'Initializes the BIG Playoff. Finds all qualified teams and creates their first playoff entry.'

    def handle(self, *args, **options):
        
        # --- This is our league's "business rule" ---
        PLAYOFF_START_WEEK = 15
        
        self.stdout.write(self.style.SUCCESS(
            f'--- Starting the BIG Playoff for Week {PLAYOFF_START_WEEK}... ---'
        ))

        # Get all leagues from our database
        all_leagues = League.objects.all()
        
        if not all_leagues:
            self.stdout.write(self.style.WARNING('No leagues found in database.'))
            return

        total_teams_added = 0
        
        # Go through each league one by one
        for league in all_leagues:
            # Find all teams in *this* league that are marked as playoff teams
            playoff_teams = Team.objects.filter(
                league=league,
                made_league_playoffs=True
            )

            if not playoff_teams.exists():
                self.stdout.write(self.style.WARNING(f'No playoff teams found for league: {league.name}'))
                continue

            self.stdout.write(f'  Found {playoff_teams.count()} playoff teams for {league.name}...')

            # Now, create the entry for each team
            for team in playoff_teams:
                # Use get_or_create to prevent duplicates if you run this twice
                entry, created = UltimatePlayoffEntry.objects.get_or_create(
                    team=team,
                    season=league.season,
                    playoff_week=PLAYOFF_START_WEEK
                )

                if created:
                    self.stdout.write(f'    + Added entry for: {team.team_name}')
                    total_teams_added += 1

        self.stdout.write(self.style.SUCCESS(
            f'--- BIG Playoff Started! Added {total_teams_added} new entries. ---'
        ))