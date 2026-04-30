from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    MemberProfile, League, Team, WeeklyScore,
    UltimatePlayoffEntry, Payout, CommonPlayer,
    Season, PlannedLeague, LeagueAssignment, SeasonDues,
)
from .serializers import (
    MemberProfileSerializer, MemberProfileAdminSerializer,
    LeagueSerializer, TeamSerializer,
    WeeklyScoreSerializer, UltimatePlayoffEntrySerializer,
    PayoutSerializer, CommonPlayerSerializer,
    SeasonSerializer, PlannedLeagueSerializer, OrganizerMemberSerializer,
)
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.core.management import call_command
from django.utils import timezone
from django.contrib.auth.models import User
import requests

# ── Auth endpoints ─────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = []

    def post(self, request):
        username         = request.data.get('username', '').strip()
        password         = request.data.get('password', '')
        sleeper_username = request.data.get('sleeper_username', '').strip()
        first_name       = request.data.get('first_name', '').strip()
        last_name        = request.data.get('last_name', '').strip()
        email            = request.data.get('email', '').strip()
        phone            = request.data.get('phone', '').strip()

        if not username or not password or not sleeper_username:
            return Response({'error': 'username, password, and sleeper_username are required.'}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'That username is already taken.'}, status=400)

        resp = requests.get(f'https://api.sleeper.app/v1/user/{sleeper_username}', timeout=5)
        if resp.status_code != 200 or not resp.json():
            return Response({'error': 'Sleeper username not found. Check the spelling and try again.'}, status=400)

        sleeper_data = resp.json()
        sleeper_id   = sleeper_data.get('user_id')
        display_name = sleeper_data.get('display_name', sleeper_username)

        if not sleeper_id:
            return Response({'error': 'Could not resolve Sleeper user ID.'}, status=400)

        user = User.objects.create_user(username=username, password=password, email=email)
        MemberProfile.objects.create(
            user=user,
            sleeper_id=sleeper_id,
            sleeper_display_name=display_name,
            first_name=first_name,
            last_name=last_name,
            phone=phone or None,
            has_completed_onboarding=False,
        )
        return Response({'success': True}, status=201)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def _profile_data(self, user):
        try:
            profile = user.memberprofile
        except MemberProfile.DoesNotExist:
            return {
                'id': user.id, 'username': user.username, 'email': user.email,
                'is_staff': user.is_staff,
                'first_name': '', 'last_name': '',
                'phone': None, 'sleeper_id': None,
                'sleeper_display_name': None, 'payment_info': None,
            }
        return {
            'id':                        user.id,
            'username':                  user.username,
            'email':                     user.email or '',
            'is_staff':                  user.is_staff,
            'first_name':                profile.first_name or '',
            'last_name':                 profile.last_name or '',
            'phone':                     profile.phone or '',
            'sleeper_id':                profile.sleeper_id,
            'sleeper_display_name':      profile.sleeper_display_name or None,
            'payment_info':              profile.payment_info or None,
            'has_completed_onboarding':  profile.has_completed_onboarding,
        }

    def get(self, request):
        return Response(self._profile_data(request.user))

    def patch(self, request):
        try:
            profile = request.user.memberprofile
        except MemberProfile.DoesNotExist:
            profile = MemberProfile.objects.create(user=request.user)

        data = request.data

        if 'first_name' in data:
            profile.first_name = data['first_name'].strip()
        if 'last_name' in data:
            profile.last_name = data['last_name'].strip()
        if 'phone' in data:
            profile.phone = data['phone'].strip() or None
        if data.get('payment_info') is not None:
            profile.payment_info = data['payment_info'].strip()

        if data.get('email') is not None:
            request.user.email = data['email'].strip()
            request.user.save(update_fields=['email'])

        if 'has_completed_onboarding' in data:
            profile.has_completed_onboarding = bool(data['has_completed_onboarding'])

        sleeper_username = data.get('sleeper_username', '').strip()
        if sleeper_username:
            resp = requests.get(f'https://api.sleeper.app/v1/user/{sleeper_username}', timeout=5)
            if resp.status_code != 200 or not resp.json():
                return Response({'error': 'Sleeper username not found. Check the spelling and try again.'}, status=400)
            sleeper_data = resp.json()
            sleeper_id   = sleeper_data.get('user_id')
            if not sleeper_id:
                return Response({'error': 'Could not resolve Sleeper user ID.'}, status=400)
            profile.sleeper_id           = sleeper_id
            profile.sleeper_display_name = sleeper_data.get('display_name', sleeper_username)

        profile.save()
        return Response(self._profile_data(request.user))


# ── Public data endpoints ──────────────────────────────────────────────────────

class MemberProfileList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profiles   = MemberProfile.objects.all()
        serializer = MemberProfileSerializer(profiles, many=True)
        return Response(serializer.data)


class LeagueList(APIView):
    def get(self, request):
        leagues    = League.objects.all()
        serializer = LeagueSerializer(leagues, many=True)
        return Response(serializer.data)


class LeagueDetail(APIView):
    def get(self, request, pk):
        league     = get_object_or_404(League, pk=pk)
        serializer = LeagueSerializer(league)
        return Response(serializer.data)


class TeamList(APIView):
    def get(self, request):
        queryset  = Team.objects.all()
        league_id = request.query_params.get('league')
        if league_id is not None:
            queryset = queryset.filter(league__id=league_id)
        queryset   = queryset.order_by('-wins', '-points_for')
        serializer = TeamSerializer(queryset, many=True)
        return Response(serializer.data)


class WeeklyScoreList(APIView):
    def get(self, request):
        scores     = WeeklyScore.objects.all()
        serializer = WeeklyScoreSerializer(scores, many=True)
        return Response(serializer.data)


class UltimatePlayoffEntryList(APIView):
    def get(self, request):
        entries    = UltimatePlayoffEntry.objects.all().order_by('playoff_week', '-week_score')
        serializer = UltimatePlayoffEntrySerializer(entries, many=True)
        return Response(serializer.data)


class PayoutList(APIView):
    def get(self, request):
        payouts    = Payout.objects.all()
        serializer = PayoutSerializer(payouts, many=True)
        return Response(serializer.data)


# ── Widgets ────────────────────────────────────────────────────────────────────

class WeeklyWinner(APIView):
    def get(self, request):
        try:
            state_response = requests.get("https://api.sleeper.app/v1/state/nfl")
            state_response.raise_for_status()
            state_data = state_response.json()

            current_week = state_data.get('week', 0)
            if current_week == 0:
                current_week = state_data.get('display_week', 0)
            target_week = current_week - 1

            if target_week < 1:
                return Response({"message": "Regular season has not started yet."}, status=404)

            all_leagues  = League.objects.all()
            winners_list = []

            for league in all_leagues:
                try:
                    top_score_entry = WeeklyScore.objects.filter(
                        team__league=league, week=target_week
                    ).order_by('-points_scored').first()

                    if top_score_entry:
                        owner_name = "Unclaimed Team"
                        if top_score_entry.team.owner:
                            owner_name = top_score_entry.team.owner.full_name
                        winners_list.append({
                            'week':        target_week,
                            'team_name':   top_score_entry.team.team_name,
                            'owner_name':  owner_name,
                            'score':       top_score_entry.points_scored,
                            'league_name': league.name,
                        })
                except WeeklyScore.DoesNotExist:
                    continue

            return Response(winners_list)
        except Exception as e:
            return Response({"message": str(e)}, status=500)


class PowerRankings(APIView):
    def get(self, request):
        top_teams = Team.objects.all().order_by('-points_for')[:5]
        data = []
        for team in top_teams:
            owner_name = team.owner.full_name if team.owner else "Unclaimed Team"
            data.append({
                'team_name':   team.team_name,
                'owner_name':  owner_name,
                'points_for':  team.points_for,
                'league_name': team.league.name,
                'record':      f"{team.wins}-{team.losses}-{team.ties}",
            })
        return Response(data)


class CommonPlayersWidget(APIView):
    def get(self, request):
        common_players = CommonPlayer.objects.all().order_by('rank')
        serializer     = CommonPlayerSerializer(common_players, many=True)
        return Response(serializer.data)


# ── Admin command endpoints ────────────────────────────────────────────────────

class RunSyncSleeper(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            call_command('sync_sleeper')
            return Response({"status": "success", "message": "Sleeper sync command started."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


class RunStartPlayoff(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            call_command('start_big_playoff')
            return Response({"status": "success", "message": "BIG Playoff started successfully."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


class RunPlayoffElimination(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        week = request.data.get('week')
        if not week:
            return Response({"status": "error", "message": "Week number is required."}, status=400)
        try:
            call_command('run_playoff_elimination', week=week)
            return Response({"status": "success", "message": f"Playoff elimination for week {week} complete."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


class RunPostWinners(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        week = request.data.get('week')
        if not week:
            return Response({"status": "error", "message": "Week number is required."}, status=400)
        try:
            call_command('post_weekly_winners', week=week)
            return Response({"status": "success", "message": f"Weekly winners for week {week} posted to Discord."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


# ── Admin data editing ─────────────────────────────────────────────────────────

class UpdateMemberVenmo(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            profile = get_object_or_404(MemberProfile, pk=pk)
            profile.payment_info = request.data.get('venmo_info')
            profile.save()
            return Response({"status": "success", "message": "Venmo info updated."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


class AllMembersList(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        profiles   = MemberProfile.objects.all().order_by('last_name', 'first_name')
        serializer = MemberProfileAdminSerializer(profiles, many=True)
        return Response(serializer.data)


class ToggleDues(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            profile = get_object_or_404(MemberProfile, pk=pk)
            profile.has_paid_dues = not profile.has_paid_dues
            profile.save()
            return Response({
                "status": "success",
                "message": "Dues status updated.",
                "has_paid_dues": profile.has_paid_dues,
            })
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


class TogglePlayoffFlag(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            team = get_object_or_404(Team, pk=pk)
            team.made_league_playoffs = not team.made_league_playoffs
            team.save()
            return Response({
                "status": "success",
                "message": "Playoff flag updated.",
                "made_league_playoffs": team.made_league_playoffs,
            })
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


# ── Season endpoints (public) ──────────────────────────────────────────────────

class SeasonPreviewView(APIView):
    """Public — returns pre-season hype data for a given year."""
    permission_classes = []

    def get(self, request, year):
        season = get_object_or_404(Season, year=year)
        member_count = MemberProfile.objects.count()
        leagues = list(season.planned_leagues.values('name').order_by('order', 'id'))
        return Response({
            'season':          SeasonSerializer(season).data,
            'member_count':    member_count,
            'planned_leagues': leagues,
        })


class SeasonListView(APIView):
    """Public — returns all seasons for the year picker."""

    def get(self, request):
        seasons    = Season.objects.all().order_by('-year')
        serializer = SeasonSerializer(seasons, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin only.'}, status=403)
        serializer = SeasonSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class SeasonDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, year):
        season = get_object_or_404(Season, year=year)

        if 'is_active' in request.data and request.data['is_active']:
            Season.objects.exclude(pk=season.pk).update(is_active=False)

        serializer = SeasonSerializer(season, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ── Organizer endpoints (admin) ────────────────────────────────────────────────

class OrganizerView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, year):
        season = get_object_or_404(Season, year=year)

        members = MemberProfile.objects.all().order_by('last_name', 'first_name').prefetch_related(
            'league_assignments', 'season_dues'
        )
        member_serializer = OrganizerMemberSerializer(members, many=True, context={'season': season})

        planned_leagues = season.planned_leagues.order_by('order', 'id')
        league_serializer = PlannedLeagueSerializer(planned_leagues, many=True)

        return Response({
            'season':          SeasonSerializer(season).data,
            'members':         member_serializer.data,
            'planned_leagues': league_serializer.data,
        })


class PlannedLeagueCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, year):
        season = get_object_or_404(Season, year=year)
        data   = {**request.data, 'season': season.pk}
        serializer = PlannedLeagueSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class PlannedLeagueDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        league = get_object_or_404(PlannedLeague, pk=pk)
        serializer = PlannedLeagueSerializer(league, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        league = get_object_or_404(PlannedLeague, pk=pk)
        league.delete()
        return Response(status=204)


class AssignMemberView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        """Assign a member to this planned league. Drops any prior assignment for this season."""
        league    = get_object_or_404(PlannedLeague, pk=pk)
        member_id = request.data.get('member_id')
        if not member_id:
            return Response({'error': 'member_id is required.'}, status=400)

        member = get_object_or_404(MemberProfile, pk=member_id)

        # Remove existing assignment for this member in this season
        LeagueAssignment.objects.filter(member=member, season=league.season).delete()

        LeagueAssignment.objects.create(member=member, planned_league=league, season=league.season)
        return Response({'status': 'assigned'}, status=201)

    def delete(self, request, pk, member_id):
        """Unassign a member from this planned league."""
        league = get_object_or_404(PlannedLeague, pk=pk)
        LeagueAssignment.objects.filter(
            member_id=member_id, planned_league=league, season=league.season
        ).delete()
        return Response(status=204)


class SeasonDuesToggleView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, year, member_id):
        season = get_object_or_404(Season, year=year)
        member = get_object_or_404(MemberProfile, pk=member_id)
        dues, _ = SeasonDues.objects.get_or_create(member=member, season=season)
        dues.paid    = not dues.paid
        dues.paid_at = timezone.now() if dues.paid else None
        dues.save()
        return Response({'paid': dues.paid})


# ── Utility endpoints ──────────────────────────────────────────────────────────

class NflStateView(APIView):
    """Public proxy to Sleeper's NFL state — returns current week/season."""
    permission_classes = []

    def get(self, request):
        try:
            r = requests.get('https://api.sleeper.app/v1/state/nfl', timeout=5)
            r.raise_for_status()
            return Response(r.json())
        except Exception as e:
            return Response({'error': str(e)}, status=503)


class PlayoffStatusView(APIView):
    """Returns BIG Playoff bracket status from the DB."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Max

        all_entries = UltimatePlayoffEntry.objects.all()
        if not all_entries.exists():
            return Response({
                'initialized': False,
                'current_week': None,
                'teams_remaining': 0,
                'total_teams': 0,
                'is_complete': False,
            })

        latest_season = all_entries.aggregate(Max('season'))['season__max']
        season_entries = all_entries.filter(season=latest_season)

        active = season_entries.filter(is_eliminated=False)
        if active.exists():
            current_week = active.aggregate(Max('playoff_week'))['playoff_week__max']
            teams_remaining = active.filter(playoff_week=current_week).count()
            is_complete = teams_remaining <= 1
        else:
            current_week = season_entries.aggregate(Max('playoff_week'))['playoff_week__max']
            teams_remaining = 0
            is_complete = True

        total_teams = season_entries.filter(playoff_week=15).count()

        return Response({
            'initialized': True,
            'current_week': current_week,
            'teams_remaining': teams_remaining,
            'total_teams': total_teams,
            'is_complete': is_complete,
        })
