import { useState, useEffect } from "react";
import CloseIcon from "../../assets/icons/close.svg";
import "../../styles/ContextFilterModal.css";

export default function DepreciationFilterModal({ isOpen, onClose, onApplyFilter, initialFilters = {} }) {

  const [filters, setFilters] = useState({
    valueSort: "", // "desc" = greatest to least value, "asc" = least to greatest value
  });

  // Initialize filters from props
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Reset all filters
  const handleReset = () => {
    setFilters({
      valueSort: "",
    });
  };

  // Apply filters
  const handleApply = () => {
    onApplyFilter(filters);
    onClose();
  };

  // Close modal on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="depreciation-modal-overlay" onClick={handleOverlayClick}>
      <div className="depreciation-filter-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="depreciation-modal-header">
          <h2>Filter Depreciations</h2>
          <button className="depreciation-modal-close-btn" onClick={onClose}>
            <img src={CloseIcon} alt="Close" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="depreciation-filter-modal-body">
          <div className="depreciation-filter-grid">
            {/* Sort by Minimum Value */}
            <fieldset>
              <label htmlFor="valueSort">Sort by Minimum Value</label>
              <select
                id="valueSort"
                value={filters.valueSort}
                onChange={(e) => handleInputChange("valueSort", e.target.value)}
              >
                <option value="">None</option>
                <option value="desc">Greatest to least value</option>
                <option value="asc">Least to greatest value</option>
              </select>
            </fieldset>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="depreciation-modal-footer">
          <button className="depreciation-modal-cancel-btn" onClick={handleReset}>
            Reset Filter
          </button>
          <button className="depreciation-modal-save-btn" onClick={handleApply}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}

