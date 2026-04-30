from django.urls import path
from . import views

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('register/', views.RegisterView.as_view(), name='register'),
    path('me/', views.MeView.as_view(), name='me'),

    # ── Public data ───────────────────────────────────────────────────────────
    path('members/', views.MemberProfileList.as_view(), name='member-list'),
    path('leagues/', views.LeagueList.as_view(), name='league-list'),
    path('leagues/<int:pk>/', views.LeagueDetail.as_view(), name='league-detail'),
    path('teams/', views.TeamList.as_view(), name='team-list'),
    path('scores/', views.WeeklyScoreList.as_view(), name='score-list'),
    path('playoff-entries/', views.UltimatePlayoffEntryList.as_view(), name='playoff-entry-list'),
    path('payouts/', views.PayoutList.as_view(), name='payout-list'),

    # ── Widgets ───────────────────────────────────────────────────────────────
    path('widget/weekly-winner/', views.WeeklyWinner.as_view(), name='widget-weekly-winner'),
    path('widget/power-rankings/', views.PowerRankings.as_view(), name='widget-power-rankings'),
    path('widget/common-players/', views.CommonPlayersWidget.as_view(), name='widget-common-players'),

    # ── Seasons (public list + admin create/update) ────────────────────────
    path('seasons/', views.SeasonListView.as_view(), name='season-list'),
    path('seasons/<int:year>/', views.SeasonDetailView.as_view(), name='season-detail'),
    path('seasons/<int:year>/preview/', views.SeasonPreviewView.as_view(), name='season-preview'),

    # ── Organizer (admin) ────────────────────────────────────────────────────
    path('seasons/<int:year>/organizer/', views.OrganizerView.as_view(), name='organizer'),
    path('seasons/<int:year>/planned-leagues/', views.PlannedLeagueCreateView.as_view(), name='planned-league-create'),
    path('planned-leagues/<int:pk>/', views.PlannedLeagueDetailView.as_view(), name='planned-league-detail'),
    path('planned-leagues/<int:pk>/assign/', views.AssignMemberView.as_view(), name='assign-member'),
    path('planned-leagues/<int:pk>/assign/<int:member_id>/', views.AssignMemberView.as_view(), name='unassign-member'),
    path('seasons/<int:year>/dues/<int:member_id>/', views.SeasonDuesToggleView.as_view(), name='season-dues-toggle'),

    # ── Utility ───────────────────────────────────────────────────────────────
    path('nfl-state/',      views.NflStateView.as_view(),    name='nfl-state'),
    path('playoff-status/', views.PlayoffStatusView.as_view(), name='playoff-status'),

    # ── Admin commands ────────────────────────────────────────────────────────
    path('admin/run-sync/', views.RunSyncSleeper.as_view(), name='admin-run-sync'),
    path('admin/start-playoff/', views.RunStartPlayoff.as_view(), name='admin-start-playoff'),
    path('admin/run-elimination/', views.RunPlayoffElimination.as_view(), name='admin-run-elimination'),
    path('admin/post-winners/', views.RunPostWinners.as_view(), name='admin-post-winners'),

    # ── Admin data editing ────────────────────────────────────────────────────
    path('member-profile/<int:pk>/update-venmo/', views.UpdateMemberVenmo.as_view(), name='admin-update-venmo'),
    path('admin/all-members/', views.AllMembersList.as_view(), name='admin-all-members'),
    path('member-profile/<int:pk>/toggle-dues/', views.ToggleDues.as_view(), name='admin-toggle-dues'),
    path('team/<int:pk>/toggle-playoff-flag/', views.TogglePlayoffFlag.as_view(), name='admin-toggle-playoff-flag'),
]
