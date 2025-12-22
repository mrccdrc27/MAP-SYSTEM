from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..services.contexts import *
from ..services.integration_help_desk import *
from django.core.cache import cache


class SupplierListProxy(APIView):
    """Proxy endpoint to fetch supplier list from Contexts API."""
    def get(self, request):
        q = request.query_params.get('q')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except ValueError:
            limit = 50

        suppliers = get_suppliers_list(q=q, limit=limit)
        # If remote returned a warning, try to return a cached value instead
        if isinstance(suppliers, dict) and suppliers.get('warning'):
            cache_key = f"contexts:list:suppliers:{q}:{limit}"
            cached = cache.get(cache_key)
            if cached is not None:
                suppliers = cached
            else:
                return Response({"detail": "Unable to fetch suppliers."}, status=status.HTTP_502_BAD_GATEWAY)

        # Normalize to compact shape
        raw = suppliers.get('results') if isinstance(suppliers, dict) and 'results' in suppliers else suppliers
        mapped = []
        for s in (raw or []):
            mapped.append({
                'id': s.get('id') or s.get('pk'),
                'name': s.get('name') or s.get('display_name') or s.get('title'),
                'code': s.get('code') or s.get('short_code') or s.get('slug')
            })
        return Response({'results': mapped, 'count': len(mapped)})


class SupplierDetailProxy(APIView):
    """Proxy endpoint to fetch a single supplier by ID."""
    def get(self, request, pk):
        supplier = get_supplier_by_id(pk)
        if supplier is None:
            return Response({"detail": "Supplier not found or external service unavailable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(supplier)


class CategoryDetailProxy(APIView):
    """Proxy endpoint to fetch a single category by ID from Contexts API."""
    def get(self, request, pk):
        category = get_category_by_id(pk)
        if category is None:
            return Response({"detail": "Category not found or external service unavailable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(category)


class CategoryListProxy(APIView):
    """Return compact category list for dropdowns, supports ?q=&type=&limit=."""
    def get(self, request):
        q = request.query_params.get('q')
        ctype = request.query_params.get('type')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except ValueError:
            limit = 50

        cats = get_categories_list(q=q, type=ctype, limit=limit)
        if isinstance(cats, dict) and cats.get('warning'):
            cache_key = f"contexts:list:categories:{q}:{ctype}:{limit}"
            cached = cache.get(cache_key)
            if cached is not None:
                cats = cached
            else:
                return Response({"detail": "Unable to fetch categories."}, status=status.HTTP_502_BAD_GATEWAY)

        raw = cats.get('results') if isinstance(cats, dict) and 'results' in cats else cats
        mapped = []
        for c in (raw or []):
            mapped.append({
                'id': c.get('id') or c.get('pk'),
                'name': c.get('name') or c.get('display_name') or c.get('title'),
                'code': c.get('code') or c.get('short_code') or c.get('slug'),
                'type': c.get('type')
            })
        return Response({'results': mapped, 'count': len(mapped)})


class ManufacturerDetailProxy(APIView):
    """Proxy endpoint to fetch a single manufacturer by ID from Contexts API."""
    def get(self, request, pk):
        manufacturer = get_manufacturer_by_id(pk)
        if manufacturer is None:
            return Response({"detail": "Manufacturer not found or external service unavailable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(manufacturer)


class ManufacturerListProxy(APIView):
    """Compact manufacturers list for dropdowns."""
    def get(self, request):
        q = request.query_params.get('q')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except ValueError:
            limit = 50

        mans = get_manufacturers_list(q=q, limit=limit)
        if isinstance(mans, dict) and mans.get('warning'):
            cache_key = f"contexts:list:manufacturers:{q}:{limit}"
            cached = cache.get(cache_key)
            if cached is not None:
                mans = cached
            else:
                return Response({"detail": "Unable to fetch manufacturers."}, status=status.HTTP_502_BAD_GATEWAY)

        raw = mans.get('results') if isinstance(mans, dict) and 'results' in mans else mans
        mapped = []
        for m in (raw or []):
            mapped.append({
                'id': m.get('id') or m.get('pk'),
                'name': m.get('name') or m.get('display_name') or m.get('title'),
                'code': m.get('code') or m.get('short_code') or m.get('slug')
            })
        return Response({'results': mapped, 'count': len(mapped)})


class DepreciationDetailProxy(APIView):
    """Proxy endpoint to fetch a single depreciation by ID from Contexts API."""
    def get(self, request, pk):
        depreciation = get_depreciation_by_id(pk)
        if depreciation is None:
            return Response({"detail": "Depreciation not found or external service unavailable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(depreciation)


class DepreciationListProxy(APIView):
    """Compact depreciations list for dropdowns."""
    def get(self, request):
        q = request.query_params.get('q')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except ValueError:
            limit = 50

        deps = get_depreciations_list(q=q, limit=limit)
        if isinstance(deps, dict) and deps.get('warning'):
            cache_key = f"contexts:list:depreciations:{q}:{limit}"
            cached = cache.get(cache_key)
            if cached is not None:
                deps = cached
            else:
                return Response({"detail": "Unable to fetch depreciations."}, status=status.HTTP_502_BAD_GATEWAY)

        raw = deps.get('results') if isinstance(deps, dict) and 'results' in deps else deps
        mapped = []
        for d in (raw or []):
            mapped.append({
                'id': d.get('id') or d.get('pk'),
                'name': d.get('name') or d.get('display_name') or d.get('title'),
                'code': d.get('code') or d.get('short_code') or d.get('slug')
            })
        return Response({'results': mapped, 'count': len(mapped)})


class LocationListProxy(APIView):
    """Compact locations list for dropdowns."""
    def get(self, request):
        q = request.query_params.get('q')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except ValueError:
            limit = 50

        locs = get_locations_list(q=q, limit=limit)
        if isinstance(locs, dict) and locs.get('warning'):
            cache_key = f"contexts:list:locations:{q}:{limit}"
            cached = cache.get(cache_key)
            if cached is not None:
                locs = cached
            else:
                return Response({"detail": "Unable to fetch locations."}, status=status.HTTP_502_BAD_GATEWAY)

        raw = locs.get('results') if isinstance(locs, dict) and 'results' in locs else locs
        mapped = []
        for l in (raw or []):
            mapped.append({
                'id': l.get('id') or l.get('pk'),
                'name': l.get('name') or l.get('display_name') or l.get('city') or l.get('title'),
                'code': l.get('code') or l.get('short_code') or l.get('slug')
            })
        return Response({'results': mapped, 'count': len(mapped)})


class StatusListProxy(APIView):
    """Compact statuses list for dropdowns."""
    def get(self, request):
        q = request.query_params.get('q')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit else 50
        except ValueError:
            limit = 50

        stats = get_statuses_list(q=q, limit=limit)
        if isinstance(stats, dict) and stats.get('warning'):
            cache_key = f"contexts:list:statuses:{q}:{limit}"
            cached = cache.get(cache_key)
            if cached is not None:
                stats = cached
            else:
                return Response({"detail": "Unable to fetch statuses."}, status=status.HTTP_502_BAD_GATEWAY)

        raw = stats.get('results') if isinstance(stats, dict) and 'results' in stats else stats
        mapped = []
        for s in (raw or []):
            mapped.append({
                'id': s.get('id') or s.get('pk'),
                'name': s.get('name') or s.get('display_name') or s.get('title'),
                'code': s.get('code') or s.get('short_code') or s.get('slug'),
                'type': s.get('type')
            })
        return Response({'results': mapped, 'count': len(mapped)})
