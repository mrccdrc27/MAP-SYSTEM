from warnings import filters
from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.permissions import AllowAny
from rest_framework import status  # , permissions
from rest_framework.views import APIView
from rest_framework import serializers
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiResponse, OpenApiParameter, inline_serializer
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
# from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from django.db import connection
from django.db.utils import OperationalError
from django.views.decorators.csrf import csrf_exempt
from core.permissions import IsBMSUser
from .serializers import DepartmentSerializer, ValidProjectAccountSerializer
from .models import BudgetAllocation, Department, JournalEntryLine, UserActivityLog
from .views_utils import get_user_bms_role
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.authentication import JWTCookieAuthentication
import logging

User = get_user_model()

logger = logging.getLogger(__name__)

# MODIFICATION START: Enhanced Debug Endpoint for Shared Cookies
@api_view(['GET'])
@permission_classes([AllowAny]) # Changed from IsAuthenticated to AllowAny to diagnose connection issues
def debug_auth(request):
    """
    Debug endpoint to verify authentication and cookie reception.
    Access at: GET /api/debug/auth/
    """
    user = request.user
    
    # Inspect raw cookies to verify shared domain configuration
    has_access_token = 'access_token' in request.COOKIES
    cookie_domain = getattr(settings, 'SESSION_COOKIE_DOMAIN', None)
    
    debug_info = {
        'is_authenticated': user.is_authenticated,
        'auth_method': str(request.auth) if request.auth else None,
        'cookies_received': list(request.COOKIES.keys()), # List keys only for security
        'has_access_token_cookie': has_access_token,
        'backend_cookie_domain_setting': cookie_domain,
        'user_details': {
            'user_id': getattr(user, 'user_id', None),
            'email': getattr(user, 'email', None),
            'username': getattr(user, 'username', None),
            'department_name': getattr(user, 'department_name', None),
            'department_id': getattr(user, 'department_id', None),
            'bms_role': user.get_bms_role() if hasattr(user, 'get_bms_role') else None,
            'has_bms_access': user.has_system_access('bms') if hasattr(user, 'has_system_access') else False,
        } if user.is_authenticated else None
    }
    
    logger.info(f"Debug Auth Request. Authenticated: {user.is_authenticated}. Cookies: {list(request.COOKIES.keys())}")
    
    return Response({
        'success': True,
        'message': 'Auth Debug Probe',
        'data': debug_info
    })
# MODIFICATION END

def ratelimit_handler(request, exception):  # Not yet hooked up
    """Custom handler for rate limit exceeded"""
    return JsonResponse({
        'error': 'Rate limit exceeded. Please try again later.',
        'detail': 'Too many requests from your IP address.'
    }, status=429)



class ValidProjectAccountView(APIView):
    """
    API that returns valid projects and accounts with active budget allocations.
    Restricted by user role/department.
    """
    # MODIFICATION: Add permission class
    permission_classes = [IsBMSUser]

    @extend_schema(
        tags=['Valid Projects and Accounts with Active Allocations'],
        summary="Get valid projects and accounts with active allocations",
        responses={200: ValidProjectAccountSerializer(many=True)},
    )
    def get(self, request):
        # Base Query
        allocations = BudgetAllocation.objects.filter(is_active=True).select_related(
            'project', 'account', 'department', 'fiscal_year'
        )

        # --- MODIFICATION START: Data Isolation ---
        user = request.user
        bms_role = get_user_bms_role(user)

        if bms_role == 'GENERAL_USER':
            department_id = getattr(user, 'department_id', None)
            if department_id:
                allocations = allocations.filter(department_id=department_id)
            else:
                allocations = allocations.none()
        # --- MODIFICATION END ---

        data = [
            {
                'project_id': a.project.id,
                'project_title': a.project.name,
                'account_id': a.account.id,
                'account_code': a.account.code,
                'account_title': a.account.name,
                'department_name': a.department.name,
                'fiscal_year_name': a.fiscal_year.name
            }
            for a in allocations
        ]

        # Deduplicate results (if a project has multiple allocations)
        # Or keep as is if the frontend filters specific allocations.
        # The current serializer structure implies unique combinations.

        return Response(data, status=status.HTTP_200_OK)


@extend_schema_view(
    list=extend_schema(
        operation_id="list_departments",
        summary="List all departments",
        description="Returns a list of all active departments for populating the department dropdown menu in the user management UI.",
        parameters=[
            OpenApiParameter(
                name="search",
                description="Search departments by name or code",
                required=False,
                type=OpenApiTypes.STR
            )
        ],
        responses={
            200: DepartmentSerializer(many=True),
            401: {"description": "Authentication credentials were not provided"}
        },
        tags=["Departments"]
    ),
    retrieve=extend_schema(
        operation_id="get_department",
        summary="Get department details",
        description="Returns detailed information about a specific department.",
        responses={
            200: DepartmentSerializer,
            404: {"description": "Department not found"},
            401: {"description": "Authentication credentials were not provided"}
        },
        tags=["Departments"]
    )
)
class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for departments.
    Used to populate department dropdowns in user management.
    """
    permission_classes = [IsAuthenticated]
    queryset = Department.objects.filter(is_active=True).order_by('name')
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']

@api_view(['GET'])
@permission_classes([AllowAny])
def storage_diagnostic(request):
    """
    Diagnostic endpoint to check file storage configuration.
    Access at: GET /api/diagnostics/storage/
    """
    import cloudinary
    
    storage_info = {
        'DEBUG': settings.DEBUG,
        'storage_backend': default_storage.__class__.__name__,
        'storage_module': default_storage.__class__.__module__,
        'expected_backend': 'MediaCloudinaryStorage' if not settings.DEBUG else 'FileSystemStorage',
        'cloudinary_configured': bool(getattr(settings, 'CLOUDINARY_URL', None)),
        'cloudinary_cloud_name': cloudinary.config().cloud_name if hasattr(cloudinary.config(), 'cloud_name') else None,
        'media_url': settings.MEDIA_URL,
        'default_file_storage': getattr(settings, 'DEFAULT_FILE_STORAGE', 'Not Set'),
    }
    
    # Check if Cloudinary is actually working
    try:
        test_result = cloudinary.api.ping()
        storage_info['cloudinary_ping'] = 'SUCCESS'
    except Exception as e:
        storage_info['cloudinary_ping'] = f'FAILED: {str(e)}'
    
    # Determine if configuration is correct
    is_correct = (
        not settings.DEBUG and 
        storage_info['storage_backend'] == 'MediaCloudinaryStorage' and
        storage_info['cloudinary_ping'] == 'SUCCESS'
    )
    
    return Response({
        'status': 'OK' if is_correct else 'MISCONFIGURED',
        'details': storage_info,
        'recommendation': (
            'Configuration is correct ✅' if is_correct else
            '⚠️  Set DEBUG=False in Render environment variables and redeploy'
        )
    })