from warnings import filters
from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings
from rest_framework import status  # , permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny  # TODO Remove Later
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

from core.permissions import IsBMSUser
from .serializers import DepartmentSerializer, ValidProjectAccountSerializer
from .models import BudgetAllocation, Department, JournalEntryLine, UserActivityLog
from .views_utils import get_user_bms_role

User = get_user_model()


def ratelimit_handler(request, exception):  # Not yet hooked up
    """Custom handler for rate limit exceeded"""
    return JsonResponse({
        'error': 'Rate limit exceeded. Please try again later.',
        'detail': 'Too many requests from your IP address.'
    }, status=429)


def budget_health_check_view(request):  # Renamed for clarity
    app_status = {"status": "healthy", "service": "budget_service"}
    try:
        connection.ensure_connection()  # Check budget_service's DB
        db_connected = True
    except OperationalError:
        db_connected = False
        app_status["database_status"] = "unhealthy"
        app_status["status"] = "degraded"
    else:
        app_status["database_status"] = "healthy"

    if db_connected:
        return JsonResponse(app_status, status=200)
    else:
        return JsonResponse(app_status, status=503)


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


# --- The following views have been moved to auth_service.users.views ---

"""
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]            # ← Allows unauthenticated
    authentication_classes = []                # ← Disable auth checks here
    @extend_schema(
        request=LoginSerializer,
        tags=['Authentication'],
        description='User login endpoint, authenticate users via email/phone and password.',
        responses={
            200: OpenApiResponse(
                description='Successful login response',
                response=inline_serializer(
                    name='SuccessfulLoginResponse',  
                    fields={
                        'refresh': serializers.CharField(),
                        'access': serializers.CharField(),
                        'user': UserSerializer()
                    }
                ),

            ),
            400: OpenApiResponse(
                response=inline_serializer(
                    name='LoginErrorResponse',
                    fields={
                        'error': serializers.DictField(
                            child=serializers.ListField(
                                child=serializers.CharField())
                        )
                    }
                ),

                description='Invalid credentials or validation error',
                examples=[
                    OpenApiExample(
                        'Invalid Credentials',
                        value={
                            "error": {
                                "non_field_errors": ["Invalid credentials"]
                            }
                        },
                        status_codes=['400']
                    ),
                    OpenApiExample(
                        'Missing Credentials',
                        value={
                            "error": {
                                "email": ["This field is required"],
                                "password": ["This field is required"]
                            }
                        },
                        status_codes=['400']
                    )
                ]
            ),
            429: OpenApiResponse(
                description='Rate limit exceeded',
                response=inline_serializer(
                    name='RateLimitResponse',
                    fields={
                        'error': serializers.CharField(),
                        'detail': serializers.CharField()
                    }
                )
            )
        },
        examples=[
            OpenApiExample(
                'Login Example',
                summary='Email login',
                description='Authenticate using email and password',
                value={
                    'email': 'user@example.com',
                    'password': 'password123'
                },
                request_only=True
            ),
            OpenApiExample(
                'Login Example with phone number',
                summary='Phone login',
                description='Authenticate using phone number and password',
                value={
                    'phone_number': '+1234567890',
                    'password': 'password'
                },
                request_only=True
            )
        ]
    )
    def post(self, request):
        # ...existing code...
"""

"""
class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        required=True, help_text="Refresh token to blacklist")


class LogoutResponseSerializer(serializers.Serializer):
    success = serializers.CharField(help_text="Logout status message")


class LogoutErrorSerializer(serializers.Serializer):
    error = serializers.CharField(help_text="Error message")


@method_decorator(ratelimit(key='user', rate='10/m', method='POST', block=True), name='post')
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    @extend_schema(
        request=LogoutSerializer,
        tags=['Authentication'],
        description='User logout endpoint, blacklists the refresh token.',
        responses={
            200: LogoutResponseSerializer,
            400: LogoutErrorSerializer,
            429: OpenApiResponse(
                description='Rate limit exceeded',
                response=inline_serializer(
                    name='LogoutRateLimitResponse',
                    fields={
                        'error': serializers.CharField(),
                        'detail': serializers.CharField()
                    }
                )
            )
        },
        examples=[
            OpenApiExample(
                'Logout Request Example',
                value={"refresh": "your_refresh_token_here"},
                request_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Logout Success Response',
                value={"success": "Logged out"},
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Logout Error Response',
                value={"error": "Refresh token required"},
                response_only=True,
                status_codes=['400']
            )
        ]
    )
    def post(self, request):
        # ...existing code...
"""

"""
class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user
    @extend_schema(
        tags=['User Profile'],
        description='Retrieve authenticated user profile details',
        responses={
            200: UserSerializer,  # Directly reference the serializer
            401: inline_serializer(
                name='UnauthorizedError',
                fields={
                    'detail': serializers.CharField(),
                }
            ),
        },
        examples=[
            OpenApiExample(
                'Success Response',
                description='Response for authorized user',
                value={
                    "id": 1,
                    "email": "user@example.com",
                    "username": "user123",
                    "first_name": "John",
                    "last_name": "Doe",
                    "role": "FINANCE_HEAD",
                    "department": {
                        "id": 1,
                        "name": "Finance",
                        "code": "FIN",
                        "description": "Finance Department"
                    },
                    "phone_number": "+1234567890",
                    "is_active": True,
                    "created_at": "2023-01-01T12:00:00Z",
                    "last_login": "2023-01-01T14:30:00Z"
                },
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Unauthorized Example',
                description='Response for unauthorized access',
                value={
                    "detail": "Authentication credentials were not provided."
                },
                response_only=True,
                status_codes=['401']
            ),
        ]
    )
    def get(self, request, *args, **kwargs):
        # ...existing code...
    @extend_schema(
        tags=['User Profile'],
        description='Update authenticated user profile details',
        responses={
            200: UserSerializer,
            401: inline_serializer(
                name='UpdateUnauthorizedError',
                fields={
                    'detail': serializers.CharField(),
                }
            ),
        },
        examples=[
            OpenApiExample(
                'Update Success Response',
                description='Response after successful profile update',
                value={
                    "id": 1,
                    "email": "updated@example.com",
                    "username": "user123",
                    "first_name": "Updated",
                    "last_name": "User",
                    "role": "FINANCE_HEAD",
                    "department": {
                        "id": 1,
                        "name": "Finance",
                        "code": "FIN",
                        "description": "Finance Department"
                    },
                    "phone_number": "+9876543210",
                    "is_active": True,
                    "created_at": "2023-01-01T12:00:00Z",
                    "last_login": "2023-01-01T14:30:00Z"
                },
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Update Unauthorized Example',
                description='Response for unauthorized access during update',
                value={
                    "detail": "Authentication credentials were not provided."
                },
                response_only=True,
                status_codes=['401']
            ),
        ]
    )
    def update(self, request, *args, **kwargs):
        # ...existing code...
    @extend_schema(
        tags=['User Profile'],
        description='Fully update user profile (all fields required).',
        request=UserSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(
                description="Bad Request: Invalid data",
                response=inline_serializer(
                    name='ProfilePutValidationErrorResponse',  # Unique name
                    fields={'field_name': serializers.ListField(
                        child=serializers.CharField())}
                )
            )
        },
        examples=[
            OpenApiExample(
                'PUT Request Example',
                value={
                    "first_name": "Alice",
                    "last_name": "Smith",
                    "phone_number": "+1234567890",
                    "department_id": 2
                },
                request_only=True,
                status_codes=['200']
            )
        ]
    )
    def put(self, request, *args, **kwargs):
        # ...existing code...
    @extend_schema(
        tags=['User Profile'],
        description='Partially update user profile (partial fields allowed).',
        request=UserSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(
                description="Bad Request: Invalid data",
                response=inline_serializer(
                    name='ProfilePatchValidationErrorResponse',  # Unique name
                    fields={'field_name': serializers.ListField(
                        child=serializers.CharField())}
                )
            )
        },
        examples=[
            OpenApiExample(
                'PATCH Request Example',
                value={"phone_number": "+9876543210"},
                request_only=True,
                status_codes=['200']
            )
        ]
    )
    def patch(self, request, *args, **kwargs):
        # ...existing code...
"""

"""
class LoginAttemptsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsFinanceHead | IsAdmin]
    serializer_class = LoginAttemptSerializer
    @extend_schema(
        tags=['Security'],
        operation_id='list_login_attempts',
        description='List all login attempts (visible only to Finance Heads).',
        responses={
            200: LoginAttemptSerializer(many=True),
            401: OpenApiResponse(
                description="Unauthorized: Authentication credentials were not provided",
                response=inline_serializer(
                    name='UnauthorizedResponse',
                    fields={'detail': serializers.CharField()}
                )
            ),
            403: OpenApiResponse(
                description="Forbidden: User lacks permission",
                response=inline_serializer(
                    name='ForbiddenResponse',
                    fields={'detail': serializers.CharField()}
                )
            )
        },
        examples=[
            OpenApiExample(
                'Success Example',
                value=[{
                    "id": 1,
                    "username": "user123",
                    "ip_address": "192.168.1.1",
                    "user_agent": "Mozilla/5.0",
                    "success": True,
                    "timestamp": "2023-01-01T12:00:00Z"
                }],
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'No Credentials Example',
                value=[{
                    "detail": "Authentication credentials were not provided."
                }],
                response_only=True,
                status_codes=['401']
            )
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        # Only Finance Heads can see all login attempts
        user = self.request.user
        if user.role == 'FINANCE_HEAD':
            return LoginAttempt.objects.all().order_by('-timestamp')
        else:
            # Return an empty queryset instead of filtering by user
            # This will still return a 200 with empty list, so we need additional permission check
            return LoginAttempt.objects.none()
"""

"""
class CustomTokenRefreshView(TokenRefreshView):
    @extend_schema(
        tags=['Authentication'],
        description='Refresh an expired access token using a valid refresh token.',
        request=TokenRefreshSerializer,
        responses={
            200: OpenApiResponse(
                description="New access token",
                response=inline_serializer(
                    name='TokenRefreshResponse',
                    fields={'access': serializers.CharField()}
                )
            ),
            401: OpenApiResponse(
                description="Invalid or expired refresh token",
                response=inline_serializer(
                    name='TokenErrorResponse',
                    fields={'detail': serializers.CharField(
                    ), 'code': serializers.CharField()}
                )
            )
        },
        examples=[
            OpenApiExample(
                'Token Refresh Example',
                value={"refresh": "<your_refresh_token_here>"},
                request_only=True,
                status_codes=['200']
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
"""

# --- End of moved views ---
