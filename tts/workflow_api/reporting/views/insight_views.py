from django.db.models import Count, Q, F, Avg
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status

from reporting.views.base import BaseReportingView
from reporting.utils import (
    apply_date_filter,
    get_date_range_display
)

from task.models import Task, TaskItem

# ==================== OPERATIONAL INSIGHTS ====================

class OperationalInsightsView(BaseReportingView):
    """
    Comprehensive operational insights combining workload analysis, 
    anomaly detection, SLA risks, and performance warnings.
    
    Returns aggregated system health metrics and actionable alerts.
    """

    # Configurable thresholds
    THRESHOLDS = {
        # Workload thresholds
        'high_workload_per_user': 10,  # Tasks per user considered high
        'critical_workload_per_user': 15,  # Tasks per user considered critical
        
        # SLA thresholds
        'sla_warning_hours': 4,  # Hours before SLA breach to warn
        'sla_critical_hours': 2,  # Hours before SLA breach considered critical
        'sla_compliance_warning': 80,  # SLA compliance % warning threshold
        'sla_compliance_critical': 60,  # SLA compliance % critical threshold
        
        # Performance thresholds
        'slow_avg_resolution_hours': 48,  # Avg resolution hours considered slow
        'high_escalation_rate': 15,  # Escalation rate % considered high
        'high_transfer_rate': 20,  # Transfer rate % considered high
        
        # Queue thresholds
        'queue_backlog_warning': 20,  # Pending tasks warning threshold
        'queue_backlog_critical': 50,  # Pending tasks critical threshold
        
        # Age thresholds
        'stale_ticket_days': 7,  # Days without activity considered stale
        'aging_ticket_days': 30,  # Days considered aging
    }

    def get(self, request):
        try:
            now = timezone.now()
            queryset = apply_date_filter(Task.objects.all(), request)
            
            # Gather all insights
            workload_alerts = self._analyze_workload(queryset, now)
            sla_alerts = self._analyze_sla_risks(queryset, now)
            performance_alerts = self._analyze_performance(queryset, now)
            anomaly_alerts = self._detect_anomalies(queryset, now)
            queue_alerts = self._analyze_queue_health(queryset, now)
            
            # Combine all alerts
            all_alerts = workload_alerts + sla_alerts + performance_alerts + anomaly_alerts + queue_alerts
            
            # Sort by severity (critical > warning > info)
            severity_order = {'critical': 0, 'warning': 1, 'info': 2}
            all_alerts.sort(key=lambda x: (severity_order.get(x['severity'], 3), x.get('value', 0)))
            
            # Summary counts
            summary = {
                'total_alerts': len(all_alerts),
                'critical_count': sum(1 for a in all_alerts if a['severity'] == 'critical'),
                'warning_count': sum(1 for a in all_alerts if a['severity'] == 'warning'),
                'info_count': sum(1 for a in all_alerts if a['severity'] == 'info'),
            }
            
            # Calculate overall health score (0-100)
            health_score = self._calculate_health_score(summary, queryset)
            
            return Response({
                'generated_at': now.isoformat(),
                'date_range': get_date_range_display(request),
                'health_score': health_score,
                'summary': summary,
                'alerts': all_alerts,
                'thresholds': self.THRESHOLDS,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)

    def _analyze_workload(self, queryset, now):
        """Analyze workload distribution and identify overloaded agents."""
        alerts = []
        
        # Get active tasks per user - include ALL task items (System, Transferred, Escalation)
        user_workloads = TaskItem.objects.filter(
            task__in=queryset.filter(status__in=['pending', 'in progress']),
            role_user__isnull=False  # Only count items with assigned users
        ).values(
            'role_user__user_id',
            'role_user__user_full_name'
        ).annotate(
            task_count=Count('task_item_id', distinct=True)
        ).order_by('-task_count')
        
        total_active = queryset.filter(status__in=['pending', 'in progress']).count()
        total_users = user_workloads.count()
        avg_per_user = total_active / total_users if total_users > 0 else 0
        
        for workload in user_workloads:
            task_count = workload['task_count']
            user_name = workload['role_user__user_full_name'] or f"User {workload['role_user__user_id']}"
            user_id = workload['role_user__user_id']
            
            if task_count >= self.THRESHOLDS['critical_workload_per_user']:
                alerts.append({
                    'type': 'workload',
                    'category': 'Agent Overload',
                    'severity': 'critical',
                    'title': f'Critical workload for {user_name}',
                    'message': f'{user_name} has {task_count} active tasks (threshold: {self.THRESHOLDS["critical_workload_per_user"]})',
                    'value': task_count,
                    'threshold': self.THRESHOLDS['critical_workload_per_user'],
                    'user_id': user_id,
                    'user_name': user_name,
                    'recommendation': 'Consider redistributing tasks or pausing new assignments to this agent.',
                })
            elif task_count >= self.THRESHOLDS['high_workload_per_user']:
                alerts.append({
                    'type': 'workload',
                    'category': 'Agent Overload',
                    'severity': 'warning',
                    'title': f'High workload for {user_name}',
                    'message': f'{user_name} has {task_count} active tasks (threshold: {self.THRESHOLDS["high_workload_per_user"]})',
                    'value': task_count,
                    'threshold': self.THRESHOLDS['high_workload_per_user'],
                    'user_id': user_id,
                    'user_name': user_name,
                    'recommendation': 'Monitor this agent\'s capacity and consider load balancing.',
                })
        
        # Workload imbalance detection
        if total_users > 1 and avg_per_user > 0:
            max_workload = user_workloads.first()['task_count'] if user_workloads.exists() else 0
            if max_workload > avg_per_user * 2:
                alerts.append({
                    'type': 'workload',
                    'category': 'Workload Imbalance',
                    'severity': 'warning',
                    'title': 'Significant workload imbalance detected',
                    'message': f'Workload varies significantly across agents (max: {max_workload}, avg: {avg_per_user:.1f})',
                    'value': max_workload,
                    'threshold': avg_per_user * 2,
                    'recommendation': 'Review task distribution algorithm and consider manual rebalancing.',
                })
        
        return alerts

    def _analyze_sla_risks(self, queryset, now):
        """Identify SLA breach risks and compliance issues."""
        alerts = []
        
        # Tasks at risk of SLA breach
        sla_tasks = queryset.filter(
            status__in=['pending', 'in progress'],
            target_resolution__isnull=False
        )
        
        at_risk_count = 0
        critical_count = 0
        breached_count = 0
        
        at_risk_tasks = []
        
        for task in sla_tasks:
            if task.target_resolution:
                hours_remaining = (task.target_resolution - now).total_seconds() / 3600
                
                if hours_remaining < 0:
                    breached_count += 1
                elif hours_remaining <= self.THRESHOLDS['sla_critical_hours']:
                    critical_count += 1
                    at_risk_tasks.append({
                        'task_id': task.task_id,
                        'ticket_number': task.ticket_id.ticket_number if task.ticket_id else '',
                        'hours_remaining': round(hours_remaining, 2),
                        'priority': task.ticket_id.priority if task.ticket_id else None,
                    })
                elif hours_remaining <= self.THRESHOLDS['sla_warning_hours']:
                    at_risk_count += 1
        
        if breached_count > 0:
            alerts.append({
                'type': 'sla',
                'category': 'SLA Breach',
                'severity': 'critical',
                'title': f'{breached_count} task(s) have breached SLA',
                'message': f'{breached_count} active tasks are past their target resolution time',
                'value': breached_count,
                'threshold': 0,
                'recommendation': 'Immediately prioritize these tasks and escalate if necessary.',
            })
        
        if critical_count > 0:
            alerts.append({
                'type': 'sla',
                'category': 'SLA Critical',
                'severity': 'critical',
                'title': f'{critical_count} task(s) approaching SLA breach',
                'message': f'{critical_count} tasks will breach SLA within {self.THRESHOLDS["sla_critical_hours"]} hours',
                'value': critical_count,
                'threshold': self.THRESHOLDS['sla_critical_hours'],
                'affected_tasks': at_risk_tasks[:5],  # Top 5 most urgent
                'recommendation': 'Urgent attention required. Escalate or reassign these tasks immediately.',
            })
        
        if at_risk_count > 0:
            alerts.append({
                'type': 'sla',
                'category': 'SLA Warning',
                'severity': 'warning',
                'title': f'{at_risk_count} task(s) at SLA risk',
                'message': f'{at_risk_count} tasks will breach SLA within {self.THRESHOLDS["sla_warning_hours"]} hours',
                'value': at_risk_count,
                'threshold': self.THRESHOLDS['sla_warning_hours'],
                'recommendation': 'Prioritize these tasks to avoid SLA breach.',
            })
        
        # Overall SLA compliance rate
        total_with_sla = queryset.filter(target_resolution__isnull=False).count()
        if total_with_sla > 0:
            completed_on_time = queryset.filter(
                status='completed',
                target_resolution__isnull=False,
                resolution_time__lte=F('target_resolution')
            ).count()
            compliance_rate = (completed_on_time / total_with_sla) * 100
            
            if compliance_rate < self.THRESHOLDS['sla_compliance_critical']:
                alerts.append({
                    'type': 'sla',
                    'category': 'SLA Compliance',
                    'severity': 'critical',
                    'title': 'Critical SLA compliance rate',
                    'message': f'SLA compliance is at {compliance_rate:.1f}% (threshold: {self.THRESHOLDS["sla_compliance_critical"]}%)',
                    'value': round(compliance_rate, 1),
                    'threshold': self.THRESHOLDS['sla_compliance_critical'],
                    'recommendation': 'Review SLA targets, staffing levels, and process bottlenecks.',
                })
            elif compliance_rate < self.THRESHOLDS['sla_compliance_warning']:
                alerts.append({
                    'type': 'sla',
                    'category': 'SLA Compliance',
                    'severity': 'warning',
                    'title': 'Low SLA compliance rate',
                    'message': f'SLA compliance is at {compliance_rate:.1f}% (threshold: {self.THRESHOLDS["sla_compliance_warning"]}%)',
                    'value': round(compliance_rate, 1),
                    'threshold': self.THRESHOLDS['sla_compliance_warning'],
                    'recommendation': 'Monitor closely and identify root causes of SLA breaches.',
                })
        
        return alerts

    def _analyze_performance(self, queryset, now):
        """Analyze performance metrics and identify issues."""
        alerts = []
        
        # Average resolution time
        completed_tasks = queryset.filter(
            status='completed',
            resolution_time__isnull=False
        )
        
        if completed_tasks.exists():
            avg_resolution = completed_tasks.aggregate(
                avg_hours=Avg(
                    (F('resolution_time') - F('created_at'))
                )
            )
            if avg_resolution['avg_hours']:
                avg_hours = avg_resolution['avg_hours'].total_seconds() / 3600
                if avg_hours > self.THRESHOLDS['slow_avg_resolution_hours']:
                    alerts.append({
                        'type': 'performance',
                        'category': 'Resolution Time',
                        'severity': 'warning',
                        'title': 'Slow average resolution time',
                        'message': f'Average resolution time is {avg_hours:.1f} hours (threshold: {self.THRESHOLDS["slow_avg_resolution_hours"]} hours)',
                        'value': round(avg_hours, 1),
                        'threshold': self.THRESHOLDS['slow_avg_resolution_hours'],
                        'recommendation': 'Review workflow efficiency and identify bottleneck steps.',
                    })
        
        # High escalation rate
        total_items = TaskItem.objects.filter(task__in=queryset).count()
        if total_items > 0:
            escalations = TaskItem.objects.filter(task__in=queryset, origin='Escalation').count()
            escalation_rate = (escalations / total_items) * 100
            
            if escalation_rate > self.THRESHOLDS['high_escalation_rate']:
                alerts.append({
                    'type': 'performance',
                    'category': 'Escalation Rate',
                    'severity': 'warning',
                    'title': 'High escalation rate',
                    'message': f'Escalation rate is {escalation_rate:.1f}% (threshold: {self.THRESHOLDS["high_escalation_rate"]}%)',
                    'value': round(escalation_rate, 1),
                    'threshold': self.THRESHOLDS['high_escalation_rate'],
                    'recommendation': 'Review initial assignment quality and agent training needs.',
                })
            
            # High transfer rate
            transfers = TaskItem.objects.filter(task__in=queryset, origin='Transferred').count()
            transfer_rate = (transfers / total_items) * 100
            
            if transfer_rate > self.THRESHOLDS['high_transfer_rate']:
                alerts.append({
                    'type': 'performance',
                    'category': 'Transfer Rate',
                    'severity': 'warning',
                    'title': 'High transfer rate',
                    'message': f'Transfer rate is {transfer_rate:.1f}% (threshold: {self.THRESHOLDS["high_transfer_rate"]}%)',
                    'value': round(transfer_rate, 1),
                    'threshold': self.THRESHOLDS['high_transfer_rate'],
                    'recommendation': 'Review task routing rules and department assignments.',
                })
        
        return alerts

    def _detect_anomalies(self, queryset, now):
        """Detect unusual patterns and anomalies."""
        alerts = []
        
        # Stale tickets (no activity for X days)
        stale_cutoff = now - timedelta(days=self.THRESHOLDS['stale_ticket_days'])
        stale_tasks = queryset.filter(
            status__in=['pending', 'in progress'],
            updated_at__lt=stale_cutoff
        ).count()
        
        if stale_tasks > 0:
            alerts.append({
                'type': 'anomaly',
                'category': 'Stale Tickets',
                'severity': 'warning',
                'title': f'{stale_tasks} stale task(s) detected',
                'message': f'{stale_tasks} tasks have had no activity for {self.THRESHOLDS["stale_ticket_days"]}+ days',
                'value': stale_tasks,
                'threshold': self.THRESHOLDS['stale_ticket_days'],
                'recommendation': 'Review these tasks and either close, escalate, or take action.',
            })
        
        # Aging tickets
        aging_cutoff = now - timedelta(days=self.THRESHOLDS['aging_ticket_days'])
        aging_tasks = queryset.filter(
            status__in=['pending', 'in progress'],
            created_at__lt=aging_cutoff
        ).count()
        
        if aging_tasks > 0:
            alerts.append({
                'type': 'anomaly',
                'category': 'Aging Tickets',
                'severity': 'warning' if aging_tasks < 10 else 'critical',
                'title': f'{aging_tasks} aging task(s) detected',
                'message': f'{aging_tasks} tasks are older than {self.THRESHOLDS["aging_ticket_days"]} days and still open',
                'value': aging_tasks,
                'threshold': self.THRESHOLDS['aging_ticket_days'],
                'recommendation': 'These long-running tasks may indicate systemic issues. Review and prioritize resolution.',
            })
        
        # Spike detection - compare today's volume to rolling average
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_created = Task.objects.filter(created_at__gte=today_start).count()
        
        # Last 7 days average
        week_ago = today_start - timedelta(days=7)
        week_tasks = Task.objects.filter(
            created_at__gte=week_ago,
            created_at__lt=today_start
        ).count()
        daily_avg = week_tasks / 7 if week_tasks > 0 else 0
        
        if daily_avg > 0 and today_created > daily_avg * 2:
            alerts.append({
                'type': 'anomaly',
                'category': 'Volume Spike',
                'severity': 'warning',
                'title': 'Unusual ticket volume spike',
                'message': f"Today's volume ({today_created}) is {(today_created/daily_avg*100):.0f}% of average ({daily_avg:.1f}/day)",
                'value': today_created,
                'threshold': daily_avg * 2,
                'recommendation': 'Monitor incoming volume and consider activating additional resources.',
            })
        
        return alerts

    def _analyze_queue_health(self, queryset, now):
        """Analyze queue backlogs and health."""
        alerts = []
        
        pending_count = queryset.filter(status='pending').count()
        
        if pending_count >= self.THRESHOLDS['queue_backlog_critical']:
            alerts.append({
                'type': 'queue',
                'category': 'Queue Backlog',
                'severity': 'critical',
                'title': 'Critical queue backlog',
                'message': f'{pending_count} tasks in pending state (threshold: {self.THRESHOLDS["queue_backlog_critical"]})',
                'value': pending_count,
                'threshold': self.THRESHOLDS['queue_backlog_critical'],
                'recommendation': 'Urgent: Allocate additional resources to clear the backlog.',
            })
        elif pending_count >= self.THRESHOLDS['queue_backlog_warning']:
            alerts.append({
                'type': 'queue',
                'category': 'Queue Backlog',
                'severity': 'warning',
                'title': 'Queue backlog growing',
                'message': f'{pending_count} tasks in pending state (threshold: {self.THRESHOLDS["queue_backlog_warning"]})',
                'value': pending_count,
                'threshold': self.THRESHOLDS['queue_backlog_warning'],
                'recommendation': 'Monitor queue and consider preventive measures.',
            })
        
        # Workflow-specific backlogs
        workflow_backlogs = queryset.filter(status='pending').values(
            'workflow_id__name'
        ).annotate(count=Count('task_id')).order_by('-count')[:5]
        
        for backlog in workflow_backlogs:
            if backlog['count'] >= 10:
                alerts.append({
                    'type': 'queue',
                    'category': 'Workflow Backlog',
                    'severity': 'info',
                    'title': f"Backlog in {backlog['workflow_id__name'] or 'Unknown workflow'}",
                    'message': f"{backlog['count']} pending tasks in this workflow",
                    'value': backlog['count'],
                    'threshold': 10,
                    'workflow_name': backlog['workflow_id__name'],
                    'recommendation': 'Review workflow capacity and assignment rules.',
                })
        
        return alerts

    def _calculate_health_score(self, summary, queryset):
        """Calculate overall system health score (0-100)."""
        base_score = 100
        
        # Deduct for critical alerts
        base_score -= summary['critical_count'] * 15
        
        # Deduct for warnings
        base_score -= summary['warning_count'] * 5
        
        # Deduct for info alerts
        base_score -= summary['info_count'] * 1
        
        # Ensure score is between 0 and 100
        return max(0, min(100, base_score))


class WorkloadAnalysisView(BaseReportingView):
    """Detailed workload analysis per agent and team."""

    def get(self, request):
        try:
            now = timezone.now()
            queryset = apply_date_filter(Task.objects.all(), request)
            
            # Per-user workload - include ALL task items (System, Transferred, Escalation)
            # to get full picture of agent workloads
            user_workloads = TaskItem.objects.filter(
                task__in=queryset,
                role_user__isnull=False  # Only count items with assigned users
            ).values(
                'role_user__user_id',
                'role_user__user_full_name'
            ).annotate(
                total_assigned=Count('task_item_id', distinct=True),
                active_tasks=Count('task_item_id', distinct=True, filter=Q(task__status__in=['pending', 'in progress'])),
                completed_tasks=Count('task_item_id', distinct=True, filter=Q(task__status='completed')),
                system_assigned=Count('task_item_id', distinct=True, filter=Q(origin='System')),
                transferred=Count('task_item_id', distinct=True, filter=Q(origin='Transferred')),
                escalated=Count('task_item_id', distinct=True, filter=Q(origin='Escalation')),
            ).order_by('-active_tasks')
            
            workloads = [{
                'user_id': w['role_user__user_id'],
                'user_name': w['role_user__user_full_name'] or f"User {w['role_user__user_id']}",
                'total_assigned': w['total_assigned'],
                'active_tasks': w['active_tasks'],
                'completed_tasks': w['completed_tasks'],
                'system_assigned': w['system_assigned'],
                'transferred': w['transferred'],
                'escalated': w['escalated'],
                'utilization': round((w['active_tasks'] / 15) * 100, 1) if w['active_tasks'] else 0,  # Assuming 15 is full capacity
            } for w in user_workloads]
            
            # Summary stats
            total_users = len(workloads)
            total_active = sum(w['active_tasks'] for w in workloads)
            total_assigned = sum(w['total_assigned'] for w in workloads)
            avg_per_user = total_active / total_users if total_users > 0 else 0
            
            return Response({
                'generated_at': now.isoformat(),
                'summary': {
                    'total_agents': total_users,
                    'total_active_tasks': total_active,
                    'total_assigned_tasks': total_assigned,
                    'avg_tasks_per_agent': round(avg_per_user, 2),
                    'overloaded_agents': sum(1 for w in workloads if w['active_tasks'] >= 15),
                },
                'workloads': workloads,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class SLARiskReportView(BaseReportingView):
    """Detailed SLA risk analysis with at-risk tickets."""

    def get(self, request):
        try:
            now = timezone.now()
            queryset = apply_date_filter(Task.objects.all(), request)
            
            sla_tasks = queryset.filter(
                status__in=['pending', 'in progress'],
                target_resolution__isnull=False
            ).select_related('ticket_id', 'workflow_id', 'current_step')
            
            at_risk = []
            breached = []
            healthy = []
            
            for task in sla_tasks:
                hours_remaining = (task.target_resolution - now).total_seconds() / 3600
                
                task_data = {
                    'task_id': task.task_id,
                    'ticket_number': task.ticket_id.ticket_number if task.ticket_id else '',
                    'subject': task.ticket_id.ticket_data.get('subject', '') if task.ticket_id else '',
                    'priority': task.ticket_id.priority if task.ticket_id else None,
                    'workflow': task.workflow_id.name if task.workflow_id else None,
                    'current_step': task.current_step.name if task.current_step else None,
                    'status': task.status,
                    'target_resolution': task.target_resolution.isoformat(),
                    'hours_remaining': round(hours_remaining, 2),
                    'created_at': task.created_at.isoformat(),
                }
                
                if hours_remaining < 0:
                    task_data['overdue_hours'] = round(abs(hours_remaining), 2)
                    breached.append(task_data)
                elif hours_remaining <= 4:
                    at_risk.append(task_data)
                else:
                    healthy.append(task_data)
            
            # Sort by urgency
            breached.sort(key=lambda x: x.get('overdue_hours', 0), reverse=True)
            at_risk.sort(key=lambda x: x.get('hours_remaining', float('inf')))
            
            return Response({
                'generated_at': now.isoformat(),
                'summary': {
                    'total_with_sla': len(breached) + len(at_risk) + len(healthy),
                    'breached_count': len(breached),
                    'at_risk_count': len(at_risk),
                    'healthy_count': len(healthy),
                },
                'breached': breached[:20],  # Top 20
                'at_risk': at_risk[:20],
                'healthy_count': len(healthy),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class AnomalyDetectionView(BaseReportingView):
    """Detect anomalies in ticket patterns and agent behavior."""

    def get(self, request):
        try:
            now = timezone.now()
            days = int(request.query_params.get('days', 7))
            
            anomalies = []
            
            # Volume anomaly detection
            daily_volumes = []
            for i in range(days):
                day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                count = Task.objects.filter(created_at__gte=day_start, created_at__lt=day_end).count()
                daily_volumes.append({'date': day_start.date().isoformat(), 'count': count})
            
            if daily_volumes:
                avg_volume = sum(d['count'] for d in daily_volumes) / len(daily_volumes)
                std_dev = (sum((d['count'] - avg_volume) ** 2 for d in daily_volumes) / len(daily_volumes)) ** 0.5
                
                for day in daily_volumes:
                    if std_dev > 0 and abs(day['count'] - avg_volume) > 2 * std_dev:
                        anomalies.append({
                            'type': 'volume',
                            'date': day['date'],
                            'value': day['count'],
                            'expected': round(avg_volume, 1),
                            'deviation': round((day['count'] - avg_volume) / std_dev, 2),
                            'description': f"Unusual volume on {day['date']}: {day['count']} vs avg {avg_volume:.1f}",
                        })
            
            # Stale ticket anomaly
            stale_count = Task.objects.filter(
                status__in=['pending', 'in progress'],
                updated_at__lt=now - timedelta(days=7)
            ).count()
            
            if stale_count > 0:
                anomalies.append({
                    'type': 'stale',
                    'value': stale_count,
                    'description': f'{stale_count} tickets with no activity for 7+ days',
                })
            
            # Escalation spike detection
            recent_escalations = TaskItem.objects.filter(
                origin='Escalation',
                assigned_on__gte=now - timedelta(days=1)
            ).count()
            
            avg_daily_escalations = TaskItem.objects.filter(
                origin='Escalation',
                assigned_on__gte=now - timedelta(days=7)
            ).count() / 7
            
            if avg_daily_escalations > 0 and recent_escalations > avg_daily_escalations * 2:
                anomalies.append({
                    'type': 'escalation_spike',
                    'value': recent_escalations,
                    'expected': round(avg_daily_escalations, 1),
                    'description': f'Escalation spike: {recent_escalations} today vs avg {avg_daily_escalations:.1f}/day',
                })
            
            return Response({
                'generated_at': now.isoformat(),
                'analysis_period_days': days,
                'daily_volumes': daily_volumes,
                'anomalies': anomalies,
                'anomaly_count': len(anomalies),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)


class ServiceHealthSummaryView(BaseReportingView):
    """High-level service health dashboard."""

    def get(self, request):
        try:
            now = timezone.now()
            queryset = apply_date_filter(Task.objects.all(), request)
            
            total_tasks = queryset.count()
            
            # Status breakdown
            status_counts = dict(queryset.values_list('status').annotate(count=Count('task_id')))
            
            # Calculate metrics
            pending = status_counts.get('pending', 0)
            in_progress = status_counts.get('in progress', 0)
            completed = status_counts.get('completed', 0)
            
            # SLA metrics
            with_sla = queryset.filter(target_resolution__isnull=False)
            completed_on_time = with_sla.filter(
                status='completed',
                resolution_time__lte=F('target_resolution')
            ).count()
            sla_compliance = (completed_on_time / with_sla.count() * 100) if with_sla.count() > 0 else 100
            
            # Active SLA risks
            sla_at_risk = with_sla.filter(
                status__in=['pending', 'in progress'],
                target_resolution__lte=now + timedelta(hours=4)
            ).count()
            
            # Determine overall health status
            if sla_compliance >= 90 and pending < 20 and sla_at_risk < 5:
                health_status = 'healthy'
            elif sla_compliance >= 70 and pending < 50 and sla_at_risk < 15:
                health_status = 'warning'
            else:
                health_status = 'critical'
            
            return Response({
                'generated_at': now.isoformat(),
                'health_status': health_status,
                'metrics': {
                    'total_tasks': total_tasks,
                    'pending': pending,
                    'in_progress': in_progress,
                    'completed': completed,
                    'sla_compliance_rate': round(sla_compliance, 1),
                    'sla_at_risk': sla_at_risk,
                    'completion_rate': round((completed / total_tasks * 100) if total_tasks > 0 else 0, 1),
                },
                'thresholds': {
                    'sla_healthy': 90,
                    'sla_warning': 70,
                    'pending_healthy': 20,
                    'pending_warning': 50,
                },
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return self.handle_exception(e)
