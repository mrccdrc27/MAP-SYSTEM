// style
import styles from "./filter-panel.module.css";

// component
import { Dropdown, Datetime } from "./General";

// react
import { useState } from "react";

export default function FilterPanel({
  filters,
  onFilterChange,
  statusOptions = [],
  onResetFilters,
}) {
  // Filter Section
  const [showFilter, setShowFilter] = useState(false);

  const toggleFilter = () => {
    setShowFilter((prev) => !prev);
  };

  return (
    <div className={styles.filterPanel}>
      {" "}
      <div className={styles.fpShowFilter} onClick={toggleFilter}>
        <span>{showFilter ? "Hide Filter" : "Show Filter"}</span>
      </div>
      {showFilter && (
        <div className={styles.filterPanelCont}>
          {/* Dropdown Example */}
          <div className={styles.filterGroup}>
            <label htmlFor="category">Category</label>
            <Dropdown
              name="category"
              // value={filters.category}
              onChange={onFilterChange}
              options={["All", "Books", "Electronics", "Clothing"]}
              placeholder="Select category"
            />
          </div>

          {/* Dropdown Status */}
          <div className={styles.filterGroup}>
            <label htmlFor="status">Status</label>
            <Dropdown
              name="status"
              value={filters.status}
              onChange={onFilterChange}
              options={statusOptions}
              placeholder="Select status"
            />
          </div>

          {/* Start Date */}
          <div className={styles.filterGroup}>
            <label htmlFor="startDate">Start Date</label>
            <Datetime
              name="startDate"
              // value={filters.startDate}
              onChange={onFilterChange}
              type="date"
            />
          </div>

          {/* End Date */}
          <div className={styles.filterGroup}>
            <label htmlFor="endDate">End Date</label>
            <Datetime
              name="endDate"
              // value={filters.endDate}
              onChange={onFilterChange}
              type="date"
            />
          </div>

          {/* Reset */}
          <div className={styles.filterActions}>
            <button
              type="button"
              className={styles.resetButton}
              onClick={onResetFilters}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
