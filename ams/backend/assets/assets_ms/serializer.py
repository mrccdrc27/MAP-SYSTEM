from rest_framework import serializers
from assets_ms.services.contexts import *
from assets_ms.services.integration_help_desk import *
from assets_ms.services.integration_ticket_tracking import *
from .models import *
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime

# Product

# Serializer for product list view
class ProductListSerializer(serializers.ModelSerializer):
    category_details = serializers.SerializerMethodField()
    manufacturer_details = serializers.SerializerMethodField()
    depreciation_details = serializers.SerializerMethodField()
    default_supplier_details = serializers.SerializerMethodField()
    has_assets = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'image', 'name', 'category_details', 'model_number', 'end_of_life',
            'manufacturer_details', 'depreciation_details', 'default_purchase_cost',
            'default_supplier_details', 'minimum_quantity', 'has_assets'
        ]

    def get_has_assets(self, obj):
        return obj.product_assets.filter(is_deleted=False).exists()

    def get_category_details(self, obj):
        return self.context.get("category_map", {}).get(obj.category)

    def get_manufacturer_details(self, obj):
        return self.context.get("manufacturer_map", {}).get(obj.manufacturer)

    def get_depreciation_details(self, obj):
        return self.context.get("depreciation_map", {}).get(obj.depreciation)

    def get_default_supplier_details(self, obj):
        return self.context.get("supplier_map", {}).get(obj.default_supplier)

# Serializer for product create, update, and destroy
class ProductSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Product
        fields = '__all__'
    
    # Check for products with the same name that has is_deleted=False
    # Safe registration for API requests
    # Case sensitive
    # Ignore leading/trailing spaces and multiple internal spaces
    def validate(self, data):
        name = data.get('name')
        instance = self.instance

        if name:
            # Normalize spacing and apply Title Case for consistent storage and comparisons
            normalized_name = " ".join(name.split()).strip().title()
            # Keep "(clone)" lowercase
            normalized_name = normalized_name.replace("(Clone)", "(clone)")
            data['name'] = normalized_name
        else:
            normalized_name = None

        if normalized_name and Product.objects.filter(
            name__iexact=normalized_name,
            is_deleted=False
        ).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError({
                "name": "An asset model with this name already exists."
            })

        return data

# Serializer for product instance retrieve
class ProductInstanceSerializer(serializers.ModelSerializer):
    category_details = serializers.SerializerMethodField()
    manufacturer_details = serializers.SerializerMethodField()
    depreciation_details = serializers.SerializerMethodField()
    default_supplier_details = serializers.SerializerMethodField()
    assets = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_has_assets(self, obj):
        return obj.product_assets.filter(is_deleted=False).exists()

    def get_category_details(self, obj):
        return self.context.get("category_map", {}).get(obj.category)

    def get_manufacturer_details(self, obj):
        return self.context.get("manufacturer_map", {}).get(obj.manufacturer)

    def get_depreciation_details(self, obj):
        return self.context.get("depreciation_map", {}).get(obj.depreciation)

    def get_default_supplier_details(self, obj):
        return self.context.get("supplier_map", {}).get(obj.default_supplier)

    def get_assets(self, obj):
        assets = obj.product_assets.filter(is_deleted=False).order_by('name')

        # Reuse full list serializer
        serializer = AssetListSerializer(
            assets,
            many=True,
            context=self.context   # pass context so ticket/status mappings work
        )
        return serializer.data
# Serializer for filling data in asset registration that is default in product
class ProductAssetRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'default_purchase_cost', 'default_supplier']

# Serializer for product bulk edit selected items
class ProductNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'image' , 'name', 'end_of_life']

# Asset
class AssetListSerializer(serializers.ModelSerializer):
    status_details = serializers.SerializerMethodField()
    product_details = serializers.SerializerMethodField()
    ticket_details = serializers.SerializerMethodField()
    active_checkout = serializers.SerializerMethodField()
    class Meta:
        model = Asset
        fields = [
            'id', 'image', 'asset_id', 'name', 'serial_number',
            'status_details', 'warranty_expiration',
            'product_details', 'ticket_details', 'active_checkout'
        ]

    def get_status_details(self, obj):
        return self.context.get("status_map", {}).get(obj.status)

    def get_product_details(self, obj):
        return self.context.get("product_map", {}).get(obj.product_id)
    
    def get_ticket_details(self, obj):
        return self.context.get("ticket_map", {}).get(obj.id)
    
    def get_active_checkout(self, obj):
        checkout = obj.asset_checkouts.filter(asset_checkin__isnull=True).first()
        return checkout.id if checkout else None
    
class AssetSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Asset
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make asset_id read-only on update (editable only on create)
        if self.instance:
            self.fields['asset_id'].read_only = True

    def validate(self, data):
        product = data.get('product')
        name = data.get('name')
        status_id = data.get('status')
        instance = self.instance

        # Check if product is deleted
        if product and product.is_deleted:
            raise serializers.ValidationError({"product": "Cannot check out a deleted product."})

        # Validate status category - must be 'asset' category
        if status_id:
            status_details = get_status_by_id(status_id)
            if not status_details or status_details.get("warning"):
                raise serializers.ValidationError({"status": "Status not found."})

            status_category = status_details.get("category")
            if status_category != "asset":
                raise serializers.ValidationError({
                    "status": "Invalid status. Only asset statuses are allowed for assets."
                })

        if name:
            # Normalize spacing and apply Title Case
            normalized_name = " ".join(name.split()).strip().title()
            # Keep "(clone)" lowercase
            normalized_name = normalized_name.replace("(Clone)", "(clone)")
            data['name'] = normalized_name
        else:
            normalized_name = None

        if normalized_name and Asset.objects.filter(
            name__iexact=normalized_name,
            is_deleted=False
        ).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError({
                "name": "An asset with this name already exists."
            })

        return data

class AssetInstanceSerializer(serializers.ModelSerializer):
    status_details = serializers.SerializerMethodField()
    ticket_details = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()
    components = serializers.SerializerMethodField()
    repairs = serializers.SerializerMethodField()
    audits = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = '__all__'

    def get_status_details(self, obj):
        return self.context.get("status_map", {}).get(obj.status)

    def get_ticket_details(self, obj):
        return self.context.get("ticket_map", {}).get(obj.id)

    def get_history(self, obj):
        """
        Returns checkout/checkin history.
        Active checkout on top, then checkout/checkin pairs ordered by recent checkin.
        """
        history = []
        # Get all checkouts, active first (no checkin), then by checkin date desc
        checkouts = obj.asset_checkouts.all().select_related('asset_checkin').prefetch_related(
            'files', 'asset_checkin__files'
        ).order_by('asset_checkin', '-created_at')

        for checkout in checkouts:
            # Add checkout entry
            checkout_files = [{
                'id': f.id,
                'file': f.file.url if f.file else None,
                'from': 'asset_checkout'
            } for f in checkout.files.filter(is_deleted=False)]

            history.append({
                'type': 'checkout',
                'id': checkout.id,
                'ticket_id': checkout.ticket_id,
                'checkout_to': checkout.checkout_to,
                'location': checkout.location,
                'checkout_date': checkout.checkout_date,
                'return_date': checkout.return_date,
                'condition': checkout.condition,
                'revenue': str(checkout.revenue) if checkout.revenue else None,
                'notes': checkout.notes,
                'created_at': checkout.created_at,
                'files': checkout_files,
                'is_active': not hasattr(checkout, 'asset_checkin') or checkout.asset_checkin is None
            })

            # Add checkin entry if exists
            try:
                checkin = checkout.asset_checkin
                if checkin:
                    checkin_files = [{
                        'id': f.id,
                        'file': f.file.url if f.file else None,
                        'from': 'asset_checkin'
                    } for f in checkin.files.filter(is_deleted=False)]

                    history.append({
                        'type': 'checkin',
                        'id': checkin.id,
                        'checkout_id': checkout.id,
                        'ticket_id': checkin.ticket_id,
                        'checkin_date': checkin.checkin_date,
                        'condition': checkin.condition,
                        'notes': checkin.notes,
                        'files': checkin_files
                    })
            except AssetCheckin.DoesNotExist:
                pass

        return history

    def get_components(self, obj):
        """
        Returns components checked out to this asset with their checkin history.
        """
        components = []
        # Get component checkouts where this asset is the target
        component_checkouts = ComponentCheckout.objects.filter(asset=obj).select_related(
            'component'
        ).prefetch_related('component_checkins').order_by('-checkout_date')

        for checkout in component_checkouts:
            checkins = [{
                'id': ci.id,
                'checkin_date': ci.checkin_date,
                'quantity': ci.quantity,
                'notes': ci.notes
            } for ci in checkout.component_checkins.all().order_by('-checkin_date')]

            components.append({
                'id': checkout.id,
                'component_id': checkout.component.id,
                'component_name': checkout.component.name,
                'quantity': checkout.quantity,
                'checkout_date': checkout.checkout_date,
                'notes': checkout.notes,
                'remaining_quantity': checkout.remaining_quantity,
                'is_fully_returned': checkout.is_fully_returned,
                'checkins': checkins
            })

        return components

    def get_repairs(self, obj):
        """
        Returns repairs for this asset with files.
        """
        repairs = []
        for repair in obj.repair_assets.filter(is_deleted=False).order_by('-start_date'):
            repair_files = [{
                'id': f.id,
                'file': f.file.url if f.file else None,
                'from': 'repair'
            } for f in repair.files.filter(is_deleted=False)]

            repairs.append({
                'id': repair.id,
                'supplier_id': repair.supplier_id,
                'type': repair.type,
                'name': repair.name,
                'start_date': repair.start_date,
                'end_date': repair.end_date,
                'cost': str(repair.cost) if repair.cost else None,
                'notes': repair.notes,
                'files': repair_files
            })

        return repairs

    def get_audits(self, obj):
        """
        Returns completed audits for this asset with files.
        """
        audits = []
        # Get audit schedules that have been completed (have an audit)
        for schedule in obj.audit_schedules.filter(is_deleted=False).select_related('audit').prefetch_related('audit__audit_files').order_by('-date'):
            try:
                audit = schedule.audit
                if audit and not audit.is_deleted:
                    audit_files = [{
                        'id': f.id,
                        'file': f.file.url if f.file else None,
                        'from': 'audit'
                    } for f in audit.audit_files.filter(is_deleted=False)]

                    audits.append({
                        'id': audit.id,
                        'schedule_id': schedule.id,
                        'scheduled_date': schedule.date,
                        'audit_date': audit.audit_date,
                        'location': audit.location,
                        'user_id': audit.user_id,
                        'notes': audit.notes,
                        'created_at': audit.created_at,
                        'files': audit_files
                    })
            except Audit.DoesNotExist:
                pass

        return audits

# Serializer for asset bulk edit selected items
class AssetNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ['id', 'asset_id', 'name', 'image']

class AssetCheckoutFileSerializer(serializers.ModelSerializer):
    file_from = serializers.CharField(default="asset_checkout", read_only=True)

    class Meta:
        model = AssetCheckoutFile
        fields = '__all__'

class AssetCheckoutListSerializer(serializers.ModelSerializer):
    """Read-only serializer for checkout details in asset instance view."""
    files = AssetCheckoutFileSerializer(many=True, read_only=True)

    class Meta:
        model = AssetCheckout
        fields = '__all__'

class AssetCheckoutSerializer(serializers.ModelSerializer):
    # These fields are populated from ticket data, not from form input
    asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all(), required=False)
    checkout_to = serializers.IntegerField(required=False)
    location = serializers.IntegerField(required=False)
    checkout_date = serializers.DateField(required=False)
    return_date = serializers.DateField(required=False)

    class Meta:
        model = AssetCheckout
        fields = '__all__'

    def validate(self, data):
        ticket_id = data.get('ticket_id')
        status_id = data.get('status') or self.context.get('request').data.get('status')

        # --- Ticket Validations ---
        if not ticket_id:
            raise serializers.ValidationError({"ticket_id": "A ticket is required to check out this asset."})

        ticket = get_ticket_by_id(ticket_id)
        if not ticket or ticket.get("warning"):
            raise serializers.ValidationError({"ticket_id": "Ticket not found."})

        if ticket.get("is_resolved", False):
            raise serializers.ValidationError({"ticket_id": "Ticket is already resolved."})

        # --- Asset Validations (from ticket) ---
        asset_id = ticket.get('asset')
        if not asset_id:
            raise serializers.ValidationError({"asset": "Ticket has no asset assigned."})

        try:
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            raise serializers.ValidationError({"asset": "Asset not found."})

        if asset.is_deleted:
            raise serializers.ValidationError({"asset": "Cannot check out a deleted asset."})

        if AssetCheckout.objects.filter(asset=asset, asset_checkin__isnull=True).exists():
            raise serializers.ValidationError({
                "asset": "This asset is already checked out and not yet checked in."
            })

        # --- Status Validations ---
        if not status_id:
            raise serializers.ValidationError({"status": "Status is required for checkout."})

        status_details = get_status_by_id(status_id)
        if not status_details or status_details.get("warning"):
            raise serializers.ValidationError({"status": "Status not found."})

        if status_details.get("category") != "asset":
            raise serializers.ValidationError({
                "status": "Invalid status. Only asset statuses are allowed for checkout."
            })

        if status_details.get("type") != "deployed":
            raise serializers.ValidationError({
                "status": "Invalid status type for checkout. Must be 'deployed'."
            })

        # --- Date Validations (from ticket) ---
        checkout_date = ticket.get('checkout_date')
        return_date = ticket.get('return_date')
        if checkout_date and return_date:
            if isinstance(checkout_date, str):
                checkout_date = datetime.strptime(checkout_date, "%Y-%m-%d").date()
            if isinstance(return_date, str):
                return_date = datetime.strptime(return_date, "%Y-%m-%d").date()
            if return_date < checkout_date:
                raise serializers.ValidationError({
                    "return_date": "Return date cannot be before checkout date."
                })

        # Store ticket data for create method
        data['_ticket'] = ticket

        return data

    def create(self, validated_data):
        # Pop internal data
        ticket = validated_data.pop('_ticket')
        files_data = validated_data.pop('files', [])

        # Enforce values from ticket (backend sets these, not form)
        validated_data['ticket_id'] = ticket.get('id')
        validated_data['asset_id'] = ticket.get('asset')
        validated_data['checkout_to'] = ticket.get('employee')
        validated_data['location'] = ticket.get('location')
        validated_data['checkout_date'] = ticket.get('checkout_date')
        validated_data['return_date'] = ticket.get('return_date')

        # Form data already in validated_data: condition, revenue, notes

        checkout = super().create(validated_data)

        # Handle file attachments
        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            files = request.FILES.getlist('attachments') or request.FILES.getlist('image')
            for f in files:
                AssetCheckoutFile.objects.create(asset_checkout=checkout, file=f)

        for file_dict in files_data:
            AssetCheckoutFile.objects.create(asset_checkout=checkout, **file_dict)

        return checkout

class AssetCheckinFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCheckinFile
        fields = '__all__'

class AssetCheckinSerializer(serializers.ModelSerializer):
    files = AssetCheckinFileSerializer(many=True, required=False)

    class Meta:
        model = AssetCheckin
        fields = '__all__'

    def validate(self, data):
        checkout = data.get('asset_checkout')
        checkin_date = data.get('checkin_date', timezone.now())
        ticket_id = data.get('ticket_id')

        if not checkout:
            raise serializers.ValidationError({
                "asset_checkout": "Asset checkout is required."
            })

        # Prevent multiple checkins
        if AssetCheckin.objects.filter(asset_checkout=checkout).exists():
            raise serializers.ValidationError({
                "asset_checkout": "This asset has already been checked in."
            })

        # Make sure checkin happens after checkout
        if checkin_date < checkout.checkout_date:
            raise serializers.ValidationError({
                "checkin_date": "Cannot check in before checkout date."
            })

        # Optional ticket validation
        if ticket_id:
            ticket = get_ticket_by_id(ticket_id)
            if not ticket or ticket.get("warning"):
                raise serializers.ValidationError({"ticket_id": "Ticket not found."})

            if ticket.get("asset") != checkout.asset_id:
                raise serializers.ValidationError({
                    "ticket_id": "Ticket does not match this asset."
                })

        return data

    def create(self, validated_data):
        files_data = validated_data.pop('files', [])
        checkin = AssetCheckin.objects.create(**validated_data)

        # Handle files uploaded via FormData
        request = self.context.get('request')
        if request and hasattr(request, 'FILES'):
            for f in request.FILES.getlist('attachments'):  # matches your frontend key
                AssetCheckinFile.objects.create(asset_checkin=checkin, file=f)

        # Also handle nested JSON files if any
        for file_dict in files_data:
            AssetCheckinFile.objects.create(asset_checkin=checkin, **file_dict)

        return checkin

# Component
class ComponentSerializer(serializers.ModelSerializer):
    # Include context details for frontend convenience
    category_details = serializers.SerializerMethodField()
    manufacturer_details = serializers.SerializerMethodField()
    supplier_details = serializers.SerializerMethodField()
    location_details = serializers.SerializerMethodField()

    class Meta:
        model = Component
        fields = '__all__'
    
    def validate(self, data):
        name = data.get('name')
        instance = self.instance

        if name:
            # Normalize spacing and apply Title Case
            normalized_name = " ".join(name.split()).strip().title()
            data['name'] = normalized_name
        else:
            normalized_name = None

        if normalized_name and Component.objects.filter(
            name__iexact=normalized_name,
            is_deleted=False
        ).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError({
                "name": "A component with this name already exists."
            })
        
        return data

    def get_category_details(self, obj):
        try:
            if not getattr(obj, 'category', None):
                return None
            from assets_ms.services.contexts import get_category_by_id
            return get_category_by_id(obj.category)
        except Exception:
            return {"warning": "Contexts service unreachable for categories."}

    def get_manufacturer_details(self, obj):
        try:
            if not getattr(obj, 'manufacturer', None):
                return None
            from assets_ms.services.contexts import get_manufacturer_by_id
            return get_manufacturer_by_id(obj.manufacturer)
        except Exception:
            return {"warning": "Contexts service unreachable for manufacturers."}

    def get_supplier_details(self, obj):
        try:
            if not getattr(obj, 'supplier', None):
                return None
            from assets_ms.services.contexts import get_supplier_by_id
            return get_supplier_by_id(obj.supplier)
        except Exception:
            return {"warning": "Contexts service unreachable for suppliers."}

    def get_location_details(self, obj):
        try:
            if not getattr(obj, 'location', None):
                return None
            from assets_ms.services.contexts import get_location_by_id
            return get_location_by_id(obj.location)
        except Exception:
            return {"warning": "Contexts service unreachable for locations."}

class ComponentCheckoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComponentCheckout
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Allow checkout only if component still has stock
        available_components = [
            c for c in Component.objects.filter(is_deleted=False)
            if c.available_quantity > 0
        ]
        self.fields['component'].queryset = Component.objects.filter(
            id__in=[c.id for c in available_components]
        )

    def validate(self, data):
        component = data.get('component')
        quantity = data.get('quantity')

        # Check if component is deleted
        if component and component.is_deleted:
            raise serializers.ValidationError({
                "component": "Cannot check out a deleted component."
            })
        
        # Quantity validation
        if quantity <= 0:
            raise serializers.ValidationError({
                "quantity": "Quantity must be greater than zero."
            })

        # Check stock availability using the model property
        if quantity > component.available_quantity:
            raise serializers.ValidationError({
                "quantity": f"Not enough quantity available for {component.name}. "
                            f"Only {component.available_quantity} left in stock."
            })

        return data

class ComponentCheckinSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComponentCheckin
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Fetch checkouts efficiently with related component and asset
        available_checkouts = [
            checkout for checkout in ComponentCheckout.objects.select_related('component', 'asset')
            if not checkout.is_fully_returned
        ]

        # Filter queryset to include only active (not fully returned) checkouts
        self.fields['component_checkout'].queryset = ComponentCheckout.objects.filter(
            id__in=[c.id for c in available_checkouts]
        )

    def validate(self, data):
        checkout = data.get('component_checkout')
        quantity = data.get('quantity')
        checkin_date = data.get('checkin_date', timezone.now())

        # Check if checkout exists
        if not checkout:
            raise serializers.ValidationError({"component_checkout": "Checkout record is required."})
        
        # Quantity validation
        if quantity <= 0:
            raise serializers.ValidationError({"quantity": "Quantity must be greater than zero."})
        
        # Cannot check in more than remaining quantity
        if checkout and quantity > checkout.remaining_quantity:
            raise serializers.ValidationError({
                "quantity": f"Cannot check in more than remaining quantity "
                            f"({checkout.remaining_quantity})."
            })
        
        # Cannot check in before checkout date
        if checkin_date < checkout.checkout_date:
            raise serializers.ValidationError({
                "checkin_date": "Cannot check in before the checkout date."
            })

        return data

class AuditScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditSchedule
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Limit dropdown to non-deleted assets only
        self.fields['asset'].queryset = Asset.objects.filter(is_deleted=False)

    def validate(self, data):
        asset = data.get('asset')

        # Ensure asset is not deleted
        if asset and asset.is_deleted:
            raise serializers.ValidationError({
                "asset": "Cannot create an audit schedule for a deleted asset."
            })

        return data

class CompletedAuditSerializer(serializers.ModelSerializer):
    audit = serializers.SerializerMethodField()

    class Meta:
        model = AuditSchedule
        fields = '__all__'

    def get_audit(self, obj):
        """Return audit data if it exists"""
        if hasattr(obj, 'audit') and obj.audit and not obj.audit.is_deleted:
            return {
                "id": obj.audit.id,
                "location": obj.audit.location,
                "user_id": obj.audit.user_id,
                "audit_date": obj.audit.audit_date,
                "notes": obj.audit.notes,
                "created_at": obj.audit.created_at
            }
        return None

class AuditFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditFile
        fields = '__all__'
        
class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Audit
        fields = '__all__'
    
    def validate(self, data):
        audit_date = data.get('audit_date')
        audit_schedule = data.get('audit_schedule')

        if audit_schedule and audit_date:
            # Audit date must be on or after schedule date
            if audit_date < audit_schedule.date:
                raise serializers.ValidationError({
                    'audit_date': "Audit date cannot be before the scheduled date."
                })

        return data
    
class RepairSerializer(serializers.ModelSerializer):
    supplier_details = serializers.SerializerMethodField()
    status_details = serializers.SerializerMethodField()

    class Meta:
        model = Repair
        fields = '__all__'

    def get_supplier_details(self, obj):
        """Fetch supplier details from the Contexts service."""
        try:
            if not obj.supplier_id:
                return None
            supplier = get_supplier_by_id(obj.supplier_id)
            return supplier
        except Exception:
            return {
                "warning": "Supplier service unreachable. Make sure 'contexts-service' is running and accessible."
            }

    def get_status_details(self, obj):
        """Fetch status details from the Contexts service."""
        try:
            if not getattr(obj, 'status_id', None):
                return None
            status = get_status_by_id(obj.status_id)
            return status
        except Exception:
            return {
                "warning": "Statuses service unreachable. Make sure 'contexts-service' is running and accessible."
            }

    def validate(self, attrs):
        """Validate repair data including status category and prevent duplicates."""
        asset = attrs.get('asset') or getattr(self.instance, 'asset', None)
        name = attrs.get('name') or getattr(self.instance, 'name', None)
        status_id = attrs.get('status_id') or getattr(self.instance, 'status_id', None)
        start_date = attrs.get('start_date') or getattr(self.instance, 'start_date', timezone.localdate())

        # Validate status category - must be 'repair' category
        if status_id:
            status_details = get_status_by_id(status_id)
            if not status_details or status_details.get("warning"):
                raise serializers.ValidationError({"status_id": "Status not found."})

            status_category = status_details.get("category")
            if status_category != "repair":
                raise serializers.ValidationError({
                    "status_id": "Invalid status. Only repair statuses are allowed for repairs."
                })

        # Ensure date-only (no datetime)
        if isinstance(start_date, timezone.datetime):
            start_date = start_date.date()

        # 🔍 Check for existing repair with same asset, name, and date
        # Normalize the repair name for comparison/storage (Title Case)
        if name:
            normalized_name = " ".join(name.split()).strip().title()
            attrs['name'] = normalized_name
        else:
            normalized_name = None

        duplicate = False
        if normalized_name:
            duplicate = (
                Repair.objects.filter(
                    asset=asset,
                    name__iexact=normalized_name,
                    start_date=start_date,
                    is_deleted=False
                )
                .exclude(pk=self.instance.pk if self.instance else None)
                .exists()
            )

        if duplicate:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "A repair record with the same asset, name, and start date already exists."
                ]
            })

        attrs['start_date'] = start_date
        return attrs

    def create(self, validated_data):
        start_date = validated_data.get('start_date', timezone.localdate())
        if isinstance(start_date, timezone.datetime):
            start_date = start_date.date()
        validated_data['start_date'] = start_date
        return super().create(validated_data)
    
class RepairFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairFile
        fields = '__all__'
        
class DashboardStatsSerializer(serializers.Serializer):
    due_for_return = serializers.IntegerField()
    overdue_for_return = serializers.IntegerField()
    upcoming_audits = serializers.IntegerField()
    overdue_audits = serializers.IntegerField()
    reached_end_of_life = serializers.IntegerField()
    upcoming_end_of_life = serializers.IntegerField()
    expired_warranties = serializers.IntegerField()
    expiring_warranties = serializers.IntegerField()
    low_stock = serializers.IntegerField()


class AssetReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for AssetReportTemplate CRUD operations."""

    class Meta:
        model = AssetReportTemplate
        fields = ['id', 'name', 'user_id', 'filters', 'columns', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        """Validate template name uniqueness (per user if user_id provided)."""
        if not value or not value.strip():
            raise serializers.ValidationError("Template name cannot be empty.")

        # Normalize name
        normalized_name = " ".join(value.split()).strip()

        # Check for duplicate names (case insensitive)
        user_id = self.initial_data.get('user_id') or (self.instance.user_id if self.instance else None)

        queryset = AssetReportTemplate.objects.filter(
            name__iexact=normalized_name,
            is_deleted=False
        )

        if user_id:
            queryset = queryset.filter(user_id=user_id)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("A template with this name already exists.")

        return normalized_name

    def validate_columns(self, value):
        """Validate that columns is a list of strings."""
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Columns must be a list.")
        if not all(isinstance(col, str) for col in value):
            raise serializers.ValidationError("All column IDs must be strings.")
        return value

    def validate_filters(self, value):
        """Validate that filters is a dictionary."""
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Filters must be an object/dictionary.")
        return value


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog model for activity report API responses."""

    # Format datetime as string for frontend display
    date = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    type = serializers.CharField(source='activity_type')
    item = serializers.SerializerMethodField()
    to_from = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'date', 'user', 'type', 'action', 'item', 'to_from', 'notes',
                  'datetime', 'user_id', 'activity_type', 'item_id',
                  'item_identifier', 'item_name', 'target_id', 'target_name']
        read_only_fields = ['id', 'date', 'user', 'item', 'to_from']

    def get_date(self, obj):
        """Format datetime for display."""
        if obj.datetime:
            return obj.datetime.strftime('%Y-%m-%d %I:%M:%S %p')
        return ''

    def get_user(self, obj):
        """Return user name or fallback to user_id."""
        if obj.user_name:
            return obj.user_name
        if obj.user_id:
            return f'User {obj.user_id}'
        return 'System'

    def get_item(self, obj):
        """Return formatted item string."""
        identifier = obj.item_identifier or str(obj.item_id)
        name = obj.item_name or ''
        if name:
            return f"{identifier} - {name}"
        return identifier

    def get_to_from(self, obj):
        """Return target name for checkout/checkin actions."""
        return obj.target_name or ''


class ActivityLogCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating ActivityLog entries."""

    class Meta:
        model = ActivityLog
        fields = ['user_id', 'user_name', 'activity_type', 'action',
                  'item_id', 'item_identifier', 'item_name',
                  'target_id', 'target_name', 'notes', 'datetime']
        extra_kwargs = {
            'datetime': {'required': False},
            'user_name': {'required': False},
            'item_identifier': {'required': False},
            'item_name': {'required': False},
            'target_id': {'required': False},
            'target_name': {'required': False},
            'notes': {'required': False},
        }