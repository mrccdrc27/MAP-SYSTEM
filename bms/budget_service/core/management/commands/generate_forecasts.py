from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count
from decimal import Decimal
import calendar
from collections import defaultdict
from core.models import FiscalYear, Expense, Forecast, ForecastDataPoint

class Command(BaseCommand):
    help = 'Generates a full-year Seasonal Baseline Forecast. Handles cold starts.'

    def handle(self, *args, **options):
        self.stdout.write("Starting Forecast generation...")
        today = timezone.now().date()
        current_month = today.month
        
        active_fiscal_year = FiscalYear.objects.filter(
            start_date__lte=today, end_date__gte=today, is_active=True).first()

        if not active_fiscal_year:
            self.stdout.write(self.style.WARNING("No active fiscal year found."))
            return

        try:
            with transaction.atomic():
                # 1. Calculate Historical Monthly Averages (Seasonal Model)
                historical_expenses = Expense.objects.filter(
                    status='APPROVED',
                    date__lt=active_fiscal_year.start_date 
                )

                monthly_averages = {}
                
                # MODIFICATION START: Cold Start Logic
                if historical_expenses.exists():
                    self.stdout.write("Using Historical Data...")
                    for m in range(1, 13):
                        data = historical_expenses.filter(date__month=m).aggregate(
                            total=Sum('amount'),
                            count=Count('date__year', distinct=True)
                        )
                        # Avoid division by zero
                        count = data['count'] if data['count'] and data['count'] > 0 else 1
                        total = data['total'] if data['total'] else Decimal('0.00')
                        monthly_averages[m] = total / count
                else:
                    self.stdout.write("Cold Start: Using Budget Allocations (Run Rate)...")
                    # Fallback: Calculate "Run Rate" from Total Budget
                    total_budget = BudgetAllocation.objects.filter(
                        fiscal_year=active_fiscal_year, is_active=True
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    # Assume flat burn rate (Total / 12)
                    monthly_run_rate = total_budget / Decimal('12.0')
                    for m in range(1, 13):
                        monthly_averages[m] = monthly_run_rate
                # MODIFICATION END

                # 2. Get Actual Monthly Spend for Current Year (Baseline)
                actual_monthly_spend = {}
                for m in range(1, current_month):
                    actual_monthly_spend[m] = Expense.objects.filter(
                        status='APPROVED',
                        budget_allocation__fiscal_year=active_fiscal_year,
                        date__month=m
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                # 3. Save Forecast Container
                Forecast.objects.filter(fiscal_year=active_fiscal_year).delete()
                new_forecast = Forecast.objects.create(
                    fiscal_year=active_fiscal_year, 
                    algorithm_used='SEASONAL_BASELINE'
                )

                # 4. Generate 12 Points (Cumulative)
                running_total = Decimal('0.0')
                for month_num in range(1, 13):
                    if month_num < current_month:
                        # Use actual data for past months
                        running_total += actual_monthly_spend.get(month_num, Decimal('0.0'))
                    else:
                        # Use seasonal averages (or run rate) for current/future
                        running_total += monthly_averages.get(month_num, Decimal('0.0'))
                    
                    ForecastDataPoint.objects.create(
                        forecast=new_forecast,
                        month=month_num,
                        month_name=calendar.month_name[month_num],
                        forecasted_value=round(running_total, 2)
                    )

            self.stdout.write(self.style.SUCCESS(f"Forecast generated for {active_fiscal_year.name}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))