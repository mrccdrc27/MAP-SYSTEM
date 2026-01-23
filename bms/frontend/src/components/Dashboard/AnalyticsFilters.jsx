import React from "react";
import { ChevronDown, Calendar } from "lucide-react";
import { DEPARTMENTS } from "../../utils/dashboardConstants";
import "./SpendingAnalytics.css";

const AnalyticsFilters = ({
  isFinanceManager,
  userDepartment,
  selectedDepartment,
  onDepartmentChange,
  dateRange,
  onDateChange,
  showGranularity = false,
  granularityValue,
  onGranularityChange,
  showAggregation = false,
  aggregationValue,
  onAggregationChange,
  gridColumns = 4, // Allow overriding column count (Trends uses 4, Categories uses 3)
}) => {

  // --- NEW HELPER: Force open the native date picker ---
  const handleIconClick = (e) => {
    try {
      // Find the sibling input element within the same wrapper
      const wrapper = e.currentTarget.parentElement;
      const input = wrapper.querySelector('input[type="date"]');
      if (input) {
        if (typeof input.showPicker === "function") {
          input.showPicker(); // Modern browsers (Chrome 99+)
        } else {
          input.focus(); // Fallback
        }
      }
    } catch (err) {
      console.error("Error opening date picker:", err);
    }
  };

  return (
    <div
      className="filter-bar"
      style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
    >
      {/* 1. Department Filter */}
      <div className="filter-group">
        <label>Department</label>
        {isFinanceManager ? (
          <div className="filter-select-wrapper">
            <select
              className="filter-select"
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
            >
              <option value="All Departments">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6c757d",
                pointerEvents: "none",
              }}
            />
          </div>
        ) : (
          <div className="filter-static">
            {userDepartment || "My Department"}
          </div>
        )}
      </div>

      {/* 2. Date Range Filter */}
      <div className="filter-group">
        <label>Date Range</label>
        <div className="date-range-group">
          
          {/* Start Date */}
          <div className="filter-select-wrapper">
            <input
              type="date"
              className="filter-input"
              style={{ paddingRight: "35px" }}
              value={dateRange.startDate}
              onChange={(e) => onDateChange("startDate", e.target.value)}
            />
            <Calendar
              size={14}
              onClick={handleIconClick} // Added Click Handler
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6c757d",
                cursor: "pointer", // Change to pointer
                pointerEvents: "auto", // Allow clicks
              }}
            />
          </div>
          
          <span className="date-separator">to</span>
          
          {/* End Date */}
          <div className="filter-select-wrapper">
            <input
              type="date"
              className="filter-input"
              style={{ paddingRight: "35px" }}
              value={dateRange.endDate}
              onChange={(e) => onDateChange("endDate", e.target.value)}
            />
            <Calendar
              size={14}
              onClick={handleIconClick} // Added Click Handler
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6c757d",
                cursor: "pointer", // Change to pointer
                pointerEvents: "auto", // Allow clicks
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Granularity (Optional) */}
      {showGranularity && (
        <div className="filter-group">
          <label>Time Granularity</label>
          <div className="filter-select-wrapper">
            <select
              className="filter-select"
              value={granularityValue}
              onChange={(e) => onGranularityChange(e.target.value)}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6c757d",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      )}

      {/* 4. Aggregation (Optional) */}
      {showAggregation && (
        <div className="filter-group">
          <label>Aggregation</label>
          <div className="filter-select-wrapper">
            <select
              className="filter-select"
              value={aggregationValue}
              onChange={(e) => onAggregationChange(e.target.value)}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
            <ChevronDown
              size={14}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6c757d",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsFilters;