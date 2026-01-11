# Generated migration to add end_logic field back

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workflow', '0002_remove_workflows_end_logic'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflows',
            name='end_logic',
            field=models.CharField(
                choices=[('none', 'None'), ('ams', 'AMS'), ('bms', 'BMS')],
                default='none',
                help_text="External system that handles final resolution. 'none' for normal workflow completion.",
                max_length=16,
            ),
        ),
    ]
