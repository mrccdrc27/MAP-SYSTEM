// style
import styles from "./filter-panel.module.css";

// component
import { Datetime } from "./General";
import DynamicDropdown from "./Dropdown";

// react
import { useState } from "react";

export default function FilterPanel({
  filters,
  onFilterChange,
  categoryOptions = [],
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
      <div className={`${styles.fpShowFilter} ${showFilter ? styles.active : ''}`} onClick={toggleFilter}>
        <span title="Show filter panel">
          <i className="fa-solid fa-filter"></i>
        </span>
      </div>
      {showFilter && (
        <div className={styles.filterPanelCont}>

          {/* Dropdown Category */}
          <div className={styles.filterGroup}>
            <label htmlFor="category">Category</label>
            <DynamicDropdown
              label="Category"
              options={categoryOptions.map((opt) => ({ label: opt }))}
              multiple={false}
              selectedItems={
                filters.category ? [{ label: filters.category }] : []
              }
              onChange={(selectedArray) =>
                onFilterChange({
                  target: {
                    name: "category",
                    value: selectedArray[0]?.label || "",
                  },
                })
              }
            />
          </div>

          {/* Dropdown Status */}
          <div className={styles.filterGroup}>
            <label htmlFor="status">Status</label>
            <DynamicDropdown
              label="Status"
              options={statusOptions.map((opt) => ({ label: opt }))}
              multiple={false}
              selectedItems={filters.status ? [{ label: filters.status }] : []}
              onChange={(selectedArray) =>
                onFilterChange({
                  target: {
                    name: "status",
                    value: selectedArray[0]?.label || "",
                  },
                })
              }
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
