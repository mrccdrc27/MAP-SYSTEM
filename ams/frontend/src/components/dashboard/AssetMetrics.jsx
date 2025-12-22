import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import "../../styles/dashboard/AssetMetrics.css";
import { useAuth } from "../../context/AuthContext";

const AssetMetrics = ({ stats }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [selectedPeriod1, setSelectedPeriod1] = useState("This month");
  const [selectedPeriod2, setSelectedPeriod2] = useState("This month");

  const assetCost = `₱${stats?.total_asset_costs || "0.00"}`;
  const assetUtilization = `${stats?.asset_utilization || 0}%`;

  // Sample data for when API is not available
  const sampleCategoriesData = [
    { name: "Laptops", value: 45, color: "#0D6EFD" },
    { name: "Desktops", value: 30, color: "#FFB800" },
    { name: "Monitors", value: 25, color: "#82ca9d" },
    { name: "Accessories", value: 20, color: "#FF6B6B" },
    { name: "Components", value: 15, color: "#FF8C00" },
  ];

  const sampleStatusData = [
    { name: "Available", value: 65, color: "#0D6EFD" },
    { name: "Deployed", value: 40, color: "#82ca9d" },
    { name: "Under Maintenance", value: 10, color: "#FFB800" },
    { name: "Retired", value: 5, color: "#FF6B6B" },
  ];

  const assetCategoriesData =
    stats?.asset_categories?.map((item, index) => ({
      name: item["product__category__name"],
      value: item.count,
      color: ["#0D6EFD", "#FFB800", "#82ca9d", "#FF6B6B", "#FF8C00", "#9C27B0"][
        index % 6
      ],
    })) || sampleCategoriesData;

  const assetStatusData =
    stats?.asset_statuses?.map((item, index) => ({
      name: item["status__name"],
      value: item.count,
      color: ["#0D6EFD", "#FF6B6B", "#82ca9d", "#FFB800", "#9C27B0", "#00C49F"][
        index % 6
      ],
    })) || sampleStatusData;

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="metrics-section">
      <div className="metrics-header">
        <div className="metric-summary-card">
          <div className="summary-content">
            <h3>Total Asset Costs</h3>
            <div className="summary-value">{assetCost}</div>
            <div className="time-period-buttons">
              <button
                className={`time-button ${
                  selectedPeriod1 === "This month" ? "active pulse" : ""
                }`}
                onClick={() => {
                  setSelectedPeriod1("This month");
                }}
              >
                This month
              </button>
              <button
                className={`time-button ${
                  selectedPeriod1 === "Last month" ? "active pulse" : ""
                }`}
                onClick={() => {
                  setSelectedPeriod1("Last month");
                }}
              >
                Last month
              </button>
            </div>
          </div>
        </div>

        <div className="metric-summary-card">
          <div className="summary-content">
            <h3>Asset Utilization</h3>
            <div className="summary-value">{assetUtilization}</div>
            <div className="time-period-buttons">
              <button
                className={`time-button ${
                  selectedPeriod2 === "This month" ? "active pulse" : ""
                }`}
                onClick={() => {
                  setSelectedPeriod2("This month");
                }}
              >
                This month
              </button>
              <button
                className={`time-button ${
                  selectedPeriod2 === "Last month" ? "active pulse" : ""
                }`}
                onClick={() => {
                  setSelectedPeriod2("Last month");
                }}
              >
                Last month
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-container">
        <div className="metric-card">
          <div className="metric-header">
            <h3>Asset Categories</h3>
          </div>
          {assetCategoriesData && assetCategoriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetCategoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetCategoriesData.map((entry, index) => (
                    <Cell key={`cell-cat-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="left"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ left: 0 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <p>No category data available</p>
            </div>
          )}
          {isAdmin() && (
            <button className="browse-all" onClick={() => navigate("/assets")}>
              Browse All
            </button>
          )}
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>Asset Statuses</h3>
          </div>
          {assetStatusData && assetStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {assetStatusData.map((entry, index) => (
                    <Cell key={`cell-stat-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="left"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ left: 0 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              <p>No status data available</p>
            </div>
          )}
          {isAdmin() && (
            <button
              className="browse-all"
              onClick={() => navigate("/reports/activity")}
            >
              Browse All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetMetrics;
