# Generated manually to fix missing created_by field

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_externalemployee'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledgearticle',
            name='created_by',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_articles',
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
