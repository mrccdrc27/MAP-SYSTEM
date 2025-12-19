from django.db import migrations


def forwards(apps, schema_editor):
    Ticket = apps.get_model('core', 'Ticket')
    Ticket.objects.filter(status='On Process').update(status='In Progress')


def backwards(apps, schema_editor):
    Ticket = apps.get_model('core', 'Ticket')
    Ticket.objects.filter(status='In Progress').update(status='On Process')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_alter_ticket_status'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
