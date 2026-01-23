import React from "react";
import { Line } from "react-chartjs-2";
import { Download } from "lucide-react";
import AnalyticsFilters from "./AnalyticsFilters";
import { formatPeso } from "../../utils/dashboardUtils";
import { createSpendingTrendsOptions } from "../../utils/chartConfigs";
import "./SpendingAnalytics.css";

const SpendingTrendsView = ({
  data,
  filters,
  handlers,
  isFinanceManager,
  userDepartment,
}) => {
  const chartOptions = createSpendingTrendsOptions(data);

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <h3 className="view-title">Department Spending Trends</h3>
        <button
          className="btn-export-success" // Reusing class from DashboardCharts.css/SpendingAnalytics.css
          onClick={handlers.onExport}
        >
          Export Report
          <Download size={16} style={{ marginLeft: "6px" }} />
        </button>
      </div>

      {/* Filters */}
      <AnalyticsFilters
        isFinanceManager={isFinanceManager}
        userDepartment={userDepartment}
        selectedDepartment={filters.department}
        onDepartmentChange={handlers.setDepartment}
        dateRange={filters.dateRange}
        onDateChange={handlers.setDateRange}
        showGranularity={true}
        granularityValue={filters.granularity}
        onGranularityChange={handlers.setGranularity}
        gridColumns={4}
      />

      {/* Content */}
      {data ? (
        <>
          <div style={{ height: "350px", marginBottom: "25px" }}>
            <Line data={data} options={chartOptions} />
          </div>

          <div className="trends-summary">
            <div className="summary-stat-card">
              <h4 className="summary-stat-title">Total Amount Spent</h4>
              <p className="summary-stat-value">
                {formatPeso(data.totalAmount)}
              </p>
            </div>
            <div className="summary-stat-card">
              <h4 className="summary-stat-title">Percentage Change</h4>
              <p
                className="summary-stat-value"
                style={{
                  color:
                    data.avgPercentageChange >= 0 ? "#28a745" : "#dc3545",
                }}
              >
                {data.avgPercentageChange >= 0 ? "+" : ""}
                {data.avgPercentageChange}%
              </p>
              <span
                style={{
                  fontSize: "11px",
                  color:
                    data.avgPercentageChange >= 0 ? "#28a745" : "#dc3545",
                  display: "block",
                  marginTop: "4px",
                }}
              >
                vs first period
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data-placeholder">No Data Available</div>
      )}
    </div>
  );
};

export default SpendingTrendsView;