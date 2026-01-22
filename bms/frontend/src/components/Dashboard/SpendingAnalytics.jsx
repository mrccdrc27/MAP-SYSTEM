import React from "react";
import { TrendingUp, PieChart, Flame } from "lucide-react";
import SpendingTrendsView from "./SpendingTrendsView";
import SpendingCategoriesView from "./SpendingCategoriesView";
import SpendingHeatmapView from "./SpendingHeatmapView";
import "./SpendingAnalytics.css";

const SpendingAnalytics = ({
  activeTab,
  onTabChange,
  
  // Data
  trendsData,
  categoriesData,
  heatmapData,

  // State & Handlers for sub-views
  // We pass these down so the child components can control the dashboard state
  trendsFilters,
  trendsHandlers,
  
  categoriesFilters,
  categoriesHandlers,

  heatmapFilters,
  heatmapHandlers,

  // User Context
  isFinanceManager,
  userDepartment,
}) => {
  return (
    <div className="card analytics-card">
      {/* Header */}
      <div className="analytics-header-text">
        <h2 className="analytics-title">Spending Behavior Analytics</h2>
        <p className="analytics-subtitle">
          Analyze spending patterns, trends, and category-wise expenditures
        </p>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button
          className={`analytics-tab-btn ${activeTab === "trends" ? "active" : ""}`}
          onClick={() => onTabChange("trends")}
        >
          <TrendingUp size={18} style={{ marginRight: "8px" }} />
          Department Spending Trends
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => onTabChange("categories")}
        >
          <PieChart size={18} style={{ marginRight: "8px" }} />
          Highest Spending Categories
        </button>
        <button
          className={`analytics-tab-btn ${activeTab === "heatmap" ? "active" : ""}`}
          onClick={() => onTabChange("heatmap")}
        >
          <Flame size={18} style={{ marginRight: "8px" }} />
          Spending Heatmaps
        </button>
      </div>

      {/* Conditional Content */}
      {activeTab === "trends" && (
        <SpendingTrendsView
          data={trendsData}
          filters={trendsFilters}
          handlers={trendsHandlers}
          isFinanceManager={isFinanceManager}
          userDepartment={userDepartment}
        />
      )}

      {activeTab === "categories" && (
        <SpendingCategoriesView
          data={categoriesData}
          filters={categoriesFilters}
          handlers={categoriesHandlers}
          isFinanceManager={isFinanceManager}
          userDepartment={userDepartment}
        />
      )}

      {activeTab === "heatmap" && (
        <SpendingHeatmapView
          data={heatmapData}
          filters={heatmapFilters}
          handlers={heatmapHandlers}
          isFinanceManager={isFinanceManager}
          userDepartment={userDepartment}
        />
      )}
    </div>
  );
};

export default SpendingAnalytics;