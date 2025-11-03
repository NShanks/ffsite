from django.urls import path
from . import views

urlpatterns = [
    path('members/', views.MemberProfileList.as_view(), name='member-list'),
    path('leagues/', views.LeagueList.as_view(), name='league-list'),
    path('teams/', views.TeamList.as_view(), name='team-list'),
    path('scores/', views.WeeklyScoreList.as_view(), name='score-list'),
    path('playoff-entries/', views.UltimatePlayoffEntryList.as_view(), name='playoff-entry-list'),
    path('payouts/', views.PayoutList.as_view(), name='payout-list'),
]