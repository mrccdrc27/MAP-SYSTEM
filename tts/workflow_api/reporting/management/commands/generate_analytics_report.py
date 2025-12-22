"""
Management command to generate analytics reports without API calls.
Directly invokes view logic and outputs results to a JSON file.
"""

import json
import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from django.http import QueryDict

from reporting.views import (
    TicketDashboardView,
    TicketStatusSummaryView,
    TicketSLAComplianceView,
    UserPerformanceView,
    WorkflowMetricsView,
    StepPerformanceView,
    DepartmentAnalyticsView,
    TicketPriorityDistributionView,
    TicketAgeDistributionView,
    TaskItemStatusDistributionView,
    TaskItemOriginDistributionView,
    TaskItemPerformanceView,
    TransferAnalyticsView,
)

class Command(BaseCommand):
    help = 'Generate analytics reports and save to JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='analytics_report.json',
            help='Output file path for analytics report (default: analytics_report.json)',
        )
        parser.add_argument(
            '--include',
            type=str,
            nargs='+',
            help='Specific endpoints to include (e.g., dashboard status-summary). If omitted, all endpoints are included.',
        )
        parser.add_argument(
            '--pretty',
            action='store_true',
            default=True,
            help='Pretty-print JSON output (default: True)',
        )

    def _create_mock_request(self, query_params=None):
        """Create a mock request object for view invocation"""
        factory = RequestFactory()
        request = factory.get('/')
        
        # Add query parameters if provided
        if query_params:
            request.GET = QueryDict(query_params)
        else:
            request.GET = QueryDict()
        
        # Add user (anonymous for non-API calls)
        request.user = AnonymousUser()
        
        return request

    def _call_view(self, view_class, query_params=None):
        """Call a view and return JSON response"""
        try:
            request = self._create_mock_request(query_params)
            view = view_class.as_view()
            # Bypass authentication by removing permission requirements
            view.cls.authentication_classes = []
            view.cls.permission_classes = []
            response = view(request)
            
            # Handle different response types
            if hasattr(response, 'data'):
                return response.data
            elif hasattr(response, 'content'):
                return json.loads(response.content.decode())
            else:
                return response
        except Exception as e:
            return {'error': str(e), 'type': type(e).__name__}

    def handle(self, *args, **options):
        output_file = options['output']
        include_endpoints = options.get('include') or None
        pretty_print = options.get('pretty', False)

        # Define all endpoints
        endpoints = {
            'dashboard': {
                'view': TicketDashboardView,
                'params': None,
                'description': 'Dashboard summary with overall system metrics',
            },
            'status_summary': {
                'view': TicketStatusSummaryView,
                'params': None,
                'description': 'Ticket status distribution',
            },
            'sla_compliance': {
                'view': TicketSLAComplianceView,
                'params': None,
                'description': 'SLA compliance metrics by priority',
            },
            'user_performance': {
                'view': UserPerformanceView,
                'params': None,
                'description': 'User performance metrics',
            },
            'workflow_metrics': {
                'view': WorkflowMetricsView,
                'params': None,
                'description': 'Workflow performance metrics',
            },
            'step_performance': {
                'view': StepPerformanceView,
                'params': None,
                'description': 'Step-level performance metrics',
            },
            'department_analytics': {
                'view': DepartmentAnalyticsView,
                'params': None,
                'description': 'Department-level analytics',
            },
            'priority_distribution': {
                'view': TicketPriorityDistributionView,
                'params': None,
                'description': 'Priority distribution and metrics',
            },
            'ticket_age': {
                'view': TicketAgeDistributionView,
                'params': None,
                'description': 'Analyze ticket age/aging tickets',
            },
            'task_item_status': {
                'view': TaskItemStatusDistributionView,
                'params': None,
                'description': 'Task item status distribution and breakdown',
            },
            'task_item_origin': {
                'view': TaskItemOriginDistributionView,
                'params': None,
                'description': 'Task item assignment origin analytics',
            },
            'task_item_performance': {
                'view': TaskItemPerformanceView,
                'params': None,
                'description': 'Task item performance metrics',
            },
            'transfer_analytics': {
                'view': TransferAnalyticsView,
                'params': None,
                'description': 'Task item transfer and escalation analytics',
            },
        }

        # Filter endpoints if specified
        if include_endpoints:
            endpoints = {k: v for k, v in endpoints.items() if k in include_endpoints}

        # Generate report
        report = {
            'generated_at': datetime.now().isoformat(),
            'total_endpoints': len(endpoints),
            'endpoints': {},
        }

        self.stdout.write(self.style.SUCCESS(f'Generating analytics report...'))
        self.stdout.write(f'Total endpoints: {len(endpoints)}')

        for endpoint_name, endpoint_config in endpoints.items():
            self.stdout.write(f'  Processing: {endpoint_name}...', ending='')
            
            view_class = endpoint_config['view']
            query_params = endpoint_config['params']
            
            response_data = self._call_view(view_class, query_params)
            
            report['endpoints'][endpoint_name] = {
                'description': endpoint_config['description'],
                'data': response_data,
            }
            
            self.stdout.write(self.style.SUCCESS(' ✓'))

        # Write to file
        indent = 2 if pretty_print else None
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=indent, default=str)

        # Success message
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✓ Report generated successfully!'
                    f'\n  File: {output_file}'
                    f'\n  Size: {file_size:,} bytes'
                )
            )
        else:
            self.stdout.write(self.style.ERROR(f'\n✗ Failed to create report file: {output_file}'))