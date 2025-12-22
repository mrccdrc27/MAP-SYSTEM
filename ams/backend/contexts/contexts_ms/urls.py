from rest_framework.routers import DefaultRouter
from .views import *
from django.urls import path, include
from contexts_ms.api.supplier_usage_api import *
from contexts_ms.api.imports import (
    CategoryImportAPIView,
    SupplierImportAPIView,
    DepreciationImportAPIView,
    ManufacturerImportAPIView,
    StatusImportAPIView,
)
from contexts_ms.api.import_export_api import (
    SupplierExportAPIView,
    CategoryExportAPIView,
    DepreciationExportAPIView,
    ManufacturerExportAPIView,
    StatusExportAPIView,
)


router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='categories')
router.register('suppliers', SupplierViewSet, basename='supplier')
router.register('depreciations', DepreciationViewSet, basename='depreciation')
router.register('manufacturers', ManufacturerViewSet, basename='manufacturer')
router.register('statuses', StatusViewSet, basename='status')
router.register('locations', LocationViewSet, basename='location')
router.register('employees', EmployeeViewSet, basename='employee')
router.register('tickets', TicketViewSet, basename='tickets')
router.register('recycle-bin', RecycleBinViewSet, basename='recycle-bin')
router.register('contexts-dropdowns', ContextsDropdownsViewSet, basename='contexts-dropdowns')

urlpatterns = router.urls

urlpatterns = [
    path('', include(router.urls)),
    
    # supplier usage endpoints (assets/components lists by supplier)
    path('suppliers/<int:pk>/assets/', SupplierAssetListAPIView.as_view()),
    path('suppliers/<int:pk>/components/', SupplierComponentListAPIView.as_view()),
    # backend import/export endpoints (XLSX)
    path('import/suppliers/', SupplierImportAPIView.as_view()),
    path('export/suppliers/', SupplierExportAPIView.as_view()),
    path('import/categories/', CategoryImportAPIView.as_view()),
    path('export/categories/', CategoryExportAPIView.as_view()),
    path('import/depreciations/', DepreciationImportAPIView.as_view()),
    path('export/depreciations/', DepreciationExportAPIView.as_view()),
    path('import/manufacturers/', ManufacturerImportAPIView.as_view()),
    path('export/manufacturers/', ManufacturerExportAPIView.as_view()),
    path('import/statuses/', StatusImportAPIView.as_view()),
    path('export/statuses/', StatusExportAPIView.as_view()),
]