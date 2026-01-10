// ForecastTab.jsx - ML Forecasting Dashboard Tab
import { useState, useEffect, useCallback } from "react";

// components
import ChartContainer from "../../../components/charts/ChartContainer";
import LineChart from "../../../components/charts/LineChart";
import BarChart from "../../../components/charts/BarChart";

// hooks
import useForecastingAnalytics from "../../../api/useForecastingAnalytics";

// icons
import { 
  TrendingUp, 
  TrendingDown,
  Clock, 
  AlertTriangle,
  Activity,
  Calendar,
  BarChart2,
  Target,
  Zap,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";

// styles
import styles from "../report.module.css";

// ==================== HELPER COMPONENTS ====================

// Format hour (0-23) to 12-hour AM/PM format
const formatHour = (hour) => {
  const h = parseInt(hour);
  if (isNaN(h)) return hour;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour} ${ampm}`;
};

// Format date to include day of week (e.g., "Mon 01-09")
const formatDateWithDay = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr.substring(5);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = days[date.getDay()];
  const monthDay = dateStr.substring(5); // Assuming YYYY-MM-DD
  return `${dayName} ${monthDay}`;
};

// KPI Card for summary stats
function ForecastKpiCard({ title, value, subtitle, icon: Icon, color, trend, trendValue }) {
  return (
    <div className={styles.kpiCard}>
      <div>
        <p>{title}</p>
        <h2 style={{ color }}>{value}</h2>
        {subtitle && <small style={{ color: 'var(--secondary-color)' }}>{subtitle}</small>}
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            {trend === 'up' ? (
              <TrendingUp size={14} color="#7ed321" />
            ) : trend === 'down' ? (
              <TrendingDown size={14} color="#e74c3c" />
            ) : (
              <Activity size={14} color="#f5a623" />
            )}
            <small style={{ color: trend === 'up' ? '#7ed321' : trend === 'down' ? '#e74c3c' : '#f5a623' }}>
              {trendValue}
            </small>
          </div>
        )}
      </div>
      <div className={styles.kpiIcon}>
        <Icon size={28} color={color} />
      </div>
    </div>
  );
}

// Risk Badge component
function RiskBadge({ level }) {
  const config = {
    high: { color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.1)', label: 'High Risk' },
    medium: { color: '#f5a623', bg: 'rgba(245, 166, 35, 0.1)', label: 'Medium Risk' },
    low: { color: '#7ed321', bg: 'rgba(126, 211, 33, 0.1)', label: 'Low Risk' },
  };
  const c = config[level] || config.low;
  
  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: c.bg,
      color: c.color,
    }}>
      {c.label}
    </span>
  );
}

// Recommendation Card
function RecommendationCard({ recommendation }) {
  const priorityConfig = {
    high: { icon: AlertCircle, color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.1)' },
    medium: { icon: AlertTriangle, color: '#f5a623', bg: 'rgba(245, 166, 35, 0.1)' },
    low: { icon: Info, color: '#4a90e2', bg: 'rgba(74, 144, 226, 0.1)' },
  };
  const config = priorityConfig[recommendation.priority] || priorityConfig.low;
  const Icon = config.icon;

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: config.bg,
      borderLeft: `4px solid ${config.color}`,
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Icon size={20} color={config.color} style={{ marginTop: '2px' }} />
        <div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: config.color, 
            textTransform: 'uppercase',
            marginBottom: '4px' 
          }}>
            {recommendation.type} • {recommendation.priority} priority
          </div>
          <p style={{ margin: 0, color: 'var(--text-color)' }}>{recommendation.message}</p>
        </div>
      </div>
    </div>
  );
}

// At-Risk Task Row
function AtRiskTaskRow({ task }) {
  const riskColor = task.risk_level === 'high' ? '#e74c3c' : task.risk_level === 'medium' ? '#f5a623' : '#7ed321';
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border-color)',
      borderLeft: `4px solid ${riskColor}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          #{task.ticket_number}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--secondary-color)' }}>
          {task.subject?.substring(0, 50) || 'No subject'}...
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted-text-color)', marginTop: '4px' }}>
          {task.workflow} • {task.priority}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: '700', 
          color: riskColor 
        }}>
          {task.risk_score}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Risk Score</div>
        {task.hours_remaining !== null && (
          <div style={{ 
            fontSize: '12px', 
            color: task.hours_remaining < 0 ? '#e74c3c' : 'var(--secondary-color)',
            marginTop: '4px'
          }}>
            {task.hours_remaining < 0 
              ? `${Math.abs(task.hours_remaining).toFixed(1)}h overdue`
              : `${task.hours_remaining.toFixed(1)}h remaining`
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Workload Forecast Day Card
function WorkloadDayCard({ day }) {
  const intensityConfig = {
    high: { color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.1)' },
    normal: { color: '#4a90e2', bg: 'rgba(74, 144, 226, 0.1)' },
    low: { color: '#7ed321', bg: 'rgba(126, 211, 33, 0.1)' },
  };
  const config = intensityConfig[day.expected_intensity] || intensityConfig.normal;

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: config.bg,
      textAlign: 'center',
      minWidth: '100px',
    }}>
      <div style={{ fontSize: '12px', color: 'var(--secondary-color)', marginBottom: '4px' }}>
        {day.day}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted-text-color)', marginBottom: '8px' }}>
        {day.date}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: config.color }}>
        {Math.round(day.predicted_tickets)}
      </div>
      <div style={{ fontSize: '11px', color: config.color, fontWeight: '600' }}>
        {day.expected_intensity.toUpperCase()}
      </div>
    </div>
  );
}

// Resolution Time Card
function ResolutionTimeCard({ prediction }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      backgroundColor: 'var(--card-bg)',
    }}>
      <div style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--heading-color)' }}>
        {prediction.group}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Predicted</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary-color)' }}>
            {prediction.predicted_hours.toFixed(1)}h
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>Median</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-color)' }}>
            {prediction.median_hours.toFixed(1)}h
          </div>
        </div>
      </div>
      <div style={{ 
        marginTop: '12px', 
        padding: '8px', 
        backgroundColor: 'var(--bg-color)', 
        borderRadius: '4px',
        fontSize: '12px',
        color: 'var(--secondary-color)'
      }}>
        Range: {prediction.min_hours.toFixed(1)}h - {prediction.max_hours.toFixed(1)}h
        <br />
        90th percentile: {prediction.percentile_90.toFixed(1)}h
        <br />
        Sample size: {prediction.sample_size} tickets
      </div>
    </div>
  );
}

// Category Trend Card
function CategoryTrendCard({ category }) {
  const trendColor = category.trend_direction === 'increasing' ? 'var(--status-danger-color)' 
    : category.trend_direction === 'decreasing' ? 'var(--status-success-color)' 
    : 'var(--status-warning-color)';

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
      backgroundColor: 'var(--card-bg)',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <div style={{ fontWeight: '600', color: 'var(--heading-color)' }}>
          {category.category}
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          color: trendColor,
          fontSize: '13px',
          fontWeight: '600'
        }}>
          {category.trend_direction === 'increasing' ? (
            <TrendingUp size={16} />
          ) : category.trend_direction === 'decreasing' ? (
            <TrendingDown size={16} />
          ) : (
            <Activity size={16} />
          )}
          {category.trend_percentage > 0 ? '+' : ''}{category.trend_percentage}%
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
        <div>
          <span style={{ color: 'var(--secondary-color)' }}>Historical Avg: </span>
          <strong>{category.historical_weekly_avg.toFixed(1)}/week</strong>
        </div>
        <div>
          <span style={{ color: 'var(--secondary-color)' }}>Forecast Avg: </span>
          <strong>{category.forecast_weekly_avg.toFixed(1)}/week</strong>
        </div>
      </div>
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: 'var(--muted-text-color)' 
      }}>
        Total: {category.historical_total} tickets
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ForecastTab({ timeFilter }) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const {
    loading,
    error,
    volumeForecast,
    resolutionTimeForecast,
    categoryForecast,
    slaRiskForecast,
    workloadForecast,
    comprehensiveForecast,
    fetchVolumeForecast,
    fetchResolutionTimeForecast,
    fetchCategoryForecast,
    fetchSlaRiskForecast,
    fetchWorkloadForecast,
    fetchComprehensiveForecast,
    fetchAllForecasts,
  } = useForecastingAnalytics();

  // Load data based on active sub-tab
  const loadData = useCallback(async () => {
    switch (activeSubTab) {
      case 'dashboard':
        await fetchComprehensiveForecast({ days: 60, forecast_days: 14 });
        break;
      case 'volume':
        await fetchVolumeForecast({ forecast_days: 14, history_days: 90, granularity: 'daily' });
        break;
      case 'resolution':
        await fetchResolutionTimeForecast({ days: 90, by: 'priority' });
        break;
      case 'categories':
        await fetchCategoryForecast({ forecast_weeks: 4, history_weeks: 12 });
        break;
      case 'sla-risk':
        await fetchSlaRiskForecast({ threshold: 50 });
        break;
      case 'workload':
        await fetchWorkloadForecast({ forecast_days: 7, history_days: 60 });
        break;
      default:
        await fetchComprehensiveForecast();
    }
    setLastUpdated(new Date());
  }, [activeSubTab, fetchComprehensiveForecast, fetchVolumeForecast, fetchResolutionTimeForecast, 
      fetchCategoryForecast, fetchSlaRiskForecast, fetchWorkloadForecast]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Sub-tabs configuration
  const subTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'volume', label: 'Volume Forecast', icon: TrendingUp },
    { id: 'resolution', label: 'Resolution Time', icon: Clock },
    { id: 'categories', label: 'Categories', icon: Target },
    { id: 'sla-risk', label: 'SLA Risk', icon: AlertTriangle },
    { id: 'workload', label: 'Workload', icon: Calendar },
  ];

  // Render content based on active sub-tab
  const renderContent = () => {
    if (loading && !comprehensiveForecast) {
      return <div style={{ padding: '40px', textAlign: 'center' }}>Loading forecasts...</div>;
    }

    if (error) {
      return <div style={{ padding: '20px', color: '#e74c3c' }}>Error: {error}</div>;
    }

    switch (activeSubTab) {
      case 'dashboard':
        return renderDashboard();
      case 'volume':
        return renderVolumeForecast();
      case 'resolution':
        return renderResolutionForecast();
      case 'categories':
        return renderCategoryForecast();
      case 'sla-risk':
        return renderSlaRiskForecast();
      case 'workload':
        return renderWorkloadForecast();
      default:
        return renderDashboard();
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => {
    const data = comprehensiveForecast;
    if (!data) return <div>No forecast data available</div>;

    const volumeData = data.volume_forecast || {};
    const slaRisk = data.sla_risk_summary || {};
    const resolutionTime = data.resolution_time_forecast || {};
    const recommendations = data.recommendations || [];

    // Prepare chart data for next 7 days forecast
    const next7Days = volumeData.next_7_days || [];
    const chartLabels = next7Days.map(d => formatDateWithDay(d.date));
    const chartData = next7Days.map(d => d.predicted || 0);

    return (
      <div className={styles.chartsGrid}>
        {/* KPI Summary Row */}
        <div className={styles.kpiRow}>
          <ForecastKpiCard
            title="Historical Daily Avg"
            value={volumeData.historical_daily_avg?.toFixed(1) || '0'}
            subtitle="tickets/day"
            icon={Activity}
            color="var(--primary-color)"
          />
          <ForecastKpiCard
            title="Forecast Daily Avg"
            value={volumeData.forecast_daily_avg?.toFixed(1) || '0'}
            subtitle="tickets/day"
            icon={TrendingUp}
            color={volumeData.trend_direction === 'increasing' ? 'var(--status-danger-color)' : 'var(--status-success-color)'}
            trend={volumeData.trend_direction === 'increasing' ? 'up' : volumeData.trend_direction === 'decreasing' ? 'down' : 'stable'}
            trendValue={`${volumeData.trend_percentage > 0 ? '+' : ''}${volumeData.trend_percentage}%`}
          />
          <ForecastKpiCard
            title="Open Tasks"
            value={slaRisk.total_open || 0}
            subtitle={`${slaRisk.high_risk_count || 0} at risk`}
            icon={AlertTriangle}
            color={slaRisk.high_risk_percentage > 20 ? 'var(--status-danger-color)' : 'var(--status-warning-color)'}
          />
          <ForecastKpiCard
            title="Avg Resolution"
            value={`${resolutionTime.average_hours?.toFixed(1) || '0'}h`}
            subtitle={`Median: ${resolutionTime.median_hours?.toFixed(1) || '0'}h`}
            icon={Clock}
            color="var(--secondary-color)"
          />
        </div>

        {/* Volume Forecast Chart */}
        <ChartContainer title="7-Day Volume Forecast" icon={<TrendingUp size={20} />}>
          <LineChart
            labels={chartLabels}
            dataPoints={chartData}
            chartLabel="Predicted Tickets"
            chartTitle=""
          />
        </ChartContainer>

        {/* Recommendations Section */}
        <ChartContainer title="AI Recommendations" icon={<Zap size={20} />}>
          <div style={{ padding: '8px 0' }}>
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))
            ) : (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: 'var(--secondary-color)' 
              }}>
                <CheckCircle size={32} color="var(--status-success-color)" style={{ marginBottom: '8px' }} />
                <div>All systems operating normally</div>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>
    );
  };

  const renderVolumeForecast = () => {
    const data = volumeForecast;
    if (!data) return <div>No volume forecast data available</div>;

    const historical = data.historical_data || [];
    const forecasts = data.forecasts || [];
    const summary = data.summary || {};

    // Combine for chart
    const allLabels = [
      ...historical.slice(-14).map(h => formatDateWithDay(h.date)),
      ...forecasts.map(f => formatDateWithDay(f.date))
    ];
    
    const historicalData = [
      ...historical.slice(-14).map(h => h.count),
      ...forecasts.map(() => null)
    ];
    
    const forecastData = [
      ...historical.slice(-14).map(() => null),
      ...forecasts.map(f => f.predicted_count)
    ];

    const chartDatasets = [
      { label: 'Historical', data: historicalData, borderColor: 'rgba(74, 144, 226, 1)' },
      { label: 'Forecast', data: forecastData, borderColor: 'rgba(126, 211, 33, 1)' },
    ];

    return (
      <div className={styles.chartsGrid}>
        {/* Summary KPIs */}
        <div className={styles.kpiRow}>
          <ForecastKpiCard
            title="Historical Average"
            value={summary.historical_average?.toFixed(1) || '0'}
            subtitle="tickets/period"
            icon={Activity}
            color="var(--primary-color)"
          />
          <ForecastKpiCard
            title="Forecast Average"
            value={summary.forecast_average?.toFixed(1) || '0'}
            subtitle="tickets/period"
            icon={TrendingUp}
            color={summary.trend_direction === 'increasing' ? 'var(--status-danger-color)' : 'var(--status-success-color)'}
            trend={summary.trend_direction === 'increasing' ? 'up' : summary.trend_direction === 'decreasing' ? 'down' : 'stable'}
            trendValue={summary.trend_direction}
          />
          <ForecastKpiCard
            title="Confidence Level"
            value="95%"
            subtitle={`±${summary.confidence_interval?.std?.toFixed(1) || '0'} std dev`}
            icon={Target}
            color="var(--secondary-color)"
          />
        </div>

        {/* Volume Chart */}
        <ChartContainer title="Volume Forecast (Historical + Predicted)" icon={<TrendingUp size={20} />}>
          <LineChart
            labels={allLabels}
            dataPoints={chartDatasets}
            chartTitle=""
          />
        </ChartContainer>

        {/* Forecast Details Table */}
        <ChartContainer title="Forecast Details" icon={<Calendar size={20} />}>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Predicted</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Confidence Range</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>{f.date}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                      {f.predicted_count?.toFixed(1)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--secondary-color)' }}>
                      {f.confidence_lower?.toFixed(1)} - {f.confidence_upper?.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      </div>
    );
  };

  const renderResolutionForecast = () => {
    const data = resolutionTimeForecast;
    if (!data) return <div>No resolution time data available</div>;

    const predictions = data.predictions || [];
    const overall = data.overall_statistics || {};

    // Chart data
    const chartLabels = predictions.map(p => p.group);
    const chartData = predictions.map(p => p.predicted_hours);

    return (
      <div className={styles.chartsGrid}>
        {/* Overall Stats */}
        <div className={styles.kpiRow}>
          <ForecastKpiCard
            title="Total Resolved"
            value={overall.total_resolved || 0}
            subtitle="in analysis period"
            icon={CheckCircle}
            color="#7ed321"
          />
          <ForecastKpiCard
            title="Average Resolution"
            value={`${overall.average_hours?.toFixed(1) || '0'}h`}
            icon={Clock}
            color="var(--primary-color)"
          />
          <ForecastKpiCard
            title="Median Resolution"
            value={`${overall.median_hours?.toFixed(1) || '0'}h`}
            icon={Activity}
            color="var(--secondary-color)"
          />
        </div>

        {/* Bar Chart */}
        <ChartContainer title={`Resolution Time by ${data.group_by || 'Category'}`} icon={<BarChart2 size={20} />}>
          <BarChart
            labels={chartLabels}
            dataPoints={chartData}
            chartLabel="Avg Hours"
            chartTitle=""
          />
        </ChartContainer>

        {/* Detailed Cards */}
        <ChartContainer title="Detailed Predictions" icon={<Target size={20} />}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px',
            padding: '8px 0'
          }}>
            {predictions.map((pred, idx) => (
              <ResolutionTimeCard key={idx} prediction={pred} />
            ))}
          </div>
        </ChartContainer>
      </div>
    );
  };

  const renderCategoryForecast = () => {
    const data = categoryForecast;
    if (!data) return <div>No category forecast data available</div>;

    const categories = data.category_forecasts || [];

    return (
      <div className={styles.chartsGrid}>
        {/* Summary */}
        <div className={styles.kpiRow}>
          <ForecastKpiCard
            title="Categories Tracked"
            value={categories.length}
            icon={Target}
            color="var(--primary-color)"
          />
          <ForecastKpiCard
            title="Forecast Period"
            value={`${data.forecast_weeks || 4} weeks`}
            icon={Calendar}
            color="var(--secondary-color)"
          />
        </div>

        {/* Category Trend Cards */}
        <ChartContainer title="Category Trend Forecasts" icon={<TrendingUp size={20} />}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '16px',
            padding: '8px 0'
          }}>
            {categories.map((cat, idx) => (
              <CategoryTrendCard key={idx} category={cat} />
            ))}
          </div>
        </ChartContainer>
      </div>
    );
  };

  const renderSlaRiskForecast = () => {
    const data = slaRiskForecast;
    if (!data) return <div>No SLA risk data available</div>;

    const summary = data.summary || {};
    const distribution = data.risk_distribution || {};
    const atRiskTasks = data.at_risk_tasks || [];

    // Chart data for risk distribution
    const riskLabels = ['High Risk', 'Medium Risk', 'Low Risk'];
    const riskData = [distribution.high || 0, distribution.medium || 0, distribution.low || 0];

    return (
      <div className={styles.chartsGrid}>
        {/* Risk Summary KPIs */}
        <div className={styles.kpiRow}>
          <ForecastKpiCard
            title="Total Open Tasks"
            value={summary.total_open_tasks || 0}
            icon={Activity}
            color="var(--primary-color)"
          />
          <ForecastKpiCard
            title="High Risk"
            value={summary.high_risk_count || 0}
            subtitle={`${distribution.high?.toFixed(1) || 0}%`}
            icon={AlertCircle}
            color="var(--status-danger-color)"
          />
          <ForecastKpiCard
            title="Medium Risk"
            value={summary.medium_risk_count || 0}
            subtitle={`${distribution.medium?.toFixed(1) || 0}%`}
            icon={AlertTriangle}
            color="var(--status-warning-color)"
          />
          <ForecastKpiCard
            title="Low Risk"
            value={summary.low_risk_count || 0}
            subtitle={`${distribution.low?.toFixed(1) || 0}%`}
            icon={CheckCircle}
            color="var(--status-success-color)"
          />
        </div>

        {/* Risk Distribution Chart */}
        <ChartContainer title="Risk Distribution" icon={<BarChart2 size={20} />}>
          <BarChart
            labels={riskLabels}
            dataPoints={riskData}
            chartLabel="Percentage"
            chartTitle=""
          />
        </ChartContainer>

        {/* At-Risk Tasks List */}
        <ChartContainer title={`Tasks Above Risk Threshold (${data.risk_threshold || 70}+)`} icon={<AlertTriangle size={20} />}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {atRiskTasks.length > 0 ? (
              atRiskTasks.map((task, idx) => (
                <AtRiskTaskRow key={idx} task={task} />
              ))
            ) : (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: 'var(--secondary-color)' 
              }}>
                <CheckCircle size={48} color="#7ed321" style={{ marginBottom: '12px' }} />
                <div>No tasks above the risk threshold</div>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>
    );
  };

  const renderWorkloadForecast = () => {
    const data = workloadForecast;
    if (!data) return <div>No workload forecast data available</div>;

    const patterns = data.patterns || {};
    const hourlyDist = data.hourly_distribution || [];
    const dailyDist = data.daily_distribution || [];
    const forecast = data.workload_forecast || [];

    // Hourly chart data
    const hourLabels = hourlyDist.map(h => formatHour(h.hour));
    const hourData = hourlyDist.map(h => h.count);

    // Daily chart data
    const dayLabels = dailyDist.map(d => d.day?.substring(0, 3));
    const dayData = dailyDist.map(d => d.count);

    return (
      <div className={styles.chartsGrid}>
        {/* Pattern Summary */}
        <div className={styles.kpiRow}>
          <ForecastKpiCard
            title="Peak Hours"
            value={patterns.peak_hours?.map(formatHour).join(', ') || 'N/A'}
            subtitle="busiest times"
            icon={Zap}
            color="var(--status-danger-color)"
          />
          <ForecastKpiCard
            title="Busiest Day"
            value={patterns.busiest_day || 'N/A'}
            icon={TrendingUp}
            color="var(--status-warning-color)"
          />
          <ForecastKpiCard
            title="Quietest Day"
            value={patterns.quietest_day || 'N/A'}
            icon={TrendingDown}
            color="var(--status-success-color)"
          />
        </div>

        {/* 7-Day Forecast Cards */}
        <ChartContainer title="7-Day Workload Forecast" icon={<Calendar size={20} />}>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            overflowX: 'auto', 
            padding: '8px 0' 
          }}>
            {forecast.map((day, idx) => (
              <WorkloadDayCard key={idx} day={day} />
            ))}
          </div>
        </ChartContainer>

        {/* Hourly Distribution */}
        <ChartContainer title="Hourly Distribution Pattern" icon={<Clock size={20} />}>
          <BarChart
            labels={hourLabels}
            dataPoints={hourData}
            chartLabel="Tickets"
            chartTitle=""
          />
        </ChartContainer>

        {/* Daily Distribution */}
        <ChartContainer title="Day of Week Distribution" icon={<Calendar size={20} />}>
          <BarChart
            labels={dayLabels}
            dataPoints={dayData}
            chartLabel="Tickets"
            chartTitle=""
          />
        </ChartContainer>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <div className={styles.chartsGrid}>
      {/* Header with refresh */}
      <div className={styles.insightsHeader}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={24} /> ML Forecasting
          </h2>
          {lastUpdated && (
            <small style={{ color: 'var(--secondary-color)' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </small>
          )}
        </div>
        <button 
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Sub-tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '16px',
        marginBottom: '16px'
      }}>
        {subTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeSubTab === tab.id ? 'var(--primary-color)' : 'var(--card-bg)',
                color: activeSubTab === tab.id ? 'white' : 'var(--text-color)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
