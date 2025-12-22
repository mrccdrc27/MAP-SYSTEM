from .base import BaseReportingView
from .analytics_views import (
    TicketTrendAnalyticsView,
    TaskItemTrendAnalyticsView,
    TicketCategoryAnalyticsView
)
from .ticket_views import (
    TicketDashboardView,
    TicketStatusSummaryView,
    TicketPriorityDistributionView,
    TicketAgeDistributionView,
    TicketSLAComplianceView
)
from .workflow_views import (
    WorkflowMetricsView,
    DepartmentAnalyticsView,
    StepPerformanceView
)
from .task_item_views import (
    TaskItemStatusDistributionView,
    TaskItemOriginDistributionView,
    TaskItemPerformanceView,
    UserPerformanceView,
    TransferAnalyticsView
)
from .legacy_views import (
    AggregatedTicketsReportView,
    AggregatedWorkflowsReportView,
    AggregatedTasksReportView
)
from .drilldown_views import (
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
    DrilldownTaskItemsByOriginView
)
from .insight_views import (
    OperationalInsightsView,
    WorkloadAnalysisView,
    SLARiskReportView,
    AnomalyDetectionView,
    ServiceHealthSummaryView
)
from .forecasting_views import (
    TicketVolumeForecastView,
    ResolutionTimeForecastView,
    CategoryTrendForecastView,
    SLABreachRiskForecastView,
    WorkloadForecastView,
    ComprehensiveForecastView
)
