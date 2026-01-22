import React, { useState } from "react";
import { Pie } from "react-chartjs-2";
import { Eye } from "lucide-react";
import { formatPeso } from "../../utils/dashboardUtils";
import "./DashboardCharts.css";

const DepartmentBudgetAnalysis = ({
  pieChartData,
  pieChartOptions,
  departmentDetailsData,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate total for percentage logic
  const totalPieValue = pieChartData.datasets[0].data.reduce(
    (sum, value) => sum + value,
    0
  );

  return (
    <div className="card" style={{ marginBottom: "30px" }}>
      {/* Header */}
      <div className="chart-header">
        <h3 className="card-title">Budget per Department</h3>
        <button
          className="view-button"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide Details" : "View Details"}
          <Eye size={16} style={{ color: "white", marginLeft: "6px" }} />
        </button>
      </div>

      {/* Main Content: Pie + Legend */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          height: "300px",
        }}
      >
        {/* Pie Chart Half */}
        <div style={{ width: "50%", height: "100%", position: "relative" }}>
          <Pie data={pieChartData} options={pieChartOptions} />
        </div>

        {/* Legend List Half */}
        <div
          style={{
            width: "50%",
            paddingLeft: "10px",
            height: "100%",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}
        >
          {pieChartData.labels.map((label, index) => {
            const amount = pieChartData.datasets[0].data[index];
            const percentage =
              totalPieValue > 0
                ? ((amount / totalPieValue) * 100).toFixed(1)
                : 0;
            return (
              <div key={index} className="legend-item">
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div
                    className="legend-color-box"
                    style={{
                      backgroundColor:
                        pieChartData.datasets[0].backgroundColor[index],
                    }}
                  ></div>
                  <span className="legend-label">{label}</span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      flexShrink: 0,
                      minWidth: "120px",
                      textAlign: "right",
                    }}
                  >
                    {formatPeso(amount)}
                  </span>
                  <span
                    style={{
                      color: "#6c757d",
                      fontSize: "12px",
                      minWidth: "45px",
                      textAlign: "right",
                    }}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Details List */}
      {showDetails && (
        <div className="dept-budget-list">
          {departmentDetailsData ? (
            departmentDetailsData.map((dept, index) => (
              <div
                key={dept.department_id}
                className={`dept-budget-item ${
                  index < departmentDetailsData.length - 1 ? "with-border" : ""
                }`}
              >
                <div className="dept-budget-header">
                  <h4 className="dept-budget-title">{dept.department_name}</h4>
                  <p className="dept-budget-percentage">
                    {dept.percentage_used?.toFixed(1)}% of budget used
                  </p>
                </div>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${dept.percentage_used}%`,
                      backgroundColor: "#007bff",
                    }}
                  ></div>
                </div>
                <div className="dept-budget-details">
                  <p>Budget: {formatPeso(dept.budget)}</p>
                  <p>Spent: {formatPeso(dept.spent)}</p>
                </div>
              </div>
            ))
          ) : (
            <p>Loading department details...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentBudgetAnalysis;