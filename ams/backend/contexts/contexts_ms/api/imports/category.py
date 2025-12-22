"""Category import endpoint."""
from .base import BaseImportAPIView
from contexts_ms.models import Category
from contexts_ms.serializer import CategorySerializer


class CategoryImportAPIView(BaseImportAPIView):
    """Handle XLSX imports for Categories."""
    serializer_class = CategorySerializer
    model = Category
