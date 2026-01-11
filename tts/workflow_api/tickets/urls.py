# workflow_service/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from .views_asset import (
    ResolvedAssetTicketsView,
    ResolvedAssetCheckoutTicketsView,
    ResolvedAssetCheckinTicketsView,
    AssetTicketDetailView,
    AssetTicketsByEmployeeView,
    ApproveResolvedTicketView,
    BulkApproveResolvedTicketsView,
)

router = DefaultRouter()
router.register(r'tickets', WorkflowTicketViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # ad
    # path('assign-task/', ManualTaskAssignmentView.as_view(), name='manual-task-assignment'),
    # # /workflow/WF-6158/55570dd0-b3e6-4ba7-a8db-6b3906b827e4/
    # path("assign-task/<uuid:ticket_id>/<str:workflow_id>/", ManualTaskAssignmentView.as_view(), name="assign-task"),

    path("assign-task/", TaskAssignmentView.as_view(), name="assign-task"),
    
    # Asset Check-In/Check-Out endpoints for AMS integration
    path("asset/resolved/", ResolvedAssetTicketsView.as_view(), name="resolved-asset-tickets"),
    path("asset/checkout/", ResolvedAssetCheckoutTicketsView.as_view(), name="resolved-asset-checkout"),
    path("asset/checkin/", ResolvedAssetCheckinTicketsView.as_view(), name="resolved-asset-checkin"),
    path("asset/<str:ticket_number>/", AssetTicketDetailView.as_view(), name="asset-ticket-detail"),
    path("asset/employee/", AssetTicketsByEmployeeView.as_view(), name="asset-tickets-by-employee"),
    
    # AMS approval endpoints - system-to-system (no auth required)
    path("asset/approve/", ApproveResolvedTicketView.as_view(), name="approve-resolved-ticket"),
    path("asset/approve/bulk/", BulkApproveResolvedTicketsView.as_view(), name="bulk-approve-resolved-tickets"),
]