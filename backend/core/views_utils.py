from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

@extend_schema(
    tags=['Utilities'],
    summary="Get Current Server Time",
    description="Returns the current server time in ISO 8601 format. Useful for syncing frontend clocks.",
    responses={200: {"type": "object", "properties": {"server_time": {"type": "string", "format": "date-time"}}}}
)
@api_view(['GET'])
@permission_classes([AllowAny]) # Must be public endpoint
def get_server_time(request):
    """
    Provides the current server time to sync client-side clocks.
    """
    return Response({"server_time": timezone.now().isoformat()})