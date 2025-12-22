from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# Local model imports to avoid circular imports at module import time
from ..models import Asset, Component, Product, Repair


@api_view(['POST'])
def check_bulk_usage(request):
    """
    Bulk usage check for contexts service.
    Request JSON: {"type": "category|supplier|manufacturer|depreciation|status|location", "ids": [1,2,3], "options": {"sample_limit": 5}}
    Response: {"results": [{"id": <id>, "in_use": bool, "asset_count": int, "asset_ids": [...], "component_ids": [...], "repair_ids": [...]}]}
    """
    body = request.data or {}
    item_type = body.get('type')
    ids = body.get('ids') or []
    options = body.get('options') or {}
    try:
        sample_limit = int(options.get('sample_limit', 5))
    except Exception:
        sample_limit = 5

    if not item_type or not isinstance(ids, list):
        return Response({"detail": "Request must include 'type' and 'ids' list."}, status=status.HTTP_400_BAD_REQUEST)

    MAX_BATCH = 200
    if len(ids) > MAX_BATCH:
        return Response({"detail": f"Too many ids, max {MAX_BATCH}"}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    try:
        ids = [int(i) for i in ids]
    except Exception:
        return Response({"detail": "All ids must be integers."}, status=status.HTTP_400_BAD_REQUEST)

    # Build results map defaulting to not in use
    results = {i: {"id": i, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []} for i in ids}

    # Helper to add asset sample
    def add_asset_sample(key, aid):
        entry = results.get(key)
        if not entry:
            return
        if len(entry['asset_ids']) < sample_limit:
            entry['asset_ids'].append(aid)

    # Handle direct-attribute contexts
    if item_type in ('supplier', 'location', 'status'):
        # Assets can be filtered by these fields directly
        assets_qs = Asset.objects.filter(is_deleted=False).filter(**{f"{item_type}__in": ids})
        for row in assets_qs.values(f"{item_type}", 'asset_id', 'id'):
            key = row.get(item_type)
            if key is None:
                continue
            aid = row.get('asset_id') or str(row.get('id'))
            key = int(key)
            results.setdefault(key, {"id": key, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
            results[key]['asset_count'] += 1
            add_asset_sample(key, aid)
            results[key]['in_use'] = True

        # Components do not have a 'status' field on the Component model; only supplier/location apply
        if item_type in ('supplier', 'location'):
            comps_qs = Component.objects.filter(is_deleted=False).filter(**{f"{item_type}__in": ids})
            for row in comps_qs.values(f"{item_type}", 'id'):
                key = row.get(item_type)
                if key is None:
                    continue
                key = int(key)
                results.setdefault(key, {"id": key, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
                results[key]['component_ids'].append(row.get('id'))
                results[key]['in_use'] = True

        # Repairs: supplier uses supplier_id, status uses status_id
        if item_type == 'supplier':
            repairs_qs = Repair.objects.filter(is_deleted=False, supplier_id__in=ids)
            for row in repairs_qs.values('supplier_id', 'id'):
                key = int(row.get('supplier_id'))
                results.setdefault(key, {"id": key, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
                results[key]['repair_ids'].append(row.get('id'))
                results[key]['in_use'] = True
        elif item_type == 'status':
            repairs_qs = Repair.objects.filter(is_deleted=False, status_id__in=ids)
            for row in repairs_qs.values('status_id', 'id'):
                key = int(row.get('status_id'))
                results.setdefault(key, {"id": key, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
                results[key]['repair_ids'].append(row.get('id'))
                results[key]['in_use'] = True

    # Product-scoped contexts
    if item_type in ('category', 'manufacturer', 'depreciation'):
        prod_qs = Product.objects.filter(is_deleted=False).filter(**{f"{item_type}__in": ids}).values('id', item_type)
        prod_map = {}
        for p in prod_qs:
            ctx = p.get(item_type)
            pid = p.get('id')
            if ctx is None:
                continue
            prod_map.setdefault(int(ctx), []).append(pid)

        for ctx_val, pids in prod_map.items():
            aset_qs = Asset.objects.filter(is_deleted=False, product__in=pids)
            count = aset_qs.count()
            if count:
                results.setdefault(ctx_val, {"id": ctx_val, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
                results[ctx_val]['asset_count'] = count
                results[ctx_val]['in_use'] = True
                for a in aset_qs.values('asset_id', 'id')[:sample_limit]:
                    aid = a.get('asset_id') or str(a.get('id'))
                    results[ctx_val]['asset_ids'].append(aid)

        if item_type == 'category':
            comps_qs = Component.objects.filter(is_deleted=False, category__in=ids).values('category', 'id')
            for row in comps_qs:
                key = row.get('category')
                if key is None:
                    continue
                key = int(key)
                results.setdefault(key, {"id": key, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
                results[key]['component_ids'].append(row.get('id'))
                results[key]['in_use'] = True
        else:
            comps_qs = Component.objects.filter(is_deleted=False, manufacturer__in=ids).values('manufacturer', 'id')
            for row in comps_qs:
                key = row.get('manufacturer')
                if key is None:
                    continue
                key = int(key)
                results.setdefault(key, {"id": key, "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []})
                results[key]['component_ids'].append(row.get('id'))
                results[key]['in_use'] = True

    out = [results.get(int(i), {"id": int(i), "in_use": False, "asset_count": 0, "asset_ids": [], "component_ids": [], "repair_ids": []}) for i in ids]
    return Response({"results": out})
