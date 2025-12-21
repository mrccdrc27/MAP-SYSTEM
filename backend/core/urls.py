from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views_utils import get_server_time
from .views_budget import AccountDropdownView, AccountSetupListView, BudgetAdjustmentView, BudgetProposalSummaryView, BudgetVarianceReportView, FiscalYearDropdownView, JournalEntryCreateView, JournalEntryListView, LedgerExportView, ProposalHistoryView, LedgerViewList, ProposalReviewBudgetOverview, export_budget_proposal_excel, export_budget_variance_excel, journal_choices, DepartmentDropdownView, AccountTypeDropdownView
from . import views_expense, views_dashboard
from .views_dashboard import (
    DepartmentBudgetView, MonthlyBudgetActualViewSet, TopCategoryBudgetAllocationView,
    get_all_projects, get_dashboard_budget_summary, get_department_budget_status, get_forecast_accuracy,
    overall_monthly_budget_actual, get_category_budget_status, get_budget_forecast, ProjectDetailView
)
from .views import (
    DepartmentViewSet,
    ValidProjectAccountView
)
from .views_expense import (
    ExpenseDetailViewForModal, ExpenseHistoryDetailView, ExpenseHistoryView,
    ExpenseCategoryDropdownView,
    BudgetAllocationCreateView, ExpenseTrackingSummaryView, ExternalExpenseViewSet, ExpenseViewSet
)
from core import views_budget

user_management_router = DefaultRouter()
user_management_router.register(
    r'departments', DepartmentViewSet, basename='department')
user_management_router.register(
    r'monthly-budget-actual', MonthlyBudgetActualViewSet, basename='monthly-budget-actual')

router = DefaultRouter()
router.register(r'external-budget-proposals',
                views_budget.ExternalBudgetProposalViewSet, basename='external-budget-proposals')
router.register(r'external-expenses', ExternalExpenseViewSet, basename='external-expenses')
# Router for UI calls from authenticated users (JWT protected)
ui_router = DefaultRouter()
ui_router.register(r'budget-proposals', views_budget.BudgetProposalUIViewSet, basename='budget-proposals')
# MODIFICATION START: The router now handles all primary expense endpoints
ui_router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)), 
    
    # --- Dashboard Endpoints ---
    path('dashboard/budget-summary/', views_dashboard.get_dashboard_budget_summary,
         name='dashboard-budget-summary'),
    path('dashboard/project-status/',
         views_dashboard.get_project_status_list, name='project-table'),
    path('dashboard/projects/<int:pk>/', ProjectDetailView.as_view(),
         name='project-detail'),
    path('dashboard/department-status/', views_dashboard.get_department_budget_status,
         name='dashboard-department-status'),
    path('dashboard/top-category-allocations/',
         views_dashboard.TopCategoryBudgetAllocationView.as_view(), name='top-category-allocations'),
    path('dashboard/overall-monthly-flow/', overall_monthly_budget_actual,
         name='dashboard-overall-monthly-flow'),
    path('dashboard/category-budget-status/', get_category_budget_status,
         name='dashboard-category-budget-status'),

    # --- Budget Proposal Endpoints (BEFORE router inclusion) ---
    path('budget-proposals/summary/', BudgetProposalSummaryView.as_view(),
         name='budget-proposal-summary'),
    path('budget-proposals/history/',
         ProposalHistoryView.as_view(), name='proposal-history'),
    path('budget-proposals/<int:proposal_id>/export/',
         export_budget_proposal_excel, name='budget-proposal-export'),
    path('budget-proposals/<int:proposal_id>/review-overview/',
         ProposalReviewBudgetOverview.as_view(), name='proposal-review-overview'),
   
    # --- Budget Adjustment & Journal Entry Endpoints ---
    path('journal-entries/', JournalEntryListView.as_view(),
         name='journal-entry-list'),
    path('budget-adjustments/', BudgetAdjustmentView.as_view(),
         name='budget-adjustment-create'),

    # --- Ledger Endpoints ---
    path('ledger/', LedgerViewList.as_view(), name='ledger-view'),
    path('ledger/export/', LedgerExportView.as_view(), name='ledger-export'),

    # --- Report Endpoints ---
    path('reports/budget-variance/', BudgetVarianceReportView.as_view(),
         name='budget-variance-report'),
    path('reports/budget-variance/export/',
         export_budget_variance_excel, name='budget-variance-export'),

    # --- Expense Endpoints ---
    # These MUST come before include(ui_router.urls) because ui_router handles 'expenses/' root
    path('expenses/history/', ExpenseHistoryView.as_view(), name='expense-history'),
    path('expenses/history/<int:pk>/', ExpenseHistoryDetailView.as_view(), name='expense-history-detail'),
    path('expenses/<int:pk>/modal-details/', ExpenseDetailViewForModal.as_view(), name='expense-modal-detail'),
    path('expenses/tracking/summary/', ExpenseTrackingSummaryView.as_view(),
         name='expense-tracking-summary'),
    path('expenses/add-budget/',
         BudgetAllocationCreateView.as_view(), name='add-budget'),
    path('expenses/valid-project-accounts/',
         ValidProjectAccountView.as_view(), name='valid-project-accounts'),

    # --- Router Include (Moved Down) ---
    # Router handles /budget-proposals/ (list) and /expenses/ (list)
    path('', include(ui_router.urls)),

    # --- General & Dropdown Endpoints ---
    path('user-management/', include(user_management_router.urls)),
    path('projects/all/', get_all_projects, name='get-all-projects'),
    path('accounts/setup/', AccountSetupListView.as_view(),
         name='account-setup-list'),
    path('dropdowns/fiscal-years/', FiscalYearDropdownView.as_view(),
         name='fiscal-year-dropdown'),
    path('dropdowns/departments/', DepartmentDropdownView.as_view(),
         name='department-dropdown'),
    path('dropdowns/account-types/', AccountTypeDropdownView.as_view(),
         name='account-type-dropdown'),
    path('dropdowns/accounts/', AccountDropdownView.as_view(),
         name='account-dropdown'),
    path('dropdowns/journal-choices/', journal_choices, name='journal-choices'),
    path('dropdowns/expense-categories/',
         views_expense.ExpenseCategoryDropdownView.as_view(), name='expense-category-dropdown'),
    path('department-budget/', views_dashboard.DepartmentBudgetView.as_view(),
         name='department-budget'),
    path('journal-entries/create/', JournalEntryCreateView.as_view(),
         name='journal-entry-create'),
    
    # --- Utility Endpoints ---
    path('utils/server-time/', get_server_time, name='server-time'),
    
    # --- Forecasting Endpoints ---
    path('dashboard/forecast/', get_budget_forecast, name='dashboard-forecast'),
    path('dashboard/forecast-accuracy/', get_forecast_accuracy, name='dashboard-forecast-accuracy'),
]