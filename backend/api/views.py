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
    PayoutSerializer
)
from rest_framework.permissions import IsAdminUser
from django.core.management import call_command
from django.http import JsonResponse

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