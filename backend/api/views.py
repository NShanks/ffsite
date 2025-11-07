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
        entries = UltimatePlayoffEntry.objects.all()
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