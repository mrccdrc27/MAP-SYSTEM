# Generated migration to remove end_logic field

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workflow', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='workflows',
            name='end_logic',
        ),
    ]
