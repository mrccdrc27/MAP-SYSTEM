# Generated manually for BMS submission tracking

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0009_rename_task_id_to_task_item_id_in_failed_notification'),
    ]

    operations = [
        migrations.CreateModel(
            name='FailedBMSSubmission',
            fields=[
                ('failed_bms_id', models.AutoField(primary_key=True, serialize=False)),
                ('ticket_number', models.CharField(help_text='Ticket number for reference', max_length=50)),
                ('submission_payload', models.JSONField(help_text='The transformed BMS API payload')),
                ('original_ticket_data', models.JSONField(help_text='Original ticket data for debugging')),
                ('status', models.CharField(choices=[('pending', 'Pending Retry'), ('retrying', 'Retrying'), ('failed', 'Failed Permanently'), ('success', 'Success')], default='pending', help_text='Current status of this submission', max_length=20)),
                ('error_type', models.CharField(choices=[('validation', 'Validation Error'), ('service_unavailable', 'Service Unavailable'), ('timeout', 'Request Timeout'), ('unknown', 'Unknown Error')], default='unknown', help_text='Type of error encountered', max_length=30)),
                ('error_message', models.TextField(blank=True, help_text='Error details from failed attempt')),
                ('error_response', models.JSONField(blank=True, help_text='Full error response from BMS API', null=True)),
                ('retry_count', models.IntegerField(default=0, help_text='Number of retry attempts')),
                ('max_retries', models.IntegerField(default=5, help_text='Maximum retry attempts')),
                ('next_retry_at', models.DateTimeField(blank=True, help_text='Scheduled time for next retry', null=True)),
                ('used_fallback_fiscal_year', models.BooleanField(default=False, help_text='Whether fallback fiscal year was used')),
                ('used_fallback_accounts', models.BooleanField(default=False, help_text='Whether fallback accounts were used')),
                ('original_fiscal_year', models.IntegerField(blank=True, help_text='Original fiscal year before fallback', null=True)),
                ('original_accounts', models.JSONField(blank=True, help_text='Original account IDs before fallback', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='When submission first failed')),
                ('last_retry_at', models.DateTimeField(blank=True, help_text='Last retry attempt', null=True)),
                ('succeeded_at', models.DateTimeField(blank=True, help_text='When submission finally succeeded', null=True)),
                ('bms_response', models.JSONField(blank=True, help_text='Successful BMS API response', null=True)),
                ('bms_proposal_id', models.CharField(blank=True, help_text='BMS proposal ID if created', max_length=100)),
                ('task', models.ForeignKey(help_text='The task associated with this BMS submission', on_delete=django.db.models.deletion.CASCADE, related_name='failed_bms_submissions', to='task.task')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='failedbmssubmission',
            index=models.Index(fields=['status', 'next_retry_at'], name='task_failed_status_7b0e45_idx'),
        ),
        migrations.AddIndex(
            model_name='failedbmssubmission',
            index=models.Index(fields=['ticket_number'], name='task_failed_ticket__af3b1b_idx'),
        ),
        migrations.AddIndex(
            model_name='failedbmssubmission',
            index=models.Index(fields=['error_type', 'status'], name='task_failed_error_t_ba5c15_idx'),
        ),
    ]
