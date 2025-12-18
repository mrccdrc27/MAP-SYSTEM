from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from authentication import JWTCookieAuthentication

# ==================== BASE VIEW CLASS ====================

class BaseReportingView(APIView):
    """Base class for reporting views with common authentication and error handling."""
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def handle_exception(self, exc):
        """Common exception handler."""
        return Response(
            {'error': str(exc), 'type': type(exc).__name__},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
