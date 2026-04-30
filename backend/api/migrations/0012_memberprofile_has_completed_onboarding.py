from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_season_organizer_profile_v2'),
    ]

    operations = [
        migrations.AddField(
            model_name='memberprofile',
            name='has_completed_onboarding',
            field=models.BooleanField(default=True),
        ),
    ]
