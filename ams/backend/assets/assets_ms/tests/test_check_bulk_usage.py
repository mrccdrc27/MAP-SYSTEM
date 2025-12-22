from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory
from assets_ms.views import check_bulk_usage
from rest_framework import status
from unittest.mock import patch, Mock


class CheckBulkUsageTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_missing_type_returns_400(self):
        req = self.factory.post('/usage/check_bulk/', {}, format='json')
        resp = check_bulk_usage(req)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ids_not_list_returns_400(self):
        req = self.factory.post('/usage/check_bulk/', {'type': 'category', 'ids': 'notalist'}, format='json')
        resp = check_bulk_usage(req)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_many_ids_returns_413(self):
        big = list(range(0, 1000))
        req = self.factory.post('/usage/check_bulk/', {'type': 'category', 'ids': big}, format='json')
        resp = check_bulk_usage(req)
        self.assertEqual(resp.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    @patch('assets_ms.api.usage.Repair')
    @patch('assets_ms.api.usage.Asset')
    def test_status_counts_returned(self, mock_asset, mock_repair):
        """When requesting status ids, the endpoint should return asset_count per status id."""
        # Prepare mock queryset behavior
        mock_qs = Mock()
        # Asset.objects.filter(...).filter(...) chain -> return the same mock_qs
        mock_asset.objects.filter.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        # values() should yield rows with status and asset identifiers
        mock_qs.values.return_value = [
            {'status': 5, 'asset_id': 'AS-001', 'id': 1},
            {'status': 6, 'asset_id': 'AS-002', 'id': 2},
        ]

        # Repairs for status -> return empty list/qs
        mock_repair.objects.filter.return_value = []

        req = self.factory.post('/usage/check_bulk/', {'type': 'status', 'ids': [5]}, format='json')
        resp = check_bulk_usage(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get('results')
        # Find the entry for status id 5
        entry = next((r for r in results if r.get('id') == 5), None)
        self.assertIsNotNone(entry)
        self.assertTrue(entry.get('in_use'))
        self.assertEqual(entry.get('asset_count'), 1)
        self.assertIn('AS-001', entry.get('asset_ids'))
