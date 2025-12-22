import unittest
from unittest.mock import patch, MagicMock

import os
import sys
import requests

# Make local apps importable when running this script from repository root
ROOT = os.path.dirname(__file__)
CONTEXTS_PKG = os.path.join(ROOT, 'backend', 'contexts')
if CONTEXTS_PKG not in sys.path:
    sys.path.insert(0, CONTEXTS_PKG)

from contexts_ms.services.usage_check import is_item_in_use


def _build_cant_delete_message_for_test(instance, usage):
    label = instance.__class__.__name__.lower()
    asset_ids = usage.get('asset_ids') or []
    comp_ids = usage.get('component_ids') or []
    repair_ids = usage.get('repair_ids') or []

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

    if asset_ids:
        total = len(asset_ids)
        if total <= 5:
            samples = ', '.join(map(str, asset_ids))
            return f"Cannot delete {label_with_display()}. Currently used by Asset(s): {samples}."
        else:
            return f"Cannot delete {label_with_display()}. Currently used by assets."

    parts = []
    if comp_ids:
        parts.append('component(s)')
    if repair_ids:
        parts.append('repair(s)')

    if parts:
        if len(parts) == 1:
            body = parts[0]
        elif len(parts) == 2:
            body = f"{parts[0]} and {parts[1]}"
        else:
            body = ', '.join(parts[:-1]) + f", and {parts[-1]}"
        return f"Cannot delete {label_with_display()}. Currently used by {body}."

    return f"Cannot delete {label_with_display()}. It is referenced by other records."


class Dummy:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class LocalTests(unittest.TestCase):
    def test_no_references(self):
        inst = Dummy(name='CtxA')
        msg = _build_cant_delete_message_for_test(inst, {})
        self.assertIn('Cannot delete', msg)
        self.assertIn('ctxa', msg.lower())

    def test_asset_samples(self):
        inst = Dummy(name='SupplierOne')
        usage = {'asset_ids': ['AST-1', 'AST-2']}
        msg = _build_cant_delete_message_for_test(inst, usage)
        self.assertIn('Asset(s): AST-1, AST-2', msg)

    def test_many_assets_generic(self):
        inst = Dummy(name='CatBig')
        usage = {'asset_ids': [f'A{i}' for i in range(10)]}
        msg = _build_cant_delete_message_for_test(inst, usage)
        self.assertIn('Currently used by assets', msg)

    def test_components_and_repairs(self):
        inst = Dummy(title='T1')
        usage = {'component_ids': [1], 'repair_ids': [2]}
        msg = _build_cant_delete_message_for_test(inst, usage)
        self.assertIn('component(s) and repair(s)', msg)


class UsageCheckTests(unittest.TestCase):
    def test_check_usage_endpoint_reports_in_use(self):
        # Mock the client_get to return a response with in_use True for the check-usage endpoint
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {'in_use': True}

        with patch('contexts_ms.services.usage_check.client_get', return_value=mock_resp):
            res = is_item_in_use('supplier', 42)
            self.assertTrue(res['in_use'])

    def test_network_error_conservative_true(self):
        # Simulate network error for all client_get calls
        with patch('contexts_ms.services.usage_check.client_get', side_effect=requests.RequestException()):
            res = is_item_in_use('supplier', 99)
            self.assertTrue(res['in_use'])

    def test_not_in_use_when_check_endpoint_returns_false(self):
        # check-usage returns in_use False -> should return not in use
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {'in_use': False}

        with patch('contexts_ms.services.usage_check.client_get', return_value=mock_resp):
            res = is_item_in_use('supplier', 7)
            self.assertFalse(res['in_use'])


if __name__ == '__main__':
    unittest.main()
