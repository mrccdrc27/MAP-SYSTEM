import datetime
from decimal import Decimal
from django.db.models import Sum, F
from django.db.models.functions import TruncMonth, TruncQuarter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils.dateparse import parse_date
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db.models import Q
from core.permissions import IsBMSUser

from .models import Expense, Department, ExpenseCategory
from .views_dashboard import get_user_department_id
from .views_utils import get_user_bms_role

DEPARTMENT_NAME_MAPPING = {
    'Merchandise Planning': ['Merchandising / Merchandise Planning', 'Merchandising', 'Merchandise'],
    'Store Operations': ['Sales / Store Operations', 'Sales', 'Store'],
    'Marketing': ['Marketing / Marketing Communications', 'Marketing'],
    'Operations': ['Operations Department', 'Operations'],
    'IT': ['IT Application & Data', 'IT', 'Data', 'IT Application'],
    'Logistics': ['Logistics Management', 'Logistics'],
    'Human Resources': ['Human Resources', 'HR'],
    'Finance': ['Finance Department', 'Finance'],
}

class BaseAnalyticsView(APIView):
    """
    Base class for analytics to handle common filtering (Date Range, Department, Role).
    """
    permission_classes = [IsBMSUser]

    def get_filtered_expenses(self, request):
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        department_name = request.query_params.get('department')

        # Base Query: Only Approved Expenses
        expenses = Expense.objects.filter(status='APPROVED')

        # 1. Date Filter
        if start_date:
            expenses = expenses.filter(date__gte=parse_date(start_date))
        if end_date:
            expenses = expenses.filter(date__lte=parse_date(end_date))

        # 2. Role-Based Data Isolation
        bms_role = get_user_bms_role(user)
        
        if bms_role == 'GENERAL_USER':
            # For general users, filter by their department
            user_dept_id = get_user_department_id(user)
            if user_dept_id:
                expenses = expenses.filter(department_id=user_dept_id)
            else:
                # If no department found, try matching by department name
                user_dept_name = getattr(user, 'department', None)
                if user_dept_name:
                    # Find matching department in DB
                    dept_obj = Department.objects.filter(
                        Q(name__iexact=user_dept_name) |
                        Q(name__icontains=user_dept_name.split()[0]) # Match first word
                    ).first()
                    
                    if dept_obj:
                        expenses = expenses.filter(department_id=dept_obj.id)
                    else:
                        return expenses.none()
                else:
                    return expenses.none()
        
        # 3. Explicit Department Filter (from UI Dropdown)
        # Only apply if user is Admin/Finance and selects specific dept
        if bms_role in ['ADMIN', 'FINANCE_HEAD'] and department_name and department_name != "All Departments":
            # Use mapping to find all possible DB names for this frontend name
            possible_names = DEPARTMENT_NAME_MAPPING.get(department_name, [department_name])
            
            # Build OR query for all possible names
            dept_queries = Q()
            for name in possible_names:
                dept_queries |= Q(department__name__iexact=name)
                dept_queries |= Q(department__name__icontains=name)
                dept_queries |= Q(department__code__iexact=name)
            
            expenses = expenses.filter(dept_queries)

        return expenses

class SpendingTrendsView(BaseAnalyticsView):
    @extend_schema(
        tags=['Analytics'],
        summary="Get Spending Trends over time",
        parameters=[
            OpenApiParameter("start_date", str),
            OpenApiParameter("end_date", str),
            OpenApiParameter("department", str),
            OpenApiParameter("granularity", str, enum=["Monthly", "Quarterly"]),
        ]
    )
    def get(self, request):
        expenses = self.get_filtered_expenses(request)
        granularity = request.query_params.get('granularity', 'Monthly')

        # Truncate based on granularity
        if granularity == 'Quarterly':
            trunc_func = TruncQuarter('date')
            date_format = "%Y-Q%q" # Placeholder, unused below
        else:
            trunc_func = TruncMonth('date')
            date_format = "%b %Y"

        # Aggregate
        trend_data = expenses.annotate(
            period=trunc_func
        ).values('period').annotate(
            total=Sum('amount')
        ).order_by('period')

        labels = []
        data_points = []
        
        for entry in trend_data:
            # Fix Label Logic
            date_obj = entry['period']
            if granularity == 'Quarterly':
                quarter = (date_obj.month - 1) // 3 + 1
                label = f"Q{quarter} {date_obj.year}"
            else:
                label = date_obj.strftime("%b %Y")
                
            labels.append(label)
            data_points.append(float(entry['total']))

        # Calculate Percentage Changes
        pct_changes = [0]
        for i in range(1, len(data_points)):
            prev = data_points[i-1]
            curr = data_points[i]
            if prev > 0:
                change = ((curr - prev) / prev) * 100
                pct_changes.append(round(change, 1))
            else:
                pct_changes.append(100 if curr > 0 else 0)

        total_amount = sum(data_points)
        
        avg_change = 0
        if len(data_points) > 1 and data_points[0] > 0:
            avg_change = ((data_points[-1] - data_points[0]) / data_points[0]) * 100

        return Response({
            "labels": labels,
            "data": data_points,
            "percentage_changes": pct_changes,
            "total_amount": float(total_amount),
            "avg_percentage_change": round(avg_change, 1)
        })

class TopCategoriesView(BaseAnalyticsView):
    @extend_schema(
        tags=['Analytics'],
        summary="Get Highest Spending Categories",
        parameters=[
            OpenApiParameter("start_date", str),
            OpenApiParameter("end_date", str),
            OpenApiParameter("department", str),
        ]
    )
    def get(self, request):
        expenses = self.get_filtered_expenses(request)

        category_data = expenses.values(
            'category__name'
        ).annotate(
            total=Sum('amount')
        ).order_by('-total')[:10]

        total_overall = sum(float(item['total']) for item in category_data)
        
        results = []
        for item in category_data:
            amount = float(item['total'])
            pct = (amount / total_overall * 100) if total_overall > 0 else 0
            results.append({
                "category": item['category__name'],
                "amount": amount,
                "percentage": round(pct, 1)
            })

        return Response(results)

class SpendingHeatmapView(BaseAnalyticsView):
    @extend_schema(
        tags=['Analytics'],
        summary="Get Spending Heatmap Data",
        parameters=[
            OpenApiParameter("start_date", str),
            OpenApiParameter("end_date", str),
            OpenApiParameter("department", str),
            OpenApiParameter("aggregation", str, enum=["Monthly", "Quarterly"]),
        ]
    )
    def get(self, request):
        # Get base filtered expenses
        expenses = self.get_filtered_expenses(request)
        aggregation = request.query_params.get('aggregation', 'Monthly')
        
        # Auto-expand to full year if date range not provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            current_year = datetime.datetime.now().year
            # Fallback if no params
            # But BaseAnalyticsView already handles filtering if params ARE present
            pass 

        if aggregation == 'Quarterly':
            trunc_func = TruncQuarter('date')
        else:
            trunc_func = TruncMonth('date')

        # Aggregate
        period_data = expenses.annotate(
            period=trunc_func
        ).values('period').annotate(
            total=Sum('amount')
        ).order_by('period')

        data_list = []
        values = []
        
        for item in period_data:
            val = float(item['total'])
            date_obj = item['period']
            
            # --- FIX: Proper Label Logic ---
            if aggregation == 'Quarterly':
                quarter = (date_obj.month - 1) // 3 + 1
                period_label = f"Q{quarter} {date_obj.year}"
            else:
                period_label = date_obj.strftime("%b %Y")
            # -------------------------------

            data_list.append({
                "period": period_label,
                "value": val
            })
            values.append(val)

        # Handle empty data
        if not values:
            return Response([])

        # Determine Intensity
        avg_val = sum(values) / len(values)
        
        final_result = []
        for item in data_list:
            val = item['value']
            
            if val >= (avg_val * 1.3):
                intensity = "High"
            elif val <= (avg_val * 0.7):
                intensity = "Low"
            else:
                intensity = "Medium"
            
            item['intensity'] = intensity
            final_result.append(item)

        return Response(final_result)