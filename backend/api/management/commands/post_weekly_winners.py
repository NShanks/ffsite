from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db.models import Max  # We'll use this to find the highest score
import requests

from api.models import League, WeeklyScore

class Command(BaseCommand):
    help = 'Finds the weekly high score for each league and posts a summary to Discord.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--week',
            type=int,
            required=True,
            help='The week to find the high scorers for (e.g., 10).',
        )

    def handle(self, *args, **options):
        week = options['week']
        
        self.stdout.write(self.style.SUCCESS(
            f'--- Finding high scorers for Week {week}... ---'
        ))

        # 1. Get all leagues from the database
        leagues = League.objects.all()
        
        # 2. This list will hold our message strings
        winner_messages = []

        for league in leagues:
            try:
                # 3. Find the highest score in this league for this week
                # This finds the WeeklyScore object with the maximum points_scored
                # for the given league, week, and season.
                top_score_entry = WeeklyScore.objects.filter(
                    team__league=league,
                    week=week,
                    season=league.season # Assumes league season is correct
                ).latest('points_scored') # 'latest' is a shortcut for ordering and picking the top one

                # 4. Now that we have the winner, get their details
                winner_team = top_score_entry.team
                winner_profile = winner_team.owner
                
                venmo = winner_profile.payment_info
                if not venmo or venmo.strip() == "":
                    venmo_text = "(Venmo not on file)"
                else:
                    venmo_text = f"**Venmo:** {venmo}"

                # 5. Build the message line for this league's winner
                message_line = (
                    f"🏆 **{league.name}**\n"
                    f"   **Winner:** {winner_profile.full_name}\n"
                    f"   **Team:** {winner_team.team_name}\n"
                    f"   **Score:** {top_score_entry.points_scored}\n"
                    f"   {venmo_text}\n"
                )
                winner_messages.append(message_line)

            except WeeklyScore.DoesNotExist:
                # This happens if a league has no scores for that week
                self.stdout.write(self.style.WARNING(f'No scores found for {league.name} for Week {week}. Skipping.'))
            except Exception as e:
                # Catch any other unexpected errors for this league
                self.stdout.write(self.style.ERROR(f'Error processing {league.name}: {e}'))

        # 6. Check if we found any winners at all
        if not winner_messages:
            self.stdout.write(self.style.WARNING('No winners found for any league. Nothing to post.'))
            return

        # 7. Build the final, consolidated message
        # We use '\n' to join each league's message with a blank line
        final_message_content = (
            f"🎉 **Weekly High Score Payouts for Week {week}** 🎉\n\n"
            + "\n".join(winner_messages)
            + "\n*Commissioners, please send out the $5 payouts.*"
        )
        
        # 8. Get the Webhook URL and post to Discord
        webhook_url = getattr(settings, 'DISCORD_PAYOUT_WEBHOOK_URL', None)
        if not webhook_url:
            self.stdout.write(self.style.ERROR('DISCORD_PAYOUT_WEBHOOK_URL not found in settings.py.'))
            return
        
        try:
            data = {"content": final_message_content}
            response = requests.post(webhook_url, json=data)
            response.raise_for_status()
            
            self.stdout.write(self.style.SUCCESS(
                '--- Successfully posted consolidated winner list to Discord! ---'
            ))
        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f'Error posting to Discord: {e}'))