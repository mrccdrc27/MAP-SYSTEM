"""
Management command to generate aggregated analytics reports without API calls.
Directly invokes aggregated view logic and outputs results to a JSON file.
"""

import json
import os
import sys
from datetime import datetime
from django.core.management.base import BaseCommand
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser

from reporting.views import (
    AggregatedTicketsReportView,
    AggregatedWorkflowsReportView,
    AggregatedTasksReportView,
)


class Command(BaseCommand):
    help = 'Generate aggregated analytics reports and save to JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='aggregated_analytics_report.json',
            help='Output file path for aggregated analytics report (default: aggregated_analytics_report.json)',
        )
        parser.add_argument(
            '--include',
            type=str,
            nargs='+',
            help='Specific reports to include (tickets, workflows, tasks). If omitted, all are included.',
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for filtering (ISO format: YYYY-MM-DD)',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for filtering (ISO format: YYYY-MM-DD)',
        )

    def handle(self, *args, **options):
        output_file = options['output']
        include_reports = options.get('include') or ['tickets', 'workflows', 'tasks']
        start_date = options.get('start_date')
        end_date = options.get('end_date')

        # Create a fake request
        factory = RequestFactory()
        
        # Build query parameters
        query_params = {}
        if start_date:
            query_params['start_date'] = start_date
        if end_date:
            query_params['end_date'] = end_date

        results = {
            'generated_at': datetime.now().isoformat(),
            'filters': {
                'start_date': start_date or 'all time',
                'end_date': end_date or 'all time',
            },
            'reports': {},
        }

        # Bypass authentication for management command
        # Save original auth/perm classes
        original_auth_tickets = AggregatedTicketsReportView.authentication_classes
        original_perm_tickets = AggregatedTicketsReportView.permission_classes
        original_auth_workflows = AggregatedWorkflowsReportView.authentication_classes
        original_perm_workflows = AggregatedWorkflowsReportView.permission_classes
        original_auth_tasks = AggregatedTasksReportView.authentication_classes
        original_perm_tasks = AggregatedTasksReportView.permission_classes
        
        try:
            # Override auth classes temporarily to bypass authentication
            AggregatedTicketsReportView.authentication_classes = []
            AggregatedTicketsReportView.permission_classes = []
            AggregatedWorkflowsReportView.authentication_classes = []
            AggregatedWorkflowsReportView.permission_classes = []
            AggregatedTasksReportView.authentication_classes = []
            AggregatedTasksReportView.permission_classes = []
            
            # Fetch Tickets Report
            if 'tickets' in include_reports:
                self.stdout.write('Fetching Tickets Report...')
                try:
                    query_string = '&'.join([f'{k}={v}' for k, v in query_params.items()])
                    request = factory.get(f'/analytics/reports/tickets/?{query_string}')
                    request.user = AnonymousUser()
                    view = AggregatedTicketsReportView.as_view()
                    response = view(request)
                    
                    if response.status_code == 200:
                        results['reports']['tickets'] = response.data
                        self.stdout.write(self.style.SUCCESS('✓ Tickets Report generated'))
                    else:
                        results['reports']['tickets'] = {
                            'error': 'Failed to generate report',
                            'status_code': response.status_code,
                            'data': response.data if hasattr(response, 'data') else str(response.content),
                        }
                        self.stdout.write(self.style.WARNING(f'⚠ Tickets Report failed with status {response.status_code}'))
                except Exception as e:
                    results['reports']['tickets'] = {
                        'error': str(e),
                        'type': type(e).__name__,
                    }
                    self.stdout.write(self.style.ERROR(f'✗ Tickets Report error: {e}'))

            # Fetch Workflows Report
            if 'workflows' in include_reports:
                self.stdout.write('Fetching Workflows Report...')
                try:
                    query_string = '&'.join([f'{k}={v}' for k, v in query_params.items()])
                    request = factory.get(f'/analytics/reports/workflows/?{query_string}')
                    request.user = AnonymousUser()
                    view = AggregatedWorkflowsReportView.as_view()
                    response = view(request)
                    
                    if response.status_code == 200:
                        results['reports']['workflows'] = response.data
                        self.stdout.write(self.style.SUCCESS('✓ Workflows Report generated'))
                    else:
                        results['reports']['workflows'] = {
                            'error': 'Failed to generate report',
                            'status_code': response.status_code,
                            'data': response.data if hasattr(response, 'data') else str(response.content),
                        }
                        self.stdout.write(self.style.WARNING(f'⚠ Workflows Report failed with status {response.status_code}'))
                except Exception as e:
                    results['reports']['workflows'] = {
                        'error': str(e),
                        'type': type(e).__name__,
                    }
                    self.stdout.write(self.style.ERROR(f'✗ Workflows Report error: {e}'))

            # Fetch Tasks Report
            if 'tasks' in include_reports:
                self.stdout.write('Fetching Tasks Report...')
                try:
                    query_string = '&'.join([f'{k}={v}' for k, v in query_params.items()])
                    request = factory.get(f'/analytics/reports/tasks/?{query_string}')
                    request.user = AnonymousUser()
                    view = AggregatedTasksReportView.as_view()
                    response = view(request)
                    
                    if response.status_code == 200:
                        results['reports']['tasks'] = response.data
                        self.stdout.write(self.style.SUCCESS('✓ Tasks Report generated'))
                    else:
                        results['reports']['tasks'] = {
                            'error': 'Failed to generate report',
                            'status_code': response.status_code,
                            'data': response.data if hasattr(response, 'data') else str(response.content),
                        }
                        self.stdout.write(self.style.WARNING(f'⚠ Tasks Report failed with status {response.status_code}'))
                except Exception as e:
                    results['reports']['tasks'] = {
                        'error': str(e),
                        'type': type(e).__name__,
                    }
                    self.stdout.write(self.style.ERROR(f'✗ Tasks Report error: {e}'))

        finally:
            # Restore original auth classes
            AggregatedTicketsReportView.authentication_classes = original_auth_tickets
            AggregatedTicketsReportView.permission_classes = original_perm_tickets
            AggregatedWorkflowsReportView.authentication_classes = original_auth_workflows
            AggregatedWorkflowsReportView.permission_classes = original_perm_workflows
            AggregatedTasksReportView.authentication_classes = original_auth_tasks
            AggregatedTasksReportView.permission_classes = original_perm_tasks

        # Write results to file
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            self.stdout.write(self.style.SUCCESS(f'\n✓ Report saved to {output_file}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Failed to write file: {e}'))
            sys.exit(1)
