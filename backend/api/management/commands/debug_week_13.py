import requests
from django.core.management.base import BaseCommand
from api.models import League

class Command(BaseCommand):
    help = "Inspects raw Sleeper data for Week 13"

    def handle(self, *args, **options):
        # 1. Get the first league found in the DB
        league = League.objects.last()
        if not league:
            self.stdout.write("No leagues found.")
            return

        week = 13 # <--- TARGET WEEK
        
        self.stdout.write(f"--- INSPECTING WEEK {week} FOR: {league.name} ---")
        
        url = f"https://api.sleeper.app/v1/league/{league.sleeper_league_id}/matchups/{week}"
        response = requests.get(url)
        data = response.json()

        self.stdout.write(f"API Status: {response.status_code}")
        
        # Print the raw points for every roster
        for matchup in data:
            roster_id = matchup.get('roster_id')
            points = matchup.get('points')
            self.stdout.write(f"Roster ID: {roster_id} | Points: {points}")