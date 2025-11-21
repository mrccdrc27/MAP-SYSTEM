from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
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
    TaskItemStatusAnalyticsView,
    TaskItemAssignmentOriginAnalyticsView,
    TaskItemPerformanceAnalyticsView,
    TaskItemUserPerformanceAnalyticsView,
    TaskItemHistoryTrendAnalyticsView,
    TaskItemTransferAnalyticsView,
    AggregatedTicketsReportView,
    AggregatedWorkflowsReportView,
    AggregatedTasksReportView,
)

app_name = 'reporting'

# Create router for navigable API
router = DefaultRouter()

urlpatterns = [
    # Root analytics endpoint
    path('', AnalyticsRootView.as_view(), name='analytics-root'),
    
    # Analytics endpoints
    path('dashboard/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('status-summary/', StatusSummaryView.as_view(), name='status-summary'),
    path('sla-compliance/', SLAComplianceView.as_view(), name='sla-compliance'),
    path('team-performance/', TeamPerformanceView.as_view(), name='team-performance'),
    path('workflow-metrics/', WorkflowMetricsView.as_view(), name='workflow-metrics'),
    path('step-performance/', StepPerformanceView.as_view(), name='step-performance'),
    path('department-analytics/', DepartmentAnalyticsView.as_view(), name='department-analytics'),
    path('priority-distribution/', PriorityDistributionView.as_view(), name='priority-distribution'),
    path('ticket-age/', TicketAgeAnalyticsView.as_view(), name='ticket-age'),
    path('assignment-analytics/', AssignmentAnalyticsView.as_view(), name='assignment-analytics'),
    path('audit-activity/', AuditActivityView.as_view(), name='audit-activity'),
    
    # Task Item Analytics endpoints
    path('task-item-status/', TaskItemStatusAnalyticsView.as_view(), name='task-item-status'),
    path('task-item-origin/', TaskItemAssignmentOriginAnalyticsView.as_view(), name='task-item-origin'),
    path('task-item-performance/', TaskItemPerformanceAnalyticsView.as_view(), name='task-item-performance'),
    path('task-item-user-performance/', TaskItemUserPerformanceAnalyticsView.as_view(), name='task-item-user-performance'),
    path('task-item-history-trends/', TaskItemHistoryTrendAnalyticsView.as_view(), name='task-item-history-trends'),
    path('task-item-transfer/', TaskItemTransferAnalyticsView.as_view(), name='task-item-transfer'),
    
    # Aggregated endpoints (NEW)
    path('reports/tickets/', AggregatedTicketsReportView.as_view(), name='aggregated-tickets'),
    path('reports/workflows/', AggregatedWorkflowsReportView.as_view(), name='aggregated-workflows'),
    path('reports/tasks/', AggregatedTasksReportView.as_view(), name='aggregated-tasks'),
    
    # Include router URLs
    path('', include(router.urls)),
]
