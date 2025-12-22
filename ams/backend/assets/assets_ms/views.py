from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import *
from .serializer import *
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.timezone import now
from datetime import timedelta
from django.db.models import Sum, Value, F
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from datetime import datetime
from django.db import transaction
import logging
from assets_ms.services.contexts import *
from assets_ms.services.integration_help_desk import *
from assets_ms.services.integration_ticket_tracking import *

from assets_ms.services.activity_logger import (
    log_asset_activity,
    log_component_activity,
    log_audit_activity,
    log_repair_activity,
)
from assets_ms.authentication import (
    JWTCookieAuthentication,
    AMSSystemPermission,
    AMSAdminPermission,
    AMSOperatorOrAdminPermission,
)

logger = logging.getLogger(__name__)

# If will add more views later or functionality, please create file on api folder or services folder
# Only viewsets here
class ProductViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Product.objects.filter(is_deleted=False).order_by('name')

    def get_serializer_class(self):
        # 1. Products Table (list)
        if self.action == "list":
            return ProductListSerializer

        # 2. Asset Registration dropdown
        if self.action == "asset_registration":
            return ProductAssetRegistrationSerializer
        
        # 3. Product View
        if self.action == "retrieve":
            return ProductInstanceSerializer
        
        # 4. Product Names
        if self.action == "names":
            return ProductNameSerializer
        
        # 5. Create, Update, Destroy
        return ProductSerializer
    
    # Build context maps for serializers
    def _build_context_maps(self):
        # categories
        category_map = cache.get("categories:map")
        if not category_map:
            categories = get_category_names()
            category_map = {c['id']: c for c in categories}
            cache.set("categories:map", category_map, 300)

        # manufacturers
        manufacturer_map = cache.get("manufacturers:map")
        if not manufacturer_map:
            manufacturers = get_manufacturer_names()
            manufacturer_map = {m['id']: m for m in manufacturers}
            cache.set("manufacturers:map", manufacturer_map, 300)

        # suppliers
        supplier_map = cache.get("suppliers:map")
        if not supplier_map:
            suppliers = get_supplier_names()
            supplier_map = {s['id']: s for s in suppliers}
            cache.set("suppliers:map", supplier_map, 300)

        # depreciations
        depreciation_map = cache.get("depreciations:map")
        if not depreciation_map:
            depreciations = get_depreciation_names()
            depreciation_map = {d['id']: d for d in depreciations}
            cache.set("depreciations:map", depreciation_map, 300)

        return {
            "category_map": category_map,
            "manufacturer_map": manufacturer_map,
            "supplier_map": supplier_map,
            "depreciation_map": depreciation_map,
        }
    
    def _build_asset_context_maps(self):
        """Build context maps needed for nested AssetListSerializer in ProductInstanceSerializer."""
        # statuses
        status_map = cache.get("statuses:map")
        if not status_map:
            statuses = get_status_names()
            status_map = {s['id']: s for s in statuses}
            cache.set("statuses:map", status_map, 300)

        # products (for product_details - though in product view we already know the product)
        product_map = cache.get("products:map")
        if not product_map:
            products = Product.objects.filter(is_deleted=False)
            product_map = {p.id: p.name for p in products}
            cache.set("products:map", product_map, 300)

        # tickets
        ticket_map = cache.get("tickets:map")
        if not ticket_map:
            tickets = get_tickets_list()
            ticket_map = {t["asset"]: t for t in tickets}
            cache.set("tickets:map", ticket_map, 300)

        return {
            "status_map": status_map,
            "product_map": product_map,
            "ticket_map": ticket_map,
        }

    # Helper function for cached responses
    def cached_response(self, cache_key, queryset, serializer_class, many=True, context=None):
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        context = context or {}
        serializer = serializer_class(queryset, many=many, context=context)
        cache.set(cache_key, serializer.data, 300)
        return Response(serializer.data)
    
    
    def list(self, request, *args, **kwargs):
        quesryset = self.get_queryset()

        context_maps = self._build_context_maps()
        return self.cached_response(
            "products:list",
            quesryset,
            self.get_serializer_class(),
            many=True,
            context={**context_maps, 'request': request}
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        context_maps = self._build_context_maps()
        asset_context_maps = self._build_asset_context_maps()
        cache_key = f"products:detail:{instance.id}"
        return self.cached_response(
            cache_key,
            instance,
            self.get_serializer_class(),
            many=False,
            context={**context_maps, **asset_context_maps, 'request': request}
        )

    def invalidate_product_cache(self, product_id):
        cache.delete("products:list")
        cache.delete("products:names")
        cache.delete("products:asset-registration")
        cache.delete(f"products:detail:{product_id}")

    def perform_destroy(self, instance):
        # Check for referencing assets that are not deleted
        if instance.product_assets.filter(is_deleted=False).exists():
            raise ValidationError({
                "detail": "Cannot delete this product, it's being used by one or more active assets."
            })

        # If no active assets, allow soft delete
        instance.is_deleted = True
        instance.save()
        self.invalidate_product_cache(instance.id)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.invalidate_product_cache(instance.id)

    def perform_update(self, serializer):
        instance = serializer.save()
        self.invalidate_product_cache(instance.id)
    
    # Product names and image for bulk edit
    # names/?ids=1,2,3
    # names/?search=keyword
    # names/?ids=1,2,3&search=Lenovo
    @action(detail=False, methods=["get"], url_path='names')
    def names(self, request):
        """
        Return products with only id, name, and image.
        Optional query param: ?ids=1,2,3 or ?search=keyword
        """
        ids_param = request.query_params.get("ids")
        search = request.query_params.get("search")
        queryset = self.get_queryset()

        # Filter by IDs if provided
        if ids_param:
            try:
                ids = [int(i) for i in ids_param.split(",") if i.strip().isdigit()]
                queryset = queryset.filter(id__in=ids)
            except ValueError:
                return Response({"detail": "Invalid IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        if search:
            queryset = queryset.filter(name__icontains=search)

        # Don't cache search results - they need to be real-time for clone name generation
        if search:
            serializer = ProductNameSerializer(queryset, many=True)
            return Response(serializer.data)

        # Build a cache key specific for this set of IDs
        cache_key = "products:names"
        if ids_param:
            cache_key += f":{','.join(map(str, ids))}"

        return self.cached_response(
            cache_key,
            queryset,
            ProductNameSerializer,
            many=True
    )
    
    # Bulk edit
    # Receive list of IDs and partially or fully update all products with the same data, else return error
    @action(detail=False, methods=["patch"], url_path='bulk-edit')
    def bulk_edit(self, request):
        """
        Bulk edit multiple products.
        Payload (JSON):
        {
            "ids": [1, 2, 3],
            "data": {
                "manufacturer": 5,
                "depreciation": 2,
                "default_purchase_cost": "200.00"
            }
        }
        Or FormData with 'ids' (JSON string), 'data' (JSON string), and optional 'image' file.
        Only non-empty fields will be updated.
        """
        import json
        from django.core.files.base import ContentFile

        # Handle both JSON and FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            ids_raw = request.data.get("ids", "[]")
            data_raw = request.data.get("data", "{}")
            try:
                ids = json.loads(ids_raw) if isinstance(ids_raw, str) else ids_raw
                update_data = json.loads(data_raw) if isinstance(data_raw, str) else data_raw
            except json.JSONDecodeError:
                return Response({"detail": "Invalid JSON in ids or data."}, status=status.HTTP_400_BAD_REQUEST)

            uploaded_image = request.FILES.get("image")
            # Read image content into memory so it can be reused for multiple products
            if uploaded_image:
                image_content = uploaded_image.read()
                image_name = uploaded_image.name
            else:
                image_content = None
                image_name = None
            remove_image = request.data.get("remove_image") == "true"
        else:
            ids = request.data.get("ids", [])
            update_data = request.data.get("data", {})
            image_content = None
            image_name = None
            remove_image = False

        if not ids:
            return Response({"detail": "No IDs provided."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Remove blank values so they won't overwrite existing fields
        safe_data = {k: v for k, v in update_data.items() if v not in [None, "", [], {}]}

        # Check if there's anything to update (fields, image, or remove_image)
        has_field_updates = bool(safe_data)
        has_image_update = image_content is not None or remove_image

        if not has_field_updates and not has_image_update:
            return Response(
                {"detail": "No valid fields to update."},
                status=status.HTTP_400_BAD_REQUEST
            )

        products = Product.objects.filter(id__in=ids, is_deleted=False)

        updated, failed = [], []

        # Check if name is being updated for multiple products
        base_name = safe_data.get("name")
        has_name_update = base_name is not None and len(ids) > 1

        for index, product in enumerate(products):
            # Create product-specific data with unique name suffix if needed
            product_data = safe_data.copy()
            if has_name_update:
                product_data["name"] = f"{base_name} ({index + 1})"

            serializer = ProductSerializer(
                product,
                data=product_data,
                partial=True  # important so blank fields won’t cause validation errors
            )

            if serializer.is_valid():
                instance = serializer.save()

                # Handle image update
                if image_content:
                    # Create a new ContentFile for each product from the stored bytes
                    instance.image.save(image_name, ContentFile(image_content), save=True)
                elif remove_image and instance.image:
                    instance.image.delete(save=False)
                    instance.image = None
                    instance.save()

                updated.append(product.id)
                cache.delete(f"products:detail:{product.id}")
            else:
                failed.append({
                    "id": product.id,
                    "errors": serializer.errors
                })
        
        cache.delete("products:list")
        cache.delete("products:names")
        cache.delete("products:asset-registration")

        return Response({
            "updated": updated,
            "failed": failed
        })
    
    # Bulk delete
    # Receive list of IDs and soft delete all products that are not referenced by active assets, else return error
    @action(detail=False, methods=["post"], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        Soft delete multiple products by IDs.
        Expects payload: { "ids": [1, 2, 3] }
        """
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"detail": "No IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        products = Product.objects.filter(id__in=ids, is_deleted=False)
        failed = []

        for product in products:
            try:
                self.perform_destroy(product)
            except ValidationError as e:
                failed.append({"id": product.id, "error": str(e.detail)})
        
        cache.delete("products:list")

        if failed:
            return Response({
                "detail": "Some products could not be deleted. Please check if they are assigned to active assets before trying again.",
                "failed": failed
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Products soft-deleted successfully."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path='asset-registration')
    def asset_registration(self, request):
        queryset = self.get_queryset()
        return self.cached_response(
            "products:asset-registration",
            queryset,
            self.get_serializer_class(),
            many=True,
        )

class AssetViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = Asset.objects.filter(is_deleted=False).order_by('name')
        # Optional: allow query param ?show_deleted=true
        if self.request.query_params.get('show_deleted') == 'true':
            queryset = Asset.objects.filter(is_deleted=True).order_by('name')
        return queryset
    
    def get_serializer_class(self):
        # 1. Assets Table (list)
        if self.action == "list":
            return AssetListSerializer
        if self.action == "retrieve":
            return AssetInstanceSerializer
        # 3. Create, Update, Destroy
        return AssetSerializer
    
    def _build_asset_context_maps(self):
        # statuses
        status_map = cache.get("statuses:map")
        if not status_map:
            statuses = get_status_names()
            status_map = {s['id']: s for s in statuses}
            cache.set("statuses:map", status_map, 300)

        # products
        product_map = cache.get("products:map")
        if not product_map:
            products = Product.objects.filter(is_deleted=False)
            # products
            product_map = cache.get("products:map")
            if not product_map:
                products = Product.objects.filter(is_deleted=False)
                serialized = ProductNameSerializer(products, many=True).data
                product_map = {p['id']: p for p in serialized}
                cache.set("products:map", product_map, 300)

        # locations
        location_map = cache.get("locations:map")
        if not location_map:
            locations = get_locations_list()
            location_map = {l['id']: l for l in locations}
            cache.set("locations:map", location_map, 300)

        # tickets (unresolved)
        ticket_map = cache.get("tickets:map")
        if not ticket_map:
            tickets = get_tickets_list()
            if isinstance(tickets, list):
                ticket_map = {t["asset"]: t for t in tickets if t.get("asset")}
            else:
                ticket_map = {}
            cache.set("tickets:map", ticket_map, 300)

        return {
            "status_map": status_map,
            "product_map": product_map,
            "location_map": location_map,
            "ticket_map": ticket_map,
        }
    
    # Helper function for cached responses
    def cached_response(self, cache_key, queryset, serializer_class, many=True, context=None):
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        context = context or {}
        serializer = serializer_class(queryset, many=many, context=context)
        cache.set(cache_key, serializer.data, 300)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        context_maps = self._build_asset_context_maps()
        return self.cached_response(
            "assets:list",
            queryset,
            self.get_serializer_class(),
            many=True,
            context={**context_maps, 'request': request}
        )
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        context_maps = self._build_asset_context_maps()
        cache_key = f"assets:detail:{instance.id}"
        return self.cached_response(
            cache_key,
            instance,
            self.get_serializer_class(),
            many=False,
            context={**context_maps, 'request': request}
        )
    
    def invalidate_asset_cache(self, asset_id):
        cache.delete("assets:list")
        cache.delete(f"assets:detail:{asset_id}")
        cache.delete("assets:names")

    def perform_destroy(self, instance):
        errors = []

        # Check for active checkouts (no checkin yet)
        if instance.asset_checkouts.filter(asset_checkin__isnull=True).exists():
            errors.append("This asset is currently checked out and not yet checked in. Please check in the asset before deleting it or perform a check-in and delete checkout.")

        # If any blocking relationships exist, raise error
        if errors:
            raise ValidationError({
                "detail": "Cannot delete this asset because:\n- " + "\n- ".join(errors)
            })

        # Otherwise, perform soft delete
        instance.is_deleted = True
        instance.save()
        self.invalidate_asset_cache(instance.id)

    def perform_create(self, serializer):
        validated = serializer.validated_data

        product = validated.get("product")
        supplier = validated.get("supplier")
        purchase_cost = validated.get("purchase_cost")

        # Auto-assign supplier from product.default_supplier
        if supplier is None and product and product.default_supplier:
            supplier = product.default_supplier

        # Auto-assign purchase_cost from product.default_purchase_cost
        if purchase_cost is None and product and product.default_purchase_cost is not None:
            purchase_cost = product.default_purchase_cost

        serializer.save(
            supplier=supplier,
            purchase_cost=purchase_cost
        )

        asset = serializer.instance
        self.invalidate_asset_cache(asset.id)

        # Log activity
        log_asset_activity(
            action='Create',
            asset=asset,
            notes=f"Asset '{asset.name}' created"
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        self.invalidate_asset_cache(instance.id)

        # Log activity
        log_asset_activity(
            action='Update',
            asset=instance,
            notes=f"Asset '{instance.name}' updated"
        )
    
    @action(detail=False, methods=['get'], url_path='by-product/(?P<product_id>\d+)')
    def by_product(self, request, product_id=None):
        """Get all assets for a specific product"""
        assets = Asset.objects.filter(product=product_id, is_deleted=False).order_by('name')
        serializer = self.get_serializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """List all soft-deleted assets"""
        assets = Asset.objects.filter(is_deleted=True).order_by('name')
        serializer = self.get_serializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def recover(self, request, pk=None):
        """Recover a soft-deleted asset"""
        try:
            asset = Asset.objects.get(pk=pk, is_deleted=True)
            asset.is_deleted = False
            asset.save()
            cache.delete(f"assets:detail:{asset.id}")
            serializer = self.get_serializer(asset)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Asset.DoesNotExist:
            return Response(
                {"detail": "Asset not found or already active."},
                status=status.HTTP_404_NOT_FOUND
            )
        
    @action(detail=False, methods=['get'], url_path='generate-asset-id')
    def generate_asset_id(self, request):
        today = timezone.now().strftime('%Y%m%d')
        prefix = f"AST-{today}-"
        last_asset = Asset.objects.filter(asset_id__startswith=prefix).order_by('-asset_id').first()

        if last_asset:
            try:
                seq = int(last_asset.asset_id.split('-')[2]) + 1
            except:
                seq = 1
        else:
            seq = 1

        random_suffix = uuid.uuid4().hex[:4].upper()
        new_id = f"{prefix}{seq:05d}-{random_suffix}"

        return Response({"asset_id": new_id})
    
    # assets/{asset_id}/update-status/
    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Update asset status with validation based on checkout state.
        Expects: { "status": <id>, "isCheckout": <bool> }
        - If isCheckout=true: status type must be 'deployed'
        - If isCheckout=false: status type must be 'deployable', 'undeployable', 'pending', or 'archived'
        """
        VALID_CHECKIN_STATUS_TYPES = ['deployable', 'undeployable', 'pending', 'archived']

        try:
            asset = Asset.objects.get(pk=pk, is_deleted=False)
        except Asset.DoesNotExist:
            return Response(
                {"detail": "Asset not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        status_id = request.data.get('status')
        is_checkout = request.data.get('isCheckout', False)

        if not status_id:
            return Response(
                {"status": "Status is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch and validate status from Contexts service
        from assets_ms.services.contexts import get_status_by_id
        status_details = get_status_by_id(status_id)

        if not status_details or status_details.get("warning"):
            return Response(
                {"status": "Status not found."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Must be 'asset' category
        status_category = status_details.get("category")
        if status_category != "asset":
            return Response(
                {"status": "Invalid status. Only asset statuses are allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate type based on isCheckout
        status_type = status_details.get("type")
        if is_checkout:
            if status_type != "deployed":
                return Response(
                    {"status": "Invalid status type for checkout. Must be 'deployed'."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            if status_type not in VALID_CHECKIN_STATUS_TYPES:
                return Response(
                    {"status": f"Invalid status type. Allowed types: {', '.join(VALID_CHECKIN_STATUS_TYPES)}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update asset status
        asset.status = status_id
        asset.save(update_fields=['status'])

        # Invalidate cache
        self.invalidate_asset_cache(asset.id)

        serializer = self.get_serializer(asset)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # Asset names for bulk edit
    @action(detail=False, methods=["get"], url_path='names')
    def names(self, request):
        """
        Return assets with only id, asset_id, name, and image.
        Optional query param: ?ids=1,2,3 or ?search=keyword
        """
        ids_param = request.query_params.get("ids")
        search = request.query_params.get("search")
        queryset = self.get_queryset()

        # Filter by IDs if provided
        if ids_param:
            try:
                ids = [int(i) for i in ids_param.split(",") if i.strip().isdigit()]
                queryset = queryset.filter(id__in=ids)
            except ValueError:
                return Response({"detail": "Invalid IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        if search:
            queryset = queryset.filter(name__icontains=search)

        # Don't cache search results - they need to be real-time for clone name generation
        if search:
            serializer = AssetNameSerializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)

        # Build a cache key specific for this set of IDs
        cache_key = "assets:names"
        if ids_param:
            cache_key += f":{','.join(map(str, ids))}"

        return self.cached_response(
            cache_key,
            queryset,
            AssetNameSerializer,
            many=True,
            context={'request': request}
        )
    
    # Bulk edit
    @action(detail=False, methods=["patch"], url_path='bulk-edit')
    def bulk_edit(self, request):
        """
        Bulk edit multiple assets.
        Payload (JSON):
        {
            "ids": [1, 2, 3],
            "data": {
                "status": 5,
                "supplier": 2,
                "location": 3,
                "notes": "Updated in bulk"
            }
        }
        Or FormData with 'ids' (JSON string), 'data' (JSON string), and optional 'image' file.
        Only non-empty fields will be updated.
        """
        import json
        from django.core.files.base import ContentFile

        # Handle both JSON and FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            ids_raw = request.data.get("ids", "[]")
            data_raw = request.data.get("data", "{}")
            try:
                ids = json.loads(ids_raw) if isinstance(ids_raw, str) else ids_raw
                update_data = json.loads(data_raw) if isinstance(data_raw, str) else data_raw
            except json.JSONDecodeError:
                return Response({"detail": "Invalid JSON in ids or data."}, status=status.HTTP_400_BAD_REQUEST)

            uploaded_image = request.FILES.get("image")
            if uploaded_image:
                image_content = uploaded_image.read()
                image_name = uploaded_image.name
            else:
                image_content = None
                image_name = None
            remove_image = request.data.get("remove_image") == "true"
        else:
            ids = request.data.get("ids", [])
            update_data = request.data.get("data", {})
            image_content = None
            image_name = None
            remove_image = False

        if not ids:
            return Response({"detail": "No IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Remove blank values so they won't overwrite existing fields
        safe_data = {k: v for k, v in update_data.items() if v not in [None, "", [], {}]}

        # Check if there's anything to update (fields, image, or remove_image)
        has_field_updates = bool(safe_data)
        has_image_update = image_content is not None or remove_image

        if not has_field_updates and not has_image_update:
            return Response(
                {"detail": "No valid fields to update."},
                status=status.HTTP_400_BAD_REQUEST
            )

        assets = Asset.objects.filter(id__in=ids, is_deleted=False)
        updated, failed = [], []

        # Check if name is being updated for multiple assets
        base_name = safe_data.get("name")
        has_name_update = base_name is not None and len(ids) > 1

        # Process each asset
        for index, asset in enumerate(assets):
            # Create asset-specific data with unique name suffix if needed
            asset_data = safe_data.copy()
            if has_name_update:
                asset_data["name"] = f"{base_name} ({index + 1})"

            serializer = AssetSerializer(
                asset,
                data=asset_data,
                partial=True
            )

            if serializer.is_valid():
                instance = serializer.save()

                # Handle image update
                if image_content:
                    instance.image.save(image_name, ContentFile(image_content), save=True)
                elif remove_image and instance.image:
                    instance.image.delete(save=False)
                    instance.image = None
                    instance.save()

                updated.append(asset.id)
                cache.delete(f"assets:detail:{asset.id}")
            else:
                failed.append({
                    "id": asset.id,
                    "errors": serializer.errors
                })

        cache.delete("assets:list")
        cache.delete("assets:names")

        return Response({
            "updated": updated,
            "failed": failed
        })

    # Bulk delete
    @action(detail=False, methods=["post"], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        Soft delete multiple assets by IDs.
        Expects payload: { "ids": [1, 2, 3] }
        """
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"detail": "No IDs provided."}, status=status.HTTP_400_BAD_REQUEST)

        assets = Asset.objects.filter(id__in=ids, is_deleted=False)
        failed = []

        for asset in assets:
            try:
                self.perform_destroy(asset)
            except ValidationError as e:
                failed.append({"id": asset.id, "error": str(e.detail)})
        
        cache.delete("assets:list")

        if failed:
            return Response({
                "detail": "Some assets could not be deleted.",
                "failed": failed
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Assets deleted successfully."}, status=status.HTTP_200_OK)

class AssetCheckoutViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == "list":
            return AssetCheckoutListSerializer
        return AssetCheckoutSerializer

    def get_queryset(self):
        # All checkouts (excluding deleted assets)
        return AssetCheckout.objects.select_related('asset').filter(
            asset__is_deleted=False
        ).order_by('-checkout_date')
    
    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Use /checkout-with-status/ to create checkouts."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Hard delete not allowed. Use soft delete."},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def active(self, request):
        """List only active checkouts (not yet checked in)"""
        queryset = AssetCheckout.objects.select_related('asset').filter(
            asset_checkin__isnull=True,
            asset__is_deleted=False
        ).order_by('-checkout_date')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='checkout-with-status')
    def checkout_with_status(self, request):
        """
        Atomically create check-out, update asset status, and resolve ticket.
        Serializer handles all validations and ticket-to-checkout data mapping.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        status_id = request.data.get("status")

        try:
            with transaction.atomic():
                # 1. Create checkout (serializer handles validations, data mapping, file attachments)
                checkout = serializer.save()

                # 2. Update asset status
                asset = checkout.asset
                asset.status = status_id
                asset.save(update_fields=["status"])

                # 3. Resolve the ticket that triggered this checkout
                ticket_id = checkout.ticket_id
                resolve_ticket(ticket_id, asset_checkout_id=checkout.id)

                # 4. Resolve overlapping tickets for the same asset
                self._resolve_overlapping_tickets(checkout, ticket_id)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Invalidate cache
        cache.delete(f"assets:detail:{asset.id}")

        return Response(
            {"success": "Checkout, attachments, and status update completed successfully."},
            status=status.HTTP_201_CREATED
        )

    def _resolve_overlapping_tickets(self, checkout, current_ticket_id):
        """Resolve other unresolved tickets that overlap with this checkout period."""
        asset_id = checkout.asset.id
        unresolved_tickets = fetch_resource_list(
            f"tickets/by-asset/{asset_id}",
            params={"is_resolved": False}
        )

        if isinstance(unresolved_tickets, dict):
            tickets = unresolved_tickets.get('results', [])
        elif isinstance(unresolved_tickets, list):
            tickets = unresolved_tickets
        else:
            tickets = []

        current_start = checkout.checkout_date
        current_end = checkout.return_date

        if isinstance(current_start, str):
            current_start = datetime.strptime(current_start, "%Y-%m-%d").date()
        if isinstance(current_end, str):
            current_end = datetime.strptime(current_end, "%Y-%m-%d").date()

        for t in tickets:
            if t["id"] == current_ticket_id:
                continue

            if not t.get("checkout_date") or not t.get("return_date"):
                continue

            ticket_start = datetime.strptime(t["checkout_date"], "%Y-%m-%d").date()
            ticket_end = datetime.strptime(t["return_date"], "%Y-%m-%d").date()

            if ticket_start <= current_end and current_start <= ticket_end:
                resolve_ticket(t["id"])

class AssetCheckinViewSet(viewsets.ModelViewSet):
    serializer_class = AssetCheckinSerializer

    def get_queryset(self):
        return AssetCheckin.objects.select_related('asset_checkout', 'asset_checkout__asset').order_by('-checkin_date')
    
    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Use /checkin-with-status/ to create checkins."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Hard delete not allowed. Use soft delete."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['post'], url_path='checkin-with-status')
    def checkin_with_status(self, request):
        """
        Atomically create check-in, attach files, and update asset status.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        status_id = request.data.get("status")

        try:
            with transaction.atomic():
                # Create check-in (serializer handles file attachments)
                checkin = serializer.save()

                # Update asset status
                asset = checkin.asset_checkout.asset

                # Validate status type
                from assets_ms.services.contexts import get_status_by_id
                status_details = get_status_by_id(status_id)

                if not status_details:
                    raise ValueError("Status not found.")

                VALID_CHECKIN_STATUS_TYPES = ['deployable', 'undeployable', 'pending', 'archived']
                
                status_type = status_details.get("type")
                if status_type not in VALID_CHECKIN_STATUS_TYPES:
                    raise ValueError(f"Invalid status type for check-in: {status_type}")
                
                # Update asset status if valid
                asset.status = status_id
                asset.save(update_fields=["status"])

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Invalidate cache
        cache.delete(f"assets:detail:{asset.id}")

        # Resolve ticket (optional, outside transaction)
        ticket_id = request.data.get("ticket_id")
        if ticket_id:
            try:
                resolve_ticket(ticket_id, asset_checkin_id=checkin.id)
            except Exception:
                pass

        return Response({"success": "Check-in, attachments, and status update completed successfully."}, status=status.HTTP_201_CREATED)

class ComponentViewSet(viewsets.ModelViewSet):
    serializer_class = ComponentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Component.objects.filter(is_deleted=False).order_by('name')
    def get_queryset(self):
        queryset = Component.objects.filter(is_deleted=False).order_by('name')
        if self.request.query_params.get('show_deleted') == 'true':
            queryset = Component.objects.filter(is_deleted=True).order_by('name')
        return queryset

    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """List all soft-deleted components"""
        components = Component.objects.filter(is_deleted=True).order_by('name')
        serializer = self.get_serializer(components, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def recover(self, request, pk=None):
        """Recover a soft-deleted component"""
        try:
            component = Component.objects.get(pk=pk, is_deleted=True)
            component.is_deleted = False
            component.save()
            serializer = self.get_serializer(component)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Component.DoesNotExist:
            return Response(
                {"detail": "Component not found or already active."},
                status=status.HTTP_404_NOT_FOUND
            )

    def perform_destroy(self, instance):
        # Check if the component has an active checkout (no checkin yet)
        if instance.component_checkouts.filter(component_checkins__isnull=True).exists():
            raise ValidationError({ "detail": "Cannot delete this component, it's currently checked out." })

        # Otherwise, perform soft delete
        instance.is_deleted = True
        instance.save()

        # Log activity
        log_component_activity(
            action='Delete',
            component=instance,
            notes=f"Component '{instance.name}' deleted"
        )

    def perform_create(self, serializer):
        component = serializer.save()

        # Log activity
        log_component_activity(
            action='Create',
            component=component,
            notes=f"Component '{component.name}' created"
        )

    def perform_update(self, serializer):
        component = serializer.save()

        # Log activity
        log_component_activity(
            action='Update',
            component=component,
            notes=f"Component '{component.name}' updated"
        )

class ComponentCheckoutViewSet(viewsets.ModelViewSet):
    serializer_class = ComponentCheckoutSerializer

    def get_queryset(self):
        # Only checkouts that have NOT been checked in
        return ComponentCheckout.objects.select_related('component', 'asset').filter(
            component_checkins__isnull=True
        ).order_by('-checkout_date')

    def perform_create(self, serializer):
        checkout = serializer.save()
        component = checkout.component

        # Log activity
        target_name = checkout.asset.name if checkout.asset else ''
        log_component_activity(
            action='Checkout',
            component=component,
            notes=f"Component '{component.name}' checked out to asset '{target_name}'"
        )

class ComponentCheckinViewSet(viewsets.ModelViewSet):
    serializer_class = ComponentCheckinSerializer

    def perform_create(self, serializer):
        checkin = serializer.save()
        checkout = checkin.component_checkout
        component = checkout.component

        # Log activity
        target_name = checkout.asset.name if checkout.asset else ''
        log_component_activity(
            action='Checkin',
            component=component,
            notes=f"Component '{component.name}' checked in from asset '{target_name}'"
        )

    def get_queryset(self):
        return ComponentCheckin.objects.select_related('component_checkout', 'component_checkout__component').order_by('-checkin_date')

class AuditScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = AuditScheduleSerializer

    def get_queryset(self):
        return AuditSchedule.objects.filter(is_deleted=False).order_by('date')

    def perform_destroy(self, instance):
        # Check if the schedule already has an audit
        if hasattr(instance, 'audit') and instance.audit is not None and not instance.audit.is_deleted:
            raise ValidationError({
                "detail": "Cannot delete this audit schedule because it has already been audited."
            })

        # Otherwise, perform soft delete
        instance.is_deleted = True
        instance.save()

        # Log activity
        log_audit_activity(
            action='Delete',
            audit_or_schedule=instance,
            notes=f"Audit schedule deleted"
        )

    def perform_create(self, serializer):
        schedule = serializer.save()

        # Log activity
        log_audit_activity(
            action='Schedule',
            audit_or_schedule=schedule,
            notes=f"Audit scheduled for {schedule.date}"
        )

    def perform_update(self, serializer):
        schedule = serializer.save()

        # Log activity
        log_audit_activity(
            action='Update',
            audit_or_schedule=schedule,
            notes=f"Audit schedule updated"
        )

    @action(detail=False, methods=['get'])
    def scheduled(self, request):
        """Future audits not yet completed"""
        today = now().date()
        qs = AuditSchedule.objects.filter(
            is_deleted=False,
            date__gt=today
        ).exclude(audit__isnull=False)
        serializer = AuditScheduleSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def due(self, request):
        """Audits due today or earlier, not yet completed"""
        today = now().date()
        qs = AuditSchedule.objects.filter(
            is_deleted=False,
            date__lte=today,
            audit__isnull=True
        )
        serializer = AuditScheduleSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Audits past due dates, not yet completed"""
        today = now().date()
        qs = AuditSchedule.objects.filter(
            is_deleted=False,
            date__lt=today,
            audit__isnull=True
        )
        serializer = AuditScheduleSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Return schedules with their completed audit"""
        qs = AuditSchedule.objects.filter(
            is_deleted=False,
            audit__isnull=False,  # only schedules that have an audit
            audit__is_deleted=False
        )
        serializer = CompletedAuditSerializer(qs, many=True)
        return Response(serializer.data)

class AuditViewSet(viewsets.ModelViewSet):
    serializer_class = AuditSerializer

    def get_queryset(self):
        return Audit.objects.filter(is_deleted=False).order_by('-created_at')

    def perform_create(self, serializer):
        audit = serializer.save()

        # Log activity - when an audit is created, it means the audit was completed
        log_audit_activity(
            action='Create',
            audit_or_schedule=audit,
            notes=f"Audit completed on {audit.audit_date}"
        )

    def perform_update(self, serializer):
        audit = serializer.save()

        # Log activity
        log_audit_activity(
            action='Update',
            audit_or_schedule=audit,
            notes=f"Audit updated"
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

        # Log activity
        log_audit_activity(
            action='Delete',
            audit_or_schedule=instance,
            notes=f"Audit deleted"
        )

class AuditFileViewSet(viewsets.ModelViewSet):
    serializer_class = AuditFileSerializer

    def get_queryset(self):
        return AuditFile.objects.filter(is_deleted=False)

class RepairViewSet(viewsets.ModelViewSet):
    serializer_class = RepairSerializer

    def get_queryset(self):
        return Repair.objects.filter(is_deleted=False).order_by('-id')

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

        # Log activity
        log_repair_activity(
            action='Delete',
            repair=instance,
            notes=f"Repair '{instance.name}' deleted"
        )

    def perform_create(self, serializer):
        repair = serializer.save()

        # Log activity
        log_repair_activity(
            action='Create',
            repair=repair,
            notes=f"Repair '{repair.name}' created"
        )

    def perform_update(self, serializer):
        repair = serializer.save()

        # Log activity
        log_repair_activity(
            action='Update',
            repair=repair,
            notes=f"Repair '{repair.name}' updated"
        )

    @action(detail=True, methods=['patch'])
    def soft_delete(self, request, pk=None):
        """Soft delete a repair."""
        try:
            repair = self.get_object()
            repair.is_deleted = True
            repair.save()

            # Log activity
            log_repair_activity(
                action='Delete',
                repair=repair,
                notes=f"Repair '{repair.name}' soft-deleted"
            )

            return Response({'detail': 'Repair soft-deleted'}, status=status.HTTP_200_OK)
        except Repair.DoesNotExist:
            return Response({'detail': 'Repair not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def create_repair_file(self, request):
        """Create a repair file."""
        serializer = RepairFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def soft_delete_repair_file(self, request, pk=None):
        """Soft delete a repair file by ID."""
        try:
            repair_file = RepairFile.objects.get(pk=pk, is_deleted=False)
            repair_file.is_deleted = True
            repair_file.save()
            return Response({'detail': 'Repair file soft-deleted'}, status=status.HTTP_200_OK)
        except RepairFile.DoesNotExist:
            return Response({'detail': 'Repair file not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'])
    def soft_delete_repair_files_by_repair(self, request, pk=None):
        """Soft delete all repair files by repair ID."""
        repair_files = RepairFile.objects.filter(repair=pk, is_deleted=False)
        if not repair_files.exists():
            return Response({'detail': 'Repair files not found'}, status=status.HTTP_404_NOT_FOUND)
        repair_files.update(is_deleted=True)
        return Response({'detail': 'Repair files soft-deleted'}, status=status.HTTP_200_OK)
# END REPAIR

#USAGE CHECK
@api_view(['GET'])
def check_supplier_usage(request, pk):
    """
    Check if supplier is referenced by any active asset, product, component, or repair.
    """
    in_use = (
        Asset.objects.filter(supplier=pk, is_deleted=False).exists()
        or Component.objects.filter(supplier=pk, is_deleted=False).exists()
        or Product.objects.filter(is_deleted=False).filter(
            manufacturer=pk
        ).exists()  # some products may use manufacturer ID equal to supplier if reused
        or Repair.objects.filter(supplier_id=pk, is_deleted=False).exists()
    )
    return Response({"in_use": in_use})


@api_view(['GET'])
def check_manufacturer_usage(request, pk):
    """
    Check if manufacturer is referenced by any active asset, product, or component.
    """
    in_use = (
        Asset.objects.filter(product__manufacturer=pk, is_deleted=False).exists()
        or Component.objects.filter(manufacturer=pk, is_deleted=False).exists()
        or Product.objects.filter(manufacturer=pk, is_deleted=False).exists()
    )
    return Response({"in_use": in_use})


@api_view(['GET'])
def check_depreciation_usage(request, pk):
    """
    Check if depreciation is referenced by any active product or asset.
    """
    in_use = (
        Product.objects.filter(depreciation=pk, is_deleted=False).exists()
        or Asset.objects.filter(product__depreciation=pk, is_deleted=False).exists()
    )
    return Response({"in_use": in_use})
#END
from .api.usage import check_bulk_usage


#DASHBOARD
class DashboardViewSet(viewsets.ViewSet):

    def list(self, request):
        """List available dashboard endpoints"""
        return Response({
            "available_endpoints": {
                "metrics": request.build_absolute_uri() + "metrics/"
            }
        })
    # /dashboard/metrics
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        today = now().date()
        next_30_days = today + timedelta(days=30)

        # Assets due for return
        due_for_return = AssetCheckout.objects.filter(return_date__gte=today).count()
        overdue_for_return = AssetCheckout.objects.filter(return_date__lt=today).count()

        # Audits - need to check if these models exist
        try:
            upcoming_audits = AuditSchedule.objects.filter(date__gt=today, date__lte=next_30_days).count()
            overdue_audits = AuditSchedule.objects.filter(date__lt=today).count()
        except:
            upcoming_audits = 0
            overdue_audits = 0

        # Remove end_of_life references since field doesn't exist
        reached_end_of_life = 0
        upcoming_end_of_life = 0

        # Warranties
        expired_warranties = Asset.objects.filter(warranty_expiration__lte=today).count()
        expiring_warranties = Asset.objects.filter(warranty_expiration__gt=today, warranty_expiration__lte=next_30_days).count()

        # Low stock
        low_stock = Component.objects.annotate(
            total_checked_out=Coalesce(Sum('component_checkouts__quantity'), Value(0)),
            total_checked_in=Coalesce(Sum('component_checkouts__component_checkins__quantity'), Value(0)),
            available_quantity=F('quantity') - (F('total_checked_out') - F('total_checked_in'))
        ).filter(
            available_quantity__lt=F('minimum_quantity')
        ).count()

        data = {
            "due_for_return": due_for_return,
            "overdue_for_return": overdue_for_return,
            "upcoming_audits": upcoming_audits,
            "overdue_audits": overdue_audits,
            "reached_end_of_life": reached_end_of_life,
            "upcoming_end_of_life": upcoming_end_of_life,
            "expired_warranties": expired_warranties,
            "expiring_warranties": expiring_warranties,
            "low_stock": low_stock
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)


# ASSET REPORT TEMPLATES
class AssetReportTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for CRUD operations on AssetReportTemplate."""
    serializer_class = AssetReportTemplateSerializer

    def get_queryset(self):
        """Return non-deleted templates, optionally filtered by user_id."""
        queryset = AssetReportTemplate.objects.filter(is_deleted=False)
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset.order_by('-created_at')

    def perform_destroy(self, instance):
        """Soft delete the template."""
        instance.is_deleted = True
        instance.save()

    @action(detail=False, methods=['get'])
    def my_templates(self, request):
        """List templates for a specific user (via query param user_id)."""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {"detail": "user_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        templates = AssetReportTemplate.objects.filter(
            user_id=user_id,
            is_deleted=False
        ).order_by('-created_at')
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)
