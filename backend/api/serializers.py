from rest_framework import serializers
from django.contrib.auth.models import User
# Import all of your models
from .models import (
    MemberProfile, 
    League, 
    Team, 
    WeeklyScore, 
    UltimatePlayoffEntry, 
    Payout
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class MemberProfileSerializer(serializers.ModelSerializer):
    # This 'user' field will use the UserSerializer above
    # to show the user's info instead of just their ID.
    user = UserSerializer(read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            'id', 
            'user', 
            'full_name', 
            'sleeper_id', 
            'payment_info', 
            'has_paid_dues', 
            'discord_username',
            'invited_by'
        ]

class LeagueSerializer(serializers.ModelSerializer):
    class Meta:
        model = League
        fields = ['id', 'name', 'sleeper_league_id', 'season', 'commissioner']


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = [
            'id', 
            'owner', 
            'league', 
            'sleeper_roster_id', 
            'team_name', 
            'made_league_playoffs',
            'wins',
            'losses',
            'ties',
            'points_for'
        ]


class WeeklyScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyScore
        fields = ['id', 'team', 'week', 'points_scored', 'season']


class UltimatePlayoffEntrySerializer(serializers.ModelSerializer):
    team = serializers.StringRelatedField()
    class Meta:
        model = UltimatePlayoffEntry
        fields = [
            'id', 
            'team',
            'season', 
            'playoff_week', 
            'week_score', 
            'is_eliminated', 
            'final_rank'
        ]


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ['id', 'recipient', 'amount', 'reason', 'season', 'is_paid']