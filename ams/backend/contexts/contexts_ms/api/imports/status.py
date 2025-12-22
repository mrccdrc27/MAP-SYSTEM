"""Status import endpoint."""
from .base import BaseImportAPIView
from contexts_ms.models import Status
from contexts_ms.serializer import StatusSerializer


class StatusImportAPIView(BaseImportAPIView):
    """Handle XLSX imports for Statuses."""
    serializer_class = StatusSerializer
    model = Status
