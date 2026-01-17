"""
ML Forecasting Views for TTS Ticket Analytics

Provides machine learning-based predictions for:
- Ticket volume forecasting (daily/weekly/monthly)
- Resolution time predictions
- Category/priority trend predictions
- SLA breach risk scoring
- Workload forecasting
"""

from django.db.models import Count, Avg
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, ExtractHour, ExtractWeekDay
from django.utils import timezone
from datetime import timedelta
from rest_framework.response import Response
from rest_framework import status
import numpy as np
from collections import defaultdict

from reporting.views.base import BaseReportingView
from reporting.utils import safe_percentage, apply_date_filter

from task.models import Task, TaskItem, TaskItemHistory, TASK_STATUS_CHOICES
from tickets.models import WorkflowTicket


# ==================== ML UTILITY FUNCTIONS ====================

def linear_regression_forecast(x_values, y_values, forecast_periods):
    """
    Simple linear regression for time series forecasting.
    Returns predicted values for the forecast periods.
    """
    if len(x_values) < 2 or len(y_values) < 2:
        return [float(np.mean(y_values)) if y_values else 0] * forecast_periods
    
    x = np.array(x_values, dtype=float)
    y = np.array(y_values, dtype=float)
    
    # Calculate linear regression coefficients
    n = len(x)
    sum_x = np.sum(x)
    sum_y = np.sum(y)
    sum_xy = np.sum(x * y)
    sum_x2 = np.sum(x ** 2)
    
    # Avoid division by zero
    denominator = n * sum_x2 - sum_x ** 2
    if denominator == 0:
        return [float(np.mean(y))] * forecast_periods
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    
    # Generate forecasts
    last_x = x[-1]
    forecasts = []
    for i in range(1, forecast_periods + 1):
        predicted = slope * (last_x + i) + intercept
        forecasts.append(max(0, float(predicted)))  # Ensure non-negative
    
    return forecasts


def exponential_smoothing(values, alpha=0.3, forecast_periods=7):
    """
    Simple exponential smoothing for time series forecasting.
    Alpha controls the smoothing factor (0-1, higher = more recent data weight).
    """
    if not values:
        return [0] * forecast_periods
    
    if len(values) == 1:
        return [float(values[0])] * forecast_periods
    
    # Initialize with first value
    smoothed = [float(values[0])]
    
    # Apply exponential smoothing
    for i in range(1, len(values)):
        new_value = alpha * float(values[i]) + (1 - alpha) * smoothed[-1]
        smoothed.append(new_value)
    
    # Forecast using trend from smoothed values
    if len(smoothed) >= 2:
        trend = smoothed[-1] - smoothed[-2]
    else:
        trend = 0
    
    forecasts = []
    last_value = smoothed[-1]
    for i in range(forecast_periods):
        predicted = last_value + trend * (i + 1)
        forecasts.append(max(0, float(predicted)))
    
    return forecasts


def moving_average(values, window=7):
    """Calculate moving average for a series of values."""
    if not values or len(values) < window:
        return float(np.mean(values)) if values else 0
    return float(np.mean(values[-window:]))


def calculate_seasonality_index(daily_counts):
    """
    Calculate day-of-week seasonality indices.
    Returns dict with day indices (0=Monday) and their seasonal factors.
    """
    if not daily_counts:
        return {i: 1.0 for i in range(7)}
    
    day_totals = defaultdict(list)
    for entry in daily_counts:
        if 'day_of_week' in entry and 'count' in entry:
            day_totals[entry['day_of_week']].append(entry['count'])
    
    overall_avg = np.mean([e['count'] for e in daily_counts if 'count' in e]) or 1
    
    seasonality = {}
    for day in range(7):
        if day_totals[day]:
            day_avg = np.mean(day_totals[day])
            seasonality[day] = float(day_avg / overall_avg) if overall_avg > 0 else 1.0
        else:
            seasonality[day] = 1.0
    
    return seasonality


def calculate_confidence_interval(values, confidence=0.95):
    """Calculate confidence interval for predictions."""
    if not values or len(values) < 2:
        return {'lower': 0, 'upper': 0, 'std': 0}
    
    arr = np.array(values)
    mean = np.mean(arr)
    std = np.std(arr)
    
    # Z-score for 95% confidence
    z = 1.96 if confidence == 0.95 else 1.645
    
    margin = z * std / np.sqrt(len(arr))
    
    return {
        'lower': float(max(0, mean - margin)),
        'upper': float(mean + margin),
        'std': float(std)
    }


def weighted_volume_forecast(daily_data, forecast_periods=14, include_yearly=True):
    """
    Weighted volume forecast optimized for ticketing systems.
    
    Weights:
    - 60% → last 30 days average
    - 25% → last 7 days average (recent trend)
    - 15% → same week last year (seasonal pattern, optional)
    
    Args:
        daily_data: List of dicts with 'date' and 'count' keys, ordered by date
        forecast_periods: Number of days to forecast
        include_yearly: Whether to include yearly seasonal data (if available)
    
    Returns:
        List of predicted values for each forecast period
    """
    if not daily_data:
        return [0] * forecast_periods
    
    # Extract counts and dates
    counts = [entry['count'] for entry in daily_data]
    dates = [entry['date'] for entry in daily_data]
    
    # Calculate weighted components
    # Last 30 days average (60% weight)
    last_30_days = counts[-30:] if len(counts) >= 30 else counts
    avg_30_days = float(np.mean(last_30_days)) if last_30_days else 0
    
    # Last 7 days average (25% weight) - captures recent trend
    last_7_days = counts[-7:] if len(counts) >= 7 else counts
    avg_7_days = float(np.mean(last_7_days)) if last_7_days else 0
    
    # Same week last year (15% weight) - seasonal pattern
    avg_yearly = None
    if include_yearly and len(counts) >= 365:
        # Get data from approximately same time last year
        yearly_window = counts[-365:-358] if len(counts) >= 365 else None
        if yearly_window:
            avg_yearly = float(np.mean(yearly_window))
    
    # Calculate base forecast using weights
    if avg_yearly is not None:
        # Full weighted average: 60% + 25% + 15%
        base_forecast = (0.60 * avg_30_days) + (0.25 * avg_7_days) + (0.15 * avg_yearly)
        weights_used = {'last_30_days': 0.60, 'last_7_days': 0.25, 'same_week_last_year': 0.15}
    else:
        # Adjusted weights without yearly: 70% + 30%
        base_forecast = (0.70 * avg_30_days) + (0.30 * avg_7_days)
        weights_used = {'last_30_days': 0.70, 'last_7_days': 0.30, 'same_week_last_year': 0}
    
    # Calculate trend from last 7 days for projection
    if len(last_7_days) >= 2:
        # Simple trend: average daily change
        daily_changes = [last_7_days[i] - last_7_days[i-1] for i in range(1, len(last_7_days))]
        trend = float(np.mean(daily_changes)) * 0.3  # Dampen trend to avoid over-projection
    else:
        trend = 0
    
    # Calculate day-of-week seasonality from last 30 days
    day_of_week_factors = {i: 1.0 for i in range(7)}
    if len(daily_data) >= 14:
        recent_data = daily_data[-30:] if len(daily_data) >= 30 else daily_data
        day_counts = defaultdict(list)
        for entry in recent_data:
            if isinstance(entry['date'], str):
                try:
                    from datetime import datetime
                    dt = datetime.strptime(entry['date'].split()[0], '%Y-%m-%d')
                    day_of_week = dt.weekday()
                except:
                    continue
            else:
                day_of_week = entry['date'].weekday()
            day_counts[day_of_week].append(entry['count'])
        
        overall_avg = float(np.mean([e['count'] for e in recent_data])) or 1
        for day in range(7):
            if day_counts[day]:
                day_avg = float(np.mean(day_counts[day]))
                day_of_week_factors[day] = day_avg / overall_avg if overall_avg > 0 else 1.0
    
    # Generate forecasts with trend and seasonality
    forecasts = []
    from datetime import datetime
    now = timezone.now() if hasattr(timezone, 'now') else datetime.now()
    
    for i in range(forecast_periods):
        forecast_date = now + timedelta(days=i+1)
        day_of_week = forecast_date.weekday()
        
        # Apply seasonality factor
        seasonal_factor = day_of_week_factors.get(day_of_week, 1.0)
        
        # Calculate forecast with dampened trend
        predicted = (base_forecast + trend * (i + 1)) * seasonal_factor
        forecasts.append(max(0, round(float(predicted), 1)))
    
    return forecasts, {
        'weights_used': weights_used,
        'avg_30_days': round(avg_30_days, 2),
        'avg_7_days': round(avg_7_days, 2),
        'avg_yearly': round(avg_yearly, 2) if avg_yearly else None,
        'base_forecast': round(base_forecast, 2),
        'trend_per_day': round(trend, 3),
        'yearly_data_available': avg_yearly is not None
    }


# ==================== FORECASTING VIEWS ====================

class TicketVolumeForecastView(BaseReportingView):
    """
    Forecast future ticket volumes using weighted ML techniques.
    
    Weights optimized for ticketing systems:
    - 60% → last 30 days (baseline)
    - 25% → last 7 days (recent trend)
    - 15% → same week last year (seasonal, if available)
    
    Query params:
    - forecast_days: Number of days to forecast (default: 14)
    - history_days: Historical data to use (default: 90, use 400+ for yearly seasonality)
    - granularity: 'daily', 'weekly', or 'monthly' (default: 'daily')
    - include_yearly: Include same-week-last-year data if available (default: true)
    """
    
    def get(self, request):
        try:
            forecast_days = int(request.query_params.get('forecast_days', 14))
            history_days = int(request.query_params.get('history_days', 90))
            granularity = request.query_params.get('granularity', 'daily')
            include_yearly = request.query_params.get('include_yearly', 'true').lower() == 'true'
            
            # For yearly seasonality, we need at least 365 days of data
            # Extend history if yearly is requested and history is too short
            if include_yearly and history_days < 400:
                extended_history_days = 400  # Fetch enough for yearly comparison
            else:
                extended_history_days = history_days
            
            cutoff_date = timezone.now() - timedelta(days=extended_history_days)
            
            # Get historical data
            if granularity == 'weekly':
                trunc_func = TruncWeek
            elif granularity == 'monthly':
                trunc_func = TruncMonth
            else:
                trunc_func = TruncDate
            
            historical_data = Task.objects.filter(
                created_at__gte=cutoff_date
            ).annotate(
                period=trunc_func('created_at')
            ).values('period').annotate(
                count=Count('task_id')
            ).order_by('period')
            
            # Prepare data for forecasting
            historical_list = []
            for entry in historical_data:
                historical_list.append({
                    'date': str(entry['period']),
                    'count': entry['count']
                })
            
            counts = [entry['count'] for entry in historical_list]
            
            # Determine forecast periods based on granularity
            forecast_periods = forecast_days if granularity == 'daily' else (forecast_days // 7 if granularity == 'weekly' else forecast_days // 30)
            forecast_periods = max(1, forecast_periods)
            
            # Use weighted volume forecast (primary method for daily granularity)
            if granularity == 'daily':
                weighted_forecasts, weight_info = weighted_volume_forecast(
                    historical_list, 
                    forecast_periods=forecast_periods,
                    include_yearly=include_yearly
                )
                ensemble_forecasts = weighted_forecasts
                methods_used = ['weighted_average']
                if weight_info['yearly_data_available']:
                    methods_used.append('yearly_seasonality')
                methods_used.append('day_of_week_seasonality')
            else:
                # For weekly/monthly, use traditional ensemble approach
                periods = list(range(len(counts)))
                linear_forecasts = linear_regression_forecast(periods, counts, forecast_periods)
                exp_forecasts = exponential_smoothing(counts, alpha=0.3, forecast_periods=forecast_periods)
                ensemble_forecasts = [
                    round((linear_forecasts[i] + exp_forecasts[i]) / 2, 1)
                    for i in range(len(linear_forecasts))
                ]
                weight_info = None
                methods_used = ['linear_regression', 'exponential_smoothing']
            
            # Calculate confidence intervals
            confidence = calculate_confidence_interval(counts)
            
            # Generate forecast dates
            last_date = timezone.now()
            forecast_list = []
            for i, forecast in enumerate(ensemble_forecasts):
                if granularity == 'weekly':
                    forecast_date = last_date + timedelta(weeks=i+1)
                elif granularity == 'monthly':
                    forecast_date = last_date + timedelta(days=30*(i+1))
                else:
                    forecast_date = last_date + timedelta(days=i+1)
                
                forecast_list.append({
                    'date': forecast_date.strftime('%Y-%m-%d'),
                    'predicted_count': round(float(forecast), 1),
                    'confidence_lower': round(max(0, float(forecast) - confidence['std']), 1),
                    'confidence_upper': round(float(forecast) + confidence['std'], 1)
                })
            
            # Summary statistics
            avg_historical = float(np.mean(counts)) if counts else 0
            avg_forecast = float(np.mean(ensemble_forecasts)) if ensemble_forecasts else 0
            trend_direction = 'increasing' if avg_forecast > avg_historical * 1.05 else ('decreasing' if avg_forecast < avg_historical * 0.95 else 'stable')
            
            # Build model info
            model_info = {
                'methods': methods_used,
                'ensemble': 'weighted_average' if granularity == 'daily' else 'simple_average',
                'history_days': history_days,
                'forecast_periods': forecast_periods
            }
            
            # Add weight details for daily granularity
            if weight_info:
                model_info['weights'] = weight_info['weights_used']
                model_info['weight_details'] = {
                    'avg_last_30_days': weight_info['avg_30_days'],
                    'avg_last_7_days': weight_info['avg_7_days'],
                    'avg_same_week_last_year': weight_info['avg_yearly'],
                    'base_forecast': weight_info['base_forecast'],
                    'trend_per_day': weight_info['trend_per_day'],
                    'yearly_data_available': weight_info['yearly_data_available']
                }
            
            # Limit historical data returned to requested history_days
            display_historical = historical_list[-history_days:] if len(historical_list) > history_days else historical_list
            
            return Response({
                'forecast_type': 'ticket_volume',
                'granularity': granularity,
                'model_info': model_info,
                'summary': {
                    'historical_average': round(avg_historical, 1),
                    'forecast_average': round(avg_forecast, 1),
                    'trend_direction': trend_direction,
                    'confidence_level': 0.95,
                    'confidence_interval': confidence
                },
                'historical_data': display_historical,
                'forecasts': forecast_list
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.handle_exception(e)


class ResolutionTimeForecastView(BaseReportingView):
    """
    Predict resolution times for tickets based on historical patterns.
    
    Query params:
    - days: Historical days to analyze (default: 90)
    - by: Group by 'priority', 'category', 'department', or 'workflow' (default: 'priority')
    """
    
    def get(self, request):
        try:
            days = int(request.query_params.get('days', 90))
            group_by = request.query_params.get('by', 'priority')
            
            cutoff_date = timezone.now() - timedelta(days=days)
            
            # Get resolved tasks with resolution times
            resolved_tasks = Task.objects.filter(
                status='completed',
                resolution_time__isnull=False,
                created_at__gte=cutoff_date
            ).select_related('ticket_id', 'workflow_id')
            
            # Calculate resolution times grouped by category
            resolution_data = defaultdict(list)
            
            for task in resolved_tasks:
                if task.resolution_time and task.created_at:
                    resolution_hours = (task.resolution_time - task.created_at).total_seconds() / 3600
                    
                    # Skip negative values (invalid data where resolution_time < created_at)
                    if resolution_hours < 0:
                        continue
                    
                    if group_by == 'priority':
                        key = task.ticket_id.priority or 'Unknown'
                    elif group_by == 'category':
                        ticket_data = task.ticket_id.ticket_data or {}
                        key = ticket_data.get('category', 'Uncategorized')
                    elif group_by == 'department':
                        key = task.ticket_id.department or 'Unassigned'
                    elif group_by == 'workflow':
                        key = task.workflow_id.name if task.workflow_id else 'Unknown'
                    else:
                        key = 'All'
                    
                    resolution_data[key].append(resolution_hours)
            
            # Calculate predictions for each group
            predictions = []
            for group, times in resolution_data.items():
                if times:
                    arr = np.array(times)
                    predictions.append({
                        'group': group,
                        'sample_size': len(times),
                        'predicted_hours': round(float(np.mean(arr)), 2),
                        'median_hours': round(float(np.median(arr)), 2),
                        'min_hours': round(float(np.min(arr)), 2),
                        'max_hours': round(float(np.max(arr)), 2),
                        'std_deviation': round(float(np.std(arr)), 2),
                        'percentile_25': round(float(np.percentile(arr, 25)), 2),
                        'percentile_75': round(float(np.percentile(arr, 75)), 2),
                        'percentile_90': round(float(np.percentile(arr, 90)), 2)
                    })
            
            # Sort by predicted hours
            predictions.sort(key=lambda x: x['predicted_hours'])
            
            # Overall statistics
            all_times = [t for times in resolution_data.values() for t in times]
            overall_stats = {}
            if all_times:
                arr = np.array(all_times)
                overall_stats = {
                    'total_resolved': len(all_times),
                    'average_hours': round(float(np.mean(arr)), 2),
                    'median_hours': round(float(np.median(arr)), 2),
                    'std_deviation': round(float(np.std(arr)), 2)
                }
            
            return Response({
                'forecast_type': 'resolution_time',
                'group_by': group_by,
                'time_period_days': days,
                'overall_statistics': overall_stats,
                'predictions': predictions
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.handle_exception(e)


class CategoryTrendForecastView(BaseReportingView):
    """
    Predict future ticket category distribution trends.
    
    Query params:
    - forecast_weeks: Number of weeks to forecast (default: 4)
    - history_weeks: Historical weeks to analyze (default: 12)
    """
    
    def get(self, request):
        try:
            forecast_weeks = int(request.query_params.get('forecast_weeks', 4))
            history_weeks = int(request.query_params.get('history_weeks', 12))
            
            cutoff_date = timezone.now() - timedelta(weeks=history_weeks)
            
            # Get historical category data by week
            tickets = WorkflowTicket.objects.filter(created_at__gte=cutoff_date)
            
            # Organize by week and category
            weekly_categories = defaultdict(lambda: defaultdict(int))
            category_totals = defaultdict(int)
            
            for ticket in tickets:
                ticket_data = ticket.ticket_data or {}
                category = ticket_data.get('category') or ticket_data.get('Category') or 'Uncategorized'
                week = ticket.created_at.isocalendar()[1]  # Week number
                year = ticket.created_at.year
                week_key = f"{year}-W{week:02d}"
                
                weekly_categories[week_key][category] += 1
                category_totals[category] += 1
            
            # Get top categories for forecasting
            top_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:10]
            top_category_names = [c[0] for c in top_categories]
            
            # Prepare time series for each top category
            week_keys = sorted(weekly_categories.keys())
            category_forecasts = []
            
            for category in top_category_names:
                counts = [weekly_categories[week].get(category, 0) for week in week_keys]
                
                # Forecast using exponential smoothing
                forecasts = exponential_smoothing(counts, alpha=0.4, forecast_periods=forecast_weeks)
                
                # Calculate trend
                if len(counts) >= 2:
                    recent_avg = np.mean(counts[-4:]) if len(counts) >= 4 else np.mean(counts)
                    older_avg = np.mean(counts[:4]) if len(counts) >= 4 else counts[0]
                    trend_pct = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
                else:
                    trend_pct = 0
                
                # Generate forecast weeks
                last_week = timezone.now()
                forecast_data = []
                for i, forecast in enumerate(forecasts):
                    forecast_week = last_week + timedelta(weeks=i+1)
                    forecast_data.append({
                        'week': forecast_week.strftime('%Y-W%W'),
                        'predicted_count': round(forecast, 1)
                    })
                
                category_forecasts.append({
                    'category': category,
                    'historical_total': category_totals[category],
                    'historical_weekly_avg': round(np.mean(counts), 1) if counts else 0,
                    'trend_percentage': round(trend_pct, 1),
                    'trend_direction': 'increasing' if trend_pct > 5 else ('decreasing' if trend_pct < -5 else 'stable'),
                    'forecast_weekly_avg': round(np.mean(forecasts), 1),
                    'forecasts': forecast_data
                })
            
            return Response({
                'forecast_type': 'category_trends',
                'history_weeks': history_weeks,
                'forecast_weeks': forecast_weeks,
                'category_forecasts': category_forecasts
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.handle_exception(e)


class SLABreachRiskForecastView(BaseReportingView):
    """
    Predict SLA breach risk for open tickets using ML scoring.
    
    Query params:
    - threshold: Risk score threshold (0-100, default: 70)
    """
    
    def get(self, request):
        try:
            threshold = int(request.query_params.get('threshold', 70))
            now = timezone.now()
            
            # Get open tasks with SLA targets
            open_tasks = Task.objects.filter(
                status__in=['pending', 'in progress']
            ).select_related('ticket_id', 'workflow_id', 'current_step')
            
            # Risk assessments for each open task
            risk_assessments = []
            high_risk_count = 0
            medium_risk_count = 0
            low_risk_count = 0
            
            for task in open_tasks:
                risk_score = 0
                risk_factors = []
                time_remaining = None  # Initialize time_remaining
                
                if task.target_resolution:
                    time_remaining = (task.target_resolution - now).total_seconds() / 3600
                    total_sla_hours = (task.target_resolution - task.created_at).total_seconds() / 3600 if task.created_at else 24
                    
                    # Time-based risk (40% weight)
                    if time_remaining <= 0:
                        risk_score += 40
                        risk_factors.append('Already breached or overdue')
                    elif time_remaining < 2:
                        risk_score += 35
                        risk_factors.append('Less than 2 hours remaining')
                    elif time_remaining < 4:
                        risk_score += 25
                        risk_factors.append('Less than 4 hours remaining')
                    elif time_remaining < total_sla_hours * 0.25:
                        risk_score += 20
                        risk_factors.append('Less than 25% of SLA time remaining')
                    
                    # Progress-based risk (30% weight)
                    elapsed_pct = (1 - (time_remaining / total_sla_hours)) * 100 if total_sla_hours > 0 else 100
                    if elapsed_pct > 90:
                        risk_score += 30
                        risk_factors.append('Over 90% of SLA time elapsed')
                    elif elapsed_pct > 75:
                        risk_score += 20
                        risk_factors.append('Over 75% of SLA time elapsed')
                    elif elapsed_pct > 50:
                        risk_score += 10
                        risk_factors.append('Over 50% of SLA time elapsed')
                else:
                    risk_factors.append('No SLA target set')
                
                # Priority-based risk (15% weight)
                priority = task.ticket_id.priority if task.ticket_id else 'Medium'
                if priority == 'Critical':
                    risk_score += 15
                    risk_factors.append('Critical priority')
                elif priority == 'High':
                    risk_score += 10
                    risk_factors.append('High priority')
                
                # Age-based risk (15% weight)
                task_age_hours = (now - task.created_at).total_seconds() / 3600 if task.created_at else 0
                if task_age_hours > 72:
                    risk_score += 15
                    risk_factors.append('Task older than 72 hours')
                elif task_age_hours > 48:
                    risk_score += 10
                    risk_factors.append('Task older than 48 hours')
                elif task_age_hours > 24:
                    risk_score += 5
                    risk_factors.append('Task older than 24 hours')
                
                # Classify risk level
                if risk_score >= 70:
                    risk_level = 'high'
                    high_risk_count += 1
                elif risk_score >= 40:
                    risk_level = 'medium'
                    medium_risk_count += 1
                else:
                    risk_level = 'low'
                    low_risk_count += 1
                
                # Only include tasks above threshold in detailed list
                if risk_score >= threshold:
                    ticket_data = task.ticket_id.ticket_data or {} if task.ticket_id else {}
                    risk_assessments.append({
                        'task_id': task.task_id,
                        'ticket_number': task.ticket_id.ticket_number if task.ticket_id else None,
                        'subject': ticket_data.get('subject', 'Unknown'),
                        'priority': priority,
                        'workflow': task.workflow_id.name if task.workflow_id else None,
                        'current_step': task.current_step.name if task.current_step else None,
                        'status': task.status,
                        'risk_score': min(100, risk_score),
                        'risk_level': risk_level,
                        'risk_factors': risk_factors,
                        'target_resolution': task.target_resolution.isoformat() if task.target_resolution else None,
                        'hours_remaining': round(time_remaining, 1) if task.target_resolution else None,
                        'created_at': task.created_at.isoformat() if task.created_at else None
                    })
            
            # Sort by risk score descending
            risk_assessments.sort(key=lambda x: x['risk_score'], reverse=True)
            
            return Response({
                'forecast_type': 'sla_breach_risk',
                'risk_threshold': threshold,
                'summary': {
                    'total_open_tasks': open_tasks.count(),
                    'high_risk_count': high_risk_count,
                    'medium_risk_count': medium_risk_count,
                    'low_risk_count': low_risk_count,
                    'above_threshold_count': len(risk_assessments)
                },
                'risk_distribution': {
                    'high': round(safe_percentage(high_risk_count, open_tasks.count()), 1),
                    'medium': round(safe_percentage(medium_risk_count, open_tasks.count()), 1),
                    'low': round(safe_percentage(low_risk_count, open_tasks.count()), 1)
                },
                'at_risk_tasks': risk_assessments[:50]  # Limit to top 50
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.handle_exception(e)


class WorkloadForecastView(BaseReportingView):
    """
    Forecast workload distribution by hour and day of week.
    
    Query params:
    - forecast_days: Days to forecast (default: 7)
    - history_days: Historical days for pattern analysis (default: 60)
    """
    
    def get(self, request):
        try:
            forecast_days = int(request.query_params.get('forecast_days', 7))
            history_days = int(request.query_params.get('history_days', 60))
            
            cutoff_date = timezone.now() - timedelta(days=history_days)
            
            # Analyze hourly patterns
            hourly_patterns = Task.objects.filter(
                created_at__gte=cutoff_date
            ).annotate(
                hour=ExtractHour('created_at')
            ).values('hour').annotate(
                count=Count('task_id')
            ).order_by('hour')
            
            # Analyze day-of-week patterns
            daily_patterns = Task.objects.filter(
                created_at__gte=cutoff_date
            ).annotate(
                day_of_week=ExtractWeekDay('created_at')
            ).values('day_of_week').annotate(
                count=Count('task_id')
            ).order_by('day_of_week')
            
            # Process hourly distribution
            hourly_data = {i: 0 for i in range(24)}
            for entry in hourly_patterns:
                hourly_data[entry['hour']] = entry['count']
            
            total_hourly = sum(hourly_data.values())
            hourly_distribution = [
                {
                    'hour': hour,
                    'count': count,
                    'percentage': round(safe_percentage(count, total_hourly), 1),
                    'intensity': 'high' if count > total_hourly / 12 else ('medium' if count > total_hourly / 24 else 'low')
                }
                for hour, count in hourly_data.items()
            ]
            
            # Peak hours identification
            sorted_hours = sorted(hourly_data.items(), key=lambda x: x[1], reverse=True)
            peak_hours = [h[0] for h in sorted_hours[:3]]
            quiet_hours = [h[0] for h in sorted_hours[-3:]]
            
            # Process daily distribution
            day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            daily_data = {i: 0 for i in range(1, 8)}  # Django ExtractDayOfWeek: 1=Sunday, 7=Saturday
            for entry in daily_patterns:
                daily_data[entry['day_of_week']] = entry['count']
            
            total_daily = sum(daily_data.values())
            daily_distribution = [
                {
                    'day': day_names[day - 1],
                    'day_number': day,
                    'count': count,
                    'percentage': round(safe_percentage(count, total_daily), 1)
                }
                for day, count in daily_data.items()
            ]
            
            # Generate workload forecast for next N days
            avg_daily = total_daily / 7 if total_daily > 0 else 0
            seasonality = {entry['day_number']: entry['count'] / avg_daily if avg_daily > 0 else 1 for entry in daily_distribution}
            
            workload_forecast = []
            now = timezone.now()
            for i in range(forecast_days):
                forecast_date = now + timedelta(days=i+1)
                day_num = forecast_date.isoweekday()  # 1=Monday, 7=Sunday
                # Convert to Django's day numbering (1=Sunday, 2=Monday, etc.)
                django_day = 1 if day_num == 7 else day_num + 1
                
                seasonal_factor = seasonality.get(django_day, 1)
                predicted_volume = avg_daily * seasonal_factor / (history_days / 7)  # Normalize to daily avg
                
                workload_forecast.append({
                    'date': forecast_date.strftime('%Y-%m-%d'),
                    'day': day_names[django_day - 1],
                    'predicted_tickets': round(predicted_volume, 1),
                    'expected_intensity': 'high' if seasonal_factor > 1.2 else ('low' if seasonal_factor < 0.8 else 'normal')
                })
            
            return Response({
                'forecast_type': 'workload',
                'analysis_period_days': history_days,
                'forecast_days': forecast_days,
                'patterns': {
                    'peak_hours': peak_hours,
                    'quiet_hours': quiet_hours,
                    'busiest_day': max(daily_distribution, key=lambda x: x['count'])['day'],
                    'quietest_day': min(daily_distribution, key=lambda x: x['count'])['day']
                },
                'hourly_distribution': hourly_distribution,
                'daily_distribution': daily_distribution,
                'workload_forecast': workload_forecast
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.handle_exception(e)


class ComprehensiveForecastView(BaseReportingView):
    """
    Combined forecasting dashboard with all prediction types.
    
    Uses weighted volume forecast:
    - 60% → last 30 days (baseline)
    - 25% → last 7 days (recent trend)
    - 15% → same week last year (seasonal, if available)
    
    Query params:
    - days: Historical days for analysis (default: 60)
    - forecast_days: Days to forecast (default: 14)
    """
    
    def get(self, request):
        try:
            history_days = int(request.query_params.get('days', 60))
            forecast_days = int(request.query_params.get('forecast_days', 14))
            now = timezone.now()
            cutoff_date = now - timedelta(days=history_days)
            
            # Quick volume forecast using weighted approach
            daily_counts = Task.objects.filter(
                created_at__gte=cutoff_date
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('task_id')
            ).order_by('date')
            
            # Prepare data for weighted forecast
            historical_list = [{'date': str(entry['date']), 'count': entry['count']} for entry in daily_counts]
            counts = [entry['count'] for entry in historical_list]
            
            # Use weighted volume forecast for better accuracy
            volume_forecasts, weight_info = weighted_volume_forecast(
                historical_list, 
                forecast_periods=forecast_days,
                include_yearly=False  # Comprehensive dashboard uses shorter history
            )
            
            # Quick resolution time stats
            resolved_tasks = Task.objects.filter(
                status='completed',
                resolution_time__isnull=False,
                created_at__gte=cutoff_date
            )
            
            resolution_times = []
            for task in resolved_tasks:
                if task.resolution_time and task.created_at:
                    hours = (task.resolution_time - task.created_at).total_seconds() / 3600
                    # Skip negative values (invalid data where resolution_time < created_at)
                    if hours >= 0:
                        resolution_times.append(hours)
            
            resolution_stats = {}
            if resolution_times:
                arr = np.array(resolution_times)
                resolution_stats = {
                    'average_hours': round(float(np.mean(arr)), 2),
                    'median_hours': round(float(np.median(arr)), 2),
                    'predicted_range': {
                        'min': round(float(np.percentile(arr, 10)), 2),
                        'max': round(float(np.percentile(arr, 90)), 2)
                    }
                }
            
            # Quick SLA risk count
            open_tasks = Task.objects.filter(status__in=['pending', 'in progress'])
            high_risk_count = 0
            for task in open_tasks:
                if task.target_resolution:
                    time_remaining = (task.target_resolution - now).total_seconds() / 3600
                    if time_remaining <= 4:
                        high_risk_count += 1
            
            # Volume trend
            avg_historical = float(np.mean(counts)) if counts else 0
            avg_forecast = float(np.mean(volume_forecasts)) if volume_forecasts else 0
            volume_trend = round(((avg_forecast - avg_historical) / avg_historical * 100) if avg_historical > 0 else 0, 1)
            
            return Response({
                'forecast_type': 'comprehensive_dashboard',
                'generated_at': now.isoformat(),
                'analysis_period': {
                    'history_days': history_days,
                    'forecast_days': forecast_days
                },
                'volume_forecast': {
                    'historical_daily_avg': round(avg_historical, 1),
                    'forecast_daily_avg': round(avg_forecast, 1),
                    'trend_percentage': volume_trend,
                    'trend_direction': 'increasing' if volume_trend > 5 else ('decreasing' if volume_trend < -5 else 'stable'),
                    'next_7_days': [
                        {
                            'date': (now + timedelta(days=i+1)).strftime('%Y-%m-%d'),
                            'predicted': round(volume_forecasts[i], 1) if i < len(volume_forecasts) else None
                        }
                        for i in range(min(7, forecast_days))
                    ]
                },
                'resolution_time_forecast': resolution_stats,
                'sla_risk_summary': {
                    'total_open': open_tasks.count(),
                    'high_risk_count': high_risk_count,
                    'high_risk_percentage': round(safe_percentage(high_risk_count, open_tasks.count()), 1)
                },
                'recommendations': self._generate_recommendations(
                    volume_trend, high_risk_count, open_tasks.count(), resolution_stats
                )
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.handle_exception(e)
    
    def _generate_recommendations(self, volume_trend, high_risk_count, open_count, resolution_stats):
        """Generate actionable recommendations based on forecasts."""
        recommendations = []
        
        if volume_trend > 20:
            recommendations.append({
                'type': 'capacity',
                'priority': 'high',
                'message': f'Ticket volume forecasted to increase by {volume_trend}%. Consider scaling team capacity.'
            })
        elif volume_trend > 10:
            recommendations.append({
                'type': 'capacity',
                'priority': 'medium',
                'message': f'Moderate increase in ticket volume expected ({volume_trend}%). Monitor workload closely.'
            })
        
        if high_risk_count > 0:
            risk_pct = safe_percentage(high_risk_count, open_count)
            recommendations.append({
                'type': 'sla',
                'priority': 'high' if risk_pct > 20 else 'medium',
                'message': f'{high_risk_count} tasks at high risk of SLA breach ({round(risk_pct, 1)}%). Prioritize immediate attention.'
            })
        
        if resolution_stats and resolution_stats.get('average_hours', 0) > 24:
            recommendations.append({
                'type': 'efficiency',
                'priority': 'medium',
                'message': f'Average resolution time is {resolution_stats["average_hours"]} hours. Look for process improvements.'
            })
        
        if not recommendations:
            recommendations.append({
                'type': 'general',
                'priority': 'low',
                'message': 'All metrics within normal ranges. Continue monitoring.'
            })
        
        return recommendations
