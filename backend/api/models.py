from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class MemberProfile(models.Model):
    # This links our profile to a specific Django User account.
    # The User model itself already handles: username, password, email
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # --- Our Custom Fields ---
    full_name = models.CharField(max_length=100, blank=True)
    sleeper_id = models.CharField(max_length=100, blank=True, null=True)
    payment_info = models.CharField(max_length=100, blank=True, null=True)
    has_paid_dues = models.BooleanField(default=False)
    discord_username = models.CharField(max_length=100, blank=True, null=True)
    # This links to another MemberProfile (a commissioner)
    # on_delete=models.SET_NULL means if the inviting commissioner's
    # profile is deleted, this field just becomes blank (null).
    invited_by = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    def __str__(self):
        # This tells Django what to show in the admin panel (e.g., "Nic")
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

    def __str__(self):
        # Shows "Team Name (Owner Name)" in admin
        return f"{self.team_name} ({self.owner.user.username})"


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