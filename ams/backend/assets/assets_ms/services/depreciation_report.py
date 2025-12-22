from datetime import date
from django.utils.timezone import now
from typing import List, Dict, Optional
from ..models import Asset, AssetCheckout
from .contexts import get_depreciation_by_id, get_status_by_id

#Will Add authentication imports here later
#Fix the information about tickets later

def _months_between(start_date, end_date) -> int:
    """Return whole months elapsed between two dates (end_date >= start_date).

    If start_date is None, returns 0.
    """
    if not start_date:
        return 0
    # Use year/month difference and adjust by day
    y1, m1, d1 = start_date.year, start_date.month, start_date.day
    y2, m2, d2 = end_date.year, end_date.month, end_date.day
    months = (y2 - y1) * 12 + (m2 - m1)
    if d2 < d1:
        months -= 1
    return max(months, 0)


def generate_depreciation_report(today: Optional[date] = None, depreciation_id: Optional[int] = None) -> List[Dict]:
    """Return a list of assets that have a depreciation configured and computed metrics.

    Each list item contains keys used by the frontend report mockup, for example:
    - assetId, product, statusType, statusName, deployedTo, depreciationName,
      duration, currency, minimumValue, purchaseCost, currentValue,
      depreciated, monthlyDepreciation, monthsLeft

    Parameters:
    - today: optional date to use as "now" for calculations (defaults to today)
    - depreciation_id: if provided, filter assets to that depreciation id
    """
    today = today or date.today()

    qs = Asset.objects.select_related('product').filter(
        is_deleted=False,
        product__is_deleted=False,
    ).exclude(product__depreciation__isnull=True)

    if depreciation_id is not None:
        qs = qs.filter(product__depreciation=depreciation_id)

    results = []

    for asset in qs.order_by('asset_id'):
        product = getattr(asset, 'product', None)
        dep = None
        if product and getattr(product, 'depreciation', None):
            dep = get_depreciation_by_id(product.depreciation)

        # Fallbacks for depreciation fields
        dep_name = None
        duration = None
        minimum_value = 0
        currency = None
        if isinstance(dep, dict):
            dep_name = dep.get('name') or dep.get('display_name') or dep.get('title')
            # common keys used in contexts / frontend
            duration = dep.get('duration') or dep.get('months') or dep.get('duration_months')
            minimum_value = dep.get('minimum_value') or dep.get('minimumValue') or dep.get('minimum') or 0
            currency = dep.get('currency') or dep.get('symbol')

        try:
            purchase_cost = float(asset.purchase_cost if asset.purchase_cost is not None else (product.default_purchase_cost if product and getattr(product, 'default_purchase_cost', None) is not None else 0))
        except Exception:
            purchase_cost = 0.0

        duration = int(duration) if duration else 36
        minimum_value = float(minimum_value) if minimum_value is not None else 0.0
        currency = currency or "₱"

        # Calculate depreciable amount (never negative). If there is no meaningful
        # purchase cost (0) or purchase cost <= minimum value, the monthly
        # depreciation must be zero to avoid negative depreciation values.
        months_elapsed = _months_between(asset.purchase_date, today) if getattr(asset, 'purchase_date', None) else 0
        depreciable_amount = max(0.0, purchase_cost - minimum_value)

        if depreciable_amount <= 0 or duration <= 0:
            monthly_dep = 0.0
        else:
            monthly_dep = depreciable_amount / float(duration)

        depreciated = min(months_elapsed * monthly_dep, depreciable_amount)
        current_value = max(minimum_value, purchase_cost - depreciated)
        months_left = max(duration - months_elapsed, 0)

        # Status lookups (contexts)
        status_info = get_status_by_id(asset.status) if getattr(asset, 'status', None) else None
        status_type = ''
        status_name = ''
        if isinstance(status_info, dict):
            status_type = status_info.get('code') or status_info.get('slug') or ''
            status_name = status_info.get('name') or status_info.get('display_name') or ''

        results.append({
            'id': asset.id,
            'assetId': asset.asset_id or asset.id,
            'product': product.name if product else '',
            'statusType': status_type,
            'statusName': status_name,
            'depreciationName': dep_name or '',
            'duration': duration,
            'currency': currency,
            'minimumValue': minimum_value,
            'purchaseCost': purchase_cost,
            'currentValue': float(current_value),
            'depreciated': float(depreciated),
            'monthlyDepreciation': float(monthly_dep),
            'monthsLeft': months_left,
        })

    return results


def print_sample_report(limit: int = 10) -> None:
    """Utility to print a short sample to stdout (safe to run from manage.py shell).
    Note: Running this as a standalone script requires Django settings to be configured.
    """
    rows = generate_depreciation_report()
    for r in rows[:limit]:
        print(r)
