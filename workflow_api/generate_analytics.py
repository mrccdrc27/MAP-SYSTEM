"""
Standalone analytics report generator script.
Calls analytics views directly and generates JSON output file.

Usage:
    python generate_analytics.py                    # Default output: analytics_report.json
    python generate_analytics.py --output custom.json
    python generate_analytics.py --pretty           # Pretty-printed JSON
    python generate_analytics.py --include dashboard status_summary  # Specific endpoints
"""

import os
import sys
import django
import json
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'workflow_api.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from django.http import QueryDict

from reporting.views import (
    AnalyticsRootView,
    DashboardSummaryView,
    StatusSummaryView,
    SLAComplianceView,
    TeamPerformanceView,
    WorkflowMetricsView,
    StepPerformanceView,
    DepartmentAnalyticsView,
    PriorityDistributionView,
    TicketAgeAnalyticsView,
    AssignmentAnalyticsView,
    AuditActivityView,
)


def create_mock_request(query_params=None):
    """Create a mock request object for view invocation"""
    factory = RequestFactory()
    request = factory.get('/')
    
    if query_params:
        request.GET = QueryDict(query_params)
    else:
        request.GET = QueryDict()
    
    request.user = AnonymousUser()
    return request


def call_view(view_class, query_params=None):
    """Call a view and return JSON response"""
    try:
        request = create_mock_request(query_params)
        view = view_class.as_view()
        # Bypass authentication by removing permission requirements
        view.cls.authentication_classes = []
        view.cls.permission_classes = []
        response = view(request)
        
        if hasattr(response, 'data'):
            return response.data
        elif hasattr(response, 'content'):
            return json.loads(response.content.decode())
        else:
            return response
    except Exception as e:
        return {'error': str(e), 'type': type(e).__name__}


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Generate analytics reports and save to JSON file'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='analytics_report.json',
        help='Output file path (default: analytics_report.json)',
    )
    parser.add_argument(
        '--include',
        type=str,
        nargs='+',
        help='Specific endpoints to include',
    )
    parser.add_argument(
        '--pretty',
        action='store_true',
        default=True,
        help='Pretty-print JSON output (default: True)',
    )
    
    args = parser.parse_args()

    # Define all endpoints
    endpoints = {
        'analytics_root': {
            'view': AnalyticsRootView,
            'params': None,
            'description': 'Analytics API root with all available endpoints',
        },
        'dashboard': {
            'view': DashboardSummaryView,
            'params': None,
            'description': 'Dashboard summary with overall system metrics',
        },
        'status_summary': {
            'view': StatusSummaryView,
            'params': None,
            'description': 'Task status distribution',
        },
        'sla_compliance': {
            'view': SLAComplianceView,
            'params': None,
            'description': 'SLA compliance metrics by priority',
        },
        'team_performance': {
            'view': TeamPerformanceView,
            'params': None,
            'description': 'Team/User performance metrics',
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
            'view': PriorityDistributionView,
            'params': None,
            'description': 'Priority distribution and metrics',
        },
        'ticket_age': {
            'view': TicketAgeAnalyticsView,
            'params': None,
            'description': 'Analyze ticket age/aging tickets',
        },
        'assignment_analytics': {
            'view': AssignmentAnalyticsView,
            'params': None,
            'description': 'Task assignment analytics by role',
        },
        'audit_activity': {
            'view': AuditActivityView,
            'params': {'days': '30'},
            'description': 'User and system audit activity (last 30 days)',
        },
    }

    # Filter endpoints if specified
    if args.include:
        endpoints = {k: v for k, v in endpoints.items() if k in args.include}

    # Generate report
    report = {
        'generated_at': datetime.now().isoformat(),
        'total_endpoints': len(endpoints),
        'endpoints': {},
    }

    print(f'Generating analytics report...')
    print(f'Total endpoints: {len(endpoints)}')

    for endpoint_name, endpoint_config in endpoints.items():
        print(f'  Processing: {endpoint_name}...', end='', flush=True)
        
        view_class = endpoint_config['view']
        query_params = endpoint_config['params']
        
        response_data = call_view(view_class, query_params)
        
        report['endpoints'][endpoint_name] = {
            'description': endpoint_config['description'],
            'data': response_data,
        }
        
        print(' ✓')

    # Write to file
    indent = 2 if args.pretty else None
    with open(args.output, 'w') as f:
        json.dump(report, f, indent=indent, default=str)

    # Success message
    file_size = os.path.getsize(args.output)
    print(f'\n✓ Report generated successfully!')
    print(f'  File: {args.output}')
    print(f'  Size: {file_size:,} bytes')


if __name__ == '__main__':
    main()
