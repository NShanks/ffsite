from django.contrib import admin
from .models import (
    MemberProfile, 
    League, 
    Team, 
    WeeklyScore, 
    UltimatePlayoffEntry, 
    Payout
)

# Register your models here.
admin.site.register(MemberProfile)
admin.site.register(League)
admin.site.register(Team)
admin.site.register(WeeklyScore)
admin.site.register(UltimatePlayoffEntry)
admin.site.register(Payout)