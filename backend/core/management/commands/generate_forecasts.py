from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count
from decimal import Decimal
import calendar
from collections import defaultdict
from core.models import FiscalYear, Expense, Forecast, ForecastDataPoint

class Command(BaseCommand):
    help = 'Generates a full-year Seasonal Baseline Forecast anchored on YTD spend.'

    def handle(self, *args, **options):
        self.stdout.write("Starting Seasonal Baseline Forecast generation...")
        today = timezone.now().date()
        current_month = today.month
        current_year = today.year

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
                for m in range(1, 13):
                    # Average spend for this month across all previous years
                    data = historical_expenses.filter(date__month=m).aggregate(
                        total=Sum('amount'),
                        count=Count('date__year', distinct=True)
                    )
                    avg = data['total'] / data['count'] if data['count'] and data['count'] > 0 else Decimal('25000.00')
                    monthly_averages[m] = avg

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
                        # Use seasonal averages for current and future months
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