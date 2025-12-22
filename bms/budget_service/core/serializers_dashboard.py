from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import *
from drf_spectacular.utils import extend_schema_field
from django.db.models import Sum



class TotalBudgetSerializer(serializers.Serializer):
    fiscal_year = serializers.CharField()
    total_budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage_allocated = serializers.FloatField()
    
class DashboardBudgetSummarySerializer(serializers.Serializer):
    fiscal_year = serializers.CharField()
    total_budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_spent = serializers.DecimalField(max_digits=15, decimal_places=2)
    remaining_budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage_used = serializers.FloatField()
    remaining_percentage = serializers.FloatField()
    available_for_allocation = serializers.BooleanField()
    
class MonthlyBudgetActualSerializer(serializers.Serializer):
    """
    Serializer for monthly budget vs actual data.
    This doesn't tie to a specific model but returns computed data.
    """
    month = serializers.IntegerField()
    month_name = serializers.CharField()
    budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    actual = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        fields = ['month', 'month_name', 'budget', 'actual']

class SimpleProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class ProjectStatusSerializer(serializers.Serializer):
    """
    Serializer for the project table in the dashboard.
    """
    project_id = serializers.IntegerField()
    project_name = serializers.CharField()
    budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    spent = serializers.DecimalField(max_digits=15, decimal_places=2)
    remaining = serializers.DecimalField(max_digits=15, decimal_places=2)
    status = serializers.CharField()
    progress = serializers.FloatField()
    
class DepartmentBudgetStatusSerializer(serializers.Serializer):
    """
    Serializer for the department budget vs actual element
    """
    department_id = serializers.IntegerField()
    department_name = serializers.CharField()
    budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    spent = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage_used = serializers.FloatField()

class CategoryBudgetStatusSerializer(serializers.Serializer):
    """
    Serializer for the 'Budget per Category' table in the dashboard.
    """
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    # MODIFIED: Added classification for UI grouping/coloring (CapEx/OpEx)
    classification = serializers.CharField(allow_null=True)
    budget = serializers.DecimalField(max_digits=15, decimal_places=2)
    spent = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage_used = serializers.FloatField()
class CategoryAllocationSerializer(serializers.ModelSerializer):
    total_allocated = serializers.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'classification', 'total_allocated']
        
class ProjectDetailSerializer(serializers.ModelSerializer):
    """
    Provides detailed information for a single project for the 'View' modal.
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    total_budget = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date', 
            'department_name', 'status', 'completion_percentage',
            'total_budget', 'total_spent'
        ]

    def get_total_budget(self, obj):
        # sum up all active allocations for this project
        return obj.allocations.filter(is_active=True).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

    def get_total_spent(self, obj):
        # Sum up all approved expenses for the project
        return obj.expenses.filter(status='APPROVED').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
class ForecastSerializer(serializers.ModelSerializer):
    """
    Serializer for the stored monthly forecast data points.
    """
    # Renamed the field to match the frontend's expectation
    forecast = serializers.DecimalField(
        source='forecasted_value', 
        max_digits=15, 
        decimal_places=2,
        read_only=True  # implicit but clearer
    )
    
    class Meta:
        model = ForecastDataPoint
        fields = ['month', 'month_name', 'forecast']
        read_only_fields = ['month', 'month_name', 'forecast']  # All fields are read-only for GET


# MODIFICATION START: new serializer for US-028
class ForecastAccuracySerializer(serializers.Serializer):
    """
    Serializer for the forecast accuracy metric card on the dashboard.
    """
    month_name = serializers.CharField()
    year = serializers.IntegerField()
    actual_spend = serializers.DecimalField(max_digits=15, decimal_places=2)
    forecasted_spend = serializers.DecimalField(max_digits=15, decimal_places=2)
    accuracy_percentage = serializers.FloatField()
    variance = serializers.DecimalField(max_digits=15, decimal_places=2)
# MODIFICATION END