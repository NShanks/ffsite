from django.db import migrations, models
import django.db.models.deletion


def copy_full_name_to_split_fields(apps, schema_editor):
    MemberProfile = apps.get_model('api', 'MemberProfile')
    for p in MemberProfile.objects.all():
        val = p.full_name or ''
        p.first_name = val
        p.sleeper_display_name = val
        p.save(update_fields=['first_name', 'sleeper_display_name'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_remove_sleeper_id_unique'),
    ]

    operations = [
        # ── MemberProfile field changes ──────────────────────────────────────
        migrations.AddField(
            model_name='memberprofile',
            name='first_name',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='memberprofile',
            name='last_name',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='memberprofile',
            name='phone',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='memberprofile',
            name='sleeper_display_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        # Copy existing full_name → first_name and sleeper_display_name
        migrations.RunPython(copy_full_name_to_split_fields, migrations.RunPython.noop),
        # Remove old full_name field
        migrations.RemoveField(
            model_name='memberprofile',
            name='full_name',
        ),

        # ── Season ───────────────────────────────────────────────────────────
        migrations.CreateModel(
            name='Season',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.IntegerField(unique=True)),
                ('label', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=False)),
                ('league_ids', models.JSONField(default=list)),
            ],
        ),

        # ── PlannedLeague ────────────────────────────────────────────────────
        migrations.CreateModel(
            name='PlannedLeague',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('sleeper_league_id', models.CharField(blank=True, max_length=100, null=True)),
                ('order', models.IntegerField(default=0)),
                ('season', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='planned_leagues',
                    to='api.season',
                )),
            ],
        ),

        # ── LeagueAssignment ─────────────────────────────────────────────────
        migrations.CreateModel(
            name='LeagueAssignment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('member', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='league_assignments',
                    to='api.memberprofile',
                )),
                ('planned_league', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='assignments',
                    to='api.plannedleague',
                )),
                ('season', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='api.season',
                )),
            ],
            options={
                'unique_together': {('member', 'season')},
            },
        ),

        # ── SeasonDues ───────────────────────────────────────────────────────
        migrations.CreateModel(
            name='SeasonDues',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('paid', models.BooleanField(default=False)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('member', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='season_dues',
                    to='api.memberprofile',
                )),
                ('season', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='api.season',
                )),
            ],
            options={
                'unique_together': {('member', 'season')},
            },
        ),
    ]
