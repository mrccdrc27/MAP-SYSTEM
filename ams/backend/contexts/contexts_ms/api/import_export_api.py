from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from io import BytesIO
import openpyxl
import datetime
from ..utils import normalize_name_smart
from ..serializer import *
from ..models import *


class BaseExportAPIView(APIView):
    """Base class for all resource export endpoints."""
    serializer_class = None
    queryset = None
    sheet_name = 'Sheet1'
    export_fields = None  # Fields to include in export; override per-resource when needed.

    def get(self, request, format=None):
        # Lazy import openpyxl
        try:
            import openpyxl  # type: ignore
        except Exception:
            return Response({
                'detail': 'openpyxl is not installed in the running Python environment.',
                'install_instructions': (
                    'Add openpyxl to backend/contexts/requirements.txt and rebuild the contexts image,\n'
                    'for example: docker-compose -f docker-compose.dev.yml build --no-cache contexts && '
                    'docker-compose -f docker-compose.dev.yml up -d contexts'
                )
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        qs = self.queryset()
        serializer = self.serializer_class(qs, many=True)
        data = serializer.data

        # Determine fields to export (exclude id and internal fields)
        if self.export_fields is not None:
            headers = list(self.export_fields)
        else:
            # derive from serializer fields but exclude 'id' and 'is_deleted'
            if data:
                headers = [h for h in list(data[0].keys()) if h not in ('id', 'is_deleted')]
            else:
                headers = []

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = self.sheet_name

        if data and headers:
            ws.append(headers)
            for item in data:
                row = [item.get(h) for h in headers]
                ws.append(row)
        else:
            ws.append(['No Data'])

        bio = BytesIO()
        wb.save(bio)
        bio.seek(0)

        filename = f"{self.sheet_name.lower()}_{datetime.date.today().isoformat()}.xlsx"
        response = HttpResponse(bio.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


# Suppliers Export
class SupplierExportAPIView(BaseExportAPIView):
    serializer_class = SupplierSerializer
    queryset = staticmethod(lambda: Supplier.objects.filter(is_deleted=False).order_by('name'))
    sheet_name = 'Suppliers'
    export_fields = [
        'name', 'address', 'city', 'zip', 'contact_name', 'phone_number', 'email', 'url', 'notes', 'created_at', 'updated_at'
    ]


# Categories Export
class CategoryExportAPIView(BaseExportAPIView):
    serializer_class = CategorySerializer
    queryset = staticmethod(lambda: Category.objects.filter(is_deleted=False).order_by('name'))
    sheet_name = 'Categories'
    export_fields = [
        'name', 'type', 'type_display', 'notes', 'created_at', 'updated_at'
    ]


# Depreciations Export
class DepreciationExportAPIView(BaseExportAPIView):
    serializer_class = DepreciationSerializer
    queryset = staticmethod(lambda: Depreciation.objects.filter(is_deleted=False).order_by('name'))
    sheet_name = 'Depreciations'
    export_fields = [
        'name', 'duration', 'minimum_value', 'created_at', 'updated_at'
    ]


# Manufacturers Export
class ManufacturerExportAPIView(BaseExportAPIView):
    serializer_class = ManufacturerSerializer
    queryset = staticmethod(lambda: Manufacturer.objects.filter(is_deleted=False).order_by('name'))
    sheet_name = 'Manufacturers'
    export_fields = [
        'name', 'manu_url', 'support_url', 'support_phone', 'support_email', 'notes', 'created_at', 'updated_at'
    ]


# Status Export
class StatusExportAPIView(BaseExportAPIView):
    serializer_class = StatusSerializer
    queryset = staticmethod(lambda: Status.objects.filter(is_deleted=False).order_by('name'))
    sheet_name = 'Statuses'
    export_fields = [
        'name', 'type', 'notes', 'created_at', 'updated_at'
    ]


# DEPRECATED: The following code has been moved to the imports subpackage.
# Keeping as reference / comments below for historical context.
#
# def _normalize_header_to_field(header: str):

