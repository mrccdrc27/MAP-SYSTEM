# Generated migration for date_completed field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_ticket_csat_rating_ticket_feedback'),
    ]

    operations = [
        migrations.AddField(
            model_name='ticket',
            name='date_completed',
            field=models.DateTimeField(blank=True, help_text='Date when ticket was completed (Closed status)', null=True),
        ),
    ]
