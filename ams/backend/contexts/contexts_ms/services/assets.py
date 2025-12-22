from .http_client import get as client_get, post as client_post, patch as client_patch, ASSETS_API_URL

def get_deleted_assets():
    response = client_get("assets/deleted/")
    response.raise_for_status()
    return response.json()

def get_deleted_components():
    response = client_get("components/deleted/")
    response.raise_for_status()
    return response.json()

def recover_asset(asset_id):
    response = client_patch(f"assets/{asset_id}/recover/")
    response.raise_for_status()
    return response.json()

def recover_component(component_id):
    response = client_patch(f"components/{component_id}/recover/")
    response.raise_for_status()
    return response.json()


def count_assets_by_category(category_id, timeout=5):
    """Return number of assets referencing a given category id.

    Uses the assets service list endpoint and prefers paginated 'count' if present.
    Falls back to length of results when necessary.
    """
    try:
        # Ask for a small page to reduce payload; if service supports pagination it will return 'count'
        params = {'category': category_id, 'page_size': 1}
        r = client_get('assets/', params=params, timeout=timeout)
        r.raise_for_status()
        j = r.json()
        if isinstance(j, dict) and 'count' in j:
            return int(j['count'])
        # otherwise attempt to extract results list
        results = j.get('results') if isinstance(j, dict) else j
        if isinstance(results, list):
            return len(results)
        return 0
    except Exception:
        # On error, return None to signal unknown count
        return None


def count_components_by_category(category_id, timeout=5):
    """Return number of components referencing a given category id."""
    try:
        params = {'category': category_id, 'page_size': 1}
        r = client_get('components/', params=params, timeout=timeout)
        r.raise_for_status()
        j = r.json()
        if isinstance(j, dict) and 'count' in j:
            return int(j['count'])
        results = j.get('results') if isinstance(j, dict) else j
        if isinstance(results, list):
            return len(results)
        return 0
    except Exception:
        return None


def bulk_check_usage(item_type, ids, sample_limit=0, timeout=8):
    """Call the assets service bulk usage endpoint for multiple ids.

    Returns a dict mapping id -> usage dict as returned by assets service.
    On any request error returns an empty dict.
    """
    try:
        if not isinstance(ids, (list, tuple)):
            ids = list(ids)
        payload = {
            'type': item_type,
            'ids': ids,
            'options': {'sample_limit': sample_limit}
        }
        r = client_post('usage/check_bulk/', json=payload, timeout=timeout)
        r.raise_for_status()
        j = r.json() or {}
        results = j.get('results') if isinstance(j, dict) else None
        out = {}
        if isinstance(results, list):
            for entry in results:
                try:
                    key = int(entry.get('id'))
                except Exception:
                    continue
                out[key] = entry
        return out
    except Exception:
        return {}

def get_asset_by_id(asset_id):
    response = client_get(f"assets/{asset_id}/")
    response.raise_for_status()
    return response.json()

def get_asset_checkout_by_id(checkout_id):
    response = client_get(f"asset-checkout/{checkout_id}/")
    response.raise_for_status()
    return response.json()