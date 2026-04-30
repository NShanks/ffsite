from django.core.management.base import BaseCommand
from django.conf import settings
import requests

from api.models import League, Team


class Command(BaseCommand):
    help = 'Fetches the weekly high score for each league directly from Sleeper and posts to Discord.'

    def add_arguments(self, parser):
        parser.add_argument('--week', type=int, required=True,
                            help='The NFL week to find high scorers for (e.g., 10).')

    def handle(self, *args, **options):
        week = options['week']

        self.stdout.write(self.style.SUCCESS(f'--- Finding high scorers for Week {week} via Sleeper API... ---'))

        leagues = League.objects.all()
        winner_messages = []

        for league in leagues:
            try:
                url = f'https://api.sleeper.app/v1/league/{league.sleeper_league_id}/matchups/{week}'
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                matchups = resp.json()

                if not matchups:
                    self.stdout.write(self.style.WARNING(f'No matchup data for {league.name} Week {week}. Skipping.'))
                    continue

                # Find the roster with the highest points this week
                top = max(matchups, key=lambda m: m.get('points') or 0)
                roster_id = str(top.get('roster_id'))
                top_points = top.get('points') or 0

                # Look up the team in the DB by its Sleeper roster ID
                team = Team.objects.filter(league=league, sleeper_roster_id=roster_id).select_related('owner').first()

                if not team:
                    self.stdout.write(self.style.WARNING(
                        f'No team found for roster_id={roster_id} in {league.name}. Skipping.'
                    ))
                    continue

                owner = team.owner
                if owner and owner.payment_info and owner.payment_info.strip():
                    venmo_text = f'**Venmo:** {owner.payment_info}'
                else:
                    venmo_text = '(Venmo not on file)'

                owner_name = owner.full_name if owner else 'Unclaimed Team'

                winner_messages.append(
                    f'🏆 **{league.name}**\n'
                    f'   **Winner:** {owner_name}\n'
                    f'   **Team:** {team.team_name}\n'
                    f'   **Score:** {top_points}\n'
                    f'   {venmo_text}\n'
                )

            except requests.exceptions.RequestException as e:
                self.stdout.write(self.style.ERROR(f'Sleeper API error for {league.name}: {e}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing {league.name}: {e}'))

        if not winner_messages:
            self.stdout.write(self.style.WARNING('No winners found for any league. Nothing to post.'))
            return

        final_message = (
            f'🎉 **Weekly High Score Payouts for Week {week}** 🎉\n\n'
            + '\n'.join(winner_messages)
            + '\n*Commissioners, please send out the $5 payouts.*'
        )

        webhook_url = getattr(settings, 'DISCORD_PAYOUT_WEBHOOK_URL', None)
        if not webhook_url:
            self.stdout.write(self.style.ERROR('DISCORD_PAYOUT_WEBHOOK_URL not found in settings.py.'))
            return

        try:
            response = requests.post(webhook_url, json={'content': final_message}, timeout=10)
            response.raise_for_status()
            self.stdout.write(self.style.SUCCESS('--- Successfully posted winner list to Discord! ---'))
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Error posting to Discord: {e}'))
