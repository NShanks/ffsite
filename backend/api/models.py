from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class MemberProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    sleeper_id = models.CharField(max_length=100, blank=True, null=True)
    sleeper_display_name = models.CharField(max_length=100, blank=True, null=True)
    payment_info = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    has_paid_dues = models.BooleanField(default=False)
    has_completed_onboarding = models.BooleanField(default=True)
    discord_username = models.CharField(max_length=100, blank=True, null=True)
    invited_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.user.username
    
class League(models.Model):
    name = models.CharField(max_length=100)
    sleeper_league_id = models.CharField(max_length=100, unique=True)
    season = models.IntegerField()

    # This links the league to one specific commissioner
    commissioner = models.ForeignKey(
        MemberProfile, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    def __str__(self):
        # This will show "League Name (2025)" in the admin
        return f"{self.name} ({self.season})"
    
class Team(models.Model):
    owner = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name="teams")
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="teams")
    sleeper_roster_id = models.CharField(max_length=50)
    team_name = models.CharField(max_length=100)
    made_league_playoffs = models.BooleanField(default=False)
    wins = models.IntegerField(default=0)
    losses = models.IntegerField(default=0)
    ties = models.IntegerField(default=0)
    points_for = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    top_three_players = models.JSONField(default=list, blank=True)

    def __str__(self):
        if self.owner:
            return f"{self.team_name} ({self.owner.user.username})"
        return f"{self.team_name} (No Owner)"


class WeeklyScore(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="scores")
    week = models.IntegerField()
    points_scored = models.DecimalField(max_digits=5, decimal_places=2)
    season = models.IntegerField()

    def __str__(self):
        # Shows "Team Name - Week 1: 120.50" in admin
        return f"{self.team.team_name} - Week {self.week}: {self.points_scored}"


class UltimatePlayoffEntry(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="playoff_entries")
    season = models.IntegerField()
    playoff_week = models.IntegerField()
    week_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    is_eliminated = models.BooleanField(default=False)
    final_rank = models.IntegerField(null=True, blank=True)

    def __str__(self):
        # Shows "Team Name (Season 2025 - Week 15)" in admin
        return f"{self.team.team_name} ({self.season} - Week {self.playoff_week})"


class Payout(models.Model):
    recipient = models.ForeignKey(MemberProfile, on_delete=models.SET_NULL, null=True, related_name="payouts")
    amount = models.DecimalField(max_digits=7, decimal_places=2)
    reason = models.CharField(max_length=255)
    season = models.IntegerField()
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        # Shows "Nic - $5.00 (Weekly Winner Week 5)" in admin
        return f"{self.recipient.user.username} - ${self.amount} ({self.reason})"

class Season(models.Model):
    year = models.IntegerField(unique=True)
    label = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False)
    league_ids = models.JSONField(default=list)

    def __str__(self):
        return f"{self.label} ({'active' if self.is_active else 'archived'})"


class PlannedLeague(models.Model):
    season = models.ForeignKey(Season, related_name='planned_leagues', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    sleeper_league_id = models.CharField(max_length=100, blank=True, null=True)
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.season.year})"


class LeagueAssignment(models.Model):
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name='league_assignments')
    planned_league = models.ForeignKey(PlannedLeague, on_delete=models.CASCADE, related_name='assignments')
    season = models.ForeignKey(Season, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('member', 'season')

    def __str__(self):
        return f"{self.member} → {self.planned_league}"


class SeasonDues(models.Model):
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name='season_dues')
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('member', 'season')

    def __str__(self):
        return f"{self.member} dues {self.season.year}: {'paid' if self.paid else 'unpaid'}"


class CommonPlayer(models.Model):
    # This table is wiped and rewritten every day by the sync script
    rank = models.IntegerField()
    player_name = models.CharField(max_length=100)
    player_id = models.CharField(max_length=50, default="")
    position = models.CharField(max_length=10)
    nfl_team = models.CharField(max_length=10, null=True, blank=True)
    count = models.IntegerField(help_text="How many playoff teams have this player")
    average_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"#{self.rank} {self.player_name} ({self.count})"