import React from "react";
import { Bar } from "react-chartjs-2";
import { Download } from "lucide-react";
import AnalyticsFilters from "./AnalyticsFilters";
import { formatPeso } from "../../utils/dashboardUtils";
import "./SpendingAnalytics.css";

const SpendingCategoriesView = ({
  data,
  filters,
  handlers,
  isFinanceManager,
  userDepartment,
}) => {
  // Bar Chart Configuration
  const barData = {
    labels: data.map((cat) => cat.category),
    datasets: [
      {
        label: "Spending Amount",
        data: data.map((cat) => cat.amount),
        backgroundColor: "#007bff",
        borderColor: "#0056b3",
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${formatPeso(context.parsed.y)} (${
              data[context.dataIndex].percentage
            }%)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45, font: { size: 12 } },
      },
      y: {
        grid: { display: true },
        beginAtZero: true,
        ticks: {
          callback: (value) => formatPeso(value),
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div>
      <div className="view-header">
        <h3 className="view-title">Highest Spending Categories</h3>
        <button
          className="btn-export-success"
          onClick={handlers.onExport}
        >
          Export Report
          <Download size={16} style={{ marginLeft: "6px" }} />
        </button>
      </div>

      <AnalyticsFilters
        isFinanceManager={isFinanceManager}
        userDepartment={userDepartment}
        selectedDepartment={filters.department}
        onDepartmentChange={handlers.setDepartment}
        dateRange={filters.dateRange}
        onDateChange={handlers.setDateRange}
        gridColumns={3} // Uses 3 columns instead of 4
      />

      {data.length > 0 ? (
        <>
          <div style={{ height: "280px", marginBottom: "25px" }}>
            <Bar data={barData} options={barOptions} />
          </div>

          <div className="category-table-container">
            <table className="analysis-table">
              <thead>
                <tr>
                  <th className="text-left">Rank</th>
                  <th className="text-left">Category</th>
                  <th className="text-right">Total Spent</th>
                  <th className="text-right">Percentage of Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((category, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px solid #e9ecef",
                      backgroundColor: index % 2 === 0 ? "white" : "#f8f9fa",
                    }}
                  >
                    <td
                      className="text-left"
                      style={{ fontWeight: "bold", color: "#007bff" }}
                    >
                      {index + 1}
                    </td>
                    <td className="text-left">{category.category}</td>
                    <td className="text-right" style={{ fontWeight: "bold" }}>
                      {formatPeso(category.amount)}
                    </td>
                    <td className="text-right">{category.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="no-data-placeholder">No Data Available</div>
      )}
    </div>
  );
};

export default SpendingCategoriesView;