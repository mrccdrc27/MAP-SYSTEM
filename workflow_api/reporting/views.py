from django.db.models import Count, Q, F, Case, When, DecimalField, IntegerField, Avg, Sum, Max, DurationField
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from authentication import JWTCookieAuthentication

from task.models import Task, TaskItem, TASK_STATUS_CHOICES
from tickets.models import WorkflowTicket
from workflow.models import Workflows
from step.models import Steps
from role.models import Roles, RoleUsers
from audit.models import AuditEvent

from .serializers import (
    StatusSummarySerializer,
    SLAComplianceSerializer,
    TeamPerformanceSerializer,
    WorkflowMetricsSerializer,
    StepPerformanceSerializer,
    DepartmentAnalyticsSerializer,
    TicketAgeAnalyticsSerializer,
    DashboardSummarySerializer,
    PriorityDistributionSerializer,
    AssignmentAnalyticsSerializer,
)


class AnalyticsRootView(APIView):
    """Root view for analytics endpoints"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        """
        Analytics API Root
        
        Comprehensive analytics and reporting endpoints for the Ticket Tracking System.
        """
        return Response({
            'message': 'Welcome to Analytics API',
            'endpoints': {
                'dashboard': reverse('reporting:dashboard-summary', request=request),
                'status_summary': reverse('reporting:status-summary', request=request),
                'sla_compliance': reverse('reporting:sla-compliance', request=request),
                'team_performance': reverse('reporting:team-performance', request=request),
                'workflow_metrics': reverse('reporting:workflow-metrics', request=request),
                'step_performance': reverse('reporting:step-performance', request=request),
                'department_analytics': reverse('reporting:department-analytics', request=request),
                'priority_distribution': reverse('reporting:priority-distribution', request=request),
                'ticket_age': reverse('reporting:ticket-age', request=request),
                'assignment_analytics': reverse('reporting:assignment-analytics', request=request),
                'audit_activity': reverse('reporting:audit-activity', request=request),
            }
        }, status=status.HTTP_200_OK)





class DashboardSummaryView(APIView):
    """Dashboard summary with overall system metrics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            total_tickets = Task.objects.count()
            completed_tickets = Task.objects.filter(status='completed').count()
            pending_tickets = Task.objects.filter(status='pending').count()
            in_progress_tickets = Task.objects.filter(status='in progress').count()
            
            # SLA Compliance
            total_with_sla = Task.objects.filter(target_resolution__isnull=False).count()
            sla_met = Task.objects.filter(
                Q(status='completed'),
                Q(resolution_time__lte=F('target_resolution')) | Q(resolution_time__isnull=True),
                target_resolution__isnull=False
            ).count()
            sla_compliance_rate = (sla_met / total_with_sla * 100) if total_with_sla > 0 else 0
            
            # Average resolution time
            avg_resolution = Task.objects.filter(
                status='completed',
                resolution_time__isnull=False,
                created_at__isnull=False
            ).aggregate(
                avg_hours=Avg(
                    Case(
                        When(resolution_time__isnull=False, created_at__isnull=False,
                             then=F('resolution_time') - F('created_at')),
                        default=None,
                        output_field=DurationField(),
                    )
                )
            )
            
            avg_resolution_hours = None
            if avg_resolution['avg_hours']:
                # Convert timedelta to hours
                avg_resolution_hours = avg_resolution['avg_hours'].total_seconds() / 3600

            # Escalation rate
            escalated_count = TaskItem.objects.filter(status='escalated').count()
            total_assignments = TaskItem.objects.count()
            escalation_rate = (escalated_count / total_assignments * 100) if total_assignments > 0 else 0

            # Unique metrics
            total_users = TaskItem.objects.values('role_user__user_id').distinct().count()
            total_workflows = Workflows.objects.count()

            data = {
                'total_tickets': total_tickets,
                'completed_tickets': completed_tickets,
                'pending_tickets': pending_tickets,
                'in_progress_tickets': in_progress_tickets,
                'sla_compliance_rate': round(sla_compliance_rate, 2),
                'avg_resolution_time_hours': round(avg_resolution_hours, 2) if avg_resolution_hours else None,
                'total_users': total_users,
                'total_workflows': total_workflows,
                'escalation_rate': round(escalation_rate, 2),
            }

            serializer = DashboardSummarySerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StatusSummaryView(APIView):
    """Task status distribution"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            status_counts = Task.objects.values('status').annotate(count=Count('task_id'))
            total = sum([item['count'] for item in status_counts])

            data = [
                {
                    'status': item['status'],
                    'count': item['count'],
                    'percentage': round((item['count'] / total * 100), 2) if total > 0 else 0
                }
                for item in status_counts
            ]

            serializer = StatusSummarySerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SLAComplianceView(APIView):
    """SLA compliance metrics by priority"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get priority filter from query params
            priority_filter = request.query_params.get('priority', None)

            # Query tasks with SLA targets
            query = Task.objects.filter(target_resolution__isnull=False)

            if priority_filter:
                # Filter by priority from ticket data
                query = query.filter(ticket_id__ticket_data__priority=priority_filter)

            # Group by priority (from ticket data)
            priority_stats = query.values(priority=F('ticket_id__priority')).annotate(
                total_tasks=Count('task_id'),
                sla_met=Count(
                    Case(
                        When(resolution_time__lte=F('target_resolution'), then=1),
                        When(status__in=['pending', 'in progress'], then=1),
                        default=None
                    )
                ),
            )

            data = []
            for stat in priority_stats:
                priority = stat['priority'] or 'Unknown'
                total = stat['total_tasks']
                met = stat['sla_met']
                breached = total - met
                compliance_rate = (met / total * 100) if total > 0 else 0

                # Average resolution time
                avg_res = Task.objects.filter(
                    ticket_id__priority=priority,
                    target_resolution__isnull=False,
                    resolution_time__isnull=False
                ).aggregate(
                    avg_hours=Avg(
                        Case(
                            When(resolution_time__isnull=False, created_at__isnull=False,
                                 then=F('resolution_time') - F('created_at')),
                            default=None,
                            output_field=DurationField(),
                        )
                    )
                )

                avg_hours = None
                if avg_res['avg_hours']:
                    avg_hours = avg_res['avg_hours'].total_seconds() / 3600

                data.append({
                    'priority': priority,
                    'total_tasks': total,
                    'sla_met': met,
                    'sla_breached': breached,
                    'compliance_rate': round(compliance_rate, 2),
                    'avg_resolution_hours': round(avg_hours, 2) if avg_hours else None,
                })

            serializer = SLAComplianceSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeamPerformanceView(APIView):
    """Team/User performance metrics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            role_filter = request.query_params.get('role', None)
            
            # Get all unique users with task assignments via role_user
            unique_user_ids = list(set(TaskItem.objects.values_list('role_user__user_id', flat=True)))
            unique_user_ids = [uid for uid in unique_user_ids if uid is not None]

            data = []
            for user_id in unique_user_ids:
                # Task counts by status
                total_tasks = Task.objects.filter(
                    taskitem__role_user__user_id=user_id
                ).distinct().count()
                
                completed = Task.objects.filter(
                    taskitem__role_user__user_id=user_id,
                    status='completed'
                ).distinct().count()
                
                in_progress = Task.objects.filter(
                    taskitem__role_user__user_id=user_id,
                    status='in progress'
                ).distinct().count()

                completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0

                # Average resolution time
                avg_res = Task.objects.filter(
                    taskitem__role_user__user_id=user_id,
                    status='completed',
                    resolution_time__isnull=False,
                    created_at__isnull=False
                ).aggregate(
                    avg_hours=Avg(
                        Case(
                            When(resolution_time__isnull=False, created_at__isnull=False,
                                 then=F('resolution_time') - F('created_at')),
                            default=None,
                            output_field=DurationField(),
                        )
                    )
                )

                avg_hours = None
                if avg_res['avg_hours']:
                    avg_hours = avg_res['avg_hours'].total_seconds() / 3600

                # Escalation count
                escalations = TaskItem.objects.filter(
                    role_user__user_id=user_id,
                    status='escalated'
                ).count()

                data.append({
                    'user_id': user_id,
                    'total_tasks': total_tasks,
                    'completed_tasks': completed,
                    'in_progress_tasks': in_progress,
                    'completion_rate': round(completion_rate, 2),
                    'avg_resolution_hours': round(avg_hours, 2) if avg_hours else None,
                    'escalation_count': escalations,
                })

            # Sort by completion rate (descending)
            data.sort(key=lambda x: x['completion_rate'], reverse=True)

            serializer = TeamPerformanceSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WorkflowMetricsView(APIView):
    """Workflow performance metrics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            department_filter = request.query_params.get('department', None)
            workflow_id_filter = request.query_params.get('workflow_id', None)

            workflows = Workflows.objects.all()

            if department_filter:
                workflows = workflows.filter(department=department_filter)

            if workflow_id_filter:
                workflows = workflows.filter(workflow_id=workflow_id_filter)

            data = []
            for workflow in workflows:
                tasks = Task.objects.filter(workflow_id=workflow.workflow_id)
                
                total = tasks.count()
                completed = tasks.filter(status='completed').count()
                pending = tasks.filter(status='pending').count()
                in_progress = tasks.filter(status='in progress').count()

                completion_rate = (completed / total * 100) if total > 0 else 0

                # Average completion time
                avg_comp = tasks.filter(
                    status='completed',
                    resolution_time__isnull=False,
                    created_at__isnull=False
                ).aggregate(
                    avg_hours=Avg(
                        Case(
                            When(resolution_time__isnull=False, created_at__isnull=False,
                                 then=F('resolution_time') - F('created_at')),
                            default=None,
                            output_field=DurationField(),
                        )
                    )
                )

                avg_hours = None
                if avg_comp['avg_hours']:
                    avg_hours = avg_comp['avg_hours'].total_seconds() / 3600

                data.append({
                    'workflow_id': workflow.workflow_id,
                    'workflow_name': workflow.name,
                    'total_tasks': total,
                    'completed_tasks': completed,
                    'pending_tasks': pending,
                    'in_progress_tasks': in_progress,
                    'completion_rate': round(completion_rate, 2),
                    'avg_completion_hours': round(avg_hours, 2) if avg_hours else None,
                    'department': workflow.department,
                    'category': workflow.category,
                })

            # Sort by completion rate (descending)
            data.sort(key=lambda x: x['completion_rate'], reverse=True)

            serializer = WorkflowMetricsSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StepPerformanceView(APIView):
    """Step-level performance metrics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            workflow_id_filter = request.query_params.get('workflow_id', None)

            steps = Steps.objects.all()

            if workflow_id_filter:
                steps = steps.filter(workflow_id=workflow_id_filter)

            data = []
            for step in steps:
                tasks_at_step = Task.objects.filter(current_step=step.step_id)
                
                total = tasks_at_step.count()
                completed = tasks_at_step.filter(status='completed').count()
                escalated = TaskItem.objects.filter(
                    task__current_step=step.step_id,
                    status='escalated'
                ).count()

                # Average time at step
                avg_time = tasks_at_step.filter(
                    resolution_time__isnull=False,
                    created_at__isnull=False
                ).aggregate(
                    avg_hours=Avg(
                        Case(
                            When(resolution_time__isnull=False, created_at__isnull=False,
                                 then=F('resolution_time') - F('created_at')),
                            default=None,
                            output_field=DurationField(),
                        )
                    )
                )

                avg_hours = None
                if avg_time['avg_hours']:
                    avg_hours = avg_time['avg_hours'].total_seconds() / 3600

                # Get role name
                role_name = step.role_id.name if step.role_id else 'Unknown'

                data.append({
                    'step_id': step.step_id,
                    'step_name': step.name,
                    'workflow_id': step.workflow_id.workflow_id,
                    'total_tasks': total,
                    'completed_tasks': completed,
                    'escalated_tasks': escalated,
                    'avg_time_hours': round(avg_hours, 2) if avg_hours else None,
                    'role_name': role_name,
                })

            serializer = StepPerformanceSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DepartmentAnalyticsView(APIView):
    """Department-level analytics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get all departments from workflows
            departments = Task.objects.values(
                dept=F('workflow_id__department')
            ).distinct()

            data = []
            for dept_obj in departments:
                dept = dept_obj['dept']
                if not dept:
                    continue

                tasks = Task.objects.filter(workflow_id__department=dept)
                
                total = tasks.count()
                completed = tasks.filter(status='completed').count()
                completion_rate = (completed / total * 100) if total > 0 else 0

                # Average resolution time
                avg_res = tasks.filter(
                    status='completed',
                    resolution_time__isnull=False,
                    created_at__isnull=False
                ).aggregate(
                    avg_hours=Avg(
                        Case(
                            When(resolution_time__isnull=False, created_at__isnull=False,
                                 then=F('resolution_time') - F('created_at')),
                            default=None,
                            output_field=DurationField(),
                        )
                    )
                )

                avg_hours = None
                if avg_res['avg_hours']:
                    avg_hours = avg_res['avg_hours'].total_seconds() / 3600

                data.append({
                    'department': dept,
                    'total_tickets': total,
                    'completed_tickets': completed,
                    'completion_rate': round(completion_rate, 2),
                    'avg_resolution_hours': round(avg_hours, 2) if avg_hours else None,
                })

            serializer = DepartmentAnalyticsSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PriorityDistributionView(APIView):
    """Priority distribution and metrics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            priority_data = Task.objects.values(
                priority=F('ticket_id__priority')
            ).annotate(count=Count('task_id'))

            total = sum([item['count'] for item in priority_data])

            data = []
            for item in priority_data:
                priority = item['priority'] or 'Unknown'
                count = item['count']

                # Average resolution for this priority
                avg_res = Task.objects.filter(
                    ticket_id__priority=priority,
                    status='completed',
                    resolution_time__isnull=False,
                    created_at__isnull=False
                ).aggregate(
                    avg_hours=Avg(
                        Case(
                            When(resolution_time__isnull=False, created_at__isnull=False,
                                 then=F('resolution_time') - F('created_at')),
                            default=None,
                            output_field=DurationField(),
                        )
                    )
                )

                avg_hours = None
                if avg_res['avg_hours']:
                    avg_hours = avg_res['avg_hours'].total_seconds() / 3600

                data.append({
                    'priority': priority,
                    'count': count,
                    'percentage': round((count / total * 100), 2) if total > 0 else 0,
                    'avg_resolution_hours': round(avg_hours, 2) if avg_hours else None,
                })

            serializer = PriorityDistributionSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TicketAgeAnalyticsView(APIView):
    """Analyze ticket age/aging tickets"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            now = timezone.now()
            
            # Define age buckets
            one_day_ago = now - timedelta(days=1)
            seven_days_ago = now - timedelta(days=7)
            thirty_days_ago = now - timedelta(days=30)
            ninety_days_ago = now - timedelta(days=90)

            buckets = [
                {
                    'name': '0-1 days',
                    'condition': Q(created_at__gte=one_day_ago),
                },
                {
                    'name': '1-7 days',
                    'condition': Q(created_at__gte=seven_days_ago, created_at__lt=one_day_ago),
                },
                {
                    'name': '7-30 days',
                    'condition': Q(created_at__gte=thirty_days_ago, created_at__lt=seven_days_ago),
                },
                {
                    'name': '30-90 days',
                    'condition': Q(created_at__gte=ninety_days_ago, created_at__lt=thirty_days_ago),
                },
                {
                    'name': '90+ days',
                    'condition': Q(created_at__lt=ninety_days_ago),
                },
            ]

            total_tasks = Task.objects.count()
            data = []

            for bucket in buckets:
                count = Task.objects.filter(bucket['condition']).count()
                percentage = (count / total_tasks * 100) if total_tasks > 0 else 0

                data.append({
                    'age_bucket': bucket['name'],
                    'count': count,
                    'percentage': round(percentage, 2),
                })

            serializer = TicketAgeAnalyticsSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AssignmentAnalyticsView(APIView):
    """Task assignment analytics by role"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get all unique roles with assignments
            unique_role_ids = list(set(TaskItem.objects.values_list('role_user__role_id', flat=True)))
            unique_role_ids = [rid for rid in unique_role_ids if rid is not None]

            data = []
            for role_id in unique_role_ids:
                try:
                    role = Roles.objects.get(role_id=role_id)
                    role_name = role.name
                except Roles.DoesNotExist:
                    role_name = f'Role {role_id}'

                # Get assignments for this role
                assignments = TaskItem.objects.filter(
                    role_user__role_id=role_id
                )
                
                total_assignments = assignments.count()
                reassignments = assignments.filter(status='reassigned').count()
                
                # Users in role
                users_in_role = len(set(assignments.values_list('role_user__user_id', flat=True)))
                avg_assignments_per_user = (total_assignments / users_in_role) if users_in_role > 0 else 0

                data.append({
                    'role_name': role_name,
                    'total_assignments': total_assignments,
                    'avg_assignments_per_user': round(avg_assignments_per_user, 2),
                    'total_users_in_role': users_in_role,
                    'reassignment_count': reassignments,
                })

            serializer = AssignmentAnalyticsSerializer(data, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuditActivityView(APIView):
    """User and system audit activity"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
            cutoff_date = timezone.now() - timedelta(days=days)

            # Activity by user
            user_activity = AuditEvent.objects.filter(
                timestamp__gte=cutoff_date
            ).values('user_id', 'username').annotate(
                action_count=Count('id'),
                last_action=Max('timestamp')
            ).order_by('-action_count')

            # Activity by action type
            action_activity = AuditEvent.objects.filter(
                timestamp__gte=cutoff_date
            ).values('action').annotate(
                count=Count('id')
            ).order_by('-count')

            return Response({
                'time_period_days': days,
                'total_events': AuditEvent.objects.filter(timestamp__gte=cutoff_date).count(),
                'user_activity': list(user_activity[:20]),  # Top 20 users
                'action_activity': list(action_activity),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
