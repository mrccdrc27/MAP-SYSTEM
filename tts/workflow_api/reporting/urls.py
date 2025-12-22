from django.urls import path
from .views import (
    # Trend Analytics endpoints
    TicketTrendAnalyticsView,
    TaskItemTrendAnalyticsView,
    TicketCategoryAnalyticsView,
    
    # NEW: Ticket Analytics endpoints (granular)
    TicketDashboardView,
    TicketStatusSummaryView,
    TicketPriorityDistributionView,
    TicketAgeDistributionView,
    TicketSLAComplianceView,
    
    # NEW: Workflow Analytics endpoints (granular)
    WorkflowMetricsView,
    DepartmentAnalyticsView,
    StepPerformanceView,
    
    # NEW: Task Item Analytics endpoints (granular)
    TaskItemStatusDistributionView,
    TaskItemOriginDistributionView,
    TaskItemPerformanceView,
    UserPerformanceView,
    TransferAnalyticsView,
    
    # Legacy Aggregated endpoints (deprecated, kept for backward compatibility)
    AggregatedTicketsReportView,
    AggregatedWorkflowsReportView,
    AggregatedTasksReportView,
    
    # Drilldown endpoints
    DrilldownTicketsByStatusView,
    DrilldownTicketsByPriorityView,
    DrilldownTicketsByAgeView,
    DrilldownSLAComplianceView,
    DrilldownUserTasksView,
    DrilldownWorkflowTasksView,
    DrilldownStepTasksView,
    DrilldownDepartmentTasksView,
    DrilldownTransfersView,
    DrilldownTaskItemsByStatusView,
    DrilldownTaskItemsByOriginView,
    
    # Operational Insights endpoints
    OperationalInsightsView,
    WorkloadAnalysisView,
    SLARiskReportView,
    AnomalyDetectionView,
    ServiceHealthSummaryView,
    
    # ML Forecasting endpoints
    TicketVolumeForecastView,
    ResolutionTimeForecastView,
    CategoryTrendForecastView,
    SLABreachRiskForecastView,
    WorkloadForecastView,
    ComprehensiveForecastView,
)

app_name = 'reporting'

urlpatterns = [
    # ==================== TREND ANALYTICS ====================
    path('ticket-trends/', TicketTrendAnalyticsView.as_view(), name='ticket-trends'),
    path('task-item-trends/', TaskItemTrendAnalyticsView.as_view(), name='task-item-trends'),
    path('ticket-categories/', TicketCategoryAnalyticsView.as_view(), name='ticket-categories'),
    
    # ==================== TICKET ANALYTICS (NEW - GRANULAR) ====================
    path('tickets/dashboard/', TicketDashboardView.as_view(), name='ticket-dashboard'),
    path('tickets/status/', TicketStatusSummaryView.as_view(), name='ticket-status'),
    path('tickets/priority/', TicketPriorityDistributionView.as_view(), name='ticket-priority'),
    path('tickets/age/', TicketAgeDistributionView.as_view(), name='ticket-age'),
    path('tickets/sla/', TicketSLAComplianceView.as_view(), name='ticket-sla'),
    
    # ==================== WORKFLOW ANALYTICS (NEW - GRANULAR) ====================
    path('workflows/metrics/', WorkflowMetricsView.as_view(), name='workflow-metrics'),
    path('workflows/departments/', DepartmentAnalyticsView.as_view(), name='workflow-departments'),
    path('workflows/steps/', StepPerformanceView.as_view(), name='workflow-steps'),
    
    # ==================== TASK ITEM ANALYTICS (NEW - GRANULAR) ====================
    path('tasks/status/', TaskItemStatusDistributionView.as_view(), name='task-status'),
    path('tasks/origin/', TaskItemOriginDistributionView.as_view(), name='task-origin'),
    path('tasks/performance/', TaskItemPerformanceView.as_view(), name='task-performance'),
    path('tasks/users/', UserPerformanceView.as_view(), name='task-users'),
    path('tasks/transfers/', TransferAnalyticsView.as_view(), name='task-transfers'),
    
    # ==================== LEGACY AGGREGATED (DEPRECATED) ====================
    # Keep for backward compatibility - will be removed in future version
    path('reports/tickets/', AggregatedTicketsReportView.as_view(), name='aggregated-tickets'),
    path('reports/workflows/', AggregatedWorkflowsReportView.as_view(), name='aggregated-workflows'),
    path('reports/tasks/', AggregatedTasksReportView.as_view(), name='aggregated-tasks'),
    
    # ==================== DRILLDOWN ENDPOINTS ====================
    # Tickets
    path('drilldown/tickets/status/', DrilldownTicketsByStatusView.as_view(), name='drilldown-tickets-status'),
    path('drilldown/tickets/priority/', DrilldownTicketsByPriorityView.as_view(), name='drilldown-tickets-priority'),
    path('drilldown/tickets/age/', DrilldownTicketsByAgeView.as_view(), name='drilldown-tickets-age'),
    path('drilldown/tickets/sla/', DrilldownSLAComplianceView.as_view(), name='drilldown-sla'),
    
    # Workflows
    path('drilldown/workflows/', DrilldownWorkflowTasksView.as_view(), name='drilldown-workflow-tasks'),
    path('drilldown/steps/', DrilldownStepTasksView.as_view(), name='drilldown-step-tasks'),
    path('drilldown/departments/', DrilldownDepartmentTasksView.as_view(), name='drilldown-department-tasks'),
    
    # Task Items
    path('drilldown/task-items/status/', DrilldownTaskItemsByStatusView.as_view(), name='drilldown-taskitems-status'),
    path('drilldown/task-items/origin/', DrilldownTaskItemsByOriginView.as_view(), name='drilldown-taskitems-origin'),
    path('drilldown/user-tasks/', DrilldownUserTasksView.as_view(), name='drilldown-user-tasks'),
    path('drilldown/transfers/', DrilldownTransfersView.as_view(), name='drilldown-transfers'),
    
    # ==================== OPERATIONAL INSIGHTS ====================
    path('insights/', OperationalInsightsView.as_view(), name='operational-insights'),
    path('insights/workload/', WorkloadAnalysisView.as_view(), name='workload-analysis'),
    path('insights/sla-risk/', SLARiskReportView.as_view(), name='sla-risk-report'),
    path('insights/anomalies/', AnomalyDetectionView.as_view(), name='anomaly-detection'),
    path('insights/health/', ServiceHealthSummaryView.as_view(), name='service-health'),
    
    # ==================== ML FORECASTING ====================
    path('forecast/volume/', TicketVolumeForecastView.as_view(), name='forecast-volume'),
    path('forecast/resolution-time/', ResolutionTimeForecastView.as_view(), name='forecast-resolution-time'),
    path('forecast/categories/', CategoryTrendForecastView.as_view(), name='forecast-categories'),
    path('forecast/sla-risk/', SLABreachRiskForecastView.as_view(), name='forecast-sla-risk'),
    path('forecast/workload/', WorkloadForecastView.as_view(), name='forecast-workload'),
    path('forecast/dashboard/', ComprehensiveForecastView.as_view(), name='forecast-dashboard'),
]
