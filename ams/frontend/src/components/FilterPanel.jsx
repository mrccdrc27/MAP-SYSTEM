// styles
import "../styles/FilterPanel.css";
import Select from "react-select";

// react
import { useState } from "react";

export default function FilterPanel({ filters = [], onReset, onFilter }) {
  const [showFilter, setShowFilter] = useState(false);
  const [values, setValues] = useState({});

  const handleChange = (name, value) => {
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    onFilter?.(newValues); // notify parent of filter changes
  };

  const handleReset = () => {
    setValues({});
    onReset?.(); // optional callback for parent
    onFilter?.({}); // notify parent that filters were reset
  };

  return (
    <div className="filterPanel">
      <div className="fpShowFilter" onClick={() => setShowFilter(!showFilter)}>
        <span>{showFilter ? "Hide Filter" : "Show Filter"}</span>
      </div>

      {showFilter && (
        <div className="filterPanelCont">
          {filters.map((filter) => (
            <div key={filter.name} className="filterGroup">
              <label htmlFor={filter.name}>{filter.label}</label>

              {/* Dropdown */}
              {filter.type === "select" && (
                <select
                  name={filter.name}
                  className="dropdown"
                  value={values[filter.name] || ""}
                  onChange={(e) => handleChange(filter.name, e.target.value)}
                >
                  <option value="">Select {filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Date */}
              {filter.type === "date" && (
                <input
                  type="date"
                  name={filter.name}
                  className="dateTime"
                  value={values[filter.name] || ""}
                  onChange={(e) => handleChange(filter.name, e.target.value)}
                />
              )}

              {/* Number */}
              {filter.type === "number" && (
                <input
                  type="number"
                  name={filter.name}
                  className="numberInput"
                  value={values[filter.name] || ""}
                  onChange={(e) => handleChange(filter.name, e.target.value)}
                  min={1}
                  max={filter.max ?? undefined}
                  step={filter.step ?? 1}
                />
              )}

              {/* Text */}
              {filter.type === "text" && (
                <input
                  type="text"
                  name={filter.name}
                  className="textInput"
                  value={values[filter.name] || ""}
                  onChange={(e) => handleChange(filter.name, e.target.value)}
                />
              )}

              {/* Date Range */}
              {filter.type === "dateRange" && (
                <div className="dateRange">
                  {/* Start Date */}
                  <div className="filterGroup">
                    <label htmlFor={`${filter.name}_from`}>
                      {filter.fromLabel || "Start Date"}
                    </label>
                    <input
                      type="date"
                      id={`${filter.name}_from`}
                      name={`${filter.name}_from`}
                      className="dateTime"
                      value={values[`${filter.name}_from`] || ""}
                      onChange={(e) =>
                        handleChange(`${filter.name}_from`, e.target.value)
                      }
                      max={values[`${filter.name}_to`] || undefined}
                    />
                  </div>

                  {/* Dash in between */}
                  <span className="rangeSeparator">-</span>

                  {/* End Date */}
                  <div className="filterGroup">
                    <label htmlFor={`${filter.name}_to`}>
                      {filter.toLabel || "End Date"}
                    </label>
                    <input
                      type="date"
                      id={`${filter.name}_to`}
                      name={`${filter.name}_to`}
                      className="dateTime"
                      value={values[`${filter.name}_to`] || ""}
                      onChange={(e) =>
                        handleChange(`${filter.name}_to`, e.target.value)
                      }
                      min={values[`${filter.name}_from`] || undefined}
                    />
                  </div>
                </div>
              )}

              {/* Searchable Dropdown */}
              {filter.type === "searchable" && (
                <Select
                  name={filter.name}
                  classNamePrefix="dropdown"
                  placeholder={`Select ${filter.label}`}
                  options={filter.options}
                  value={
                    filter.options.find(
                      (opt) => opt.value === values[filter.name]
                    ) || null
                  }
                  onChange={(selected) =>
                    handleChange(filter.name, selected?.value || "")
                  }
                  isClearable
                  isSearchable
                  menuPortalTarget={document.body}
                  unstyled
                  maxMenuHeight={5 * 38}
                />
              )}

              {/* Positive Integer */}
              {filter.type === "positiveInteger" && (
                <input
                  type="number"
                  name={filter.name}
                  className="numberInput"
                  value={values[filter.name] || ""}
                  onChange={(e) => {
                    let val = e.target.value;

                    // Convert to integer
                    let num = parseInt(val, 10);

                    if (isNaN(num) || num < 1) {
                      handleChange(filter.name, "");
                    } else {
                      handleChange(filter.name, num);
                    }
                  }}
                  min={1}
                  step={1}
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              )}
            </div>
          ))}

          {/* Reset Button */}
          <div className="filterActions">
            <button type="button" className="resetButton" onClick={handleReset}>
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
