// components
import ComponentSkeleton from "../../../components/skeleton/ComponentSkeleton";
import ChartContainer from "../../../components/charts/ChartContainer";
import LineChart from "../../../components/charts/LineChart";
import BarChart from "../../../components/charts/BarChart";

// hooks
import useReportingAnalytics from "../../../api/useReportingAnalytics";

// icons
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Zap,
  BarChart2,
  RefreshCw
} from "lucide-react";

// react
import { useState, useEffect, useCallback } from "react";

// styles
import styles from "../report.module.css";

// Severity icon and color mapping
const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: '#e74c3c',
    bgColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f5a623',
    bgColor: 'rgba(245, 166, 35, 0.1)',
    borderColor: 'rgba(245, 166, 35, 0.3)',
  },
  info: {
    icon: Info,
    color: '#4a90e2',
    bgColor: 'rgba(74, 144, 226, 0.1)',
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
};

// Category icon mapping
const categoryIcons = {
  'Agent Overload': Users,
  'Workload Imbalance': BarChart2,
  'SLA Breach': AlertCircle,
  'SLA Critical': Clock,
  'SLA Warning': Clock,
  'SLA Compliance': Shield,
  'Resolution Time': Clock,
  'Escalation Rate': TrendingUp,
  'Transfer Rate': RefreshCw,
  'Stale Tickets': Clock,
  'Aging Tickets': Clock,
  'Volume Spike': Zap,
  'Queue Backlog': Activity,
  'Workflow Backlog': Activity,
};

// Health score indicator component
function HealthScoreIndicator({ score }) {
  let color = '#7ed321';
  let status = 'Healthy';
  
  if (score < 50) {
    color = '#e74c3c';
    status = 'Critical';
  } else if (score < 75) {
    color = '#f5a623';
    status = 'Needs Attention';
  }
  
  return (
    <div className={styles.healthScoreCard}>
      <div className={styles.healthScoreCircle} style={{ borderColor: color }}>
        <span className={styles.healthScoreValue} style={{ color }}>{score}</span>
        <span className={styles.healthScoreLabel}>/ 100</span>
      </div>
      <div className={styles.healthScoreStatus}>
        <span className={styles.healthStatusText} style={{ color }}>{status}</span>
        <span className={styles.healthStatusSubtext}>System Health Score</span>
      </div>
    </div>
  );
}

// Alert card component
function AlertCard({ alert }) {
  const config = severityConfig[alert.severity] || severityConfig.info;
  const SeverityIcon = config.icon;
  const CategoryIcon = categoryIcons[alert.category] || Activity;
  
  return (
    <div 
      className={styles.alertCard}
      style={{ 
        backgroundColor: config.bgColor,
        borderLeftColor: config.color,
      }}
    >
      <div className={styles.alertHeader}>
        <div className={styles.alertIconGroup}>
          <SeverityIcon size={20} color={config.color} />
          <CategoryIcon size={16} color="var(--secondary-color)" style={{ marginLeft: 8 }} />
        </div>
        <span 
          className={styles.alertSeverityBadge}
          style={{ backgroundColor: config.color }}
        >
          {alert.severity.toUpperCase()}
        </span>
      </div>
      <h4 className={styles.alertTitle}>{alert.title}</h4>
      <p className={styles.alertMessage}>{alert.message}</p>
      {alert.recommendation && (
        <div className={styles.alertRecommendation}>
          <strong>Recommendation:</strong> {alert.recommendation}
        </div>
      )}
      {alert.affected_tasks && alert.affected_tasks.length > 0 && (
        <div className={styles.alertAffectedTasks}>
          <strong>Affected Tickets:</strong>
          <ul>
            {alert.affected_tasks.map((task, idx) => (
              <li key={idx}>
                #{task.ticket_number} - {task.hours_remaining?.toFixed(1)}h remaining
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Summary stat card
function SummaryCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className={styles.kpiCard}>
      <div>
        <p>{title}</p>
        <h2 style={{ color }}>{value}</h2>
        {subtitle && <small style={{ color: 'var(--secondary-color)' }}>{subtitle}</small>}
      </div>
      <div className={styles.kpiIcon}>
        <Icon size={28} color={color} />
      </div>
    </div>
  );
}

// Workload bar component
function WorkloadBar({ user, maxTasks = 15 }) {
  const percentage = Math.min((user.active_tasks / maxTasks) * 100, 100);
  let barColor = '#7ed321';
  
  if (percentage >= 100) {
    barColor = '#e74c3c';
  } else if (percentage >= 70) {
    barColor = '#f5a623';
  }
  
  return (
    <div className={styles.workloadBarContainer}>
      <div className={styles.workloadBarInfo}>
        <span className={styles.workloadUserName}>{user.user_name}</span>
        <span className={styles.workloadTaskCount}>{user.active_tasks} active tasks</span>
      </div>
      <div className={styles.workloadBarTrack}>
        <div 
          className={styles.workloadBarFill}
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

// SLA Risk item component
function SlaRiskItem({ task, type }) {
  const color = type === 'breached' ? '#e74c3c' : '#f5a623';
  
  return (
    <div className={styles.slaRiskItem} style={{ borderLeftColor: color }}>
      <div className={styles.slaRiskHeader}>
        <span className={styles.slaRiskTicket}>#{task.ticket_number}</span>
        <span 
          className={styles.slaRiskBadge}
          style={{ backgroundColor: color }}
        >
          {type === 'breached' 
            ? `${task.overdue_hours?.toFixed(1)}h overdue`
            : `${task.hours_remaining?.toFixed(1)}h left`
          }
        </span>
      </div>
      <p className={styles.slaRiskSubject}>{task.subject?.substring(0, 60) || 'No subject'}...</p>
      <div className={styles.slaRiskMeta}>
        <span>{task.workflow || 'Unknown workflow'}</span>
        <span>•</span>
        <span>{task.priority || 'No priority'}</span>
      </div>
    </div>
  );
}

export default function InsightsTab({ timeFilter }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const {
    loading,
    error,
    operationalInsights,
    workloadAnalysis,
    slaRiskReport,
    anomalyDetection,
    serviceHealth,
    fetchAllInsights,
  } = useReportingAnalytics();

  // Fetch data on mount and when time filter changes
  const loadInsights = useCallback(async () => {
    const dateRange = timeFilter?.startDate || timeFilter?.endDate ? {
      start_date: timeFilter?.startDate?.toISOString()?.split('T')[0],
      end_date: timeFilter?.endDate?.toISOString()?.split('T')[0],
    } : null;
    
    await fetchAllInsights(dateRange);
    setLastUpdated(new Date());
  }, [fetchAllInsights, timeFilter]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading && !operationalInsights) {
    return (
      <div className={styles.tabContent}>
        <ComponentSkeleton className="report-skeleton">
          <div className={styles.skeletonContainer}>
            <div className={styles.skeletonHeader}>
              <div className={styles.skeletonTitle}>Loading Operational Insights...</div>
              <div className={styles.skeletonSubtitle}>Generating AI-powered analytics</div>
            </div>
            <div className={styles.skeletonGrid}>
              <div className={styles.skeletonCard}>🤖 Smart Insights</div>
              <div className={styles.skeletonCard}>🔍 Trend Analysis</div>
              <div className={styles.skeletonCard}>⚡ Performance Alerts</div>
              <div className={styles.skeletonCard}>📊 Predictive Analytics</div>
            </div>
          </div>
        </ComponentSkeleton>
      </div>
    );
  }
  
  if (error) {
    return <div style={{ color: "red", padding: "20px" }}>Error: {error}</div>;
  }

  const insights = operationalInsights || {};
  const alerts = insights.alerts || [];
  const summary = insights.summary || {};
  const healthScore = insights.health_score || 0;
  
  const workloads = workloadAnalysis?.workloads || [];
  const slaRisk = slaRiskReport || {};
  const anomalies = anomalyDetection || {};
  
  // Group alerts by type
  const alertsByType = alerts.reduce((acc, alert) => {
    const type = alert.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(alert);
    return acc;
  }, {});

  // Anomaly chart data
  const dailyVolumes = anomalies.daily_volumes || [];
  const volumeLabels = dailyVolumes.map(d => d.date).reverse();
  const volumeData = dailyVolumes.map(d => d.count).reverse();

  return (
    <div className={styles.chartsGrid}>
      {/* Header with refresh */}
      <div className={styles.insightsHeader}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={24} /> Operational Insights
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

      {/* Health Score and Summary */}
      <div className={styles.chartSection}>
        <h2><Shield size={20} /> System Health Overview</h2>
        <div className={styles.healthOverviewGrid}>
          <HealthScoreIndicator score={healthScore} />
          <div className={styles.kpiGrid}>
            <SummaryCard 
              title="Critical Alerts"
              value={summary.critical_count || 0}
              icon={AlertCircle}
              color="#e74c3c"
            />
            <SummaryCard 
              title="Warnings"
              value={summary.warning_count || 0}
              icon={AlertTriangle}
              color="#f5a623"
            />
            <SummaryCard 
              title="Info Notices"
              value={summary.info_count || 0}
              icon={Info}
              color="#4a90e2"
            />
            <SummaryCard 
              title="Total Alerts"
              value={summary.total_alerts || 0}
              icon={Activity}
              color="var(--heading-color)"
            />
          </div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {alerts.filter(a => a.severity === 'critical').length > 0 && (
        <div className={styles.chartSection}>
          <h2 style={{ color: '#e74c3c' }}>
            <AlertCircle size={20} /> Critical Alerts
          </h2>
          <div className={styles.alertsGrid}>
            {alerts.filter(a => a.severity === 'critical').map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {alerts.filter(a => a.severity === 'warning').length > 0 && (
        <div className={styles.chartSection}>
          <h2 style={{ color: '#f5a623' }}>
            <AlertTriangle size={20} /> Warnings
          </h2>
          <div className={styles.alertsGrid}>
            {alerts.filter(a => a.severity === 'warning').map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* SLA Risk Report */}
      <div className={styles.chartSection}>
        <h2><Clock size={20} /> SLA Risk Report</h2>
        <div className={styles.slaRiskGrid}>
          <div className={styles.slaRiskSection}>
            <h3 style={{ color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              Breached ({slaRisk.summary?.breached_count || 0})
            </h3>
            <div className={styles.slaRiskList}>
              {(slaRisk.breached || []).slice(0, 5).map((task, idx) => (
                <SlaRiskItem key={idx} task={task} type="breached" />
              ))}
              {(!slaRisk.breached || slaRisk.breached.length === 0) && (
                <div className={styles.emptyState}>
                  <CheckCircle size={24} color="#7ed321" />
                  <span>No SLA breaches</span>
                </div>
              )}
            </div>
          </div>
          <div className={styles.slaRiskSection}>
            <h3 style={{ color: '#f5a623', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              At Risk ({slaRisk.summary?.at_risk_count || 0})
            </h3>
            <div className={styles.slaRiskList}>
              {(slaRisk.at_risk || []).slice(0, 5).map((task, idx) => (
                <SlaRiskItem key={idx} task={task} type="at_risk" />
              ))}
              {(!slaRisk.at_risk || slaRisk.at_risk.length === 0) && (
                <div className={styles.emptyState}>
                  <CheckCircle size={24} color="#7ed321" />
                  <span>No tickets at risk</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Workload Distribution */}
      <div className={styles.chartSection}>
        <h2><Users size={20} /> Agent Workload Distribution</h2>
        {workloads.length > 0 ? (
          <>
            <div className={styles.workloadSummary}>
              <span>Total Agents: {workloadAnalysis?.summary?.total_agents || 0}</span>
              <span>•</span>
              <span>Avg Tasks/Agent: {workloadAnalysis?.summary?.avg_tasks_per_agent?.toFixed(1) || 0}</span>
              <span>•</span>
              <span style={{ color: workloadAnalysis?.summary?.overloaded_agents > 0 ? '#e74c3c' : '#7ed321' }}>
                Overloaded: {workloadAnalysis?.summary?.overloaded_agents || 0}
              </span>
            </div>
            <div className={styles.workloadBarsContainer}>
              {workloads.slice(0, 10).map((user, idx) => (
                <WorkloadBar key={idx} user={user} />
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <Users size={24} color="var(--secondary-color)" />
            <span>No workload data available</span>
          </div>
        )}
      </div>

      {/* Volume Trends & Anomalies */}
      <div className={styles.chartRow}>
        <ChartContainer title="Daily Ticket Volume (Last 7 Days)">
          {volumeLabels.length > 0 ? (
            <LineChart 
              labels={volumeLabels}
              dataPoints={volumeData}
              chartTitle="Ticket Volume"
              chartLabel="Tickets Created"
            />
          ) : (
            <div className={styles.emptyState}>
              <BarChart2 size={24} color="var(--secondary-color)" />
              <span>No volume data available</span>
            </div>
          )}
        </ChartContainer>
        
        <div className={styles.anomaliesCard}>
          <h3><Zap size={18} /> Detected Anomalies</h3>
          <div className={styles.anomaliesList}>
            {(anomalies.anomalies || []).length > 0 ? (
              anomalies.anomalies.map((anomaly, idx) => (
                <div key={idx} className={styles.anomalyItem}>
                  <AlertTriangle size={16} color="#f5a623" />
                  <span>{anomaly.description}</span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <CheckCircle size={24} color="#7ed321" />
                <span>No anomalies detected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Notices (collapsed by default) */}
      {alerts.filter(a => a.severity === 'info').length > 0 && (
        <div className={styles.chartSection}>
          <h2 style={{ color: '#4a90e2' }}>
            <Info size={20} /> Information Notices
          </h2>
          <div className={styles.alertsGrid}>
            {alerts.filter(a => a.severity === 'info').map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
