import requests # <--- Added this to fetch the season
from django.core.management.base import BaseCommand
from api.models import League, Team, UltimatePlayoffEntry

class Command(BaseCommand):
    help = "Seeds the Big Playoff (Week 15) with Top 6 PF from each league"

    def handle(self, *args, **options):
        self.stdout.write("--- SELECTION COMMITTEE IS NOW IN SESSION ---")

        # 1. Fetch the Current Season from Sleeper
        # We need this because the database requires a 'season' field
        try:
            state_res = requests.get("https://api.sleeper.app/v1/state/nfl")
            state_data = state_res.json()
            current_season = state_data.get('season')
            self.stdout.write(f"Current Season: {current_season}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Could not fetch season from Sleeper: {e}"))
            return

        # 2. Define the Conferences
        CONF_A = {
            '1252705235122520064', # Pokemon
            '1252705424256270336', # Old Phones
            '1252701932896657408', # WWE
        }
        
        CONF_B = {
            '1252705690842050560', # Cartoon Villains
            '1252704674759315456', # ESPN 8 The Ocho
            '1252704914572849152', # Animals
        }

        # Clear any existing playoff data to start fresh
        if UltimatePlayoffEntry.objects.exists():
            self.stdout.write(self.style.WARNING("Wiping existing playoff bracket..."))
            UltimatePlayoffEntry.objects.all().delete()

        leagues = League.objects.all()
        total_selected = 0

        for league in leagues:
            lid = str(league.sleeper_league_id)
            
            # Determine Conference Label
            conference_label = "Unknown"
            if lid in CONF_A:
                conference_label = "Conference A"
            elif lid in CONF_B:
                conference_label = "Conference B"
            else:
                self.stdout.write(self.style.ERROR(f"League {league.name} ({lid}) does not belong to a conference! Skipping."))
                continue

            self.stdout.write(f"Processing {league.name} -> {conference_label}")

            # 3. Get Top 6 Teams by Points For (PF)
            top_teams = Team.objects.filter(league=league).order_by('-points_for')[:6]

            if not top_teams:
                self.stdout.write(self.style.WARNING(f"  No teams found in {league.name}"))
                continue

            for rank, team in enumerate(top_teams, 1):
                # Create the Entry for Week 15
                UltimatePlayoffEntry.objects.create(
                    team=team,
                    season=current_season, # <--- Added this field
                    playoff_week=15,
                    conference=conference_label,
                    starting_points=team.points_for,
                    week_score=0.0,
                    is_eliminated=False
                )
                self.stdout.write(f"  #{rank} Selected: {team.team_name} ({team.points_for} pts)")
                total_selected += 1

        self.stdout.write(self.style.SUCCESS(f"--- BRACKET SET! {total_selected} Teams Selected for Week 15 ---"))