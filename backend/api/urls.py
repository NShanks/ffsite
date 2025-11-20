from django.urls import path
from . import views

urlpatterns = [
    path('members/', views.MemberProfileList.as_view(), name='member-list'),
    path('leagues/', views.LeagueList.as_view(), name='league-list'),
    path('leagues/<int:pk>/', views.LeagueDetail.as_view(), name='league-detail'),
    path('teams/', views.TeamList.as_view(), name='team-list'),
    path('scores/', views.WeeklyScoreList.as_view(), name='score-list'),
    path('playoff-entries/', views.UltimatePlayoffEntryList.as_view(), name='playoff-entry-list'),
    path('payouts/', views.PayoutList.as_view(), name='payout-list'),

    # --- Widgets ---
    path('widget/weekly-winner/', views.WeeklyWinner.as_view(), name='widget-weekly-winner'),
    path('widget/power-rankings/', views.PowerRankings.as_view(), name='widget-power-rankings'),
    path('widget/common-players/', views.CommonPlayersWidget.as_view(), name='widget-common-players'),
    
    # --- ADMIN COMMANDS ---
    path('admin/run-sync/', views.RunSyncSleeper.as_view(), name='admin-run-sync'),
    path('admin/start-playoff/', views.RunStartPlayoff.as_view(), name='admin-start-playoff'),
    path('admin/run-elimination/', views.RunPlayoffElimination.as_view(), name='admin-run-elimination'),
    path('admin/post-winners/', views.RunPostWinners.as_view(), name='admin-post-winners'),

    # --- ADMIN DATA EDITING ---
    # This URL will be like /api/member-profile/5/update-venmo/
    path('member-profile/<int:pk>/update-venmo/', views.UpdateMemberVenmo.as_view(), name='admin-update-venmo'),
    path('admin/all-members/', views.AllMembersList.as_view(), name='admin-all-members'),
    path('member-profile/<int:pk>/toggle-dues/', views.ToggleDues.as_view(), name='admin-toggle-dues'),
    path('team/<int:pk>/toggle-playoff-flag/', views.TogglePlayoffFlag.as_view(), name='admin-toggle-playoff-flag'),
]