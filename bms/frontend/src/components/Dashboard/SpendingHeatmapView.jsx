import React from "react";
import { Download } from "lucide-react";
import AnalyticsFilters from "./AnalyticsFilters";
import { formatPeso } from "../../utils/dashboardUtils";
import "./SpendingAnalytics.css";

const SpendingHeatmapView = ({
  data, // heatmapData
  filters,
  handlers,
  isFinanceManager,
  userDepartment,
}) => {
  const renderHeatmap = () => {
    if (!data.length) return null;

    const maxValue = Math.max(...data.map((item) => item.value));
    const minValue = Math.min(...data.map((item) => item.value));

    return (
      <div className="heatmap-container">
        {data.map((item, index) => {
          // Calculate intensity based on value
          const intensity = (item.value - minValue) / (maxValue - minValue);
          const colorIntensity = Math.floor(intensity * 255);
          // Color logic: Reddish/mixed based on intensity
          const color = `rgba(255, ${255 - colorIntensity}, ${
            255 - colorIntensity
          }, ${0.3 + intensity * 0.7})`;

          let badgeColor = "#28a745"; // Low (Green)
          if (item.intensity === "Medium") badgeColor = "#ffc107"; // Yellow
          if (item.intensity === "High") badgeColor = "#dc3545"; // Red

          return (
            <div
              key={index}
              className="heatmap-cell"
              style={{ backgroundColor: color }}
              title={`${item.period}: ${formatPeso(item.value)}`}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                {item.period}
              </div>
              <div style={{ fontSize: "12px", marginTop: "5px" }}>
                {formatPeso(item.value)}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  marginTop: "5px",
                  padding: "2px 6px",
                  backgroundColor: badgeColor,
                  color: "white",
                  borderRadius: "10px",
                }}
              >
                {item.intensity}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="view-header">
        <h3 className="view-title">Spending Intensity Heatmap</h3>
        <button className="btn-export-success" onClick={handlers.onExport}>
          Export Report <Download size={16} />
        </button>
      </div>

      <AnalyticsFilters
        isFinanceManager={isFinanceManager}
        userDepartment={userDepartment}
        selectedDepartment={filters.department}
        onDepartmentChange={handlers.setDepartment}
        dateRange={filters.dateRange}
        onDateChange={handlers.setDateRange}
        showAggregation={true}
        aggregationValue={filters.aggregation}
        onAggregationChange={handlers.setAggregation}
        gridColumns={4}
      />

      {data.length > 0 ? (
        <>
          <div
            style={{
              marginBottom: "25px",
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
            }}
          >
            {renderHeatmap()}
          </div>

          <div className="heatmap-legend">
            <strong>Legend:</strong>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                className="legend-dot"
                style={{ background: "#28a745" }}
              ></div>{" "}
              Low
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                className="legend-dot"
                style={{ background: "#ffc107" }}
              ></div>{" "}
              Medium
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                className="legend-dot"
                style={{ background: "#dc3545" }}
              ></div>{" "}
              High
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#6c757d",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <p
            style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "500" }}
          >
            No Data Available
          </p>
          <p style={{ fontSize: "13px" }}>
            Try adjusting the date range or selecting a different department.
          </p>
        </div>
      )}
    </div>
  );
};

export default SpendingHeatmapView;