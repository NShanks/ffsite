from django.core.management.base import BaseCommand, CommandError
from api.models import UltimatePlayoffEntry, WeeklyScore
from decimal import Decimal

class Command(BaseCommand):
    help = 'Runs the BIG Playoff elimination for a given week.'

    # This adds the required '--week' argument
    def add_arguments(self, parser):
        parser.add_argument(
            '--week',
            type=int,
            required=True,
            help='The playoff week to run eliminations for (e..g, 15, 16).',
        )

    def handle(self, *args, **options):
        current_week = options['week']
        next_week = current_week + 1
        
        self.stdout.write(self.style.SUCCESS(
            f'--- Running BIG Playoff Elimination for Week {current_week}... ---'
        ))

        # 1. Get all *active* playoff entries for the specified week
        active_entries = UltimatePlayoffEntry.objects.filter(
            playoff_week=current_week,
            is_eliminated=False
        )

        if not active_entries.exists():
            self.stdout.write(self.style.ERROR(f'No active playoff entries found for Week {current_week}. Did you run "start_big_playoff"?'))
            return

        self.stdout.write(f'  Found {active_entries.count()} active contenders for Week {current_week}.')

        # 2. Get the scores for these teams
        # We'll build a list of tuples: (entry, score)
        scored_entries = []
        for entry in active_entries:
            try:
                # Find the score that sync_sleeper already saved for us
                weekly_score = WeeklyScore.objects.get(
                    team=entry.team,
                    week=current_week,
                    season=entry.season
                )
                score = weekly_score.points_scored
            except WeeklyScore.DoesNotExist:
                # This should not happen if sync_sleeper ran, but it's a good safety check
                self.stdout.write(self.style.WARNING(f'  No score found for {entry.team.team_name} for Week {current_week}. Using 0.00.'))
                score = Decimal('0.00')

            # Update the entry's score in the database
            entry.week_score = score
            entry.save()
            scored_entries.append((entry, score))

        # 3. Sort the list by score (highest first)
        scored_entries.sort(key=lambda x: x[1], reverse=True)

        # 4. Determine the "cut line" (the bottom half)
        # We use 'len(scored_entries) // 2' for integer division
        total_contenders = len(scored_entries)
        # This calculates how many teams get to ADVANCE
        # math.ceil(total / 2) is the same as (total + 1) // 2
        num_advancing = (total_contenders + 1) // 2
        
        self.stdout.write(f'  Total: {total_contenders} contenders. {num_advancing} will advance.')
        
        # 5. Run the eliminations
        winners = []
        losers = []

        for index, (entry, score) in enumerate(scored_entries):
            rank = index + 1
            entry.final_rank = rank # Set their rank for this week
            
            if rank <= num_advancing:
                # --- WINNER ---
                winners.append(entry)
                entry.save() # Save the rank
            else:
                # --- LOSER ---
                losers.append(entry)
                entry.is_eliminated = True # Mark as eliminated
                entry.save() # Save the rank and eliminated status

        # 6. Print results and create entries for next week
        self.stdout.write(self.style.SUCCESS('\n--- Week {current_week} Results ---'))
        self.stdout.write('ADVANCING:')
        for rank, entry in enumerate(winners, 1):
            self.stdout.write(f'  {rank}. {entry.team.team_name} ({entry.week_score} pts)')
        
        self.stdout.write(self.style.ERROR('\nELIMINATED:'))
        for rank, entry in enumerate(losers, num_advancing + 1):
            self.stdout.write(f'  {rank}. {entry.team.team_name} ({entry.week_score} pts)')

        # 7. Create next week's entries for the winners
        if next_week <= 18: # Or whatever your final week is
            self.stdout.write(f'\nCreating new entries for Week {next_week}...')
            for winner_entry in winners:
                UltimatePlayoffEntry.objects.get_or_create(
                    team=winner_entry.team,
                    season=winner_entry.season,
                    playoff_week=next_week
                )
            self.stdout.write(self.style.SUCCESS(f'  {len(winners)} entries for Week {next_week} created.'))
        else:
            self.stdout.write(self.style.SUCCESS('\n--- FINAL WEEK COMPLETE ---'))

        self.stdout.write(self.style.SUCCESS(
            f'--- BIG Playoff Elimination for Week {current_week} Complete! ---'
        ))