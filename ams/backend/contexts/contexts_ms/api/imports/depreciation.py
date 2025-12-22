"""Depreciation import endpoint."""
from .base import BaseImportAPIView
from contexts_ms.models import Depreciation
from contexts_ms.serializer import DepreciationSerializer


class DepreciationImportAPIView(BaseImportAPIView):
    """Handle XLSX imports for Depreciations."""
    serializer_class = DepreciationSerializer
    model = Depreciation
