import os
from requests.exceptions import RequestException
from .http_client import get as client_get, patch as client_patch
from django.core.cache import cache
from django.conf import settings


# Centralized Ticket Tracking service helper module
# Use settings.CONTEXTS_API_URL or fallback to the default service host
BASE_URL = getattr(settings, "TICKET_TRACKING_API_URL", os.getenv("TICKET_TRACKING_API_URL", "http://contexts-service:8003/"))

# Cache settings
TICKET_CACHE_TTL = 300
TICKET_WARNING_TTL = 60
LIST_CACHE_TTL = 300
LIST_WARNING_TTL = 60


def _build_url(path):
    return f"{BASE_URL.rstrip('/')}/{path.lstrip('/')}"


def fetch_resource_by_id(resource_name, resource_id):
    """Fetch a single resource by name and id. Returns dict or warning dict."""
    if not resource_id:
        return None
    url = _build_url(f"{resource_name}/{resource_id}/")
    try:
        resp = client_get(url, timeout=6)
        if resp.status_code == 404:
            return {"warning": f"{resource_name[:-1].capitalize()} {resource_id} not found or deleted."}
        resp.raise_for_status()
        return resp.json()
    except RequestException:
        return {"warning": "Contexts service unreachable. Make sure 'contexts-service' is running and accessible."}


def get_ticket_by_id(ticket_id):
    """Fetch a ticket by ID from the Contexts service with caching."""
    if not ticket_id:
        return None
    
    key = f"contexts:ticket:{ticket_id}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    
    result = fetch_resource_by_id('tickets', ticket_id)
    if isinstance(result, dict) and result.get('warning'):
        cache.set(key, result, TICKET_WARNING_TTL)
    else:
        cache.set(key, result, TICKET_CACHE_TTL)
    return result


def get_ticket_by_asset_id(asset_id, status=None):
    """Fetch the first ticket for a specific asset from the Contexts service with caching.

    Args:
        asset_id: The ID of the asset
        status: Optional filter - 'resolved' or 'unresolved'
    """
    if not asset_id:
        return None

    key = f"contexts:tickets:asset:{asset_id}:{status or 'all'}"
    cached = cache.get(key)
    if cached is not None:
        return cached

    # Use the by-asset action endpoint: /tickets/by-asset/{asset_id}/
    # This endpoint returns a single ticket (only one active ticket per asset)
    url = _build_url(f"tickets/by-asset/{asset_id}/")
    params = {}
    if status:
        params['status'] = status

    try:
        resp = client_get(url, params=params, timeout=6)
        if resp.status_code == 404:
            cache.set(key, None, TICKET_WARNING_TTL)
            return None
        resp.raise_for_status()
        ticket = resp.json()

        # Cache the ticket object (or None if empty)
        if ticket:
            cache.set(key, ticket, TICKET_CACHE_TTL)
        else:
            cache.set(key, None, TICKET_WARNING_TTL)

        return ticket
    except RequestException:
        # Return None on error, cache briefly to avoid hammering the service
        cache.set(key, None, TICKET_WARNING_TTL)
        return None


def get_unresolved_ticket_by_asset_id(asset_id):
    """Fetch the unresolved ticket for a specific asset from the Contexts service."""
    """/tickets/by-asset/{asset_id}/?status=unresolved"""
    return get_ticket_by_asset_id(asset_id, status='unresolved')

def fetch_resource_list(resource_name, params=None, skip_api_prefix=False):
    """Fetch a list endpoint from the Contexts service."""
    params = params or {}
    paths = [resource_name + '/']
    if not skip_api_prefix:
        paths.insert(0, 'api/' + resource_name + '/')

    for path in paths:
        url = _build_url(path)
        try:
            resp = client_get(url, params=params, timeout=8)
            if resp.status_code == 404:
                continue  # try next path
            resp.raise_for_status()
            data = resp.json()
            # If remote returns pagination object with results, return as-is
            if isinstance(data, dict) and 'results' in data:
                return data
            return data
        except RequestException:
            continue
    return {"warning": "Contexts service unreachable. Make sure 'contexts-service' is running and accessible."}

def resolve_ticket(ticket_id, asset_checkout_id=None, asset_checkin_id=None):
    """Resolve a ticket by setting is_resolved=True and optionally storing checkout/checkin IDs.

    Args:
        ticket_id: The ID of the ticket to resolve
        asset_checkout_id: The ID of the AssetCheckout record (for checkout tickets)
        asset_checkin_id: The ID of the AssetCheckin record (for checkin tickets)
    """
    if not ticket_id:
        return None

    url = _build_url(f"tickets/{ticket_id}/")
    payload = {"is_resolved": True}

    if asset_checkout_id is not None:
        payload["asset_checkout"] = asset_checkout_id
    if asset_checkin_id is not None:
        payload["asset_checkin"] = asset_checkin_id

    try:
        resp = client_patch(url, json=payload, timeout=6)
        resp.raise_for_status()
        # Invalidate ticket cache
        cache.delete(f"contexts:ticket:{ticket_id}")
        return resp.json()
    except RequestException:
        return {"warning": "Failed to resolve ticket. Contexts service unreachable."}


def get_tickets_list(q=None, limit=50):
    """Fetch a list of unresolved tickets from the Contexts service."""
    key = f"contexts:list:tickets:{q}:{limit}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    params = {}
    if q:
        params['q'] = q
    if limit:
        params['limit'] = limit
    result = fetch_resource_list('tickets/unresolved', params=params)
    if isinstance(result, dict) and result.get('warning'):
        cache.set(key, result, LIST_WARNING_TTL)
    else:
        cache.set(key, result, LIST_CACHE_TTL)
    return result

