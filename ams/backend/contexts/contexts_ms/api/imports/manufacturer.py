"""Manufacturer import endpoint."""
from .base import BaseImportAPIView
from contexts_ms.models import Manufacturer
from contexts_ms.serializer import ManufacturerSerializer


class ManufacturerImportAPIView(BaseImportAPIView):
    """Handle XLSX imports for Manufacturers."""
    serializer_class = ManufacturerSerializer
    model = Manufacturer
