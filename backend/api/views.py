from rest_framework.views import APIView
from rest_framework.response import Response
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
        teams = Team.objects.all()
        serializer = TeamSerializer(teams, many=True)
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