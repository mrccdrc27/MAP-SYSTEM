from rest_framework import serializers
from .models import *
from .utils import normalize_name_smart, validate_image_file
import logging
from .services.assets import *
import re


# shared validator for uploaded images lives in `utils.validate_image_file`

class CategorySerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    asset_count = serializers.SerializerMethodField(read_only=True)
    component_count = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Category
        fields = '__all__'

    def validate(self, attrs):
        # Normalize name and enforce unique (name,type) among non-deleted categories
        name = attrs.get('name') if 'name' in attrs else (self.instance.name if self.instance else None)
        type_val = attrs.get('type') if 'type' in attrs else (self.instance.type if self.instance else None)
        # Require 'type' when creating a new Category (same as 'name').
        # For updates, allow omission so existing instance keeps its type.
        if self.instance is None and not type_val:
            raise serializers.ValidationError({'type': 'This field is required.'})

        if not name or not type_val:
            return attrs

        # Normalize using smart title-casing (preserves acronyms like "SSD's")
        normalized_name = normalize_name_smart(name)
        attrs['name'] = normalized_name

        seen = None
        try:
            seen = self.context.get('import_seen_names') if isinstance(self.context, dict) else None
        except Exception:
            seen = None

        qs = Category.objects.filter(name__iexact=normalized_name, type=type_val, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            if seen and normalized_name in seen:
                return attrs
            raise serializers.ValidationError({'name': 'A category with this name and type already exists.'})

        return attrs

    def validate_logo(self, value):
        """Ensure uploaded logo is JPEG/PNG and <= 5MB."""
        if value in (None, ''):
            return value

        max_size = 5 * 1024 * 1024  # 5 MB
        # size check
        if hasattr(value, 'size') and value.size > max_size:
            raise serializers.ValidationError('Logo file size must be 5 MB or smaller.')

        # content type check (uploaded InMemoryUploadedFile/TemporaryUploadedFile may have content_type)
        content_type = getattr(value, 'content_type', None)
        if content_type:
            if content_type not in ('image/jpeg', 'image/png'):
                raise serializers.ValidationError('Logo must be a JPEG or PNG image.')
            return value

        # fallback: check extension if content_type not available
        try:
            import os
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png'):
                raise serializers.ValidationError('Logo must be a JPEG or PNG image.')
        except Exception:
            # If we cannot determine, be permissive (let downstream handle), but normally we shouldn't reach here.
            return value

        return value

    def get_asset_count(self, obj):
        """Return number of assets referencing this category, or None if unknown."""
        # Prefer batched counts supplied by the view via serializer context
        try:
            usage_map = self.context.get('category_usage') if isinstance(self.context, dict) else None
            if isinstance(usage_map, dict) and obj.id in usage_map:
                val = usage_map.get(obj.id)
                # asset_count expected in the assets service response
                if isinstance(val, dict) and 'asset_count' in val:
                    return int(val.get('asset_count') or 0)
                # older responses might include asset_ids array
                if isinstance(val, dict) and 'asset_ids' in val:
                    return int(len(val.get('asset_ids') or []))
                return 0
            # Fallback to per-item call
            return int(count_assets_by_category(obj.id) or 0)
        except Exception:
            return None

    def get_component_count(self, obj):
        """Return number of components referencing this category, or None if unknown."""
        try:
            usage_map = self.context.get('category_usage') if isinstance(self.context, dict) else None
            if isinstance(usage_map, dict) and obj.id in usage_map:
                val = usage_map.get(obj.id)
                # component_ids is an array in the assets response
                if isinstance(val, dict) and 'component_ids' in val:
                    return int(len(val.get('component_ids') or []))
                if isinstance(val, dict) and 'component_count' in val:
                    return int(val.get('component_count') or 0)
                return 0
            return int(count_components_by_category(obj.id) or 0)
        except Exception:
            return None

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

    def validate_logo(self, value):
        return validate_image_file(value)

    def validate(self, attrs):
        # For create: instance not present; for update: instance available at self.instance
        name = attrs.get('name') if 'name' in attrs else (self.instance.name if self.instance else None)
        if not name:
            return attrs
        normalized_name = normalize_name_smart(name)
        attrs['name'] = normalized_name

        # Validate country and state: no numeric characters and reasonable max length
        country = attrs.get('country') if 'country' in attrs else (self.instance.country if self.instance else None)
        state_province = attrs.get('state_province') if 'state_province' in attrs else (self.instance.state_province if self.instance else None)
        # Validate city: no numeric characters and reasonable max length
        city = attrs.get('city') if 'city' in attrs else (self.instance.city if self.instance else None)
        if country:
            if len(country) > 50:
                raise serializers.ValidationError({'country': 'Country must be 50 characters or fewer.'})
            if any(ch.isdigit() for ch in country):
                raise serializers.ValidationError({'country': 'Country must not contain numbers.'})

        if state_province:
            if len(state_province) > 50:
                raise serializers.ValidationError({'state_province': 'State/Province must be 50 characters or fewer.'})
            if any(ch.isdigit() for ch in state_province):
                raise serializers.ValidationError({'state_province': 'State/Province must not contain numbers.'})

        if city:
            if len(city) > 50:
                raise serializers.ValidationError({'city': 'City must be 50 characters or fewer.'})
            if any(ch.isdigit() for ch in city):
                raise serializers.ValidationError({'city': 'City must not contain numbers.'})

        # Validate fax: allow digits and common formatting characters, but ensure digits exist and length within bounds
        fax = attrs.get('fax') if 'fax' in attrs else (self.instance.fax if self.instance else None)
        if fax:
            if len(fax) > 20:
                raise serializers.ValidationError({'fax': 'Fax must be 20 characters or fewer.'})
            # only allow digits, spaces, parentheses, plus, hyphens
            if not re.match(r'^[\d\s\-\+\(\)]+$', fax):
                raise serializers.ValidationError({'fax': 'Fax contains invalid characters.'})
            # extract digits and ensure there are at least 7 and at most 20 digits
            digits = re.sub(r'\D', '', fax)
            if not digits.isdigit() or len(digits) < 7 or len(digits) > 20:
                raise serializers.ValidationError({'fax': 'Fax must contain 7-20 digits.'})

        # Validate phone number: require E.164 format (e.g. +15551234567)
        phone = attrs.get('phone_number') if 'phone_number' in attrs else (self.instance.phone_number if self.instance else None)
        if phone:
            # Accept only E.164: leading '+' followed by 7-15 digits
            if not re.match(r'^\+\d{7,15}$', str(phone).strip()):
                raise serializers.ValidationError({'phone_number': "Phone number must be in E.164 format, e.g. '+15551234567'."})

        # Allow import-time bypass when the import flow provides a set of names
        # already created/updated in this run (to avoid false-positive conflicts
        # when a single sheet contains related rows). The import handler sets
        # `context['import_seen_names']` to a set of normalized names.
        seen = None
        try:
            seen = self.context.get('import_seen_names') if isinstance(self.context, dict) else None
        except Exception:
            seen = None

        qs = Supplier.objects.filter(name__iexact=normalized_name, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            # If the name is already in the seen set for this import run, allow it
            # to proceed (it was created earlier in this same upload).
            if seen and normalized_name in seen:
                return attrs
            # Debug log existing supplier names when a duplicate is detected
            try:
                existing = list(Supplier.objects.filter(is_deleted=False).values_list('name', flat=True))
                logging.getLogger('import_export').debug('supplier duplicate check failed for %s existing=%s', normalized_name, existing)
            except Exception:
                pass
            raise serializers.ValidationError({'name': 'A Supplier with this name already exists.'})

        return attrs


class ManufacturerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manufacturer
        fields = '__all__'

    def validate_logo(self, value):
        return validate_image_file(value)
    
    def validate_support_phone(self, value):
        """Ensure manufacturer support phone uses E.164 format."""
        if value in (None, ''):
            return value
        if not re.match(r'^\+\d{7,15}$', str(value).strip()):
            raise serializers.ValidationError("Support phone must be in E.164 format, e.g. '+15551234567'.")
        return value

    def validate(self, attrs):
        """Enforce unique manufacturer name among non-deleted records.

        Allows import-time bypass using `context['import_seen_names']` similar
        to other serializers.
        """
        name = attrs.get('name') if 'name' in attrs else (self.instance.name if self.instance else None)
        if not name:
            return attrs

        normalized_name = normalize_name_smart(name)
        attrs['name'] = normalized_name

        seen = None
        try:
            seen = self.context.get('import_seen_names') if isinstance(self.context, dict) else None
        except Exception:
            seen = None

        qs = Manufacturer.objects.filter(name__iexact=normalized_name, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            if seen and normalized_name in seen:
                return attrs
            raise serializers.ValidationError({'name': 'A Manufacturer with this name already exists.'})

        return attrs

class StatusSerializer(serializers.ModelSerializer):
    asset_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Status
        fields = '__all__'

    def validate(self, attrs):
        instance = self.instance

        category = attrs.get('category') if 'category' in attrs else (instance.category if instance else None)
        type_val = attrs.get('type') if 'type' in attrs else (instance.type if instance else None)
        name = attrs.get('name') if 'name' in attrs else (instance.name if instance else None)

        if category == Status.Category.ASSET:
            if not type_val:
                raise serializers.ValidationError({
                    "type": "Type is required when category is 'asset'."
                })
        
        if category == Status.Category.REPAIR:
            if type_val:
                raise serializers.ValidationError({
                    "type": "Repair statuses must not have a type."
                })
            type_val = None
        
        if name:
            normalized = normalize_name_smart(name)
            attrs['name'] = normalized
            name = normalized

        # Allow import-time bypass when the import flow provides a set of names
        seen = None
        try:
            seen = self.context.get('import_seen_names') if isinstance(self.context, dict) else None
        except Exception:
            pass

        qs = Status.objects.filter(
            name__iexact=name,
            is_deleted=False
        )

        # Enforce uniqueness of name+type among non-deleted statuses
        # Allow re-using a name if the existing record is soft-deleted.
        if category == Status.Category.ASSET:
            qs = qs.filter(type=type_val, category=Status.Category.ASSET)
        else:
            qs = qs.filter(category=Status.Category.REPAIR)

        # Exclude self from uniqueness check if updating
        if instance:
            qs = qs.exclude(pk=instance.pk)

        # If conflict exists:
        if qs.exists():
            # Skip conflict for import-session duplicate detection
            if seen and name in seen:
                return attrs

            # Standard conflict message
            if category == Status.Category.ASSET:
                raise serializers.ValidationError({
                    'name': "A Status with this name and type already exists."
                })
            else:
                raise serializers.ValidationError({
                    'name': "A repair status with this name already exists."
                })

        return attrs

    def get_asset_count(self, obj):
        """Return number of assets referencing this status id, preferring batched mapping from view context."""
        try:
            usage_map = self.context.get('status_usage') if isinstance(self.context, dict) else None
            if isinstance(usage_map, dict) and obj.id in usage_map:
                val = usage_map.get(obj.id)
                return val.get('asset_count') if isinstance(val, dict) else None
            return None
        except Exception:
            return None

class DepreciationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depreciation
        fields = '__all__'

    def validate(self, attrs):
        name = attrs.get('name') if 'name' in attrs else (self.instance.name if self.instance else None)
        if not name:
            return attrs
        normalized_name = normalize_name_smart(name)
        attrs['name'] = normalized_name

        seen = None
        try:
            seen = self.context.get('import_seen_names') if isinstance(self.context, dict) else None
        except Exception:
            seen = None

        qs = Depreciation.objects.filter(name__iexact=normalized_name, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            if seen and normalized_name in seen:
                return attrs
            raise serializers.ValidationError({'name': 'A Depreciation with this name already exists.'})

        return attrs
    
class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    location_details = serializers.SerializerMethodField()
    requestor_details = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = '__all__'
    
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def validate(self, data):
        ticket_type = data.get("ticket_type") or (self.instance and self.instance.ticket_type)
        asset_id = data.get("asset") or (self.instance and self.instance.asset)

        # Validate ticket type fields
        if ticket_type == Ticket.TicketType.CHECKOUT:
            if not self.partial:  # only enforce on creation
                if not data.get("checkout_date"):
                    raise serializers.ValidationError({"checkout_date": "This field is required for checkout ticket."})
                if not data.get("return_date"):
                    raise serializers.ValidationError({"return_date": "This field is required for checkout ticket."})

            # Disallow checkin-only fields even on partial update
            # Note: asset_checkout IS allowed on checkout tickets - it stores the checkout record ID when resolved
            if data.get("checkin_date"):
                raise serializers.ValidationError({"checkin_date": "Not allowed for checkout ticket."})

        elif ticket_type == Ticket.TicketType.CHECKIN:
            if not self.partial:  # only enforce on creation
                if not data.get("asset_checkout"):
                    raise serializers.ValidationError({"asset_checkout": "This field is required for checkin ticket."})
                if not data.get("checkin_date"):
                    raise serializers.ValidationError({"checkin_date": "This field is required for checkin ticket."})

            # Disallow checkout-only fields even on partial update
            if data.get("checkout_date"):
                raise serializers.ValidationError({"checkout_date": "Not allowed for checkin ticket."})
            if data.get("return_date"):
                raise serializers.ValidationError({"return_date": "Not allowed for checkin ticket."})

        # Validate asset status consistency (only on creation or when asset/ticket_type changes)
        if asset_id and ticket_type:
            self._validate_asset_status_consistency(asset_id, ticket_type)

        return data

    def _validate_asset_status_consistency(self, asset_id, ticket_type):
        logger = logging.getLogger(__name__)

        try:
            asset_data = get_asset_by_id(asset_id)  # uses internal http client

            status_details = asset_data.get('status_details', {})
            status_type = status_details.get('type', '').lower()

            if status_type not in ['deployable', 'deployed', 'pending']:
                raise serializers.ValidationError({
                    'asset': f"Cannot create ticket for asset with '{status_type}' status."
                })

            if status_type == 'deployed' and ticket_type != Ticket.TicketType.CHECKIN:
                raise serializers.ValidationError({
                    'ticket_type': "Assets with 'deployed' status must have 'checkin' tickets."
                })

            if status_type == 'deployable' and ticket_type != Ticket.TicketType.CHECKOUT:
                raise serializers.ValidationError({
                    'ticket_type': "Assets with 'deployable' status must have 'checkout' tickets."
                })

        except Exception as e:
            # Do NOT block ticket creation if assets service unreachable
            logger.warning(f"Asset validation skipped (service unreachable): {e}")
            return
        
    def get_location_details(self, obj):
        """Return location details fetched from Help Desk service."""
        try:
            if not getattr(obj, 'location', None):
                return None
            from contexts_ms.services.integration_help_desk import get_location_by_id
            return get_location_by_id(obj.location)
        except Exception:
            return {"warning": "Help Desk service unreachable for locations."}

    def get_requestor_details(self, obj):
        """Return requestor/employee details fetched from Help Desk service."""
        try:
            if not getattr(obj, 'employee', None):
                return None
            from contexts_ms.services.integration_help_desk import get_employee_by_id
            employee = get_employee_by_id(obj.employee)
            if employee:
                firstname = employee.get('firstname', '')
                lastname = employee.get('lastname', '')
                return {
                    'id': employee.get('id'),
                    'name': f"{firstname} {lastname}".strip(),
                    'firstname': firstname,
                    'lastname': lastname,
                }
            return None
        except Exception:
            return {"warning": "Help Desk service unreachable for employees."}


class CategoryNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

class SupplierNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name']
        
class ManufacturerNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Manufacturer
        fields = ['id', 'name']

class StatusNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ['id', 'name', 'type']

class DepreciationNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depreciation
        fields = ['id', 'name']

class LocationNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'city']

class TicketTypeSerializer(serializers.ModelSerializer):
    location_details = serializers.SerializerMethodField()
    class Meta:
        model = Ticket
        fields = ['id', 'asset', 'asset_checkout', 'ticket_number', 'checkout_date', 'return_date', ]

    def get_location_details(self, obj):
        """Return location details fetched from Help Desk service."""
        try:
            if not getattr(obj, 'location', None):
                return None
            from contexts_ms.services.integration_help_desk import get_location_by_id
            return get_location_by_id(obj.location)
        except Exception:
            return {"warning": "Help Desk service unreachable for locations."}
