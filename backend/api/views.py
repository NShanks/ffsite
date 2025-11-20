from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    MemberProfile, 
    League, 
    Team, 
    WeeklyScore, 
    UltimatePlayoffEntry, 
    Payout
)
from .serializers import (
    MemberProfileSerializer,
    LeagueSerializer, 
    TeamSerializer, 
    WeeklyScoreSerializer, 
    UltimatePlayoffEntrySerializer, 
    PayoutSerializer,
    CommonPlayerSerializer
)
from rest_framework.permissions import IsAdminUser
from django.core.management import call_command
from django.http import JsonResponse
import requests
from django.db.models import Max
from django.utils import timezone
from .models import WeeklyScore, Team, League, CommonPlayer

# Create your views here.

class MemberProfileList(APIView):
    """
    View to list all member profiles in the system.
    """
    def get(self, request, format=None):
        """
        Return a list of all member profiles.
        """
        # 1. Get all profiles from the database
        profiles = MemberProfile.objects.all()
        
        # 2. Translate them using the serializer
        serializer = MemberProfileSerializer(profiles, many=True)
        
        # 3. Send them back as a JSON response
        return Response(serializer.data)
    
class LeagueList(APIView):
    def get(self, request, format=None):
        leagues = League.objects.all()
        serializer = LeagueSerializer(leagues, many=True)
        return Response(serializer.data)

class TeamList(APIView):
    def get(self, request, format=None):
        # 1. Start with all teams
        queryset = Team.objects.all()
        
        # 2. Check if a 'league' parameter is in the URL (e.g., ?league=1)
        league_id = request.query_params.get('league')
        
        # 3. If it is, filter our queryset
        if league_id is not None:
            # This is the Django magic: filter teams where the
            # 'league' (which is a ForeignKey) has an 'id' that matches.
            queryset = queryset.filter(league__id=league_id)

        # Sort by wins (descending), then points_for (descending)
        queryset = queryset.order_by('-wins', '-points_for')
            
        # 4. Serialize the (now possibly filtered) queryset
        serializer = TeamSerializer(queryset, many=True)
        return Response(serializer.data)

class WeeklyScoreList(APIView):
    def get(self, request, format=None):
        scores = WeeklyScore.objects.all()
        serializer = WeeklyScoreSerializer(scores, many=True)
        return Response(serializer.data)

class UltimatePlayoffEntryList(APIView):
    def get(self, request, format=None):
        entries = UltimatePlayoffEntry.objects.all().order_by('playoff_week', '-week_score')
        serializer = UltimatePlayoffEntrySerializer(entries, many=True)
        return Response(serializer.data)

class PayoutList(APIView):
    def get(self, request, format=None):
        payouts = Payout.objects.all()
        serializer = PayoutSerializer(payouts, many=True)
        return Response(serializer.data)
    
class LeagueDetail(APIView):
    """
    View to get details of a single league.
    """
    def get(self, request, pk, format=None):
        league = get_object_or_404(League, pk=pk)
        serializer = LeagueSerializer(league)
        return Response(serializer.data)
    
class WeeklyWinner(APIView):
    """
    Finds the single highest score from LAST completed week
    FOR EACH LEAGUE.
    """
    def get(self, request, format=None):
        try:
            # 1. Get the global NFL state
            state_response = requests.get("https://api.sleeper.app/v1/state/nfl")
            state_response.raise_for_status()
            state_data = state_response.json()

            current_week = state_data.get('week', 0)
            if current_week == 0:
                current_week = state_data.get('display_week', 0)

            target_week = current_week - 1

            if target_week < 1:
                return Response({"message": "Regular season has not started yet."}, status=404)

            # 2. This is the new logic
            #    We've REMOVED the 'self.stdout.write' line

            all_leagues = League.objects.all()
            winners_list = [] 

            # 3. Loop through every league
            for league in all_leagues:
                try:
                    # 4. Find the top score FOR THIS LEAGUE
                    top_score_entry = WeeklyScore.objects.filter(
                        team__league=league,
                        week=target_week
                    ).order_by('-points_scored').first()

                    if top_score_entry:
                        # --- THIS IS THE FIX ---
                        # 5. Add a safety check for the owner
                        owner_name = "Unclaimed Team"
                        if top_score_entry.team.owner:
                            owner_name = top_score_entry.team.owner.full_name

                        # 6. Add the winner's data to our list
                        data = {
                            'week': target_week,
                            'team_name': top_score_entry.team.team_name,
                            'owner_name': owner_name, # Use our new, safe variable
                            'score': top_score_entry.points_scored,
                            'league_name': league.name
                        }
                        winners_list.append(data)

                except WeeklyScore.DoesNotExist:
                    continue 

            # 7. Return the full list of winners
            return Response(winners_list)

        except Exception as e:
            # We'll return the error as a string
            return Response({"message": str(e)}, status=500)
        
        
class PowerRankings(APIView):
    """
    Gets the top 5 highest-scoring teams across all leagues.
    """
    def get(self, request, format=None):
        top_teams = Team.objects.all().order_by('-points_for')[:5]

        data = []
        for team in top_teams:
            # --- THIS IS THE FIX ---
            # We add a check to see if team.owner exists
            owner_name = team.owner.full_name if team.owner else "Unclaimed Team"

            data.append({
                'team_name': team.team_name,
                'owner_name': owner_name, # Use our new, safe variable
                'points_for': team.points_for,
                'league_name': team.league.name,
                'record': f"{team.wins}-{team.losses}-{team.ties}"
            })
        return Response(data)
    


# --- ADMIN-ONLY COMMAND ENDPOINTS ---

class RunSyncSleeper(APIView):
    permission_classes = [IsAdminUser] # ONLY admins can use this

    def post(self, request, format=None):
        try:
            # This runs your command!
            call_command('sync_sleeper')
            return Response({"status": "success", "message": "Sleeper sync command started."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class RunStartPlayoff(APIView):
    permission_classes = [IsAdminUser] # ONLY admins can use this

    def post(self, request, format=None):
        try:
            call_command('start_big_playoff')
            return Response({"status": "success", "message": "BIG Playoff started successfully."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class RunPlayoffElimination(APIView):
    permission_classes = [IsAdminUser] # ONLY admins can use this

    def post(self, request, format=None):
        # We'll get the week from the React app's request
        week = request.data.get('week')
        if not week:
            return Response({"status": "error", "message": "Week number is required."}, status=400)

        try:
            call_command('run_playoff_elimination', week=week)
            return Response({"status": "success", "message": f"Playoff elimination for week {week} complete."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class RunPostWinners(APIView):
    permission_classes = [IsAdminUser] # ONLY admins can use this

    def post(self, request, format=None):
        week = request.data.get('week')
        if not week:
            return Response({"status": "error", "message": "Week number is required."}, status=400)

        try:
            call_command('post_weekly_winners', week=week)
            return Response({"status": "success", "message": f"Weekly winners for week {week} posted to Discord."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


# --- ADMIN-ONLY VENMO EDITOR ENDPOINT ---
class UpdateMemberVenmo(APIView):
    permission_classes = [IsAdminUser] # ONLY admins can use this

    def post(self, request, pk, format=None):
        # 'pk' will be the MemberProfile ID
        try:
            profile = get_object_or_404(MemberProfile, pk=pk)

            # Get the new venmo string from the request
            venmo_info = request.data.get('venmo_info')

            profile.payment_info = venmo_info
            profile.save()

            return Response({"status": "success", "message": "Venmo info updated."})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

# --- ADMIN-ONLY DUES & PLAYOFF TOGGLES ---

class AllMembersList(APIView):
    """
    Securely provides a list of ALL member profiles.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, format=None):
        # Get all profiles, ordered by name
        profiles = MemberProfile.objects.all().order_by('full_name')
        # Use the 'smart' serializer we already built
        serializer = MemberProfileSerializer(profiles, many=True)
        return Response(serializer.data)

class ToggleDues(APIView):
    """
    Toggles the 'has_paid_dues' boolean for a MemberProfile.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk, format=None):
        try:
            profile = get_object_or_404(MemberProfile, pk=pk)
            # Flip the boolean value
            profile.has_paid_dues = not profile.has_paid_dues
            profile.save()
            return Response({
                "status": "success", 
                "message": "Dues status updated.",
                "has_paid_dues": profile.has_paid_dues # Send back the new value
            })
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class TogglePlayoffFlag(APIView):
    """
    Toggles the 'made_league_playoffs' boolean for a Team.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk, format=None):
        try:
            team = get_object_or_404(Team, pk=pk)
            # Flip the boolean value
            team.made_league_playoffs = not team.made_league_playoffs
            team.save()
            return Response({
                "status": "success", 
                "message": "Playoff flag updated.",
                "made_league_playoffs": team.made_league_playoffs # Send back the new value
            })
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)
        

class CommonPlayersWidget(APIView):
    """
    Returns the top 10 most common players in the playoffs.
    """
    def get(self, request, format=None):
        # Get all records (the script already limits it to top 10)
        # Sort by rank just to be safe
        common_players = CommonPlayer.objects.all().order_by('rank')
        serializer = CommonPlayerSerializer(common_players, many=True)
        return Response(serializer.data)