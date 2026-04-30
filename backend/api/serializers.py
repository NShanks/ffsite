from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    MemberProfile, League, Team, WeeklyScore,
    UltimatePlayoffEntry, Payout, CommonPlayer,
    Season, PlannedLeague, LeagueAssignment, SeasonDues,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class MemberProfileSerializer(serializers.ModelSerializer):
    """Public-safe serializer — no payment info or contact details."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = MemberProfile
        fields = ['id', 'user', 'first_name', 'last_name', 'sleeper_id']


class MemberProfileAdminSerializer(serializers.ModelSerializer):
    """Full serializer — only used in admin-authenticated endpoints."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            'id', 'user', 'first_name', 'last_name', 'sleeper_id',
            'sleeper_display_name', 'payment_info', 'phone',
            'has_paid_dues', 'discord_username', 'invited_by',
        ]


class LeagueSerializer(serializers.ModelSerializer):
    class Meta:
        model = League
        fields = ['id', 'name', 'sleeper_league_id', 'season', 'commissioner']


class TeamOwnerSerializer(serializers.ModelSerializer):
    """Minimal owner info safe to embed in public team responses."""
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(read_only=True)  # reads @property

    class Meta:
        model = MemberProfile
        fields = ['id', 'first_name', 'last_name', 'full_name', 'username']


class TeamSerializer(serializers.ModelSerializer):
    owner = TeamOwnerSerializer(read_only=True)

    class Meta:
        model = Team
        fields = [
            'id', 'owner', 'league', 'sleeper_roster_id', 'team_name',
            'made_league_playoffs', 'wins', 'losses', 'ties', 'points_for',
            'top_three_players',
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
            'id', 'team', 'season', 'playoff_week',
            'week_score', 'is_eliminated', 'final_rank',
        ]


class PayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = ['id', 'recipient', 'amount', 'reason', 'season', 'is_paid']


class CommonPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommonPlayer
        fields = ['rank', 'player_name', 'player_id', 'position', 'nfl_team', 'count', 'average_score']


# ── Season / Organizer serializers ────────────────────────────────────────────

class SeasonSerializer(serializers.ModelSerializer):
    season_type = serializers.SerializerMethodField()

    def get_season_type(self, obj):
        if obj.league_ids and obj.is_active:  return 'active'
        if obj.league_ids:                    return 'completed'
        return 'pre_season'

    class Meta:
        model = Season
        fields = ['id', 'year', 'label', 'is_active', 'league_ids', 'season_type']


class PlannedLeagueSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannedLeague
        fields = ['id', 'season', 'name', 'sleeper_league_id', 'order']


class OrganizerMemberSerializer(serializers.ModelSerializer):
    """Member card for the organizer view — includes contact info for admin."""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    assigned_league_id = serializers.SerializerMethodField()
    dues_paid = serializers.SerializerMethodField()

    class Meta:
        model = MemberProfile
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'email', 'phone', 'payment_info',
            'sleeper_id', 'sleeper_display_name',
            'assigned_league_id', 'dues_paid',
        ]

    def get_assigned_league_id(self, obj):
        season = self.context.get('season')
        if not season:
            return None
        assignment = obj.league_assignments.filter(season=season).select_related('planned_league').first()
        return assignment.planned_league_id if assignment else None

    def get_dues_paid(self, obj):
        season = self.context.get('season')
        if not season:
            return False
        dues = obj.season_dues.filter(season=season).first()
        return dues.paid if dues else False
