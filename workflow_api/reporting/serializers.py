from rest_framework import serializers


class StatusSummarySerializer(serializers.Serializer):
    """Serializer for task status summary"""
    status = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class SLAComplianceSerializer(serializers.Serializer):
    """Serializer for SLA compliance metrics"""
    priority = serializers.CharField()
    total_tasks = serializers.IntegerField()
    sla_met = serializers.IntegerField()
    sla_breached = serializers.IntegerField()
    compliance_rate = serializers.FloatField()
    avg_resolution_hours = serializers.FloatField()


class TeamPerformanceSerializer(serializers.Serializer):
    """Serializer for team/user performance metrics"""
    user_id = serializers.IntegerField()
    username = serializers.CharField(required=False)
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    in_progress_tasks = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    avg_resolution_hours = serializers.FloatField(required=False, allow_null=True)
    escalation_count = serializers.IntegerField()


class WorkflowMetricsSerializer(serializers.Serializer):
    """Serializer for workflow performance metrics"""
    workflow_id = serializers.IntegerField()
    workflow_name = serializers.CharField()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()
    in_progress_tasks = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    avg_completion_hours = serializers.FloatField(required=False, allow_null=True)
    department = serializers.CharField(required=False)
    category = serializers.CharField(required=False)


class StepPerformanceSerializer(serializers.Serializer):
    """Serializer for step performance metrics"""
    step_id = serializers.IntegerField()
    step_name = serializers.CharField()
    workflow_id = serializers.IntegerField()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    escalated_tasks = serializers.IntegerField()
    avg_time_hours = serializers.FloatField(required=False, allow_null=True)
    role_name = serializers.CharField(required=False)


class DepartmentAnalyticsSerializer(serializers.Serializer):
    """Serializer for department-level analytics"""
    department = serializers.CharField()
    total_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    avg_resolution_hours = serializers.FloatField(required=False, allow_null=True)
    avg_priority = serializers.CharField(required=False)


class TicketAgeAnalyticsSerializer(serializers.Serializer):
    """Serializer for ticket aging analytics"""
    age_bucket = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary"""
    total_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    pending_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    sla_compliance_rate = serializers.FloatField()
    avg_resolution_time_hours = serializers.FloatField(required=False, allow_null=True)
    total_users = serializers.IntegerField()
    total_workflows = serializers.IntegerField()
    escalation_rate = serializers.FloatField()


class PriorityDistributionSerializer(serializers.Serializer):
    """Serializer for priority distribution"""
    priority = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()
    avg_resolution_hours = serializers.FloatField(required=False, allow_null=True)


class AssignmentAnalyticsSerializer(serializers.Serializer):
    """Serializer for task assignment analytics"""
    role_name = serializers.CharField()
    total_assignments = serializers.IntegerField()
    avg_assignments_per_user = serializers.FloatField()
    total_users_in_role = serializers.IntegerField()
    reassignment_count = serializers.IntegerField()
