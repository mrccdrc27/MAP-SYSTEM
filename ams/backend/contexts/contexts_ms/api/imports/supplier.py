"""Supplier import endpoint."""
from .base import BaseImportAPIView
from contexts_ms.models import Supplier
from contexts_ms.serializer import SupplierSerializer


class SupplierImportAPIView(BaseImportAPIView):
    """Handle XLSX imports for Suppliers."""
    serializer_class = SupplierSerializer
    model = Supplier
