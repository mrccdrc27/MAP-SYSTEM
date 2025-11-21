from django.db.models import Count, Q, F, Case, When, DecimalField, IntegerField, Avg, Sum, Max, Min, DurationField, OuterRef, Subquery, Value
from django.db.models.functions import TruncDate, Coalesce
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

from task.models import Task, TaskItem, TaskItemHistory, TASK_STATUS_CHOICES
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

from task.models import TaskItemHistory


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
                'task_item_status': reverse('reporting:task-item-status', request=request),
                'task_item_assignment_origin': reverse('reporting:task-item-origin', request=request),
                'task_item_performance': reverse('reporting:task-item-performance', request=request),
                'task_item_user_performance': reverse('reporting:task-item-user-performance', request=request),
                'task_item_history_trends': reverse('reporting:task-item-history-trends', request=request),
                'task_item_transfer_analytics': reverse('reporting:task-item-transfer', request=request),
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

            # Escalation rate - get latest status from TaskItemHistory
            escalated_count = TaskItem.objects.filter(
                taskitemhistory_set__status='escalated'
            ).distinct().count()
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
                # Get user name from RoleUsers model
                from role.models import RoleUsers
                try:
                    role_user = RoleUsers.objects.filter(user_id=user_id).first()
                    user_name = role_user.user_full_name if role_user and role_user.user_full_name else f"User {user_id}"
                except Exception:
                    user_name = f"User {user_id}"
                
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

                # Escalation count - get from TaskItemHistory
                escalations = TaskItem.objects.filter(
                    role_user__user_id=user_id,
                    taskitemhistory_set__status='escalated'
                ).distinct().count()

                data.append({
                    'user_id': user_id,
                    'user_name': user_name,
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
                    taskitemhistory_set__status='escalated'
                ).distinct().count()

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
                reassignments = assignments.filter(
                    taskitemhistory_set__status='reassigned'
                ).distinct().count()
                
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


class TaskItemStatusAnalyticsView(APIView):
    """Task Item Status Distribution and Transitions"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Status distribution from TaskItemHistory
            status_data = TaskItemHistory.objects.values('status').annotate(
                count=Count('task_item_id', distinct=True),
                latest_record=Max('created_at')
            )
            
            total_items = TaskItem.objects.count()
            
            data = []
            for stat in status_data:
                item_status = stat['status']
                count = stat['count']
                data.append({
                    'status': item_status,
                    'count': count,
                    'percentage': round((count / total_items * 100), 2) if total_items > 0 else 0,
                })
            
            return Response({
                'total_task_items': total_items,
                'status_distribution': data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskItemAssignmentOriginAnalyticsView(APIView):
    """Task Item Assignment Origin Analytics (System vs Transferred vs Escalation)"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Distribution by origin
            origin_data = TaskItem.objects.values('origin').annotate(
                count=Count('task_item_id')
            )
            
            total_items = TaskItem.objects.count()
            
            data = []
            for item in origin_data:
                origin = item['origin']
                count = item['count']
                data.append({
                    'origin': origin,
                    'count': count,
                    'percentage': round((count / total_items * 100), 2) if total_items > 0 else 0,
                })
            
            return Response({
                'total_assignments': total_items,
                'origin_distribution': data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskItemPerformanceAnalyticsView(APIView):
    """Task Item Performance: Time-to-Action, Resolution Time, SLA Compliance"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Time-to-action (assigned_on to acted_on)
            time_to_action = TaskItem.objects.filter(
                acted_on__isnull=False,
                assigned_on__isnull=False
            ).aggregate(
                avg_hours=Avg(
                    Case(
                        When(acted_on__isnull=False, assigned_on__isnull=False,
                             then=F('acted_on') - F('assigned_on')),
                        default=None,
                        output_field=DurationField(),
                    )
                ),
                min_hours=Min(
                    Case(
                        When(acted_on__isnull=False, assigned_on__isnull=False,
                             then=F('acted_on') - F('assigned_on')),
                        default=None,
                        output_field=DurationField(),
                    )
                ),
                max_hours=Max(
                    Case(
                        When(acted_on__isnull=False, assigned_on__isnull=False,
                             then=F('acted_on') - F('assigned_on')),
                        default=None,
                        output_field=DurationField(),
                    )
                )
            )
            
            # Resolution time (assigned_on to resolution_time)
            resolution_time = TaskItem.objects.filter(
                resolution_time__isnull=False,
                assigned_on__isnull=False
            ).aggregate(
                avg_hours=Avg(
                    Case(
                        When(resolution_time__isnull=False, assigned_on__isnull=False,
                             then=F('resolution_time') - F('assigned_on')),
                        default=None,
                        output_field=DurationField(),
                    )
                ),
                min_hours=Min(
                    Case(
                        When(resolution_time__isnull=False, assigned_on__isnull=False,
                             then=F('resolution_time') - F('assigned_on')),
                        default=None,
                        output_field=DurationField(),
                    )
                ),
                max_hours=Max(
                    Case(
                        When(resolution_time__isnull=False, assigned_on__isnull=False,
                             then=F('resolution_time') - F('assigned_on')),
                        default=None,
                        output_field=DurationField(),
                    )
                )
            )
            
            # SLA compliance
            sla_targets = TaskItem.objects.filter(
                target_resolution__isnull=False
            ).count()
            sla_met = TaskItem.objects.filter(
                target_resolution__isnull=False,
                resolution_time__lte=F('target_resolution')
            ).count()
            sla_breached = sla_targets - sla_met
            sla_compliance = (sla_met / sla_targets * 100) if sla_targets > 0 else 0
            
            # Active items (not yet resolved)
            active_items = TaskItem.objects.filter(
                taskitemhistory_set__status__in=['new', 'in progress']
            ).distinct().count()
            
            # Overdue items
            overdue_items = TaskItem.objects.filter(
                target_resolution__lt=timezone.now(),
                taskitemhistory_set__status__in=['new', 'in progress']
            ).distinct().count()
            
            def _timedelta_to_hours(td):
                if td is None:
                    return None
                return round(td.total_seconds() / 3600, 2)
            
            return Response({
                'time_to_action_hours': {
                    'average': _timedelta_to_hours(time_to_action['avg_hours']),
                    'minimum': _timedelta_to_hours(time_to_action['min_hours']),
                    'maximum': _timedelta_to_hours(time_to_action['max_hours']),
                },
                'resolution_time_hours': {
                    'average': _timedelta_to_hours(resolution_time['avg_hours']),
                    'minimum': _timedelta_to_hours(resolution_time['min_hours']),
                    'maximum': _timedelta_to_hours(resolution_time['max_hours']),
                },
                'sla_compliance': {
                    'total_with_sla': sla_targets,
                    'sla_met': sla_met,
                    'sla_breached': sla_breached,
                    'compliance_rate': round(sla_compliance, 2),
                },
                'active_items': active_items,
                'overdue_items': overdue_items,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskItemUserPerformanceAnalyticsView(APIView):
    """Per-User Task Item Performance"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get unique users from task items
            users = RoleUsers.objects.filter(
                taskitem__isnull=False
            ).values('user_id', 'user_full_name').distinct()
            
            data = []
            for user_info in users:
                user_id = user_info['user_id']
                user_name = user_info['user_full_name']
                
                items = TaskItem.objects.filter(role_user__user_id=user_id)
                total = items.count()
                
                # Get latest status for each item from history
                items_ids = list(items.values_list('task_item_id', flat=True))
                
                # Count by latest status (most recent history entry)
                latest_statuses = {}
                for item_id in items_ids:
                    latest = TaskItemHistory.objects.filter(
                        task_item_id=item_id
                    ).order_by('-created_at').first()
                    if latest:
                        status_val = latest.status
                        latest_statuses[status_val] = latest_statuses.get(status_val, 0) + 1
                
                new_count = latest_statuses.get('new', 0)
                in_progress = latest_statuses.get('in progress', 0)
                resolved = latest_statuses.get('resolved', 0)
                reassigned = latest_statuses.get('reassigned', 0)
                escalated = latest_statuses.get('escalated', 0)
                
                # Breached: items where target_resolution < now AND status is NOT resolved/reassigned/escalated
                breached = items.filter(
                    target_resolution__isnull=False,
                    target_resolution__lt=timezone.now()
                ).exclude(
                    taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']
                ).distinct().count()
                
                # Time metrics - average time to action
                avg_action_time = items.filter(
                    acted_on__isnull=False,
                    assigned_on__isnull=False
                ).aggregate(
                    avg=Avg(F('acted_on') - F('assigned_on'), output_field=DurationField())
                )
                
                avg_action_hours = None
                if avg_action_time['avg']:
                    avg_action_hours = round(avg_action_time['avg'].total_seconds() / 3600, 2)
                
                data.append({
                    'user_id': user_id,
                    'user_name': user_name,
                    'total_items': total,
                    'new': new_count,
                    'in_progress': in_progress,
                    'resolved': resolved,
                    'reassigned': reassigned,
                    'escalated': escalated,
                    'breached': breached,
                    'resolution_rate': round((resolved / total * 100), 2) if total > 0 else 0,
                    'escalation_rate': round((escalated / total * 100), 2) if total > 0 else 0,
                    'breach_rate': round((breached / total * 100), 2) if total > 0 else 0,
                    'avg_action_time_hours': avg_action_hours,
                })
            
            return Response(sorted(data, key=lambda x: x['total_items'], reverse=True), 
                          status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskItemHistoryTrendAnalyticsView(APIView):
    """Task Item Status Trends Over Time"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
            cutoff_date = timezone.now() - timedelta(days=days)
            
            # Group by date and status using TruncDate
            trends = TaskItemHistory.objects.filter(
                created_at__gte=cutoff_date
            ).annotate(
                date=TruncDate('created_at')
            ).values('date', 'status').annotate(
                count=Count('task_item_history_id')
            ).order_by('date', 'status')
            
            # Organize by date
            data_by_date = {}
            for trend in trends:
                date_str = str(trend['date'])
                if date_str not in data_by_date:
                    data_by_date[date_str] = {}
                data_by_date[date_str][trend['status']] = trend['count']
            
            # Convert to list format
            data = []
            for date, statuses in sorted(data_by_date.items()):
                data.append({
                    'date': date,
                    'statuses': statuses,
                })
            
            return Response({
                'time_period_days': days,
                'trends': data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskItemTransferAnalyticsView(APIView):
    """Task Item Transfer and Escalation Analytics"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Transfers
            transferred = TaskItem.objects.filter(
                transferred_to__isnull=False
            ).count()
            
            # Transfers by origin user
            transfers_by_user = TaskItem.objects.filter(
                transferred_to__isnull=False
            ).values('role_user__user_id', 'role_user__user_full_name').annotate(
                transfer_count=Count('task_item_id')
            ).order_by('-transfer_count')
            
            # Transfers by destination user
            transfers_to_user = TaskItem.objects.filter(
                transferred_to__isnull=False
            ).values('transferred_to__user_id', 'transferred_to__user_full_name').annotate(
                received_count=Count('task_item_id')
            ).order_by('-received_count')
            
            # Escalations
            escalated = TaskItem.objects.filter(
                origin='Escalation'
            ).count()
            
            escalations_by_step = TaskItem.objects.filter(
                origin='Escalation'
            ).values('assigned_on_step__name').annotate(
                escalation_count=Count('task_item_id')
            ).order_by('-escalation_count')
            
            return Response({
                'total_transfers': transferred,
                'top_transferrers': list(transfers_by_user[:10]),
                'top_transfer_recipients': list(transfers_to_user[:10]),
                'total_escalations': escalated,
                'escalations_by_step': list(escalations_by_step),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AggregatedTicketsReportView(APIView):
    """Aggregated tickets reporting endpoint with time filtering"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Parse date filters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Build queryset with date filtering
            queryset = Task.objects.all()
            if start_date:
                queryset = queryset.filter(created_at__gte=start_date)
            if end_date:
                queryset = queryset.filter(created_at__lte=end_date)
            
            # Dashboard metrics
            total_tickets = queryset.count()
            completed_tickets = queryset.filter(status='completed').count()
            pending_tickets = queryset.filter(status='pending').count()
            in_progress_tickets = queryset.filter(status='in progress').count()
            
            total_with_sla = queryset.filter(target_resolution__isnull=False).count()
            sla_met = queryset.filter(
                Q(status='completed'),
                Q(resolution_time__lte=F('target_resolution')) | Q(resolution_time__isnull=True),
                target_resolution__isnull=False
            ).count()
            sla_compliance_rate = (sla_met / total_with_sla * 100) if total_with_sla > 0 else 0
            
            # Count completed with resolved status (skip datetime aggregation - not supported in SQLite)
            total_users = queryset.values('taskitem__role_user__user_id').distinct().count()
            total_workflows = queryset.values('workflow_id').distinct().count()
            # Count escalations from TaskItem with escalated origin
            escalated_count = TaskItem.objects.filter(
                task__in=queryset,
                origin='Escalation'
            ).distinct().count()
            escalation_rate = (escalated_count / total_tickets * 100) if total_tickets > 0 else 0
            
            # Status summary - aggregate by status
            status_summary_data = list(queryset.values('status').annotate(count=Count('task_id')).order_by('-count'))
            
            # SLA compliance by priority (skip datetime aggregation)
            sla_compliance = queryset.filter(
                ticket_id__priority__isnull=False
            ).values('ticket_id__priority').annotate(
                total_tasks=Count('task_id'),
                sla_met=Count(Case(
                    When(Q(resolution_time__lte=F('target_resolution')) | Q(resolution_time__isnull=True), then=1),
                    output_field=IntegerField()
                ))
            ).order_by('-total_tasks')
            
            sla_compliance_data = []
            for item in sla_compliance:
                breached = item['total_tasks'] - item['sla_met']
                sla_compliance_data.append({
                    'priority': item['ticket_id__priority'],
                    'total_tasks': item['total_tasks'],
                    'sla_met': item['sla_met'],
                    'sla_breached': breached,
                    'compliance_rate': (item['sla_met'] / item['total_tasks'] * 100) if item['total_tasks'] > 0 else 0,
                })
            
            # Priority distribution
            priority_dist = queryset.values('ticket_id__priority').annotate(count=Count('task_id')).order_by('-count')
            priority_data = []
            for item in priority_dist:
                priority_data.append({
                    'priority': item['ticket_id__priority'],
                    'count': item['count'],
                    'percentage': (item['count'] / total_tickets * 100) if total_tickets > 0 else 0,
                })
            
            # Ticket age
            now = timezone.now()
            age_buckets = [
                ('0-1 days', queryset.filter(created_at__gte=now - timedelta(days=1)).count()),
                ('1-7 days', queryset.filter(created_at__gte=now - timedelta(days=7), created_at__lt=now - timedelta(days=1)).count()),
                ('7-30 days', queryset.filter(created_at__gte=now - timedelta(days=30), created_at__lt=now - timedelta(days=7)).count()),
                ('30-90 days', queryset.filter(created_at__gte=now - timedelta(days=90), created_at__lt=now - timedelta(days=30)).count()),
                ('90+ days', queryset.filter(created_at__lt=now - timedelta(days=90)).count()),
            ]
            
            ticket_age_data = []
            for bucket, count in age_buckets:
                ticket_age_data.append({
                    'age_bucket': bucket,
                    'count': count,
                    'percentage': (count / total_tickets * 100) if total_tickets > 0 else 0,
                })
            
            return Response({
                'date_range': {
                    'start_date': start_date or 'all time',
                    'end_date': end_date or 'all time',
                },
                'dashboard': {
                    'total_tickets': total_tickets,
                    'completed_tickets': completed_tickets,
                    'pending_tickets': pending_tickets,
                    'in_progress_tickets': in_progress_tickets,
                    'sla_compliance_rate': sla_compliance_rate,
                    'total_users': total_users,
                    'total_workflows': total_workflows,
                    'escalation_rate': escalation_rate,
                },
                'status_summary': status_summary_data,
                'sla_compliance': sla_compliance_data,
                'priority_distribution': priority_data,
                'ticket_age': ticket_age_data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e), 'type': type(e).__name__}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AggregatedWorkflowsReportView(APIView):
    """Aggregated workflows reporting endpoint with time filtering"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Parse date filters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Build queryset with date filtering
            queryset = Task.objects.all()
            if start_date:
                queryset = queryset.filter(created_at__gte=start_date)
            if end_date:
                queryset = queryset.filter(created_at__lte=end_date)
            
            # Workflow metrics
            workflows = queryset.values('workflow_id', 'workflow_id__name').annotate(
                total_tasks=Count('task_id'),
                completed_tasks=Count(Case(When(status='completed', then=1), output_field=IntegerField())),
                pending_tasks=Count(Case(When(status='pending', then=1), output_field=IntegerField())),
                in_progress_tasks=Count(Case(When(status='in progress', then=1), output_field=IntegerField()))
            ).order_by('-total_tasks')
            
            workflow_data = []
            for wf in workflows:
                total = wf['total_tasks']
                workflow_data.append({
                    'workflow_id': wf['workflow_id'],
                    'workflow_name': wf['workflow_id__name'],
                    'total_tasks': total,
                    'completed_tasks': wf['completed_tasks'],
                    'pending_tasks': wf['pending_tasks'],
                    'in_progress_tasks': wf['in_progress_tasks'],
                    'completion_rate': (wf['completed_tasks'] / total * 100) if total > 0 else 0,
                })
            
            # Department analytics
            departments = queryset.filter(
                workflow_id__isnull=False
            ).values('workflow_id__department').annotate(
                total_tickets=Count('task_id'),
                completed_tickets=Count(Case(When(status='completed', then=1), output_field=IntegerField()))
            ).order_by('-total_tickets')
            
            department_data = []
            for dept in departments:
                total = dept['total_tickets']
                department_data.append({
                    'department': dept['workflow_id__department'],
                    'total_tickets': total,
                    'completed_tickets': dept['completed_tickets'],
                    'completion_rate': (dept['completed_tickets'] / total * 100) if total > 0 else 0,
                })
            
            # Step performance (skip avg_time_hours - datetime aggregation not supported in SQLite)
            steps = queryset.filter(
                current_step__isnull=False
            ).values('current_step_id', 'current_step__name', 'workflow_id').annotate(
                total_tasks=Count('task_id'),
                completed_tasks=Count(Case(When(status='completed', then=1), output_field=IntegerField()))
            ).order_by('-total_tasks')
            
            step_data = []
            for step in steps:
                step_data.append({
                    'step_id': step['current_step_id'],
                    'step_name': step['current_step__name'],
                    'workflow_id': step['workflow_id'],
                    'total_tasks': step['total_tasks'],
                    'completed_tasks': step['completed_tasks'],
                })
            
            return Response({
                'date_range': {
                    'start_date': start_date or 'all time',
                    'end_date': end_date or 'all time',
                },
                'workflow_metrics': workflow_data,
                'department_analytics': department_data,
                'step_performance': step_data,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e), 'type': type(e).__name__}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AggregatedTasksReportView(APIView):
    """Aggregated task items reporting endpoint with time filtering"""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Parse date filters
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            # Build queryset with date filtering
            queryset = TaskItem.objects.all()
            if start_date:
                queryset = queryset.filter(created_at__gte=start_date)
            if end_date:
                queryset = queryset.filter(created_at__lte=end_date)
            
            # Task Item Status Distribution - get LATEST status from taskitemhistory_set only
            # Use Subquery to get only the most recent status for each task item
            latest_status = TaskItemHistory.objects.filter(
                task_item_id=OuterRef('task_item_id')
            ).order_by('-created_at').values('status')[:1]
            
            queryset_with_status = queryset.annotate(
                latest_status=Coalesce(Subquery(latest_status), Value('new'))
            )
            
            status_dist = queryset_with_status.values('latest_status').annotate(
                count=Count('task_item_id', distinct=True)
            ).order_by('-count')
            
            status_data = []
            total_items = queryset.count()
            for item in status_dist:
                if item['latest_status']:
                    status_data.append({
                        'status': item['latest_status'],
                        'count': item['count'],
                        'percentage': (item['count'] / total_items * 100) if total_items > 0 else 0,
                    })
            
            # Task Item Origin Distribution
            origin_dist = queryset.values('origin').annotate(
                count=Count('task_item_id')
            ).order_by('-count')
            
            origin_data = []
            for item in origin_dist:
                origin_data.append({
                    'origin': item['origin'],
                    'count': item['count'],
                    'percentage': (item['count'] / total_items * 100) if total_items > 0 else 0,
                })
            
            # Task Item Performance
            time_to_action = queryset.filter(
                assigned_on__isnull=False,
                acted_on__isnull=False
            ).annotate(
                time_delta=F('acted_on') - F('assigned_on')
            ).aggregate(
                average=Avg('time_delta'),
                minimum=Min('time_delta'),
                maximum=Max('time_delta')
            )
            
            time_to_action_hours = {
                'average': float(time_to_action['average'] / timedelta(hours=1)) if time_to_action['average'] else None,
                'minimum': float(time_to_action['minimum'] / timedelta(hours=1)) if time_to_action['minimum'] else None,
                'maximum': float(time_to_action['maximum'] / timedelta(hours=1)) if time_to_action['maximum'] else None,
            }
            
            # SLA Compliance
            # Tasks are categorized by:
            # 1. resolved/escalated/reassigned: Task is handled (out of hands) = SLA met
            # 2. new/in progress: Check if target_resolution > now() (on_track) or <= now() (breached)
            sla_items = queryset.filter(target_resolution__isnull=False)
            
            # Get latest status for each task item to determine SLA compliance
            latest_status_subquery = TaskItemHistory.objects.filter(
                task_item_id=OuterRef('task_item_id')
            ).order_by('-created_at').values('status')[:1]
            
            sla_items_with_status = sla_items.annotate(
                latest_status=Coalesce(Subquery(latest_status_subquery), Value('new'))
            )
            
            # Calculate by status
            status_breakdown = {}
            all_statuses = ['new', 'in progress', 'resolved', 'escalated', 'reassigned']
            
            for status_name in all_statuses:
                status_items = sla_items_with_status.filter(latest_status=status_name)
                status_count = status_items.count()
                
                if status_count > 0:
                    if status_name in ['resolved', 'completed', 'escalated', 'reassigned']:
                        # These are handled - all met SLA
                        status_breakdown[status_name] = {
                            'total': status_count,
                            'met_sla': status_count,
                            'missed_sla': 0
                        }
                    else:
                        # new/in progress - split by deadline
                        on_track = status_items.filter(target_resolution__gt=timezone.now()).count()
                        breached = status_count - on_track
                        status_breakdown[status_name] = {
                            'total': status_count,
                            'on_track': on_track,
                            'breached': breached
                        }
            
            # Calculate summary
            tasks_on_track = sla_items_with_status.filter(
                latest_status__in=['resolved', 'completed', 'escalated', 'reassigned']
            ).count() + sla_items_with_status.filter(
                latest_status__in=['new', 'in progress'],
                target_resolution__gt=timezone.now()
            ).count()
            
            tasks_breached = sla_items_with_status.filter(
                latest_status__in=['new', 'in progress'],
                target_resolution__lte=timezone.now()
            ).count()
            
            total_sla = sla_items.count()
            compliance_rate = (tasks_on_track / total_sla * 100) if total_sla > 0 else 0
            
            # Ensure all status keys exist with default values
            for status_name in all_statuses:
                if status_name not in status_breakdown:
                    if status_name in ['resolved', 'escalated', 'reassigned']:
                        status_breakdown[status_name] = {
                            'total': 0,
                            'met_sla': 0,
                            'missed_sla': 0
                        }
                    else:
                        status_breakdown[status_name] = {
                            'total': 0,
                            'on_track': 0,
                            'breached': 0
                        }
            
            sla_compliance_data = {
                'summary': {
                    'total_tasks_with_sla': total_sla,
                    'tasks_on_track': tasks_on_track,
                    'tasks_breached': tasks_breached,
                    'current_compliance_rate_percent': round(compliance_rate, 1),
                },
                'by_current_status': status_breakdown
            }
            
            performance_data = {
                'time_to_action_hours': time_to_action_hours,
                'resolution_time_hours': {
                    'average': None,
                    'minimum': None,
                    'maximum': None,
                },
                'sla_compliance': sla_compliance_data,
                'active_items': queryset.exclude(taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']).count(),
                'overdue_items': queryset.filter(target_resolution__isnull=False, target_resolution__lt=timezone.now()).exclude(taskitemhistory_set__status__in=['resolved', 'reassigned', 'escalated']).count(),
            }
            
            # User Performance
            user_perf_list = []
            # Get distinct user IDs - convert to set to avoid duplicates
            unique_user_ids = set(queryset.values_list('role_user__user_id', flat=True).distinct())
            for user_id in unique_user_ids:
                user_items = queryset.filter(role_user__user_id=user_id)
                user_name = user_items.first().role_user.user_full_name if user_items.first() and user_items.first().role_user else f'User {user_id}'
                
                total = user_items.count()
                
                # Count task items by their LATEST status (using Subquery to get most recent history record)
                # Get the latest status for each task item
                latest_status = TaskItemHistory.objects.filter(
                    task_item_id=OuterRef('task_item_id')
                ).order_by('-created_at').values('status')[:1]
                
                user_items_with_status = user_items.annotate(
                    latest_status=Coalesce(Subquery(latest_status), Value('new'))
                )
                
                new_count = user_items_with_status.filter(latest_status='new').count()
                in_progress_count = user_items_with_status.filter(latest_status='in progress').count()
                resolved_count = user_items_with_status.filter(latest_status='resolved').count()
                reassigned_count = user_items_with_status.filter(latest_status='reassigned').count()
                escalated_count = user_items_with_status.filter(latest_status='escalated').count()
                breached_count = user_items_with_status.filter(target_resolution__isnull=False, target_resolution__lt=timezone.now()).exclude(latest_status__in=['resolved', 'reassigned', 'escalated']).count()
                
                user_perf_list.append({
                    'user_id': user_id,
                    'user_name': user_name,
                    'total_items': total,
                    'new': new_count,
                    'in_progress': in_progress_count,
                    'resolved': resolved_count,
                    'reassigned': reassigned_count,
                    'escalated': escalated_count,
                    'breached': breached_count,
                    'resolution_rate': (resolved_count / total * 100) if total > 0 else 0,
                    'escalation_rate': (escalated_count / total * 100) if total > 0 else 0,
                    'breach_rate': (breached_count / total * 100) if total > 0 else 0,
                })
            
            # Transfer Analytics
            transferred = queryset.filter(transferred_to__isnull=False).count()
            
            transfers_by_user = queryset.filter(
                transferred_to__isnull=False
            ).values('role_user__user_id', 'role_user__user_full_name').annotate(
                transfer_count=Count('task_item_id')
            ).order_by('-transfer_count')
            
            transfers_to_user = queryset.filter(
                transferred_to__isnull=False
            ).values('transferred_to__user_id', 'transferred_to__user_full_name').annotate(
                received_count=Count('task_item_id')
            ).order_by('-received_count')
            
            escalated = queryset.filter(origin='Escalation').count()
            
            escalations_by_step = queryset.filter(
                origin='Escalation'
            ).values('assigned_on_step__name').annotate(
                escalation_count=Count('task_item_id')
            ).order_by('-escalation_count')
            
            return Response({
                'date_range': {
                    'start_date': start_date or 'all time',
                    'end_date': end_date or 'all time',
                },
                'summary': {
                    'total_task_items': total_items,
                },
                'status_distribution': status_data,
                'origin_distribution': origin_data,
                'performance': performance_data,
                'user_performance': user_perf_list,
                'transfer_analytics': {
                    'total_transfers': transferred,
                    'top_transferrers': list(transfers_by_user[:10]),
                    'top_transfer_recipients': list(transfers_to_user[:10]),
                    'total_escalations': escalated,
                    'escalations_by_step': list(escalations_by_step),
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e), 'type': type(e).__name__}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

