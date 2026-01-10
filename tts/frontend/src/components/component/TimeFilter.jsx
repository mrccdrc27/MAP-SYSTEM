// imports
// npm install dayjs react-datepicker

import React, { useState } from "react";
import dayjs from "dayjs";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import styles from "./TimeFilter.module.css";

const TimeFilter = ({ onFilterApply }) => {
  const [selectedOption, setSelectedOption] = useState("today");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Filter Section
  const [showFilter, setShowFilter] = useState(false);

  const toggleFilter = () => {
    setShowFilter((prev) => !prev);
  };

  const handleOptionChange = (e) => {
    const value = e.target.value;
    setSelectedOption(value);
    setStartDate(null);
    setEndDate(null);

    // Set the dates based on the selection
    switch (value) {
      case "today":
        setStartDate(dayjs().startOf("day").toDate());
        setEndDate(dayjs().endOf("day").toDate());
        break;
      case "yesterday":
        setStartDate(dayjs().subtract(1, "day").startOf("day").toDate());
        setEndDate(dayjs().subtract(1, "day").endOf("day").toDate());
        break;
      case "last-week":
        setStartDate(dayjs().subtract(1, "week").startOf("week").toDate());
        setEndDate(dayjs().subtract(1, "week").endOf("week").toDate());
        break;
      case "last-month":
        setStartDate(dayjs().subtract(1, "month").startOf("month").toDate());
        setEndDate(dayjs().subtract(1, "month").endOf("month").toDate());
        break;
      case "last-6-months":
        setStartDate(dayjs().subtract(6, "month").startOf("month").toDate());
        setEndDate(dayjs().toDate());
        break;
      case "last-year":
        setStartDate(dayjs().subtract(1, "year").startOf("year").toDate());
        setEndDate(dayjs().toDate());
        break;
      default:
        break;
    }
  };

  const resetFilter1 = () => {
    setSelectedOption("today");
    setStartDate(null);
    setEndDate(null);
  };

  const applyFilter = () => {
    console.log("Applying filter with: ", { startDate, endDate }); // ADD THIS
    onFilterApply({ startDate, endDate });
  };

  const resetFilter = () => {
    setSelectedOption("today");
    setStartDate(null);
    setEndDate(null);
    onFilterApply({ startDate: null, endDate: null }); // Add this
  };

  return (
    <>
      {/* <div className={styles.fpShowFilter} onClick={toggleFilter}>
        <span>{showFilter ? "Hide Filter" : "Show Filter"}</span>
      </div> */}
      <div
        className={`${styles.fpShowFilter} ${showFilter ? styles.active : ""}`}
        onClick={toggleFilter}
      >
        <span title="Show filter panel">
          <i className="fa-solid fa-filter"></i>
        </span>
      </div>
      {showFilter && (
        <div className={styles.tfContainer}>
          <div className={styles.tfSelectGroup}>
            <label className={styles.tfLabel} htmlFor="time-filter-select">
              Select Range
            </label>
            <select
              id="time-filter-select"
              className={styles.tfSelect}
              value={selectedOption}
              onChange={handleOptionChange}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-week">Last Week</option>
              <option value="last-month">Last Month</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="last-year">Last Year</option>
            </select>
          </div>

          <div className={styles.tfDateGroup}>
            <label className={styles.tfLabel}>Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="MM/dd/yyyy"
              placeholderText="Select start date"
              className={styles.tfSelect}
            />
          </div>

          <div className={styles.tfDateGroup}>
            <label className={styles.tfLabel}>End Date</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="MM/dd/yyyy"
              placeholderText="Select end date"
              className={styles.tfSelect}
            />
          </div>

          <div className={styles.tfButtonGroup}>
            <button className={styles.tfButtonApply} onClick={applyFilter}>
              Apply
            </button>
            <button className={styles.tfButton} onClick={resetFilter}>
              Reset Filter
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeFilter;
