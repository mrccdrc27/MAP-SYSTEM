from decimal import Decimal
import math
from django.db.models import Sum, F, DecimalField, Q
from django.db.models.functions import Coalesce
from rest_framework import viewsets, views, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample, OpenApiResponse
from django.db.models import Subquery, OuterRef, Q
from core.permissions import IsBMSUser
from core.pagination import ProjectStatusPagination, StandardResultsSetPagination
from .models import Department, ExpenseCategory, FiscalYear, BudgetAllocation, Expense, Forecast, Project
from .serializers import DepartmentBudgetSerializer
from .serializers_dashboard import CategoryAllocationSerializer, CategoryBudgetStatusSerializer, DashboardBudgetSummarySerializer, DepartmentBudgetStatusSerializer, ForecastAccuracySerializer, ProjectStatusSerializer, SimpleProjectSerializer, ProjectDetailSerializer
from rest_framework.permissions import IsAuthenticated
from .serializers_dashboard import MonthlyBudgetActualSerializer
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, action
import calendar
from decimal import Decimal
from django.utils import timezone
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from .serializers_dashboard import ForecastSerializer
from django.views.decorators.cache import cache_page


class DepartmentBudgetView(views.APIView):
    """
    API endpoint that returns department budget allocation information
    """

    @extend_schema(
        tags=["Dashboard"],
        summary="Get department budget allocations",
        description="Returns budget allocation information for all active departments in the specified fiscal year",
        parameters=[
            OpenApiParameter(
                name="fiscal_year_id",
                description="ID of the fiscal year to get budget allocations for",
                required=True,
                type=int
            ),
        ],
        responses={
            200: DepartmentBudgetSerializer(many=True),
            400: {"type": "object", "properties": {"error": {"type": "string"}}},
            404: {"type": "object", "properties": {"error": {"type": "string"}}},
        },
        examples=[
            OpenApiExample(
                "Example Response",
                value=[{
                    "id": 1,
                    "name": "Human Resources",
                    "code": "HR",
                    "total_budget": "500000.00",
                    "total_spent": "320000.00",
                    "remaining_budget": "180000.00",
                    "percentage_used": 64.0
                }],
                response_only=True,
            )
        ]
    )
    def get(self, request):
        fiscal_year_id = request.query_params.get('fiscal_year_id')

        if not fiscal_year_id:
            return Response({"error": "fiscal_year_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id)
        except FiscalYear.DoesNotExist:
            return Response({"error": "Fiscal year not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get all departments with active allocations via projects & proposals
        departments = Department.objects.filter(
            is_active=True,
            budgetproposal__project__budget__is_active=True,
            budgetproposal__fiscal_year=fiscal_year
        ).distinct()

        # Subquery for total budget allocation per department
        budget_subquery = BudgetAllocation.objects.filter(
            project__budget_proposal__department=OuterRef('pk'),
            project__budget_proposal__fiscal_year=fiscal_year,
            is_active=True
        ).values('project__budget_proposal__department').annotate(
            total=Sum('amount')
        ).values('total')

        # Subquery for total approved expenses per department
        expense_subquery = Expense.objects.filter(
            budget_allocation__project__budget_proposal__department=OuterRef(
                'pk'),
            budget_allocation__project__budget_proposal__fiscal_year=fiscal_year,
            status='APPROVED'
        ).values('budget_allocation__project__budget_proposal__department').annotate(
            total=Sum('amount')
        ).values('total')

        departments = departments.annotate(
            total_budget=Coalesce(Subquery(budget_subquery),
                                  0, output_field=DecimalField()),
            total_spent=Coalesce(Subquery(expense_subquery),
                                 0, output_field=DecimalField())
        )

        for dept in departments:
            dept.remaining_budget = dept.total_budget - dept.total_spent
            dept.percentage_used = round(
                (dept.total_spent / dept.total_budget * 100), 2
            ) if dept.total_budget > 0 else 0

        serializer = DepartmentBudgetSerializer(departments, many=True)
        return Response(serializer.data)


# Helper to scale values based on period
def get_period_divisor(period):
    if period == 'monthly':
        return Decimal('12.0')
    elif period == 'quarterly':
        return Decimal('4.0')
    return Decimal('1.0')


@extend_schema(
    tags=["Dashboard"],
    summary="Get dashboard budget summary",
    description="Returns total, spent, and remaining budget. Can be filtered by period.",
    # MODIFICATION START: Add the period parameter to the schema
    parameters=[
        OpenApiParameter(
            name="period",
            description="Filter the summary by a time period. Defaults to 'yearly'.",
            required=False,
            type=str,
            enum=['monthly', 'quarterly', 'yearly']
        )
    ],
    # MODIFICATION END
    responses={200: DashboardBudgetSummarySerializer},
    examples=[
        OpenApiExample(
            "Dashboard Budget Summary Example",
            value={
                "fiscal_year": "FY2025",
                "total_budget": "12500000.00",
                "total_spent": "4500000.00",
                "remaining_budget": "8000000.00",
                "remaining_percentage": 64.0,
                "percentage_used": 46.0,
                "available_for_allocation": True

            },
            response_only=True
        )
    ]
)
@api_view(['GET'])
@permission_classes([IsBMSUser])
def get_dashboard_budget_summary(request):
    # MODIFICATION START
    user = request.user
    user_roles = getattr(user, 'roles', {})
    bms_role = user_roles.get('bms')

    today = timezone.now().date()
    fiscal_year = FiscalYear.objects.filter(
        start_date__lte=today,
        end_date__gte=today,
        is_active=True
    ).first()

    if not fiscal_year:
        return Response({"detail": "No active fiscal year found."}, status=404)

    # Filter Logic
    period = request.query_params.get('period', 'yearly')

    # Define date ranges for SPENT calculation
    if period == 'monthly':
        start_date_filter = today.replace(day=1)
        # End date: First day of next month - 1 day
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date_filter = next_month.replace(day=1) - timedelta(days=1)
    elif period == 'quarterly':
        current_quarter = (today.month - 1) // 3 + 1
        start_month = (current_quarter - 1) * 3 + 1
        start_date_filter = date(today.year, start_month, 1)
        end_date_filter = (start_date_filter +
                           relativedelta(months=3)) - relativedelta(days=1)
    else:  # yearly
        start_date_filter = fiscal_year.start_date
        end_date_filter = fiscal_year.end_date

    # Base allocations
    allocations_qs = BudgetAllocation.objects.filter(
        is_active=True,
        fiscal_year=fiscal_year
    )

    # Data Isolation
    if bms_role == 'GENERAL_USER':
        department_id = getattr(user, 'department_id', None)
        if department_id:
            allocations_qs = allocations_qs.filter(department_id=department_id)
        else:
            allocations_qs = BudgetAllocation.objects.none()

    # 1. Total Yearly Budget (Base)
    total_yearly_budget = allocations_qs.aggregate(
        total=Sum('amount'))['total'] or Decimal('0.00')

    # 2. Divisor for Period
    divisor = get_period_divisor(period)

    # 3. Calculate Period Budget (Allocated for this timeframe)
    total_budget_for_period = total_yearly_budget / divisor

    # 4. Calculate Actual Spent (In this specific timeframe)
    # Note: We filter expenses by the calculated date range
    total_spent_for_period = Expense.objects.filter(
        budget_allocation__in=allocations_qs,
        status='APPROVED',
        date__range=[start_date_filter, end_date_filter]
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # 5. Remaining
    remaining_budget = total_budget_for_period - total_spent_for_period

    # 6. Percentage
    percentage_used = Decimal('0.00')
    if total_budget_for_period > 0:
        percentage_used = (total_spent_for_period /
                           total_budget_for_period) * 100

    serializer = DashboardBudgetSummarySerializer({
        "fiscal_year": fiscal_year.name,
        "total_budget": round(total_budget_for_period, 2),
        "total_spent": round(total_spent_for_period, 2),
        "remaining_budget": round(remaining_budget, 2),
        # usually 1 decimal for %
        "percentage_used": round(percentage_used, 1),
        "remaining_percentage": round(100 - percentage_used, 1),
        "available_for_allocation": True
    })

    return Response(serializer.data)


class MonthlyBudgetActualViewSet(viewsets.ViewSet):
    """
    ViewSet for retrieving monthly budget vs actual data
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Dashboard'],
        summary="Monthly Budget vs Actual (by department)",
        description="Returns monthly budget and actual expenses for a given department and fiscal year.",
        parameters=[
            OpenApiParameter(name='department_id', type=int, required=True),
            OpenApiParameter(name='fiscal_year_id', type=int, required=True),
            OpenApiParameter(name='project_id', type=int, required=False),
        ],
        responses={200: MonthlyBudgetActualSerializer(many=True)},
        examples=[
            OpenApiExample(
                "Monthly Budget Example",
                value=[
                    {"month": 1, "month_name": "January",
                     "budget": "50000.00", "actual": "42000.00"},
                    {"month": 2, "month_name": "February",
                     "budget": "50000.00", "actual": "31000.00"},
                ],
                response_only=True
            )
        ]
    )
    def list(self, request):
        """
        Get monthly budget vs actual data for a specific department and fiscal year.

        Query parameters:
        - department_id: ID of the department
        - fiscal_year_id: ID of the fiscal year 
        - project_id: Optional - filter by specific project
        """
        # Get parameters
        department_id = request.query_params.get('department_id')
        fiscal_year_id = request.query_params.get('fiscal_year_id')
        project_id = request.query_params.get('project_id')

        # Validate required parameters
        if not department_id or not fiscal_year_id:
            return Response(
                {"error": "department_id and fiscal_year_id are required parameters"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            department = Department.objects.get(id=department_id)
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id)
        except (Department.DoesNotExist, FiscalYear.DoesNotExist):
            return Response(
                {"error": "Department or fiscal year not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Base query for budget allocations
        budget_query = BudgetAllocation.objects.filter(
            department=department,
            fiscal_year=fiscal_year,
            is_active=True
        )

        # Apply project filter if specified
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                budget_query = budget_query.filter(project=project)
            except Project.DoesNotExist:
                return Response(
                    {"error": "Project not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Get total budget
        total_budget = budget_query.aggregate(
            total=Sum('amount'))['total'] or 0

        # Calculate monthly data
        monthly_data = self._calculate_monthly_data(
            department, fiscal_year, total_budget, project_id
        )

        serializer = MonthlyBudgetActualSerializer(monthly_data, many=True)
        return Response(serializer.data)

    def _calculate_monthly_data(self, department, fiscal_year, total_budget, project_id=None):
        """
        Calculate budget and actual expenses by month

        This method distributes the annual budget across months based on fiscal year
        duration and retrieves actual expenses by month
        """
        result = []

        # Get start and end months within this fiscal year
        start_month = fiscal_year.start_date.month
        start_year = fiscal_year.start_date.year
        end_month = fiscal_year.end_date.month
        end_year = fiscal_year.end_date.year

        # Calculate total months in fiscal year
        total_months = (end_year - start_year) * 12 + \
            (end_month - start_month) + 1

        # If total months is zero (invalid fiscal year), return empty result
        if total_months <= 0:
            return result

        # Distribute budget evenly across months (simple approach)
        monthly_budget = total_budget / total_months

        # For each month in the fiscal year
        current_year = start_year
        current_month = start_month

        for _ in range(total_months):
            # Base query for expenses in this month
            expense_query = Expense.objects.filter(
                department=department,
                status='APPROVED',
                date__year=current_year,
                date__month=current_month,
                budget_allocation__fiscal_year=fiscal_year
            )

            # Apply project filter if specified
            if project_id:
                expense_query = expense_query.filter(project_id=project_id)

            # Get actual expenses for this month
            actual_expenses = expense_query.aggregate(
                total=Sum('amount'))['total'] or 0

            # Add to result
            result.append({
                'month': current_month,
                'month_name': calendar.month_name[current_month],
                'budget': monthly_budget,
                'actual': actual_expenses
            })

            # Move to next month
            if current_month == 12:
                current_month = 1
                current_year += 1
            else:
                current_month += 1

        return result

    @extend_schema(

        summary="Monthly Budget vs Actual (Project-Based)",
        description=(
            "Returns a monthly breakdown of budget vs actual expenses for a specific project. "
            "Distributes the total project budget across its duration (based on start and end dates) "
            "and aggregates approved expenses by month."
        ),
        parameters=[
            OpenApiParameter(
                name='project_id',
                type=int,
                required=True,
                description='The ID of the project to retrieve budget vs actual data for.'
            )
        ],
        responses={
            200: OpenApiResponse(
                response=MonthlyBudgetActualSerializer(many=True),
                description='Monthly budget vs actual data for the specified project.'
            ),
            400: OpenApiResponse(
                description='Missing or invalid project_id parameter',
                response=OpenApiExample(
                    'Missing project_id',
                    value={"error": "project_id is required"},
                    response_only=True,
                    status_codes=["400"]
                )
            ),
            404: OpenApiResponse(
                description='Project or allocation not found',
                response=OpenApiExample(
                    'Project not found',
                    value={"error": "Project not found"},
                    response_only=True,
                    status_codes=["404"]
                )
            )
        },
        examples=[
            OpenApiExample(
                'Successful Response Example',
                value=[
                    {"month": 1, "month_name": "January",
                        "budget": "50000.00", "actual": "42000.00"},
                    {"month": 2, "month_name": "February",
                        "budget": "50000.00", "actual": "31000.00"}
                ],
                response_only=True,
                status_codes=["200"]
            )
        ],
        tags=['Dashboard'],
    )
    @action(detail=False, methods=['get'])
    def project_distribution(self, request):
        """
        Alternative calculation based on project start/end dates to 
        distribute budget more intelligently across months.

        This is an enhanced version that considers project timelines.
        """
        # Get parameters
        project_id = request.query_params.get('project_id')

        if not project_id:
            return Response(
                {"error": "project_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get budget allocation for this project
        try:
            budget_allocation = BudgetAllocation.objects.get(
                project=project,
                is_active=True
            )
        except BudgetAllocation.DoesNotExist:
            return Response(
                {"error": "No active budget allocation found for this project"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate monthly data based on project timeline
        monthly_data = self._calculate_project_monthly_data(
            project, budget_allocation
        )

        serializer = MonthlyBudgetActualSerializer(monthly_data, many=True)
        return Response(serializer.data)

    def _calculate_project_monthly_data(self, project, budget_allocation):
        """
        Calculate budget and actual expenses by month based on project timeline.

        This distributes the budget according to project duration rather than 
        fiscal year, which is likely more accurate for project-specific views.
        """
        result = []

        # Get project start and end months
        start_month = project.start_date.month
        start_year = project.start_date.year
        end_month = project.end_date.month
        end_year = project.end_date.year

        # Calculate total months in project
        total_months = (end_year - start_year) * 12 + \
            (end_month - start_month) + 1

        # If total months is zero (invalid project dates), return empty result
        if total_months <= 0:
            return result

        # Distribute budget evenly across months
        monthly_budget = budget_allocation.amount / Decimal(total_months)

        # For each month in the project
        current_year = start_year
        current_month = start_month

        for _ in range(total_months):
            # Get actual expenses for this month
            actual_expenses = Expense.objects.filter(
                project=project,
                status='APPROVED',
                date__year=current_year,
                date__month=current_month
            ).aggregate(total=Sum('amount'))['total'] or 0

            # Add to result
            result.append({
                'month': current_month,
                'month_name': calendar.month_name[current_month],
                'budget': monthly_budget,
                'actual': actual_expenses
            })

            # Move to next month
            if current_month == 12:
                current_month = 1
                current_year += 1
            else:
                current_month += 1

        return result


@extend_schema(
    summary="Get all projects (no filters)",
    description="Returns a list of all projects in the system, with no filters or conditions.",
    responses={200: SimpleProjectSerializer(many=True)},
    tags=["Projects"]
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_projects(request):
    projects = Project.objects.all()
    serializer = SimpleProjectSerializer(projects, many=True)
    return Response(serializer.data)


@extend_schema(
    summary="Project Table List",
    description="Returns a paginated list of all projects in the current fiscal year with budget, spending, remaining, and progress info.",
    parameters=[
        OpenApiParameter(
            name='page',
            type=int,
            description='Page number',
            required=False
        ),
        OpenApiParameter(
            name='page_size',
            type=int,
            description='Number of results per page (max 100)',
            required=False
        ),
    ],
    responses={200: ProjectStatusSerializer(many=True)},
    tags=["Dashboard"],
    examples=[
        OpenApiExample(
            "Project Status Example",
            value={
                "count": 15,
                "next": "http://api.example.org/projects/?page=2",
                "previous": None,
                "results": [
                    {
                        "project_id": 1,
                        "project_name": "HR Automation",
                        "budget": "1000000.00",
                        "spent": "600000.00",
                        "remaining": "400000.00",
                        "status": "Ongoing",
                        "progress": 60.0
                    },
                    {
                        "project_id": 2,
                        "project_name": "IT Infrastructure Upgrade",
                        "budget": "2500000.00",
                        "spent": "1200000.00",
                        "remaining": "1300000.00",
                        "status": "Ongoing",
                        "progress": 48.0
                    }
                ]
            },
            response_only=True
        )
    ]
)
@api_view(['GET'])
@permission_classes([IsBMSUser])  # MODIFIED: Use specific BMS permission
def get_project_status_list(request):
    paginator = ProjectStatusPagination()
    user = request.user  # MODIFIED: Get user
    today = timezone.now().date()

    fiscal_year = FiscalYear.objects.filter(
        start_date__lte=today,
        end_date__gte=today,
        is_active=True
    ).first()

    if not fiscal_year:
        return Response({"detail": "No active fiscal year found."}, status=404)

    # --- MODIFICATION START ---
    allocations_qs = BudgetAllocation.objects.filter(
        fiscal_year=fiscal_year,
        is_active=True
    ).select_related('project')

    user_roles = getattr(user, 'roles', {})
    bms_role = user_roles.get('bms')

    # FIX: Finance Head gets global view. General User gets restricted view.
    if bms_role == 'GENERAL_USER':
        department_id = getattr(user, 'department_id', None)
        if department_id:
            allocations_qs = allocations_qs.filter(department_id=department_id)
        else:
            allocations_qs = BudgetAllocation.objects.none()

    project_data = []

    # MODIFIED: Use the filtered queryset
    for alloc in allocations_qs:
        expenses = Expense.objects.filter(
            budget_allocation=alloc,
            status='APPROVED'
        )

        spent = expenses.aggregate(total=Sum('amount'))['total'] or 0
        budget = alloc.amount
        remaining = budget - spent
        progress = (spent / budget * 100) if budget > 0 else 0

        project_data.append({
            "project_id": alloc.project.id,
            "project_name": alloc.project.name,
            "budget": budget,
            "spent": spent,
            "remaining": remaining,
            "status": alloc.project.status,
            "progress": round(progress, 2)
        })

    # Apply pagination
    page = paginator.paginate_queryset(project_data, request)

    # Serialize the paginated results
    serializer = ProjectStatusSerializer(page, many=True)

    # Return the paginated response
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    summary="Department Budget vs Actual",
    description="Returns departments' budget status. Supports period filtering to scale budget/spent values.",
    parameters=[
        OpenApiParameter(
            name="period",
            description="Filter by time period (yearly, quarterly, monthly). Default: yearly",
            required=False,
            type=str,
            enum=['monthly', 'quarterly', 'yearly']
        )
    ],
    responses={200: DepartmentBudgetStatusSerializer(many=True)},
    tags=["Dashboard"]
)
@api_view(['GET'])
@permission_classes([IsBMSUser])
def get_department_budget_status(request):
    user = request.user
    user_roles = getattr(user, 'roles', {})
    bms_role = user_roles.get('bms')
    today = timezone.now().date()

    fiscal_year = FiscalYear.objects.filter(
        start_date__lte=today,
        end_date__gte=today,
        is_active=True
    ).first()

    if not fiscal_year:
        return Response({"detail": "No active fiscal year found."}, status=404)
    
    # Filter Logic
    period = request.query_params.get('period', 'yearly')
    divisor = get_period_divisor(period)

    # Define date ranges for SPENT calculation
    if period == 'monthly':
        start_date_filter = today.replace(day=1)
        next_month = today.replace(day=28) + timedelta(days=4)
        end_date_filter = next_month.replace(day=1) - timedelta(days=1)
    elif period == 'quarterly':
        current_quarter = (today.month - 1) // 3 + 1
        start_month = (current_quarter - 1) * 3 + 1
        start_date_filter = date(today.year, start_month, 1)
        end_date_filter = (start_date_filter + relativedelta(months=3)) - relativedelta(days=1)
    else: # yearly
        start_date_filter = fiscal_year.start_date
        end_date_filter = fiscal_year.end_date

    departments_qs = Department.objects.filter(is_active=True)

    # DATA ISOLATION
    if bms_role == 'GENERAL_USER':
        department_id = getattr(user, 'department_id', None)
        if department_id:
            departments_qs = departments_qs.filter(id=department_id)
        else:
            departments_qs = Department.objects.none()

    result = []

    for dept in departments_qs:
        allocations = BudgetAllocation.objects.filter(
            is_active=True,
            fiscal_year=fiscal_year,
            department=dept 
        )

        # 1. Total Yearly Budget for Dept
        yearly_budget = allocations.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # 2. Scaled Budget for Period
        period_budget = yearly_budget / divisor

        # 3. Spent in Period
        period_spent = Expense.objects.filter(
            status='APPROVED',
            budget_allocation__in=allocations,
            date__range=[start_date_filter, end_date_filter]
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        percent_used = Decimal('0.0')
        if period_budget > 0:
            percent_used = (period_spent / period_budget) * 100

        result.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "budget": round(period_budget, 2),
            "spent": round(period_spent, 2),
            "percentage_used": round(percent_used, 1)
        })

    serializer = DepartmentBudgetStatusSerializer(result, many=True)
    return Response(serializer.data)


class TopCategoryBudgetAllocationView(APIView):
    permission_classes = [IsAuthenticated]
    """
    Returns top N budget allocations grouped by category.
    """
    @extend_schema(
        summary="Top Budget Allocations by Category (Budget Allocation by Categories on UI)",
        description="Returns total allocated budget grouped by category. Use ?limit=N to limit the number of categories returned.",
        parameters=[
            OpenApiParameter(
                name="limit",
                type=int,
                required=False,
                description="Limit the number of categories returned (default: 3)"
            )
        ],
        responses={200: CategoryAllocationSerializer(many=True)},
        tags=["Dashboard"]
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 3))

        today = timezone.now().date()
        active_fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, end_date__gte=today, is_active=True).first()

        if not active_fiscal_year:
            return Response({"detail": "No active fiscal year for filtering top categories."}, status=status.HTTP_404_NOT_FOUND)

        category_allocations = ExpenseCategory.objects.annotate(
            total_allocated=Coalesce(
                Sum('budget_allocations__amount', filter=Q(budget_allocations__is_active=True,
                    budget_allocations__fiscal_year=active_fiscal_year)),  # Added fiscal year filter
                Decimal('0'), output_field=DecimalField()
            )
        ).filter(total_allocated__gt=0).order_by('-total_allocated')[:limit]
        serializer = CategoryAllocationSerializer(
            category_allocations, many=True)
        return Response(serializer.data)


@extend_schema(
    tags=["Dashboard"],
    summary="Overall Monthly Budget vs Actual (Money Flow)",
    description="Returns a monthly breakdown of the total budget vs. total actual expenses across ALL departments for a given fiscal year.",
    parameters=[
        OpenApiParameter(name='fiscal_year_id', type=int, required=False,
                         description="ID of the fiscal year. If not provided, the current active fiscal year will be used."),
    ],
    responses={200: MonthlyBudgetActualSerializer(many=True)},
    examples=[
        OpenApiExample(
            "Overall Monthly Budget Example",
            value=[
                {"month": 1, "month_name": "January",
                    "budget": "150000.00", "actual": "110000.00"},
                {"month": 2, "month_name": "February",
                    "budget": "150000.00", "actual": "135000.00"},
            ],
            response_only=True
        )
    ]
)
@api_view(['GET'])
@permission_classes([IsBMSUser])  # Use specific BMS permission
def overall_monthly_budget_actual(request):
    fiscal_year_id = request.query_params.get('fiscal_year_id')
    user = request.user

    if fiscal_year_id:
        try:
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id)
        except FiscalYear.DoesNotExist:
            return Response({"error": "Fiscal year not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        today = timezone.now().date()
        fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, end_date__gte=today, is_active=True).first()
        if not fiscal_year:
            return Response({"detail": "No active fiscal year found."}, status=status.HTTP_404_NOT_FOUND)

    # --- MODIFICATION START ---
    # Apply data isolation to budget and expense queries
    user_roles = getattr(user, 'roles', {})
    bms_role = user_roles.get('bms')

    budget_query = BudgetAllocation.objects.filter(
        fiscal_year=fiscal_year, is_active=True)
    expense_query_base = Expense.objects.filter(
        status='APPROVED', budget_allocation__fiscal_year=fiscal_year)

    # FIX: Restrict General Users, allow Finance/Admin global
    if bms_role == 'GENERAL_USER':
        department_id = getattr(user, 'department_id', None)
        if department_id:
            budget_query = budget_query.filter(department_id=department_id)
            expense_query_base = expense_query_base.filter(
                department_id=department_id)
        else:
            budget_query = budget_query.none()
            expense_query_base = expense_query_base.none()

    # ADMIN and FINANCE_HEAD see overall data

    total_budget = budget_query.aggregate(
        total=Coalesce(Sum('amount'), Decimal('0')))['total']
    # --- MODIFICATION END ---

    # Simple even distribution of budget across 12 months for the chart
    monthly_budget = total_budget / 12

    monthly_data = []
    for month_num in range(1, 13):
        # --- MODIFICATION START ---
        # Filtered expense query base
        actual_expenses = expense_query_base.filter(
            date__year=fiscal_year.start_date.year,
            date__month=month_num
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']
        # --- MODIFICATION END ---

        monthly_data.append({
            'month': month_num,
            'month_name': calendar.month_name[month_num],
            'budget': monthly_budget,
            'actual': actual_expenses
        })

    serializer = MonthlyBudgetActualSerializer(monthly_data, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=["Dashboard"],
    summary="Budget per Category Status",
    description="Returns the budget, spending, and usage percentage for each expense category in the active fiscal year. This is for the 'Budget per Category' table.",
    parameters=[
        OpenApiParameter(name='fiscal_year_id', type=int, required=False,
                         description="ID of the fiscal year. If not provided, the current active fiscal year will be used."),
    ],
    responses={200: CategoryBudgetStatusSerializer(many=True)},
    examples=[
        OpenApiExample(
            "Example Response",
            value=[
                {"category_id": 1, "category_name": "Professional Services",
                    "budget": "50000.00", "spent": "25000.00", "percentage_used": 50.0},
                {"category_id": 2, "category_name": "Equipment and Maintenance",
                    "budget": "120000.00", "spent": "100000.00", "percentage_used": 83.33},
            ],
            response_only=True
        )
    ]
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_category_budget_status(request):
    fiscal_year_id = request.query_params.get('fiscal_year_id')

    if fiscal_year_id:
        try:
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id)
        except FiscalYear.DoesNotExist:
            return Response({"error": "Fiscal year not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        today = timezone.now().date()
        fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, end_date__gte=today, is_active=True).first()
        if not fiscal_year:
            return Response({"detail": "No active fiscal year found."}, status=status.HTTP_404_NOT_FOUND)

    categories = ExpenseCategory.objects.filter(is_active=True)
    result = []

    for cat in categories:
        # Get total budget allocated to this category for the fiscal year
        budget = BudgetAllocation.objects.filter(
            is_active=True,
            fiscal_year=fiscal_year,
            category=cat
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        # Get total spent from this category for the fiscal year
        spent = Expense.objects.filter(
            status='APPROVED',
            category=cat,
            budget_allocation__fiscal_year=fiscal_year
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total']

        # Only include categories that have a budget
        if budget > 0:
            percent_used = (spent / budget * 100) if budget > 0 else 0
            result.append({
                "category_id": cat.id,
                "category_name": cat.name,
                # MODIFIED: Populate classification
                "classification": cat.classification,
                "budget": budget,
                "spent": spent,
                "percentage_used": round(percent_used, 2)
            })

    serializer = CategoryBudgetStatusSerializer(result, many=True)
    return Response(serializer.data)


@extend_schema(
    tags=["Dashboard"],
    summary="Get Single Project Details",
    description="Returns detailed information for a single project, used for the 'View' modal on the dashboard",
    responses={200: ProjectDetailSerializer}
)
class ProjectDetailView(generics.RetrieveAPIView):
    # queryset = Project.objects.all() # REMOVED: Will be handled by get_queryset
    serializer_class = ProjectDetailSerializer
    permission_classes = [IsBMSUser]  # MODIFIED: Use specific BMS permission

    # --- MODIFICATION START ---
    def get_queryset(self):
        """
        Implements data isolation for viewing project details.
        """
        user = self.request.user
        user_roles = getattr(user, 'roles', {})
        bms_role = user_roles.get('bms')

        # FIX: Finance Head joins Admin in global view
        if bms_role in ['ADMIN', 'FINANCE_HEAD']:
            return Project.objects.all()

        # FIX: General User gets department view
        if bms_role == 'GENERAL_USER':
            department_id = getattr(user, 'department_id', None)
            if department_id:
                return Project.objects.filter(department_id=department_id)

        return Project.objects.none()
    # --- MODIFICATION END ---

    """
Function: get_budget_forecast()
Complete Rework of Forecasting Logic: The function was entirely refactored to replace the incorrect, constant-value forecast with a proper cumulative calculation.
Old Behavior: Calculated a single average monthly expense and returned that same value for all 12 months.
New Behavior:
Calculates the total spending from previous months (total_historical_spent).
Calculates the average_monthly_expense based on that historical data.
For the current and future months, it now calculates a cumulative forecast using the formula:
Forecast = Total Historical Spend + (Average Monthly Expense * Number of Future Months)
This results in a correctly ascending forecast line on the chart, as intended.
Added Robustness: The function now includes checks to handle cases where there is no historical spending data, preventing potential errors and returning an empty list [] gracefully.
    """


@extend_schema(
    tags=["Dashboard", "Forecasting"],
    summary="Get Latest Budget Forecast",
    description="Retrieves the most recently generated budget forecast for the specified or active fiscal year.",
    parameters=[
        OpenApiParameter(name='fiscal_year_id', type=int, required=False,
                         description="ID of the fiscal year. If not provided, the current active fiscal year will be used."),
    ],
    responses={200: ForecastSerializer(many=True)},
)
@api_view(['GET'])
@permission_classes([IsBMSUser])  # Use specific BMS permission
@cache_page(60 * 5)  # (cache for 300 seconds = 5 minutes)
def get_budget_forecast(request):
    """
    Retrieves a pre-calculated forecast from the database.
    This is now a very fast read operation (US-019).

    This replaces the old on-demand calculation logic with a simple database lookup,
    dramatically improving performance.

    Forecasting Workflow (How it works):
    --------------------------------------------------
    1. Forecasts are generated in advance by a management command (not in this view).
       - The command analyzes historical expense data to build a seasonal, cumulative forecast for the active fiscal year.
       - The forecast is stored in the database as a Forecast object, with associated ForecastDataPoint objects for each month.
    2. This API endpoint simply retrieves the latest forecast for the requested (or current) fiscal year.
       - It does NOT perform any forecasting calculations itself; it only reads from the database.
    3. If no forecast exists for the fiscal year, it returns a message indicating that a forecast must be generated first.
    4. If a forecast exists, it serializes and returns all the monthly data points (cumulative forecast values).
    5. (Optional) Data isolation for roles: Currently, all users see the same forecast. If department-specific forecasts are needed, logic can be added here.
    """
    fiscal_year_id = request.query_params.get('fiscal_year_id')
    user = request.user

    # Determine the fiscal year (either by ID or by finding the active one)
    today = timezone.now().date()
    if fiscal_year_id:
        try:
            fiscal_year = FiscalYear.objects.get(id=fiscal_year_id)
        except FiscalYear.DoesNotExist:
            return Response({"error": "Fiscal year not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, end_date__gte=today, is_active=True
        ).first()
        if not fiscal_year:
            return Response({"detail": "No active fiscal year found."}, status=status.HTTP_404_NOT_FOUND)

    # --- NEW, FAST RETRIEVAL LOGIC (US-019) ---
    # Get the most recent forecast generated for this fiscal year
    latest_forecast = Forecast.objects.filter(
        fiscal_year=fiscal_year
    ).select_related('fiscal_year').prefetch_related('data_points').first()

    if not latest_forecast:
        # If no forecast has been generated yet, return an empty list
        # The management command should be run to generate the first forecast
        return Response(
            {"detail": "No forecast available. Please generate forecast data first."},
            status=status.HTTP_200_OK
        )

    # Get all the data points associated with that forecast, ordered by month
    data_points = latest_forecast.data_points.all()

    # Optional: Apply data isolation for FINANCE_HEAD users
    # Note: This assumes forecasts are organization-wide. If
    # department-specific forecasts are needed, add a department field
    # to the Forecast model and filter accordingly
    user_roles = getattr(user, 'roles', {})
    bms_role = user_roles.get('bms')

    # For now, all users see the same forecast
    # If you need department-specific forecasts later, uncomment and modify:
    # if bms_role == 'FINANCE_HEAD':
    #     department_id = getattr(user, 'department_id', None)
    #     if department_id and latest_forecast.department_id != department_id:
    #         return Response([], status=status.HTTP_200_OK)

    # Serialize and return the forecast data points (one per month, cumulative)
    serializer = ForecastSerializer(data_points, many=True)
    return Response(serializer.data)

# MODIFICATION START


@extend_schema(
    tags=["Dashboard", "Forecasting"],
    summary="Get Forecast Accuracy Metric (US-028)",
    description="Calculates the accuracy of the forecast for the last completed month by comparing the forecasted spend against the actual approved expenses.",
    responses={200: ForecastAccuracySerializer},
)
@api_view(['GET'])
@permission_classes([IsBMSUser])
def get_forecast_accuracy(request):
    today = timezone.now().date()
    # Go back one month
    last_month_date = today - relativedelta(months=1)
    last_month = last_month_date.month
    year = last_month_date.year

    # 1. Actual Spend
    # Make sure this query matches the global logic
    actual_spend = Expense.objects.filter(
        status='APPROVED',
        date__year=year,
        date__month=last_month
    ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.0')))['total']

    # 2. Forecast Spend
    # Find the forecast generated for this year
    relevant_forecast = Forecast.objects.filter(
        fiscal_year__start_date__lte=last_month_date,
        fiscal_year__end_date__gte=last_month_date
    ).order_by('-generated_at').first()

    forecasted_spend = Decimal('0.0')
    if relevant_forecast:
        point = relevant_forecast.data_points.filter(month=last_month).first()
        # IMPORTANT: The ForecastDataPoint stores CUMULATIVE.
        # We need Monthly.
        if point:
            cum_val = point.forecasted_value
            # Get previous month's cumulative to subtract
            prev_point = relevant_forecast.data_points.filter(
                month=last_month-1).first()
            prev_val = prev_point.forecasted_value if prev_point else Decimal(
                '0.0')

            forecasted_spend = cum_val - prev_val

    # 3. Variance
    variance = actual_spend - forecasted_spend

    # 4. Accuracy
    accuracy_percentage = 0.0
    if actual_spend > 0:
        error = abs(variance) / actual_spend
        accuracy_percentage = max(0, 100 * (1 - error))  # Clamp to 0
    elif actual_spend == 0 and forecasted_spend == 0:
        accuracy_percentage = 100.0

    data = {
        "month_name": calendar.month_name[last_month],
        "year": year,
        "actual_spend": actual_spend,
        "forecasted_spend": forecasted_spend,
        "accuracy_percentage": round(accuracy_percentage, 2),
        "variance": variance
    }
    return Response(ForecastAccuracySerializer(data).data)
