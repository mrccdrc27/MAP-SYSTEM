# Generated migration for CSAT rating and feedback fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_knowledgearticleversion'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='csat_rating',
            field=models.IntegerField(blank=True, help_text='Customer satisfaction rating (1-5 stars)', null=True),
        ),
        migrations.AddField(
            model_name='ticket',
            name='feedback',
            field=models.CharField(blank=True, help_text='Quick feedback from CSAT modal', max_length=255, null=True),
        ),
    ]
