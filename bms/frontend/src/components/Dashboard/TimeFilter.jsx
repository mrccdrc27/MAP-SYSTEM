import React from "react";
import "./SummaryCards.css";
import { TIME_FILTERS } from "../../utils/dashboardConstants";

const TimeFilter = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { id: TIME_FILTERS.MONTHLY, label: "Monthly" },
    { id: TIME_FILTERS.QUARTERLY, label: "Quarterly" },
    { id: TIME_FILTERS.YEARLY, label: "Yearly" },
  ];

  return (
    <div className="time-filter">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className={`filter-button ${activeFilter === filter.id ? "active" : ""}`}
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default TimeFilter;