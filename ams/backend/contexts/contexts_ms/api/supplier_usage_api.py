from contexts_ms.services.http_client import get as client_get
from requests.exceptions import RequestException
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from contexts_ms.services.assets import ASSETS_API_URL
from urllib.parse import urljoin


class SupplierAssetListAPIView(APIView):
    """Proxy endpoint that returns assets referencing a supplier.

    GET /suppliers/<pk>/assets/?page=1&page_size=50
    Forwards query params to the assets service and returns its JSON body.
    """

    def get(self, request, pk):
        page = request.query_params.get('page')
        page_size = request.query_params.get('page_size')
        params = {'supplier': pk}
        if page is not None:
            params['page'] = page
        if page_size is not None:
            params['page_size'] = page_size

        try:
            resp = client_get('assets/', params=params, timeout=10)
            # If upstream returned non-JSON (rare) fall back to text
            try:
                body = resp.json()
            except Exception:
                body = {'detail': resp.text}

            return Response(body, status=resp.status_code)
        except RequestException as exc:
            return Response({'detail': f'Error contacting assets service: {str(exc)}'}, status=status.HTTP_502_BAD_GATEWAY)


class SupplierComponentListAPIView(APIView):
    """Proxy endpoint that returns components referencing a supplier."""

    def get(self, request, pk):
        page = request.query_params.get('page')
        page_size = request.query_params.get('page_size')
        params = {'supplier': pk}
        if page is not None:
            params['page'] = page
        if page_size is not None:
            params['page_size'] = page_size

        try:
            resp = client_get('components/', params=params, timeout=10)
            try:
                body = resp.json()
            except Exception:
                body = {'detail': resp.text}

            return Response(body, status=resp.status_code)
        except RequestException as exc:
            return Response({'detail': f'Error contacting assets service: {str(exc)}'}, status=status.HTTP_502_BAD_GATEWAY)
