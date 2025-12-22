from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .usage_check import is_item_in_use

# Import models from parent package
from ..models import Category, Supplier, Depreciation, Manufacturer, Status, Location

# Bulk delete safety limits
MAX_BULK_DELETE = 500
CHUNK_SIZE = 50

MODEL_BY_TYPE = {
    'category': Category,
    'supplier': Supplier,
    'depreciation': Depreciation,
    'manufacturer': Manufacturer,
    'status': Status,
    'location': Location,
}


def _build_cant_delete_message(instance, usage):
    """Build user-facing deletion-blocking message per spec."""
    label = instance.__class__.__name__.lower()
    asset_ids = usage.get('asset_ids') or []
    comp_ids = usage.get('component_ids') or []
    repair_ids = usage.get('repair_ids') or []
    # If the blocked instance is a Manufacturer and assets reference it,
    # return the specific short message requested by the frontend.
    try:
        if instance.__class__.__name__ == 'Manufacturer' and asset_ids:
            return "The selected manufacturer cannot be deleted. Currently in use by asset!"
    except Exception:
        pass
    display = None
    for attr in ('name', 'city', 'title'):
        val = getattr(instance, attr, None)
        if val:
            display = str(val)
            break

    def label_with_display():
        if display:
            return f"{label} '{display}'"
        return label

    # Helper to render sample ids or counts with examples
    def render_usage(kind_label, ids, count=None):
        # ids: list of example ids (may be empty)
        # count: optional total count reported by upstream
        total = None
        if isinstance(count, int):
            total = count
        else:
            total = len(ids) if ids else 0

        if total == 0:
            return None

        examples = ids[:5] if ids else []
        if total <= 5 and examples:
            return f"{kind_label}(s): {', '.join(map(str, examples))}"
        if examples:
            return f"{kind_label}(s): {total} (e.g. {', '.join(map(str, examples))})"
        return f"{kind_label}(s): {total}"

    # If this is a Category, prefer the category's own `type` to determine primary wording
    primary_kind = None
    try:
        kind_attr = getattr(instance, 'type', None)
        if kind_attr in ('asset', 'component'):
            primary_kind = kind_attr
    except Exception:
        primary_kind = None

    # Build usage pieces
    pieces = []

    # Prefer asset info when primary_kind is asset or when asset_ids present
    if primary_kind == 'asset' or asset_ids:
        # upstream may provide counts like 'asset_count'
        total_assets = usage.get('asset_count')
        part = render_usage('Asset', asset_ids, total_assets)
        if part:
            pieces.append(part)

    # Prefer component info when primary_kind is component.
    # If primary_kind is explicitly 'asset', do NOT include component usages even if present.
    if primary_kind == 'component' or (primary_kind is None and comp_ids):
        total_comps = usage.get('component_count')
        part = render_usage('Component', comp_ids, total_comps)
        if part:
            pieces.append(part)

    # Repairs
    if repair_ids:
        part = render_usage('Repair', repair_ids, len(repair_ids))
        if part:
            pieces.append(part)

    if pieces:
        # Join pieces with ' and ' for readability
        body = ' and '.join(pieces)
        return f"Cannot delete {label_with_display()}. Currently used by {body}."

    return f"Cannot delete {label_with_display()}. It is referenced by other records."


def _bulk_delete_handler(request, item_type, hard_delete=False):
    """Handle bulk delete for a given context item type.

    Request body: { "ids": [1,2,3,...] }
    Response: {"deleted": [ids], "skipped": { id: "reason" }}
    """
    ids = request.data.get('ids')
    if not isinstance(ids, list):
        return Response({"detail": "Request body must include 'ids' as a list."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        ids = [int(x) for x in ids]
    except Exception:
        return Response({"detail": "All ids must be integers."}, status=status.HTTP_400_BAD_REQUEST)

    if len(ids) == 0:
        return Response({"deleted": [], "skipped": {}}, status=status.HTTP_200_OK)

    if len(ids) > MAX_BULK_DELETE:
        return Response({"detail": f"Too many ids: limit is {MAX_BULK_DELETE}."}, status=status.HTTP_400_BAD_REQUEST)

    ids = list(dict.fromkeys(ids))

    Model = MODEL_BY_TYPE.get(item_type)
    if Model is None:
        return Response({"detail": f"Unsupported item type: {item_type}"}, status=status.HTTP_400_BAD_REQUEST)

    deleted = []
    skipped = {}

    for i in range(0, len(ids), CHUNK_SIZE):
        chunk = ids[i:i+CHUNK_SIZE]
        instances = {obj.pk: obj for obj in Model.objects.filter(pk__in=chunk)}

        for pk in chunk:
            inst = instances.get(pk)
            if not inst:
                skipped[pk] = "Not found"
                continue

            try:
                usage = is_item_in_use(item_type, pk)
            except Exception:
                skipped[pk] = "Could not verify usage (service error)"
                continue

            if usage.get('in_use'):
                msg = _build_cant_delete_message(inst, usage)
                skipped[pk] = msg
                continue

            deleted.append(pk)

    if deleted:
        if hard_delete:
            for i in range(0, len(deleted), CHUNK_SIZE):
                chunk = deleted[i:i+CHUNK_SIZE]
                try:
                    with transaction.atomic():
                        Model.objects.filter(pk__in=chunk).delete()
                except Exception as exc:
                    for pk in chunk:
                        if pk in deleted:
                            deleted.remove(pk)
                            skipped[pk] = f"Delete failed: {str(exc)}"
        else:
            try:
                with transaction.atomic():
                    Model.objects.filter(pk__in=deleted).update(is_deleted=True)
            except Exception:
                for pk in list(deleted):
                    try:
                        obj = Model.objects.get(pk=pk)
                        obj.is_deleted = True
                        obj.save()
                    except Exception as exc2:
                        deleted.remove(pk)
                        skipped[pk] = f"Soft-delete failed: {str(exc2)}"

    return Response({"deleted": deleted, "skipped": skipped}, status=status.HTTP_200_OK)
