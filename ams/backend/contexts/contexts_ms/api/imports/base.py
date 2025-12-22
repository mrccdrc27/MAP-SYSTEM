"""Base import API functionality shared across all resource imports."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
import re
import os
import logging


def normalize_header_to_field(header: str):
    """Normalize XLSX header to Django model field name."""
    if not header:
        return ''
    key = re.sub(r'[^0-9a-zA-Z]+', '_', str(header)).strip('_').lower()
    mapping = {
        # supplier
        'contactname': 'contact_name',
        'contact_name': 'contact_name',
        'contact': 'contact_name',
        'phonenumber': 'phone_number',
        'phone': 'phone_number',
        'phone_number': 'phone_number',
        'url': 'url',
        'website': 'url',
        'email': 'email',
        'name': 'name',
        'address': 'address',
        'city': 'city',
        'zip': 'zip',
        'notes': 'notes',
        'duration': 'duration',
        'minimumvalue': 'minimum_value',
        'minimum_value': 'minimum_value',
        'createdat': 'created_at',
        'created_at': 'created_at',
        'updatedat': 'updated_at',
        'updated_at': 'updated_at',
        # manufacturer
        'manuurl': 'website_url',
        'manu_url': 'website_url',
        'website': 'website_url',
        'websiteurl': 'website_url',
        'website_url': 'website_url',
        'supporturl': 'support_url',
        'supportphone': 'support_phone',
        'supportemail': 'support_email',
        # status
        'statustype': 'type',
    }
    return mapping.get(key, key)


class BaseImportAPIView(APIView):
    """Base class for all resource import endpoints."""
    parser_classes = [MultiPartParser, FormParser]

    serializer_class = None  # override in subclasses
    model = None  # override in subclasses
    max_upload_size = 5 * 1024 * 1024  # 5 MB
    allowed_content_types = (
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
    )

    def _find_instance_by_natural_key(self, data: dict):
        """Try to locate an existing instance using a natural key for this model.

        - Category: match name (case-insensitive) and type
        - Supplier / Manufacturer: match name (case-insensitive)
        - Depreciation / Status: match name (case-insensitive)

        Returns the instance or None.
        """
        from contexts_ms.models import Category, Supplier, Manufacturer, Depreciation, Status
        
        name = data.get('name') if isinstance(data, dict) else None
        if name:
            name = str(name).strip()

        try:
            if self.model is Category:
                type_val = data.get('type') if isinstance(data, dict) else None
                if not name:
                    return None
                return Category.objects.filter(name__iexact=name, type=type_val, is_deleted=False).first()

            if self.model in (Supplier, Manufacturer):
                if not name:
                    return None
                return self.model.objects.filter(name__iexact=name, is_deleted=False).first()

            if self.model in (Depreciation, Status):
                if not name:
                    return None
                return self.model.objects.filter(name__iexact=name, is_deleted=False).first()
        except Exception:
            return None

        return None

    def post(self, request, format=None):
        # Lazy import openpyxl to avoid ModuleNotFoundError at import time
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

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic file checks: size and content type
        if hasattr(uploaded, 'size') and uploaded.size and uploaded.size > self.max_upload_size:
            return Response({'detail': f'Uploaded file is too large. Max size is {self.max_upload_size} bytes.'}, status=status.HTTP_400_BAD_REQUEST)

        # Content type / filename check
        content_type = getattr(uploaded, 'content_type', '')
        filename = getattr(uploaded, 'name', '')
        if content_type and content_type not in self.allowed_content_types and not filename.lower().endswith('.xlsx'):
            return Response({'detail': 'Uploaded file must be an XLSX file.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wb = openpyxl.load_workbook(uploaded, data_only=True)
        except Exception as e:
            return Response({'detail': f'Failed to read workbook: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        sheet = wb.active
        rows = list(sheet.rows)
        if not rows or len(rows) < 2:
            return Response({'detail': 'Workbook must have a header row and at least one data row.'}, status=status.HTTP_400_BAD_REQUEST)

        header_cells = [cell.value for cell in rows[0]]
        headers = [str(h).strip() if h is not None else '' for h in header_cells]

        created = 0
        updated = 0
        errors = []
        seen_names = set()

        Serializer = self.serializer_class

        # allow_update must be explicitly provided as a form field or query param to enable updates
        allow_update_raw = request.data.get('allow_update') if isinstance(request.data, dict) else None
        if allow_update_raw is None:
            allow_update_raw = request.query_params.get('allow_update')
        allow_update = str(allow_update_raw).lower() in ('1', 'true', 'yes') if allow_update_raw is not None else False

        # If updates are requested, require a valid API key header to allow them.
        if allow_update:
            expected_key = getattr(settings, 'IMPORT_API_KEY', None) or os.environ.get('IMPORT_API_KEY')
            if not expected_key:
                return Response({'detail': 'Import updates are disabled on this server (no IMPORT_API_KEY configured).'}, status=status.HTTP_403_FORBIDDEN)
            provided = request.META.get('HTTP_X_IMPORT_API_KEY') or request.headers.get('X-IMPORT-API-KEY')
            if not provided or provided != expected_key:
                return Response({'detail': 'Invalid or missing API key. Updates require a valid X-IMPORT-API-KEY header.'}, status=status.HTTP_403_FORBIDDEN)

        # Which upsert strategy to use when updates are allowed: 'natural' (default, match by name/type) or 'id' (match by id)
        upsert_by = request.data.get('upsert_by') if isinstance(request.data, dict) else None
        if not upsert_by:
            upsert_by = request.query_params.get('upsert_by')
        upsert_by = str(upsert_by).lower() if upsert_by else 'natural'

        logger = logging.getLogger('import_export')

        for idx, row in enumerate(rows[1:], start=2):
            values = [cell.value for cell in row]
            data = {}
            row_id = None
            for h, v in zip(headers, values):
                if not h:
                    continue
                key = normalize_header_to_field(h)
                # Never allow client to set timestamps via import
                if key in ('created_at', 'updated_at'):
                    continue
                # Capture id if present; only use it when allow_update is True
                if key in ('id', 'pk'):
                    row_id = v
                    continue
                data[key] = v

            # Log incoming row data for debugging
            try:
                logger.info('import_row %s data=%s', idx, data)
            except Exception:
                pass

            # If updates are allowed, attempt upsert according to strategy
            instance = None
            if allow_update:
                if upsert_by == 'id' and row_id:
                    try:
                        instance = self.model.objects.filter(pk=row_id).first()
                    except Exception:
                        instance = None
                elif upsert_by == 'natural':
                    try:
                        instance = self._find_instance_by_natural_key(data)
                    except Exception:
                        instance = None

            if instance is not None:
                serializer = Serializer(instance=instance, data=data, partial=True, context={'import_seen_names': seen_names})
                if serializer.is_valid():
                    try:
                        serializer.save()
                        updated += 1
                        try:
                            logger.info('import_row_updated %s', idx)
                        except Exception:
                            pass
                        # record updated name so subsequent rows won't conflict
                        try:
                            if 'name' in data:
                                seen_names.add(str(data.get('name', '')).strip().lower())
                        except Exception:
                            pass
                        continue
                    except Exception as e:
                        errors.append({'row': idx, 'errors': str(e)})
                else:
                    try:
                        logger.warning('import row %s update validation errors: %s', idx, serializer.errors)
                    except Exception:
                        pass
                    errors.append({'row': idx, 'errors': serializer.errors})

            # Otherwise create a new instance
            serializer = Serializer(data=data, context={'import_seen_names': seen_names})
            if serializer.is_valid():
                try:
                    serializer.save()
                    created += 1
                    # remember created name for this run
                    try:
                        if 'name' in data:
                            seen_names.add(str(data.get('name', '')).strip().lower())
                    except Exception:
                        pass
                except Exception as e:
                    errors.append({'row': idx, 'errors': str(e)})
            else:
                try:
                    logger.warning('import row %s create validation errors: %s', idx, serializer.errors)
                except Exception:
                    pass
                errors.append({'row': idx, 'errors': serializer.errors})

        try:
            logger.info('import_summary created=%s updated=%s errors=%s', created, updated, errors)
        except Exception:
            pass
        return Response({'created': created, 'updated': updated, 'errors': errors}, status=status.HTTP_200_OK)
